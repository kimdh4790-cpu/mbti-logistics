#!/usr/bin/env bash
# Instagram Reels용 9:16 세로형 클립 추출
# 사용법: ./make-reels.sh <product>

set -e

PRODUCT="${1:-filo}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_DIR="$ROOT/output"
META_FILE="$ROOT/scripts/content/${PRODUCT}-meta.json"
INPUT="$OUTPUT_DIR/${PRODUCT}-final.mp4"
REELS="$OUTPUT_DIR/${PRODUCT}-reels.mp4"

if [ ! -f "$INPUT" ]; then
  echo "[Reels] 입력 파일 없음: $INPUT (compose-video.sh 먼저 실행)"
  exit 1
fi

# 메타에서 클립 시작/길이 읽기
if command -v node &>/dev/null && [ -f "$META_FILE" ]; then
  CLIP_START=$(node -e "const m=require('$META_FILE'); console.log(m.reels.clipStart||'00:00:15')")
  CLIP_DUR=$(node -e "const m=require('$META_FILE'); console.log(m.reels.clipDuration||30)")
else
  CLIP_START="00:00:15"
  CLIP_DUR=30
fi

echo "[Reels] 세로형 클립 생성: ${CLIP_START} ~ +${CLIP_DUR}초"

# 16:9 → 9:16 변환 (중앙 크롭 + 패딩)
ffmpeg -y \
  -ss "$CLIP_START" -t "$CLIP_DUR" \
  -i "$INPUT" \
  -vf "
    scale=1080:1920:force_original_aspect_ratio=decrease,
    pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,
    setsar=1
  " \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "$REELS"

echo "[Reels] 완료: $REELS"
