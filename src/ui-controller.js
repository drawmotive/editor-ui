import { EditorError } from '@drawmotive/editor';
import { normalizeUiOptions } from './ui-options-runtime.js';

/** Private presentation state. No web chrome is attached to the public editor. */
export function createEditorUiController(editor, options) {
  const { ui: initial, handlers } = normalizeUiOptions(options);
  let ui = initial, disposed = false;
  const listeners = new Set(), actions = new Set();
  const retired = () => new EditorError('EditorDisposed', 'Editor UI has been disposed');
  const ready = () => { if (disposed || editor.lifecycle !== 'ready') throw retired(); };
  let stopDisposed, stopDisposing;
  const dispose = () => {
    if (disposed) return; disposed = true; stopDisposed?.(); stopDisposing?.();
    for (const action of actions) action.abort(retired());
    actions.clear(); handlers.clear(); listeners.clear();
  };
  if (editor.lifecycle === 'ready') {
    stopDisposing = editor.onEvent('disposing',dispose);
    stopDisposed = editor.onDisposed(dispose);
  } else dispose();
  return Object.freeze({
    get ui() { return ui; }, editor, dispose,
    onChanged(listener) {
      ready(); if (typeof listener !== 'function') throw new TypeError('Listener must be a function');
      listeners.add(listener); try { listener(ui); } catch (error) { listeners.delete(listener); throw error; }
      return () => listeners.delete(listener);
    },
    async invokeAction(id) {
      ready(); const handler = handlers.get(id), descriptor = ui.actions.find(action => action.id === id);
      if (!handler) throw new EditorError('UnknownAction', 'Unknown host action: ' + id);
      if (!descriptor.enabled || !descriptor.visible) throw new EditorError('ActionUnavailable', 'Host action is unavailable: ' + id);
      const action = new AbortController(); actions.add(action);
      try { await handler({ editor, signal: action.signal }); }
      catch (error) {
        if (error instanceof EditorError) throw error;
        throw new EditorError(typeof error?.code === 'string' ? error.code : 'HostActionFailed', error?.message ?? String(error), { cause: error });
      } finally { actions.delete(action); }
    },
    async setActionState(id, value) {
      ready(); if (!handlers.has(id)) throw new TypeError('Unknown host action: ' + id);
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['label','enabled','visible'].includes(key))) throw new TypeError('Invalid action state');
      const update = {};
      if (value.label !== undefined) {
        if (typeof value.label !== 'string' || !value.label.trim()) throw new TypeError('Action label must be a nonempty string');
        update.label = value.label;
      }
      for (const key of ['enabled','visible']) if (value[key] !== undefined) {
        if (typeof value[key] !== 'boolean') throw new TypeError('Action ' + key + ' must be a boolean');
        update[key] = value[key];
      }
      ui = Object.freeze({ ...ui, actions: Object.freeze(ui.actions.map(action => action.id === id ? Object.freeze({ ...action, ...update }) : action)) });
      for (const listener of listeners) { try { listener(ui); } catch (error) { console.error('Editor UI listener failed', error); } }
    },
  });
}
