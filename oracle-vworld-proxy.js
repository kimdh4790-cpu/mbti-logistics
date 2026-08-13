#!/usr/bin/env node
// vWorld WFS 프록시 서버 — Oracle Cloud (155.248.187.99:8787)
// 실행: VWORLD_KEY=발급키 PROXY_SECRET=임의비밀값 node oracle-vworld-proxy.js
const http = require('http');
const https = require('https');

const VWORLD_KEY = process.env.VWORLD_KEY || '';
const SECRET = process.env.PROXY_SECRET || '';
const PORT = parseInt(process.env.PORT || '8787', 10);

if (!VWORLD_KEY) { console.error('VWORLD_KEY 환경변수 필요'); process.exit(1); }

http.createServer((req, res) => {
  // 시크릿 검증
  if (SECRET && req.headers['x-secret'] !== SECRET) {
    res.writeHead(403); return res.end('forbidden');
  }
  const zip = (new URL(req.url, 'http://x').searchParams.get('zip') || '').trim();
  if (!/^\d{5}$/.test(zip)) { res.writeHead(400); return res.end('invalid zip'); }

  const wfsUrl = `https://api.vworld.kr/req/wfs?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeName=lt_c_basidco&key=${encodeURIComponent(VWORLD_KEY)}` +
    `&CQL_FILTER=bas_id%3D%27${zip}%27` +
    `&outputFormat=application%2Fjson&srsName=EPSG%3A4326&count=1`;

  https.get(wfsUrl, { headers: { 'User-Agent': 'yongcha-proxy/1.0' } }, (vr) => {
    let data = '';
    vr.on('data', c => data += c);
    vr.on('end', () => {
      res.writeHead(vr.statusCode, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  }).on('error', e => { res.writeHead(502); res.end(e.message); });

}).listen(PORT, '0.0.0.0', () => {
  console.log(`vWorld proxy listening on :${PORT}`);
});
