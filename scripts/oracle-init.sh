#!/usr/bin/env bash
# Oracle Cloud (161.33.136.154) 완전 자동화 초기 설정
# Oracle Cloud에 SSH 접속 후 실행:
#   curl -fsSL https://raw.githubusercontent.com/kimdh4790-cpu/mbti-logistics/main/scripts/oracle-init.sh | bash
# 또는 로컬에서:
#   bash scripts/oracle-init.sh

set -e
REPO_DIR="/home/opc/mbti-logistics"
PROFILES_DIR="/home/opc/.mbtico-profiles"
LOG_DIR="/home/opc/mbtico-logs"

echo ""
echo "================================================="
echo "  MBTICO Oracle Cloud 자동화 초기 설정"
echo "================================================="
echo ""

# ── 1. 패키지 설치 ──────────────────────────────────────
echo "[1/6] 패키지 설치..."

# Node.js 20
if ! command -v node &>/dev/null || [[ "$(node -v)" < "v20" ]]; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - 2>/dev/null
  sudo dnf install -y nodejs 2>/dev/null || sudo apt-get install -y nodejs 2>/dev/null
fi
echo "  Node.js: $(node -v)"

# FFmpeg — ffmpeg-static npm 패키지로 처리 (시스템 ffmpeg 불필요)
# 한글 폰트만 설치 (자막용)
sudo dnf install -y google-noto-cjk-fonts 2>/dev/null \
  || sudo apt-get install -y fonts-noto-cjk 2>/dev/null \
  || true

# Chromium (녹화·업로드용)
CHROMIUM_BIN=$(command -v chromium 2>/dev/null || command -v chromium-browser 2>/dev/null || echo "")
if [ -z "$CHROMIUM_BIN" ]; then
  sudo dnf install -y chromium 2>/dev/null \
    || sudo apt-get install -y chromium-browser 2>/dev/null \
    || true
  CHROMIUM_BIN=$(command -v chromium 2>/dev/null || command -v chromium-browser 2>/dev/null || echo "/usr/bin/chromium")
fi
echo "  Chromium: $CHROMIUM_BIN"

# ── 2. 저장소 클론/업데이트 ─────────────────────────────
echo "[2/6] 저장소 준비..."
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" pull origin main
  echo "  업데이트 완료"
else
  git clone https://github.com/kimdh4790-cpu/mbti-logistics.git "$REPO_DIR"
  echo "  클론 완료"
fi

# ── 3. npm 패키지 설치 ──────────────────────────────────
echo "[3/6] npm 패키지 설치..."
cd "$REPO_DIR"
npm ci
echo "  완료 (ffmpeg-static 포함)"

# ── 4. 디렉토리 및 환경변수 설정 ─────────────────────────
echo "[4/6] 환경 설정..."
mkdir -p "$PROFILES_DIR"/{youtube,instagram,naver,filo-record,donway-record,yongcha-record,mbtico-record}
mkdir -p "$LOG_DIR"
mkdir -p "$REPO_DIR/output"
mkdir -p "$REPO_DIR/assets/bgm"

# .bashrc 환경변수 (중복 방지)
if ! grep -q "MBTICO_SETUP" ~/.bashrc 2>/dev/null; then
  cat >> ~/.bashrc << ENVEOF

# MBTICO 소셜미디어 자동화 (oracle-init.sh 설정)
export CHROMIUM_PATH=${CHROMIUM_BIN}
export PROFILES_DIR=${PROFILES_DIR}
# MBTICO_SETUP=1
ENVEOF
fi
export CHROMIUM_PATH="$CHROMIUM_BIN"
export PROFILES_DIR="$PROFILES_DIR"
echo "  CHROMIUM_PATH=$CHROMIUM_BIN"
echo "  PROFILES_DIR=$PROFILES_DIR"

# ── 5. Cron 설정 ────────────────────────────────────────
echo "[5/6] Cron 설정..."

CRON_CONTENT="CHROMIUM_PATH=${CHROMIUM_BIN}
PROFILES_DIR=${PROFILES_DIR}

# ════════════════════════════════════════════
#  MBTICO 전체 자동화 스케줄 (oracle-init.sh)
#  KST = UTC+9  →  KST 09:00 = UTC 00:00
# ════════════════════════════════════════════

# ── 소셜미디어 홍보 (월화수 / 목금토 2사이클) ──
#    각 제품이 주 2회씩 업로드됨
#    월/목=용차앱  화/금=FILO  수/토=DONWAY

# ── 1사이클: 월화수 ─────────────────────────

