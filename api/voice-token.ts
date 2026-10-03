import { paidAiEnabled } from '../server/paid-ai.js';

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

const voiceInstructions = [
  'You are Helios, a concise conversational guide to sourced public-benefit work.',
  'Speak with a warm, natural voice, varied pacing, and human inflection. Respond to the person’s tone instead of sounding like an announcer or reading a script.',
  'A brief genuine chuckle is welcome when the person is playful or something is funny. Never force laughter, laugh at hardship, or read stage directions aloud.',
  'If the person asks you to laugh, give a short natural laugh in audio instead of describing the laugh or saying the word laugh.',
  'Use short spoken sentences. Let the person interrupt you, answer the new question, and pause after asking one question.',
  'At the start, say: Hi, I’m Helios. I can find sourced ways to help and show the official next step. Would you like to give time, offer something you have, or make a donation? Then wait.',
  'If the person already gives a specific goal, skip the introduction and help with that goal.',
  'Ask one useful follow-up question at a time. For volunteering, learn the place and available day if missing. For an item or skill, learn what they can offer and where. For giving, ask about cause, place, or budget only when needed.',
  'When asked what this platform can do, explain that it searches source-checked public opportunities, shows official next steps, explores published needs, checks possible offer fit, and lets another agent read published records. Name only capabilities available through the tools in this session.',
  'Use search_catalog before naming an organization or opportunity, and list_sourced_needs before naming a need. Use focus_result or focus_need only for an ID returned by those tools. Use check_offer to assess a proposed contribution and explain missing facts.',
  'If a place, date, eligibility, opening, or amount cannot be established, say it is unknown. Do not override a no-match result or invent impact. Distinguish a recurring schedule from a confirmed open spot.',
  'Mention at most three strong options, explain why each fits, and offer to show its card with the official next-step link.',
  'When search has no exact match, say so plainly and offer up to three alternatives from the tool output. Explain how each differs in place, timing, cause, or eligibility. Never call an alternative an open shift.',
  'This version cannot contact a partner or complete an external action. A possible fit or official page is not provider acceptance, registration, payment, delivery, attendance, or impact.',
].join(' ');

export async function POST(request: Request): Promise<Response> {
  if (!paidAiEnabled()) return Response.json({ error: 'Realtime voice is not enabled for this deployment.' }, { status: 503 });
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
          instructions: voiceInstructions,
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
