import { z } from 'zod';
import type { CardDetails } from '../src/types.js';

const sourceCheck = z.object({
  url: z.url(),
  checked_at: z.string(),
  review_due_at: z.string().nullable(),
  status: z.enum(['sourced_public', 'provider_confirmed', 'superseded']),
});

const cardDetails = z.object({
  organization: z.object({
    id: z.uuid(),
    name: z.string().min(1),
    country: z.string().min(1),
    website_url: z.url().nullable(),
    claim_status: z.enum(['unclaimed', 'pending', 'approved']),
    logo_storage_path: z.string().nullable(),
  }),
  place: z.object({
    label: z.string().min(1),
    meaning: z.enum(['organization_city', 'event_city', 'headquarters', 'meeting_point']),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).nullable(),
  source_checks: z.array(sourceCheck),
  occurrences: z.array(z.object({
    starts_at: z.string(),
    ends_at: z.string().nullable(),
    time_zone: z.string().min(1),
    availability_status: z.enum(['not_confirmed', 'open_confirmed', 'closed']),
    provider_confirmed_at: z.string().nullable(),
  })),
  official_action: z.object({
    kind: z.enum([
      'official_page', 'role_directory', 'interest_form', 'registration_page',
      'contact_page', 'assignment_directory',
    ]),
    label: z.string().min(1),
    url: z.url(),
    note: z.string().min(1),
    authority: z.literal('provider'),
    reviewed_at: z.string(),
  }).nullable(),
  donation_option: z.object({
    url: z.url(),
    provider: z.enum(['stripe', 'official_external']),
    currency: z.string().length(3),
    amount_mode: z.enum(['donor_chosen', 'fixed']),
    minimum_minor: z.number().int().nonnegative().nullable(),
    source_url: z.url(),
    checked_at: z.string(),
  }).nullable(),
});

export function parseCardDetails(value: unknown): CardDetails | null {
  if (value === null) return null;
  const parsed = cardDetails.safeParse(value);
  if (!parsed.success) throw new Error('Card details returned an invalid record.');
  return parsed.data;
}
