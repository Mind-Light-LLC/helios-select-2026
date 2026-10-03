export function GET(request: Request): Response {
  const origin = new URL(request.url).origin;
  return Response.json({
    name: 'Helios',
    purpose: 'Find source-checked public benefit opportunities, donation paths, and needs, then reach an official next step.',
    mcp: `${origin}/api/mcp`,
    transport: 'JSON-RPC over HTTP; accepts application/json and text/event-stream',
    tools: ['describe_catalog', 'search_opportunities', 'get_opportunity', 'list_sourced_needs', 'get_sourced_need', 'check_offer'],
    catalog: `${origin}/api/catalog`,
    needs: `${origin}/api/needs`,
    view_url_example: `${origin}/?item=project-open-hand-kitchen-sf`,
    need_view_url_example: `${origin}/?need=food-bank-singapore-food-support`,
    search: {
      url: `${origin}/api/search`, method: 'POST',
      body: { query: 'warehouse volunteering', country: 'Singapore', record_kind: 'volunteer', limit: 5 },
    },
    handoff_example: [
      { step: 1, tool: 'search_opportunities', arguments: { query: 'Lakewood Red Cross October 18' }, expect: 'zero matches; date_mismatch' },
      { step: 2, tool: 'search_opportunities', arguments: { query: 'Lakewood Red Cross October 17' }, pass_forward: 'records[0].id' },
      { step: 3, tool: 'get_opportunity', arguments: { id: 'red-cross-lakewood-alarms-2026' }, pass_forward: 'record.view_url' },
      { step: 4, destination: 'human_globe', url: `${origin}/?item=red-cross-lakewood-alarms-2026` },
    ],
    coverage: 'Curated sample. An empty result does not prove that no opportunity exists elsewhere.',
    authority: 'Read-only MCP. Sourced preview records are labeled. Published schedules are not open slots. Registration, payment, admission and attendance require provider receipts. Account saves require a human Supabase session.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
