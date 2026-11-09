import { createRoot } from 'react-dom/client';
import { EditorUi, type EditorUiProps } from './editor-ui.js';

/** Private imperative composition for browser fixtures and host integrations. */
export function mountEditorUi({ editor, container, ...props }: EditorUiProps): { dispose(): void } {
  const win = container.ownerDocument.defaultView!, previous = container.style.position;
  const changed = win.getComputedStyle(container).position === 'static';
  if (changed) container.style.position = 'relative';
  const element = container.ownerDocument.createElement('div');
  element.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; container.append(element);
  const root = createRoot(element); let disposed = false, stop: undefined | (() => void);
  const dispose = () => {
    if (disposed) return; disposed = true; stop?.(); root.unmount(); element.remove();
    if (changed && container.style.position === 'relative') container.style.position = previous;
  };
  root.render(<EditorUi editor={editor} container={container} {...props} />);
  stop = editor.onDisposed(dispose); return { dispose };
}
