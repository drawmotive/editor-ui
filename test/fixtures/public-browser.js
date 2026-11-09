import { createEditor } from '@drawmotive/editor';
import { mountEditorUi } from '@drawmotive/editor-ui';
import { createEditorUiController } from '@drawmotive/editor-ui/controller';
import '@mantine/core/styles.css';
import '@drawmotive/editor-ui/styles.css';

const container = document.getElementById('editor');
const editor = await createEditor({ container, assetBaseUrl: new URL('/runtime/', location.href) });
const controller = createEditorUiController(editor);
const ui = mountEditorUi({ editor, controller, container });
globalThis.consumer = { editor, dispose: async () => { ui.dispose(); controller.dispose(); await editor.dispose(); } };
