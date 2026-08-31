/**
 * 개인정보 모자이크 처리 (얼굴·번호판·전화번호)
 * - 원본 절대 덮어쓰지 않음 → input/photos/_mosaic/ 에 저장
 * - 좌표는 EXIF 회전 보정 후 (보이는 화면 기준) 0~1 상대값
 * - sharp: 축소→버퍼→확대(nearest) 2단계 분리 (resize 1회 제한 우회)
 *
 * Usage:
 *   node scripts/mosaic.js --spec drafts/mosaic_spec.json
 *
 * spec 포맷 (drafts/mosaic_spec.json):
 * {
 *   "files": [
 *     {
 *       "path": "input/photos/IMG_001.jpg",
 *       "regions": [
 *         { "top": 0.1, "left": 0.2, "bottom": 0.4, "right": 0.6, "reason": "얼굴" }
 *       ]
 *     }
 *   ]
 * }
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const specArgIdx = process.argv.indexOf('--spec');
if (specArgIdx === -1 || !process.argv[specArgIdx + 1]) {
  console.error('사용법: node scripts/mosaic.js --spec drafts/mosaic_spec.json');
  process.exit(1);
}

const specPath = path.resolve(process.argv[specArgIdx + 1]);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

const OUT_DIR = path.join(__dirname, '..', 'input', 'photos', '_mosaic');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function mosaicFile(fileSpec) {
  const { path: filePath, regions } = fileSpec;
  const absPath = path.resolve(filePath);
  const filename = path.basename(filePath);
  const outPath = path.join(OUT_DIR, filename);

  const img = sharp(absPath).withMetadata();
  const meta = await img.metadata();

  // EXIF 회전 보정 후 실제 표시 크기 계산
  const rotated = meta.orientation && meta.orientation >= 5;
  const W = rotated ? meta.height : meta.width;
  const H = rotated ? meta.width : meta.height;

  let pipeline = sharp(absPath).rotate(); // EXIF 자동 보정

  for (const region of regions) {
    const left = Math.max(0, Math.floor((region.left - 0.02) * W));
    const top = Math.max(0, Math.floor((region.top - 0.02) * H));
    const right = Math.min(W, Math.ceil((region.right + 0.02) * W));
    const bottom = Math.min(H, Math.ceil((region.bottom + 0.02) * H));
    const rW = right - left;
    const rH = bottom - top;

    if (rW <= 0 || rH <= 0) continue;

    // 2단계: 축소 → 버퍼 → 확대(nearest)
    const TILE = 10; // 10px로 축소 → 원래 크기로 확대 = 픽셀화 효과
    const small = await sharp(await pipeline.toBuffer())
      .extract({ left, top, width: rW, height: rH })
      .resize(TILE, Math.max(1, Math.round(TILE * rH / rW)))
      .toBuffer();

    const mosaic = await sharp(small)
      .resize(rW, rH, { kernel: 'nearest' })
      .toBuffer();

    pipeline = sharp(await pipeline.toBuffer())
      .composite([{ input: mosaic, left, top }]);
  }

  await pipeline.jpeg({ quality: 90 }).toFile(outPath);
  console.log(`✅ ${filename} → _mosaic/${filename} (${regions.length}곳 처리)`);
  return outPath;
}

(async () => {
  const processed = [];
  for (const fileSpec of spec.files) {
    const outPath = await mosaicFile(fileSpec).catch(e => {
      console.error(`❌ ${fileSpec.path}: ${e.message}`);
      return null;
    });
    if (outPath) processed.push(outPath);
  }
  console.log(`\n처리 완료: ${processed.length}/${spec.files.length}장`);
  console.log('⚠️  처리본을 Read 툴로 열어 실제로 가려졌는지 확인하세요.');
  console.log('   덜 가려졌으면 spec의 좌표를 키워서 재실행하세요.');
})();
