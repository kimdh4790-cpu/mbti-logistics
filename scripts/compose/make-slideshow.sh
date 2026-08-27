#!/usr/bin/env bash
# 스크린샷 → 슬라이드쇼 영상 (Ken Burns 효과 + 나레이션)
# 사용법: bash scripts/compose/make-slideshow.sh <product>
# 예시: bash scripts/compose/make-slideshow.sh yongcha

set -e

PRODUCT="${1:-yongcha}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_DIR="$ROOT/output"
NARRATION="$OUTPUT_DIR/${PRODUCT}-narration.mp3"
FINAL="$OUTPUT_DIR/${PRODUCT}-final.mp4"
REELS="$OUTPUT_DIR/${PRODUCT}-reels.mp4"

FFMPEG_STATIC="$(node -e "try{process.stdout.write(require('ffmpeg-static'))}catch(e){}" 2>/dev/null)"
if [ -n "$FFMPEG_STATIC" ] && [ -f "$FFMPEG_STATIC" ]; then
  FFMPEG="$FFMPEG_STATIC"
else
  FFMPEG="ffmpeg"
fi

# 스크린샷 목록 (타임스탬프 순)
SHOTS=($(ls "$OUTPUT_DIR/${PRODUCT}-landing-"*.png 2>/dev/null | sort))

if [ ${#SHOTS[@]} -eq 0 ]; then
  echo "[슬라이드쇼] 스크린샷 없음: ${OUTPUT_DIR}/${PRODUCT}-landing-*.png"
  echo "먼저 node scripts/capture/record-${PRODUCT}.js 실행"
  exit 1
fi

echo "[슬라이드쇼] ${#SHOTS[@]}장 스크린샷 발견"

# 각 이미지 표시 시간 (초)
DUR_PER_SHOT=5
TOTAL="${#SHOTS[@]}"

# ─── 각 이미지를 9:16 (1080x1920) 영상 클립으로 변환 ──────────────────
TMP_DIR="$OUTPUT_DIR/slideshow-tmp-${PRODUCT}"
mkdir -p "$TMP_DIR"

CLIP_FILES=()
for i in "${!SHOTS[@]}"; do
  IMG="${SHOTS[$i]}"
  CLIP="$TMP_DIR/clip_${i}.mp4"
  echo "  [${i}] $(basename $IMG)"

  # scale to fit 1080x1920, pad black, subtle zoom in
  "$FFMPEG" -y \
    -loop 1 -t $DUR_PER_SHOT -i "$IMG" \
    -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,zoompan=z='min(zoom+0.0008,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${DUR_PER_SHOT}*25:s=1080x1920:fps=25" \
    -c:v libx264 -preset fast -crf 23 -r 25 -an \
    "$CLIP"
  CLIP_FILES+=("$CLIP")
done

# ─── 클립 concat ──────────────────────────────────────────────────────
CONCAT_LIST="$TMP_DIR/concat.txt"
printf "file '%s'\n" "${CLIP_FILES[@]}" > "$CONCAT_LIST"

MERGED="$TMP_DIR/merged.mp4"
"$FFMPEG" -y -f concat -safe 0 -i "$CONCAT_LIST" -c copy "$MERGED"

# ─── 나레이션 믹싱 ────────────────────────────────────────────────────
if [ -f "$NARRATION" ]; then
  echo "[슬라이드쇼] 나레이션 믹싱..."
  "$FFMPEG" -y \
    -i "$MERGED" \
    -i "$NARRATION" \
    -filter_complex "[1:a]volume=1.0[audio]" \
    -map 0:v -map "[audio]" \
    -c:v copy -c:a aac -b:a 128k \
    -shortest \
    "$FINAL"
else
  echo "[슬라이드쇼] 나레이션 없음 — 무음으로 출력"
  cp "$MERGED" "$FINAL"
fi

echo "[슬라이드쇼] 완료: $FINAL"

# ─── Reels용 복사 (이미 9:16) ────────────────────────────────────────
cp "$FINAL" "$OUTPUT_DIR/${PRODUCT}-promo.mp4"
cp "$FINAL" "$REELS"
echo "[슬라이드쇼] Reels 복사: $REELS"

# 임시 파일 정리
rm -rf "$TMP_DIR"
