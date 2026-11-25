// Local development server: serves the game and runs the /api routes.
// Uses an in-process Postgres (PGlite) unless DATABASE_URL is set.
//   npm install
//   npm run dev        ->  http://localhost:3000
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8' };
const ROUTES = { '/api/auth': './api/auth.js', '/api/save': './api/save.js' };
const handlers = {};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (ROUTES[url.pathname]) {
      if (!handlers[url.pathname]) handlers[url.pathname] = (await import(pathToFileURL(path.join(ROOT, ROUTES[url.pathname])).href)).default;
      return await handlers[url.pathname](req, res);
    }
    if (url.pathname.startsWith('/api/')) { res.statusCode = 404; return res.end('Not found'); }
    let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT) || /[\\/](node_modules|api|\.git)([\\/]|$)/.test(file.slice(ROOT.length))) { res.statusCode = 403; return res.end('Forbidden'); }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
    const data = await readFile(file);
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch (e) {
    if (!res.headersSent) { res.statusCode = e.code === 'ENOENT' ? 404 : 500; res.end(e.code === 'ENOENT' ? 'Not found' : 'Server error'); }
    if (e.code !== 'ENOENT') console.error(e);
  }
});

server.listen(PORT, () => console.log('Last Camp running at http://localhost:' + PORT + (process.env.DATABASE_URL ? ' (Neon database)' : ' (local in-memory database)')));
