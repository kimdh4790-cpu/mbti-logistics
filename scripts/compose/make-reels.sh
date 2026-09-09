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

# compose-video.sh 가 이미 1080x1920 세로형 60초 출력이므로 전체를 그대로 Reels로 사용
# (클립 자르기 제거 — YouTube Shorts·Instagram Reels 모두 전체 영상 업로드)
cp "$INPUT" "$REELS"
echo "[Reels] 완료 (전체 영상 복사): $REELS"
