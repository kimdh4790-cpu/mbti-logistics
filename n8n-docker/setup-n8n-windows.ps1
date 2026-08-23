# ================================================================
# MBTICO n8n Oracle Cloud 설치 스크립트 (Windows PowerShell용)
# 실행: PowerShell에서 .\setup-n8n-windows.ps1
# ================================================================

$SSH_KEY = "$env:USERPROFILE\Desktop\ssh-key-2026-08-02"
$SERVER  = "opc@155.248.187.99"

# SSH 키 탐색
if (-not (Test-Path $SSH_KEY)) { $SSH_KEY = "$env:USERPROFILE\Downloads\ssh-key-2026-08-02" }
if (-not (Test-Path $SSH_KEY)) { $SSH_KEY = "$env:USERPROFILE\ssh-key-2026-08-02" }
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "SSH 키 파일을 찾을 수 없습니다. 경로를 입력하세요:" -ForegroundColor Yellow
    $SSH_KEY = Read-Host "SSH 키 경로"
}

Write-Host "=== MBTICO n8n Oracle Cloud 설치 ===" -ForegroundColor Cyan
Write-Host "서버: $SERVER"
Write-Host "SSH 키: $SSH_KEY"
Write-Host ""

# docker-compose.yml 내용 (서버에 직접 생성)
$COMPOSE = @'
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: n8n_db_2026
      POSTGRES_DB: n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 10s
      timeout: 5s
      retries: 5
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: n8n_db_2026
      N8N_HOST: 155.248.187.99
      N8N_PORT: 5678
      N8N_PROTOCOL: http
      WEBHOOK_URL: http://155.248.187.99:5678
      N8N_USER_MANAGEMENT_JWT_SECRET: mbtico_jwt_secret_2026
      N8N_ENCRYPTION_KEY: mbtico_enc_key_2026_filo
      GENERIC_TIMEZONE: Asia/Seoul
      TZ: Asia/Seoul
      N8N_LOG_LEVEL: info
      EXECUTIONS_DATA_PRUNE: "true"
      EXECUTIONS_DATA_MAX_AGE: "336"
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
volumes:
  postgres_data:
  n8n_data:
'@

# ── STEP 1: Docker 설치 ───────────────────────────────────────
Write-Host "[1/4] Docker 설치 중..." -ForegroundColor Yellow
$step1 = @'
set -e
if ! command -v docker &>/dev/null; then
  sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 2>/dev/null || \
  sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo systemctl enable --now docker
  sudo usermod -aG docker opc
  echo "Docker 설치 완료"
else
  echo "Docker 이미 설치됨: $(docker --version)"
fi
'@
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SERVER $step1

# ── STEP 2: docker-compose.yml 생성 ──────────────────────────
Write-Host "[2/4] docker-compose.yml 서버에 생성 중..." -ForegroundColor Yellow
$escapedCompose = $COMPOSE -replace '"', '\"' -replace '$', '\$'
$step2 = "mkdir -p ~/n8n && cat > ~/n8n/docker-compose.yml << 'YAML'" + "`n" + $COMPOSE + "`nYAML"
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SERVER "mkdir -p ~/n8n"

# 임시 파일에 저장 후 scp로 전송
$tmpFile = [System.IO.Path]::GetTempFileName() + ".yml"
$COMPOSE | Out-File -FilePath $tmpFile -Encoding UTF8 -NoNewline
scp -i $SSH_KEY -o StrictHostKeyChecking=no $tmpFile "${SERVER}:~/n8n/docker-compose.yml"
Remove-Item $tmpFile -Force
Write-Host "docker-compose.yml 업로드 완료"

# ── STEP 3: n8n 시작 ─────────────────────────────────────────
Write-Host "[3/4] n8n 컨테이너 시작 중..." -ForegroundColor Yellow
$step3 = @'
set -e
cd ~/n8n
sudo docker compose down 2>/dev/null || true
sudo docker compose pull
sudo docker compose up -d
echo "--- 컨테이너 상태 ---"
sudo docker compose ps
'@
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SERVER $step3

# ── STEP 4: 방화벽 오픈 ──────────────────────────────────────
Write-Host "[4/4] 방화벽 포트 5678 오픈 중..." -ForegroundColor Yellow
$step4 = @'
sudo firewall-cmd --permanent --add-port=5678/tcp
sudo firewall-cmd --reload
echo "포트 목록: $(sudo firewall-cmd --list-ports)"
'@
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SERVER $step4

# ── 접속 확인 ─────────────────────────────────────────────────
Write-Host ""
Write-Host "n8n 시작 대기 중 (40초)..." -ForegroundColor Gray
Start-Sleep -Seconds 40

try {
    $response = Invoke-WebRequest -Uri "http://155.248.187.99:5678" -TimeoutSec 15 -UseBasicParsing -ErrorAction SilentlyContinue
    $code = $response.StatusCode
} catch {
    $code = 0
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
if ($code -eq 200 -or $code -eq 302 -or $code -eq 401) {
    Write-Host "설치 완료!" -ForegroundColor Green
    Write-Host ""
    Write-Host "접속 URL  : http://155.248.187.99:5678" -ForegroundColor White
    Write-Host "최초 접속 : 계정 생성 화면에서 이메일/비밀번호 직접 설정" -ForegroundColor White
} else {
    Write-Host "아직 시작 중입니다. 2분 후 아래 주소로 접속하세요:" -ForegroundColor Yellow
    Write-Host "http://155.248.187.99:5678" -ForegroundColor White
}
Write-Host ""
Write-Host "Oracle Cloud 콘솔에서 보안 목록 포트 허용 확인:" -ForegroundColor Yellow
Write-Host "인스턴스 -> 연결된 VNIC -> 서브넷 -> 보안 목록 -> 수신 규칙 추가" -ForegroundColor Gray
Write-Host "  프로토콜: TCP / 소스: 0.0.0.0/0 / 대상 포트: 5678" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
