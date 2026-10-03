import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { loadCatalog, searchCatalog } from '@api';
import { Globe } from './Globe';
import { VoiceControl } from './VoiceControl';
import { NeedHub } from './NeedHub';
import { AuthPanel } from './AuthPanel';
import { OpportunityDetail } from './OpportunityDetail';
import { SearchResults } from './SearchResults';
import { AgentWorkbench } from './AgentWorkbench';
import { GuidePanel } from './GuidePanel';
import type { HeliosItem, MatchReason, SearchResponse } from './types';
import type { VoiceActivity } from './voiceActivity';
import { useHoldToTalk } from './useHoldToTalk';
import { useMapFocus } from './useMapFocus';

const exampleQueries = [
  'Where can I volunteer this Sunday?',
  'Find food relief in San Francisco',
  'What can $10 support?',
  'Show opportunities in Lagos',
  'How can I help from anywhere?',
];

function addUnseenCatalog(current: HeliosItem[], response: SearchResponse): HeliosItem[] {
  const known = new Set(current.map((item) => item.id));
  const additions = [...response.items, ...(response.alternatives ?? []).map(({ item }) => item)]
    .filter((item) => !known.has(item.id));
  return additions.length ? [...current, ...additions] : current;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [items, setItems] = useState<HeliosItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<HeliosItem[]>([]);
  const [alternatives, setAlternatives] = useState<NonNullable<SearchResponse['alternatives']>>([]);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const { focus: mapFocus, notice: mapNotice, focusQuery, focusPlace, focusWorld } = useMapFocus(catalogItems);
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('item'));
  const [catalogCount, setCatalogCount] = useState(0);
  const [mode, setMode] = useState<SearchResponse['mode'] | null>(null);
  const [fit, setFit] = useState<SearchResponse['fit']>();
  const [reasonCodes, setReasonCodes] = useState<MatchReason[]>([]);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(Boolean(selectedId));
  const [agentOpen, setAgentOpen] = useState(false);
  const [mcpHandoffId, setMcpHandoffId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [needId, setNeedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('need'));
  const [needsOpen, setNeedsOpen] = useState(() => Boolean(new URLSearchParams(window.location.search).get('need')));
  const [spokenOffer, setSpokenOffer] = useState<{ text: string } | null>(null);
  const [voiceStartRequest, setVoiceStartRequest] = useState(0);
  const [voiceActivity, setVoiceActivity] = useState<VoiceActivity>('idle');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const holdToTalk = useHoldToTalk();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement>(null);
  const resultRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const returnFocusIdRef = useRef<string | null>(selectedId);
  const selected = catalogItems.find((item) => item.id === selectedId) ?? items.find((item) => item.id === selectedId) ?? null;

  function startVoice() {
    if (!voiceAvailable) { setVoiceNotice(import.meta.env.DEV ? 'OpenAI voice needs the local API. Run vercel dev alongside this preview.' : 'OpenAI voice is unavailable right now.'); return; }
    setVoiceNotice(null);
    setVoiceStartRequest((value) => value + 1);
  }

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setExampleIndex((index) => (index + 1) % exampleQueries.length), 4200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    requestRef.current = controller;
    loadCatalog(controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setItems(response.items);
      setCatalogItems(response.items);
      setSelectedId((current) => current && response.items.some((item) => item.id === current) ? current : null);
      setCatalogCount(response.catalog_count);
      setVoiceAvailable(response.voice_available);
      setError(null);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Catalog unavailable.');
        setResultsOpen(true);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false);
      if (requestRef.current === controller) requestRef.current = null;
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId) url.searchParams.set('item', selectedId);
    else url.searchParams.delete('item');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [selectedId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (needsOpen && needId) url.searchParams.set('need', needId);
    else url.searchParams.delete('need');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [needsOpen, needId]);

  useEffect(() => {
    if (selected) detailCloseRef.current?.focus();
    else if (!busy && resultsOpen && returnFocusIdRef.current) {
      resultRefs.current.get(returnFocusIdRef.current)?.focus();
      returnFocusIdRef.current = null;
    }
  }, [selected, busy, resultsOpen]);

  const acceptSearch = useCallback((response: SearchResponse) => {
    setItems(response.items);
    setAlternatives(response.alternatives ?? []);
    setNextStep(response.next_step ?? null);
    setCatalogItems((current) => addUnseenCatalog(current, response));
    setCatalogCount(response.catalog_count);
    setMode(response.mode);
    setFit(response.fit);
    setReasonCodes(response.reason_codes ?? []);
    const singleRecordMatch = response.items.length === 1 && response.fit === 'record_match';
    setSelectedId(response.mode === 'keyword' && !singleRecordMatch ? null : response.items[0]?.id ?? null);
    setResultsOpen(true);
    setError(null);
  }, []);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setNeedsOpen(false);
    setAgentOpen(false);
    setAccountOpen(false);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setResultsOpen(true);
    setSelectedId(null);
    setQuery(trimmed);
    focusQuery(trimmed);
    try {
      const response = await searchCatalog(trimmed, {}, controller.signal);
      if (!controller.signal.aborted) acceptSearch(response);
    } catch (cause: unknown) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Search unavailable.');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }, [acceptSearch, focusQuery]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query);
  }

  const showAll = async () => {
    setNeedsOpen(false);
    setAgentOpen(false);
    setAccountOpen(false);
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setResultsOpen(true);
    try {
      const response = await loadCatalog(controller.signal);
      if (controller.signal.aborted) return;
      setItems(response.items);
      setCatalogItems(response.items);
      setAlternatives([]);
      setNextStep(null);
      focusWorld();
      setCatalogCount(response.catalog_count);
      setVoiceAvailable(response.voice_available);
      setMode(null);
      setFit(undefined);
      setReasonCodes([]);
      setSelectedId(null);
      setQuery('');
      setError(null);
    } catch (cause: unknown) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Catalog unavailable.');
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  };

  const acceptVoiceSearch = (response: SearchResponse, spokenQuery: string, place?: string) => {
    setNeedsOpen(false);
    setAgentOpen(false);
    setAccountOpen(false);
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(false);
    setQuery(spokenQuery);
    if (place) void focusPlace(place);
    else focusQuery(spokenQuery);
    acceptSearch(response);
  };

  const focusItem = (id: string) => {
    setNeedsOpen(false);
    setAgentOpen(false);
    setAccountOpen(false);
    returnFocusIdRef.current = id;
    setSelectedId(id);
    setResultsOpen(true);
  };

  const focusNeed = (id: string, offer?: string) => {
    setSpokenOffer(offer ? { text: offer } : null);
    setNeedId(id);
    setAgentOpen(false);
    setAccountOpen(false);
    setNeedsOpen(true);
  };

  return <div className="app-shell">
    <main className="atlas-stage">
      <Globe items={catalogItems} selectedId={selectedId} focus={mapFocus} onSelect={focusItem} onExplore={(place) => place ? void runSearch(`Show organizations in ${place}`) : setResultsOpen(true)} />
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Helios home"><img src="/brand/helios-mark.svg" alt="" /><span>HELIOS</span></a>
        <nav className="top-actions" aria-label="Explore HeliOS">
          <button type="button" onClick={() => { setGuideOpen(false); void showAll(); }} disabled={busy} aria-label="Find ways to help"><span className="nav-full">Find ways to help</span><span className="nav-compact">Browse</span></button>
          <button type="button" onClick={() => { setGuideOpen(false); setSpokenOffer(null); setNeedId(null); setNeedsOpen((open) => !open); setAgentOpen(false); setAccountOpen(false); }} aria-expanded={needsOpen} aria-controls="need-window" aria-label="Explore sourced needs"><span className="nav-full">Explore needs</span><span className="nav-compact">Needs</span></button>
          <button type="button" onClick={() => { setGuideOpen(false); setAgentOpen((open) => !open); setNeedsOpen(false); setAccountOpen(false); }} aria-expanded={agentOpen} aria-controls="agent-window" aria-label="Connect an agent"><span className="nav-full">Connect agents</span><span className="nav-compact">Agents</span></button>
          <button type="button" onClick={() => { setGuideOpen(false); setAccountOpen((open) => !open); setAgentOpen(false); setNeedsOpen(false); }} aria-expanded={accountOpen} aria-label="My actions"><span className="nav-full">My actions</span><span className="nav-compact">Actions</span></button>
        </nav>
      </header>

      {!resultsOpen && !selected && !needsOpen && <div className="hero-copy">
        <p>THE HELIOS ATLAS</p>
        <h1>Find a way<br />to help.</h1>
        <div className="hero-actions"><button className="hero-voice-cta" type="button" onClick={startVoice}>Talk to HeliOS <span aria-hidden="true">↗</span></button>
          <button className="hero-guide-cta" type="button" onClick={() => setGuideOpen(true)}>How it works</button></div>
      </div>}

      {(resultsOpen || error) && !selected && !needsOpen && !accountOpen && <SearchResults items={items}
        alternatives={alternatives} nextStep={nextStep} mode={mode} fit={fit} reasons={reasonCodes}
        count={catalogCount} query={query} busy={busy} error={error} mapNotice={mapNotice} selectedId={selectedId} resultRefs={resultRefs}
        onClose={() => { setResultsOpen(false); setError(null); }} onSelect={focusItem} />}

      {selected && !needsOpen && !agentOpen && !accountOpen && <OpportunityDetail key={selected.id} item={selected} fit={fit}
        mcpHandoff={mcpHandoffId === selected.id}
        reasonCodes={reasonCodes} closeRef={detailCloseRef} onClose={() => setSelectedId(null)} onAccount={() => setAccountOpen(true)} />}

      <div className="command-zone">
        <form className="command-dock" data-voice-activity={voiceActivity} onSubmit={handleSubmit}>
          <span className="command-character" aria-hidden="true"><span className="command-eyes"><span className="command-eye" /><span className="command-eye" /></span></span>
          <label className="sr-only" htmlFor="helios-search">Search by cause, place, or date</label>
          <span className="search-field"><input id="helios-search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" />
            {!query && <span className="search-example" key={exampleIndex} aria-hidden="true">{exampleQueries[exampleIndex]}</span>}</span>
          <button type="submit" className="search-submit" disabled={busy || !query.trim()} aria-label="Search opportunities">↗</button>
          <span className="dock-divider" aria-hidden="true" />
          <VoiceControl available={voiceAvailable} onSearch={acceptVoiceSearch} onFocus={focusItem} onPlace={focusPlace} onNeed={focusNeed} results={[...items, ...alternatives.map(({ item }) => item)]} startRequest={voiceStartRequest} holdToTalk={holdToTalk} onActivityChange={setVoiceActivity} onNotice={setVoiceNotice} />
        </form>
        <span className="command-hint" role={voiceNotice ? 'alert' : 'status'}>{voiceNotice ?? (voiceActivity === 'connecting' ? 'Connecting HeliOS voice…' : voiceActivity === 'listening' ? 'Listening to you' : voiceActivity === 'speaking' ? 'Helios is speaking' : voiceActivity === 'hold-ready' ? 'Hold Option to speak · Tap the mic to stop' : voiceActivity === 'ready' ? 'Speak to HeliOS · Tap the mic to stop' : voiceAvailable ? 'Hold Option to talk · Tap the mic for conversation' : 'OpenAI voice unavailable in this preview')}</span>
      </div>

      {agentOpen && <AgentWorkbench onFocus={(id) => { setMcpHandoffId(id); focusItem(id); }} onClose={() => setAgentOpen(false)} />}
      {guideOpen && <GuidePanel onClose={() => setGuideOpen(false)} onTalk={() => { setGuideOpen(false); startVoice(); }} />}
      {needsOpen && !accountOpen && <NeedHub selectedId={needId} onSelect={setNeedId} onClose={() => setNeedsOpen(false)}
        onAccount={() => setAccountOpen(true)} onVoice={startVoice}
        voiceAvailable={voiceAvailable} spokenOffer={spokenOffer} />}
      {accountOpen && <AuthPanel onClose={() => setAccountOpen(false)} />}
    </main>
  </div>;
}
