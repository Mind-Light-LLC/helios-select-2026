import type { PartnerNeed } from '../src/needData.js';
import { catalogFetch } from './data.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function isPartnerNeed(value: unknown): value is Omit<PartnerNeed, 'evidence_status'> {
  if (!isObject(value)) return false;
  return typeof value.id === 'string' && typeof value.title === 'string'
    && typeof value.organization_name === 'string' && typeof value.place_label === 'string'
    && typeof value.summary === 'string' && Number.isInteger(value.quantity_needed)
    && Number(value.quantity_needed) > 0 && typeof value.quantity_unit === 'string'
    && typeof value.needed_by === 'string'
    && (value.eligibility_summary === null || typeof value.eligibility_summary === 'string')
    && isHttpsUrl(value.official_action_url) && isHttpsUrl(value.source_url)
    && typeof value.source_checked_at === 'string' && typeof value.review_due_at === 'string'
    && value.publication_state === 'published';
}

export async function listPartnerNeeds(): Promise<PartnerNeed[]> {
  if (!process.env.SUPABASE_URL && !process.env.SUPABASE_PUBLISHABLE_KEY) return [];
  const columns = 'id,title,organization_name,place_label,summary,quantity_needed,quantity_unit,needed_by,eligibility_summary,official_action_url,source_url,source_checked_at,review_due_at,publication_state';
  const params = new URLSearchParams({ select: columns, publication_state: 'eq.published', order: 'needed_by.asc', limit: '100' });
  const value = await catalogFetch(`need_cards?${params}`).catch((cause: unknown) => {
    if (cause instanceof Error && cause.message === 'Catalog request failed (404).') return [];
    throw cause;
  });
  if (!Array.isArray(value) || !value.every(isPartnerNeed)) throw new Error('Partner needs returned invalid records.');
  return value.map((need) => ({ ...need, evidence_status: 'partner_confirmed' }));
}
