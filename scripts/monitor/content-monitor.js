#!/usr/bin/env node
// YouTube 채널 새 영상 모니터링 → Claude Haiku 분류 → SMS 알림
// 사용법: node scripts/monitor/content-monitor.js
// Oracle Cloud cron: 매일 09:00 KST (00:00 UTC)

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

// 키워드 기반 폴백 분류 (API 실패 시)
function classifyByKeyword(title) {
  const t = title.toLowerCase();
  const aiWords = ['claude','gpt','gemini','llm','ai','chatgpt','copilot','midjourney','suno','runway','mcp','rag','프롬프트','생성ai','에이전트','클로드','챗gpt','fable','haiku','sonnet','opus'];
  const moneyWords = ['부업','수익','매출','창업','투자','돈버는','월급','재테크','파이어','사이드','side','monetize','수익화','월수익','정산','세금','절세'];
  const appWords = ['pos','kiosk','키오스크','배달','정산','근태','급여','재고','주문','예약','물류','기사','소장','매장','식당','카페'];
  const aiUpgradeWords = ['자동화','n8n','노코드','api','webhook','크롤링','스크래핑','파이썬','python','workflow','자동','봇','bot'];
  if (aiWords.some(w => t.includes(w))) return { category: 'AI기능업그레이드', reason: '키워드 기반: AI 관련' };
  if (moneyWords.some(w => t.includes(w))) return { category: '수익창출', reason: '키워드 기반: 수익/부업 관련' };
  if (aiUpgradeWords.some(w => t.includes(w))) return { category: 'AI기능업그레이드', reason: '키워드 기반: 자동화 관련' };
  if (appWords.some(w => t.includes(w))) return { category: '앱기능', reason: '키워드 기반: 앱/서비스 관련' };
  return null; // 패스
}

// Claude Haiku로 분류 (fetch 사용)
async function classify(videoTitle, channelName) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return classifyByKeyword(videoTitle) || { category: '패스', reason: 'API키 미설정' };
  }

  const prompt = `MBTICO 관점에서 이 YouTube 영상을 분류해줘.
MBTICO: 소상공인 SaaS (FILO 매장관리POS, DONWAY 정산, 용차앱), YouTube "AI 자동화 연구소" 채널 운영. 대표가 직접 시청해서 아이디어 얻는 용도.

채널: ${channelName}
제목: ${videoTitle}

분류 기준 (수익창출·AI기능업그레이드 최우선):
- 수익창출: 부업·창업·매출·수익화·사이드프로젝트·투자·사업 아이디어 — 돈이 될 가능성 있는 모든 것 (MONEY TOUCH 영상 대부분 해당)
- AI기능업그레이드: AI 신모델(Claude/GPT/Gemini 등)·AI도구·에이전트·MCP·자동화·n8n·프롬프트·이미지/영상 생성AI — FILO·DONWAY·용차앱에 AI기능 추가할 때 참고할 내용
- 앱기능: FILO(매장POS)/DONWAY(정산)/용차앱에 추가할 UI·기능·UX 아이디어 (매장운영·물류·정산 관련)
- 패스: 강아지·먹방·여행·스포츠·뷰티 등 위 세 카테고리와 완전히 무관한 것만

JSON만: {"category":"수익창출","reason":"한줄이유"}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text || '';
    const j = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
    return JSON.parse(j);
  } catch {
    // API 실패 시 키워드 폴백
    return classifyByKeyword(videoTitle) || { category: '패스', reason: 'API오류·키워드도 미매칭' };
  }
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
