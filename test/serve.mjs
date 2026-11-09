import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(import.meta.dirname, '..');
const sdk = path.resolve(path.dirname(fileURLToPath(import.meta.resolve('@drawmotive/editor'))), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
createServer(async (request, response) => {
  try {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1);
    const base = relative.startsWith('sdk/') ? sdk : root;
    let file = path.resolve(base, relative.startsWith('sdk/') ? relative.slice(4) : relative);
    if (!file.startsWith(base + path.sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    response.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream'); response.end(await readFile(file));
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(4187, '127.0.0.1', () => {
  console.log('Quick insert preview: http://127.0.0.1:4187/test/browser/quick-insert-preview.html');
});
