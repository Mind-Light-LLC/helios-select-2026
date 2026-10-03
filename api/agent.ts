export function GET(request: Request): Response {
  const origin = new URL(request.url).origin;
  return Response.json({
    name: 'Helios',
    purpose: 'Find source-checked public benefit opportunities and the official next step.',
    mcp: `${origin}/api/mcp`,
    tools: ['search_opportunities', 'get_opportunity'],
    catalog: `${origin}/api/catalog`,
    search: { url: `${origin}/api/search`, method: 'POST', body: { query: 'volunteer with food relief in Lagos' } },
    authority: 'Read-only. Registration, payment, admission and attendance remain external until confirmed by the provider.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
