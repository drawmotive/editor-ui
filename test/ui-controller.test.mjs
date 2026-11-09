import assert from 'node:assert/strict';
import test from 'node:test';
import { createEditorUiController } from '../src/ui-controller.js';
function editorHost() {
  const listeners = new Set(), events = new Map();
  return { lifecycle: 'ready', onDisposed(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onEvent(name,fn) { if(this.lifecycle!=='ready')throw new Error('EditorDisposed');if (!events.has(name)) events.set(name,new Set()); events.get(name).add(fn); return () => events.get(name).delete(fn); },
    beginDispose() { this.lifecycle = 'disposing'; for (const fn of events.get('disposing') ?? []) fn(); },
    exportSnapshot: async () => ({ raw: 'document' }),
    async dispose() { this.beginDispose(); this.lifecycle = 'disposed'; for (const fn of listeners) fn(); } };
}
test('retained closing editors create retired controllers without registering live events',async()=>{
  for(const lifecycle of ['disposing','disposed']) {
    const editor=editorHost();editor.lifecycle=lifecycle;
    const controller=createEditorUiController(editor);
    assert.equal(controller.ui.enabled,true);
    await assert.rejects(controller.invokeAction('host.save'),{code:'EditorDisposed'});
    controller.dispose();
  }
});
test('disposal start cancels actions while native cleanup remains pending', async () => {
  const editor = editorHost(); let signal;
  const controller = createEditorUiController(editor, { actions: [{ id: 'host.wait', label: 'Wait', onInvoke(context) {
    signal = context.signal; return new Promise((resolve,reject) => signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
  } }] });
  const pending=controller.invokeAction('host.wait');void pending.catch(()=>{});editor.beginDispose();
  try { assert.equal(signal.aborted,true);assert.equal(editor.lifecycle,'disposing'); }
  finally { controller.dispose();await assert.rejects(pending,{code:'EditorDisposed'}); }
});
test('private host actions can export and close the public canvas without adding chrome APIs', async () => {
  const editor = editorHost(); let signal;
  const controller = createEditorUiController(editor, { actions: [{ id: 'host.close', label: 'Close', async onInvoke(context) {
    signal = context.signal; assert.equal(context.editor, editor);
    assert.equal((await context.editor.exportSnapshot()).raw, 'document'); await editor.dispose();
  } }] });
  await controller.invokeAction('host.close'); assert.equal(signal.aborted, true);
  assert.equal(editor.ui, undefined); await assert.rejects(controller.invokeAction('host.close'), { code: 'EditorDisposed' });
});
test('action updates are immutable, notify UI and prevent unavailable invocations', async () => {
  const editor = editorHost(); let calls = 0; const seen = [];
  const controller = createEditorUiController(editor, { actions: [{ id: 'host.save', label: 'Save', onInvoke() { calls++; } }] });
  controller.onChanged(value => seen.push(value));
  await controller.setActionState('host.save', { label: 'Saving', enabled: false });
  assert.equal(seen[0].actions[0].label, 'Save'); assert.equal(seen[1].actions[0].label, 'Saving');
  assert.ok(Object.isFrozen(seen[1].actions[0]));
  await assert.rejects(controller.invokeAction('host.save'), { code: 'ActionUnavailable' }); assert.equal(calls, 0);
  await assert.rejects(controller.setActionState('host.save', { enabled: 'false' }), TypeError);
  await assert.rejects(controller.invokeAction('host.missing'), { code: 'UnknownAction' }); controller.dispose();
});
test('unmount cancels pending host work and retires UI listeners', async () => {
  const editor = editorHost(); let signal;
  const controller = createEditorUiController(editor, { actions: [{ id: 'host.wait', label: 'Wait', onInvoke(context) {
    signal = context.signal; return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  } }] });
  const pending = controller.invokeAction('host.wait'); controller.dispose();
  await assert.rejects(pending, { code: 'EditorDisposed' }); assert.equal(signal.aborted, true);
  assert.equal(editor.lifecycle, 'ready');
});
