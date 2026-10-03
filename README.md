# Helios

Helios is an original project built during the Supabase Select 2026 Hackathon. It helps a person or their agent discover sourced public-benefit organizations and opportunities on a global globe, inspect each result's source and place, and reach the official next step.

Read the [product brief](docs/product-brief.md) for the hackathon scope, demo path and verified limits.
Use the [agent futures research](docs/HELIOS_AGENT_FUTURES_ARXIV_2026-10-03.md) and [interface framework](docs/HELIOS_INTERFACE_FRAMEWORK.md) for the next product and UI decisions.
The [voice-to-verified-action spec](docs/VOICE_ACTION_NETWORK_SPEC.md) defines the partner task, authority, and receipt path beyond the read-only demo.
The [Stripe donation flow](docs/STRIPE_DONATION_FLOW.md) defines how a cause can receive a direct gift with a verifiable payment state.
The [San Francisco source review](docs/SF_CATALOG_SOURCE_REVIEW.md) records the official evidence and review boundary for the local demo.
The [MCP client guide](docs/MCP_CLIENT.md) shows the working client handoff and its limits.
The [Small Steps pilot note](docs/SMALL_STEPS_PILOT.md) records a prospective first contact. Small Steps has not confirmed a Helios need.
The catalog combines 15 sourced global paths with 15 manually reviewed San Francisco paths. Nine global records are published in Supabase; six newer global records are labeled `curated_demo` until their database publication review. Six SF organizations also have official donation paths. A published recurring day is never presented as a confirmed opening.

The demo uses a separate Supabase project for published records and vector search, Gemini Embedding 2 for semantic retrieval, OpenAI Realtime for voice navigation, and Vercel for the web app. A returned link is not proof of registration, payment, admission, or attendance. Those outcomes require a provider receipt.

## Run locally

Use Node.js 22 or newer. Run `npm ci` and `npm run dev`. The MapLibre globe uses NASA GIBS Blue Marble imagery from August 2004, with attribution in the map. Provide `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the API runtime. Set `GEMINI_API_KEY` and `OPENAI_API_KEY` only in server-side environment variables. Never commit credentials.

`npm run build` checks TypeScript and compiles the client. Local Vite shows all 30 demo records and uses browser speech synthesis and recognition for a guided conversation, with typed replies when recognition is unavailable. Use `vercel dev` for the full API, Supabase Auth, MCP, and OpenAI Realtime path. Account creation requires the existing Supabase URL and publishable key; it uses Supabase email/password Auth. Hosted projects may require email confirmation and a configured redirect URL. Explore remains available to guests.

After a Gemini server key is configured in the isolated Vercel project, run `vercel env run -e preview -- npm run embed:catalog` to inspect the number of pending rows. Add `-- --write` after the script name to embed and read back the published catalog. The command refuses any Supabase URL outside the isolated Helios project.

## Agent access

Connect an MCP client to `https://<deployment>/api/mcp`. Its read-only tools are `describe_catalog`, `search_opportunities`, `get_opportunity`, `list_sourced_needs`, `get_sourced_need`, and `check_offer`. Search accepts a query plus optional exact `country`, `record_kind`, and `limit` filters. `GET /api/agent` describes the JSON API and authority boundary.

`npm run demo:mcp -- http://127.0.0.1:3000` exercises two separate MCP clients against the full local API: October 18 is rejected, October 17 returns the Lakewood event, and the second client reads its ID and compares the result with the globe catalog. See the [MCP client guide](docs/MCP_CLIENT.md).

Each agent result includes a shareable `view_url` that opens the globe at that record, a checked official source, an action kind and label, and an availability status. San Francisco records also expose reviewed cause tags, published recurring days, publication state, and an official donation path when verified. `not_confirmed` is not an open slot. A returned `next_action` or `donation_action` is an external path, not a completed registration, payment, or admission. Empty search results mean only that this curated catalog has no match.

## Needs, matching, and actions

Open Needs or `GET /api/needs` to see published partner cards and reviewed public signals. The first public signal remains `/?need=food-bank-singapore-food-support`; its quantity, partner acceptance, and delivery are unverified. An authenticated organization user can type or dictate a need, review a compact preview, save a private draft, and submit it for verification. A card can become public only after partner confirmation and review. No Small Steps need has been supplied or approved.

Search applies explicit place, day, date, availability, and eligibility constraints before keyword, semantic, or Bedrock ranking. Unknown locations and unsupported eligibility or confirmed-opening requests return an unknown or no-match reason. "Near me" requires a location; the app does not assume San Francisco. Published recurring days still do not establish open spots.

Sign in to save a published catalog opportunity to your Supabase account and reopen it from My actions on another device. Guest saves, sourced preview records, need saves, and official-link selections remain on this device. Helios does not infer registration, payment, participation, or impact from a click. Provider states require provider evidence.
