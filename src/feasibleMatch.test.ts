import assert from 'node:assert/strict';
import test from 'node:test';
import { demoCatalog } from './demoCatalog';
import { feasibleItems } from './feasibleMatch';

const reviewed = Date.parse('2026-10-03T20:00:00Z');

test('an unsupported named place never falls back to another city', () => {
  const country = feasibleItems(demoCatalog, demoCatalog, 'help children learn in Rwanda', reviewed);
  assert.deepEqual(country.items, []);
  assert.equal(country.reason, 'location_mismatch');

  const city = feasibleItems(demoCatalog, demoCatalog, 'volunteer in Oakland', reviewed);
  assert.deepEqual(city.items, []);
  assert.equal(city.reason, 'location_unknown');
});

test('near me abstains without an established user location', () => {
  const match = feasibleItems(demoCatalog, demoCatalog, 'food bank near me', reviewed);
  assert.deepEqual(match.items, []);
  assert.equal(match.reason, 'location_unknown');
});

test('place and weekday facts constrain every ranking path', () => {
  const match = feasibleItems(demoCatalog, demoCatalog, 'Saturday food in San Francisco', reviewed);
  assert.ok(match.items.length > 0);
  assert.ok(match.items.every((item) => item.place_label.startsWith('San Francisco')
    && item.weekly_days?.includes('Saturday')));
});

test('city and country constraints both apply, while worldwide remains broad', () => {
  const local = feasibleItems(demoCatalog, demoCatalog, 'food in San Francisco, United States', reviewed);
  assert.ok(local.items.length > 0);
  assert.ok(local.items.every((item) => item.place_label.startsWith('San Francisco') && item.country === 'United States'));
  assert.equal(feasibleItems(demoCatalog, demoCatalog, 'organizations around the world', reviewed).items.length, demoCatalog.length);
});

test('confirmed openings and eligibility are unknown without typed evidence', () => {
  const opening = feasibleItems(demoCatalog, demoCatalog, 'open spots in San Francisco', reviewed);
  assert.deepEqual(opening.items, []);
  assert.equal(opening.reason, 'availability_unconfirmed');

  const eligibility = feasibleItems(demoCatalog, demoCatalog, 'animal volunteer for a 15 year old in San Francisco', reviewed);
  assert.deepEqual(eligibility.items, []);
  assert.equal(eligibility.reason, 'eligibility_unverified');
});

test('exact date uses a dated occurrence, not a recurring program', () => {
  const match = feasibleItems(demoCatalog, demoCatalog, '2026-10-17 in Lakewood', reviewed);
  assert.deepEqual(match.items.map((item) => item.id), ['red-cross-lakewood-alarms-2026']);
  const spoken = feasibleItems(demoCatalog, demoCatalog, 'October 17 in Lakewood', reviewed);
  assert.deepEqual(spoken.items.map((item) => item.id), ['red-cross-lakewood-alarms-2026']);
  assert.equal(feasibleItems(demoCatalog, demoCatalog, 'October 18 in Lakewood', reviewed).reason, 'date_mismatch');
});
