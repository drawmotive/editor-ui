import { build } from 'esbuild';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url), execute = promisify(execFile);
const compiler = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin/tsc');
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await mkdir(path.join(root, 'dist'));
for (const project of ['tsconfig.json', 'tsconfig.build.json']) {
  await execute(process.execPath, [compiler, '-p', project], { cwd: root });
}
// The browser build extracts source CSS into the separately exported index.css.
// API declarations must not retain its unpublished source stylesheet import.
const indexTypes = path.join(root, 'dist/index.d.ts');
await writeFile(indexTypes, (await readFile(indexTypes, 'utf8')).replace(/^import ['"]\.\/styles[.]css['"];\r?\n/m, ''));
await writeFile(path.join(root, 'dist/index.css.d.ts'), 'export {};\n');
// TypeScript does not copy handwritten declarations for JavaScript modules.
// Keep their full local import closure beside the generated component types.
for (const name of await readdir(path.join(root, 'src'))) {
  if (name.endsWith('.d.ts') && name !== 'css.d.ts') await copyFile(path.join(root, 'src', name), path.join(root, 'dist', name));
}
// Public entries share dependencies with their host. The self-contained bundles
// exercise browser fixtures only and are excluded by the npm files allowlist.
for (const [name, entry, external] of [
  ['index', 'src/index.tsx', ['@drawmotive/editor', '@mantine/*', '@phosphor-icons/react', 'react', 'react-dom/*', 'react/jsx-runtime']],
  ['ui-controller', 'src/ui-controller.js', ['@drawmotive/editor']],
  ['standalone', 'src/standalone.ts', []],
  ['quick-insert-preview', 'test/browser/quick-insert-preview.tsx', []],
  ['typography-harness', 'test/browser/typography-harness.tsx', []],
]) await build({ absWorkingDir: root, entryPoints: [entry], outfile: path.join(root, 'dist', name + '.js'),
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', minify: true, external, legalComments: 'eof' });
// Every distribution embedding Material SVG paths carries the upstream notices.
for (const name of ['MaterialSymbols-LICENSE.txt', 'MaterialSymbols-NOTICE.txt']) {
  await copyFile(path.join(root, 'src', name), path.join(root, 'dist', name));
}
