#!/usr/bin/env bash
# Oracle Cloud (161.33.136.154) 서버에 전체 환경 설정 + cron 자동 업로드
# 로컬 PC에서 실행: bash scripts/setup-oracle-cron.sh
# 전제: 로컬에 ssh-key-2026-08-02 파일이 있어야 함

set -e

ORACLE_USER="opc"
ORACLE_IP="161.33.136.154"
REPO_DIR="/home/opc/mbti-logistics"
LOG_DIR="/home/opc/mbtico-logs"
PROFILES_DIR="/home/opc/.mbtico-profiles"

echo "=== Oracle Cloud 환경 설정 ==="
echo "대상: ${ORACLE_USER}@${ORACLE_IP}"
echo ""

# SSH 키 경로 (로컬 PC 기준)
SSH_KEY="$HOME/.ssh/ssh-key-2026-08-02"
if [ ! -f "$SSH_KEY" ]; then
  SSH_KEY="$(dirname "$0")/../../ssh-key-2026-08-02"
fi
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no"

echo "[1/4] 패키지 및 런타임 설치 중..."
ssh $SSH_OPTS "${ORACLE_USER}@${ORACLE_IP}" << 'REMOTE_SETUP'
set -e

# Node.js 20
if ! command -v node &>/dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo dnf install -y nodejs
fi
echo "Node.js: $(node -v)"

# FFmpeg + 한글 폰트
if ! command -v ffmpeg &>/dev/null; then
  sudo dnf install -y epel-release
  sudo dnf install -y ffmpeg google-noto-cjk-fonts
fi
echo "FFmpeg: $(ffmpeg -version 2>&1 | head -1)"

# Chromium (Oracle Linux용)
CHROMIUM_BIN=$(command -v chromium || command -v chromium-browser || echo "")
if [ -z "$CHROMIUM_BIN" ]; then
  sudo dnf install -y chromium || sudo dnf install -y chromium-browser || true
  CHROMIUM_BIN=$(command -v chromium || command -v chromium-browser || echo "/usr/bin/chromium")
fi
echo "Chromium: $CHROMIUM_BIN"

# 디렉토리 준비
mkdir -p /home/opc/.mbtico-profiles/{youtube,instagram,naver}
mkdir -p /home/opc/mbtico-logs
mkdir -p /home/opc/mbtico-output

echo "환경 준비 완료"
REMOTE_SETUP

echo ""
echo "[2/4] 저장소 클론/업데이트 중..."
ssh $SSH_OPTS "${ORACLE_USER}@${ORACLE_IP}" << 'REMOTE_GIT'
set -e
if [ -d "/home/opc/mbti-logistics/.git" ]; then
  cd /home/opc/mbti-logistics
  git pull origin main
  echo "저장소 업데이트 완료"
else
  git clone https://github.com/kimdh4790-cpu/mbti-logistics.git /home/opc/mbti-logistics
  echo "저장소 클론 완료"
fi

cd /home/opc/mbti-logistics
npm ci
echo "npm 설치 완료"
mkdir -p output assets/bgm
REMOTE_GIT

echo ""
echo "[3/4] Chromium 경로 환경변수 설정 중..."
ssh $SSH_OPTS "${ORACLE_USER}@${ORACLE_IP}" << 'REMOTE_ENV'
set -e
CHROMIUM_BIN=$(command -v chromium || command -v chromium-browser || echo "/usr/bin/chromium")

# .bashrc에 환경변수 등록 (중복 방지)
if ! grep -q "CHROMIUM_PATH" /home/opc/.bashrc; then
  echo "" >> /home/opc/.bashrc
  echo "# MBTICO 소셜미디어 자동화" >> /home/opc/.bashrc
  echo "export CHROMIUM_PATH=$CHROMIUM_BIN" >> /home/opc/.bashrc
  echo "export PROFILES_DIR=/home/opc/.mbtico-profiles" >> /home/opc/.bashrc
fi
echo "환경변수 등록 완료: CHROMIUM_PATH=$CHROMIUM_BIN"
REMOTE_ENV

echo ""
echo "[4/4] Cron 설정 중..."

# cron 내용 (CHROMIUM_PATH, PROFILES_DIR 포함)
CHROMIUM_BIN=$(ssh $SSH_OPTS "${ORACLE_USER}@${ORACLE_IP}" "command -v chromium || command -v chromium-browser || echo /usr/bin/chromium" 2>/dev/null)

CRON_CONTENT="CHROMIUM_PATH=${CHROMIUM_BIN}
PROFILES_DIR=/home/opc/.mbtico-profiles

# MBTICO 소셜미디어 자동 업로드
# 화요일 09:00 - FILO YouTube
0 9 * * 2 cd /home/opc/mbti-logistics && git pull origin main -q && node scripts/upload/upload-youtube.js --product filo >> /home/opc/mbtico-logs/yt-filo.log 2>&1

# 화요일 10:00 - FILO Instagram Reels
0 10 * * 2 cd /home/opc/mbti-logistics && node scripts/upload/upload-instagram.js --product filo --type reels >> /home/opc/mbtico-logs/ig-filo.log 2>&1

# 목요일 09:00 - DONWAY YouTube
0 9 * * 4 cd /home/opc/mbti-logistics && git pull origin main -q && node scripts/upload/upload-youtube.js --product donway >> /home/opc/mbtico-logs/yt-donway.log 2>&1

# 목요일 10:00 - DONWAY Instagram
0 10 * * 4 cd /home/opc/mbti-logistics && node scripts/upload/upload-instagram.js --product donway --type reels >> /home/opc/mbtico-logs/ig-donway.log 2>&1

# 월요일 09:00 - 용차앱 YouTube
0 9 * * 1 cd /home/opc/mbti-logistics && git pull origin main -q && node scripts/upload/upload-youtube.js --product yongcha >> /home/opc/mbtico-logs/yt-yongcha.log 2>&1"

ssh $SSH_OPTS "${ORACLE_USER}@${ORACLE_IP}" "echo '${CRON_CONTENT}' | crontab -"
echo "Cron 설정 완료"

echo ""
echo "==================================================================="
echo "설정 완료! 다음 단계: 각 플랫폼 최초 로그인 (Oracle Cloud에서 실행)"
echo "==================================================================="
echo ""
echo "Oracle Cloud에 SSH 접속 후:"
echo "  ssh -i ~/ssh-key-2026-08-02 opc@${ORACLE_IP}"
echo ""
echo "그 다음 로그인 명령 실행:"
echo "  cd ~/mbti-logistics"
echo "  HEADLESS=false CHROMIUM_PATH=\$(which chromium) node scripts/upload/upload-youtube.js --login-only"
echo "  HEADLESS=false CHROMIUM_PATH=\$(which chromium) node scripts/upload/upload-instagram.js --login-only"
echo ""
echo "녹화+편집+업로드 전체 파이프라인 테스트:"
echo "  node scripts/run-pipeline.js --product yongcha --steps record,compose,youtube --dry-run"
echo ""
echo "GitHub Actions로 원격 실행:"
echo "  1. GitHub Secrets에 ORACLE_SSH_KEY 등록"
echo "  2. Actions → 소셜미디어 홍보 영상 제작 → Run workflow"
