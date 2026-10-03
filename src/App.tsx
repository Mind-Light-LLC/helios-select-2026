import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { loadCatalog, searchCatalog } from '@api';
import { Globe } from './Globe';
import { VoiceControl } from './VoiceControl';
import { BrowserVoiceAgent } from './BrowserVoiceAgent';
import { NeedHub } from './NeedHub';
import { AuthPanel } from './AuthPanel';
import { OpportunityDetail } from './OpportunityDetail';
import { OrganizationMark } from './OrganizationMark';
import { AgentWorkbench } from './AgentWorkbench';
import { GuidePanel } from './GuidePanel';
import { isCurrentReview } from './sfSearch';
import type { HeliosItem, MatchReason, SearchResponse } from './types';
import type { VoiceActivity } from './voiceActivity';
import { useHoldToTalk } from './useHoldToTalk';

const exampleQueries = [
  'Where can I volunteer this Sunday?',
  'Find food relief in San Francisco',
  'What can $10 support?',
  'Show opportunities in Lagos',
  'How can I help from anywhere?',
];

function matchDetail(mode: SearchResponse['mode'] | null, fit: SearchResponse['fit'], reasons: MatchReason[], count: number, query: string): string {
  if (reasons.includes('location_unknown')) return 'Place unknown. Name a city or country.';
  if (reasons.includes('location_mismatch') && count === 0) return 'No sourced record in that place.';
  if (reasons.includes('eligibility_unverified')) return 'Eligibility unknown from these sources.';
  if (reasons.includes('availability_unconfirmed') && count === 0) return 'No confirmed opening in this catalog.';
  if (reasons.includes('schedule_unverified') && count === 0) return 'Timing unknown from these sources.';
  if (reasons.includes('date_mismatch') && count === 0) return 'No sourced record on that date.';
  if (fit === 'no_match' || count === 0) return 'No match in this catalog';
  if (mode === null) return 'Browse the catalog';
  if (/\$\s*\d+|\bdonat\w*\b|\bdollars?\b/i.test(query)) return 'Official donation paths. Check the amount on each organization’s site.';
  if (reasons.includes('location_mismatch')) return 'Place differs from your request';
  if (reasons.includes('date_mismatch') || reasons.includes('schedule_mismatch')) return 'Timing differs from your request';
  if (fit === 'related_path') return 'Related path. Check the details.';
  if (reasons.includes('availability_unconfirmed')) return 'Sourced path. Confirm an open spot with the organization.';
  if (mode === 'keyword') return 'Text match. Check place and timing.';
  return 'Sourced path to explore';
}

export default function App() {
  const [query, setQuery] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [items, setItems] = useState<HeliosItem[]>([]);
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
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const donationSearch = /\$\s*\d+|\bdonat\w*\b|\bdollars?\b/i.test(query);

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
  }, [acceptSearch]);

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

  const acceptVoiceSearch = (response: SearchResponse) => {
    setNeedsOpen(false);
    setAgentOpen(false);
    setAccountOpen(false);
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(false);
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
      <Globe items={items} selectedId={selectedId} onSelect={focusItem} onExplore={(place) => place ? void runSearch(`Show organizations in ${place}`) : setResultsOpen(true)} />
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
        <div className="hero-actions"><button className="hero-voice-cta" type="button" onClick={() => setVoiceStartRequest((value) => value + 1)}>Talk to HeliOS <span aria-hidden="true">↗</span></button>
          <button className="hero-guide-cta" type="button" onClick={() => setGuideOpen(true)}>How it works</button></div>
      </div>}

      {(resultsOpen || error) && !selected && !needsOpen && !accountOpen && <aside className={`results-sheet ${error || (!busy && items.length < 4) ? 'is-compact' : ''}`} aria-label="Sourced opportunities">
        <div className="sheet-heading">
          <div><span className="sheet-kicker">{mode ? 'SEARCH RESULTS' : 'EXPLORE'}</span><h2>{mode ? 'Places to explore' : 'Sourced places'}</h2></div>
          <button type="button" onClick={() => { setResultsOpen(false); setError(null); }} aria-label="Close results">×</button>
        </div>
        <p className="sheet-status" role="status">{busy ? 'Searching sourced records…' : error ? 'Catalog unavailable' : matchDetail(mode, fit, reasonCodes, items.length, query)} <span>{!busy && !error ? `${items.length} / ${catalogCount}` : ''}</span></p>
        {error && <p className="sheet-error" role="alert">{error}</p>}
        {!busy && !error && items.length === 0 && <p className="sheet-empty">Try another place, cause, or date. This catalog is still small.</p>}
        <div className="result-list">
          {!busy && !error && items.map((item) => <button type="button" className={`result-row ${selectedId === item.id ? 'is-selected' : ''}`} key={item.id} ref={(node) => { if (node) resultRefs.current.set(item.id, node); else resultRefs.current.delete(item.id); }} onClick={() => focusItem(item.id)}>
            <OrganizationMark item={item} />
            <span className="result-main"><strong>{item.title}</strong><small>{donationSearch ? `${item.organization_name} · ${item.donation_minimum_usd === 10 && isCurrentReview(item) ? '$10 minimum verified' : 'Check gift amount'}` : `${item.organization_name} · ${item.country}`}</small></span>
            <span className="result-chevron" aria-hidden="true">›</span>
          </button>)}
        </div>
        {!error && items.length > 0 && <p className="sheet-foot">{donationSearch ? 'Donate only on the organization’s official site.' : 'Confirm availability with the organization.'}</p>}
      </aside>}

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
          {voiceAvailable
            ? <VoiceControl available onSearch={acceptVoiceSearch} onFocus={focusItem} onNeed={focusNeed} results={items} startRequest={voiceStartRequest} holdToTalk={holdToTalk} onActivityChange={setVoiceActivity} onNotice={setVoiceNotice} onUnavailable={() => setVoiceAvailable(false)} />
            : <BrowserVoiceAgent onSearch={acceptVoiceSearch} onFocus={focusItem} onExploreNeeds={() => { setNeedsOpen(true); setAgentOpen(false); setAccountOpen(false); }} startRequest={voiceStartRequest} holdToTalk={holdToTalk} onActivityChange={setVoiceActivity} onNotice={setVoiceNotice} />}
        </form>
        <span className="command-hint" role={voiceNotice ? 'alert' : 'status'}>{voiceNotice ?? (voiceActivity === 'listening' ? 'Listening' : voiceActivity === 'speaking' ? 'Helios is speaking' : 'Tap the mic to talk')}</span>
      </div>

      {agentOpen && <AgentWorkbench onFocus={(id) => { setMcpHandoffId(id); focusItem(id); }} onClose={() => setAgentOpen(false)} />}
      {guideOpen && <GuidePanel onClose={() => setGuideOpen(false)} onTalk={() => { setGuideOpen(false); setVoiceStartRequest((value) => value + 1); }} />}
      {needsOpen && !accountOpen && <NeedHub selectedId={needId} onSelect={setNeedId} onClose={() => setNeedsOpen(false)}
        onAccount={() => setAccountOpen(true)} onVoice={() => setVoiceStartRequest((value) => value + 1)}
        voiceAvailable={voiceAvailable} spokenOffer={spokenOffer} />}
      {accountOpen && <AuthPanel onClose={() => setAccountOpen(false)} />}
    </main>
  </div>;
}
