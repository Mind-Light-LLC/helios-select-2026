import { useEffect, useState } from 'react';
import { loadNeeds, sourcedNeeds, type NeedView, type PartnerNeed } from '@api';
import { NeedNavigator } from './NeedNavigator';
import { NeedEditor } from './NeedEditor';
import { readActionTrail, recordAction, type ActionEntry } from './actionTrail';
import './NeedHub.css';

type Props = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  onVoice: () => void;
  onAccount: () => void;
  voiceAvailable: boolean;
  spokenOffer: { text: string } | null;
};

function dateLabel(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? 'Unknown'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function PartnerCard({ need, onBack }: { need: PartnerNeed; onBack: () => void }) {
  const [saved, setSaved] = useState(() => readActionTrail().some((entry) => entry.kind === 'need' && entry.id === need.id));
  const [saveError, setSaveError] = useState(false);

  function track(state: ActionEntry['state']) {
    const stored = recordAction({ kind: 'need', id: need.id, title: need.title,
      organization: need.organization_name, source_url: need.source_url,
      official_url: need.official_action_url, state });
    setSaved(stored || saved);
    setSaveError(!stored);
  }

  return <aside className="need-panel partner-need" id="need-window" aria-label={`Need: ${need.title}`}>
    <div className="need-head"><span>PARTNER CONFIRMED NEED</span><button type="button" onClick={onBack} aria-label="Back to needs">×</button></div>
    <p className="need-place">{need.place_label} · {need.organization_name}</p>
    <h2>{need.title}</h2>
    <p className="need-summary">{need.summary}</p>
    <div className="partner-facts">
      <div><span>QUANTITY</span><strong>{need.quantity_needed} {need.quantity_unit}</strong></div>
      <div><span>NEEDED BY</span><strong>{dateLabel(need.needed_by)}</strong></div>
      <div><span>ELIGIBILITY</span><strong>{need.eligibility_summary || 'Unknown; ask the organization'}</strong></div>
      <div><span>AVAILABILITY</span><strong>Confirm with the organization</strong></div>
    </div>
    <a className="partner-action" href={need.official_action_url} target="_blank" rel="noopener noreferrer"
      onClick={() => track('official_link_selected')}>Official next step ↗</a>
    <button type="button" className="partner-save" onClick={() => track('saved')}>{saved ? 'Saved in My actions' : 'Save this action'}</button>
    {saveError && <p className="need-save-error" role="alert">This browser could not save your action.</p>}
    <p className="partner-boundary">Provider acknowledgement and participation are unknown until the provider confirms them.</p>
    <div className="need-footer"><a href={need.source_url} target="_blank" rel="noopener noreferrer">Official source ↗</a>
      <span>Checked {dateLabel(need.source_checked_at)} · Review due {dateLabel(need.review_due_at)}</span></div>
  </aside>;
}

export function NeedHub({ selectedId, onSelect, onClose, onVoice, onAccount, voiceAvailable, spokenOffer }: Props) {
  const [needs, setNeeds] = useState<NeedView[]>(() => sourcedNeeds.map((need) => ({ ...need, view_url: `/?need=${need.id}` })));
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    loadNeeds(controller.signal).then((records) => {
      if (controller.signal.aborted) return;
      setNeeds(records);
      setError('');
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Needs unavailable.');
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);

  const selected = needs.find((need) => need.id === selectedId);
  if (selected && selected.evidence_status === 'public_source') {
    return <NeedNavigator need={selected} onClose={() => onSelect(null)} onVoice={onVoice}
      voiceAvailable={voiceAvailable} spokenOffer={spokenOffer} />;
  }
  if (selected && selected.evidence_status === 'partner_confirmed') {
    return <PartnerCard need={selected} onBack={() => onSelect(null)} />;
  }

  return <aside className={`need-panel need-hub ${view === 'editor' ? 'is-editor' : ''}`} id="need-window" aria-label="Sourced needs">
    <div className="need-head"><span>{view === 'editor' ? 'NONPROFIT WORKSPACE' : 'SOURCED NEEDS'}</span>
      <button type="button" onClick={onClose} aria-label="Close needs">×</button></div>
    {view === 'editor' ? <><button type="button" className="need-back" onClick={() => setView('list')}>← All needs</button>
      <NeedEditor onAccount={onAccount} /></> : <>
      <h2>Needs near and far.</h2>
      <p className="need-hub-note">Specific needs appear here after the organization confirms them.</p>
      {selectedId && !busy && <p className="need-hub-warning" role="status">That need is not currently published.</p>}
      {error && <p className="need-hub-warning" role="alert">Partner needs could not be refreshed: {error}</p>}
      <div className="need-hub-list">
        {needs.map((need) => <button type="button" key={need.id} onClick={() => onSelect(need.id)}>
          <small>{need.evidence_status === 'partner_confirmed' ? 'PARTNER CONFIRMED' : 'PUBLIC SOURCE'}</small>
          <strong>{need.title}</strong>
          <span>{need.evidence_status === 'partner_confirmed' ? need.organization_name : need.organization} · {need.evidence_status === 'partner_confirmed' ? need.place_label : need.place}</span>
          <span>{need.evidence_status === 'partner_confirmed' ? `${need.quantity_needed} ${need.quantity_unit} · By ${dateLabel(need.needed_by)}` : 'Quantity unknown · Confirm current need'}</span>
        </button>)}
      </div>
      {busy && <p className="need-hub-note" role="status">Checking published needs…</p>}
      <button type="button" className="need-post" onClick={() => setView('editor')}>Create a need card ↗</button>
    </>}
  </aside>;
}
