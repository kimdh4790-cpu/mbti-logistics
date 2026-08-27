#!/usr/bin/env powershell
# GitHub Secrets Setup Script - auto-tries all key files
# Run: powershell -ExecutionPolicy Bypass -File scripts\setup-github-secrets.ps1

$ORACLE_IP   = "161.33.136.154"
$ORACLE_USER = "opc"
$REPO        = "kimdh4790-cpu/mbti-logistics"

Write-Host ""
Write-Host "=== MBTICO Oracle SSH + GitHub Secrets Setup ===" -ForegroundColor Cyan
Write-Host ""

# -- 1. Collect all candidate key files (newest first) --
Write-Host "[1/3] Scanning for SSH key files..." -ForegroundColor Yellow

$allKeys = @()
$searchDirs = @("$env:USERPROFILE\.ssh", "$env:USERPROFILE\Desktop", "$env:USERPROFILE\Downloads")
foreach ($dir in $searchDirs) {
    if (Test-Path $dir) {
        $files = Get-ChildItem $dir -File | Where-Object { $_.Name -match "ssh|key|\.key$|\.pem$" } | Sort-Object LastWriteTime -Descending
        foreach ($f in $files) { $allKeys += $f.FullName }
    }
}

if ($allKeys.Count -eq 0) {
    Write-Host "  No key files found. Enter path manually:" -ForegroundColor Yellow
    $manual = Read-Host "  Full path to SSH key"
    if (-not (Test-Path $manual)) { Write-Host "Not found." -ForegroundColor Red; exit 1 }
    $allKeys = @($manual)
}

Write-Host "  Found $($allKeys.Count) key file(s). Testing each..." -ForegroundColor Cyan
Write-Host ""

# -- 2. Auto-test each key --
$FOUND_KEY = $null

foreach ($keyPath in $allKeys) {
    $shortName = Split-Path $keyPath -Leaf
    Write-Host -NoNewline "  $shortName ... "

    # Fix Windows permissions
    try { icacls $keyPath /inheritance:r /grant:r "${env:USERNAME}:(R)" 2>&1 | Out-Null } catch {}

    $result = & ssh -i $keyPath `
        -o ConnectTimeout=15 `
        -o BatchMode=yes `
        -o StrictHostKeyChecking=no `
        "${ORACLE_USER}@${ORACLE_IP}" "echo __OK__" 2>&1

    if ("$result" -match "__OK__") {
        Write-Host "CONNECTED!" -ForegroundColor Green
        $FOUND_KEY = $keyPath
        break
    } else {
        Write-Host "fail" -ForegroundColor DarkGray
    }
}

if (-not $FOUND_KEY) {
    Write-Host ""
    Write-Host "=== No working key found ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "Action needed: Add a public key to Oracle VM via Console Connection" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. https://cloud.oracle.com -> Compute -> Instances -> filo-a1-2c12g"
    Write-Host "  2. Resources -> Console connection -> Create console connection -> Launch Cloud Shell"
    Write-Host "  3. In browser terminal, paste ONE of these commands:"
    Write-Host ""
    $firstKey = $allKeys[0]
    $pubFile = "${firstKey}.pub"
    if (Test-Path $pubFile) {
        $pub = Get-Content $pubFile -Raw
        Write-Host "     echo '$pub' >> ~/.ssh/authorized_keys" -ForegroundColor Cyan
    } else {
        Write-Host "     (No .pub file found. Generate one:)" -ForegroundColor DarkGray
        Write-Host "     ssh-keygen -y -f '$firstKey'" -ForegroundColor Cyan
        Write-Host "     Then append the output to ~/.ssh/authorized_keys on Oracle VM"
    }
    Write-Host ""
    Write-Host "  4. Re-run this script"
    exit 1
}

Write-Host ""
Write-Host "  Working key: $FOUND_KEY" -ForegroundColor Green
Write-Host ""

# -- 3. Register GitHub Secrets --
Write-Host "[3/3] Registering GitHub Secrets..." -ForegroundColor Yellow

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "  gh CLI not found. Install: https://cli.github.com" -ForegroundColor Red
    exit 1
}

Write-Host -NoNewline "  ORACLE_SSH_KEY ... "
Get-Content $FOUND_KEY -Raw | gh secret set ORACLE_SSH_KEY --repo $REPO
Write-Host "OK" -ForegroundColor Green

# Read Oracle ~/.env
Write-Host "  Reading Oracle ~/.env ..."
$envContent = & ssh -i $FOUND_KEY `
    -o StrictHostKeyChecking=no -o ConnectTimeout=15 `
    "${ORACLE_USER}@${ORACLE_IP}" "cat ~/.env" 2>&1

$secretNames = @("YOUTUBE_CLIENT_ID","YOUTUBE_CLIENT_SECRET","YOUTUBE_REFRESH_TOKEN","GOOGLE_TTS_API_KEY")
$values = @{}
foreach ($line in ($envContent -split "`n")) {
    foreach ($name in $secretNames) {
        if ($line -match "^${name}=(.+)$") {
            $values[$name] = $Matches[1].Trim().Trim("'").Trim('"')
        }
    }
}
foreach ($name in $secretNames) {
    Write-Host -NoNewline "  ${name} ... "
    if ($values[$name]) {
        $values[$name] | gh secret set $name --repo $REPO
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "SKIP (not in ~/.env)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Cyan
Write-Host "GitHub Actions ready -> Actions -> Social Media Pipeline -> Run workflow"
Write-Host ""
