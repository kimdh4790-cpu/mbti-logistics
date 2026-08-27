/**
 * 콘텐츠 캘린더 기반 프로모션 HTML 자동 생성
 * 실행: node scripts/generate-promo.js [product] [feature]
 * 예: node scripts/generate-promo.js yongcha ai-route-coach
 *     node scripts/generate-promo.js all  (전체 생성)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const calendarPath = path.join(ROOT, 'scripts/content/calendar.json');
const calendar = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));

const PRODUCT_COLORS = {
  filo:    { primary: '#7c3aed', accent: '#a78bfa', bg: '#0f0a1e', card: '#160d2e', border: '#2d1b5e' },
  donway:  { primary: '#0ea5e9', accent: '#38bdf8', bg: '#030f1e', card: '#061828', border: '#0c3060' },
  yongcha: { primary: '#c9a84c', accent: '#f0d070', bg: '#08101f', card: '#111c35', border: '#1e3060' },
  mbtico:  { primary: '#22c55e', accent: '#4ade80', bg: '#030f0a', card: '#071a0d', border: '#0d4020' },
};

const PRODUCT_EMOJI = { filo: '🍽️', donway: '📊', yongcha: '🚚', mbtico: '📦' };
const PRODUCT_NAME  = { filo: 'FILO', donway: 'DONWAY', yongcha: '용차앱', mbtico: '물류배송앱' };
const PRODUCT_DOMAIN = { filo: 'filo.ai.kr', donway: 'donway.ai.kr', yongcha: 'yongcha.app', mbtico: 'mbtico.kr' };

function generatePromoHtml(entry) {
  const c = PRODUCT_COLORS[entry.product] || PRODUCT_COLORS.yongcha;
  const emoji = PRODUCT_EMOJI[entry.product];
  const name = PRODUCT_NAME[entry.product];
  const domain = PRODUCT_DOMAIN[entry.product];

  const narrationLines = (entry.narration || []).map((line, i) => `
    <div class="narration-line anim-${i+2}" style="animation-delay:${0.2 + i*0.4}s">
      <span class="narration-num">${String(i+1).padStart(2,'0')}</span>
      <span class="narration-text">${line}</span>
    </div>`).join('');

  const hashtagsHtml = (entry.hashtags || []).map(tag =>
    `<span class="hashtag">${tag}</span>`).join('');

  const captionLines = (entry.instagram_caption || '').split('\n').map(line =>
    line.startsWith('✅') ? `<div class="check-item">${line}</div>` :
    line.trim() === '' ? `<div style="height:10px"></div>` :
    `<div class="caption-line">${line}</div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=390,initial-scale=1">
<title>${name} - ${entry.title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif}
  html,body{width:390px;height:844px;overflow:hidden;background:${c.bg}}

  .reel{position:absolute;top:0;left:0;width:390px;height:844px;display:flex;flex-direction:column;
    justify-content:center;align-items:center;opacity:0;transform:translateY(24px);
    transition:opacity 0.5s ease,transform 0.5s ease;pointer-events:none}
  .reel.active{opacity:1;transform:translateY(0);pointer-events:auto}
  .reel.exit{opacity:0;transform:translateY(-24px)}

  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .anim-1{animation:fadeUp 0.5s 0.1s both}
  .anim-2{animation:fadeUp 0.5s 0.3s both}
  .anim-3{animation:fadeUp 0.5s 0.5s both}
  .anim-4{animation:fadeUp 0.5s 0.7s both}
  .anim-5{animation:fadeUp 0.5s 0.9s both}

  .progress{position:fixed;bottom:0;left:0;height:3px;background:${c.accent};width:0;transition:width linear;z-index:100}
  .dots{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:200}
  .dot{width:6px;height:6px;border-radius:50%;background:#374060;transition:all 0.3s}
  .dot.active{background:${c.accent};width:20px;border-radius:3px}

  /* ── SLIDE 1: 히어로 ── */
  #s1{background:linear-gradient(160deg,${c.bg} 30%,${c.card} 100%);padding:32px 28px}
  .hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.07);
    border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:5px 14px;
    font-size:11px;color:#a0b0d0;letter-spacing:1px;font-weight:700;margin-bottom:20px}
  .hero-emoji{font-size:52px;margin-bottom:12px}
  .hero-product{font-size:34px;font-weight:900;color:${c.accent};margin-bottom:4px}
  .hero-title{font-size:18px;font-weight:700;color:#fff;line-height:1.4;text-align:center;margin-bottom:16px}
  .hero-hook{background:rgba(255,255,255,0.05);border-left:3px solid ${c.accent};
    border-radius:0 12px 12px 0;padding:12px 16px;font-size:14px;color:#c0d0f0;line-height:1.6;width:100%}
  .hero-domain{font-size:13px;color:#374060;margin-top:20px}

  /* ── SLIDE 2: 나레이션 ── */
  #s2{background:${c.bg};padding:32px 28px}
  .narration-line{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px;width:100%}
  .narration-num{font-size:11px;font-weight:800;color:${c.accent};background:rgba(255,255,255,0.05);
    border-radius:6px;padding:4px 8px;flex-shrink:0;font-variant-numeric:tabular-nums;letter-spacing:1px}
  .narration-text{font-size:15px;color:#e0e8ff;line-height:1.65;font-weight:500}

  /* ── SLIDE 3: 인스타그램 캡션 ── */
  #s3{background:linear-gradient(160deg,${c.bg},${c.card});padding:28px}
  .caption-box{background:${c.card};border:1px solid ${c.border};border-radius:20px;padding:20px;width:100%}
  .caption-line{font-size:15px;color:#e0e8ff;line-height:1.6;font-weight:600}
  .check-item{font-size:14px;color:#c0d0e0;line-height:1.7;padding-left:4px}
  .domain-line{font-size:13px;color:${c.accent};font-weight:700;margin-top:4px}
  .hashtag{display:inline-block;font-size:11px;color:${c.accent};margin:3px 3px 0 0;
    background:rgba(255,255,255,0.04);border:1px solid ${c.border};border-radius:10px;padding:3px 8px}

  /* ── SLIDE 4: CTA ── */
  #s4{background:${c.bg};padding:32px 28px}
  .cta-circle{width:100px;height:100px;border-radius:50%;
    background:linear-gradient(135deg,${c.primary},${c.accent});
    display:flex;align-items:center;justify-content:center;font-size:44px;
    box-shadow:0 0 48px ${c.primary}66;margin-bottom:24px}
  .cta-title{font-size:26px;font-weight:900;color:#fff;text-align:center;margin-bottom:8px}
  .cta-sub{font-size:14px;color:#7a8aaa;text-align:center;margin-bottom:28px}
  .cta-btn{background:linear-gradient(90deg,${c.primary},${c.accent});color:${c.bg === '#08101f' ? '#08101f' : '#fff'};
    font-size:18px;font-weight:900;border-radius:16px;padding:18px 48px;
    box-shadow:0 8px 24px ${c.primary}66;white-space:nowrap}
  .cta-domain{font-size:14px;color:#7a8aaa;margin-top:14px}
</style>
</head>
<body>
<div class="dots" id="dots"></div>
<div class="progress" id="progress"></div>

<!-- SLIDE 1: 히어로 -->
<div class="reel active" id="s1">
  <div style="display:flex;flex-direction:column;align-items:center;width:100%">
    <div class="hero-badge anim-1">📅 ${entry.date} · ${entry.feature.toUpperCase()}</div>
    <div class="hero-emoji anim-1">${emoji}</div>
    <div class="hero-product anim-2">${name}</div>
    <div class="hero-title anim-2">${entry.title.replace(' | ' + name, '')}</div>
    <div class="hero-hook anim-3">${entry.hook}</div>
    <div class="hero-domain anim-4">${domain}</div>
  </div>
</div>

<!-- SLIDE 2: 나레이션 -->
<div class="reel" id="s2">
  <div style="width:100%;padding:0 4px">
    <div style="font-size:11px;color:#374060;font-weight:700;letter-spacing:2px;margin-bottom:20px;text-align:center">NARRATION</div>
    ${narrationLines}
  </div>
</div>

<!-- SLIDE 3: 인스타그램 캡션 -->
<div class="reel" id="s3">
  <div style="width:100%">
    <div style="font-size:11px;color:#374060;font-weight:700;letter-spacing:2px;margin-bottom:14px;text-align:center">INSTAGRAM CAPTION</div>
    <div class="caption-box anim-2">
      ${captionLines}
    </div>
    <div style="margin-top:12px;display:flex;flex-wrap:wrap;anim-3" class="anim-3">
      ${hashtagsHtml}
    </div>
  </div>
</div>

<!-- SLIDE 4: CTA -->
<div class="reel" id="s4">
  <div style="display:flex;flex-direction:column;align-items:center">
    <div class="cta-circle anim-1">${emoji}</div>
    <div class="cta-title anim-2">${name}</div>
    <div class="cta-sub anim-2">${entry.hook}</div>
    <div class="cta-btn anim-3">지금 무료 시작 →</div>
    <div class="cta-domain anim-4">${domain}</div>
  </div>
</div>

<script>
const SLIDES = ['s1','s2','s3','s4'];
const DURATIONS = [5000, 7000, 6000, 5000];
let current = 0, timer = null;

const dotsEl = document.getElementById('dots');
const progressEl = document.getElementById('progress');

SLIDES.forEach((id, i) => {
  const d = document.createElement('div');
  d.className = 'dot' + (i===0?' active':'');
  dotsEl.appendChild(d);
});

function goTo(idx) {
  const prev = SLIDES[current];
  const next = SLIDES[idx];
  document.getElementById(prev).classList.remove('active');
  document.getElementById(prev).classList.add('exit');
  setTimeout(() => document.getElementById(prev).classList.remove('exit'), 600);
  current = idx;
  document.getElementById(next).classList.add('active');
  document.querySelectorAll('.dot').forEach((d,i) => d.className='dot'+(i===idx?' active':''));
  progressEl.style.transition = 'none';
  progressEl.style.width = '0%';
  requestAnimationFrame(() => {
    progressEl.style.transition = 'width ' + DURATIONS[idx] + 'ms linear';
    progressEl.style.width = '100%';
  });
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { goTo((current + 1) % SLIDES.length); schedule(); }, DURATIONS[current]);
}

progressEl.style.transition = 'width ' + DURATIONS[0] + 'ms linear';
progressEl.style.width = '100%';
schedule();
</script>
</body>
</html>`;
}

// 실행
const args = process.argv.slice(2);
const filterProduct = args[0] || 'all';
const filterFeature = args[1] || 'all';

const entries = calendar.entries.filter(e => {
  if (filterProduct !== 'all' && e.product !== filterProduct) return false;
  if (filterFeature !== 'all' && e.feature !== filterFeature) return false;
  return e.promoHtml && !e.done;
});

if (entries.length === 0) {
  console.log('[generate-promo] 생성 대상 없음. calendar.json 확인.');
  process.exit(0);
}

let count = 0;
for (const entry of entries) {
  const outPath = path.join(ROOT, entry.promoHtml);
  const outDir = path.dirname(outPath);
  fs.mkdirSync(outDir, { recursive: true });

  // yongcha-promo.html은 이미 수동 제작 → 덮어쓰지 않음
  if (fs.existsSync(outPath) && entry.feature === 'direct-matching') {
    console.log(`[skip] ${entry.promoHtml} (수동 제작 파일)`);
    continue;
  }

  const html = generatePromoHtml(entry);
  fs.writeFileSync(outPath, html);
  console.log(`[생성] ${entry.promoHtml}  (${entry.product} · ${entry.feature} · ${entry.date})`);
  count++;
}

console.log(`\n✅ ${count}개 프로모션 HTML 생성 완료`);
