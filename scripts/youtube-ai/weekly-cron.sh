#!/bin/bash
# AI 자동화 연구소 — 주간 자동 영상 생성+업로드
# Oracle Cloud cron 설정: 0 0 * * 3 (매주 수요일 09:00 KST)
# crontab -e 에서 추가: 0 0 * * 3 /home/opc/mbti-logistics/scripts/youtube-ai/weekly-cron.sh >> /home/opc/yt-cron.log 2>&1

set -e

REPO_DIR="/home/opc/mbti-logistics"
LOG_FILE="/home/opc/yt-cron.log"
TOPICS_FILE="$REPO_DIR/scripts/youtube-ai/topics.json"

cd "$REPO_DIR"

echo "=============================="
echo "$(date '+%Y-%m-%d %H:%M:%S') 주간 영상 생성 시작"
echo "=============================="

# 최신 코드 pull
git pull origin main --quiet

# 이번 주 주제 선택 (주 번호 기반 순환)
WEEK_NUM=$(date +%V)
TOPIC_COUNT=$(node -e "const t=require('./scripts/youtube-ai/topics.json'); console.log(t.length);")
TOPIC_IDX=$((10#$WEEK_NUM % TOPIC_COUNT))
TOPIC_ID=$(node -e "const t=require('./scripts/youtube-ai/topics.json'); console.log(t[$TOPIC_IDX].id);")

echo "이번 주 주제: $TOPIC_ID (주차: $WEEK_NUM)"

# 스크립트 생성 + 렌더 + 업로드
node scripts/youtube-ai/generate-and-upload.js --topic-id "$TOPIC_ID"

echo "$(date '+%Y-%m-%d %H:%M:%S') 완료: $TOPIC_ID"
