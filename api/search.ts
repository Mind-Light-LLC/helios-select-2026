import { searchItems } from '../server/data.js';

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const query = typeof body === 'object' && body !== null && 'query' in body ? body.query : null;
  if (typeof query !== 'string' || !query.trim() || query.length > 500) {
    return Response.json({ error: 'Enter a search of up to 500 characters.' }, { status: 400 });
  }
  try {
    return Response.json(await searchItems(query.trim()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : 'Search unavailable.';
    return Response.json({ error }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
