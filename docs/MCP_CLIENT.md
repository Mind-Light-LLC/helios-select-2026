# Helios MCP client

Helios exposes read-only tools at `https://<your Helios host>/api/mcp`. The app's **Connect agents** panel shows the exact endpoint for the host currently open. `GET /api/agent` returns a machine-readable tool inventory and a handoff example.

For a client that supports remote MCP over HTTP, add a server named `helios` using that URL. The URL has no credential in it. A protected Vercel preview may require Vercel authentication; an external MCP client cannot use that preview until its access path is configured. No agent needs a Supabase service key.

## Shared-record handoff

1. Call `describe_catalog` to learn the limited country and record coverage.
2. Call `search_opportunities` with the person's cause, place, and date. Read `reason_codes` and `match_count` before making a claim.
3. Pass a returned `records[n].id` to `get_opportunity` in another client or workflow step. Use the returned `record.source`, `record.map.meaning`, `record.availability`, and `record.next_action` as the answer contract.
4. Send `record.view_url` to the person. It opens the same ID on the globe. The person chooses whether to follow the organization's official action link.

`Lakewood Red Cross October 18` returns zero matches with `date_mismatch`. `Lakewood Red Cross October 17` returns `red-cross-lakewood-alarms-2026`. The map point means **event city**, not a meeting point. The official action leads to the Red Cross event page and its shift finder. Availability is `not_confirmed`; no registration is claimed.

Run the independent client check against a full local API:

```bash
npm run demo:mcp -- http://127.0.0.1:3000
```

The command initializes two named MCP clients, lists tools, hands the record ID from search to `get_opportunity`, and compares its returned fields with `GET /api/catalog`, which draws the globe. It exits with an error if the date guard or the shared-record agreement fails. This is a deterministic client workflow, not two autonomous model agents.

## Tool boundary

`search_opportunities`, `get_opportunity`, `describe_catalog`, `list_sourced_needs`, `get_sourced_need`, and `check_offer` only read and assess sourced records. Some catalog rows are labeled `curated_demo`. A record's source check is provenance, not provider confirmation of an open place. `next_action.state: not_started` remains true after an agent reads it. An official link click is not a registration, payment, admission, or attendance receipt. Account saves use the person's Supabase Auth session in the app and are not exposed as an anonymous MCP write tool.
