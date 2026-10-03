import assert from 'node:assert/strict';
import test from 'node:test';
import { demoCatalog } from './demoCatalog';
import { globeMarkerGroups } from './globeMarkerGroups';

test('world view groups nearby cities, then reveals each place when zoomed', () => {
  const records = demoCatalog.filter((item) => ['british-red-cross-volunteer', 'restos-paris-volunteer', 'unv-online-volunteering', 'berliner-tafel-volunteer'].includes(item.id));
  const world = globeMarkerGroups(records, true);
  assert.equal(world.length, 1);
  assert.equal(world[0].nearby, true);
  assert.equal(world[0].items.length, 4);
  const closer = globeMarkerGroups(records, false);
  assert.equal(closer.length, 4);
  assert.ok(closer.every((group) => !group.nearby));
});

test('records for one place retain their own count marker', () => {
  const records = demoCatalog.filter((item) => item.place_label === 'San Francisco, California');
  const world = globeMarkerGroups(records, true);
  assert.equal(world.length, 1);
  assert.equal(world[0].nearby, false);
  assert.equal(world[0].items.length, records.length);
});
