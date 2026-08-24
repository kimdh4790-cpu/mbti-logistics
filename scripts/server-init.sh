#!/usr/bin/env bash
# Oracle Cloud (161.33.136.154) 최초 서버 세팅 스크립트
# Oracle Linux 10 aarch64 기준
# 실행: ssh opc@161.33.136.154 "bash -s" < scripts/server-init.sh

set -e
echo "=== MBTICO 서버 초기 설정 시작 ==="

# 1. 시스템 업데이트
sudo dnf update -y -q

# 2. 필수 도구
sudo dnf install -y git curl wget unzip

# 3. Node.js 20 (NodeSource RPM)
if ! command -v node &>/dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
  sudo dnf install -y nodejs
fi
echo "Node.js $(node -v) 설치 완료"

# 4. FFmpeg (EPEL)
if ! command -v ffmpeg &>/dev/null; then
  sudo dnf install -y epel-release
  sudo dnf install -y ffmpeg
fi
echo "FFmpeg $(ffmpeg -version 2>&1 | head -1) 설치 완료"

# 5. 한글 폰트 (자막 렌더링용)
sudo dnf install -y google-noto-cjk-fonts 2>/dev/null || \
  sudo dnf install -y langpacks-ko 2>/dev/null || true

# 6. Chromium (Playwright용)
if ! command -v chromium &>/dev/null && ! command -v chromium-browser &>/dev/null; then
  sudo dnf install -y chromium || true
fi

# 7. 작업 디렉토리 생성
mkdir -p /home/opc/.mbtico-profiles/{youtube,instagram,naver,filo}
mkdir -p /home/opc/mbtico-logs
mkdir -p /home/opc/mbtico-output

# 8. 프로젝트 클론
if [ ! -d /home/opc/mbti-logistics ]; then
  git clone https://github.com/kimdh4790-cpu/mbti-logistics.git /home/opc/mbti-logistics
else
  cd /home/opc/mbti-logistics && git pull origin main
fi

# 9. npm 패키지 설치
cd /home/opc/mbti-logistics
npm install --omit=dev 2>/dev/null || npm install

echo ""
echo "=== 설치 완료 ==="
node -v && npm -v
ffmpeg -version 2>&1 | head -1
echo ""
echo "다음 단계: 각 플랫폼 로그인 세션 등록"
echo "  HEADLESS=false node scripts/upload/upload-youtube.js --login-only"
echo "  HEADLESS=false node scripts/upload/upload-instagram.js --login-only"
echo "  HEADLESS=false node scripts/upload/post-naver-blog.js --login-only"
