import type { HeliosItem } from './types.js';

export type GlobalRecord = Pick<HeliosItem, 'id' | 'record_kind' | 'title' | 'summary'
  | 'organization_name' | 'country' | 'place_label' | 'pin_meaning' | 'schedule_text'
  | 'latitude' | 'longitude' | 'source_url' | 'action_url' | 'action_kind'
  | 'action_label' | 'action_note' | 'starts_at'> & { cause_tags: string[]; source_checked_at?: string };

export function item(record: GlobalRecord): HeliosItem {
  return {
    ...record,
    availability_status: 'not_confirmed',
    source_checked_at: record.source_checked_at ?? '2026-10-03T17:54:00Z',
    review_due_at: record.source_checked_at
      ? new Date(Date.parse(record.source_checked_at) + 7 * 86400000).toISOString()
      : '2026-10-10T17:54:00Z',
    publication_state: 'curated_demo',
    action_authority: 'provider',
  };
}
