import { useEffect, useRef, useState } from 'react';
import { searchCatalog } from '@api';
import type { HeliosItem, SearchResponse } from './types';
import type { VoiceActivity } from './voiceActivity';

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
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
  onExploreNeeds: () => void;
  startRequest: number;
  holdToTalk: boolean;
  onActivityChange: (activity: VoiceActivity) => void;
  onNotice: (notice: string | null) => void;
};

const greeting = 'Hi, I’m Helios. I can find sourced ways to help and show the official next step. Would you like to give time, offer something you have, or make a donation?';
const howItWorks = 'I can search public opportunities by cause, place, time, or budget, and show their sources and official next steps. Explore needs shows public requests, and Connect agents shares published records with another agent. Organizations confirm signups, gifts, and deliveries. What would you like to do first?';

export function BrowserVoiceAgent({ onSearch, onFocus, onExploreNeeds, startRequest, holdToTalk, onActivityChange, onNotice }: Props) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('');
  const [caption, setCaption] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const activeRef = useRef(false);
  const modeRef = useRef<'continuous' | 'hold'>('continuous');
  const recognitionRef = useRef<Recognition | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const holdRef = useRef(holdToTalk);
  const replyTimerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const emptyEndCountRef = useRef(0);
  const searchRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const resultsRef = useRef<HeliosItem[]>([]);
  const pendingIntentRef = useRef<'time' | 'money' | null>(null);
  useEffect(() => onNotice(error || null), [error, onNotice]);

  function clearVoiceTimers() {
    if (replyTimerRef.current !== null) window.clearTimeout(replyTimerRef.current);
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    replyTimerRef.current = null;
    restartTimerRef.current = null;
  }

  function listen() {
    if (!activeRef.current) return;
    const browser = window as RecognitionWindow;
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) {
      setStatus('Type your reply');
      onActivityChange('idle');
      setError('Voice input is unavailable in this browser. You can type your reply.');
      return;
    }
    const recognition = new Constructor();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    const generation = generationRef.current;
    let failed = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results, (result) => result[0]?.transcript ?? '').join(' ').trim();
      if (!transcript) return;
      emptyEndCountRef.current = 0;
      if (replyTimerRef.current !== null) window.clearTimeout(replyTimerRef.current);
      replyTimerRef.current = window.setTimeout(() => {
        replyTimerRef.current = null;
        if (activeRef.current && generation === generationRef.current) void respond(transcript);
      }, 1200);
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      failed = true;
      if (activeRef.current) { setStatus('Type your reply'); onActivityChange('idle'); setError('Voice input failed. Check microphone access or type your reply.'); }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (!activeRef.current || failed || replyTimerRef.current !== null) return;
      if (modeRef.current !== 'continuous' && !holdRef.current) return;
      if (++emptyEndCountRef.current > 3) {
        setStatus('Type your reply');
        onActivityChange('idle');
        setError('Microphone input keeps stopping. Check browser access or type your reply.');
        return;
      }
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (activeRef.current && generation === generationRef.current && !recognitionRef.current) listen();
      }, 300);
    };
    recognitionRef.current = recognition;
    try { recognition.start(); setStatus('Listening'); onActivityChange('listening'); }
    catch { recognitionRef.current = null; setStatus('Type your reply'); onActivityChange('idle'); setError('Voice input could not start. You can type your reply.'); }
  }

  function speak(message: string) {
    if (!activeRef.current) return;
    setCaption(message);
    setStatus('Helios is speaking');
    onActivityChange('speaking');
    if (!('speechSynthesis' in window)) {
      setStatus('Type your reply');
      onActivityChange('idle');
      return;
    }
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.onerror = null; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    speechRef.current = utterance;
    utterance.rate = 1.02;
    utterance.onend = () => modeRef.current === 'hold' ? stop() : listen();
    utterance.onerror = () => { stop(); setError('Voice playback failed. Use search.'); };
    window.speechSynthesis.speak(utterance);
  }

  function start(mode: 'continuous' | 'hold' = 'continuous') {
    if (activeRef.current) return;
    activeRef.current = true;
    modeRef.current = mode;
    generationRef.current += 1;
    emptyEndCountRef.current = 0;
    clearVoiceTimers();
    setActive(true);
    setError('');
    setCaption('');
    resultsRef.current = [];
    pendingIntentRef.current = null;
    if (mode === 'hold') listen();
    else speak(greeting);
  }

  function stop() {
    activeRef.current = false;
    generationRef.current += 1;
    clearVoiceTimers();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    searchRef.current?.abort();
    searchRef.current = null;
    pendingIntentRef.current = null;
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.onerror = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setActive(false);
    setStatus('');
    setCaption('');
    setAnswer('');
    setError('');
    onActivityChange('idle');
  }

  useEffect(() => () => {
    activeRef.current = false;
    clearVoiceTimers();
    recognitionRef.current?.stop();
    searchRef.current?.abort();
    if (speechRef.current) { speechRef.current.onend = null; speechRef.current.onerror = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    onActivityChange('idle');
  }, []);

  useEffect(() => { if (startRequest > 0 && !activeRef.current) start(); }, [startRequest]);

  useEffect(() => {
    holdRef.current = holdToTalk;
    if (holdToTalk && !activeRef.current) { start('hold'); return; }
    if (modeRef.current !== 'hold') return;
    if (!holdToTalk) recognitionRef.current?.stop();
    else if (activeRef.current && !recognitionRef.current && !searchRef.current) listen();
  }, [holdToTalk]);

  async function respond(raw: string) {
    const text = raw.trim();
    if (!text || !activeRef.current) return;
    clearVoiceTimers();
    setAnswer('');
    setError('');
    onActivityChange('idle');
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
      pendingIntentRef.current = null;
      speak(howItWorks);
      return;
    }
    if (/^(?:i(?:'d| would)? (?:like|want) to )?(?:volunteer|give (?:my )?time|time)[.!? ]*$/i.test(text)) {
      pendingIntentRef.current = 'time';
      speak('Which city or country would you like to volunteer in? You can add a day that works for you.');
      return;
    }
    if (/^(?:i(?:'d| would)? (?:like|want) to )?(?:donate|give money|money)[.!? ]*$/i.test(text)) {
      pendingIntentRef.current = 'money';
      speak('Which cause or place matters to you? You can include a budget.');
      return;
    }
    if (/^(?:i(?:'d| would)? (?:like|want) to )?(?:offer something(?: i have)?|offer an item|something i have|explore needs)[.!? ]*$/i.test(text)) {
      pendingIntentRef.current = null;
      onExploreNeeds();
      speak('I opened Explore needs. Pick a sourced request and use Check offer to see whether your contribution might fit. The organization still needs to confirm it.');
      return;
    }
    const ordinal = /\b(second|2nd)\b/.test(lower) ? 1 : /\b(third|3rd)\b/.test(lower) ? 2 : 0;
    const named = existing.find((item) => lower.includes(item.organization_name.toLowerCase()));
    if ((/\b(show|tell me about|more about|first|second|third|yes)\b/.test(lower) || named) && existing.length) {
      const item = named ?? existing[ordinal];
      if (item) {
        pendingIntentRef.current = null;
        onFocus(item.id);
        speak(`${item.organization_name}: ${item.summary} I’ve opened its card with the official next-step link and source on screen. ${item.availability_status === 'not_confirmed' ? 'Please confirm a place with the organization.' : ''}`);
        return;
      }
    }
    if (/^(help|anything|not sure|i don.t know|what can i do)[.!? ]*$/i.test(text)) {
      pendingIntentRef.current = null;
      speak('Would you rather volunteer your time or give money? You can tell me a cause, a free day like Sunday, or a budget like ten dollars.');
      return;
    }
    const intent = pendingIntentRef.current;
    pendingIntentRef.current = null;
    const query = intent === 'time' ? `volunteer ${text}` : intent === 'money' ? `donate ${text}` : text;
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    const generation = generationRef.current;
    setStatus('Searching sourced opportunities');
    try {
      const response = await searchCatalog(query, {}, controller.signal);
      if (!activeRef.current || generation !== generationRef.current || controller.signal.aborted) return;
      onSearch(response);
      resultsRef.current = response.items;
      if (response.items.length === 0) {
        speak(response.reason_codes?.includes('location_unknown')
          ? 'I do not know your location. Which city or country should I search?'
          : 'I don’t have a verified match in this small catalog yet. What city or cause should I try next?');
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
        setError(cause instanceof Error ? cause.message : 'Search unavailable.');
        speak('Search is unavailable right now. Please try again later.');
      }
    } finally { if (searchRef.current === controller) searchRef.current = null; }
  }

  return <div className="voice-control">
    <button type="button" className={`voice-button ${active ? 'is-live' : ''}`} onClick={active ? stop : () => start()}
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
