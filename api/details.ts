import { getCardDetails } from '../server/data.js';

export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id || id.length > 200) {
    return Response.json({ error: 'A valid record ID is required.' }, { status: 400 });
  }
  try {
    const details = await getCardDetails(id);
    return Response.json({ details }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : 'Record details unavailable.';
    return Response.json({ error }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
