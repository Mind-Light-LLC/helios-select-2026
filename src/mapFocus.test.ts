import assert from 'node:assert/strict';
import test from 'node:test';
import { demoCatalog } from './demoCatalog';
import { mapFocusForQuery, placeForQuery } from './mapFocus';

test('a no-match San Francisco query still gives the globe a local focus', () => {
  const focus = mapFocusForQuery('volunteer in San Francisco on October 31', demoCatalog);
  assert.equal(focus?.scale, 'city');
  assert.ok(focus && focus.longitude < -122 && focus.latitude > 37);
});

test('unknown places do not invent map coordinates', () => {
  assert.equal(mapFocusForQuery('volunteer in Rwanda', demoCatalog), null);
  assert.equal(placeForQuery('volunteer in Rwanda on Friday'), 'Rwanda');
  assert.equal(placeForQuery('volunteer near Oakland, California this Saturday'), 'Oakland, California');
  assert.equal(placeForQuery('opportunities around the world'), null);
});
