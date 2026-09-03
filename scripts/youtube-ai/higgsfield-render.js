#!/usr/bin/env node
// Higgsfield AI 영상 렌더 파이프라인
// Newtake 방식 원칙: 이미지 확정 → 영상 생성 → 프레임 연결
// 사용법: node higgsfield-render.js --topic-id n8n-kakao-auto [--dry-run]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const topicId = args.find((a, i) => args[i - 1] === '--topic-id') || args[1];
const dryRun = args.includes('--dry-run');

if (!topicId) {
  console.error('사용법: node higgsfield-render.js --topic-id <id>');
  process.exit(1);
}

// Higgsfield MCP 도구는 Claude Code 세션 내에서만 직접 호출 가능.
// 이 스크립트는 파라미터를 준비하고 프롬프트를 출력하는 가이드 역할.
// 실제 생성: Claude Code에서 Higgsfield 도구 직접 사용.

async function buildVideoPrompt(script) {
  // 9층 프롬프트 구조 (뉴테이크/@yeonsidesign 방식 적용)
  return `
[HEADER]
15-second vertical 9:16 educational tutorial video, clean Korean tech content style.
Topic: ${script.title}. Smooth motion graphics with Korean text overlays.

[REFERENCE]
Professional tech tutorial aesthetic. Dark background (#08101f navy) with gold accent (#c9a84c).
No real faces. Use animated icons, diagrams, code snippets.

[CAMERA]
Fixed camera. No zooms. Clean transitions between slides.

[ACTION]
Text and icon animations only. Each key point appears with smooth fade-in.
${script.sections?.slice(0, 3).map((s, i) => `${i * 4}-${i * 4 + 4}s: ${s.title}`).join('\n')}

[PACING]
3s intro → ${script.sections?.length || 3} × 3s content → 3s CTA outro

[AUDIO]
No built-in audio. Will add narration via FFmpeg post-processing.

[NEGATIVES]
No real faces. No stock footage. No jarring cuts. No English text (Korean only).
`.trim();
}

async function main() {
  const scriptPath = path.join(ROOT, 'output', 'scripts', `${topicId}.json`);

  if (!fs.existsSync(scriptPath)) {
    console.error(`스크립트 파일 없음: ${scriptPath}`);
    console.error('먼저 generate-script.js 실행 필요');
    process.exit(1);
  }

  const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));
  const prompt = await buildVideoPrompt(script);

  console.log('\n🎬 Higgsfield 영상 생성 파라미터\n');
  console.log('주제:', script.title);
  console.log('\n--- 이미지 생성 (1단계) ---');
  console.log('도구: generate_image');
  console.log('프롬프트:', `Korean tech tutorial thumbnail. ${script.title}. Dark navy background, gold accent, clean typography. No faces.`);
  console.log('비율: 9:16');

  console.log('\n--- 영상 생성 (2단계, 이미지 확정 후) ---');
  console.log('도구: generate_video');
  console.log('프롬프트:');
  console.log(prompt);

  if (dryRun) {
    console.log('\n[dry-run] 실제 Higgsfield 호출 생략');
    return;
  }

  // 파라미터 파일 저장 (Claude Code에서 참조용)
  const paramPath = path.join(ROOT, 'output', `${topicId}-higgsfield-params.json`);
  const outputDir = path.join(ROOT, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(paramPath, JSON.stringify({
    topicId,
    title: script.title,
    imagePrompt: `Korean tech tutorial thumbnail. ${script.title}. Dark navy background, gold accent, clean typography. No faces.`,
    videoPrompt: prompt,
    ratio: '9:16',
    duration: 15,
    model: 'seedance',
  }, null, 2));

  console.log(`\n✅ 파라미터 저장: ${paramPath}`);
  console.log('→ Claude Code에서 Higgsfield 도구로 generate_image 실행 후 generate_video 실행');
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
