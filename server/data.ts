import type { HeliosItem, SearchResponse } from '../src/types';

const columns = 'id,record_kind,title,summary,organization_name,country,place_label,pin_meaning,schedule_text,latitude,longitude,source_url,action_url,starts_at,source_checked_at';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

function isItem(value: unknown): value is HeliosItem {
  if (!isObject(value)) return false;
  return typeof value.id === 'string'
    && ['organization', 'volunteer', 'event'].includes(String(value.record_kind))
    && typeof value.title === 'string' && typeof value.summary === 'string'
    && typeof value.organization_name === 'string' && typeof value.country === 'string'
    && typeof value.place_label === 'string' && ['event_city', 'organization_city'].includes(String(value.pin_meaning))
    && (value.schedule_text === null || typeof value.schedule_text === 'string')
    && typeof value.latitude === 'number' && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
    && typeof value.longitude === 'number' && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180
    && isHttpUrl(value.source_url)
    && (value.action_url === null || isHttpUrl(value.action_url))
    && (value.starts_at === null || typeof value.starts_at === 'string')
    && typeof value.source_checked_at === 'string';
}

function readItems(value: unknown): HeliosItem[] {
  if (!Array.isArray(value) || !value.every(isItem)) throw new Error('Catalog returned an invalid record.');
  return value;
}

function supabaseConfig() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error('The Helios catalog is not configured.');
  const url = new URL(base);
  if (url.protocol !== 'https:') throw new Error('The Helios catalog URL is invalid.');
  return { url: url.origin, key };
}

async function catalogFetch(path: string, init?: RequestInit): Promise<unknown> {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Accept: 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status}).`);
  return response.json();
}

export async function listCatalog(): Promise<HeliosItem[]> {
  const params = new URLSearchParams({ select: columns, published: 'eq.true', order: 'title.asc', limit: '500' });
  return readItems(await catalogFetch(`helios_items?${params}`));
}

async function queryEmbedding(query: string): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent', {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text: `task: search result | query: ${query}` }] },
      output_dimensionality: 768,
    }),
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json().catch(() => null);
  if (!isObject(payload) || !Array.isArray(payload.embeddings) || !isObject(payload.embeddings[0])
    || !Array.isArray(payload.embeddings[0].values)) return null;
  const values = payload.embeddings[0].values;
  return values.length === 768 && values.every((value: unknown) => typeof value === 'number' && Number.isFinite(value))
    ? values as number[] : null;
}

function keywordSearch(items: HeliosItem[], query: string): HeliosItem[] {
  const words = query.toLocaleLowerCase().split(/\W+/).filter((word) => word.length > 2);
  if (words.length === 0) return [];
  return constrainPlace(items, query).map((item) => {
    const text = `${item.title} ${item.summary} ${item.organization_name} ${item.country} ${item.record_kind}`.toLocaleLowerCase();
    return { item, score: words.reduce((score, word) => score + (text.includes(word) ? 1 : 0), 0) };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 20).map(({ item }) => item);
}

function constrainPlace(items: HeliosItem[], query: string): HeliosItem[] {
  const normalized = ` ${query.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
  const matching = items.filter((item) => {
    const city = item.place_label.split(',')[0].toLocaleLowerCase();
    const country = item.country.toLocaleLowerCase();
    return (city.length > 3 && normalized.includes(` ${city} `))
      || (country !== 'global' && normalized.includes(` ${country} `));
  });
  return matching.length > 0 ? matching : items;
}

export async function searchItems(query: string): Promise<SearchResponse> {
  const catalog = await listCatalog();
  const embedding = await queryEmbedding(query).catch(() => null);
  if (embedding) {
    try {
      const rows = readItems(await catalogFetch('rpc/helios_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_embedding: `[${embedding.join(',')}]`, match_count: 20 }),
      }));
      if (rows.length > 0) return { items: constrainPlace(rows, query), mode: 'semantic', catalog_count: catalog.length };
    } catch { return { items: keywordSearch(catalog, query), mode: 'keyword', catalog_count: catalog.length }; }
  }
  return { items: keywordSearch(catalog, query), mode: 'keyword', catalog_count: catalog.length };
}
