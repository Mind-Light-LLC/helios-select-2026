import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST, voiceTools } from './voice-token.js';

test('voice search requires a place field so the model reports whether one is known', () => {
  const search = voiceTools.find((tool) => tool.name === 'search_catalog');
  assert.deepEqual(search?.parameters.required, ['query', 'place', 'reply_language']);
});

test('voice access is separate from paid search and requires its own switch', async () => {
  const originalVoice = process.env.HELIOS_VOICE_ENABLED;
  const originalPaidSearch = process.env.HELIOS_PAID_AI_ENABLED;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  let sessionBody: unknown;
  try {
    delete process.env.HELIOS_VOICE_ENABLED;
    process.env.HELIOS_PAID_AI_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'test-key';
    globalThis.fetch = async (_input, init) => {
      providerCalls += 1;
      sessionBody = JSON.parse(String(init?.body));
      return Response.json({ value: 'short-lived-test-token', expires_at: 1234567890 });
    };
    const request = () => new Request('https://helios.example/api/voice-token', { method: 'POST' });
    const disabled = await POST(request());
    assert.equal(disabled.status, 503);
    assert.equal(providerCalls, 0);

    process.env.HELIOS_PAID_AI_ENABLED = 'false';
    process.env.HELIOS_VOICE_ENABLED = 'true';
    const enabled = await POST(request());
    assert.equal(enabled.status, 200);
    assert.equal(providerCalls, 1);
    assert.equal(enabled.headers.get('Cache-Control'), 'no-store');
    assert.match(JSON.stringify(sessionBody), /focus_place/);
    assert.match(JSON.stringify(sessionBody), /Set place to the city or country/);
    assert.match(JSON.stringify(sessionBody), /Translate search terms and weekdays into English/);
    assert.match(JSON.stringify(sessionBody), /When the app requests an opening greeting, ask one brief question/);
    assert.match(JSON.stringify(sessionBody), /Otherwise wait for the person to speak first/);
  } finally {
    if (originalVoice === undefined) delete process.env.HELIOS_VOICE_ENABLED;
    else process.env.HELIOS_VOICE_ENABLED = originalVoice;
    if (originalPaidSearch === undefined) delete process.env.HELIOS_PAID_AI_ENABLED;
    else process.env.HELIOS_PAID_AI_ENABLED = originalPaidSearch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});
