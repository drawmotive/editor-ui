import { createElement } from 'react';
import type { EditorInstance } from '@drawmotive/editor';
import {
  Editor, EditorUi, mountEditorUi, createEditorUiController, phosphorTheme,
  type EditorProps, type EditorUiProps, type EditorUiOptions, type EditorUiAction,
  type EditorRegionId, type EditorButtonId, type EditorUiController,
} from '@drawmotive/editor-ui';
import { createEditorUiController as controllerEntry, type EditorUiController as ControllerEntry } from '@drawmotive/editor-ui/controller';

declare const editor: EditorInstance;
declare const container: HTMLElement;
const region: EditorRegionId = 'topRight';
const button: EditorButtonId = 'rectangle';
const action: EditorUiAction = { id: 'host.save', label: 'Save', onInvoke: async ({ editor, signal }) => {
  if (!signal.aborted) await editor.exportSnapshot({ formats: ['png'] });
} };
const options: EditorUiOptions = { buttons: { [button]: true }, actions: [action], regions: { [region]: { items: ['host.save'] } } };
const controller: EditorUiController = createEditorUiController(editor, options);
const alternate: ControllerEntry = controllerEntry(editor);
const props: EditorUiProps = { editor, container, options, controller };
const reactProps: EditorProps = { ui: options, onReady: editor => { void editor.getState(); } };
createElement(Editor, reactProps);
createElement(EditorUi, props);
mountEditorUi(props).dispose();
void controller.invokeAction('host.save');
void controller.setActionState('host.save', { enabled: false });
alternate.dispose();
void phosphorTheme;
// @ts-expect-error Host actions require their own namespace.
const invalidAction: EditorUiAction = { id: 'save', label: 'Save', onInvoke() {} };
void invalidAction;
