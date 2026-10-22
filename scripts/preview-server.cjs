'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const portAt = process.argv.indexOf('--port');
const port = portAt < 0 ? 8381 : Number(process.argv[portAt + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.onnx': 'application/octet-stream',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.gz': 'application/gzip' };
const prefix = '/T4Slvers_CAC/';
http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
  let name;
  try { name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  if (name === '/T4Slvers_CAC') { response.writeHead(302, { Location: prefix }).end(); return; }
  name = name.startsWith(prefix) ? name.slice(prefix.length) : name.slice(1);
  if (!name) name = 'index.html';
  if (name.includes('\0') || name.split('/').some(part => part.startsWith('.')) ||
      !(name === 'index.html' || /^(css|js|data|vendor|tests)\//.test(name)) || /\.cjs$/.test(name) ||
      // The embedding runtime's loader is the only .mjs file served.
      (/\.mjs$/.test(name) && !/^vendor\/minilm\/lib\/[\w.-]+\.mjs$/.test(name))) {
    response.writeHead(404).end(); return;
  }
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep)) { response.writeHead(404).end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'text/plain; charset=utf-8',
      'Content-Length': stat.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(file).pipe(response);
  });
}).listen(port, '127.0.0.1', () => console.log('OCR preview: http://127.0.0.1:' + port + prefix));
