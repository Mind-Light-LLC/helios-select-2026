create extension if not exists postgis with schema extensions;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  source_catalog_key text unique,
  name text not null check (length(trim(name)) > 0),
  country text not null check (length(trim(country)) > 0),
  website_url text check (website_url is null or website_url ~ '^https://'),
  claim_status text not null default 'unclaimed'
    check (claim_status in ('unclaimed', 'pending', 'approved')),
  published boolean not null default false,
  logo_storage_path text,
  logo_source_url text check (logo_source_url is null or logo_source_url ~ '^https://'),
  logo_rights_status text not null default 'unreviewed'
    check (logo_rights_status in ('unreviewed', 'approved', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approved_logo_only check (logo_storage_path is null or logo_rights_status = 'approved')
);

create table public.organization_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  catalog_item_id text unique references public.helios_items(id),
  label text not null check (length(trim(label)) > 0),
  meaning text not null check (meaning in ('organization_city', 'event_city', 'headquarters', 'meeting_point')),
  coordinates extensions.geography(Point, 4326) not null,
  source_url text not null check (source_url ~ '^https://'),
  source_checked_at timestamptz not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index organization_locations_geo_idx on public.organization_locations using gist (coordinates);
create index organization_locations_org_idx on public.organization_locations (organization_id);

create table public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id text not null unique references public.helios_items(id),
  organization_id uuid not null references public.organizations(id),
  location_id uuid,
  modality text not null default 'location_varies'
    check (modality in ('on_site', 'remote', 'hybrid', 'location_varies')),
  eligibility_summary text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (location_id, organization_id)
    references public.organization_locations(id, organization_id)
);
create index volunteer_opportunities_org_idx on public.volunteer_opportunities (organization_id);

create table public.source_checks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.volunteer_opportunities(id),
  source_url text not null check (source_url ~ '^https://'),
  checked_at timestamptz not null,
  review_due_at timestamptz,
  method text not null default 'manual_public_page'
    check (method in ('manual_public_page', 'provider_api', 'provider_contact')),
  evidence_status text not null default 'sourced_public'
    check (evidence_status in ('sourced_public', 'provider_confirmed', 'superseded')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, opportunity_id)
);
create index source_checks_latest_idx on public.source_checks (opportunity_id, checked_at desc);

create table public.official_actions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.volunteer_opportunities(id),
  source_check_id uuid not null,
  kind text not null check (kind in (
    'official_page', 'role_directory', 'interest_form', 'registration_page',
    'contact_page', 'assignment_directory'
  )),
  label text not null check (length(trim(label)) > 0),
  url text not null check (url ~ '^https://'),
  note text not null check (length(trim(note)) > 0),
  authority text not null default 'provider' check (authority = 'provider'),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (source_check_id, opportunity_id)
    references public.source_checks(id, opportunity_id)
);
create unique index official_actions_one_active_idx
  on public.official_actions (opportunity_id) where status = 'active';

create table public.opportunity_occurrences (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.volunteer_opportunities(id),
  location_id uuid references public.organization_locations(id),
  source_check_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at > starts_at),
  time_zone text not null check (length(trim(time_zone)) > 0),
  availability_status text not null default 'not_confirmed'
    check (availability_status in ('not_confirmed', 'open_confirmed', 'closed')),
  provider_confirmed_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint confirmed_open_has_evidence check (
    availability_status <> 'open_confirmed' or provider_confirmed_at is not null
  ),
  foreign key (source_check_id, opportunity_id)
    references public.source_checks(id, opportunity_id),
  unique (id, opportunity_id)
);
create index opportunity_occurrences_start_idx
  on public.opportunity_occurrences (starts_at) where published;

create table public.donation_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  checkout_url text not null check (checkout_url ~ '^https://'),
  provider text not null check (provider in ('stripe', 'official_external')),
  merchant_reference text,
  official_source_url text not null check (official_source_url ~ '^https://'),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount_mode text not null check (amount_mode in ('donor_chosen', 'fixed')),
  minimum_minor bigint check (minimum_minor is null or minimum_minor >= 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  merchant_confirmed_at timestamptz,
  link_checked_at timestamptz,
  approved_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint published_giving_is_reviewed check (
    not published or (status = 'active' and merchant_confirmed_at is not null
      and link_checked_at is not null and approved_at is not null)
  ),
  unique (id, organization_id)
);
create index donation_options_org_idx on public.donation_options (organization_id);

