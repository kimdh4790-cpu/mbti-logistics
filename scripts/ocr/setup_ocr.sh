#!/bin/bash
# Oracle Cloud에서 한 번만 실행 — PaddleOCR 설치 + 서비스 등록
set -e

echo "=== PaddleOCR 설치 ==="
pip3 install paddlepaddle paddleocr flask

echo ""
echo "=== 서버 첫 기동 (모델 다운로드 ~200MB) ==="
cd "$(dirname "$0")"
nohup python3 paddle_server.py > /tmp/paddle.log 2>&1 &
PID=$!
echo "PID=$PID — 로그: tail -f /tmp/paddle.log"

echo ""
echo "=== crontab 등록 (재부팅 자동 시작) ==="
(crontab -l 2>/dev/null; echo "@reboot cd $(pwd) && nohup python3 paddle_server.py > /tmp/paddle.log 2>&1 &") | crontab -

echo ""
echo "=== Oracle VCN 방화벽 (TCP 3101 Ingress 추가 필요) ==="
echo "OCI 콘솔 → Networking → VCN → Security Lists → Ingress Rules"
echo "  Source: 0.0.0.0/0  Protocol: TCP  Port: 3101"
echo ""
echo "완료. 잠시 후 확인:"
echo "  curl http://161.33.136.154:3101/health"
