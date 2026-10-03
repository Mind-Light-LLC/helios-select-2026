import { sourcedNeeds } from '../src/needData.js';
import { listPartnerNeeds } from '../server/needs.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const origin = new URL(request.url).origin;
    const needs = [...await listPartnerNeeds(), ...sourcedNeeds];
    return Response.json({
      coverage: 'Published partner needs and reviewed public signals. Provider acceptance and delivery require separate evidence.',
      records: needs.map((need) => ({ ...need, view_url: `${origin}/?need=${encodeURIComponent(need.id)}` })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : 'Needs unavailable.';
    return Response.json({ error: message }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
