#!/usr/bin/env node
// Tilko API 직접 테스트 — node scripts/test-tilko.js
// Oracle Cloud 또는 로컬에서: TILKO_API_KEY=xxx node scripts/test-tilko.js

const crypto = require('crypto');

const API_KEY = process.env.TILKO_API_KEY || '5b6c046040324b959b6439e8b5e6eb8f';
const ADDR    = process.env.TEST_ADDR || '부산광역시 수영구 수영로 668';

async function main() {
  // 1) RSA 공개키 조회
  console.log('\n[1] GetPublicKey...');
  const pkRes = await fetch(`https://api.tilko.net/api/Auth/GetPublicKey?APIkey=${encodeURIComponent(API_KEY)}`);
  const pkJson = await pkRes.json();
  console.log('응답:', JSON.stringify(pkJson).slice(0, 300));

  const rsaPubPem = pkJson.PublicKey || pkJson.publicKey || '';
  if (!rsaPubPem) { console.error('공개키 없음'); process.exit(1); }
  console.log('공개키 앞 50자:', rsaPubPem.slice(0, 50));

  // 2) AES-128 세션키 + IV=올제로
  const rawAes = crypto.randomBytes(16);
  const iv = Buffer.alloc(16, 0);

  // 3) RSA-OAEP로 AES키 암호화
  const pemBody = rsaPubPem.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  const spki = Buffer.from(pemBody, 'base64');
  const rsaKey = crypto.createPublicKey({ key: spki, format:'der', type:'spki' });
  const encKey = crypto.publicEncrypt(
    { key: rsaKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha1' },
    rawAes
  ).toString('base64');
  console.log('\nENC-KEY(앞20자):', encKey.slice(0,20));

  // 4) AES 암호화 헬퍼
  const enc = (val) => {
    const cipher = crypto.createCipheriv('aes-128-cbc', rawAes, iv);
    return Buffer.concat([cipher.update(String(val), 'utf8'), cipher.final()]).toString('base64');
  };

  // 5) 주소 검색 — 평문 vs 암호화 모두 시도
  console.log('\n[2] RealtyAddrSrch — 평문 주소');
  const r1 = await fetch('https://api.tilko.net/api/v1.0/Iros/RealtyAddrSrch', {
    method: 'POST',
    headers: { 'API-KEY': API_KEY, 'ENC-KEY': encKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ SearchAddr: ADDR })
  });
  console.log('HTTP', r1.status);
  console.log(await r1.text());

  console.log('\n[3] RealtyAddrSrch — AES암호화 주소');
  const r2 = await fetch('https://api.tilko.net/api/v1.0/Iros/RealtyAddrSrch', {
    method: 'POST',
    headers: { 'API-KEY': API_KEY, 'ENC-KEY': encKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ SearchAddr: enc(ADDR) })
  });
  console.log('HTTP', r2.status);
  console.log(await r2.text());
}

main().catch(e => { console.error(e); process.exit(1); });
