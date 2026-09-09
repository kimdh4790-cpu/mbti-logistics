#!/usr/bin/env node
/**
 * Runway Gen-4 Turbo 영상 생성 스크립트
 * 사용법: node scripts/runway-generate.js --product filo --mode text|image
 *
 * 환경변수: RUNWAY_API_KEY
 * API 문서: https://dev.runwayml.com/docs
 */

const fs            = require('fs');
const path          = require('path');
const { execSync }  = require('child_process');

const API_BASE = 'https://api.dev.runwayml.com/v1';
const API_KEY  = process.env.RUNWAY_API_KEY;
const OUT_DIR  = path.join(__dirname, '..', 'output');

if (!API_KEY) {
  console.error('RUNWAY_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const PROMPTS = {
  filo: {
    text: 'A sleek modern restaurant POS tablet screen glowing in a busy Korean cafe, smooth cinematic camera pull-back, warm golden lighting, 4K quality, professional product showcase',
    duration: 5,
    ratio: '720:1280',
  },
  dine: {
    text: 'A smartphone showing a clean employee scheduling app, hands tapping the screen in a bright modern office, close-up cinematic shot, minimal UI animation, professional',
    duration: 5,
    ratio: '720:1280',
  },
  donway: {
    text: 'Delivery riders checking smartphone earnings notifications in a neon-lit Korean city at night, close-up of phone screen showing payment amounts, motorcycles parked outside convenience stores, cinematic slow motion, dramatic urban lighting, 4K quality, corporate advertisement style',
    duration: 5,
    ratio: '720:1280',
  },
  yongcha: {
    text: 'A truck driver using a mobile app on a Korean highway at sunset, AI matching animation overlay, cinematic golden hour lighting, professional documentary style',
    duration: 5,
    ratio: '720:1280',
  },
  inflearn: {
    text: 'A Korean small business owner watching a tutorial on a laptop, n8n workflow automation diagram glowing on screen, cozy office setting, warm lighting, inspirational',
    duration: 5,
    ratio: '720:1280',
  },
  scan: {
    text: 'A glowing smartphone screen showing an AI document analysis interface with Korean text, clean minimal UI with pink and mint accent colors, cinematic close-up shot, futuristic tech aesthetic, 4K quality',
    duration: 5,
    ratio: '720:1280',
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

async function pollTask(taskId, maxWait = 300000) {
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
    model:       'gen4.5',
    promptText:  cfg.text,
    ratio:       cfg.ratio,
    duration:    cfg.duration,
    watermark:   false,
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

  const imgBuf  = fs.readFileSync(imagePath);
  const ext     = path.extname(imagePath).slice(1).toLowerCase();
  const mime    = ext === 'png' ? 'image/png' : 'image/jpeg';
  const dataUrl = `data:${mime};base64,${imgBuf.toString('base64')}`;

  const task = await runwayPost('/image_to_video', {
    model:        'gen4.5',
    promptImage:  dataUrl,
    promptText:   cfg.text,
    ratio:        cfg.ratio,
    duration:     cfg.duration,
    watermark:    false,
  });

  console.log(`  Task ID: ${task.id}`);
  const result = await pollTask(task.id);

  const outPath = path.join(OUT_DIR, `${product}-runway.mp4`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await downloadVideo(result.output[0], outPath);
  return outPath;
}

// DONWAY 씬별 이미지-투-비디오 설정 (3씬 × 5초 = 15초)
const DONWAY_SCENES = [
  {
    imagePath: path.join(OUT_DIR, 'donway-mock-settle.png'),
    text: 'smooth cinematic zoom-in on dark premium fintech dashboard, payment numbers glowing gold, settlement totals animating, professional app interface, dramatic lighting, subtle particle effects',
    outName: 'donway-scene-1',
  },
  {
    imagePath: path.join(OUT_DIR, 'donway-mock-excel.png'),
    text: 'data rows processing animation across dark business software UI, numbers flowing into cells, progress bar filling smoothly, professional fintech app, clean modern tech aesthetic',
    outName: 'donway-scene-2',
  },
  {
    imagePath: path.join(OUT_DIR, 'donway-mock-alimtalk.png'),
    text: 'mobile notification appearing smoothly on dark screen, Kakao message bubble sliding in with glow, delivery payment confirmation UI, professional app animation, premium dark interface',
    outName: 'donway-scene-3',
  },
];

async function generateDonwayScenes() {
  console.log('\n[DONWAY] 3씬 이미지→영상 생성 시작...');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const clipPaths = [];

  for (let i = 0; i < DONWAY_SCENES.length; i++) {
    const scene = DONWAY_SCENES[i];
    const outPath = path.join(OUT_DIR, `${scene.outName}.mp4`);

    if (!fs.existsSync(scene.imagePath)) {
      throw new Error(`목업 이미지 없음: ${scene.imagePath}\n  → 먼저 node scripts/capture/generate-donway-mockups.js 실행`);
    }

    console.log(`\n[씬 ${i + 1}/3] ${scene.outName}`);
    console.log(`  이미지: ${scene.imagePath}`);

    const imgBuf  = fs.readFileSync(scene.imagePath);
    const dataUrl = `data:image/png;base64,${imgBuf.toString('base64')}`;

    const task = await runwayPost('/image_to_video', {
      model:       'gen4.5',
      promptImage: dataUrl,
      promptText:  scene.text,
      ratio:       '720:1280',
      duration:    5,
      watermark:   false,
    });

    console.log(`  Task ID: ${task.id}`);
    const result = await pollTask(task.id);
    await downloadVideo(result.output[0], outPath);
    clipPaths.push(outPath);
  }

  // FFmpeg로 3씬 concat → donway-runway.mp4
  const finalPath = path.join(OUT_DIR, 'donway-runway.mp4');
  const listFile  = path.join(OUT_DIR, 'donway-concat.txt');
  fs.writeFileSync(listFile, clipPaths.map(p => `file '${p}'`).join('\n'));

  console.log('\n[FFmpeg] 3씬 합치기...');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${finalPath}"`,
    { stdio: 'inherit' },
  );
  fs.unlinkSync(listFile);
  console.log(`  저장: ${finalPath}`);
  return finalPath;
}

const args    = process.argv.slice(2);
const product = args[args.indexOf('--product') + 1] || 'filo';
const mode    = args[args.indexOf('--mode')    + 1] || 'text';
const imgArg  = args[args.indexOf('--image')   + 1];

(async () => {
  try {
    if (mode === 'scenes' && product === 'donway') {
      await generateDonwayScenes();
    } else if (mode === 'image' && imgArg) {
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
