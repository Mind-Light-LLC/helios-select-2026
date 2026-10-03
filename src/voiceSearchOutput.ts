import { isCurrentReview } from './sfSearch';
import type { HeliosItem, SearchResponse } from './types';

function describe(item: HeliosItem): Record<string, unknown> {
  return {
    id: item.id, title: item.title, kind: item.record_kind,
    organization: item.organization_name, country: item.country,
    place: item.place_label, pin_meaning: item.pin_meaning, schedule: item.schedule_text,
    summary: item.summary, source_url: item.source_url,
    action_url: item.action_url, action_kind: item.action_kind,
    action_label: item.action_label, action_note: item.action_note,
    availability_status: item.availability_status, source_checked_at: item.source_checked_at,
    cause_tags: item.cause_tags, weekly_days: item.weekly_days,
    donation_url: item.donation_url,
    donation_minimum_usd: isCurrentReview(item) ? item.donation_minimum_usd : null,
    review_due_at: item.review_due_at,
    publication_state: item.publication_state, action_authority: item.action_authority,
  };
}

export function voiceSearchOutput(response: SearchResponse): Record<string, unknown> {
  return {
    mode: response.mode, fit: response.fit,
    reason_codes: response.reason_codes ?? [],
    count: response.items.length, catalog_count: response.catalog_count,
    coverage: response.coverage, applied_filters: response.applied_filters,
    no_match_meaning: response.items.length === 0
      ? 'No exact match in this limited catalog, not proof that no opportunity exists.' : null,
    next_step: response.next_step ?? null,
    records: response.items.slice(0, 15).map(describe),
    alternatives: response.alternatives?.map(({ item, explanation }) => ({ ...describe(item), explanation })) ?? [],
  };
}
