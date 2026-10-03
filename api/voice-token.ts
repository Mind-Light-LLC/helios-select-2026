const voiceTools = [
  {
    type: 'function', name: 'search_catalog',
    description: 'Search the Helios sourced catalog. Use this before naming any organization or opportunity.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    type: 'function', name: 'focus_result',
    description: 'Fly the globe to the ID of a result returned by the current catalog search.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
];

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Origin not allowed.' }, { status: 403 });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: 'Voice is not configured yet.' }, { status: 503 });
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: 60 },
        session: {
          type: 'realtime', model: 'gpt-realtime-2.1',
          audio: { output: { voice: 'marin' } },
          instructions: 'You are Helios, a concise voice guide to a limited sourced public-benefit catalog. Search before giving a recommendation. Only name organizations, events, dates, places, and links returned by search_catalog. State when the catalog has no match. Use focus_result only for a returned ID when the user asks to see it on the globe. An official action link is not proof of registration, payment, admission, or attendance.',
          tools: voiceTools,
          tool_choice: 'auto',
        },
      }),
    });
    if (!response.ok) return Response.json({ error: `Voice setup failed (${response.status}).` }, { status: 502 });
    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null || !('value' in payload) || typeof payload.value !== 'string'
      || !('expires_at' in payload) || typeof payload.expires_at !== 'number') {
      return Response.json({ error: 'Voice setup returned an invalid token.' }, { status: 502 });
    }
    return Response.json({ value: payload.value, expires_at: payload.expires_at }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Voice setup is unavailable.' }, { status: 502 });
  }
}
