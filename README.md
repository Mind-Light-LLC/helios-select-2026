# HeliOS

**A better answer than "here are 47 links."**

Someone has ten dollars, an open Sunday, or a skill they can share. An organization has work that needs doing. HeliOS helps the two find a plausible fit, shows the evidence behind it, and makes the next step clear. The organization still decides whether a person is accepted, a gift is received, or a resource is delivered.

This is an original project built for the Supabase Select 2026 Hackathon. It is a working global discovery and agent handoff demo, with a San Francisco starting point. It is not a claim that volunteer slots, donations, or outcomes have been confirmed.

## Try it in two minutes

1. Open the globe and ask HeliOS, by voice or text: **"I have Sunday free in San Francisco. Where can I help?"**
2. Look at the source, checked date, place, schedule, and official action on a result. A published Sunday program is not a confirmed open slot.
3. Ask **"I have ten dollars"** or **"What does this organization do?"** HeliOS narrows the catalog and explains what is known. A donation happens on the organization's own site.
4. Open **Explore needs** to inspect a sourced public signal, or **Connect an agent** to see the same published records through MCP. Save a path in **My actions** if you want to return to it.

The catalog currently combines 23 sourced global paths with 18 manually reviewed San Francisco paths across 15 organizations. Nine global records are published in the isolated HeliOS Supabase project; newer global paths remain labeled `curated_demo` pending publication review. Six San Francisco organizations have reviewed official donation paths. Empty search results mean this limited catalog has no match, not that the world has no opportunity.

## The point of the product

Discovery is useful only if it leads toward real work. HeliOS keeps a chain from **question → sourced record → official action → provider evidence → outcome**. This demo implements the first three links. The organization, not HeliOS, must confirm registration, payment, acceptance, delivery, or attendance. A click is curiosity; a provider receipt is proof.

For people, the starting point can be vague: a place, cause, free day, or budget. For organizations, a need card can be drafted privately and reviewed before publication. For other agents, a read-only MCP interface returns the same records with source, publication state, availability, and action authority. No agent gets to turn a promising lead into a completed outcome by saying so.

Read the [product brief](docs/product-brief.md) for the demo scope, [voice-to-verified-action spec](docs/VOICE_ACTION_NETWORK_SPEC.md) for the partner task and receipt path, and [MCP client guide](docs/MCP_CLIENT.md) for an agent handoff. The [source review](docs/SF_CATALOG_SOURCE_REVIEW.md) and [schema attestation](docs/schema-attestation.md) show what was checked. The [research roadmap](docs/HELIOS_RESEARCH_ROADMAP_2026-10-03.md) and [agent futures paper analysis](docs/HELIOS_AGENT_FUTURES_ARXIV_2026-10-03.md) describe the longer direction, not capabilities already shipped.

## Run locally

Use Node.js 22 or newer. Run `npm ci`, then `npm run dev`. Vite serves the 41-record demo catalog and text search. OpenAI Realtime is the sole voice path: hold Option to speak or tap the mic for a conversation. The search bar glows cyan while listening and amber while HeliOS speaks. When paid voice is unavailable, type in the search bar. `npm run build` typechecks and compiles the client. The globe uses NASA GIBS Blue Marble imagery from August 2004 with on-map attribution.

The canonical repository branch is `main`, connected to the single Vercel project `mind-light/helios`. Make changes in an isolated branch and open a pull request to `main`. Each branch produces its own preview deployment; merging to `main` updates the production deployment. Do not deploy an uncommitted local checkout and treat its URL as a release. `npm run dev` serves only the Vite frontend and falls back to local demo data. `vercel dev` serves the Vercel API routes. Neither local mode proves the Git preview or production environment.

Voice availability depends on the server-side `OPENAI_API_KEY` and `HELIOS_VOICE_ENABLED=true` in that deployment. `HELIOS_PAID_AI_ENABLED` controls Gemini and Bedrock search separately. Keep voice disabled until the project's shared request limit, OpenAI hard spend limit, and a browser microphone-to-answer check are in place. A Vercel share link grants access to one protected deployment; it does not change the project-wide protection setting.

Use `vercel dev` for the full API, Supabase Auth, MCP, and OpenAI Realtime path. The API runtime needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for its isolated HeliOS project. `GEMINI_API_KEY` and `OPENAI_API_KEY` belong only in server-side settings. Never commit credentials. Account creation uses Supabase email/password Auth; a hosted project may require email confirmation and a configured redirect URL. Guests can still explore.

After the Gemini server key is configured, `vercel env run -e preview -- npm run embed:catalog` reports pending embeddings. Add `-- --write` after the script name to embed and read back published records. The command rejects Supabase URLs outside the isolated HeliOS project.

## Agent interface and authority

Connect an MCP client to `https://<deployment>/api/mcp`. The read-only tools are `describe_catalog`, `search_opportunities`, `get_opportunity`, `list_sourced_needs`, `get_sourced_need`, and `check_offer`. Search accepts a query and optional exact `country`, `record_kind`, and `limit` filters. `GET /api/agent` describes the JSON API and authority boundary.

`npm run demo:mcp -- http://127.0.0.1:3000` exercises a two-client handoff against the full local API. One client rejects an October 18 query, finds the sourced October 17 Lakewood event, and passes its ID to the second client, which compares it with the globe catalog. The test demonstrates record transfer, not a booked volunteer place.

Search constrains place, day, date, availability, and eligibility before ranking. "Near me" requires a city or country; HeliOS does not guess a person's location. Need cards distinguish reviewed public signals from partner-confirmed requests. The current Food Bank Singapore signal has no partner-confirmed quantity or delivery proof. Private account saves and need drafts do not become public participation claims.

Search keeps the full set of catalog pins on the globe. A query with no exact match points toward a requested city or country when it can be resolved and offers sourced alternatives with the missing timing or availability stated. Place lookup for names outside the catalog uses Open-Meteo / GeoNames with on-map attribution. [Open-Meteo's free API terms](https://open-meteo.com/en/terms) limit use to noncommercial activity; review licensing and capacity before public or commercial use.

The [Small Steps pilot note](docs/SMALL_STEPS_PILOT.md) describes a prospective contact, not an approved need. The [donation flow](docs/STRIPE_DONATION_FLOW.md) specifies future payment verification; no HeliOS checkout or received gift is claimed. The [interface framework](docs/HELIOS_INTERFACE_FRAMEWORK.md) records the UI decisions.
