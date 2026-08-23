#!/bin/bash
# ================================================================
# Oracle Cloud n8n Docker 설치 스크립트 (완전판)
# 로컬 PC(macOS/Linux)에서 실행: bash setup-n8n-oracle.sh
#
# Oracle Cloud 인스턴스: 155.248.187.99 (A1.Flex 4코어/24GB)
# 설치 후 접속: http://155.248.187.99:5678
# ================================================================

SSH_KEY="$HOME/Downloads/ssh-key-2026-08-02"
SERVER="opc@155.248.187.99"

# SSH 키 경로 확인
if [ ! -f "$SSH_KEY" ]; then
  SSH_KEY="$HOME/Desktop/ssh-key-2026-08-02"
fi
if [ ! -f "$SSH_KEY" ]; then
  SSH_KEY="$HOME/ssh-key-2026-08-02"
fi
if [ ! -f "$SSH_KEY" ]; then
  echo "SSH 키 파일을 찾을 수 없습니다."
  echo "ssh-key-2026-08-02 파일 경로를 직접 지정하세요:"
  read -r SSH_KEY
fi

echo "=== MBTICO n8n Oracle Cloud 설치 ==="
echo "서버: $SERVER"
echo "SSH 키: $SSH_KEY"
echo ""

# ── STEP 1: Docker + Docker Compose 설치 ──────────────────────
echo "[1/5] Docker 설치 중..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" bash <<'REMOTE'
set -e

# Docker 설치 (Oracle Linux용)
if ! command -v docker &>/dev/null; then
  sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo systemctl enable --now docker
  sudo usermod -aG docker opc
  echo "Docker 설치 완료"
else
  echo "Docker 이미 설치됨: $(docker --version)"
fi

# Docker Compose 플러그인 확인
docker compose version 2>/dev/null || {
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
}
REMOTE

# ── STEP 2: docker-compose.yml 업로드 ─────────────────────────
echo "[2/5] docker-compose.yml 업로드 중..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/n8n-docker/docker-compose.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "n8n-docker/docker-compose.yml 파일이 없습니다."
  exit 1
fi

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" "mkdir -p ~/n8n"
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$COMPOSE_FILE" "$SERVER:~/n8n/docker-compose.yml"
echo "업로드 완료"

# ── STEP 3: n8n 컨테이너 시작 ─────────────────────────────────
echo "[3/5] n8n 컨테이너 시작 중..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" bash <<'REMOTE'
set -e
cd ~/n8n

# 기존 컨테이너 정리
docker compose down 2>/dev/null || true

# 최신 이미지 Pull
docker compose pull

# 실행
docker compose up -d
echo "컨테이너 상태:"
docker compose ps
REMOTE

# ── STEP 4: 방화벽 포트 오픈 ─────────────────────────────────
echo "[4/5] 방화벽 포트 오픈 중..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" bash <<'REMOTE'
set -e

# Oracle Linux 방화벽
sudo firewall-cmd --permanent --add-port=5678/tcp
sudo firewall-cmd --reload
echo "방화벽 포트 5678 오픈 완료"
sudo firewall-cmd --list-ports

# iptables (혹시 남아있으면)
sudo iptables -I INPUT -p tcp --dport 5678 -j ACCEPT 2>/dev/null || true
REMOTE

# ── STEP 5: 접속 확인 ─────────────────────────────────────────
echo "[5/5] 접속 확인 중 (40초 대기)..."
sleep 40

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://155.248.187.99:5678 2>/dev/null || echo "000")

echo ""
echo "================================================================"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "302" ]; then
  echo "설치 완료!"
  echo ""
  echo "접속 URL:  http://155.248.187.99:5678"
  echo "아이디:    admin@mbtico.kr"
  echo "비밀번호:  mbtico2026!"
  echo ""
  echo "Oracle Cloud 보안 목록에서 5678 포트도 허용했는지 확인하세요."
  echo "콘솔 경로: 인스턴스 → 연결된 VNIC → 서브넷 → 보안 목록 → 수신 규칙 추가"
  echo "  TCP / 소스: 0.0.0.0/0 / 대상 포트: 5678"
else
  echo "HTTP 응답코드: $HTTP_CODE"
  echo ""
  echo "n8n이 아직 시작 중입니다. 2분 후 직접 접속해보세요:"
  echo "http://155.248.187.99:5678"
  echo ""
  echo "Oracle Cloud 보안 목록에서 5678 포트 허용 여부를 반드시 확인하세요!"
  echo "콘솔 경로: 인스턴스 → 연결된 VNIC → 서브넷 → 보안 목록 → 수신 규칙 추가"
fi
echo "================================================================"
