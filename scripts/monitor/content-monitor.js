#!/usr/bin/env node
// YouTube 채널 새 영상 모니터링 → Claude Haiku 분류 → SMS 알림
// 사용법: node scripts/monitor/content-monitor.js
// Oracle Cloud cron: 매일 09:00 KST (00:00 UTC)

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const STATE_PATH = path.join(ROOT, 'output', 'monitor-state.json');
const DIGEST_PATH = path.join(ROOT, 'output', 'monitor-digest.json');
const CHANNELS_PATH = path.join(__dirname, 'channels.json');
const LOG_DIR = process.env.LOG_DIR || '/home/opc/mbtico-logs';

// 상태 로드 (마지막으로 본 영상 ID + 캐시된 channelId)
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); }
  catch { return { seen: {}, channelIds: {} }; }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// YouTube @handle → channelId 변환 (1회만, 이후 캐시)
async function resolveChannelId(handle) {
  const h = handle.startsWith('@') ? handle : `@${handle}`;
  const url = `https://www.youtube.com/${h}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    const html = await res.text();
    const patterns = [
      /"channelId":"(UC[^"]{22})"/,
      /"externalId":"(UC[^"]{22})"/,
      /"browseId":"(UC[^"]{22})"/,
      /\/channel\/(UC[^"/?]{22})/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m) return m[1];
    }
  } catch (e) {
    console.log(`  resolveChannelId 오류: ${e.message}`);
  }
  return null;
}

// YouTube RSS 파싱 (Atom 포맷)
function parseRSS(xml) {
  const items = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const e = m[1];
    const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = e.match(/<title>([^<]+)<\/title>/)?.[1]
      ?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const published = e.match(/<published>([^<]+)<\/published>/)?.[1];
    if (id && title) items.push({ id, title, published, url: `https://youtu.be/${id}` });
  }
  return items;
}

// Claude Haiku로 분류 (https 직접 호출 — Node.js fetch ByteString 오류 우회)
async function classify(videoTitle, channelName) {
  const prompt = `MBTICO 관점에서 이 YouTube 영상을 분류해줘.
MBTICO: 소상공인 SaaS (FILO 매장관리POS, DONWAY 정산, 용차앱), YouTube "AI 자동화 연구소" 채널 운영 중. 대표가 직접 시청해서 아이디어 얻는 용도.

채널: ${channelName}
제목: ${videoTitle}

분류 기준 (폭넓게 판단, 조금이라도 해당하면 패스 금지):
- 강의소재: AI·자동화·노코드·개발·SaaS·마케팅·수익화·창업 등 "AI 자동화 연구소" 강의 주제로 쓸 수 있는 것
- 앱기능: FILO(매장POS)/DONWAY(정산)/용차앱에 추가하면 좋을 기능·UX·워크플로우 아이디어
- 수익성: 새로운 사업 아이템, 수익 모델, 트렌드 아이디어, 부업·투자·비즈니스 기회 — 분야 무관하게 돈이 될 가능성 있는 것
- 패스: 개인 일상·먹방·여행·순수 오락 등 위 세 가지와 전혀 무관한 것만

JSON만: {"category":"강의소재","reason":"한줄이유"}`;

  const body = Buffer.from(JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }]
  }), 'utf8');

  if (!process.env.ANTHROPIC_API_KEY) {
    return { category: '패스', reason: 'API키 미설정' };
  }

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const raw = data.content[0].text;
          const j = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
          resolve(JSON.parse(j));
        } catch {
          resolve({ category: '패스', reason: '분류 실패' });
        }
      });
    });
    req.on('error', () => resolve({ category: '패스', reason: '네트워크 오류' }));
    req.write(body);
    req.end();
  });
}

// Aligo SMS 발송 (환경변수 설정 시)
async function sendSMS(message) {
  const { ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER, ADMIN_PHONE } = process.env;
  if (!ALIGO_API_KEY || !ADMIN_PHONE) return;
  const body = new URLSearchParams({
    key: ALIGO_API_KEY, user_id: ALIGO_USER_ID,
    sender: ALIGO_SENDER, receiver: ADMIN_PHONE,
    msg: message, msg_type: 'SMS',
  });
  await fetch('https://apis.aligo.in/send/', { method: 'POST', body });
}

