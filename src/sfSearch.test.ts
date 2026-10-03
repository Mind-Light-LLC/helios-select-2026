import assert from 'node:assert/strict';
import test from 'node:test';
import { sfCatalog } from './sfCatalog';
import { searchCurated } from './sfSearch';
import { demoCatalog } from './demoCatalog';
import { feasibleItems } from './feasibleMatch';

test('San Francisco catalog contains eighteen sourced paths across fifteen organizations', () => {
  assert.equal(sfCatalog.length, 18);
  assert.equal(new Set(sfCatalog.map((item) => item.organization_name)).size, 15);
  assert.ok(sfCatalog.every((item) => item.source_url.startsWith('https://')
    && item.action_url?.startsWith('https://') && item.availability_status === 'not_confirmed'));
});

test('Sunday search shows only published Sunday programs, not weekend-closed roles', () => {
  const results = searchCurated(sfCatalog, 'My Sunday is open; where can I help with food in San Francisco?', 20, Date.parse('2026-10-03'));
  assert.deepEqual(results.map((item) => item.organization_name).sort(),
    ['Project Open Hand', 'St. Anthony Foundation']);
});

test('a ten dollar question prioritizes a verified amount without claiming payment', () => {
  const results = searchCurated(sfCatalog, 'I have $10 to donate in San Francisco', 20, Date.parse('2026-10-03'));
  assert.equal(results[0]?.organization_name, 'Project Open Hand');
  assert.equal(results[0]?.donation_minimum_usd, 10);
  assert.ok(results.every((item) => item.donation_url && item.action_authority === 'provider'));
});

test('day matching expires when a source review is overdue', () => {
  assert.deepEqual(searchCurated(sfCatalog, 'Sunday food in San Francisco', 20, Date.parse('2026-10-11')), []);
});

test('a natural-language event date is a constraint, not a semantic hint', () => {
  const now = Date.parse('2026-10-03');
  const wrongDay = feasibleItems(demoCatalog, demoCatalog,
    'install smoke alarms in Lakewood on October 18 2026', now);
  assert.deepEqual(wrongDay.items, []);
  assert.equal(wrongDay.reason, 'date_mismatch');
  const rightDay = feasibleItems(demoCatalog, demoCatalog,
    'install smoke alarms in Lakewood on 17 October 2026', now);
  assert.deepEqual(rightDay.items.map((item) => item.id), ['red-cross-lakewood-alarms-2026']);
});

test('the same demo spans San Francisco and sourced organizations worldwide', () => {
  assert.ok(demoCatalog.length >= 47);
  assert.equal(demoCatalog.filter((item) => item.place_label === 'San Francisco, California').length, 18);
  assert.ok(new Set(demoCatalog.map((item) => item.country)).size >= 27);
  assert.ok(demoCatalog.every((item) => item.source_url.startsWith('https://')
    && item.action_url?.startsWith('https://') && item.action_authority === 'provider'
    && item.availability_status === 'not_confirmed'));
  assert.ok(searchCurated(demoCatalog, 'Show organizations around the world', 20)
    .some((item) => item.country === 'Nigeria'));
});
