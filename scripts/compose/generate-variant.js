#!/usr/bin/env node
// 사용: node scripts/compose/generate-variant.js --product yongcha [--variant A]
// variant 미지정 시 현재 주차 기반 자동 선택 (week % 4 → A/B/C/D)

const fs = require('fs');
const path = require('path');

const PRODUCT_COLORS = {
  filo:    { primary: '#7c3aed', accent: '#a78bfa', bg: '#0f0a1e', card: '#160d2e' },
  donway:  { primary: '#0ea5e9', accent: '#38bdf8', bg: '#030f1e', card: '#061828' },
  yongcha: { primary: '#c9a84c', accent: '#f0d070', bg: '#08101f', card: '#111c35' },
  mbtico:  { primary: '#22c55e', accent: '#4ade80', bg: '#030f0a', card: '#071a0d' },
};

const PRODUCT_NAME = { filo: 'FILO', donway: 'DONWAY', yongcha: '용차앱', mbtico: 'MBTICO' };
const PRODUCT_DOMAIN = { filo: 'filo.ai.kr', donway: 'donway.ai.kr', yongcha: 'yongcha.app', mbtico: 'mbtico.kr' };

const args = process.argv.slice(2);
const productIdx = args.indexOf('--product');
const variantIdx = args.indexOf('--variant');

const PRODUCT = productIdx >= 0 ? args[productIdx + 1] : 'yongcha';
const ROOT = path.join(__dirname, '../..');

// 주차 기반 variant 선택
function getWeekVariant() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return ['A', 'B', 'C', 'D'][week % 4];
}

const VARIANT = variantIdx >= 0 ? args[variantIdx + 1].toUpperCase() : getWeekVariant();

console.log(`[generate-variant] ${PRODUCT} / Variant ${VARIANT}`);

// variants JSON 로드
const variantsPath = path.join(ROOT, `scripts/content/variants/${PRODUCT}-variants.json`);
if (!fs.existsSync(variantsPath)) {
  console.error(`[오류] variants 파일 없음: ${variantsPath}`);
  process.exit(1);
}

const variants = JSON.parse(fs.readFileSync(variantsPath, 'utf8'));
const v = variants[VARIANT];
if (!v) {
  console.error(`[오류] Variant ${VARIANT} 없음`);
  process.exit(1);
}

// 1. narration.json 생성
const narrationPath = path.join(ROOT, `scripts/content/${PRODUCT}-narration.json`);
const narration = { product: PRODUCT, voice: v.voice || 'ko-KR-Neural2-A', speedRate: v.speedRate || 1.0, lines: v.lines };
fs.writeFileSync(narrationPath, JSON.stringify(narration, null, 2), 'utf8');
console.log(`[narration] ${narrationPath} 생성`);

// 2. subtitles.srt 생성
function secToSrt(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const ms = Math.round((sec % 1) * 1000).toString().padStart(3, '0');
  return `${h}:${m}:${s},${ms}`;
}

let srt = '';
v.lines.forEach((line, i) => {
  const start = line.startSec;
  const end = v.lines[i + 1] ? v.lines[i + 1].startSec - 0.5 : start + 6;
  srt += `${i + 1}\n${secToSrt(start)} --> ${secToSrt(end)}\n${line.text}\n\n`;
});

const srtPath = path.join(ROOT, `scripts/content/${PRODUCT}-subtitles.srt`);
fs.writeFileSync(srtPath, srt, 'utf8');
console.log(`[SRT] ${srtPath} 생성`);

// 3. meta.json 생성 (YouTube 제목/설명)
const metaPath = path.join(ROOT, `scripts/content/${PRODUCT}-meta.json`);
let meta = {};
try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
meta.youtube_title = v.youtube_title;
meta.youtube_description = v.youtube_description;
meta.hashtags = v.hashtags;
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
console.log(`[meta] ${metaPath} 갱신`);

// 4. promo HTML 생성
const c = PRODUCT_COLORS[PRODUCT];
const name = PRODUCT_NAME[PRODUCT];
const domain = PRODUCT_DOMAIN[PRODUCT];

