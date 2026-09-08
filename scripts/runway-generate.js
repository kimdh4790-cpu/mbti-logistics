#!/usr/bin/env node
/**
 * Runway Gen-4.5 영상 생성 스크립트
 * 사용법: node scripts/runway-generate.js --product filo --mode text|image
 *
 * 환경변수: RUNWAY_API_KEY
 * API 문서: https://dev.runwayml.com/docs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE  = 'https://api.dev.runwayml.com/v1';
const API_KEY   = process.env.RUNWAY_API_KEY;
const OUT_DIR   = path.join(__dirname, '..', 'output');

if (!API_KEY) {
  console.error('RUNWAY_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

// 제품별 프롬프트 정의
const PROMPTS = {
  filo: {
    text: 'A sleek modern restaurant POS tablet screen glowing in a busy Korean cafe, smooth cinematic camera pull-back, warm golden lighting, 4K quality, professional product showcase',
    duration: 5,
    ratio: '9:16',
  },
  dine: {
    text: 'A smartphone showing a clean employee scheduling app, hands tapping the screen in a bright modern office, close-up cinematic shot, minimal UI animation, professional',
    duration: 5,
    ratio: '9:16',
  },
  donway: {
    text: 'A logistics dashboard on a laptop screen showing real-time delivery driver settlements, data charts animating, dark blue professional UI, cinematic depth of field',
    duration: 5,
    ratio: '9:16',
  },
  yongcha: {
    text: 'A truck driver using a mobile app on a Korean highway at sunset, AI matching animation overlay, cinematic golden hour lighting, professional documentary style',
    duration: 5,
    ratio: '9:16',
  },
  inflearn: {
    text: 'A Korean small business owner watching a tutorial on a laptop, n8n workflow automation diagram glowing on screen, cozy office setting, warm lighting, inspirational',
    duration: 5,
    ratio: '9:16',
  },
};

async function runwayPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type':  'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Runway API ${res.status}: ${err}`);
  }
  return res.json();
}

async function runwayGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'X-Runway-Version': '2024-11-06',
    },
  });
  if (!res.ok) throw new Error(`Runway GET ${res.status}`);
  return res.json();
}

async function pollTask(taskId, maxWait = 300_000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const task = await runwayGet(`/tasks/${taskId}`);
    console.log(`  상태: ${task.status} (${Math.round((Date.now() - start) / 1000)}s)`);
    if (task.status === 'SUCCEEDED') return task;
    if (task.status === 'FAILED')    throw new Error(`Task 실패: ${task.failure || task.failureCode}`);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Task 타임아웃 (5분)');
}

async function downloadVideo(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(buf));
  console.log(`  저장: ${outPath}`);
}

async function generateTextToVideo(product) {
  const cfg = PROMPTS[product];
  if (!cfg) throw new Error(`알 수 없는 제품: ${product}`);

  console.log(`\n[Runway] ${product} 영상 생성 시작...`);
  console.log(`  프롬프트: ${cfg.text.slice(0, 60)}...`);

  const task = await runwayPost('/text_to_video', {
    model:          'gen4_turbo',
    promptText:     cfg.text,
    ratio:          cfg.ratio,
    duration:       cfg.duration,
    watermark:      false,
  });

  console.log(`  Task ID: ${task.id}`);
  const result = await pollTask(task.id);

  const outPath = path.join(OUT_DIR, `${product}-runway.mp4`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await downloadVideo(result.output[0], outPath);

  return outPath;
}

async function generateImageToVideo(product, imagePath) {
  const cfg = PROMPTS[product];
  if (!cfg) throw new Error(`알 수 없는 제품: ${product}`);
  if (!fs.existsSync(imagePath)) throw new Error(`이미지 없음: ${imagePath}`);

  console.log(`\n[Runway] ${product} 이미지→영상 생성 시작...`);

  // 이미지를 base64로 인코딩
  const imgBuf  = fs.readFileSync(imagePath);
  const ext     = path.extname(imagePath).slice(1).toLowerCase();
  const mime    = ext === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${imgBuf.toString('base64')}`;

  const task = await runwayPost('/image_to_video', {
    model:          'gen4_turbo',
    promptImage:    dataUrl,
    promptText:     cfg.text,
    ratio:          cfg.ratio,
    duration:       cfg.duration,
    watermark:      false,
  });

  console.log(`  Task ID: ${task.id}`);
  const result = await pollTask(task.id);

  const outPath = path.join(OUT_DIR, `${product}-runway.mp4`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await downloadVideo(result.output[0], outPath);

  return outPath;
}

// CLI 파싱
const args    = process.argv.slice(2);
const product = args[args.indexOf('--product') + 1] || 'filo';
const mode    = args[args.indexOf('--mode')    + 1] || 'text';
const imgArg  = args[args.indexOf('--image')   + 1];

(async () => {
  try {
    if (mode === 'image' && imgArg) {
      await generateImageToVideo(product, imgArg);
    } else {
      await generateTextToVideo(product);
    }
    console.log('\n완료!');
  } catch (e) {
    console.error('오류:', e.message);
    process.exit(1);
  }
})();
