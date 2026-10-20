import test from 'node:test';
import assert from 'node:assert/strict';
import { NUMBER_KEYS, ranatKeyboardIndex } from '../src/instruments/ranat/model.ts';
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
