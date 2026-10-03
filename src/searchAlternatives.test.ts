import assert from 'node:assert/strict';
import test from 'node:test';
import { demoCatalog } from './demoCatalog';
import { searchAlternatives } from './searchAlternatives';

test('a missed Friday request offers related San Francisco paths without claiming an opening', () => {
  const next = searchAlternatives(demoCatalog, 'animal volunteer in San Francisco on Friday', 'schedule_unverified');
  assert.ok(next.alternatives?.some(({ item }) => item.id === 'sf-spca-volunteer'));
  assert.ok(next.alternatives?.every(({ item }) => item.availability_status !== 'open_confirmed'));
  assert.match(next.next_step ?? '', /No verified shift/);
});

test('an unsupported place offers a clearly labeled online path', () => {
  const next = searchAlternatives(demoCatalog, 'volunteer in Rwanda on Friday', 'location_mismatch');
  assert.deepEqual(next.alternatives?.map(({ item }) => item.id), ['unv-online-volunteering']);
  assert.match(next.alternatives?.[0].explanation ?? '', /Online assignment directory/);
});

test('an explicit country filter prevents suggestions outside that country', () => {
  const next = searchAlternatives(demoCatalog, 'volunteer on Friday', 'schedule_unverified', { country: 'France' });
  assert.ok(next.alternatives?.every(({ item }) => item.country === 'France'));
});

test('a missed calendar date favors local programs that recur on its weekday', () => {
  const next = searchAlternatives(demoCatalog, 'volunteer in San Francisco on October 31, 2026', 'date_mismatch');
  const local = next.alternatives?.filter(({ item }) => item.place_label.startsWith('San Francisco')) ?? [];
  assert.ok(local.length > 0);
  assert.ok(local.every(({ item }) => item.weekly_days?.includes('Saturday')));
  assert.match(local[0].explanation, /2026-10-31 opening is unconfirmed/);
});
