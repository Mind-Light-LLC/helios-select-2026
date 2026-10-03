import { voiceEnabled } from '../server/paid-ai.js';

export const voiceTools = [
  {
    type: 'function', name: 'search_catalog',
    description: 'Search the same sourced catalog as the visible search bar. Preserve the person’s exact city or country in query and place. Never reduce a place-specific request to just "volunteer opportunities". Use this before naming an organization or opportunity.',
    parameters: { type: 'object', properties: {
      query: { type: 'string', description: 'The person’s full search intent, including any place and day they named.' },
      place: { type: 'string', description: 'Exact city or country the person named, including earlier turns. Use an empty string only when no place is known.' },
      country: { type: 'string', description: 'Exact country filter only when the person named a country.' },
    }, required: ['query', 'place'] },
  },
  {
    type: 'function', name: 'focus_place',
    description: 'Move the globe to a city or country the person named, even when no catalog opportunity matches there. This does not claim local coverage.',
    parameters: { type: 'object', properties: { place: { type: 'string' } }, required: ['place'] },
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
  'You are HeliOS, a concise conversational guide to sourced public-benefit work.',
  'Sound warm and quick. Use one or two short sentences, usually under 30 spoken words, then stop. Answer the person’s question before asking at most one follow-up.',
  'Light, spontaneous wit is welcome when appropriate. A brief chuckle fits a playful moment. Never force a joke, laugh at hardship, or narrate stage directions.',
  'At the start, say: Hi, I’m HeliOS. Want to volunteer, give, or offer a skill? Then wait.',
  'If the person already gives a specific goal, skip the introduction and help with that goal.',
  'Ask one useful follow-up question at a time. For volunteering, learn the place and available day if missing. For an item or skill, learn what they can offer and where. For giving, ask about cause, place, or budget only when needed.',
  'When asked what this platform can do, explain that it searches source-checked public opportunities, shows official next steps, explores published needs, checks possible offer fit, and lets another agent read published records. Name only capabilities available through the tools in this session.',
  'For any search, carry every place and day the person named into search_catalog. Set place to the exact city or country when named. If they ask to see a place, use focus_place even when you have no matching records. Do not silently drop a named location.',
  'Use search_catalog before naming an organization or opportunity, and list_sourced_needs before naming a need. Use focus_result or focus_need only for an ID returned by those tools. Use check_offer to assess a proposed contribution and explain missing facts.',
  'If a place, date, eligibility, opening, or amount cannot be established, say it is unknown. Do not override a no-match result or invent impact. Distinguish a recurring schedule from a confirmed open spot.',
  'Mention at most two strong options in a spoken reply. Offer to show a card for the official next step.',
  'When search has no exact match, say so plainly and offer the best sourced alternative from the tool output. State its key difference in place, timing, cause, or eligibility. Never call an alternative an open shift.',
  'This version cannot contact a partner or complete an external action. A possible fit or official page is not provider acceptance, registration, payment, delivery, attendance, or impact.',
].join(' ');

export async function POST(request: Request): Promise<Response> {
  if (!voiceEnabled()) return Response.json({ error: 'Realtime voice is not enabled for this deployment.' }, { status: 503 });
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
          audio: {
            input: { turn_detection: { type: 'semantic_vad', eagerness: 'low', create_response: true, interrupt_response: true } },
            output: { voice: 'marin' },
          },
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
