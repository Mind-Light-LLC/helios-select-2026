import assert from 'node:assert/strict';
import test from 'node:test';
import { shadeOpacity, solarPosition } from './solarShade';

test('the stylized shade falls on the sunlit side', () => {
  const equinox = new Date('2026-03-20T12:00:00Z');
  assert.ok(shadeOpacity(0, 0, equinox) > 0.9);
  assert.ok(shadeOpacity(0, 180, equinox) < 0.1);
  assert.ok(Math.abs(solarPosition(equinox).longitude) < 10);
});

test('the inverted shade leaves the former night side bright', () => {
  const eveningUtc = new Date('2026-10-03T21:00:00Z');
  assert.ok(shadeOpacity(0, 0, eveningUtc) < 0.1);
  assert.ok(shadeOpacity(0, -120, eveningUtc) > 0.9);
});
