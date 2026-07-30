/**
 * Local dev server for Playwright tests.
 * Serves yongcha.html with CDN URLs rewritten to local npm copies.
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CDN_MAP = {
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js':
    path.join(ROOT, 'node_modules/firebase/firebase-app-compat.js'),
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js':
    path.join(ROOT, 'node_modules/firebase/firebase-auth-compat.js'),
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js':
    path.join(ROOT, 'node_modules/firebase/firebase-firestore-compat.js'),
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js':
    path.join(ROOT, 'node_modules/firebase/firebase-messaging-compat.js'),
  // Kakao postcode - serve empty stub
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js': null,
};

// Build rewritten HTML once
let HTML_CACHE = null;
function getHTML() {
  if (HTML_CACHE) return HTML_CACHE;
  let html = fs.readFileSync(path.join(ROOT, 'yongcha.html'), 'utf8');
  for (const [cdnUrl] of Object.entries(CDN_MAP)) {
    const localPath = '/cdn/' + encodeURIComponent(cdnUrl);
    html = html.replace(cdnUrl, localPath);
  }
  HTML_CACHE = html;
  return html;
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/' || url === '') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHTML());
    return;
  }

  if (url.startsWith('/cdn/')) {
    const cdnUrl = decodeURIComponent(url.slice(5));
    const localFile = CDN_MAP[cdnUrl];
    if (localFile === null) {
      // Empty stub (Kakao postcode)
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end('// stub');
      return;
    }
    if (localFile && fs.existsSync(localFile)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(fs.readFileSync(localFile));
      return;
    }
    res.writeHead(404);
    res.end('Not found: ' + cdnUrl);
    return;
  }

  if (url === '/api/kakao-config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ key: 'test' }));
    return;
  }

  if (url === '/api/ctrl-notify' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log('Local yongcha server running on http://localhost:' + PORT);
});
