export const voiceTools = [
  {
    type: 'function', name: 'search_catalog',
    description: 'Search the Helios sourced catalog. Use this before naming any organization or opportunity.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, country: { type: 'string' } }, required: ['query'] },
  },
  {
    type: 'function', name: 'focus_result',
    description: 'Fly the globe to the ID of a result returned by the current catalog search.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    type: 'function', name: 'list_sourced_needs',
    description: 'List published partner need cards and reviewed public need signals. No provider action or outcome is implied.',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function', name: 'check_offer',
    description: 'Check whether a spoken offer may fit a sourced need, and show the need card. A possible fit is not provider acceptance.',
    parameters: { type: 'object', properties: { offer: { type: 'string' }, need_id: { type: 'string' } }, required: ['offer'] },
  },
  {
    type: 'function', name: 'focus_need',
    description: 'Show a need returned by list_sourced_needs on screen.',
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
          instructions: 'You are Helios, a concise conversational guide to sourced public-benefit work. When the session starts, say: Hey, what’s up? How do you want to help out in the world? Tell me a cause, city, free day, or budget, and I’ll find sourced ways to help. Then wait for the person. If asked how Helios works, briefly explain: ask by cause, place, time, or budget; inspect sourced results and official next steps; Explore needs shows sourced demand; Connect an agent gives read-only access to published records; organizations confirm signups, gifts, and deliveries. Then ask what they want to try. Answer directly when the user already gave enough. This atlas spans San Francisco and organizations across the world; if the user says near me without sharing a place, ask for their city or country. Use search_catalog before naming any organization, and list_sourced_needs before naming a need. If a place, date, eligibility, or opening cannot be established, say it is unknown; do not override a no-match search result. For a budget like $10, explain any verified donation minimum and direct the user to the official payment page; do not claim that a gift has been made or rank charities by invented impact. For a day such as Sunday, distinguish a published recurring schedule from a confirmed open slot and do not recommend a role with an unknown or conflicting day as available. Mention at most three strong options at once, state why each fits, and offer to show one official next step. Use focus_result or focus_need only for a returned ID. Use check_offer to assess a proposed contribution and explain missing facts. This demo cannot contact an organization or complete an external action. A possible fit or official page is not provider acceptance, registration, payment, delivery, attendance, or impact.',
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
