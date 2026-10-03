import { useEffect, useState, type RefObject } from 'react';
import { getAuthClient, listSavedActions, loadCardDetails, saveAccountAction } from '@api';
import { OrganizationMark } from './OrganizationMark';
import { isCurrentReview } from './sfSearch';
import { readActionTrail, recordAction, type ActionEntry } from './actionTrail';
import type { CardDetails, HeliosItem, MatchReason, SearchResponse } from './types';

type Props = {
  item: HeliosItem;
  fit: SearchResponse['fit'];
  reasonCodes: MatchReason[];
  mcpHandoff: boolean;
  closeRef: RefObject<HTMLButtonElement>;
  onClose: () => void;
  onAccount: () => void;
};

function checkedLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Source check unavailable'
    : `Checked ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function dateLabel(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Confirm the date with the organization';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium', timeStyle: 'short', timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  }
}

function claimLabel(status: CardDetails['organization']['claim_status'] | undefined): string {
  if (status === 'approved') return 'Organization claim approved';
  if (status === 'pending') return 'Organization claim under review';
  return 'Sourced public listing';
}

export function OpportunityDetail({ item, fit, reasonCodes, mcpHandoff, closeRef, onClose, onAccount }: Props) {
  const [details, setDetails] = useState<CardDetails | null>(null);
  const [detailsError, setDetailsError] = useState(false);
  const [saved, setSaved] = useState(() => readActionTrail().some((entry) => entry.kind === 'item' && entry.id === item.id && entry.state === 'saved'));
  const [cloudSaved, setCloudSaved] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;
    getAuthClient().then(async (client) => {
      const { data, error } = await client.auth.getUser();
      if (!active) return;
      setSignedIn(!error && Boolean(data.user));
      setAuthError(Boolean(error));
      setAuthReady(true);
      subscription = client.auth.onAuthStateChange((_event, session) => {
        if (active) { setSignedIn(Boolean(session?.user)); setAuthError(false); setAuthReady(true); }
      }).data.subscription;
    }).catch(() => { if (active) { setAuthError(true); setAuthReady(true); } });
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!signedIn || item.publication_state === 'curated_demo') return;
    let active = true;
    listSavedActions().then((entries) => {
      if (active) setCloudSaved(entries.some((entry) => entry.catalog_item_id === item.id));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [signedIn, item.id, item.publication_state]);

  useEffect(() => {
    const controller = new AbortController();
    loadCardDetails(item.id, controller.signal).then((result) => {
      if (!controller.signal.aborted) setDetails(result);
    }).catch(() => {
      if (!controller.signal.aborted) setDetailsError(true);
    });
    return () => controller.abort();
  }, [item.id]);

  const source = details?.source_checks[0];
  const occurrence = details?.occurrences.find((entry) => new Date(entry.starts_at).getTime() >= Date.now())
    ?? details?.occurrences[0];
  const action = details?.official_action;
  const donationUrl = details?.donation_option?.url ?? item.donation_url;
  const pinMeaning = details?.place?.meaning ?? item.pin_meaning;
  const reviewCurrent = isCurrentReview(item);
  const officialUrl = action?.url ?? item.action_url ?? item.source_url;

  function track(state: ActionEntry['state']) {
    const stored = recordAction({ kind: 'item', id: item.id, title: item.title,
      organization: item.organization_name, source_url: item.source_url, official_url: officialUrl, state });
    if (state === 'saved') setSaved(stored || saved);
    if (!stored) setSaveError('This browser could not save your local action.');
  }

  async function save() {
    if (saveBusy || (!authReady && item.publication_state !== 'curated_demo')) return;
    setSaveError('');
    if (!signedIn || item.publication_state === 'curated_demo') { track('saved'); return; }
    setSaveBusy(true);
    try {
      await saveAccountAction(item.id);
      setCloudSaved(true);
    } catch (cause: unknown) {
      setSaveError(cause instanceof Error ? cause.message : 'Account save failed.');
    } finally { setSaveBusy(false); }
  }

  return <article className="detail-card" aria-label={`Details for ${item.title}`}>
    <button ref={closeRef} type="button" className="detail-close" onClick={onClose} aria-label="Back to results">×</button>
    <div className="detail-identity">
      <OrganizationMark item={item} className="detail-mark" />
      <span><small>{item.record_kind} · {item.country}</small><strong>{item.organization_name}</strong></span>
    </div>
    {mcpHandoff && <div className="mcp-handoff-note">Opened from MCP · same record ID <code>{item.id}</code></div>}
    <h2>{item.title}</h2>
    <p className="detail-summary">{item.summary}</p>
    {fit === 'related_path' && reasonCodes.includes('schedule_mismatch') &&
      <p className="fit-alert">The listed schedule differs from your request.</p>}

    <section className="passport-panel" aria-label="Organization passport">
      <div className="card-heading"><span>ORGANIZATION PASSPORT</span><i aria-hidden="true" /></div>
      <strong>{details?.organization.name ?? item.organization_name}</strong>
      <p>{claimLabel(details?.organization.claim_status)} · {details?.organization.country ?? item.country}</p>
    </section>

    <section className="official-panel" aria-label="Official next step">
      <div className="card-heading"><span>01 / OFFICIAL NEXT STEP</span><i aria-hidden="true" /></div>
      <p>{action?.note ?? item.action_note}</p>
      {(action?.url ?? item.action_url) && <a className="action-link" href={officialUrl}
        target="_blank" rel="noopener noreferrer" onClick={() => track('official_link_selected')}>{action?.label ?? item.action_label} <span aria-hidden="true">↗</span></a>}
      <small>The organization controls registration. Opening this page does not reserve a place.</small>
    </section>

    <div className="action-save-row"><button type="button" disabled={saveBusy || (!authReady && item.publication_state !== 'curated_demo')} onClick={() => void save()}>{!authReady && item.publication_state !== 'curated_demo' ? 'Checking account…' : cloudSaved && signedIn ? 'Saved to your account' : signedIn && item.publication_state !== 'curated_demo' ? 'Save to your account' : saved ? 'Saved on this device' : 'Save on this device'}</button>
      <span>Provider acknowledgement: unknown · Participation: unknown</span></div>
    {authReady && !signedIn && item.publication_state !== 'curated_demo' && <button className="sync-prompt" type="button" onClick={onAccount}>Sign in to save across devices ↗</button>}
    {authError && item.publication_state !== 'curated_demo' && <p className="record-refresh-note" role="status">Account status could not be checked. Saves on this device will not sync.</p>}
    {signedIn && item.publication_state === 'curated_demo' && <p className="record-refresh-note">This catalog preview saves only on this device.</p>}
    {saveError && <p className="record-refresh-note" role="alert">{saveError}</p>}

    <div className="detail-card-grid">
      <section className="atlas-fact-card" aria-label="Place">
        <span>02 / PLACE</span>
        <strong>{details?.place?.label ?? item.place_label}</strong>
        <small>{pinMeaning === 'meeting_point' ? 'Meeting point' : pinMeaning === 'event_city'
          ? 'Event city, not the meeting point' : 'Organization city, not the shift location'}</small>
      </section>
      <section className="atlas-fact-card" aria-label="Time">
        <span>03 / WINDOW</span>
        <strong>{occurrence ? dateLabel(occurrence.starts_at, occurrence.time_zone)
          : item.schedule_text ?? 'Ask the organization'}</strong>
        <small>{occurrence?.availability_status === 'open_confirmed'
          ? 'Open spot confirmed by provider' : 'Availability needs confirmation'}</small>
      </section>
    </div>

    <div className="evidence-row">
      <span className="source-indicator" />
      <span>{checkedLabel(source?.checked_at ?? item.source_checked_at)} · {reviewCurrent
        ? source?.status === 'provider_confirmed' ? 'Provider confirmed source' : 'Reviewed public source'
        : 'Review overdue'}</span>
      <a className="source-link" href={source?.url ?? item.source_url} target="_blank" rel="noopener noreferrer">View source ↗</a>
    </div>
    {detailsError && <p className="record-refresh-note">The expanded record could not be refreshed. Check the official source.</p>}

    {donationUrl && <section className="giving-panel" aria-label="Giving option">
      <div><span>ALSO HERE</span><strong>Support this organization</strong></div>
      <a className="donation-link" href={donationUrl} target="_blank" rel="noopener noreferrer">Open official giving page ↗</a>
      <small>{item.donation_minimum_usd === 10 && reviewCurrent ? 'The official form lists a $10 minimum. ' : ''}Helios does not process this gift.</small>
    </section>}
  </article>;
}