function renderSlide(slide, idx) {
  const id = `s${idx + 1}`;
  const isFirst = idx === 0;
  const activeClass = isFirst ? ' active' : '';

  if (slide.type === 'hero') {
    return `<div class="reel${activeClass}" id="${id}">
      <div class="hero-badge anim-1">${slide.tag}</div>
      <div class="hero-emoji anim-2">🚚</div>
      <div class="h1 anim-3" style="white-space:pre-line">${slide.title}</div>
      <div class="hero-sub anim-4">${slide.sub}</div>
    </div>`;
  }
  if (slide.type === 'compare') {
    return `<div class="reel${activeClass}" id="${id}" style="padding:28px">
      <div class="tag tag-red anim-1">기존 방식</div>
      <div class="cmp-box bad anim-2" style="white-space:pre-line;margin-top:12px">${slide.bad}</div>
      <div class="arrow-down anim-3">↓</div>
      <div class="tag tag-gold anim-3">✅ ${name}</div>
      <div class="cmp-box good anim-4" style="white-space:pre-line;margin-top:8px">${slide.good}</div>
    </div>`;
  }
  if (slide.type === 'feature') {
    return `<div class="reel${activeClass}" id="${id}" style="padding:32px 28px">
      <div class="feat-icon anim-1">${slide.icon}</div>
      <div class="h2 anim-2" style="margin-top:16px;text-align:center">${slide.title}</div>
      <div class="body anim-3" style="text-align:center;margin-top:12px;white-space:pre-line">${slide.desc}</div>
    </div>`;
  }
  if (slide.type === 'price') {
    if (slide.p50) {
      // DONWAY 스타일: 인원 구간별 요금
      return `<div class="reel${activeClass}" id="${id}" style="padding:28px">
        <div class="tag tag-gold anim-1">요금제 (기사당 ₩2,500/월)</div>
        <div class="price-row anim-2"><span class="price-label">~50명</span><span class="price-val">${slide.p50}</span></div>
        <div class="price-row anim-3"><span class="price-label">~100명</span><span class="price-val">${slide.p100}</span></div>
        <div class="price-note anim-4">~500명: ${slide.p500}</div>
      </div>`;
    }
    // 기본: 기사/소장 구분 요금 (용차앱 등)
    return `<div class="reel${activeClass}" id="${id}" style="padding:28px">
      <div class="tag tag-gold anim-1">요금제</div>
      <div class="price-row anim-2"><span class="price-label">기사</span><span class="price-val">${slide.driver || ''}</span></div>
      <div class="price-row anim-3"><span class="price-label">소장</span><span class="price-val">${slide.dealer || ''}</span></div>
      <div class="price-note anim-4">${slide.donway || ''}</div>
    </div>`;
  }
  if (slide.type === 'cta') {
    return `<div class="reel${activeClass}" id="${id}" style="background:linear-gradient(160deg,${c.bg} 0%,${c.card} 100%);padding:32px 28px">
      <div class="hero-emoji anim-1">🚚</div>
      <div class="h1 anim-2">${slide.title}</div>
      <div class="hero-sub anim-3">${slide.sub}</div>
      <div class="cta-domain anim-4">${slide.domain || domain}</div>
    </div>`;
  }
  return '';
}

