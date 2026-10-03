import assert from 'node:assert/strict';
import test from 'node:test';
import { demoCatalog } from './demoCatalog';
import { feasibleItems } from './feasibleMatch';
import { searchCurated } from './sfSearch';
import { voiceCatalogQuery } from './voiceCatalogQuery';

test('voice keeps the spoken city when the search terms are generic', () => {
  const query = voiceCatalogQuery('volunteer opportunities', 'San Francisco');
  assert.equal(query, 'volunteer opportunities in San Francisco');
  const feasible = feasibleItems(demoCatalog, demoCatalog, query);
  const matches = searchCurated(feasible.items, query);
  assert.ok(matches.length > 0);
  assert.ok(matches.every((item) => item.record_kind === 'volunteer'
    && item.place_label.startsWith('San Francisco')));
  assert.ok(matches.some((item) => item.organization_name === 'Project Open Hand'));
});

test('voice does not duplicate a city already in the search query', () => {
  assert.equal(voiceCatalogQuery('volunteer on Friday in San Francisco', 'San Francisco, California'),
    'volunteer on Friday in San Francisco');
});
