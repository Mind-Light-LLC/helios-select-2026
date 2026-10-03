import { useEffect, useState, type FormEvent } from 'react';
import { assessOffer, sourcedNeeds, type OfferAssessment, type SourcedNeed } from '@api';
import { readActionTrail, recordAction, type ActionEntry } from './actionTrail';
import './NeedNavigator.css';

type Props = { need?: SourcedNeed; onClose: () => void; onVoice: () => void; voiceAvailable: boolean; spokenOffer: { text: string } | null };

function displayDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export function NeedNavigator({ need = sourcedNeeds[0], onClose, onVoice, voiceAvailable, spokenOffer }: Props) {
  const [offer, setOffer] = useState('');
  const [assessment, setAssessment] = useState<OfferAssessment | null>(null);
  const [copied, setCopied] = useState<'link' | 'brief' | null>(null);
  const [saved, setSaved] = useState(() => readActionTrail().some((entry) => entry.kind === 'need' && entry.id === need.id));
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!spokenOffer) {
      setOffer('');
      setAssessment(null);
      return;
    }
    setOffer(spokenOffer.text);
    setAssessment(assessOffer(spokenOffer.text, need));
  }, [spokenOffer, need]);

  function checkOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAssessment(assessOffer(offer, need));
    setCopied(null);
  }

  function track(state: ActionEntry['state'], officialUrl = need.routes[0]?.action_url ?? need.source_url) {
    const stored = recordAction({ kind: 'need', id: need.id, title: need.title,
      organization: need.organization, source_url: need.source_url, official_url: officialUrl, state });
    setSaved(stored || saved);
    setSaveError(!stored);
  }

  function needUrl(): string {
    const url = new URL(window.location.href);
    url.searchParams.set('need', need.id);
    url.searchParams.delete('item');
    return url.toString();
  }

  async function copyNeed(kind: 'link' | 'brief') {
    try {
      const text = kind === 'link' ? needUrl() : [
        `${need.organization}: ${need.title}`,
        `Public wishlist examples: ${need.accepted_examples.join(', ')}.`,
        `Ways to help: ${need.routes.map((route) => route.label).join('; ')}.`,
        'Quantity needed, offer acceptance, and recipient delivery are unverified. Confirm current needs with the organization.',
        `Evidence status: ${need.evidence_steps.map((step) => `${step.label} ${step.state}`).join('; ')}.`,
        `Official source: ${need.source_url}`,
        `Source checked: ${need.source_checked_at}; review due: ${need.review_due_at}.`,
        `View: ${needUrl()}`,
      ].join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  }

  return <aside className="need-panel" id="need-window" aria-label="Sourced need">
    <div className="need-head"><span>PUBLIC NEED SIGNAL</span><button type="button" onClick={onClose} aria-label="Close need panel">×</button></div>
    <p className="need-place">{need.place} · {need.organization}</p>
    <h2>{need.title}</h2>
    <p className="need-summary">{need.summary}</p>
    <div className="need-save-row"><button type="button" onClick={() => track('saved')}>{saved ? 'Saved in My actions' : 'Save this action'}</button>
      <span>Provider acknowledgement: unknown · Delivery: unknown</span></div>
    {saveError && <p className="need-save-error" role="alert">This browser could not save your action.</p>}
    <div className="need-truth"><strong>What the source establishes</strong><p>These items and roles are publicly listed. Quantity needed and delivery to recipients are unverified. Source review due {displayDate(need.review_due_at)}.</p></div>
    <p className="need-label">EXAMPLES OF ACCEPTED FOOD</p>
    <div className="need-tags">{need.accepted_examples.map((item) => <span key={item}>{item}</span>)}</div>
    <form className="need-offer" onSubmit={checkOffer}>
      <div className="need-offer-top"><label htmlFor="need-offer-input">What can you offer?</label><button type="button" className="need-voice" onClick={onVoice} disabled={!voiceAvailable} title={!voiceAvailable ? 'Voice is not configured in this preview' : undefined}>Speak to Helios</button></div>
      <div><input id="need-offer-input" value={offer} onChange={(event) => setOffer(event.target.value)} placeholder="Unopened canned fish in Singapore" /><button type="submit">Check fit</button></div>
    </form>
    {assessment && <div className={`need-assessment is-${assessment.fit}`} role="status">
      <strong>{assessment.fit === 'possible' ? 'Possible fit' : assessment.fit === 'not_eligible' ? 'Not eligible for this route' : 'More information needed'}</strong>
      <p>{assessment.explanation}</p>
      {assessment.route && <a href={assessment.route.action_url} target="_blank" rel="noopener noreferrer" onClick={() => track('official_link_selected', assessment.route?.action_url)}>{assessment.route.label} provider details ↗</a>}
    </div>}
    <p className="need-label">WAYS TO HELP</p>
    <div className="need-routes">{need.routes.map((route) => <div key={route.id}><strong>{route.label}</strong><p>{route.detail}</p><a href={route.action_url} target="_blank" rel="noopener noreferrer" onClick={() => track('official_link_selected', route.action_url)}>Provider details ↗</a></div>)}</div>
    <details className="need-evidence">
      <summary>Outcome evidence: public source only</summary>
      <ol>{need.evidence_steps.map((step) => <li key={step.id}>
        <strong>{step.label}</strong><span className={`is-${step.state}`}>{step.state === 'documented' ? 'Documented' : 'Unverified'}</span>
        <p>Requires: {step.evidence_required}</p>
      </li>)}</ol>
    </details>
    <div className="need-footer">
      <a href={need.source_url} target="_blank" rel="noopener noreferrer">Official source ↗</a>
      <span>Checked {displayDate(need.source_checked_at)}</span>
      <div className="need-share">
        <button type="button" onClick={() => void copyNeed('brief')}>{copied === 'brief' ? 'Brief copied' : 'Copy brief'}</button>
        <button type="button" onClick={() => void copyNeed('link')}>{copied === 'link' ? 'Link copied' : 'Copy link'}</button>
      </div>
    </div>
  </aside>;
}
