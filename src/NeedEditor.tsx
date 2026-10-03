import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthClient } from '@api';
import './NeedEditor.css';

type Draft = {
  organization_name: string;
  official_website_url: string;
  title: string;
  summary: string;
  place_label: string;
  quantity_needed: string;
  quantity_unit: string;
  needed_by: string;
  eligibility_summary: string;
  official_action_url: string;
};
type SavedDraft = Omit<Draft, 'quantity_needed' | 'eligibility_summary'> & {
  id: string;
  quantity_needed: number;
  eligibility_summary: string | null;
  publication_state: 'draft' | 'submitted';
};
type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
type Props = { onAccount: () => void };

const emptyDraft: Draft = {
  organization_name: '', official_website_url: '', title: '', summary: '',
  place_label: '', quantity_needed: '', quantity_unit: '', needed_by: '',
  eligibility_summary: '', official_action_url: '',
};

function httpsUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch { return null; }
}

function validate(draft: Draft): string | null {
  if (draft.organization_name.trim().length < 2 || draft.title.trim().length < 5
    || draft.summary.trim().length < 15 || draft.place_label.trim().length < 2
    || draft.quantity_unit.trim().length < 2) return 'Complete the organization, title, details, place, and unit.';
  if (!Number.isInteger(Number(draft.quantity_needed)) || Number(draft.quantity_needed) < 1) {
    return 'Enter a quantity greater than zero.';
  }
  if (!draft.needed_by || draft.needed_by < new Date().toISOString().slice(0, 10)) {
    return 'Choose today or a future need-by date.';
  }
  if (!httpsUrl(draft.official_website_url) || !httpsUrl(draft.official_action_url)) {
    return 'Use HTTPS links for the organization website and official next step.';
  }
  return null;
}

