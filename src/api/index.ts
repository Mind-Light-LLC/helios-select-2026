import type { CatalogResponse, SearchResponse } from '../types';

export type VoiceToken = { value: string; expires_at: number };

async function readJson<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

export async function loadCatalog(signal?: AbortSignal): Promise<CatalogResponse> {
  return readJson<CatalogResponse>(await fetch('/api/catalog', { signal, cache: 'no-store' }));
}

export async function searchCatalog(query: string, signal?: AbortSignal): Promise<SearchResponse> {
  return readJson<SearchResponse>(await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal,
    cache: 'no-store',
  }));
}

export async function requestVoiceToken(): Promise<VoiceToken> {
  return readJson<VoiceToken>(await fetch('/api/voice-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
  }));
}
