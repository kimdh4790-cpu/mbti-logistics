/**
 * FILO·DINE 홍보 영상 FFmpeg 합성 스크립트
 * 실행: node make-video.js
 * 필요: ffmpeg 설치 (winget install ffmpeg 또는 brew install ffmpeg)
 */
const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const VID_DIR = path.join(__dirname, 'videos');
const OUT_FILE = path.join(VID_DIR, 'filo_dine_promo.mp4');

const SCENES = [
  { file: '01_qr_order.webm',   title: 'QR 주문', sub: '테이블에서 바로 주문하세요' },
  { file: '02_table_order.webm', title: '선결제·후불', sub: '결제 방식을 자유롭게 선택' },
  { file: '03_kitchen.webm',     title: '키친 디스플레이', sub: '주방과 홀이 실시간 연동' },
  { file: '04_dine_staff.webm',  title: '직원 출퇴근', sub: 'QR 스캔으로 간편 출퇴근' },
  { file: '05_pos.webm',         title: 'POS 결제', sub: '6가지 결제수단 지원' },
];

function run(cmd) {
  console.log('  $', cmd.slice(0, 80) + (cmd.length > 80 ? '...' : ''));
  execSync(cmd, { stdio: 'pipe' });
}

async function main() {
  console.log('=== FILO·DINE 홍보 영상 제작 시작 ===\n');

  const existing = SCENES.filter(s => fs.existsSync(path.join(VID_DIR, s.file)));
  if (!existing.length) {
    console.error('녹화된 영상 파일이 없습니다. 먼저 record-filo-dine.js를 실행하세요.');
    process.exit(1);
  }

  const processed = [];

  for (const scene of existing) {
    const input = path.join(VID_DIR, scene.file);
    const output = path.join(VID_DIR, 'proc_' + scene.file.replace('.webm', '.mp4'));
    console.log(`[처리] ${scene.title}`);

    // 자막 텍스트 이스케이프
    const safeTitle = scene.title.replace(/'/g, "\\'").replace(/:/g, "\\:");
    const safeSub = scene.sub.replace(/'/g, "\\'").replace(/:/g, "\\:");

    try {
      run(
        `ffmpeg -y -i "${input}" ` +
        `-vf "scale=390:844:force_original_aspect_ratio=decrease,pad=390:844:(ow-iw)/2:(oh-ih)/2:black,` +
        `drawtext=fontfile='C\\:/Windows/Fonts/malgun.ttf':text='${safeTitle}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=h-120:borderw=2:bordercolor=black,` +
        `drawtext=fontfile='C\\:/Windows/Fonts/malgun.ttf':text='${safeSub}':fontsize=18:fontcolor=#c9a84c:x=(w-text_w)/2:y=h-80:borderw=1:bordercolor=black" ` +
        `-c:v libx264 -preset fast -crf 23 -t 8 "${output}"`
      );
      processed.push(output);
    } catch (e) {
      console.log(`  건너뜀 (${e.message.slice(0, 50)})`);
    }
  }

  if (!processed.length) {
    console.error('처리된 영상이 없습니다.');
    process.exit(1);
  }

  // 영상 합치기
  console.log('\n[합치기] 영상 연결 중...');
  const listFile = path.join(VID_DIR, 'concat.txt');
  fs.writeFileSync(listFile, processed.map(f => `file '${f}'`).join('\n'));

  // 인트로 자막 포함 최종 합성
  const tempConcat = path.join(VID_DIR, 'concat_raw.mp4');
  run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${tempConcat}"`);

  // 인트로 + 아웃트로 텍스트
  run(
    `ffmpeg -y -i "${tempConcat}" ` +
    `-vf "` +
    `drawtext=fontfile='C\\:/Windows/Fonts/malgun.ttf':text='FILO · DINE':fontsize=36:fontcolor=#c9a84c:x=(w-text_w)/2:y=30:enable='lt(t,2)',` +
    `drawtext=fontfile='C\\:/Windows/Fonts/malgun.ttf':text='외식업 통합 운영 플랫폼':fontsize=18:fontcolor=white:x=(w-text_w)/2:y=75:enable='lt(t,2)'` +
    `" ` +
    `-c:v libx264 -preset fast -crf 21 "${OUT_FILE}"`
  );

  // 정리
  processed.forEach(f => fs.unlinkSync(f));
  fs.unlinkSync(listFile);
  fs.unlinkSync(tempConcat);

  console.log('\n=== 영상 제작 완료 ===');
  console.log('파일:', OUT_FILE);
  console.log('\n다음 단계: YouTube 업로드');
  console.log('  node upload-youtube.js');
}

main().catch(e => { console.error(e.message); process.exit(1); });
