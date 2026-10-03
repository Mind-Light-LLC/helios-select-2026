import { useEffect, useRef, useState } from 'react';
import { searchCatalog } from '@api';
import type { HeliosItem, SearchResponse } from './types';

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
type Props = {
  onSearch: (response: SearchResponse) => void;
  onFocus: (id: string) => void;
  startRequest: number;
};

const greeting = 'Hey, what’s up? I’m HeliOS. How would you like to help? A cause, a city, a free Sunday, or ten dollars is plenty to start. No grand plan required.';
const howItWorks = 'Tell me a cause, place, free day, or budget. I’ll find sourced organizations and show what we know about timing and official next steps. You can explore needs or connect another agent to the same records. I do the digging; the organization gives the final yes. What would you like to try?';

export function BrowserVoiceAgent({ onSearch, onFocus, startRequest }: Props) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('');
  const [caption, setCaption] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const activeRef = useRef(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const searchRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const resultsRef = useRef<HeliosItem[]>([]);

  function listen() {
    if (!activeRef.current) return;
    const browser = window as RecognitionWindow;
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) { setStatus('Type your reply'); return; }
    const recognition = new Constructor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    let heard = false;
    recognition.onresult = (event) => {
      heard = true;
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) void respond(transcript);
      else setStatus('Type your reply');
    };
    recognition.onerror = () => { if (activeRef.current) setStatus('Type your reply'); };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (!heard && activeRef.current) setStatus('Type your reply');
    };
    recognitionRef.current = recognition;
    try { recognition.start(); setStatus('Listening'); }
    catch { recognitionRef.current = null; setStatus('Type your reply'); }
  }

  function speak(message: string) {
    if (!activeRef.current) return;
    setCaption(message);
    setStatus('Helios is speaking');
    if (!('speechSynthesis' in window)) { listen(); return; }
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.onerror = null; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    speechRef.current = utterance;
    utterance.rate = 1.02;
    utterance.onend = () => listen();
    utterance.onerror = () => listen();
    window.speechSynthesis.speak(utterance);
  }

  function start() {
    if (activeRef.current) return;
    activeRef.current = true;
    generationRef.current += 1;
    setActive(true);
    setError('');
    resultsRef.current = [];
    speak(greeting);
  }

  function stop() {
    activeRef.current = false;
    generationRef.current += 1;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    searchRef.current?.abort();
    searchRef.current = null;
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.onerror = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setActive(false);
    setStatus('');
    setCaption('');
    setError('');
  }

  useEffect(() => () => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    searchRef.current?.abort();
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.onerror = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => { if (startRequest > 0 && !activeRef.current) start(); }, [startRequest]);

  async function respond(raw: string) {
    const text = raw.trim();
    if (!text || !activeRef.current) return;
    setAnswer('');
    setError('');
    setCaption(`You: ${text}`);
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.onerror = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.stop();
    }
    recognitionRef.current = null;
    const existing = resultsRef.current;
    const lower = text.toLowerCase();
    if (/\b(how (?:does|do) (?:helios|this|the app|it) work|how (?:can|do) i use (?:helios|this|the app|it)|what (?:can|does) (?:helios|this|the app) do|show me how|explain (?:helios|the app|how))/i.test(lower)) {
      speak(howItWorks);
      return;
    }
    const ordinal = /\b(second|2nd)\b/.test(lower) ? 1 : /\b(third|3rd)\b/.test(lower) ? 2 : 0;
    const named = existing.find((item) => lower.includes(item.organization_name.toLowerCase()));
    if ((/\b(show|tell me about|more about|first|second|third|yes)\b/.test(lower) || named) && existing.length) {
      const item = named ?? existing[ordinal];
      if (item) {
        onFocus(item.id);
        speak(`${item.organization_name}: ${item.summary} I’ve put its source and official next step on screen. ${item.availability_status === 'not_confirmed' ? 'Please confirm a place with the organization.' : ''}`);
        return;
      }
    }
    if (/^(help|anything|not sure|i don.t know|what can i do)[.!? ]*$/i.test(text)) {
      speak('We can start small. Would you rather give time or money? A cause, a free day like Sunday, or a budget like ten dollars is enough for me to search.');
      return;
    }
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    const generation = generationRef.current;
    setStatus('Searching sourced opportunities');
    try {
      const response = await searchCatalog(text, {}, controller.signal);
      if (!activeRef.current || generation !== generationRef.current || controller.signal.aborted) return;
      onSearch(response);
      resultsRef.current = response.items;
      if (response.items.length === 0) {
        speak(response.reason_codes?.includes('location_unknown')
          ? 'I do not know your location. Which city or country should I search?'
          : 'Big planet, small catalog. I don’t have a sourced match for that yet. What other city or cause should I try?');
        return;
      }
      const options = response.items.slice(0, 2).map((item) => `${item.organization_name} in ${item.place_label}`).join(', and ');
      const timingNote = /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(text)
        ? 'These are published recurring days, not confirmed open spots. ' : '';
      const giftNote = /\$|\bdonat|\bdollars?\b/i.test(text)
        ? 'Any donation happens on the organization’s own site. ' : '';
      speak(`I found ${response.items.length} sourced ${response.items.length === 1 ? 'path' : 'paths'}, including ${options}. ${timingNote}${giftNote}Want me to show you the first one, or tell me another place or cause?`);
    } catch (cause: unknown) {
      if (!controller.signal.aborted && activeRef.current) {
        setStatus('Type your reply');
        setError(cause instanceof Error ? cause.message : 'Search unavailable.');
      }
    } finally { if (searchRef.current === controller) searchRef.current = null; }
  }

  return <div className="voice-control">
    <button type="button" className={`voice-button ${active ? 'is-live' : ''}`} onClick={active ? stop : start}
      aria-label={active ? 'Stop Helios conversation' : 'Talk to Helios'} aria-pressed={active}>
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8" /></svg>
    </button>
    {active && <div className="voice-status voice-conversation" role="status" aria-live="polite">
      <strong>{status}</strong><p>{caption}</p>
      <div className="voice-reply"><label className="sr-only" htmlFor="voice-answer">Reply to Helios</label>
        <input id="voice-answer" value={answer} onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void respond(answer); } }} placeholder="Or type your reply" />
        <button type="button" onClick={() => void respond(answer)} disabled={!answer.trim()}>Send</button></div>
      {error && <p className="voice-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
