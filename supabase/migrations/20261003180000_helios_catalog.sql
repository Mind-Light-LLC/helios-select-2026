create extension if not exists vector with schema extensions;

create table public.helios_items (
  id text primary key,
  record_kind text not null check (record_kind in ('organization', 'volunteer', 'event')),
  title text not null check (length(trim(title)) > 0),
  summary text not null check (length(trim(summary)) > 0),
  organization_name text not null,
  country text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  source_url text not null check (source_url ~ '^https://'),
  action_url text check (action_url is null or action_url ~ '^https://'),
  starts_at timestamptz,
  source_checked_at timestamptz not null,
  published boolean not null default false,
  embedding extensions.vector(768),
  embedding_model text check (embedding_model is null or embedding_model = 'gemini-embedding-2'),
  embedding_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint embedding_provenance check (embedding is null or (embedding_model is not null and embedding_updated_at is not null))
);

create index helios_items_public_kind_country_idx
  on public.helios_items (record_kind, country)
  where published;

alter table public.helios_items enable row level security;
create policy helios_items_public_read on public.helios_items
  for select to anon, authenticated using (published);
revoke all on public.helios_items from anon, authenticated;
grant select on public.helios_items to anon, authenticated;

create function public.helios_search(query_embedding extensions.vector(768), match_count integer default 20)
returns table (
  id text,
  record_kind text,
  title text,
  summary text,
  organization_name text,
  country text,
  latitude double precision,
  longitude double precision,
  source_url text,
  action_url text,
  starts_at timestamptz,
  source_checked_at timestamptz
)
language sql stable security invoker
set search_path = public, extensions
as $$
  select i.id, i.record_kind, i.title, i.summary, i.organization_name,
    i.country, i.latitude, i.longitude, i.source_url, i.action_url,
    i.starts_at, i.source_checked_at
  from public.helios_items as i
  where i.published and i.embedding is not null
  order by i.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 20), 1), 50);
$$;

revoke all on function public.helios_search(extensions.vector, integer) from public;
grant execute on function public.helios_search(extensions.vector, integer) to anon, authenticated;
