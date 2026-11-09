import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const execute = promisify(execFile);
const npm = (args, cwd) => execute(process.execPath, [process.env.npm_execpath, ...args], { cwd, maxBuffer: 8 * 1024 * 1024 });

// Catch missing declaration dependencies, unresolvable controller imports and
// fixture leakage away from workspace module links.
test('a packed public package supports a standalone typed browser host', { timeout: 240_000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'editor-ui-consumer-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const target = JSON.parse(await readFile(path.join(root, '.release/target.json'), 'utf8'));
  if (!target.publishable) {
    // Fixture archives exercise consumption; ordinary packing must still enforce
    // the factual release block until a compatible native SDK is published.
    await assert.rejects(npm(['pack', '--json', '--pack-destination', directory], root), error => {
      assert.ok((error.stdout + error.stderr).includes(target.excludedReason));
      return true;
    });
  }
  const packed = JSON.parse((await npm(['pack', '--ignore-scripts', '--json', '--pack-destination', directory], root)).stdout);
  const { filename, files } = (Array.isArray(packed) ? packed : Object.values(packed))[0];
  const names = files.map(file => file.path);
  for (const required of ['dist/index.js', 'dist/index.css', 'dist/index.css.d.ts', 'dist/index.d.ts', 'dist/ui-controller.js', 'dist/ui-controller.d.ts', 'dist/MaterialSymbols-LICENSE.txt', 'dist/MaterialSymbols-NOTICE.txt', 'LICENSE']) {
    assert.ok(names.includes(required), 'Missing public artifact: ' + required);
  }
  assert.ok(names.every(name => ['LICENSE', 'README.md', 'package.json'].includes(name)
    || /^dist[/](index[.]js|index[.]css|ui-controller[.]js|.+[.]d[.]ts|MaterialSymbols-(LICENSE|NOTICE)[.]txt)$/.test(name)), 'Only the public library and its notices belong in the archive');
  assert.deepEqual(names.filter(name => ['src/', 'test/', 'scripts/', 'node_modules/'].some(prefix => name.startsWith(prefix)) || /standalone|quick-insert-preview/.test(name)), [], 'Fixture and source files must stay outside the published package');
  const consumer = path.join(directory, 'consumer');
  await mkdir(consumer);
  await writeFile(path.join(consumer, 'package.json'), JSON.stringify({
    name: 'editor-ui-external-consumer', private: true, type: 'module',
    devDependencies: { '@types/react': '19.3.0', '@types/react-dom': '19.3.0', esbuild: '0.28.2', typescript: '^7.0.2' },
  }));
  await npm(['install', '--ignore-scripts', '--workspaces=false', path.join(directory, filename)], consumer);
  const installed = path.join(consumer, 'node_modules/@drawmotive/editor-ui');
  const pkg = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
  assert.notEqual(pkg.private, true);
  assert.equal(pkg.version, target.version);
  assert.equal(pkg.dependencies['@drawmotive/editor'], target.dependencies['@drawmotive/editor']);
  assert.ok(pkg.sideEffects.includes('**/*.css'), 'Bundlers must preserve the exported stylesheet');
  for (const notice of ['MaterialSymbols-LICENSE.txt', 'MaterialSymbols-NOTICE.txt']) {
    assert.deepEqual(await readFile(path.join(installed, 'dist', notice)), await readFile(path.join(root, 'src', notice)));
  }
  await writeFile(path.join(consumer, 'consumer.tsx'), await readFile(path.join(root, 'test/fixtures/public-consumer.tsx')));
  // Mantine imports these three stylesheets from its own declarations. Keep
  // those ambient names narrow so our package cannot hide missing CSS imports.
  await writeFile(path.join(consumer, 'environment.d.ts'), [
    "declare module '*/baseline.css';", "declare module '*/default-css-variables.css';", "declare module '*/global.css';",
  ].join('\n'));
  await writeFile(path.join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    target: 'ES2022', module: 'Preserve', moduleResolution: 'Bundler', jsx: 'react-jsx',
    strict: true, noEmit: true, skipLibCheck: false, noUncheckedSideEffectImports: true, lib: ['ESNext', 'DOM'],
  }, include: ['consumer.tsx', 'environment.d.ts'] }));
  await execute(process.execPath, [path.join(consumer, 'node_modules/typescript/bin/tsc'), '-p', consumer], { cwd: consumer });
  const { build } = await import(pathToFileURL(path.join(consumer, 'node_modules/esbuild/lib/main.js')));
  await writeFile(path.join(consumer, 'browser.js'), await readFile(path.join(root, 'test/fixtures/public-browser.js')));
  await build({ absWorkingDir: consumer, entryPoints: ['browser.js'], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', outdir: path.join(consumer, 'bundle') });
  const runtime = await readFile(path.join(root, 'test/browser/stub-runtime.js'));
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/') {
        response.setHeader('Content-Type', 'text/html');
        response.end('<!doctype html><link rel="icon" href="data:,"><link rel="stylesheet" href="/browser.css"><div id="editor" style="position:relative;width:900px;height:600px"></div><script type="module" src="/browser.js"></script>');
      } else if (url.pathname === '/runtime/js/editor-canvas.js') {
        response.setHeader('Content-Type', 'text/javascript'); response.end(runtime);
      } else if (['/browser.js', '/browser.css'].includes(url.pathname)) {
        response.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript');
        response.end(await readFile(path.join(consumer, 'bundle', url.pathname.slice(1))));
      } else response.writeHead(404).end();
    } catch { response.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ executablePath: process.env.DRAWMOTIVE_CHROMIUM_PATH });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:' + server.address().port);
  const rectangle = page.getByRole('button', { name: 'Rectangle', exact: true });
  await rectangle.waitFor({ state: 'visible' });
  assert.equal(await rectangle.evaluate(element => getComputedStyle(element).pointerEvents), 'auto');
  await rectangle.click();
  assert.equal(await page.evaluate(async () => (await consumer.editor.getState()).tool), 'rectangle');
  await page.evaluate(() => consumer.dispose());
  assert.equal(await page.locator('.dm-editor-ui').count(), 0);
  assert.equal(await page.locator('canvas').count(), 0);
  assert.deepEqual(errors, []);
});
