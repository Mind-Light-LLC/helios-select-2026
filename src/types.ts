export type RecordKind = 'organization' | 'volunteer' | 'event';
export type ActionKind = 'official_page' | 'role_directory' | 'interest_form'
  | 'registration_page' | 'contact_page' | 'assignment_directory';
export type MatchFit = 'record_match' | 'related_path' | 'no_match';
export type MatchReason = 'cause_fit' | 'location_fit' | 'remote_fit' | 'schedule_mismatch'
  | 'schedule_unverified' | 'date_mismatch' | 'location_mismatch'
  | 'location_unknown' | 'eligibility_unverified' | 'availability_unconfirmed' | 'no_relevant_record';

export type HeliosItem = {
  id: string;
  record_kind: RecordKind;
  title: string;
  summary: string;
  organization_name: string;
  country: string;
  place_label: string;
  pin_meaning: 'event_city' | 'organization_city';
  schedule_text: string | null;
  latitude: number;
  longitude: number;
  source_url: string;
  action_url: string | null;
  action_kind: ActionKind;
  action_label: string;
  action_note: string;
  availability_status: 'not_confirmed' | 'open_confirmed' | 'closed';
  starts_at: string | null;
  source_checked_at: string;
  review_due_at?: string;
  cause_tags?: string[];
  weekly_days?: string[];
  donation_url?: string;
  donation_minimum_usd?: number;
  publication_state?: 'curated_demo' | 'published';
  action_authority?: 'provider';
};

export type SearchResponse = {
  items: HeliosItem[];
  alternatives?: Array<{ item: HeliosItem; explanation: string }>;
  next_step?: string;
  mode: 'semantic' | 'keyword' | 'bedrock';
  fit?: MatchFit;
  reason_codes?: MatchReason[];
  catalog_count: number;
  coverage: 'curated_sample';
  applied_filters: { country: string | null; record_kind: RecordKind | null };
};

export type SearchOptions = {
  country?: string;
  record_kind?: RecordKind;
  limit?: number;
};

export type CatalogResponse = {
  items: HeliosItem[];
  catalog_count: number;
  voice_available: boolean;
};

export type CardDetails = {
  organization: {
    id: string;
    name: string;
    country: string;
    website_url: string | null;
    claim_status: 'unclaimed' | 'pending' | 'approved';
    logo_storage_path: string | null;
  };
  place: {
    label: string;
    meaning: 'organization_city' | 'event_city' | 'headquarters' | 'meeting_point';
    latitude: number;
    longitude: number;
  } | null;
  source_checks: Array<{
    url: string;
    checked_at: string;
    review_due_at: string | null;
    status: 'sourced_public' | 'provider_confirmed' | 'superseded';
  }>;
  occurrences: Array<{
    starts_at: string;
    ends_at: string | null;
    time_zone: string;
    availability_status: 'not_confirmed' | 'open_confirmed' | 'closed';
    provider_confirmed_at: string | null;
  }>;
  official_action: {
    kind: ActionKind;
    label: string;
    url: string;
    note: string;
    authority: 'provider';
    reviewed_at: string;
  } | null;
  donation_option: {
    url: string;
    provider: 'stripe' | 'official_external';
    currency: string;
    amount_mode: 'donor_chosen' | 'fixed';
    minimum_minor: number | null;
    source_url: string;
    checked_at: string;
  } | null;
};
