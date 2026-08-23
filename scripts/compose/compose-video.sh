#!/usr/bin/env bash
# 사용법: ./compose-video.sh <product>
# product: filo | donway | yongcha | mbtico

set -e

PRODUCT="${1:-filo}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_DIR="$ROOT/output"
ASSETS_DIR="$ROOT/assets"
SUBTITLES="$ROOT/scripts/content/${PRODUCT}-subtitles.srt"
INPUT="$OUTPUT_DIR/${PRODUCT}-raw.webm"
FINAL="$OUTPUT_DIR/${PRODUCT}-final.mp4"
REELS="$OUTPUT_DIR/${PRODUCT}-reels.mp4"

if [ ! -f "$INPUT" ]; then
  echo "[오류] 입력 파일 없음: $INPUT"
  echo "먼저 node scripts/capture/record-${PRODUCT}.js 를 실행하세요."
  exit 1
fi

echo "[${PRODUCT}] FFmpeg 영상 편집 시작..."

# 로고/BGM 경로 (없으면 오버레이 스킵)
LOGO="$ASSETS_DIR/logo.png"
BGM="$ASSETS_DIR/bgm/background.mp3"
INTRO="$ASSETS_DIR/intro.mp4"
OUTRO="$ASSETS_DIR/outro.mp4"

# 자막 필터 (SRT → ASS 변환 후 overlay)
# Windows(Git Bash)에서 ass= 필터에 드라이브 문자가 포함된 절대경로를 넘기면
# FFmpeg가 ':' 를 옵션 구분자로 오인 → OUTPUT_DIR로 이동 후 파일명만 사용
SUBTITLE_FILTER=""
if [ -f "$SUBTITLES" ]; then
  ASS_FNAME="${PRODUCT}-subtitles.ass"
  ASS_FILE="$OUTPUT_DIR/${ASS_FNAME}"
  (cd "$OUTPUT_DIR" && ffmpeg -y -i "$SUBTITLES" "$ASS_FNAME" 2>/dev/null) || true
  if [ -f "$ASS_FILE" ]; then
    SUBTITLE_FILTER=",ass=${ASS_FNAME}"
  fi
fi

# 자막 필터 사용 시 OUTPUT_DIR 기준으로 ffmpeg 실행
cd "$OUTPUT_DIR"

# 로고 오버레이 필터
LOGO_FILTER=""
if [ -f "$LOGO" ]; then
  LOGO_FILTER="[1:v]scale=120:-1[logo];[base][logo]overlay=W-130:10[out]"
fi

# BGM 처리
BGM_ARGS=()
if [ -f "$BGM" ]; then
  BGM_ARGS=(-i "$BGM")
fi

# 인트로/아웃로가 있는 경우 concat, 없으면 메인 영상만
if [ -f "$INTRO" ] && [ -f "$OUTRO" ]; then
  echo "  인트로+본영상+아웃로 합성 중..."
  LIST_FILE="$OUTPUT_DIR/${PRODUCT}-concat.txt"
  cat > "$LIST_FILE" <<EOF
file '${INTRO}'
file '${INPUT}'
file '${OUTRO}'
EOF
  ffmpeg -y \
    -f concat -safe 0 -i "$LIST_FILE" \
    ${BGM_ARGS[@]} \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2${SUBTITLE_FILTER}" \
    -c:v libx264 -preset medium -crf 23 \
    -c:a aac -b:a 128k \
    -shortest \
    "$FINAL"
else
  echo "  본영상 편집 중 (인트로/아웃로 없음)..."
  if [ -f "$BGM" ]; then
    ffmpeg -y \
      -i "$INPUT" \
      -i "$BGM" \
      -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2${SUBTITLE_FILTER}" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a aac -b:a 128k \
      -map 0:v -map 1:a \
      -shortest \
      "$FINAL"
  else
    ffmpeg -y \
      -i "$INPUT" \
      -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2${SUBTITLE_FILTER}" \
      -c:v libx264 -preset medium -crf 23 \
      -an \
      "$FINAL"
  fi
fi

echo "[${PRODUCT}] 최종 영상 완료: $FINAL"

# Instagram Reels용 세로형 클립 추출
bash "$(dirname "$0")/make-reels.sh" "$PRODUCT"