async function main() {
  console.log(`[${new Date().toISOString()}] 콘텐츠 모니터링 시작`);
  const channels = JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf8'));
  const state = loadState();
  const digest = [];

  for (const ch of channels) {
    try {
      // channelId 확보
      let channelId = ch.channelId || state.channelIds[ch.instagram];
      if (!channelId && ch.handle) {
        console.log(`  채널ID 조회: ${ch.name}`);
        channelId = await resolveChannelId(ch.handle);
        if (channelId) {
          state.channelIds[ch.instagram] = channelId;
          console.log(`    → ${channelId}`);
        }
      }
      if (!channelId) { console.log(`  ⚠️ ${ch.name}: channelId 없음 스킵`); continue; }

      // RSS 페치
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const res = await fetch(rssUrl);
      if (!res.ok) { console.log(`  ⚠️ ${ch.name}: RSS ${res.status}`); continue; }
      const xml = await res.text();
      const videos = parseRSS(xml);

      // 새 영상만 필터
      const seenIds = state.seen[ch.instagram] || [];
      const newVideos = videos.filter(v => !seenIds.includes(v.id));
      if (!newVideos.length) { console.log(`  ✓ ${ch.name}: 새 영상 없음`); continue; }

      console.log(`  📺 ${ch.name}: 새 영상 ${newVideos.length}개`);

      for (const video of newVideos.slice(0, 3)) {
        const result = await classify(video.title, ch.name);
        console.log(`    [${result.category}] ${video.title}`);

        if (result.category !== '패스') {
          digest.push({
            category: result.category,
            channel: ch.name,
            instagram: ch.instagram,
            title: video.title,
            url: video.url,
            reason: result.reason,
            published: video.published,
          });
        }
      }

      // 상태 업데이트 (최근 20개만 유지)
      state.seen[ch.instagram] = [...new Set([...videos.map(v => v.id), ...seenIds])].slice(0, 20);

    } catch (err) {
      console.error(`  ❌ ${ch.name}: ${err.message}`);
    }
  }

  saveState(state);

  // 다이제스트 저장
  const today = new Date().toISOString().slice(0, 10);
  const digestEntry = { date: today, items: digest };
  fs.mkdirSync(path.dirname(DIGEST_PATH), { recursive: true });

  let allDigest = [];
  try { allDigest = JSON.parse(fs.readFileSync(DIGEST_PATH, 'utf8')); } catch {}
  allDigest.unshift(digestEntry);
  allDigest = allDigest.slice(0, 30);
  fs.writeFileSync(DIGEST_PATH, JSON.stringify(allDigest, null, 2));

  // 결과 출력
  const byCategory = {};
  for (const item of digest) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  if (!digest.length) {
    console.log('\n✅ 오늘 새 콘텐츠 없음');
    return;
  }

  console.log(`\n📋 오늘 발견: ${digest.length}건`);

  // SMS 발송 (간결하게)
  const smsLines = digest.slice(0, 5).map(
    d => `[${d.category}] ${d.channel}: ${d.title.slice(0, 20)}... ${d.url}`
  );
  const smsMsg = `[MBTICO 콘텐츠알림] ${today}\n${smsLines.join('\n')}`;
  await sendSMS(smsMsg);

  // 로그 파일
  if (fs.existsSync(LOG_DIR)) {
    fs.appendFileSync(
      path.join(LOG_DIR, 'content-monitor.log'),
      `\n${JSON.stringify(digestEntry)}\n`
    );
  }

  console.log('저장:', DIGEST_PATH);
  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(`\n[${cat}] ${items.length}건`);
    items.forEach(i => console.log(`  • ${i.channel}: ${i.title}\n    ${i.url}`));
  }
}

main().catch(console.error);
