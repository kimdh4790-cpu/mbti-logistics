#!/usr/bin/env node
// 전체 파이프라인: 스크립트 생성 → Remotion 렌더 → YouTube 업로드
// 사용법: node generate-and-upload.js --topic-id n8n-kakao-auto [--dry-run]
// Oracle Cloud (161.33.136.154)에서 실행 권장

import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const args = process.argv.slice(2);
const topicId = args.find((a, i) => args[i - 1] === '--topic-id') || args[1];
const dryRun  = args.includes('--dry-run');

if (!topicId) {
  console.error('사용법: node generate-and-upload.js --topic-id <id>');
  process.exit(1);
}

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  if (dryRun) { console.log(`  [dry-run] ${cmd}`); return; }
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

async function uploadToYouTube(scriptPath, videoPath) {
  const script = JSON.parse(fs.readFileSync(scriptPath, 'utf8'));

  const auth = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    'http://localhost'
  );
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

  const youtube = google.youtube({ version: 'v3', auth });

  console.log('\n▶ YouTube 업로드 중...');
  if (dryRun) {
    console.log(`  [dry-run] 업로드 예정: ${script.title}`);
    return;
  }

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: script.title,
        description: script.description + '\n\n#AI자동화 #소상공인 #자동화연구소',
        tags: script.tags || [],
        categoryId: '27',
        defaultLanguage: 'ko',
      },
      status: {
        privacyStatus: 'public',
        publishAt: null,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fs.createReadStream(videoPath),
    },
  });

  console.log(`✅ 업로드 완료: https://youtube.com/watch?v=${res.data.id}`);
  console.log(`   제목: ${script.title}`);

  // 업로드 이력 저장
  const logPath = path.join(ROOT, 'output', 'upload-log.json');
  const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
  log.push({ topicId, videoId: res.data.id, title: script.title, uploadedAt: new Date().toISOString() });
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
}

async function main() {
  console.log(`\n🤖 AI 자동화 연구소 — 영상 생성 파이프라인`);
  console.log(`주제: ${topicId}${dryRun ? ' [드라이런]' : ''}\n`);

  const scriptPath = path.join(ROOT, 'output', 'scripts', `${topicId}.json`);
  const videoPath  = path.join(ROOT, 'output', `${topicId}-final.mp4`);

  // 1. 스크립트 생성
  if (!fs.existsSync(scriptPath)) {
    run(`node scripts/youtube-ai/generate-script.js --topic-id ${topicId}`, '스크립트 생성 (Claude API)');
  } else {
    console.log(`✓ 스크립트 이미 존재: ${scriptPath}`);
  }

  // 2. Remotion 렌더
  if (!fs.existsSync(videoPath)) {
    run(
      `npx remotion render scripts/youtube-ai/AITutorialTemplate.jsx AITutorialVideo ${videoPath} --props='{"script": ${JSON.stringify(JSON.parse(fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, 'utf8') : '{}'))}}' --codec=h264`,
      'Remotion 영상 렌더'
    );
  } else {
    console.log(`✓ 영상 이미 존재: ${videoPath}`);
  }

  // 3. 자막 합성 (FFmpeg)
  const subtitlePath = path.join(ROOT, 'output', `${topicId}.srt`);
  const finalPath    = path.join(ROOT, 'output', `${topicId}-upload.mp4`);

  if (fs.existsSync(subtitlePath) && fs.existsSync(videoPath)) {
    run(
      `ffmpeg -i ${videoPath} -vf "subtitles=${subtitlePath}:force_style='FontName=Noto Sans KR,FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=60'" -c:a copy -y ${finalPath}`,
      'FFmpeg 자막 합성'
    );
  }

  // 4. YouTube 업로드
  const uploadPath = fs.existsSync(finalPath) ? finalPath : videoPath;
  if (!dryRun && fs.existsSync(uploadPath)) {
    await uploadToYouTube(scriptPath, uploadPath);
  } else if (dryRun) {
    console.log(`\n[dry-run] 업로드 대상: ${uploadPath}`);
  }

  console.log('\n✅ 파이프라인 완료!');
}

main().catch(err => {
  console.error('파이프라인 오류:', err.message);
  process.exit(1);
});
