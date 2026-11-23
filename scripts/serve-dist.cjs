// Local static server for built Angular dist/ output (used by Playwright browser tests).
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_ROOT = path.resolve(__dirname, '..', 'dist', 'kid-Learning-games', 'browser');
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

function start(port = PORT) {
  const server = http.createServer((req, res) => {
    let urlPath = '/';
    try {
      urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }
    if (urlPath === '/') urlPath = '/index.html';

    const rel = urlPath.replace(/^\/+/, '');
    const candidate = path.resolve(DIST_ROOT, rel);
    if (!candidate.startsWith(DIST_ROOT + path.sep) && candidate !== DIST_ROOT && candidate !== path.join(DIST_ROOT, 'index.html')) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const serveFile = target => {
      fs.readFile(target, (err, body) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        res.end(body);
      });
    };

    fs.stat(candidate, (err, st) => {
      if (!err && st.isFile()) {
        serveFile(candidate);
      } else if (!err && st.isDirectory()) {
        serveFile(path.join(candidate, 'index.html'));
      } else if (!path.extname(candidate)) {
        serveFile(path.join(DIST_ROOT, 'index.html'));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
  });

  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

module.exports = { DIST_ROOT, PORT, start };

if (require.main === module) {
  start().then(() => console.log(`Serving ${DIST_ROOT} at http://localhost:${PORT}`));
}