const slides = v.slides || [];
const reels = slides.map((s, i) => renderSlide(s, i)).join('\n');
const dots = slides.map((_, i) => `<div class="dot${i === 0 ? ' active' : ''}"></div>`).join('');
const durations = slides.map(() => 5500).join(',');
const slideIds = slides.map((_, i) => `s${i + 1}`);

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=390,initial-scale=1">
<title>${name} 홍보</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif}
  html,body{width:390px;height:844px;overflow:hidden;background:${c.bg}}
  .reel{position:absolute;top:0;left:0;width:390px;height:844px;display:flex;flex-direction:column;justify-content:center;align-items:center;opacity:0;transform:translateY(24px);transition:opacity 0.5s,transform 0.5s;pointer-events:none}
  .reel.active{opacity:1;transform:translateY(0);pointer-events:auto}
  .reel.exit{opacity:0;transform:translateY(-24px)}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .anim-1{animation:fadeUp 0.5s 0.1s both}.anim-2{animation:fadeUp 0.5s 0.3s both}
  .anim-3{animation:fadeUp 0.5s 0.5s both}.anim-4{animation:fadeUp 0.5s 0.7s both}
  .progress-bar{position:fixed;bottom:0;left:0;width:0%;height:3px;background:linear-gradient(90deg,${c.primary},${c.accent});transition:width linear;z-index:100}
  .dots{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:200}
  .dot{width:6px;height:6px;border-radius:50%;background:#374060;transition:all 0.3s}
  .dot.active{background:${c.accent};width:20px;border-radius:3px}
  .hero-badge{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:5px 14px;font-size:11px;color:#a0b0d0;letter-spacing:1px;font-weight:700;margin-bottom:20px}
  .hero-emoji{font-size:52px;margin-bottom:12px}
  .h1{font-size:34px;font-weight:800;line-height:1.2;text-align:center;color:#fff}
  .h2{font-size:26px;font-weight:800;line-height:1.3;color:#fff}
  .body{font-size:15px;line-height:1.7;color:#b0c0e0}
  .hero-sub{font-size:15px;color:#7a8aaa;margin-top:10px;text-align:center}
  .tag{display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:5px 14px;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:8px}
  .tag-gold{background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);color:${c.accent}}
  .tag-red{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171}
  .cmp-box{width:100%;border-radius:14px;padding:16px;font-size:13px;color:#b0c0e0;line-height:1.6}
  .cmp-box.bad{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2)}
  .cmp-box.good{background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);color:#fff}
  .arrow-down{font-size:22px;color:#374060;margin:10px 0}
  .feat-icon{font-size:52px}
  .price-row{width:100%;display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06)}
  .price-label{font-size:13px;color:#7a8aaa;font-weight:600}
  .price-val{font-size:22px;font-weight:800;color:${c.accent}}
  .price-note{font-size:12px;color:#22c55e;margin-top:14px;text-align:center}
  .cta-domain{font-size:18px;font-weight:700;color:${c.accent};margin-top:20px;letter-spacing:1px}
</style>
</head>
<body>
${reels}
<div class="progress-bar" id="pb"></div>
<div class="dots" id="dots">${dots}</div>
<script>
var slides=${JSON.stringify(slideIds)};
var DURATIONS=[${durations}];
var current=0;
var timer=null;
function next(){
  var prev=current;
  current=(current+1)%slides.length;
  var prevEl=document.getElementById(slides[prev]);
  var nextEl=document.getElementById(slides[current]);
  prevEl.classList.add('exit');
  nextEl.classList.add('active');
  setTimeout(function(){prevEl.classList.remove('active','exit')},600);
  var dots=document.querySelectorAll('.dot');
  dots.forEach(function(d,i){d.classList.toggle('active',i===current)});
  var pb=document.getElementById('pb');
  pb.style.transition='none';pb.style.width='0%';
  setTimeout(function(){pb.style.transition='width '+DURATIONS[current]+'ms linear';pb.style.width='100%'},50);
  if(timer)clearTimeout(timer);
  timer=setTimeout(next,DURATIONS[current]);
}
var pb=document.getElementById('pb');
pb.style.transition='width '+DURATIONS[0]+'ms linear';pb.style.width='100%';
timer=setTimeout(next,DURATIONS[0]);
</script>
</body>
</html>`;

const promoPath = path.join(ROOT, `assets/promo/${PRODUCT}-promo.html`);
fs.mkdirSync(path.dirname(promoPath), { recursive: true });
fs.writeFileSync(promoPath, html, 'utf8');
console.log(`[promo HTML] ${promoPath} 생성`);
console.log(`[완료] ${PRODUCT} Variant ${VARIANT} 생성 완료`);
