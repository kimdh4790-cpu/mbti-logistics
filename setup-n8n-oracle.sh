#!/bin/bash
# Oracle Cloud n8n Docker 설치 스크립트
# 로컬 PC에서 실행: bash setup-n8n-oracle.sh

SSH_KEY="$HOME/ssh-key-2026-08-02"
SERVER="opc@155.248.187.99"

echo "=== Oracle Cloud n8n 설치 시작 ==="

echo "[1/4] Docker 설치 중..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" bash <<'REMOTE'
set -e

# Docker 설치
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker opc

echo "Docker 설치 완료"
docker --version
REMOTE

echo "[2/4] n8n 컨테이너 실행 중..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" bash <<'REMOTE'
set -e

sudo docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=mbtico2026! \
  -e WEBHOOK_URL=http://155.248.187.99:5678 \
  n8nio/n8n

echo "n8n 컨테이너 시작됨"
sudo docker ps | grep n8n
REMOTE

echo "[3/4] 방화벽 포트 오픈 중..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER" bash <<'REMOTE'
set -e

sudo firewall-cmd --permanent --add-port=5678/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports

echo "방화벽 설정 완료"
REMOTE

echo "[4/4] 접속 확인 중 (30초 대기)..."
sleep 30
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://155.248.187.99:5678 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
  echo ""
  echo "=== 설치 완료 ==="
  echo "접속 URL: http://155.248.187.99:5678"
  echo "아이디:   admin"
  echo "비밀번호: mbtico2026!"
else
  echo ""
  echo "HTTP 응답코드: $HTTP_CODE"
  echo "서버 응답이 없거나 지연 중입니다. 잠시 후 직접 접속해보세요:"
  echo "http://155.248.187.99:5678"
fi
