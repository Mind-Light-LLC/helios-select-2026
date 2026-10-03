# Helios live schema attestation

Read-only preflight on 2026-10-03 against the isolated Supabase project `htpyrttusvchudpoghwk` (`helios-db`). The Supabase CLI linked this checkout to that exact project and queried the database through the Management API. This is the hackathon database, not the Mind Light platform database.

```sql
select current_setting('server_version') as server_version,
  (select count(*)::int from information_schema.tables where table_schema='public') as public_table_count,
  exists(select 1 from pg_extension where extname='vector') as vector_installed,
  exists(select 1 from pg_available_extensions where name='vector') as vector_available,
  exists(select 1 from pg_proc join pg_namespace on pg_namespace.oid=pg_proc.pronamespace
    where pg_namespace.nspname='public' and pg_proc.proname='helios_search') as helios_search_exists;
```

Result: PostgreSQL 17.11, `public_table_count=0`, `vector_installed=false`, `vector_available=true`, `helios_search_exists=false`.

The first migration must create the published catalog table with RLS and provenance, install pgvector, and create a published-only search function. No real opportunities, events, admissions, or embeddings exist yet. After applying the migration, query the actual table, policy, function, and rows to confirm readback.

## Live readback

The first migration `20261003180000_helios_catalog.sql` completed against the linked project. A subsequent live query returned one RLS policy, one `helios_search` function, pgvector `0.8.2`, and zero records. That readback preceded the curated-record migration.

The second migration `20261003180100_curated_opportunities.sql` passed a dry run and completed against the linked project. A live query returned nine published records, nine distinct country labels, nine records with HTTPS source URLs and check times, and zero document embeddings. The public catalog is real; semantic search remains unverified until embeddings are generated and read back.

## Official action contract preflight and readback

Before `20261003180200_official_actions.sql`, a fresh linked-project query confirmed the nine published rows and the existing `helios_items` columns, including nullable `action_url`, `place_label`, `pin_meaning`, and `source_checked_at`. The migration dry run named only `20261003180200_official_actions.sql`. It added action kind, label, note, and availability status with RLS unchanged, then corrected the reviewed official next steps.

After applying the migration, a linked-project readback returned nine published rows, nine classified action links, and nine rows marked `not_confirmed` for availability. The latest source check was `2026-10-03 18:27:04 UTC`. This confirms database state, not that any provider accepted a volunteer.

## Embedding readback

On 2026-10-03, the protected Helios preview used its server-side Gemini credential to embed the nine published rows. A separate linked-project SQL query returned `published=9`, `embedded=9`, and `provenance_complete=9`, with embedding timestamps from `2026-10-03 19:56:35.61 UTC` through `19:56:37.931 UTC`. A protected preview search for `food bank in Singapore` returned `mode=semantic` and `food-bank-singapore-warehouse`.

Semantic ranking is live but relevance is not calibrated. A query for `help children learn in Kenya` returned three records outside Kenya. Geographic intent and out-of-catalog abstention remain open quality work; no broad global search claim follows from these nine records.

## Product spine preflight

Before `20261003201636_helios_product_spine.sql`, a fresh linked-project read-only query on 2026-10-03 returned exactly one public base table, `helios_items`, with nine published rows: seven volunteer records and two event records. All nine availability states were `not_confirmed`; only `red-cross-lakewood-alarms-2026` had a dated `starts_at`. The `extensions` schema and pgvector were present. PostGIS 3.3.7 was available but not installed. The remote migration ledger matched the three local migrations through `20261003180200`.

This preflight supports additive organization, place, opportunity, evidence, occurrence, and private participation and giving tables. It does not attest a connected payment merchant, authenticated donor session, confirmed volunteer slot, or provider receipt. The existing catalog remains the search read model during the transition.

## Partner need card preflight

Before designing the partner need card migration on 2026-10-03, `supabase migration list --linked` showed the product-spine migration `20261003201636` in both local and remote ledgers. A fresh read-only linked query confirmed `public.organizations`, `public.helios_items`, and `helios_private.volunteer_handoffs` have RLS enabled. The two private tables inspected, `organization_memberships` and `volunteer_handoffs`, have zero client policies. The live counts were nine organizations, nine published catalog items, zero memberships, zero handoffs, and no `public.need_cards` table. Column inspection confirmed `organizations.id` and `claim_status`, plus the existing catalog's source, action, place, and availability fields. This is the isolated Helios project. No partner identity, need, or provider action has been attested by these queries.

## Product spine live readback

`20261003201636_helios_product_spine.sql` passed a linked-project transaction that ended in `ROLLBACK`. The push dry run named only that migration; the actual push completed. Subsequent linked-project queries returned nine organizations, nine places, nine linked volunteer opportunities, nine source checks, nine active official actions, one dated occurrence, and zero donation options, donors, or donations. The single occurrence is not marked as an open confirmed slot.

Every new public and private table has RLS enabled. `anon` has no INSERT privilege on the new tables and no SELECT privilege on the `helios_private` donor, donation, payment event, membership, or handoff tables. Executing `helios_card_details` as `anon` returned the American Red Cross sourced record and one unconfirmed occurrence; it returned no donation option. Supabase security and performance advisors reported no issues at warning level. These checks prove schema and read access, not a volunteer registration, authenticated personal flow, or Stripe payment.

## Source review deadline preflight

Before `20261003202911_source_review_deadlines.sql`, the linked database had no `helios_items.review_due_at` column. All nine `source_checks` rows had a null review deadline. The migration adds a seven-day review date to published catalog items and source checks, then requires a review date on future published rows. A passed review date flags stale evidence; it does not itself assert that the provider has closed the opportunity.

## Partner need card migration status

`supabase db push --linked --dry-run` on 2026-10-03 listed only `20261003210000_partner_need_cards.sql`. The dry run made no database changes. The new table and policies have not been applied or read back live. The need editor's authenticated save and submit path is therefore **UNVERIFIED** against the linked project; the public Needs sheet can show only the reviewed public signal until the migration and an authorized partner review are complete.

## Source review deadline live readback

The deadline migration was applied from an isolated migration directory after its linked-project dry run named only `20261003202911_source_review_deadlines.sql`. This avoided applying the concurrently authored `20261003210000_partner_need_cards.sql`, which remains local and unapplied. A fresh linked readback returned nine source checks and nine non-null deadlines, all due `2026-10-10 18:27:04.7688 UTC`. The remote migration ledger contains the deadline migration and does not contain the partner need-card migration. This proves deadlines were stored; an automated review queue and refreshed provider checks remain unverified.

## Account saved actions preflight and live readback

Before `20261003204500_saved_actions.sql`, a fresh linked-project query found nine published `public.helios_items`, no `public.saved_actions` table, RLS enabled on `helios_items`, and zero rows plus no client policies on `helios_private.volunteer_handoffs`. The saved-action migration was applied from an isolated temporary migration directory so it did not apply the later, still-pending partner need-card migration. The dry run named only `20261003204500_saved_actions.sql`; the push completed against `htpyrttusvchudpoghwk`.

A linked readback found `public.saved_actions` with RLS enabled, zero rows, and three owner-scoped policies: SELECT, INSERT, and DELETE. `anon` has no table privileges. `authenticated` has SELECT, INSERT, and DELETE, with no UPDATE. The INSERT policy requires `auth.uid()` ownership and a published `helios_items` row. These checks prove the database contract. Actual sign-in, save, sign-out, sign-in, and cross-device reopen remain **UNVERIFIED** until a test user completes the browser flow.
