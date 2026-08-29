#!/usr/bin/env node
// SRT → ASS 변환 (1080x1920 Shorts/Reels 기준, 하단 고정)
// 사용: node scripts/compose/srt-to-ass.js input.srt output.ass

const fs = require('fs');
const [,, srtPath, assPath] = process.argv;

if (!srtPath || !assPath) {
  console.error('사용: node srt-to-ass.js input.srt output.ass');
  process.exit(1);
}

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
Style: Default,Noto Sans CJK KR,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,40,40,120,1

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