export function NeedEditor({ onAccount }: Props) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<Draft>(emptyDraft);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [state, setState] = useState<'draft' | 'submitted'>('draft');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const canDictate = typeof window !== 'undefined' && Boolean((window as RecognitionWindow).SpeechRecognition
    ?? (window as RecognitionWindow).webkitSpeechRecognition);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;
    getAuthClient().then(async (auth) => {
      if (!active) return;
      setClient(auth);
      const { data, error: authError } = await auth.auth.getUser();
      if (active && !authError) setUserId(data.user?.id ?? null);
      subscription = auth.auth.onAuthStateChange((_event, session) => {
        if (active) setUserId(session?.user.id ?? null);
      }).data.subscription;
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Account service unavailable.');
    });
    return () => { active = false; subscription?.unsubscribe(); recognitionRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (!client || !userId) {
      setForm(emptyDraft);
      setDraftId(null);
      setState('draft');
      return;
    }
    let active = true;
    client.from('need_cards').select('id,organization_name,official_website_url,title,summary,place_label,quantity_needed,quantity_unit,needed_by,eligibility_summary,official_action_url,publication_state')
      .eq('owner_user_id', userId).in('publication_state', ['draft', 'submitted'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) { setError(loadError.message); return; }
        if (!data) return;
        const saved = data as SavedDraft;
        setDraftId(saved.id);
        setState(saved.publication_state);
        setForm({ ...saved, quantity_needed: String(saved.quantity_needed),
          eligibility_summary: saved.eligibility_summary ?? '' });
      });
    return () => { active = false; };
  }, [client, userId]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  }

  function toggleDictation() {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; setListening(false); return; }
    const browser = window as RecognitionWindow;
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setForm((current) => ({ ...current, summary: `${current.summary} ${transcript}`.trim() }));
    };
    recognition.onerror = () => { setListening(false); setError('Voice input stopped. You can type the details.'); };
    recognition.onend = () => { if (recognitionRef.current === recognition) recognitionRef.current = null; setListening(false); };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); setError(''); }
    catch { recognitionRef.current = null; setError('Microphone unavailable. You can type the details.'); }
  }

  async function persist(submit: boolean) {
    if (busy || state === 'submitted') return;
    const issue = validate(form);
    if (issue) { setError(issue); return; }
    if (!client || !userId) { setError('Sign in to save this card. Your entries remain in this open form.'); onAccount(); return; }
    setBusy(true);
    setError('');
    setMessage('');
    const payload = {
      organization_name: form.organization_name.trim(),
      official_website_url: httpsUrl(form.official_website_url),
      title: form.title.trim(), summary: form.summary.trim(), place_label: form.place_label.trim(),
      quantity_needed: Number(form.quantity_needed), quantity_unit: form.quantity_unit.trim(),
      needed_by: form.needed_by, eligibility_summary: form.eligibility_summary.trim() || null,
      official_action_url: httpsUrl(form.official_action_url),
      source_url: httpsUrl(form.official_website_url), updated_at: new Date().toISOString(),
    };
    try {
      const result = draftId
        ? await client.from('need_cards').update(payload).eq('id', draftId).eq('owner_user_id', userId).select('id').single()
        : await client.from('need_cards').insert({ ...payload, owner_user_id: userId }).select('id').single();
      if (result.error) throw result.error;
      const id: string = result.data.id;
      setDraftId(id);
      if (submit) {
        const submitted = await client.from('need_cards').update({ publication_state: 'submitted' })
          .eq('id', id).eq('owner_user_id', userId).select('id').single();
        if (submitted.error) throw submitted.error;
        setState('submitted');
        setMessage('Submitted for review. The card is not public yet.');
      } else setMessage('Draft saved. Review every detail before submitting.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Need could not be saved.');
    } finally { setBusy(false); }
  }

  return <div className="need-editor">
    <h2>Draft a need</h2>
      <p>{state === 'submitted' ? 'Your request is awaiting partner review.' : userId
        ? 'Review every detail. Publication requires organization verification.'
        : 'Draft a specific need first. Sign in when you are ready to save it.'}</p>
      <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void persist(false); }}>
        <label>Organization<input value={form.organization_name} onChange={(event) => update('organization_name', event.target.value)} disabled={state === 'submitted'} maxLength={160} required /></label>
        <label>Official website<input type="url" value={form.official_website_url} onChange={(event) => update('official_website_url', event.target.value)} disabled={state === 'submitted'} placeholder="https://" required /></label>
        <label>Need title<input value={form.title} onChange={(event) => update('title', event.target.value)} disabled={state === 'submitted'} maxLength={140} required /></label>
        <label>What is needed? <button type="button" onClick={toggleDictation} disabled={!canDictate || state === 'submitted'}>{listening ? 'Stop' : 'Speak'}</button>
          <textarea value={form.summary} onChange={(event) => update('summary', event.target.value)} disabled={state === 'submitted'} maxLength={1200} rows={3} required /></label>
        <div className="need-editor-row"><label>Quantity<input type="number" min="1" step="1" value={form.quantity_needed} onChange={(event) => update('quantity_needed', event.target.value)} disabled={state === 'submitted'} required /></label>
          <label>Unit<input value={form.quantity_unit} onChange={(event) => update('quantity_unit', event.target.value)} disabled={state === 'submitted'} placeholder="volunteers, meals, boxes" maxLength={60} required /></label></div>
        <div className="need-editor-row"><label>Place<input value={form.place_label} onChange={(event) => update('place_label', event.target.value)} disabled={state === 'submitted'} maxLength={160} required /></label>
          <label>Needed by<input type="date" value={form.needed_by} onChange={(event) => update('needed_by', event.target.value)} disabled={state === 'submitted'} required /></label></div>
        <label>Who can help? <small>Optional</small><input value={form.eligibility_summary} onChange={(event) => update('eligibility_summary', event.target.value)} disabled={state === 'submitted'} maxLength={300} /></label>
        <label>Official next step<input type="url" value={form.official_action_url} onChange={(event) => update('official_action_url', event.target.value)} disabled={state === 'submitted'} placeholder="https://" required /></label>
        <div className="need-editor-preview"><span>PREVIEW</span><strong>{form.title || 'Your need title'}</strong>
          <p>{form.organization_name || 'Organization'} · {form.place_label || 'Place'} · {form.needed_by || 'Date needed'}</p>
          <p>{form.quantity_needed || 'Quantity'} {form.quantity_unit || 'units'} · {form.summary || 'Need details'}</p></div>
        {state === 'draft' && <div className="need-editor-actions"><button type="submit" disabled={busy}>{userId ? 'Save draft' : 'Sign in to save'}</button>
          <button type="button" disabled={busy} onClick={() => void persist(true)}>{userId ? 'Submit for review' : 'Sign in to submit'}</button></div>}
      </form>
    {message && <p role="status" className="need-editor-message">{message}</p>}
    {error && <p role="alert" className="need-editor-error">{error}</p>}
  </div>;
}
