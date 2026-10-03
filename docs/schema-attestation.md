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
