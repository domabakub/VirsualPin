import test from 'node:test';
import assert from 'node:assert/strict';
import { NUMBER_KEYS, ranatKeyboardIndex, ranatKeyboardBar, ranatKeyboardLabel } from '../src/instruments/ranat/model.ts';

test('all 21 bars have an immediate shortcut, including the two-digit bar numbers', () => {
  for (let i = 0; i < 10; i++) {
    const key = NUMBER_KEYS[i];
    assert.equal(ranatKeyboardBar(`Digit${key}`, key), i);
    assert.equal(ranatKeyboardBar(`Digit${key}`, '!', true), i + 10);
    assert.equal(ranatKeyboardLabel(i + 10), `Shift + ${key}`);
  }
  assert.equal(ranatKeyboardBar('Digit0', '0'), 9);
  assert.equal(ranatKeyboardBar('Digit0', ')', true), 19);
  assert.equal(ranatKeyboardBar('KeyQ', 'ๆ'), 20);
  assert.equal(ranatKeyboardBar('Numpad1', 'End', true), -1);
  assert.equal(ranatKeyboardBar('Enter', 'Enter'), -1);
});
test('number row and numpad map 1 through 0 to ten ascending bars', () => {
  [...NUMBER_KEYS].forEach((key, i) => {
    assert.equal(ranatKeyboardIndex(`Digit${key}`, key), i);
    assert.equal(ranatKeyboardIndex(`Numpad${key}`, key), i);
  });
  assert.equal(ranatKeyboardIndex('Digit1', 'ๅ'), 0);
  assert.equal(ranatKeyboardIndex('Digit2', '/'), 1);
});
test('letters remain available and navigation numpad keys never play', () => {
  assert.equal(ranatKeyboardIndex('KeyA', 'ฟ'), 0);
  assert.equal(ranatKeyboardIndex('Semicolon', 'ว'), 9);
  for (const [code, key] of [['Numpad1','End'],['Numpad0','Insert'],['NumpadDecimal','.'],['ArrowDown','ArrowDown'],['',''],['Enter','Enter']]) {
    assert.equal(ranatKeyboardIndex(code, key), -1);
  }
});
