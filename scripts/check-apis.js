#!/usr/bin/env node
/**
 * API 키 등록 상태 확인 + 발급 가이드
 * 실행: node scripts/check-apis.js
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

// .env 파일 로드
const envPath = path.join(process.env.HOME || '/home/opc', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  });
}

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const BOLD = '\x1b[1m';

function ok(msg) { console.log(`  ${GREEN}✓${RESET} ${msg}`); }
function fail(msg) { console.log(`  ${RED}✗${RESET} ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW}!${RESET} ${msg}`); }
function info(msg) { console.log(`    ${BLUE}→${RESET} ${msg}`); }

function hasKey(name) {
  return !!(process.env[name] && process.env[name].length > 4);
}

async function testGoogleTTS() {
  if (!hasKey('GOOGLE_TTS_API_KEY')) return null;
  return new Promise(resolve => {
    const body = JSON.stringify({ input: { text: '테스트' }, voice: { languageCode: 'ko-KR', name: 'ko-KR-Wavenet-A' }, audioConfig: { audioEncoding: 'MP3' } });
    const req = https.request({
      hostname: 'texttospeech.googleapis.com',
      path: `/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = '';
      res.on('data', x => d += x);
      res.on('end', () => { try { resolve(!!JSON.parse(d).audioContent); } catch { resolve(false); } });
    });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

async function testNaverTTS() {
  if (!hasKey('NAVER_TTS_CLIENT_ID') || !hasKey('NAVER_TTS_CLIENT_SECRET')) return null;
  return new Promise(resolve => {
    const body = JSON.stringify({ speaker: 'nara', text: '테스트', volume: 0, speed: 0, pitch: 0 });
    const req = https.request({
      host: 'naveropenapi.apigw.ntruss.com',
      path: '/tts-premium/v1/tts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NCP-APIGW-API-KEY-ID': process.env.NAVER_TTS_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': process.env.NAVER_TTS_CLIENT_SECRET,
      }
    }, res => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

async function testYoutube() {
  if (!hasKey('YOUTUBE_CLIENT_ID') || !hasKey('YOUTUBE_CLIENT_SECRET') || !hasKey('YOUTUBE_REFRESH_TOKEN')) return null;
  return new Promise(resolve => {
    const body = `grant_type=refresh_token&refresh_token=${process.env.YOUTUBE_REFRESH_TOKEN}&client_id=${process.env.YOUTUBE_CLIENT_ID}&client_secret=${process.env.YOUTUBE_CLIENT_SECRET}`;
    const req = https.request({
      host: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data).access_token ? true : false); }
        catch { resolve(false); }
      });
    });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

async function testElevenLabs() {
  if (!hasKey('ELEVENLABS_API_KEY')) return null;
  return new Promise(resolve => {
    const req = https.request({
      host: 'api.elevenlabs.io',
      path: '/v1/user',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
    }, res => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
    req.end();
  });
}

(async () => {
  console.log(`\n${BOLD}══════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}   MBTICO API 등록 상태 체크${RESET}`);
  console.log(`${BOLD}══════════════════════════════════════════${RESET}\n`);

  // ── [1] 네이버 CLOVA TTS ──
  console.log(`${BOLD}[1] 네이버 CLOVA Voice TTS (한국어 나레이션)${RESET}`);
  if (!hasKey('NAVER_TTS_CLIENT_ID')) {
    fail('NAVER_TTS_CLIENT_ID 미설정');
    fail('NAVER_TTS_CLIENT_SECRET 미설정');
    info('발급: https://console.ncloud.com');
    info('경로: AI·NAVER API → CLOVA Voice → Application 등록');
    info('등록 후 ~/.env 에 추가:');
    info('  NAVER_TTS_CLIENT_ID=발급된_Client_ID');
    info('  NAVER_TTS_CLIENT_SECRET=발급된_Client_Secret');
  } else {
    ok(`NAVER_TTS_CLIENT_ID 설정됨 (${process.env.NAVER_TTS_CLIENT_ID.slice(0,8)}...)`);
    ok(`NAVER_TTS_CLIENT_SECRET 설정됨`);
    process.stdout.write('  API 연결 테스트 중...');
    const result = await testNaverTTS();
    if (result) { console.log(` ${GREEN}연결 성공!${RESET}`); }
    else { console.log(` ${RED}연결 실패 (키 확인 필요)${RESET}`); }
  }

  // ── [2] YouTube ──
  console.log(`\n${BOLD}[2] YouTube Data API v3 (영상 업로드)${RESET}`);
  const ytKeys = {
    YOUTUBE_CLIENT_ID: hasKey('YOUTUBE_CLIENT_ID'),
    YOUTUBE_CLIENT_SECRET: hasKey('YOUTUBE_CLIENT_SECRET'),
    YOUTUBE_REFRESH_TOKEN: hasKey('YOUTUBE_REFRESH_TOKEN'),
  };
  let ytAllSet = true;
  for (const [k, v] of Object.entries(ytKeys)) {
    if (v) ok(`${k} 설정됨`);
    else { fail(`${k} 미설정`); ytAllSet = false; }
  }
  if (!ytAllSet) {
    info('발급 순서:');
    info('1) https://console.cloud.google.com → 프로젝트 생성 또는 선택');
    info('2) API 및 서비스 → 라이브러리 → "YouTube Data API v3" 활성화');
    info('3) 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 생성');
    info('   (애플리케이션 유형: 데스크톱 앱)');
    info('4) 클라이언트 ID / 클라이언트 보안 비밀번호 복사');
    info('5) ~/.env에 YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET 저장');
    info('6) node scripts/upload/get-youtube-token.js 실행 → refresh_token 발급');
  } else {
    process.stdout.write('  토큰 유효성 확인 중...');
    const result = await testYoutube();
    if (result) { console.log(` ${GREEN}인증 성공!${RESET}`); }
    else { console.log(` ${RED}인증 실패 (refresh_token 재발급 필요)${RESET}`); }
  }

  // ── [3] ElevenLabs ──
  console.log(`\n${BOLD}[3] ElevenLabs TTS (나레이션 대안)${RESET}`);
  if (!hasKey('ELEVENLABS_API_KEY')) {
    warn('ELEVENLABS_API_KEY 미설정 (NAVER_TTS 있으면 불필요)');
    info('발급: https://elevenlabs.io → 회원가입 → Profile → API Key');
    info('무료 10,000자/월');
  } else {
    ok('ELEVENLABS_API_KEY 설정됨');
    process.stdout.write('  API 연결 테스트 중...');
    const result = await testElevenLabs();
    if (result) { console.log(` ${GREEN}연결 성공!${RESET}`); }
    else { console.log(` ${RED}연결 실패${RESET}`); }
  }

  // ── [4] FILO 계정 ──
  console.log(`\n${BOLD}[4] FILO 테스트 계정 (앱 화면 녹화)${RESET}`);
  if (hasKey('MBTICO_ADMIN_EMAIL') && hasKey('MBTICO_ADMIN_PW')) {
    ok(`계정: ${process.env.MBTICO_ADMIN_EMAIL}`);
    ok('비밀번호 설정됨');
  } else {
    fail('MBTICO_ADMIN_PW 미설정');
    info('로컬 PC에서 로그인 세션 저장:');
    info('$env:HEADLESS="false"; node scripts/capture/record-filo.js --login-only');
    info('세션 저장 후 → scp로 Oracle Cloud 복사');
  }

  // ── [5] Playwright 세션 파일 ──
  console.log(`\n${BOLD}[5] Playwright 로그인 세션 파일${RESET}`);
  const profilesDir = process.env.PROFILES_DIR || `${process.env.HOME}/.mbtico-profiles`;
  const sessions = ['filo-record', 'youtube-upload', 'instagram-upload', 'naver-blog'];
  for (const s of sessions) {
    const exists = fs.existsSync(`${profilesDir}/${s}`);
    if (exists) ok(`${s} 세션 있음`);
    else warn(`${s} 세션 없음 → 로컬에서 --login-only 실행 후 scp 복사 필요`);
  }

  // ── 최종 요약 ──
  console.log(`\n${BOLD}══════════════════════════════════════════${RESET}`);
  const naverOk = hasKey('NAVER_TTS_CLIENT_ID');
  const ytOk = ytAllSet;
  const ttsReady = naverOk || hasKey('ELEVENLABS_API_KEY');

  if (ttsReady && ytOk) {
    console.log(`${GREEN}${BOLD}  전체 파이프라인 실행 가능!${RESET}`);
    console.log(`  node scripts/run-pipeline.js --product yongcha --steps record,compose,youtube`);
  } else {
    console.log(`${YELLOW}${BOLD}  등록 필요 항목:${RESET}`);
    if (!naverOk) console.log(`  ${RED}✗${RESET} 네이버 CLOVA TTS 키 (또는 ElevenLabs)`);
    if (!ytOk) console.log(`  ${RED}✗${RESET} YouTube OAuth (get-youtube-token.js 실행)`);
  }
  console.log(`${BOLD}══════════════════════════════════════════${RESET}\n`);
})();
