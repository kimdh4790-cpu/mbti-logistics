#!/usr/bin/env bash
# Oracle Cloud (155.248.187.99) 서버에 자동 업로드 cron 설정
# 실행: bash scripts/setup-oracle-cron.sh
# 전제: Oracle Cloud에 Node.js, npm, FFmpeg, Chromium이 설치되어 있어야 함

set -e

ORACLE_USER="opc"
ORACLE_IP="161.33.136.154"
REPO_DIR="/home/opc/mbti-logistics"
LOG_DIR="/home/opc/mbtico-logs"

echo "=== Oracle Cloud 자동화 설정 ==="
echo "대상: ${ORACLE_USER}@${ORACLE_IP}"
echo ""

# 원격 환경 설정 스크립트
ssh "${ORACLE_USER}@${ORACLE_IP}" << 'REMOTE_SETUP'
#!/usr/bin/env bash
set -e

# Node.js 확인
if ! command -v node &>/dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo dnf install -y nodejs
fi

# FFmpeg 확인
if ! command -v ffmpeg &>/dev/null; then
  sudo dnf install -y epel-release && sudo dnf install -y ffmpeg google-noto-cjk-fonts
fi

# Chromium 확인
if ! command -v chromium-browser &>/dev/null && ! command -v chromium &>/dev/null; then
  sudo dnf install -y chromium || true
fi

# 프로파일 디렉토리
mkdir -p /home/opc/.mbtico-profiles/{youtube,instagram,naver}
mkdir -p /home/opc/mbtico-logs
mkdir -p /home/opc/mbtico-output

echo "환경 준비 완료"
REMOTE_SETUP

echo ""
echo "=== Cron 설정 ==="

# cron 내용 준비
CRON_CONTENT=$(cat << 'CRON'
# MBTICO 소셜미디어 자동 업로드 (매주 화/목)
# 형식: 분 시 일 월 요일 명령어

# 화요일 09:00 - FILO YouTube 업로드
0 9 * * 2 cd /home/opc/mbti-logistics && node scripts/upload/upload-youtube.js --product filo >> /home/opc/mbtico-logs/youtube-filo.log 2>&1

# 화요일 10:00 - FILO Instagram Reels 업로드
0 10 * * 2 cd /home/opc/mbti-logistics && node scripts/upload/upload-instagram.js --product filo --type reels >> /home/opc/mbtico-logs/instagram-filo.log 2>&1

# 목요일 09:00 - DONWAY YouTube 업로드
0 9 * * 4 cd /home/opc/mbti-logistics && node scripts/upload/upload-youtube.js --product donway >> /home/opc/mbtico-logs/youtube-donway.log 2>&1

# 목요일 10:00 - DONWAY Instagram 업로드
0 10 * * 4 cd /home/opc/mbti-logistics && node scripts/upload/upload-instagram.js --product donway --type reels >> /home/opc/mbtico-logs/instagram-donway.log 2>&1

# 월요일 09:00 - 용차앱 YouTube 업로드 (박람회 D-2)
0 9 * * 1 cd /home/opc/mbti-logistics && node scripts/upload/upload-youtube.js --product yongcha >> /home/opc/mbtico-logs/youtube-yongcha.log 2>&1
CRON
)

ssh "${ORACLE_USER}@${ORACLE_IP}" "echo '${CRON_CONTENT}' | crontab -"
echo "Cron 설정 완료"

echo ""
echo "=== 최초 로그인 절차 안내 ==="
echo "각 플랫폼은 한 번씩 수동 로그인이 필요합니다:"
echo ""
echo "1. YouTube:"
echo "   ssh -L 5900:localhost:5900 opc@${ORACLE_IP}"
echo "   HEADLESS=false PROFILES_DIR=/home/opc/.mbtico-profiles \\"
echo "     node scripts/upload/upload-youtube.js --login-only"
echo ""
echo "2. Instagram:"
echo "   HEADLESS=false PROFILES_DIR=/home/opc/.mbtico-profiles \\"
echo "     node scripts/upload/upload-instagram.js --login-only"
echo ""
echo "3. 네이버 블로그:"
echo "   HEADLESS=false PROFILES_DIR=/home/opc/.mbtico-profiles \\"
echo "     node scripts/upload/post-naver-blog.js --login-only"
echo ""
echo "로그인 완료 후 세션이 /home/opc/.mbtico-profiles/ 에 저장됩니다."
