# Helios

Helios is an original project built during the Supabase Select 2026 Hackathon. It helps a person or their agent discover sourced public-benefit organizations and opportunities on a global globe, inspect each result's source and place, and reach the official next step.

Read the [product brief](docs/product-brief.md) for the hackathon scope, demo path and verified limits.

The demo uses a separate Supabase project for published records and vector search, Gemini Embedding 2 for semantic retrieval, OpenAI Realtime for voice navigation, and Vercel for the web app. A returned link is not proof of registration, payment, admission, or attendance. Those outcomes require a provider receipt.

## Run locally

Use Node.js 22 or newer. Run `npm ci` and `npm run dev`. The globe uses MapLibre's public demo tiles for this hackathon build. Provide `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the API runtime. Set `GEMINI_API_KEY` and `OPENAI_API_KEY` only in server-side environment variables. Never commit credentials.

`npm run build` checks TypeScript and compiles the client. Local Vite development does not automatically run the Vercel API routes; use `vercel dev` for the full request path.

After a Gemini server key is configured in the isolated Vercel project, run `vercel env run -e preview -- npm run embed:catalog` to inspect the number of pending rows. Add `-- --write` after the script name to embed and read back the published catalog. The command refuses any Supabase URL outside the isolated Helios project.

## Agent access

Connect an MCP client to `https://<deployment>/api/mcp`. It exposes the read-only tools `search_opportunities` and `get_opportunity`. `GET /api/agent` describes the JSON API and authority boundary. A returned `next_action` is an official external link, not a completed registration.
