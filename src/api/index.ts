import type { CardDetails, CatalogResponse, SearchOptions, SearchResponse } from '../types';
import { sourcedNeeds, type NeedView } from '../needData';
import { demoCatalog } from '../demoCatalog';
import { searchCurated } from '../sfSearch';
import { feasibleItems } from '../feasibleMatch';

export { assessOffer, sourcedNeeds } from '../needData';
export type { OfferAssessment, SourcedNeed } from '../needData';
export type { NeedView, PartnerNeed } from '../needData';
export { loadAuthConfig, getAuthClient } from './authClient';
export type { AuthConfig } from './authClient';
export { agentSearch, agentDetail, connectAgentClient } from './mcpClient';
export type { AgentRecord, AgentSearch, AgentDetail } from './mcpClient';
export { listSavedActions, saveAccountAction, savedActionsEvent } from './savedActions';
export type { SavedAction } from './savedActions';

export type VoiceToken = { value: string; expires_at: number };

function isLocalViteRouteMiss(response: Response): boolean {
  if (!import.meta.env.DEV) return false;
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('text/javascript') || (response.status === 404 && !contentType);
}

async function readJson<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('The service returned an invalid response.');
  }
  return body as T;
}

export async function loadCatalog(signal?: AbortSignal): Promise<CatalogResponse> {
  const response = await fetch('/api/catalog', { signal, cache: 'no-store' });
  if (isLocalViteRouteMiss(response)) {
    return { items: demoCatalog, catalog_count: demoCatalog.length, voice_available: false };
  }
  return readJson<CatalogResponse>(response);
}

export async function searchCatalog(query: string, options: SearchOptions = {}, signal?: AbortSignal): Promise<SearchResponse> {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, ...options }),
    signal,
    cache: 'no-store',
  });
  if (isLocalViteRouteMiss(response)) {
    const eligible = demoCatalog.filter((item) => (!options.country || item.country.toLowerCase() === options.country.toLowerCase())
      && (!options.record_kind || item.record_kind === options.record_kind));
    const feasible = feasibleItems(eligible, demoCatalog, query);
    const items = searchCurated(feasible.items, query, options.limit ?? 20);
    return { items, mode: 'keyword', fit: items.length ? 'record_match' : 'no_match',
      reason_codes: items.length ? ['availability_unconfirmed'] : [feasible.reason ?? 'no_relevant_record'],
      catalog_count: demoCatalog.length, coverage: 'curated_sample',
      applied_filters: { country: options.country ?? null, record_kind: options.record_kind ?? null } };
  }
  return readJson<SearchResponse>(response);
}

export async function requestVoiceToken(): Promise<VoiceToken> {
  return readJson<VoiceToken>(await fetch('/api/voice-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  }));
}

export async function loadCardDetails(id: string, signal?: AbortSignal): Promise<CardDetails | null> {
  const response = await fetch(`/api/details?id=${encodeURIComponent(id)}`, { signal, cache: 'no-store' });
  if (isLocalViteRouteMiss(response)) return null;
  return (await readJson<{ details: CardDetails | null }>(response)).details;
}

export async function loadNeeds(signal?: AbortSignal): Promise<NeedView[]> {
  const response = await fetch('/api/needs', { signal, cache: 'no-store' });
  if (isLocalViteRouteMiss(response)) {
    return sourcedNeeds.map((need) => ({ ...need, view_url: `/?need=${encodeURIComponent(need.id)}` }));
  }
  return (await readJson<{ records: NeedView[] }>(response)).records;
}
