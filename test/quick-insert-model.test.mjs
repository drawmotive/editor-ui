import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuickInsertHistory, quickInsertGroups, QUICK_INSERT_OBJECTS } from '../src/quick-insert-model.js';
import { CLOUD_OBJECTS } from './fixtures/quick-insert-objects.mjs';

const ids = groups => groups.map(group => [group.label, group.items.map(item => item.id)]);
const storage = (initial = null) => {
  let value = initial;
  return { getItem: () => value, setItem: (_key, next) => { value = next; } };
};

test('ungrouped objects stay first without a heading even when catalog providers precede them', () => {
  const catalog = [...CLOUD_OBJECTS, ...QUICK_INSERT_OBJECTS];
  const groups = quickInsertGroups('', { text: { count: 2, lastUsed: 1 } }, catalog);
  assert.deepEqual(ids(groups).slice(0, 3), [
    [null, ['arrow', 'rectangle', 'ellipse', 'diamond', 'text']],
    ['Recent', ['text']],
    ['Frequently used', ['text']],
  ]);
  assert.deepEqual(groups.slice(3).map(group => group.label), ['AWS', 'Azure', 'Google Cloud']);
  assert.equal(new Set(groups.map(group => group.key)).size, groups.length);
});

test('CDN searches across providers while retaining only matching nonempty groups', () => {
  const catalog = [...QUICK_INSERT_OBJECTS, ...CLOUD_OBJECTS];
  assert.deepEqual(ids(quickInsertGroups(' CDN ', {}, catalog)), [
    ['AWS', ['aws.cloudfront', 'aws.edge', 'aws.distribution']],
    ['Azure', ['azure.cdn', 'azure.frontdoor']],
    ['Google Cloud', ['google.cdn']],
  ]);
  assert.deepEqual(ids(quickInsertGroups('google cdn', {}, catalog)), [['Google Cloud', ['google.cdn']]]);
  assert.deepEqual(ids(quickInsertGroups('arrow', {}, catalog)), [[null, ['arrow']]]);
  assert.deepEqual(quickInsertGroups('no such object', {}, catalog), []);
  assert.deepEqual(quickInsertGroups('', {}, []), []);
});

test('short queries broaden cloud candidates without duplicating matching objects', () => {
  const matches = query => quickInsertGroups(query, {}, CLOUD_OBJECTS).flatMap(group => group.items.map(item => item.id));
  assert.equal(matches('c').length, 24);
  assert.equal(matches('cl').length, 23);
  assert.equal(matches('api').length, 4);
  assert.equal(new Set(matches('c')).size, matches('c').length);
  assert.ok(matches('cdn').every(id => matches('c').includes(id)));
});

test('search finds labels and aliases without case or surrounding whitespace sensitivity', () => {
  assert.deepEqual(ids(quickInsertGroups('  BOX  ', {})), [[null, ['rectangle']]]);
  assert.deepEqual(ids(quickInsertGroups('oval', {})), [[null, ['ellipse']]]);
  assert.deepEqual(ids(quickInsertGroups('tex', {})), [[null, ['text']]]);
  assert.deepEqual(quickInsertGroups('unavailable object', {}), []);
});

test('search combines whitespace-separated words and treats the letter s literally', () => {
  assert.deepEqual(ids(quickInsertGroups('circle shape', {})), [[null, ['ellipse']]]);
  assert.deepEqual(ids(quickInsertGroups('s', {})), [[null, ['rectangle', 'ellipse', 'diamond']]]);
});

test('recent order follows use while frequent order follows count then recency', () => {
  const saved = storage(), history = createQuickInsertHistory(() => saved);
  for (const id of ['ellipse', 'rectangle', 'ellipse', 'diamond', 'text']) history.record(id);
  assert.deepEqual(ids(quickInsertGroups('', history.read())), [
    [null, ['arrow', 'rectangle', 'ellipse', 'diamond', 'text']],
    ['Recent', ['text', 'diamond', 'ellipse']],
    ['Frequently used', ['ellipse']],
  ]);
  assert.deepEqual(ids(quickInsertGroups('rect', history.read())), [[null, ['rectangle']]]);
});

test('usage survives a new history owner and unknown tools cannot enter storage', () => {
  const saved = storage();
  const first = createQuickInsertHistory(() => saved);
  first.record('rectangle'); first.record('rectangle'); first.record('settings');
  const second = createQuickInsertHistory(() => saved);
  assert.deepEqual(Object.keys(second.read()), ['rectangle']);
  assert.equal(second.read().rectangle.count, 2);
  assert.deepEqual(ids(quickInsertGroups('', second.read()))[1], ['Recent', ['rectangle']]);
});

test('existing history owners see other editors without overwriting their usage', () => {
  const saved = storage();
  const first = createQuickInsertHistory(() => saved), second = createQuickInsertHistory(() => saved);
  first.record('rectangle'); second.record('ellipse'); first.record('rectangle');
  assert.equal(second.read().rectangle.count, 2);
  assert.equal(first.read().ellipse.count, 1);
  assert.deepEqual(ids(quickInsertGroups('', second.read()))[1], ['Recent', ['rectangle', 'ellipse']]);
});

test('refreshing shared storage retains unsaved local increments until writes recover', () => {
  const saved = storage(); let blocked = true;
  const local = createQuickInsertHistory(() => ({getItem: saved.getItem, setItem(...args) {
    if (blocked) throw new Error('Quota');
    saved.setItem(...args);
  }}));
  local.record('text'); local.record('text');
  createQuickInsertHistory(() => saved).record('ellipse');
  assert.equal(local.read().text.count, 2);
  assert.equal(local.read().ellipse.count, 1);
  blocked = false; local.record('text');
  const reloaded = createQuickInsertHistory(() => saved);
  assert.equal(reloaded.read().text.count, 3);
  assert.equal(reloaded.read().ellipse.count, 1);
});

test('corrupt and untrusted stored history is ignored', () => {
  for (const value of ['not json', 'null', '[]', '{"version":2,"usage":{}}']) {
    assert.deepEqual(createQuickInsertHistory(() => storage(value)).read(), {});
  }
  const history = createQuickInsertHistory(() => storage(JSON.stringify({version:1, usage:{
    rectangle:{count:2,lastUsed:3}, unknown:{count:99,lastUsed:99},
    text:{count:-1,lastUsed:2}, ellipse:{count:1,lastUsed:'new'}, diamond:{count:1.5,lastUsed:4},
  }})));
  assert.deepEqual(history.read(), {rectangle:{count:2,lastUsed:3}});
});

test('blocked storage keeps usage in memory and hidden tools never appear in suggestions', () => {
  const history = createQuickInsertHistory(() => { throw new Error('Storage denied'); });
  history.record('text'); history.record('text');
  assert.equal(history.read().text.count, 2);
  assert.deepEqual(ids(quickInsertGroups('', history.read(), QUICK_INSERT_OBJECTS.filter(item => item.id === 'rectangle'))), [[null, ['rectangle']]]);
  const writeFailure = createQuickInsertHistory(() => ({getItem:()=>null,setItem:()=>{throw new Error('Quota');}}));
  writeFailure.record('arrow');
  assert.equal(writeFailure.read().arrow.count, 1);
});
