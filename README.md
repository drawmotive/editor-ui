# @drawmotive/editor-ui

Reusable drawing toolbars, selection properties, settings, help, tooltips and
keyboard controls for the [DrawMotive canvas SDK](https://github.com/drawmotive/drawmotive).
Use the React components or mount the same controls in an ordinary DOM host.

The initial source and external-package checks use the real public
`@drawmotive/editor@0.3.2` types and base canvas API. Its published native runtime
does not provide this source's capsule, star and cloud tools or native licensing. Full toolbar support
requires an upcoming coordinated Editor release, so initial npm publication is
blocked by the factual release target. Editor 0.3.1 and earlier use a different
embedding API and are not supported. React and React DOM 19.3.1 are peers; Mantine
9.7.4 and Phosphor 2.1.10 are package dependencies. The canvas SDK remains
independent of React, Mantine and this package.

After the first compatible coordinated npm release, install the UI and SDK:

```bash
npm install @drawmotive/editor-ui @drawmotive/editor react@19.3.1 react-dom@19.3.1
```

## React hosting

Import the Mantine base styles and the editor stylesheet once. `Editor` creates
and disposes its own public canvas instance. The host provides a sized container
and serves the SDK runtime assets. Prepare those assets with the SDK's
`drawmotive-copy-assets` command; see the SDK documentation for deployment paths.

```tsx
import '@mantine/core/styles.css';
import '@drawmotive/editor-ui/styles.css';
import { Editor } from '@drawmotive/editor-ui';

export function Drawing() {
  return <Editor assetBaseUrl="/editor/" style={{ height: 600 }} />;
}
```

For an editor owned by the host, use `EditorUi` and pass its public editor
instance and canvas container. `EditorUi` supplies its own Mantine provider.
Unmounting these controls leaves the host's editor alive.

```tsx
import { EditorUi } from '@drawmotive/editor-ui';
import type { EditorInstance } from '@drawmotive/editor';

export function DrawingControls({ editor, container }: {
  editor: EditorInstance;
  container: HTMLElement;
}) {
  return <EditorUi editor={editor} container={container} />;
}
```

## DOM hosting

`mountEditorUi()` uses the same controls without requiring a React application.
Bundle this ESM entry and its external dependencies with your browser tooling.
The UI stylesheet is a separate exported asset and is marked as a bundler side
effect. The host continues to own SDK runtime assets and Worker transport.

```javascript
import '@mantine/core/styles.css';
import '@drawmotive/editor-ui/styles.css';
import { createEditor } from '@drawmotive/editor';
import { mountEditorUi } from '@drawmotive/editor-ui';

const container = document.getElementById('editor');
const editor = await createEditor({ container, assetBaseUrl: '/editor/' });
const controls = mountEditorUi({ editor, container });

async function closeDrawing() {
  controls.dispose();
  await editor.dispose();
}
```

The container must have a usable size. Imperative mounting supplies relative
positioning when needed and restores it on disposal. Native canvas input, grips
and inline text remain owned by the SDK. The controls use the SDK canvas host's
DOM and typography notifications, so keep the supported SDK version installed.

## Host options and ownership

`EditorUi` and `mountEditorUi()` accept `options`, `slots`, `colorScheme`,
`className`, `style` and `onError`. The React `Editor` wrapper accepts the same UI
configuration as `ui`, plus ordinary public editor creation options.
With the matching SDK/native runtime, this includes the optional `licenseKey`
deployment prop. Changing it disposes the previous native session before creating
its successor. Bottom controls retain their original corner positions; native
branding sits at the canvas bottom center and may overlap controls on narrow
hosts. No branding text or license validation is implemented by this React package.
See [Editor licensing](https://textgraph.dev/editor/licensing) for the optional
official removal service and the SDK's immutable `getLicenseStatus()` snapshot.

Options control button visibility, corner regions, drawing/context toolbars,
tooltips and host actions. Slots contain host React elements. Host actions use
IDs such as `host.save` and receive the public editor and a cancellation signal.
Authentication, application navigation, collaboration transport and document
storage belong to the embedding host.

For changing action labels or availability, create a controller with
`createEditorUiController(editor, options)`, pass it as `controller`, and use
`setActionState()` or `invokeAction()`. The controller is exported from the main
entry and the framework-independent `@drawmotive/editor-ui/controller` entry.
An explicit controller belongs to its host and must be disposed by that host.
Without one, the controls own and dispose their controller. Closing the public
editor cancels action signals immediately; cancellation cannot undo an external
write.

Press `/` on an idle editable canvas for Quick insert. Text fields retain literal
slash input. Recent and frequently used tools use browser-local history, with an
in-memory fallback when storage is unavailable. Settings groups local View
preferences and saved Drawing properties in one panel. Drawing properties edit
document metadata through native transactions; View controls local appearance
and grid preferences. The legacy `drawingProperties` toolbar ID opens this same
Settings panel; default controls use only `settings`. Hiding controls does not
change native editing permissions or the SDK's `textEditing` policy.

## Development and verification

Use Node.js 22 or later and npm. The committed lockfile resolves dependencies
from the public registry, without a parent workspace.

```bash
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run test:package
npm pack --ignore-scripts
```

`test:package` packs the built library, installs it in a temporary external
consumer, compiles its public types, and bundles and mounts the real UI around
the public SDK with an isolated native-runtime fixture. Browser tests exercise
existing controls and lifecycle behavior without building .NET. The package check
also verifies that ordinary `npm pack` fails with the staged release reason.
The explicit archive command above skips release scripts only to inspect the
fixture; it does not establish native toolbar compatibility or release readiness.

`npm run preview` serves the component preview at
[http://127.0.0.1:4187/test/browser/quick-insert-preview.html](http://127.0.0.1:4187/test/browser/quick-insert-preview.html)
after building. Its attributed cloud examples and standalone bundles are test
fixtures, excluded from the npm archive.

The integration repository projects coordinated release metadata and shared
checks into `.release/`. Ordinary `npm pack` validates that authority before
building and intentionally rejects the initial staged target. The plan records
the intended coordinated identity; the factual target remains blocked until the
compatible Editor package is published and preparation advances its exact lock.
Publication accepts only a reviewed retained archive through the
protected workflow; it does not rebuild or publish from a dependency install.

## License

MIT; see [LICENSE](LICENSE). Embedded Material Symbols paths retain their
[Apache 2.0 license](src/MaterialSymbols-LICENSE.txt) and
[notice](src/MaterialSymbols-NOTICE.txt). Both files accompany the npm library.
Redistributors embedding those paths must preserve the notices.
