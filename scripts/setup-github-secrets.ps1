#!/usr/bin/env pwsh
# GitHub Secrets 자동 등록 스크립트
# 실행: pwsh -ExecutionPolicy Bypass -File scripts/setup-github-secrets.ps1
#   또는 PowerShell에서: .\scripts\setup-github-secrets.ps1

$ORACLE_IP   = "161.33.136.154"
$ORACLE_USER = "opc"
$REPO        = "kimdh4790-cpu/mbti-logistics"
$DESKTOP     = [Environment]::GetFolderPath("Desktop")

Write-Host ""
Write-Host "=== MBTICO GitHub Secrets 자동 등록 ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. SSH 키 탐색 ─────────────────────────────────────────────
Write-Host "[1/3] Oracle VM SSH 키 찾는 중..." -ForegroundColor Yellow

# 바탕화면의 ssh-key 관련 파일 전부 탐색
$keyFiles = Get-ChildItem $DESKTOP -File | Where-Object { $_.Name -match "ssh.?key" -or $_.Extension -eq ".key" -or $_.Name -match "sshkey" } | Sort-Object LastWriteTime

if ($keyFiles.Count -eq 0) {
    Write-Host "바탕화면에 SSH 키 파일이 없습니다." -ForegroundColor Red
    Write-Host "Oracle Cloud 콘솔에서 키를 다운로드 후 바탕화면에 놓고 다시 실행하세요."
    exit 1
}

Write-Host "발견된 키 파일 $($keyFiles.Count)개:"
$keyFiles | ForEach-Object { Write-Host "  - $($_.Name)" }
Write-Host ""

$workingKey = $null
$workingKeyPath = $null

foreach ($kf in $keyFiles) {
    Write-Host -NoNewline "  테스트: $($kf.Name) ... "

    $tmpKey = "$env:TEMP\test_oracle_key_$((Get-Random))"
    Copy-Item $kf.FullName $tmpKey

    # icacls로 권한 설정 (SSH 요구사항)
    icacls $tmpKey /inheritance:r /grant:r "$($env:USERNAME):R" 2>$null | Out-Null

    try {
        $result = & ssh -i $tmpKey `
            -o ConnectTimeout=8 `
            -o BatchMode=yes `
            -o StrictHostKeyChecking=no `
            "${ORACLE_USER}@${ORACLE_IP}" "echo __OK__" 2>&1

        if ($result -match "__OK__") {
            Write-Host "✅ 성공!" -ForegroundColor Green
            $workingKey = $kf.Name
            $workingKeyPath = $kf.FullName
            Remove-Item $tmpKey -Force -ErrorAction SilentlyContinue
            break
        } else {
            Write-Host "❌" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ (오류)" -ForegroundColor Red
    }

    Remove-Item $tmpKey -Force -ErrorAction SilentlyContinue
}

if (-not $workingKey) {
    Write-Host ""
    Write-Host "일치하는 SSH 키를 찾지 못했습니다." -ForegroundColor Red
    Write-Host "Oracle Cloud 콘솔 → Console Connection 으로 직접 접속해서"
    Write-Host "  cat ~/.ssh/authorized_keys"
    Write-Host "를 확인하세요."
    exit 1
}

Write-Host ""
Write-Host "  → 사용할 키: $workingKey" -ForegroundColor Green

# ── 2. GitHub Secrets 등록 ────────────────────────────────────
Write-Host ""
Write-Host "[2/3] GitHub Secrets 등록 중..." -ForegroundColor Yellow

# gh CLI 확인
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "gh CLI가 없습니다. https://cli.github.com 에서 설치하세요." -ForegroundColor Red
    exit 1
}

# gh 로그인 확인
$ghStatus = gh auth status 2>&1
if ($ghStatus -match "not logged") {
    Write-Host "GitHub 로그인이 필요합니다. 아래 명령어 실행:" -ForegroundColor Yellow
    Write-Host "  gh auth login"
    exit 1
}

# ORACLE_SSH_KEY 등록
Write-Host -NoNewline "  ORACLE_SSH_KEY 등록 중... "
Get-Content $workingKeyPath -Raw | gh secret set ORACLE_SSH_KEY --repo $REPO
Write-Host "✅" -ForegroundColor Green

# ── 3. Oracle .env에서 API 키 자동 읽어서 등록 ─────────────────
Write-Host ""
Write-Host "[3/3] Oracle .env 값 읽어서 GitHub Secrets 등록 중..." -ForegroundColor Yellow

$tmpKey2 = "$env:TEMP\oracle_key_final"
Copy-Item $workingKeyPath $tmpKey2
icacls $tmpKey2 /inheritance:r /grant:r "$($env:USERNAME):R" 2>$null | Out-Null

$envContent = & ssh -i $tmpKey2 `
    -o StrictHostKeyChecking=no `
    -o ConnectTimeout=15 `
    "${ORACLE_USER}@${ORACLE_IP}" "cat ~/.env" 2>&1

Remove-Item $tmpKey2 -Force -ErrorAction SilentlyContinue

if (-not $envContent -or $envContent -match "Permission denied") {
    Write-Host "  Oracle .env 읽기 실패. 수동으로 등록하세요." -ForegroundColor Yellow
} else {
    $secrets = @{
        "YOUTUBE_CLIENT_ID"     = ""
        "YOUTUBE_CLIENT_SECRET" = ""
        "YOUTUBE_REFRESH_TOKEN" = ""
        "GOOGLE_TTS_API_KEY"    = ""
    }

    foreach ($line in $envContent -split "`n") {
        foreach ($key in $secrets.Keys) {
            if ($line -match "^${key}=(.+)$") {
                $secrets[$key] = $Matches[1].Trim().Trim("'").Trim('"')
            }
        }
    }

    foreach ($key in $secrets.Keys) {
        if ($secrets[$key]) {
            Write-Host -NoNewline "  $key 등록 중... "
            $secrets[$key] | gh secret set $key --repo $REPO
            Write-Host "✅" -ForegroundColor Green
        } else {
            Write-Host "  $key: 값 없음 (건너뜀)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== 완료! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "이제 GitHub Actions 실행:" -ForegroundColor White
Write-Host "  Actions → 소셜미디어 홍보 영상 제작 → Run workflow"
Write-Host "  product: yongcha / steps: record,compose,youtube"
Write-Host ""