# [월요일] 09:00 용차앱 YouTube
0 0 * * 1 cd ${REPO_DIR} && git pull origin main -q && node scripts/upload/upload-youtube.js --product yongcha >> ${LOG_DIR}/yt-yongcha.log 2>&1
# [월요일] 10:00 용차앱 Instagram Reels
0 1 * * 1 cd ${REPO_DIR} && node scripts/upload/upload-instagram.js --product yongcha --type reels >> ${LOG_DIR}/ig-yongcha.log 2>&1
# [월요일] 11:00 용차앱 네이버 블로그
0 2 * * 1 cd ${REPO_DIR} && node scripts/upload/post-naver-blog.js --product yongcha >> ${LOG_DIR}/blog-yongcha.log 2>&1

# [화요일] 09:00 FILO YouTube
0 0 * * 2 cd ${REPO_DIR} && git pull origin main -q && node scripts/upload/upload-youtube.js --product filo >> ${LOG_DIR}/yt-filo.log 2>&1
# [화요일] 10:00 FILO Instagram Reels
0 1 * * 2 cd ${REPO_DIR} && node scripts/upload/upload-instagram.js --product filo --type reels >> ${LOG_DIR}/ig-filo.log 2>&1
# [화요일] 11:00 FILO 네이버 블로그
0 2 * * 2 cd ${REPO_DIR} && node scripts/upload/post-naver-blog.js --product filo >> ${LOG_DIR}/blog-filo.log 2>&1

# [수요일] 09:00 DONWAY YouTube
0 0 * * 3 cd ${REPO_DIR} && git pull origin main -q && node scripts/upload/upload-youtube.js --product donway >> ${LOG_DIR}/yt-donway.log 2>&1
# [수요일] 10:00 DONWAY Instagram Reels
0 1 * * 3 cd ${REPO_DIR} && node scripts/upload/upload-instagram.js --product donway --type reels >> ${LOG_DIR}/ig-donway.log 2>&1
# [수요일] 11:00 DONWAY 네이버 블로그
0 2 * * 3 cd ${REPO_DIR} && node scripts/upload/post-naver-blog.js --product donway >> ${LOG_DIR}/blog-donway.log 2>&1

# ── 2사이클: 목금토 ─────────────────────────

# [목요일] 09:00 용차앱 YouTube
0 0 * * 4 cd ${REPO_DIR} && git pull origin main -q && node scripts/upload/upload-youtube.js --product yongcha >> ${LOG_DIR}/yt-yongcha.log 2>&1
# [목요일] 10:00 용차앱 Instagram Reels
0 1 * * 4 cd ${REPO_DIR} && node scripts/upload/upload-instagram.js --product yongcha --type reels >> ${LOG_DIR}/ig-yongcha.log 2>&1
# [목요일] 11:00 용차앱 네이버 블로그
0 2 * * 4 cd ${REPO_DIR} && node scripts/upload/post-naver-blog.js --product yongcha >> ${LOG_DIR}/blog-yongcha.log 2>&1

# [금요일] 09:00 FILO YouTube
0 0 * * 5 cd ${REPO_DIR} && git pull origin main -q && node scripts/upload/upload-youtube.js --product filo >> ${LOG_DIR}/yt-filo.log 2>&1
# [금요일] 10:00 FILO Instagram Reels
0 1 * * 5 cd ${REPO_DIR} && node scripts/upload/upload-instagram.js --product filo --type reels >> ${LOG_DIR}/ig-filo.log 2>&1
# [금요일] 11:00 FILO 네이버 블로그
0 2 * * 5 cd ${REPO_DIR} && node scripts/upload/post-naver-blog.js --product filo >> ${LOG_DIR}/blog-filo.log 2>&1

# [토요일] 09:00 DONWAY YouTube
0 0 * * 6 cd ${REPO_DIR} && git pull origin main -q && node scripts/upload/upload-youtube.js --product donway >> ${LOG_DIR}/yt-donway.log 2>&1
# [토요일] 10:00 DONWAY Instagram Reels
0 1 * * 6 cd ${REPO_DIR} && node scripts/upload/upload-instagram.js --product donway --type reels >> ${LOG_DIR}/ig-donway.log 2>&1
# [토요일] 11:00 DONWAY 네이버 블로그
0 2 * * 6 cd ${REPO_DIR} && node scripts/upload/post-naver-blog.js --product donway >> ${LOG_DIR}/blog-donway.log 2>&1

# ── 앱 자동화 ───────────────────────────────

