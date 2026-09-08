#!/usr/bin/env node
// SRT → ASS 변환 (1080x1920 Shorts/Reels 기준, 하단 고정)
// 사용: node scripts/compose/srt-to-ass.js input.srt output.ass [--product filo|donway|yongcha|scan|dine]

const fs = require('fs');
const args = process.argv.slice(2);
const srtPath = args[0];
const assPath = args[1];
const productIdx = args.indexOf('--product');
const product = productIdx !== -1 ? args[productIdx + 1] : 'default';

if (!srtPath || !assPath) {
  console.error('사용: node srt-to-ass.js input.srt output.ass [--product 제품명]');
  process.exit(1);
}

// 제품별 자막 색상 (ASS BGR 포맷: &HBBGGRR&)
// RGB → BGR 변환: #RRGGBB → &H00BBGGRR&
const PRODUCT_COLORS = {
  scan:    { primary: '&H00B672F4&', secondary: '&H009DD334&' }, // 핑크 #F472B6, 민트 #34D399
  donway:  { primary: '&H00B672F4&', secondary: '&H0034C87B&' }, // 핑크 #F472B6, 연두 #7BC834
  filo:    { primary: '&H004CA8C9&', secondary: '&H004CA8C9&' }, // 골드 #c9a84c
  yongcha: { primary: '&H004CA8C9&', secondary: '&H004CA8C9&' }, // 골드 #c9a84c
  dine:    { primary: '&H004CA8C9&', secondary: '&H004CA8C9&' }, // 골드 #c9a84c
  default: { primary: '&H00FFFFFF&', secondary: '&H00FFFFFF&' }, // 흰색
};

const color = PRODUCT_COLORS[product] || PRODUCT_COLORS.default;

const srt = fs.readFileSync(srtPath, 'utf8');

// PlayResY=1920 기준, Fontsize=52 → 약 52px 높이 텍스트
// Alignment=2: 하단 중앙, MarginV=120: 하단 120px 여백
const ASS_HEADER = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
Timer: 100.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans CJK KR,56,${color.primary},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,40,40,140,1
Style: Accent,Noto Sans CJK KR,56,${color.secondary},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,40,40,140,1`

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

function srtTimeToAss(time) {
  const [hms, ms] = time.trim().split(',');
  const [h, m, s] = hms.split(':');
  return `${parseInt(h)}:${m}:${s}.${Math.floor(parseInt(ms) / 10).toString().padStart(2, '0')}`;
}

const blocks = srt.trim().split(/\n\n+/);
const dialogues = [];

for (const block of blocks) {
  const lines = block.trim().split('\n');
  if (lines.length < 3) continue;
  const [startRaw, endRaw] = lines[1].split(' --> ');
  const text = lines.slice(2).join('\\N');
  dialogues.push(`Dialogue: 0,${srtTimeToAss(startRaw)},${srtTimeToAss(endRaw)},Default,,0,0,0,,${text}`);
}

fs.writeFileSync(assPath, ASS_HEADER + '\n' + dialogues.join('\n') + '\n', 'utf8');
console.log(`[ASS] 변환 완료: ${dialogues.length}개 자막 → ${assPath}`);
