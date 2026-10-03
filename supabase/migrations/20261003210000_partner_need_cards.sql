create table public.need_cards (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  organization_id uuid references public.organizations(id),
  organization_name text not null check (length(trim(organization_name)) between 2 and 160),
  official_website_url text not null check (official_website_url ~ '^https://'),
  title text not null check (length(trim(title)) between 5 and 140),
  summary text not null check (length(trim(summary)) between 15 and 1200),
  place_label text not null check (length(trim(place_label)) between 2 and 160),
  quantity_needed integer not null check (quantity_needed > 0),
  quantity_unit text not null check (length(trim(quantity_unit)) between 2 and 60),
  needed_by date not null,
  eligibility_summary text,
  official_action_url text not null check (official_action_url ~ '^https://'),
  source_url text not null check (source_url ~ '^https://'),
  publication_state text not null default 'draft'
    check (publication_state in ('draft', 'submitted', 'published', 'retired')),
  partner_confirmed_at timestamptz,
  source_checked_at timestamptz,
  review_due_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_need_has_partner_proof check (
    publication_state <> 'published' or
    (organization_id is not null and partner_confirmed_at is not null
      and source_checked_at is not null and review_due_at is not null
      and reviewed_at is not null and published_at is not null)
  )
);

create index need_cards_owner_idx on public.need_cards (owner_user_id, created_at desc);
create index need_cards_published_idx on public.need_cards (needed_by, review_due_at)
  where publication_state = 'published';

alter table public.need_cards enable row level security;
revoke all on public.need_cards from public, anon, authenticated;
grant select on public.need_cards to anon, authenticated;
grant insert, update on public.need_cards to authenticated;
grant all on public.need_cards to service_role;

create policy need_cards_public_or_owner_read on public.need_cards
  for select to anon, authenticated using (
    owner_user_id = (select auth.uid()) or
    (publication_state = 'published' and partner_confirmed_at is not null
      and review_due_at >= now() and needed_by >= current_date
      and exists (
        select 1 from public.organizations organization
        where organization.id = organization_id
          and organization.published and organization.claim_status = 'approved'
      ))
  );

create policy need_cards_owner_draft_insert on public.need_cards
  for insert to authenticated with check (
    owner_user_id = (select auth.uid()) and publication_state = 'draft'
    and organization_id is null and partner_confirmed_at is null
    and source_checked_at is null and review_due_at is null
    and reviewed_at is null and published_at is null
  );

create policy need_cards_owner_draft_update on public.need_cards
  for update to authenticated using (
    owner_user_id = (select auth.uid()) and publication_state = 'draft'
  ) with check (
    owner_user_id = (select auth.uid()) and publication_state in ('draft', 'submitted')
    and organization_id is null and partner_confirmed_at is null
    and source_checked_at is null and review_due_at is null
    and reviewed_at is null and published_at is null
  );
