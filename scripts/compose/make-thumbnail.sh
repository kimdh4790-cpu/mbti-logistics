#!/usr/bin/env bash
# YouTube 썸네일 생성 (1280x720)
# 사용법: ./make-thumbnail.sh <product>

set -e

PRODUCT="${1:-filo}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_DIR="$ROOT/output"
INPUT="$OUTPUT_DIR/${PRODUCT}-final.mp4"
THUMB="$OUTPUT_DIR/${PRODUCT}-thumbnail.jpg"

if [ ! -f "$INPUT" ]; then
  echo "[썸네일] 입력 없음: $INPUT"
  exit 1
fi

FFMPEG="$(node -e "try{process.stdout.write(require('ffmpeg-static'))}catch(e){process.stdout.write('ffmpeg')}" 2>/dev/null)"

# 가장 임팩트 있는 프레임 (10초 지점) 추출
"$FFMPEG" -y \
  -ss 00:00:10 \
  -i "$INPUT" \
  -frames:v 1 \
  -q:v 2 \
  -vf "scale=1280:720" \
  "$THUMB"

echo "[썸네일] 완료: $THUMB"
