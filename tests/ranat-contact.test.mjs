import test from 'node:test';
import assert from 'node:assert/strict';
import { MalletContactController } from '../src/instruments/ranat/malletContact.ts';
const bars = Array.from({length:21}, (_,bar) => ({bar,left:bar*.06,right:bar*.06+.05,front:-.1,back:.1,top:.2+bar*.002}));
const head = (bar, gap, hand='L') => ({hand,x:bar*.06+.025,z:0,bottom:bars[bar].top+gap});
test('each measured bar triggers only on downward contact and rearms after lifting', () => {
  for(let bar=0;bar<21;bar++) {
    const c=new MalletContactController();
    assert.equal(c.update([head(bar,.06)],bars,0,'direct').length,0);
    assert.equal(c.update([head(bar,.01)],bars,20,'direct').length,0);
    const hit=c.update([head(bar,-.002)],bars,40,'direct');
    assert.equal(hit.length,1); assert.equal(hit[0].bar,bar);
    assert.equal(c.update([head(bar,-.002)],bars,60,'direct').length,0);
    c.update([head(bar,.06)],bars,80,'direct');
    assert.equal(c.update([head(bar,-.002)],bars,100,'direct').length,1);
  }
});
test('already lowered, missing, sideways and stale heads do not create hits', () => {
  const c=new MalletContactController();
  assert.equal(c.update([head(0,-.002)],bars,0,'direct').length,0);
  assert.equal(c.update([head(1,-.002)],bars,20,'direct').length,0);
  c.update([head(0,.06)],bars,40,'direct'); c.update([],bars,60,'direct');
  assert.equal(c.update([head(0,-.002)],bars,80,'direct').length,0);
  c.update([head(0,.06)],bars,100,'direct');
  assert.equal(c.update([head(0,-.002)],bars,700,'direct').length,0);
});
test('fast swept contact hits the crossed surface, not a guessed target bar', () => {
  const c=new MalletContactController();
  c.update([head(10,.1)],bars,0,'direct');
  assert.equal(c.update([head(10,-.1)],bars,40,'direct')[0].bar,10);
  const miss=new MalletContactController();
  miss.update([{...head(0,.1),z:1}],bars,0,'direct');
  assert.equal(miss.update([{...head(0,-.1),z:1}],bars,40,'direct').length,0);
});
test('both hands strike independently; sustained modes release on lift, loss and reset', () => {
  const c=new MalletContactController();
  c.update([head(0,.06),head(20,.06,'R')],bars,0,'direct');
  assert.equal(c.update([head(0,-.002),head(20,-.002,'R')],bars,40,'direct').length,2);
  for(const mode of ['kro','roll']) for(const ending of ['lift','loss','reset']) {
    const d=new MalletContactController();
    d.update([head(0,.06)],bars,0,mode);
    assert.equal(d.update([head(0,-.002)],bars,40,mode)[0].kind,'hold');
    assert.equal(d.update([head(0,-.002)],bars,60,mode).length,0);
    const commands=ending==='reset'?d.reset():d.update(ending==='loss'?[]:[head(0,.06)],bars,80,mode);
    assert.equal(commands[0].kind,'release');
  }
});
