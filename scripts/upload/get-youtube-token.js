/**
 * YouTube OAuth2 refresh token 발급 (최초 1회만 실행)
 * 사용법: node scripts/upload/get-youtube-token.js
 *
 * 필요한 환경변수:
 *   YOUTUBE_CLIENT_ID     — Google Cloud Console OAuth 클라이언트 ID
 *   YOUTUBE_CLIENT_SECRET — Google Cloud Console OAuth 클라이언트 시크릿
 */
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const readline = require('readline');

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('환경변수 YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET 설정 필요');
  console.error('예: YOUTUBE_CLIENT_ID=xxx YOUTUBE_CLIENT_SECRET=yyy node get-youtube-token.js');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3456/callback';
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = auth.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });

console.log('\n브라우저에서 아래 URL 열기:');
console.log(authUrl);
console.log('\n로그인 후 자동으로 토큰이 발급됩니다...');

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== '/callback') return;
  const code = parsed.query.code;
  if (!code) { res.end('code 없음'); return; }

  res.end('<h2>완료! 터미널에서 refresh_token을 확인하세요.</h2>');
  server.close();

  try {
    const { tokens } = await auth.getToken(code);
    const maskedSecret = CLIENT_SECRET.slice(0, 4) + '***';
    const maskedToken = (tokens.refresh_token || '').slice(0, 6) + '***';
    console.log('\n=== 아래 값을 Oracle Cloud 서버 환경변수에 등록하세요 ===');
    console.log(`YOUTUBE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`YOUTUBE_CLIENT_SECRET=${maskedSecret}`);
    console.log(`YOUTUBE_REFRESH_TOKEN=${maskedToken}`);
    console.log('\n~/.bashrc 또는 ~/mbti-logistics/.env 에 추가:');
    console.log(`export YOUTUBE_CLIENT_ID="${CLIENT_ID}"`);
    console.log('export YOUTUBE_CLIENT_SECRET="(GitHub Secret에서 확인)"');
    console.log('export YOUTUBE_REFRESH_TOKEN="(GitHub Secret에서 확인)"');
  } catch(e) {
    console.error('토큰 발급 실패:', e.message);
  }
}).listen(3456);
