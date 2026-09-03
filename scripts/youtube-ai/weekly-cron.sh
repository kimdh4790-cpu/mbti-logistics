#!/bin/bash
# AI 자동화 연구소 — 주간 자동 영상 생성+업로드
# Oracle Cloud cron: 0 0 * * 3 (매주 수요일 09:00 KST)
# crontab -e: 0 0 * * 3 /home/opc/mbti-logistics/scripts/youtube-ai/weekly-cron.sh >> /home/opc/yt-cron.log 2>&1

set -e

REPO_DIR="/home/opc/mbti-logistics"
cd "$REPO_DIR"

echo "=============================="
echo "$(date '+%Y-%m-%d %H:%M:%S') 주간 영상 생성 시작"
echo "=============================="

# 최신 코드 pull
git pull origin main --quiet

# 1. monitor-digest 기반 동적 주제 생성 (최근 7일 트렌딩 콘텐츠에서 합성)
echo "[1단계] 이번 주 주제 생성 중..."
TOPIC_ID=$(node scripts/youtube-ai/generate-from-monitor.js 2>/dev/null)

if [ -z "$TOPIC_ID" ]; then
  # fallback: topics.json 순환
  echo "[fallback] monitor 데이터 부족 — topics.json 순환 사용"
  WEEK_NUM=$(date +%V)
  TOPIC_COUNT=$(node -e "const fs=require('fs'); const t=JSON.parse(fs.readFileSync('./scripts/youtube-ai/topics.json','utf8')); console.log(t.length);")
  TOPIC_IDX=$((10#$WEEK_NUM % TOPIC_COUNT))
  TOPIC_ID=$(node -e "const fs=require('fs'); const t=JSON.parse(fs.readFileSync('./scripts/youtube-ai/topics.json','utf8')); console.log(t[$TOPIC_IDX].id);")
fi

echo "이번 주 주제: $TOPIC_ID"

# 2. 템플릿 랜덤 선택 (tutorial / news / tips 로테이션)
WEEK_NUM=$(date +%V)
TEMPLATES=("tutorial" "news" "tips")
TMPL_IDX=$((10#$WEEK_NUM % 3))
TEMPLATE="${TEMPLATES[$TMPL_IDX]}"
echo "템플릿: $TEMPLATE"

# 3. 렌더 + 업로드
node scripts/youtube-ai/generate-and-upload.js \
  --topic-id "$TOPIC_ID" \
  --template "$TEMPLATE" \
  --skip-script

echo "$(date '+%Y-%m-%d %H:%M:%S') 완료: $TOPIC_ID (템플릿: $TEMPLATE)"