create table public.profiles (
  user_id uuid primary key references auth.users(id),
  display_name text check (display_name is null or length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create schema helios_private;
revoke all on schema helios_private from public, anon, authenticated;
grant usage on schema helios_private to service_role;

create table helios_private.organization_memberships (
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner', 'editor', 'finance_viewer')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint approved_membership_has_time check (status <> 'approved' or approved_at is not null)
);

create table helios_private.volunteer_handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  opportunity_id uuid not null references public.volunteer_opportunities(id),
  occurrence_id uuid,
  state text not null default 'saved'
    check (state in ('saved', 'official_link_opened', 'provider_acknowledged', 'cancelled')),
  provider_receipt_reference text,
  provider_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint acknowledged_handoff_has_receipt check (
    state <> 'provider_acknowledged' or
    (provider_receipt_reference is not null and provider_acknowledged_at is not null)
  ),
  foreign key (occurrence_id, opportunity_id)
    references public.opportunity_occurrences(id, opportunity_id)
);
create index volunteer_handoffs_user_idx
  on helios_private.volunteer_handoffs (user_id, created_at desc);

create table helios_private.donors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid references auth.users(id),
  provider_customer_reference text,
  contact_email text,
  contact_consent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index donors_org_idx on helios_private.donors (organization_id);
create index donors_user_idx on helios_private.donors (user_id) where user_id is not null;

create table helios_private.donations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  donation_option_id uuid,
  donor_id uuid,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  provider text not null check (provider = 'stripe'),
  provider_account_reference text not null,
  provider_payment_reference text unique,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'refunded', 'disputed', 'failed')),
  provider_confirmed_at timestamptz,
  provider_receipt_url text check (provider_receipt_url is null or provider_receipt_url ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint confirmed_donation_has_provider_proof check (
    status <> 'confirmed' or
    (provider_payment_reference is not null and provider_confirmed_at is not null)
  ),
  foreign key (donation_option_id, organization_id)
    references public.donation_options(id, organization_id),
  foreign key (donor_id, organization_id)
    references helios_private.donors(id, organization_id)
);
create index donations_org_idx on helios_private.donations (organization_id, created_at desc);
create index donations_donor_idx on helios_private.donations (donor_id, created_at desc);

create table helios_private.payment_events (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid references helios_private.donations(id),
  provider_event_id text not null unique,
  event_type text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  signature_verified_at timestamptz not null,
  occurred_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_locations enable row level security;
alter table public.volunteer_opportunities enable row level security;
alter table public.source_checks enable row level security;
alter table public.official_actions enable row level security;
alter table public.opportunity_occurrences enable row level security;
alter table public.donation_options enable row level security;
alter table public.profiles enable row level security;
alter table helios_private.organization_memberships enable row level security;
alter table helios_private.volunteer_handoffs enable row level security;
alter table helios_private.donors enable row level security;
alter table helios_private.donations enable row level security;
alter table helios_private.payment_events enable row level security;

revoke all on public.organizations, public.organization_locations,
  public.volunteer_opportunities, public.source_checks, public.official_actions,
  public.opportunity_occurrences, public.donation_options, public.profiles
  from public, anon, authenticated;
grant select on public.organizations, public.organization_locations,
  public.volunteer_opportunities, public.source_checks, public.official_actions,
  public.opportunity_occurrences, public.donation_options to anon, authenticated;
grant select on public.profiles to authenticated;
revoke all on all tables in schema helios_private from public, anon, authenticated;
grant select, insert, update on all tables in schema helios_private to service_role;

create policy organizations_public_read on public.organizations
  for select to anon, authenticated using (published);
create policy locations_public_read on public.organization_locations
  for select to anon, authenticated using (published);
create policy opportunities_public_read on public.volunteer_opportunities
  for select to anon, authenticated using (published);
create policy source_checks_public_read on public.source_checks
  for select to anon, authenticated using (
    published and exists (select 1 from public.volunteer_opportunities o
      where o.id = opportunity_id and o.published)
  );
create policy official_actions_public_read on public.official_actions
  for select to anon, authenticated using (
    status = 'active' and exists (select 1 from public.volunteer_opportunities o
      where o.id = opportunity_id and o.published)
  );
create policy occurrences_public_read on public.opportunity_occurrences
  for select to anon, authenticated using (
    published and exists (select 1 from public.volunteer_opportunities o
      where o.id = opportunity_id and o.published)
  );
create policy donation_options_public_read on public.donation_options
  for select to anon, authenticated using (
    published and status = 'active' and merchant_confirmed_at is not null
    and link_checked_at is not null and approved_at is not null
  );
create policy profiles_owner_read on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);

insert into public.organizations (source_catalog_key, name, country, published)
select min(i.id), i.organization_name, i.country, true
from public.helios_items i where i.published
group by i.organization_name, i.country;

