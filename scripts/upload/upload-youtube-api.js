/**
 * YouTube Data API v3 업로드 (Playwright 대체)
 * 사용법: node scripts/upload/upload-youtube-api.js --product yongcha
 *
 * 필요한 환경변수 (.env 또는 export):
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// .env 파일 로드 (있으면)
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.replace(/^export /, '').split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
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
const ROOT = path.join(__dirname, '../..');

let meta = require(`../content/${product}-meta.json`);

// 주차 기반 variant 선택
if (meta.variants && meta.variants.length > 0) {
  const weekIdx = Math.floor(Date.now() / (7 * 24 * 3600 * 1000)) % meta.variants.length;
  const variant = meta.variants[weekIdx];
  if (variant.youtube) meta = { ...meta, youtube: { ...meta.youtube, ...variant.youtube } };
  console.log(`[YouTube API] 변형: ${variant.label}`);
}

const videoPath = path.join(ROOT, 'output', `${product}-promo.mp4`);
const thumbnailPath = path.join(ROOT, 'output', `${product}-thumbnail.jpg`);

async function uploadYouTube() {
  // 환경변수 확인
  const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
  const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('[YouTube API] 환경변수 누락:');
    if (!CLIENT_ID) console.error('  YOUTUBE_CLIENT_ID 없음');
    if (!CLIENT_SECRET) console.error('  YOUTUBE_CLIENT_SECRET 없음');
    if (!REFRESH_TOKEN) console.error('  YOUTUBE_REFRESH_TOKEN 없음');
    console.error('\n설정 방법:');
    console.error('  1) node scripts/upload/get-youtube-token.js 실행');
    console.error('  2) 출력된 값을 ~/mbti-logistics/.env 에 저장');
    process.exit(1);
  }

  if (!fs.existsSync(videoPath)) {
    console.error(`[YouTube API] 영상 없음: ${videoPath}`);
    console.error('먼저 node scripts/run-pipeline.js --product ' + product + ' --steps record,compose 실행');
    process.exit(1);
  }

  if (dryRun) {
    console.log('[YouTube API] [DRY-RUN] 업로드 건너뜀');
    console.log(`  제목: ${meta.youtube.title}`);
    console.log(`  영상: ${videoPath}`);
    return;
  }

  // OAuth2 설정
  const ACCESS_TOKEN = process.env.YOUTUBE_ACCESS_TOKEN;
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);

  if (ACCESS_TOKEN) {
    // access_token이 있으면 직접 사용 (refresh_token 교환 불필요)
    auth.setCredentials({ access_token: ACCESS_TOKEN });
    console.log(`[YouTube API] access_token 사용: ${ACCESS_TOKEN.substring(0, 20)}...`);
  } else {
    // refresh_token으로 자동 교환
    auth.setCredentials({ refresh_token: REFRESH_TOKEN });
    try {
      const { token } = await auth.getAccessToken();
      console.log(`[YouTube API] 액세스 토큰 발급: ${token ? token.substring(0, 20) + '...' : '없음'}`);
    } catch (e) {
      console.error('[YouTube API] 토큰 교환 실패:', e.message);
      console.error('  → YOUTUBE_REFRESH_TOKEN이 만료됨. OAuth Playground에서 새 토큰 발급 필요');
      process.exit(1);
    }
  }

  // refresh_token rotation 자동 저장 (2024-07 이후 클라이언트 정책)
  auth.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      try {
        const cur = fs.readFileSync(envPath, 'utf8');
        const next = cur.replace(/YOUTUBE_REFRESH_TOKEN="[^"]*"/, `YOUTUBE_REFRESH_TOKEN="${tokens.refresh_token}"`);
        fs.writeFileSync(envPath, next);
        process.env.YOUTUBE_REFRESH_TOKEN = tokens.refresh_token;
        console.log('[YouTube API] refresh_token 자동 갱신 저장됨');
      } catch (e) {
        console.log('[YouTube API] 새 refresh_token (수동 저장):', tokens.refresh_token);
      }
    }
  });
  const youtube = google.youtube({ version: 'v3', auth });

  console.log(`[YouTube API] 업로드 시작: ${product}`);
  console.log(`  제목: ${meta.youtube.title}`);
  console.log(`  영상: ${videoPath} (${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(1)}MB)`);

  // 영상 업로드
  const uploadRes = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: meta.youtube.title,
        description: meta.youtube.description,
        tags: meta.youtube.tags || [],
        categoryId: '22',
        defaultLanguage: 'ko',
        defaultAudioLanguage: 'ko',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
        madeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(videoPath),
    },
  }, {
    onUploadProgress: (evt) => {
      const pct = Math.round((evt.bytesRead / fs.statSync(videoPath).size) * 100);
      process.stdout.write(`\r[YouTube API] 업로드 중... ${pct}%`);
    },
  });

  console.log(`\n[YouTube API] 업로드 완료!`);
  const videoId = uploadRes.data.id;
  console.log(`  URL: https://www.youtube.com/watch?v=${videoId}`);
  console.log(`  Studio: https://studio.youtube.com/video/${videoId}/edit`);

  // 썸네일 업로드 (있으면)
  if (fs.existsSync(thumbnailPath)) {
    try {
      await youtube.thumbnails.set({
        videoId,
        media: {
          mimeType: 'image/jpeg',
          body: fs.createReadStream(thumbnailPath),
        },
      });
      console.log('[YouTube API] 썸네일 업로드 완료');
    } catch(e) {
      console.log('[YouTube API] 썸네일 업로드 실패 (채널 인증 필요할 수 있음):', e.message.split('\n')[0]);
    }
  }

  return videoId;
}

uploadYouTube().catch(err => {
  console.error('[YouTube API] 오류:', err.message);
  if (err.response) {
    console.error('  HTTP 상태:', err.response.status);
    console.error('  응답:', JSON.stringify(err.response.data, null, 2));
  }
  if (err.code) console.error('  에러 코드:', err.code);
  process.exit(1);
});
