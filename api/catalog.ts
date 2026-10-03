import { listCatalog } from '../server/data.js';

export async function GET(): Promise<Response> {
  try {
    const items = await listCatalog();
    return Response.json({ items, catalog_count: items.length, voice_available: Boolean(process.env.OPENAI_API_KEY) }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : 'Catalog unavailable.';
    return Response.json({ error }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
