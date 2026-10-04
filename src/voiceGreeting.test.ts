import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendOpeningGreeting } from './voiceGreeting';

test('tap starts one spoken question while Option waits for the person', () => {
  const events: string[] = [];
  const channel = { send: (event: string) => { events.push(event); } };
  assert.equal(sendOpeningGreeting(channel, 'hold'), 'skipped');
  assert.equal(events.length, 0);
  assert.equal(sendOpeningGreeting(channel, 'continuous'), 'sent');
  assert.equal(events.length, 1);
  const event: unknown = JSON.parse(events[0]);
  assert.deepEqual(event, { type: 'response.create', response: {
    input: [], output_modalities: ['audio'], tool_choice: 'none',
    instructions: 'You are HeliOS. Give one short, warm spoken greeting, then ask what place or cause the person wants to help. Do not name an opportunity or imply that a spot is open.',
  } });
  assert.equal(sendOpeningGreeting({ send: () => { throw new Error('closed'); } }, 'continuous'), 'failed');
});
