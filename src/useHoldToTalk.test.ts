import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldActivateHold } from './useHoldToTalk';

const key = { code: 'AltLeft', ctrlKey: false, metaKey: false, shiftKey: false, isComposing: false };

test('either Option key activates hold to talk, while Space does not', () => {
  assert.equal(shouldActivateHold(key, false), true);
  assert.equal(shouldActivateHold({ ...key, code: 'AltRight' }, false), true);
  assert.equal(shouldActivateHold({ ...key, code: 'Space' }, false), false);
});

test('typing and modified Option shortcuts do not activate hold to talk', () => {
  assert.equal(shouldActivateHold(key, true), false);
  assert.equal(shouldActivateHold({ ...key, metaKey: true }, false), false);
  assert.equal(shouldActivateHold({ ...key, shiftKey: true }, false), false);
  assert.equal(shouldActivateHold({ ...key, isComposing: true }, false), false);
});
