import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessOffer, sourcedNeeds } from './needData';

const reviewed = new Date('2026-10-03T20:00:00Z');

test('matches a listed food only with a known location', () => {
  assert.equal(assessOffer('Unopened canned tuna in Singapore', undefined, reviewed).fit, 'possible');
  assert.equal(assessOffer('Unopened canned tuna', undefined, reviewed).fit, 'unknown');
});

test('rejects unsafe food even when another condition is met', () => {
  assert.equal(assessOffer('Unopened expired tuna in Singapore', undefined, reviewed).fit, 'not_eligible');
  assert.equal(assessOffer('Opened unexpired tuna in Singapore', undefined, reviewed).fit, 'not_eligible');
});

test('does not recommend a role when age or schedule conflicts', () => {
  assert.equal(assessOffer('I am 15 years old and can pack food in Singapore', undefined, reviewed).fit, 'not_eligible');
  assert.equal(assessOffer("I'm 15 and can pack food in Singapore", undefined, reviewed).fit, 'not_eligible');
  assert.equal(assessOffer('I can deliver food on weekends in Singapore', undefined, reviewed).fit, 'unknown');
});

test('stale sources and negated offers cannot produce a possible fit', () => {
  assert.equal(assessOffer('I have rice in Singapore', undefined, new Date('2026-10-11T00:00:00Z')).fit, 'unknown');
  assert.equal(assessOffer("I don't have rice in Singapore", undefined, reviewed).fit, 'unknown');
});

test('the need record does not claim partner or delivery proof', () => {
  const need = sourcedNeeds[0];
  assert.equal(need.quantity_needed, null);
  assert.equal(need.delivery_status, 'unverified');
  assert.deepEqual(need.evidence_steps.map((step) => step.state), ['documented', 'unverified', 'unverified', 'unverified']);
});
