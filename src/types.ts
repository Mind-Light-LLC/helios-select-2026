export type HeliosItem = {
  id: string;
  record_kind: 'organization' | 'volunteer' | 'event';
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
  starts_at: string | null;
  source_checked_at: string;
};

export type SearchResponse = {
  items: HeliosItem[];
  mode: 'semantic' | 'keyword';
  catalog_count: number;
};

export type CatalogResponse = {
  items: HeliosItem[];
  catalog_count: number;
};
