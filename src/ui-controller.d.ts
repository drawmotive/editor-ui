import type { EditorInstance } from '@drawmotive/editor';
import type { EditorUiOptions, NormalizedUiOptions, EditorUiActionState } from './ui-options.js';
export interface EditorUiController {
  readonly editor: EditorInstance;
  readonly ui: NormalizedUiOptions;
  onChanged(listener: (ui: NormalizedUiOptions) => void): () => void;
  invokeAction(id: string): Promise<void>;
  setActionState(id: string, state: EditorUiActionState): Promise<void>;
  dispose(): void;
}
export declare function createEditorUiController(editor: EditorInstance, options?: EditorUiOptions | false): EditorUiController;
