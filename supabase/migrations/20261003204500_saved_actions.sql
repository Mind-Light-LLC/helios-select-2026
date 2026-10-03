create table public.saved_actions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  catalog_item_id text not null references public.helios_items(id),
  created_at timestamptz not null default now(),
  primary key (user_id, catalog_item_id)
);

alter table public.saved_actions enable row level security;
revoke all on public.saved_actions from public, anon, authenticated;
grant select, insert, delete on public.saved_actions to authenticated;

create policy saved_actions_owner_read on public.saved_actions
  for select to authenticated using (user_id = (select auth.uid()));

create policy saved_actions_owner_insert on public.saved_actions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.helios_items item
      where item.id = catalog_item_id and item.published)
  );

create policy saved_actions_owner_delete on public.saved_actions
  for delete to authenticated using (user_id = (select auth.uid()));
