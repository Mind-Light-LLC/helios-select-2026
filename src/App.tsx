import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { loadCatalog, searchCatalog } from '@api';
import { Globe } from './Globe';
import { VoiceControl } from './VoiceControl';
import type { HeliosItem, SearchResponse } from './types';

function checkedLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Check date unavailable' : `Checked ${date.toLocaleDateString()}`;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<HeliosItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [catalogCount, setCatalogCount] = useState(0);
  const [mode, setMode] = useState<SearchResponse['mode'] | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal).then((response) => {
      setItems(response.items);
      setCatalogCount(response.catalog_count);
      setError(null);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Catalog unavailable.');
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);

  const acceptSearch = useCallback((response: SearchResponse) => {
    setItems(response.items);
    setCatalogCount(response.catalog_count);
    setMode(response.mode);
    setSelectedId(response.items[0]?.id ?? null);
    setError(null);
  }, []);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      acceptSearch(await searchCatalog(trimmed));
      setQuery(trimmed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Search unavailable.');
    } finally {
      setBusy(false);
    }
  }, [acceptSearch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query);
  }

  const showAll = async () => {
    setBusy(true);
    try {
      const response = await loadCatalog();
      setItems(response.items);
      setCatalogCount(response.catalog_count);
      setMode(null);
      setSelectedId(null);
      setQuery('');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Catalog unavailable.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="app-shell">
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="Helios home"><span className="brand-mark">H</span> HELIOS</a>
      <span className="header-note">A Mind Light experiment</span>
    </header>
    <main className="main-layout">
      <section className="discovery-panel" aria-label="Discover public benefit work">
        <div className="intro">
          <p className="eyebrow">A WORLD OF WORK TO DO</p>
          <h1>Find where you can make a difference.</h1>
          <p className="lead">Search real organizations and opportunities. Explore their place on the globe, check the source, and take the next step.</p>
        </div>
        <form className="search-form" onSubmit={handleSubmit}>
          <label htmlFor="helios-search">What are you looking for?</label>
          <div className="search-row">
            <input id="helios-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. volunteer with food relief in Lagos" autoComplete="off" />
            <button type="submit" disabled={busy || !query.trim()}>Search</button>
          </div>
        </form>
        <div className="search-tools">
          <VoiceControl onSearch={acceptSearch} onFocus={setSelectedId} results={items} />
          <button type="button" className="text-button" onClick={showAll} disabled={busy}>Show all</button>
        </div>
        <div className="catalog-status" role="status">
          {busy ? 'Loading sourced records…' : error ? 'Catalog connection needs attention' : `${catalogCount} sourced records in this early catalog`}
          {mode && !error && <span> · {mode === 'semantic' ? 'Semantic match' : 'Keyword match'}</span>}
        </div>
        {error && <div className="state-card error-card" role="alert"><strong>Search is unavailable</strong><p>{error}</p></div>}
        {!busy && !error && items.length === 0 && <div className="state-card"><strong>{catalogCount === 0 ? 'The catalog is being connected' : 'No matching records'}</strong><p>{catalogCount === 0 ? 'The globe is ready. Sourced organizations and opportunities will appear here once published.' : 'Try another place or cause. Only verified catalog records are returned.'}</p></div>}
        <div className="results" aria-label="Search results">
          {items.map((item) => <article className={`result-card ${selectedId === item.id ? 'is-selected' : ''}`} key={item.id}>
            <button type="button" className="result-focus" onClick={() => setSelectedId(item.id)} aria-label={`Fly to ${item.title}`}>
              <span className="result-type">{item.record_kind}</span>
              <strong>{item.title}</strong>
              <span>{item.organization_name} · {item.country}</span>
            </button>
          </article>)}
        </div>
      </section>
      <section className="map-panel" aria-label="Global map">
        <Globe items={items} selectedId={selectedId} onSelect={setSelectedId} />
        {selected && <div className="detail-card">
          <button type="button" className="detail-close" onClick={() => setSelectedId(null)} aria-label="Close details">×</button>
          <span className="result-type">{selected.record_kind}</span>
          <h2>{selected.title}</h2>
          <p>{selected.summary}</p>
          <p className="meta">{selected.place_label} · {selected.pin_meaning === 'event_city' ? 'Event city' : 'Representative organization city'}</p>
          {selected.schedule_text && <p className="meta">{selected.schedule_text}</p>}
          <p className="meta">{checkedLabel(selected.source_checked_at)}</p>
          <div className="detail-links">
            <a href={selected.source_url} target="_blank" rel="noopener noreferrer">View source</a>
            {selected.action_url && <a className="action-link" href={selected.action_url} target="_blank" rel="noopener noreferrer">Visit official page ↗</a>}
          </div>
        </div>}
      </section>
    </main>
    <footer className="site-footer">Global view. Limited catalog. An external page controls registration or admission.</footer>
  </div>;
}
