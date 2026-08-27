/**
 * YouTube Data API v3 업로드 스크립트
 * 사용법: node upload-youtube-api.js --product filo [--reels] [--dry-run]
 *
 * 환경변수 (Oracle Cloud ~/.env 에 저장):
 *   YOUTUBE_CLIENT_ID=...
 *   YOUTUBE_CLIENT_SECRET=...
 *   YOUTUBE_REFRESH_TOKEN=...
 *
 * 최초 1회 토큰 발급:
 *   node upload-youtube-api.js --get-token
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Oracle Cloud ~/.env 로드
const envPath = path.join(process.env.HOME || '/home/opc', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
  });
}

const args = process.argv.slice(2);
function getArg(name) {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const product = getArg('product') || 'filo';
const dryRun = args.includes('--dry-run');
const getToken = args.includes('--get-token');
const reelsMode = args.includes('--reels');

const ROOT = path.join(__dirname, '../..');
let meta = require(`../content/${product}-meta.json`);

// 주차 기반 variant 선택
if (meta.variants && meta.variants.length > 0) {
  const weekIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % meta.variants.length;
  const variant = meta.variants[weekIdx];
  if (variant.youtube) meta = { ...meta, youtube: { ...meta.youtube, ...variant.youtube } };
  console.log(`[YouTube] 콘텐츠 변형: ${variant.label} (${weekIdx + 1}/${meta.variants.length}주차 순환)`);
}

// 숏츠 모드: 제목에 #Shorts 추가
if (reelsMode) {
  meta = {
    ...meta,
    youtube: {
      ...meta.youtube,
      title: meta.youtube.title.includes('#Shorts') ? meta.youtube.title : `${meta.youtube.title} #Shorts`,
      tags: [...(meta.youtube.tags || []), 'Shorts', '유튜브쇼츠'],
    },
  };
}

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

// --get-token: 브라우저에서 인증 후 토큰 발급
async function getRefreshToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
  });
  console.log('\n[YouTube] 아래 URL을 브라우저에서 열어 Google 계정 인증 후 코드를 붙여넣으세요:');
  console.log(authUrl);
  console.log('');

  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise(resolve => rl.question('인증 코드: ', resolve));
  rl.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log('\n[YouTube] REFRESH_TOKEN (아래를 ~/.env 에 저장):');
  console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
}

async function uploadVideo() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('[YouTube] 오류: ~/.env 에 YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN 필요');
    console.error('  1. Google Cloud Console → OAuth 2.0 클라이언트 ID 생성');
    console.error('  2. node upload-youtube-api.js --get-token 실행 → 토큰 발급');
    console.error('  3. ~/.env 에 환경변수 저장');
    process.exit(1);
  }

  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const videoFile = reelsMode ? `${product}-reels.mp4` : `${product}-promo.mp4`;
  const videoPath = path.join(ROOT, 'output', videoFile);
  if (!fs.existsSync(videoPath)) {
    console.error(`[YouTube] 파일 없음: ${videoPath}`);
    process.exit(1);
  }

  const ytMeta = meta.youtube;
  console.log(`[YouTube] 제품: ${product} ${reelsMode ? '(숏츠)' : ''}`);
  console.log(`[YouTube] 업로드 시작: ${ytMeta.title}`);

  if (dryRun) {
    console.log('[YouTube][DRY-RUN] 업로드 건너뜀.');
    console.log(`  제목: ${ytMeta.title}`);
    console.log(`  태그: ${(ytMeta.tags || []).join(', ')}`);
    return;
  }

  const fileSize = fs.statSync(videoPath).size;
  console.log(`[YouTube] 파일 크기: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: ytMeta.title,
        description: ytMeta.description,
        tags: ytMeta.tags || [],
        categoryId: ytMeta.category || '22',
        defaultLanguage: 'ko',
        defaultAudioLanguage: 'ko',
      },
      status: {
        privacyStatus: ytMeta.privacy || 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  }, {
    onUploadProgress: evt => {
      const pct = Math.round((evt.bytesRead / fileSize) * 100);
      process.stdout.write(`\r[YouTube] 업로드 중... ${pct}%`);
    },
  });

  const videoId = res.data.id;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`\n[YouTube] 업로드 완료! 영상 ID: ${videoId}`);
  console.log(`  URL: ${videoUrl}`);
  console.log(`  상태: ${res.data.status.uploadStatus}`);

  // 결과 저장
  const suffix = reelsMode ? '-reels' : '';
  const resultPath = path.join(ROOT, 'output', `${product}${suffix}-yt-upload-result.json`);
  fs.writeFileSync(resultPath, JSON.stringify({
    videoId,
    videoUrl,
    title: ytMeta.title,
    reels: reelsMode,
    uploadedAt: new Date().toISOString(),
  }, null, 2));
  console.log(`  결과 저장: ${resultPath}`);
}

if (getToken) {
  getRefreshToken().catch(console.error);
} else {
  uploadVideo().catch(console.error);
}