# 매일 22:00 KST(13:00 UTC) — 5개 앱 헬스체크
0 13 * * * cd ${REPO_DIR} && node scripts/health-check.js >> ${LOG_DIR}/health.log 2>&1

# 매일 07:00 KST(22:00 UTC 전날) — 재고 부족 알림 + AI 예측 사전계산
# (MBTICO_ADMIN_PW 환경변수 설정 필요: export MBTICO_ADMIN_PW=... >> ~/.bashrc)
0 22 * * * cd ${REPO_DIR} && [ -n \"\$MBTICO_ADMIN_PW\" ] && node scripts/admin-tasks.js --task all >> ${LOG_DIR}/admin-tasks.log 2>&1 || true

# ── 유지보수 ────────────────────────────────

# 매주 일요일 23:00 KST(14:00 UTC) — 10MB 초과 로그 5MB로 truncate
0 14 * * 0 find ${LOG_DIR} -name '*.log' -size +10M -exec truncate -s 5M {} \\;

# 매주 일요일 23:30 KST(14:30 UTC) — 30일 이상 된 로그 삭제
30 14 * * 0 find ${LOG_DIR} -name '*.log' -mtime +30 -delete

# 매주 일요일 00:00 KST(15:00 UTC 토요일) — output/ 영상 파일 7일 이상 된 것 삭제 (디스크 절약)
0 15 * * 0 find ${REPO_DIR}/output -name '*.mp4' -o -name '*.webm' -o -name '*.jpg' | xargs -I{} find {} -mtime +7 -delete 2>/dev/null || true"

echo "$CRON_CONTENT" | crontab -
echo "  Cron 등록 완료"

# ── 6. Agent Reach 설치 (YouTube 자막 리서치용) ────────
echo "[6/7] Agent Reach 설치..."
if ! python3 -c "import agent_reach" 2>/dev/null; then
  python3 -m venv ~/.agent-reach-venv
  source ~/.agent-reach-venv/bin/activate
  pip install agent-reach -q
  agent-reach install youtube   # yt-dlp 설치
  agent-reach install rss       # feedparser 설치
  deactivate
  # .bashrc에 alias 추가
  if ! grep -q "agent-reach" ~/.bashrc 2>/dev/null; then
    echo "alias agent-reach='~/.agent-reach-venv/bin/agent-reach'" >> ~/.bashrc
  fi
  echo "  Agent Reach 설치 완료 (YouTube + RSS 채널)"
else
  echo "  Agent Reach 이미 설치됨"
fi

# ── 7. 완료 안내 ────────────────────────────────────────
echo ""
echo "[7/7] 완료!"
echo ""
echo "================================================="
echo "  다음 단계: 플랫폼 최초 로그인 (1회만 필요)"
echo "================================================="
echo ""
echo "  YouTube 로그인:"
echo "  cd ${REPO_DIR}"
echo "  HEADLESS=false CHROMIUM_PATH=${CHROMIUM_BIN} node scripts/upload/upload-youtube.js --login-only"
echo ""
echo "  Instagram 로그인:"
echo "  HEADLESS=false CHROMIUM_PATH=${CHROMIUM_BIN} node scripts/upload/upload-instagram.js --login-only"
echo ""
echo "  또는 로컬 PC 세션 복사 방법:"
echo "  scp -r ~/.mbtico-profiles/ opc@161.33.136.154:~/.mbtico-profiles/"
echo ""
echo "  전체 파이프라인 dry-run 테스트:"
echo "  cd ${REPO_DIR} && node scripts/run-pipeline.js --product yongcha --steps record,compose --dry-run"
echo ""
echo "  영상 녹화+편집+YouTube+Instagram+블로그 전체:"
echo "  cd ${REPO_DIR} && node scripts/run-pipeline.js --product yongcha --steps record,compose,youtube,instagram,blog"
echo ""
echo "================================================="
echo "  앱 자동화 추가 설정"
echo "================================================="
echo ""
echo "  재고알림·AI예측 자동화 (admin 비밀번호 등록):"
echo "  echo 'export MBTICO_ADMIN_PW=YOUR_PW' >> ~/.bashrc && source ~/.bashrc"
echo ""
echo "  헬스체크 즉시 실행:"
echo "  cd ${REPO_DIR} && node scripts/health-check.js"
echo ""
echo "  admin 태스크 테스트 (비밀번호 설정 후):"
echo "  cd ${REPO_DIR} && MBTICO_ADMIN_PW=YOUR_PW node scripts/admin-tasks.js --task inv-check"
echo ""
