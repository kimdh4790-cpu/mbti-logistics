/**
 * Instagram Graph API Reels 업로드 — Resumable Upload 방식
 * (공개 URL 불필요, 파일을 Meta 서버에 직접 전송)
 *
 * 사용법: node upload-instagram-api.js --product filo [--dry-run]
 *
 * 필요 환경변수:
 *   INSTAGRAM_ACCESS_TOKEN=...  (Meta Business 장기 액세스 토큰)
 *   INSTAGRAM_ACCOUNT_ID=...   (Instagram 비즈니스 계정 ID)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '../..');

// env 로드
(function loadEnv() {
  const envPaths = [
    path.join(process.env.HOME || '', '.env'),
    path.join(ROOT, '.env.local'),
    path.join(ROOT, '.env'),
  ];
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
    });
    return;
  }
})();

const args = process.argv.slice(2);
function getArg(name) {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const product = getArg('product') || 'filo';
const dryRun = args.includes('--dry-run');

let meta = require(`../content/${product}-meta.json`);

// 주차 기반 variant 선택
if (meta.variants && meta.variants.length > 0) {
  const weekIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % meta.variants.length;
  const variant = meta.variants[weekIdx];
  if (variant.instagram) {
    meta = { ...meta, instagram: { ...meta.instagram, ...variant.instagram } };
  }
  console.log(`[Instagram] 콘텐츠 변형: ${variant.label} (${weekIdx + 1}/${meta.variants.length}주차 순환)`);
}

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;

// Instagram Graph API 요청 (graph.facebook.com)
function apiRequest(method, endpoint, body = null) {
  const bodyStr = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'graph.facebook.com',
        path: `/v20.0${endpoint}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', d => (data += d));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(`API 오류 [${json.error.code}]: ${json.error.message}`));
            } else {
              resolve(json);
            }
          } catch (e) {
            reject(new Error(`응답 파싱 실패: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Resumable Upload 세션 초기화 → container_id + upload_uri 반환
async function initResumableUpload(caption) {
  console.log('[Instagram] Resumable Upload 세션 초기화...');
  const res = await apiRequest('POST', `/${ACCOUNT_ID}/media?access_token=${ACCESS_TOKEN}`, {
    media_type: 'REELS',
    upload_type: 'resumable',
    caption,
    share_to_feed: true,
  });
  console.log(`  컨테이너 ID: ${res.id}`);
  console.log(`  업로드 URI: ${res.uri}`);
  return res; // { id, uri }
}

// 파일을 Meta 서버에 직접 스트리밍 업로드
async function uploadVideoToMeta(uploadUri, videoPath) {
  const fileSize = fs.statSync(videoPath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1);
  console.log(`[Instagram] 파일 직접 전송 중: ${path.basename(videoPath)} (${fileSizeMB} MB)`);

  const url = new URL(uploadUri);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        Authorization: `OAuth ${ACCESS_TOKEN}`,
        offset: '0',
        file_size: String(fileSize),
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => (data += d));
      res.on('end', () => {
        console.log(`  전송 응답 [${res.statusCode}]: ${data.slice(0, 200)}`);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve({}); }
        } else {
          reject(new Error(`파일 전송 실패 [${res.statusCode}]: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);

    // 스트림으로 파일 전송 (메모리 절약)
    const fileStream = fs.createReadStream(videoPath);
    fileStream.on('error', reject);
    fileStream.pipe(req);
  });
}

// 컨테이너 처리 완료까지 polling (최대 5분)
async function waitForContainer(containerId) {
  const start = Date.now();
  const maxWait = 300000;
  while (Date.now() - start < maxWait) {
    const res = await apiRequest(
      'GET',
      `/${containerId}?fields=status_code,status&access_token=${ACCESS_TOKEN}`
    );
    console.log(`  상태: ${res.status_code}${res.status ? ' (' + res.status + ')' : ''}`);
    if (res.status_code === 'FINISHED') return;
    if (res.status_code === 'ERROR') {
      throw new Error(`컨테이너 오류: ${res.status || 'UNKNOWN'}`);
    }
    await new Promise(r => setTimeout(r, 12000));
  }
  throw new Error('컨테이너 업로드 타임아웃 (5분)');
}

async function main() {
  if (!ACCESS_TOKEN || !ACCOUNT_ID) {
    console.error('[Instagram] 오류: 환경변수 미설정');
    console.error('  INSTAGRAM_ACCESS_TOKEN — Meta Business 장기 액세스 토큰');
    console.error('  INSTAGRAM_ACCOUNT_ID   — Instagram 비즈니스 계정 ID');
    process.exit(1);
  }

  const videoPath = path.join(ROOT, 'output', `${product}-reels.mp4`);
  if (!fs.existsSync(videoPath)) {
    console.error(`[Instagram] 파일 없음: ${videoPath}`);
    console.error('  compose 단계 먼저 실행하세요.');
    process.exit(1);
  }

  const igMeta = meta.instagram;
  const reelsMeta = meta.reels || {};
  const baseCaption = reelsMeta.caption || igMeta.caption || '';
  const caption = baseCaption.includes('#Shorts') ? baseCaption : `${baseCaption}\n\n#Shorts #숏츠`;

  console.log(`[Instagram] 제품: ${product} (Reels)`);
  console.log(`[Instagram] 캡션: ${caption.slice(0, 80)}...`);

  if (dryRun) {
    console.log('[Instagram][DRY-RUN] 업로드 건너뜀.');
    console.log(`  캡션: ${caption}`);
    return;
  }

  // 1. Resumable Upload 세션 초기화
  const { id: containerId, uri: uploadUri } = await initResumableUpload(caption);

  // 2. 파일을 Meta 서버에 직접 전송
  await uploadVideoToMeta(uploadUri, videoPath);

  // 3. 처리 완료 대기
  console.log('[Instagram] 업로드 처리 중 (최대 5분)...');
  await waitForContainer(containerId);

  // 4. 게시
  console.log('[Instagram] 게시 중...');
  const result = await apiRequest('POST', `/${ACCOUNT_ID}/media_publish?access_token=${ACCESS_TOKEN}`, {
    creation_id: containerId,
  });

  const mediaId = result.id;
  console.log(`[Instagram] 게시 완료! 미디어 ID: ${mediaId}`);

  const resultPath = path.join(ROOT, 'output', `${product}-reels-ig-result.json`);
  fs.writeFileSync(resultPath, JSON.stringify({
    mediaId,
    product,
    caption: caption.slice(0, 150),
    uploadedAt: new Date().toISOString(),
  }, null, 2));
  console.log(`  결과 저장: ${resultPath}`);
}

main().catch(err => {
  console.error('[Instagram] 오류:', err.message);
  process.exit(1);
});
