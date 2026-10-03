import { searchItems } from '../server/data.js';
import { searchInput } from '../server/search-input.js';

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = searchInput.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Enter a query and valid optional country, record kind, or limit.' }, { status: 400 });
  }
  try {
    const { query, ...options } = parsed.data;
    return Response.json(await searchItems(query, options), { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : 'Search unavailable.';
    return Response.json({ error }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
