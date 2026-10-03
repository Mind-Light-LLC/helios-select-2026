import type { CardDetails, HeliosItem, SearchOptions, SearchResponse } from '../src/types.js';
import { classifyCandidates } from './bedrock-match.js';
import { parseCardDetails } from './card-details.js';
import { readGeminiEmbedding } from './gemini-embedding.js';
import { feasibleItems } from '../src/feasibleMatch.js';
import { sfCatalog } from '../src/sfCatalog.js';
import { globalCatalog } from '../src/globalCatalog.js';
import { demoCatalog } from '../src/demoCatalog.js';
import { hasStructuredIntent, searchCurated } from '../src/sfSearch.js';

const columns = 'id,record_kind,title,summary,organization_name,country,place_label,pin_meaning,schedule_text,latitude,longitude,source_url,action_url,action_kind,action_label,action_note,availability_status,starts_at,source_checked_at,review_due_at';

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
    && ['official_page', 'role_directory', 'interest_form', 'registration_page', 'contact_page', 'assignment_directory'].includes(String(value.action_kind))
    && typeof value.action_label === 'string' && value.action_label.trim().length > 0
    && typeof value.action_note === 'string' && value.action_note.trim().length > 0
    && ['not_confirmed', 'open_confirmed', 'closed'].includes(String(value.availability_status))
    && (value.starts_at === null || typeof value.starts_at === 'string')
    && typeof value.source_checked_at === 'string'
    && (value.review_due_at === undefined || value.review_due_at === null || typeof value.review_due_at === 'string');
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

export async function catalogFetch(path: string, init?: RequestInit): Promise<unknown> {
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
  if (!process.env.SUPABASE_URL && !process.env.SUPABASE_PUBLISHABLE_KEY) return demoCatalog;
  const params = new URLSearchParams({ select: columns, published: 'eq.true', order: 'title.asc', limit: '500' });
  const remote = readItems(await catalogFetch(`helios_items?${params}`));
  const byId = new Map([...sfCatalog, ...globalCatalog, ...remote].map((item) => [item.id, item]));
  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export async function getCardDetails(id: string): Promise<CardDetails | null> {
  if (!process.env.SUPABASE_URL && !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  const value = await catalogFetch('rpc/helios_card_details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_catalog_item_id: id }),
  });
  return parseCardDetails(value);
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
  return readGeminiEmbedding(await response.json().catch(() => null));
}

function keywordSearch(items: HeliosItem[], query: string, limit: number): HeliosItem[] {
  const curated = searchCurated(items, query, limit);
  if (curated.length > 0 || hasStructuredIntent(query)) return curated;
  const ignored = new Set([
    'about', 'and', 'around', 'can', 'confirm', 'could', 'find', 'for', 'from', 'help',
    'have', 'looking', 'month', 'near', 'now', 'please', 'register', 'right', 'shift',
    'sign', 'some', 'spot', 'that', 'the', 'this', 'today', 'tomorrow', 'volunteer',
    'volunteering', 'want', 'week', 'what', 'where', 'with', 'would', 'year',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december', 'monday', 'tuesday',
    'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  ]);
  const words = query.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter((word) => (word.length > 2 || word === 'un') && !ignored.has(word) && !/^\d+$/.test(word));
  if (words.length === 0) return [];
  return items.map((item) => {
    const title = item.title.toLocaleLowerCase();
    const organization = item.organization_name.toLocaleLowerCase();
    const acronym = organization.match(/\b\p{L}/gu)?.join('') ?? '';
    const place = `${item.country} ${item.place_label}`.toLocaleLowerCase();
    const detail = `${item.summary} ${item.action_note}`.toLocaleLowerCase();
    return { item, score: words.reduce((score, word) => word === 'un'
      ? score + (acronym.startsWith('un') ? 5 : 0)
      : score
      + (title.includes(word) ? 3 : 0)
      + (organization.includes(word) ? 2 : 0)
      + (place.includes(word) ? 2 : 0)
      + (detail.includes(word) ? 1 : 0), 0) };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(({ item }) => item);
}

function applyFilters(items: HeliosItem[], options: SearchOptions): HeliosItem[] {
  return items.filter((item) =>
    (!options.country || item.country.toLocaleLowerCase() === options.country.toLocaleLowerCase())
    && (!options.record_kind || item.record_kind === options.record_kind));
}

function searchIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((row) => isObject(row) && typeof row.id === 'string')) {
    throw new Error('Semantic search returned an invalid result.');
  }
  return value.map((row: Record<string, unknown>) => row.id as string);
}

export async function searchItems(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const catalog = await listCatalog();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 20);
  const feasible = feasibleItems(applyFilters(catalog, options), catalog, query);
  const eligible = feasible.items;
  const responseBase = {
    catalog_count: catalog.length,
    coverage: 'curated_sample' as const,
    applied_filters: { country: options.country ?? null, record_kind: options.record_kind ?? null },
  };
  if (eligible.length === 0) return { ...responseBase, items: [], mode: 'keyword', fit: 'no_match',
    reason_codes: [feasible.reason ?? 'no_relevant_record'] };
  if (hasStructuredIntent(query)) {
    const items = searchCurated(eligible, query, limit);
    return { ...responseBase, items, mode: 'keyword', fit: items.length ? 'record_match' : 'no_match',
      reason_codes: items.length ? ['availability_unconfirmed'] : ['no_relevant_record'] };
  }
  if (process.env.HELIOS_BEDROCK_MODEL_ID) {
    try {
      const match = await classifyCandidates(query, eligible);
      if (match) return {
        ...responseBase,
        items: match.item ? [match.item] : [],
        mode: 'bedrock',
        fit: match.fit,
        reason_codes: match.reason_codes,
      };
    } catch (cause) {
      console.warn('Bedrock classification unavailable:', cause instanceof Error ? cause.name : 'unknown error');
    }
  }
  const embedding = await queryEmbedding(query).catch(() => null);
  if (embedding) {
    try {
      const ids = searchIds(await catalogFetch('rpc/helios_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_embedding: `[${embedding.join(',')}]`, match_count: 50 }),
      }));
      const byId = new Map(eligible.map((item) => [item.id, item]));
      const matches = ids.map((id) => byId.get(id)).filter((item): item is HeliosItem => Boolean(item));
      if (matches.length > 0) return { ...responseBase, items: matches.slice(0, limit), mode: 'semantic' };
    } catch {
      return { ...responseBase, items: keywordSearch(eligible, query, limit), mode: 'keyword' };
    }
  }
  return { ...responseBase, items: keywordSearch(eligible, query, limit), mode: 'keyword' };
}