insert into public.organization_locations (
  organization_id, catalog_item_id, label, meaning, coordinates,
  source_url, source_checked_at, published
)
select o.id, i.id, i.place_label, i.pin_meaning,
  extensions.st_setsrid(extensions.st_makepoint(i.longitude, i.latitude), 4326)::extensions.geography,
  i.source_url, i.source_checked_at, true
from public.helios_items i
join public.organizations o on o.name = i.organization_name and o.country = i.country
where i.published;

insert into public.volunteer_opportunities (
  catalog_item_id, organization_id, location_id, modality, published
)
select i.id, o.id, l.id,
  case when i.id = 'unv-online-volunteering' then 'remote' else 'location_varies' end,
  true
from public.helios_items i
join public.organizations o on o.name = i.organization_name and o.country = i.country
join public.organization_locations l on l.catalog_item_id = i.id
where i.published and i.record_kind in ('volunteer', 'event');

insert into public.source_checks (opportunity_id, source_url, checked_at, evidence_status, published)
select o.id, i.source_url, i.source_checked_at, 'sourced_public', true
from public.volunteer_opportunities o
join public.helios_items i on i.id = o.catalog_item_id;

insert into public.official_actions (
  opportunity_id, source_check_id, kind, label, url, note, status, reviewed_at
)
select o.id, s.id, i.action_kind, i.action_label, i.action_url, i.action_note,
  'active', i.source_checked_at
from public.volunteer_opportunities o
join public.helios_items i on i.id = o.catalog_item_id
join public.source_checks s on s.opportunity_id = o.id
where i.action_url is not null;

insert into public.opportunity_occurrences (
  opportunity_id, location_id, source_check_id, starts_at, time_zone,
  availability_status, published
)
select o.id, o.location_id, s.id, i.starts_at,
  case when i.id = 'red-cross-lakewood-alarms-2026' then 'America/Los_Angeles' else 'UTC' end,
  i.availability_status, true
from public.volunteer_opportunities o
join public.helios_items i on i.id = o.catalog_item_id
join public.source_checks s on s.opportunity_id = o.id
where i.starts_at is not null;

create function public.helios_card_details(p_catalog_item_id text)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'organization', jsonb_build_object(
      'id', org.id, 'name', org.name, 'country', org.country,
      'website_url', org.website_url, 'claim_status', org.claim_status,
      'logo_storage_path', case when org.logo_rights_status = 'approved' then org.logo_storage_path else null end
    ),
    'place', jsonb_build_object(
      'label', loc.label, 'meaning', loc.meaning,
      'latitude', extensions.st_y(loc.coordinates::extensions.geometry),
      'longitude', extensions.st_x(loc.coordinates::extensions.geometry)
    ),
    'source_checks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'url', checked.source_url, 'checked_at', checked.checked_at,
        'review_due_at', checked.review_due_at, 'status', checked.evidence_status
      ) order by checked.checked_at desc)
      from (select s.* from public.source_checks s
        where s.opportunity_id = opp.id order by s.checked_at desc limit 3) checked
    ), '[]'::jsonb),
    'occurrences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'starts_at', occurrence.starts_at, 'ends_at', occurrence.ends_at,
        'time_zone', occurrence.time_zone, 'availability_status', occurrence.availability_status,
        'provider_confirmed_at', occurrence.provider_confirmed_at
      ) order by occurrence.starts_at)
      from public.opportunity_occurrences occurrence
      where occurrence.opportunity_id = opp.id and occurrence.published
    ), '[]'::jsonb),
    'official_action', (
      select jsonb_build_object(
        'kind', action.kind, 'label', action.label, 'url', action.url,
        'note', action.note, 'authority', action.authority, 'reviewed_at', action.reviewed_at
      ) from public.official_actions action
      where action.opportunity_id = opp.id and action.status = 'active' limit 1
    ),
    'donation_option', (
      select jsonb_build_object(
        'url', donation.checkout_url, 'provider', donation.provider,
        'currency', donation.currency, 'amount_mode', donation.amount_mode,
        'minimum_minor', donation.minimum_minor,
        'source_url', donation.official_source_url, 'checked_at', donation.link_checked_at
      ) from public.donation_options donation
      where donation.organization_id = org.id and donation.published and donation.status = 'active'
      order by donation.approved_at desc limit 1
    )
  )
  from public.volunteer_opportunities opp
  join public.organizations org on org.id = opp.organization_id
  left join public.organization_locations loc on loc.id = opp.location_id
  where opp.catalog_item_id = p_catalog_item_id and opp.published and org.published;
$$;
revoke all on function public.helios_card_details(text) from public, anon, authenticated;
grant execute on function public.helios_card_details(text) to anon, authenticated;
