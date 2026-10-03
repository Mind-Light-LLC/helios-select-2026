alter table public.helios_items add column review_due_at timestamptz;

update public.helios_items
set review_due_at = source_checked_at + interval '7 days'
where published;

alter table public.helios_items add constraint published_item_review_due check (
  not published or (review_due_at is not null and review_due_at >= source_checked_at)
);

update public.source_checks
set review_due_at = checked_at + interval '7 days'
where published and review_due_at is null;

alter table public.source_checks add constraint published_source_review_due check (
  not published or (review_due_at is not null and review_due_at >= checked_at)
);
