#!/usr/bin/env bash
# 사용법: ./compose-video.sh <product>
# product: filo | donway | yongcha | mbtico
#
# 나레이션 포함 버전: output/<product>-narration.mp3 가 있으면 자동 믹싱
#   나레이션 생성: node scripts/audio/generate-narration.js --product <product>

set -e

PRODUCT="${1:-filo}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_DIR="$ROOT/output"
ASSETS_DIR="$ROOT/assets"
SUBTITLES="$ROOT/scripts/content/${PRODUCT}-subtitles.srt"
INPUT="$OUTPUT_DIR/${PRODUCT}-raw.webm"
FINAL="$OUTPUT_DIR/${PRODUCT}-final.mp4"

# ffmpeg-static 우선, 없거나 파일 없으면 시스템 ffmpeg
FFMPEG_STATIC="$(node -e "try{process.stdout.write(require('ffmpeg-static'))}catch(e){}" 2>/dev/null)"
if [ -n "$FFMPEG_STATIC" ] && [ -f "$FFMPEG_STATIC" ]; then
  FFMPEG="$FFMPEG_STATIC"
else
  FFMPEG="ffmpeg"
fi
echo "[ffmpeg] 사용: $FFMPEG"

if [ ! -f "$INPUT" ]; then
  echo "[오류] 입력 파일 없음: $INPUT"
  echo "먼저 node scripts/capture/record-${PRODUCT}.js 를 실행하세요."
  exit 1
fi

echo "[${PRODUCT}] FFmpeg 영상 편집 시작..."

# 오디오 파일 우선순위: 나레이션 > BGM > 무음
NARRATION="$OUTPUT_DIR/${PRODUCT}-narration.mp3"
BGM="$ASSETS_DIR/bgm/background.mp3"
INTRO="$ASSETS_DIR/intro.mp4"
OUTRO="$ASSETS_DIR/outro.mp4"

# 자막 필터 (SRT → ASS 변환 후 정확한 위치 제어)
# PlayResY=1920 기준 Fontsize=52, 하단 120px 고정
SUBTITLE_FILTER=""
if [ -f "$SUBTITLES" ]; then
  ASS_FILE="${OUTPUT_DIR}/${PRODUCT}-subtitles.ass"
  if node "${ROOT}/scripts/compose/srt-to-ass.js" "${SUBTITLES}" "${ASS_FILE}" 2>/dev/null; then
    SUBTITLE_FILTER=",ass='${ASS_FILE}'"
  else
    echo "[자막] ASS 변환 실패 — 자막 없이 진행"
  fi
fi

cd "$OUTPUT_DIR"

# ─── 오디오 필터 구성 ────────────────────────────────────────────
# 나레이션 있음: 나레이션(0dB) + BGM(-18dB 덕킹)
# BGM만 있음: BGM 단독
# 없음: 무음

HAS_NAR=0
HAS_BGM=0
[ -f "$NARRATION" ] && HAS_NAR=1
[ -f "$BGM" ] && HAS_BGM=1

build_audio_args() {
  # 리턴: ffmpeg -i 추가 인자들 (공백으로 이어지는 배열)
  if [ "$HAS_NAR" = "1" ] && [ "$HAS_BGM" = "1" ]; then
    echo "-i ${NARRATION} -i ${BGM}"
  elif [ "$HAS_NAR" = "1" ]; then
    echo "-i ${NARRATION}"
  elif [ "$HAS_BGM" = "1" ]; then
    echo "-i ${BGM}"
  fi
}

build_audio_filter() {
  if [ "$HAS_NAR" = "1" ] && [ "$HAS_BGM" = "1" ]; then
    # 나레이션 + BGM 덕킹 믹싱 (나레이션 1:audio stream, BGM 2:audio stream)
    echo "[1:a]volume=1.0[nar];[2:a]volume=0.10[bgm];[nar][bgm]amix=inputs=2:duration=first:normalize=0[audio]"
  elif [ "$HAS_NAR" = "1" ]; then
    echo "[1:a]volume=1.0[audio]"
  elif [ "$HAS_BGM" = "1" ]; then
    echo "[1:a]volume=1.0[audio]"
  fi
}

AUDIO_ARGS=$(build_audio_args)
AUDIO_FILTER=$(build_audio_filter)

# ─── 비디오 필터 ────────────────────────────────────────────────
# 블러 배경 채우기: 세로형(390x844) → 1080x1920 세로 (YouTube Shorts / Instagram Reels 직접 출력)
BLUR_VF="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1${SUBTITLE_FILTER}"

# ─── 인트로/아웃로 있는 경우 ─────────────────────────────────────
if [ -f "$INTRO" ] && [ -f "$OUTRO" ]; then
  echo "  인트로+본영상+아웃로 합성 중..."
  LIST_FILE="$OUTPUT_DIR/${PRODUCT}-concat.txt"
  cat > "$LIST_FILE" <<EOF
file '${INTRO}'
file '${INPUT}'
file '${OUTRO}'
EOF
  if [ -n "$AUDIO_FILTER" ]; then
    "$FFMPEG" -y \
      -f concat -safe 0 -i "$LIST_FILE" \
      $AUDIO_ARGS \
      -filter_complex "${AUDIO_FILTER}" \
      -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1${SUBTITLE_FILTER}" \
      -map 0:v -map "[audio]" \
      -c:v libx264 -preset slow -crf 18 \
      -c:a aac -b:a 192k \
      -shortest \
      "$FINAL"
  else
    "$FFMPEG" -y \
      -f concat -safe 0 -i "$LIST_FILE" \
      -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1${SUBTITLE_FILTER}" \
      -c:v libx264 -preset slow -crf 18 -an \
      "$FINAL"
  fi
else
  echo "  본영상 편집 중..."
  if [ -n "$AUDIO_FILTER" ]; then
    "$FFMPEG" -y \
      -i "$INPUT" \
      $AUDIO_ARGS \
      -filter_complex "${AUDIO_FILTER}" \
      -vf "$BLUR_VF" \
      -map 0:v -map "[audio]" \
      -c:v libx264 -preset slow -crf 18 \
      -c:a aac -b:a 192k \
      -shortest \
      "$FINAL"
  else
    "$FFMPEG" -y \
      -i "$INPUT" \
      -vf "$BLUR_VF" \
      -c:v libx264 -preset slow -crf 18 \
      -an \
      "$FINAL"
  fi
fi

echo "[${PRODUCT}] 최종 영상 완료: $FINAL"

# 업로드 스크립트가 찾는 -promo.mp4 복사
PROMO="$OUTPUT_DIR/${PRODUCT}-promo.mp4"
cp "$FINAL" "$PROMO"
echo "[${PRODUCT}] 업로드용 복사 완료: $PROMO"

# Instagram Reels용 세로형 클립 추출
bash "$SCRIPT_DIR/make-reels.sh" "$PRODUCT"
