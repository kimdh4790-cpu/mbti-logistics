/**
 * YouTube Data API v3 업로드 (Playwright 없음, 봇감지 없음)
 *
 * 1회 초기 설정 (로컬 PC):
 *   node scripts/upload/upload-youtube-api.js --setup
 *   → 브라우저 열림 → Google 로그인 → refresh_token 출력
 *   → Oracle VM ~/.env 에 저장:
 *       YOUTUBE_CLIENT_ID=...
 *       YOUTUBE_CLIENT_SECRET=...
 *       YOUTUBE_REFRESH_TOKEN=...
 *
 * 이후 Oracle VM에서 자동 업로드:
 *   node scripts/upload/upload-youtube-api.js --product yongcha
 *   node scripts/upload/upload-youtube-api.js --product donway
 *   node scripts/upload/upload-youtube-api.js --product filo
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
function getArg(name) {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const product = getArg('product') || 'filo';
const setupMode = args.includes('--setup');
const ROOT = path.join(__dirname, '../..');

// .env 로드 (Oracle VM: ~/.env)
function loadEnv() {
  const envPaths = [
    path.join(process.env.HOME || '', '.env'),
    path.join(ROOT, '.env.local'),
    path.join(ROOT, '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      fs.readFileSync(p, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
      });
      console.log(`[API] 환경변수 로드: ${p}`);
      return;
    }
  }
}

// Access token 갱신 (refresh_token 사용)
async function getAccessToken() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    console.error('[API] 오류: 환경변수 YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN 필요');
    console.error('       node scripts/upload/upload-youtube-api.js --setup 으로 초기 설정');
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: YOUTUBE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.access_token) {
          resolve(json.access_token);
        } else {
          console.error('[API] token 갱신 실패:', data);
          reject(new Error('token 갱신 실패'));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Resumable upload: 메타데이터 + 동영상 파일 업로드
async function uploadVideo(accessToken, meta, videoPath) {
  const videoStat = fs.statSync(videoPath);
  console.log(`[API] 영상 크기: ${(videoStat.size / 1024 / 1024).toFixed(1)}MB`);

  // 1단계: 업로드 세션 URI 받기
  const initBody = JSON.stringify({
    snippet: {
      title: meta.youtube.title,
      description: meta.youtube.description,
      tags: meta.youtube.tags || [],
      categoryId: meta.youtube.categoryId || '22', // People & Blogs
      defaultLanguage: 'ko',
    },
    status: {
      privacyStatus: 'public',
      selfDeclaredMadeForKids: false,
    },
  });

  const uploadUri = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: '/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': Buffer.byteLength(initBody),
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': videoStat.size,
      },
    }, res => {
      if (res.statusCode === 200) {
        resolve(res.headers.location);
      } else {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => reject(new Error(`업로드 세션 생성 실패 ${res.statusCode}: ${d}`)));
      }
    });
    req.on('error', reject);
    req.write(initBody);
    req.end();
  });

  console.log('[API] 업로드 세션 생성됨. 영상 전송 시작...');

  // 2단계: 실제 파일 업로드 (청크 업로드 — 최대 1 청크로 처리)
  const videoData = fs.readFileSync(videoPath);
  const uploadHost = new URL(uploadUri);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: uploadHost.hostname,
      path: uploadHost.pathname + uploadHost.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoStat.size,
      },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const json = JSON.parse(data);
          resolve(json);
        } else {
          console.error('[API] 업로드 응답:', res.statusCode, data.slice(0, 500));
          reject(new Error(`업로드 실패 ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);

    // 업로드 진행 상황 출력
    let sent = 0;
    const stream = require('fs').createReadStream(videoPath);
    stream.on('data', chunk => {
      sent += chunk.length;
      if (sent % (1024 * 1024) < 65536) {
        console.log(`[API] 전송 중: ${(sent / 1024 / 1024).toFixed(1)}MB / ${(videoStat.size / 1024 / 1024).toFixed(1)}MB`);
      }
    });
    stream.pipe(req);
  });
}

// --setup: 1회 OAuth 초기 설정 (로컬 PC에서 실행)
async function setup() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    console.log('\n=== YouTube API OAuth 초기 설정 ===\n');
    console.log('1. https://console.cloud.google.com 접속');
    console.log('2. 새 프로젝트 생성 → YouTube Data API v3 사용 설정');
    console.log('3. OAuth 2.0 클라이언트 ID 생성 (데스크톱 앱)');
    console.log('4. ~/.env 에 저장:');
    console.log('   YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com');
    console.log('   YOUTUBE_CLIENT_SECRET=your-client-secret');
    console.log('\n5. 다시 실행: node scripts/upload/upload-youtube-api.js --setup\n');
    return;
  }

  const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${YOUTUBE_CLIENT_ID}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&` +
    `response_type=code&scope=https://www.googleapis.com/auth/youtube.upload` +
    `+https://www.googleapis.com/auth/youtube&access_type=offline&prompt=consent`;

  console.log('\n=== 브라우저에서 아래 URL 열어서 Google 로그인 ===\n');
  console.log(authUrl);
  console.log('\n로그인 후 표시되는 코드를 입력하세요:');

  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise(r => rl.question('코드: ', r));
  rl.close();

  // authorization code → refresh_token 교환
  const tokenBody = new URLSearchParams({
    code,
    client_id: YOUTUBE_CLIENT_ID,
    client_secret: YOUTUBE_CLIENT_SECRET,
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    grant_type: 'authorization_code',
  }).toString();

  const tokenData = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': tokenBody.length },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(tokenBody);
    req.end();
  });

  if (!tokenData.refresh_token) {
    console.error('refresh_token 없음. prompt=consent 재확인 필요:', tokenData);
    return;
  }

  console.log('\n=== ~/.env 에 아래 내용 추가 ===\n');
  console.log(`YOUTUBE_REFRESH_TOKEN=${tokenData.refresh_token}`);
  console.log('\n설정 완료! Oracle VM ~/.env 에 복사 후 업로드 실행:\n');
  console.log(`  node scripts/upload/upload-youtube-api.js --product yongcha`);
}

async function main() {
  loadEnv();

  if (setupMode) {
    await setup();
    return;
  }

  // 영상 파일 확인
  const videoPath = path.join(ROOT, 'output', `${product}-promo.mp4`);
  if (!fs.existsSync(videoPath)) {
    console.error(`[API] 영상 파일 없음: ${videoPath}`);
    process.exit(1);
  }

  // 메타데이터 로드
  let meta = require(`../content/${product}-meta.json`);
  if (meta.variants && meta.variants.length > 0) {
    const weekIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % meta.variants.length;
    const variant = meta.variants[weekIdx];
    if (variant.youtube) meta = { ...meta, youtube: { ...meta.youtube, ...variant.youtube } };
  }

  console.log(`[API] 제품: ${product}`);
  console.log(`[API] 제목: ${meta.youtube.title}`);

  // Access token 갱신
  const accessToken = await getAccessToken();
  console.log('[API] Access token 갱신 완료');

  // 업로드
  const result = await uploadVideo(accessToken, meta, videoPath);

  const videoId = result.id;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`[API] 업로드 완료!`);
  console.log(`[API] 영상 URL: ${videoUrl}`);
  console.log(`[API] Studio: https://studio.youtube.com/video/${videoId}/edit`);

  // 결과 저장
  const resultPath = path.join(ROOT, 'output', `${product}-yt-upload-result.json`);
  fs.writeFileSync(resultPath, JSON.stringify({ videoId, videoUrl, title: meta.youtube.title, uploadedAt: new Date().toISOString() }, null, 2));
  console.log(`[API] 결과 저장: ${resultPath}`);
}

main().catch(e => {
  console.error('[API] 오류:', e.message);
  process.exit(1);
});
