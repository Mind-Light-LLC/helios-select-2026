import assert from 'node:assert/strict';
import test from 'node:test';
import { focusFromGeocoding } from './geocode.js';

test('uses an exact country match instead of a similarly named place', () => {
  const focus = focusFromGeocoding({ results: [
    { name: 'Rwandagaro', latitude: -3.2, longitude: 30, feature_code: 'PPLL' },
    { name: 'Rwanda', latitude: -2, longitude: 30, feature_code: 'PCLI' },
  ] }, 'Rwanda');
  assert.deepEqual(focus, { longitude: 30, latitude: -2, scale: 'country', source: 'open_meteo' });
});

test('rejects a fuzzy or invalid location result', () => {
  assert.equal(focusFromGeocoding({ results: [{ name: 'Oakland', latitude: 200, longitude: -122 }] }, 'Oakland'), null);
  assert.equal(focusFromGeocoding({ results: [{ name: 'Oakland Hills', latitude: 37, longitude: -122 }] }, 'Oakland'), null);
});
