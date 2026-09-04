#!/usr/bin/env node
/**
 * Instagram 액세스 토큰 발급 (1회 설정용)
 *
 * 사전 설정:
 *   Meta 대시보드 → MBTICO Social → 앱 설정 → 기본 설정
 *   → "플랫폼 추가" → 웹사이트 → https://localhost 입력 → 저장
 *
 * 실행:
 *   INSTAGRAM_APP_SECRET=xxx node scripts/setup/get-instagram-token.js
 */

const readline = require('readline');

const APP_ID = '2923328344667962';
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const REDIRECT_URI = 'https://localhost';
const SCOPE = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
].join(',');

if (!APP_SECRET) {
  console.log('\n사용법:');
  console.log('  INSTAGRAM_APP_SECRET=<시크릿> node scripts/setup/get-instagram-token.js\n');
  console.log('App Secret 확인 방법:');
  console.log('  developers.facebook.com → MBTICO Social → 앱 설정 → 기본 설정');
  console.log('  → "앱 시크릿 코드" 옆 [표시] 클릭\n');
  process.exit(1);
}

const authUrl =
  `https://api.instagram.com/oauth/authorize` +
  `?client_id=${APP_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&response_type=code`;

console.log('\n===== Instagram 토큰 발급 =====\n');
console.log('【1단계】 아래 URL을 브라우저에 붙여넣기:\n');
console.log(authUrl);
console.log('\n【2단계】 Instagram 로그인 → 앱 권한 허용');
console.log('【3단계】 https://localhost 로 리다이렉트 (연결 오류 정상)');
console.log('【4단계】 주소창 URL에서 code= 뒤 값 복사 (#_ 제외)\n');
console.log('예시: https://localhost?code=AQBx..........여기까지복사#_\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('code 값 입력: ', async (raw) => {
  rl.close();
  const code = raw.replace(/#_$/, '').trim();

  if (!code) {
    console.error('code가 입력되지 않았습니다.');
    process.exit(1);
  }

  try {
    // 단기 토큰 발급
    console.log('\n토큰 교환 중...');
    const form = new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code,
    });

    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: form,
    });
    const short = await shortRes.json();

    if (!short.access_token) {
      console.error('단기 토큰 발급 실패:', JSON.stringify(short, null, 2));
      process.exit(1);
    }

    // 장기 토큰 교환 (60일)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token` +
      `?grant_type=ig_exchange_token` +
      `&client_secret=${APP_SECRET}` +
      `&access_token=${short.access_token}`
    );
    const long = await longRes.json();

    if (!long.access_token) {
      console.error('장기 토큰 발급 실패:', JSON.stringify(long, null, 2));
      process.exit(1);
    }

    // 계정 ID 조회
    const meRes = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${long.access_token}`
    );
    const me = await meRes.json();

    const days = Math.round((long.expires_in || 5183944) / 86400);

    const maskedToken = (long.access_token || '').slice(0, 6) + '***';
    console.log('\n===== 완료! GitHub Secrets에 저장하세요 =====\n');
    console.log(`INSTAGRAM_ACCESS_TOKEN=${maskedToken}  ← 실제 값은 GitHub Secret에 직접 저장`);
    console.log(`INSTAGRAM_ACCOUNT_ID=${me.id || short.user_id}`);
    console.log(`\n계정: @${me.username || '(조회 실패)'}`);
    console.log(`토큰 만료: ${days}일 후 (만료 전 재실행 필요)\n`);

  } catch (err) {
    console.error('오류:', err.message);
    process.exit(1);
  }
});
