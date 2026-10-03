# Helios minimum product standard

3 October 2026. This is the operating bar for the isolated Helios product, not a claim that every flow is live.

## One useful outcome

A person describes a cause, place, and time; Helios returns a relevant source-checked organization or volunteer path, flies to the correct kind of map pin, and exposes the provider's official next step. An agent receives the same record and uncertainty through MCP. No account is required to browse.

## Required states

| State | Rule | Current evidence |
| --- | --- | --- |
| Sourced listing | Published record has an official source, check time, place meaning, and an action authority. | Nine published database records and 38 bundled curated paths, including eighteen in San Francisco. The merged demo catalog has 47 records; bundled paths are not evidence of database publication. |
| Search match | Place and date are constraints. If coverage is absent, return no match instead of an unrelated organization. | Local API rejects an out-of-catalog Kenya request and an October 18 query for the October 17 Lakewood event; it returns the Singapore food bank for a Singapore request. Broader quality and time-zone edge cases are unverified. |
| Official handoff | Show the provider's action URL and explain that opening it is not registration. | Public card and read-only MCP response. No provider receipt. |
| Personal trail | A signed-in person's saved or started path is private; provider acknowledgement requires a receipt. | A device-local action trail is visible and labeled as such. The private table exists, but account-synced save and provider readback are unverified. |
| Giving | Only a reviewed organization-owned payment option is public. A donation is confirmed by a signed Stripe event and canonical provider readback. | Private ledger structure exists but has zero options and zero transactions. The Stripe resource is sandbox only. |

## Technical baseline

- Supabase Postgres holds organization identity, locations, opportunities, occurrences, evidence, official actions, and private participation and giving records. PostGIS supports geographic queries; the existing Gemini vectors support semantic retrieval. Public tables have RLS and no anonymous write grants.
- Supabase Auth is the identity provider. Browse remains public. A person can belong to multiple organizations, volunteer, and donate without switching account type.
- Vercel serves the globe and API. OpenAI Realtime is disabled unless `HELIOS_VOICE_ENABLED=true`. Bedrock and Gemini search calls are separately disabled unless `HELIOS_PAID_AI_ENABLED=true`. The default still supports keyword search, official actions, and read-only MCP. Voice shows an unavailable state when disabled. Enable paid calls only after a shared rate limit, a spend ceiling, and a complete microphone-to-answer browser test.
- MCP returns source, map meaning, availability uncertainty, official next action, and the shareable globe URL. Private or external write tools require user authentication, exact consent, provider acknowledgement, and a durable receipt.
- Source checks need a review queue before expiration. Realtime updates, Storage-hosted logos, Queues, and Cron become useful when partner records and update volume justify them. Unreviewed changes never auto-publish.
- The globe, text results, and official action must work at desktop and phone widths. A person still needs a usable list and next-step link when map imagery fails. The 1280-pixel desktop and 390-pixel phone detail screens rendered locally; imagery-failure fallback and keyboard-only completion remain unverified.
- Public search and voice routes need shared rate limits, a spend ceiling, error monitoring, and a tested unavailable state before an unrestricted public launch.

## Compute decision

Supabase Compute is not required. The current product runs on ordinary Supabase Postgres, Auth, and Vercel Functions. Compute is a private alpha for internal evaluation, not a production customer runtime. Evaluate a bounded enrichment or agent workload there only if it outgrows the current functions and the project has alpha access. It must not block the search, globe, account, or official handoff path.

## Next proof gates

1. Confirm a real person can speak a request, see the selected globe location, open the official action, and recover from microphone denial or API failure.
2. Test a signed-in person's private saved path and an authorized organization's claim flow. Keep unclaimed listings clearly labeled.
3. Obtain one consenting organization's verified Stripe test payment route. Prove webhook signature, idempotency, payment readback, refund handling, and private donor receipt before showing completed giving.
4. Run a small search evaluation across absent places, conflicting dates, remote eligibility, stale sources, and no-match cases. Measure unsupported claims, not just successful tool calls.
5. Move the 38 bundled curated records into the reviewed database publication path before treating Supabase as the single catalog source. Add review ownership and a queue for the seven-day source deadlines.
