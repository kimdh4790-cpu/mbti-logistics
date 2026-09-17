#!/bin/bash
# Oracle Cloud YouTube 모니터링 실행 스크립트
# crontab: 0 0 * * * /home/opc/mbti-logistics/scripts/oracle-youtube-monitor.sh >> /home/opc/mbtico-logs/youtube-monitor.log 2>&1

set -e

REPO_DIR="/home/opc/mbti-logistics"
LOG_DIR="/home/opc/mbtico-logs"
ENV_FILE="/home/opc/.mbtico-env"

mkdir -p "$LOG_DIR"

echo "=== $(date '+%Y-%m-%d %H:%M:%S KST') YouTube 모니터링 시작 ==="

# 환경변수 로드
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "ERROR: $ENV_FILE 없음. 설정 방법: README 참고"
  exit 1
fi

# 레포 최신화
cd "$REPO_DIR"
git pull origin main --quiet

# Node.js 경로 확보 (nvm 환경)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# 실행
export LOG_DIR="$LOG_DIR"
node scripts/monitor/content-monitor.js

echo "=== $(date '+%Y-%m-%d %H:%M:%S KST') 완료 ==="
