#!/usr/bin/env powershell
# GitHub Secrets Setup Script (uses existing SSH key)
# Run: powershell -ExecutionPolicy Bypass -File scripts\setup-github-secrets.ps1

$ORACLE_IP   = "161.33.136.154"
$ORACLE_USER = "opc"
$REPO        = "kimdh4790-cpu/mbti-logistics"

# Default key search paths (Desktop and common locations)
$KEY_CANDIDATES = @(
    "$env:USERPROFILE\Desktop\ssh-key-2026-08-02",
    "$env:USERPROFILE\Desktop\sshkey20260802.key",
    "$env:USERPROFILE\Desktop\sshkey20260802",
    "$env:USERPROFILE\Downloads\ssh-key-2026-08-02",
    "$env:USERPROFILE\Downloads\sshkey20260802.key",
    "$env:USERPROFILE\.ssh\mbtico_oracle"
)

Write-Host ""
Write-Host "=== MBTICO Oracle SSH + GitHub Secrets Setup ===" -ForegroundColor Cyan
Write-Host ""

# -- 1. Find working SSH key --
Write-Host "[1/3] Searching for SSH key..." -ForegroundColor Yellow
Write-Host ""

$FOUND_KEY = $null

foreach ($candidate in $KEY_CANDIDATES) {
    if (Test-Path $candidate) {
        Write-Host "  Found: $candidate" -ForegroundColor Green
        $FOUND_KEY = $candidate
        break
    }
}

if (-not $FOUND_KEY) {
    Write-Host "  Key not found in default locations." -ForegroundColor Yellow
    Write-Host ""
    $userInput = Read-Host "  Enter full path to your SSH key file (e.g. C:\Users\82104\Desktop\ssh-key-2026-08-02)"
    if (-not (Test-Path $userInput)) {
        Write-Host "  File not found: $userInput" -ForegroundColor Red
        exit 1
    }
    $FOUND_KEY = $userInput
}

Write-Host ""
Write-Host "  Using key: $FOUND_KEY" -ForegroundColor Cyan
Write-Host ""

# -- Fix Windows file permissions (required for OpenSSH) --
Write-Host "  Fixing key file permissions..." -ForegroundColor Yellow
try {
    icacls $FOUND_KEY /inheritance:r /grant:r "${env:USERNAME}:(R)" | Out-Null
    Write-Host "  Permissions fixed." -ForegroundColor Green
} catch {
    Write-Host "  Warning: Could not fix permissions (may still work)" -ForegroundColor Yellow
}

# -- 2. Test SSH connection --
Write-Host ""
Write-Host "[2/3] Testing SSH connection to ${ORACLE_USER}@${ORACLE_IP} ..." -ForegroundColor Yellow
Write-Host ""

$maxTries = 3
$success = $false

for ($i = 1; $i -le $maxTries; $i++) {
    Write-Host -NoNewline "  Attempt $i/$maxTries ... "

    $result = & ssh -i $FOUND_KEY `
        -o ConnectTimeout=10 `
        -o BatchMode=yes `
        -o StrictHostKeyChecking=no `
        "${ORACLE_USER}@${ORACLE_IP}" "echo __OK__" 2>&1

    if ("$result" -match "__OK__") {
        Write-Host "Connected!" -ForegroundColor Green
        $success = $true
        break
    } else {
        Write-Host "Failed" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor DarkGray
        if ($i -lt $maxTries) {
            Write-Host "  Waiting 5 seconds..."
            Start-Sleep 5
        }
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "=== SSH connection failed ===" -ForegroundColor Red
    Write-Host ""
    Write-Host "The key at $FOUND_KEY cannot connect to ${ORACLE_USER}@${ORACLE_IP}" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To fix this:" -ForegroundColor Cyan
    Write-Host "  1. Open Oracle Cloud Console: https://cloud.oracle.com"
    Write-Host "  2. Compute -> Instances -> filo-a1-2c12g"
    Write-Host "  3. Resources -> Console connection -> Create console connection"
    Write-Host "  4. Launch Cloud Shell connection (browser terminal - no SSH key needed)"
    Write-Host "  5. In the browser terminal, run:"
    Write-Host ""
    $pubKeyContent = Get-Content "${FOUND_KEY}.pub" -ErrorAction SilentlyContinue
    if ($pubKeyContent) {
        Write-Host "     echo '$pubKeyContent' >> ~/.ssh/authorized_keys" -ForegroundColor Green
    } else {
        Write-Host "     cat ~/.ssh/authorized_keys" -ForegroundColor DarkGray
        Write-Host "     (show what keys are registered, then add your key manually)" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  Your key does not have a .pub file. Try these steps in the browser terminal:" -ForegroundColor Yellow
        Write-Host "  A) Check what keys are registered: cat ~/.ssh/authorized_keys"
        Write-Host "  B) Copy the authorized_keys entry and compare with your key file"
    }
    Write-Host ""
    Write-Host "  6. Come back and re-run this script"
    Write-Host ""
    exit 1
}

# -- 3. Register GitHub Secrets --
Write-Host ""
Write-Host "[3/3] Registering GitHub Secrets..." -ForegroundColor Yellow

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "  gh CLI not found. Install from https://cli.github.com" -ForegroundColor Red
    exit 1
}

Write-Host -NoNewline "  ORACLE_SSH_KEY ... "
Get-Content $FOUND_KEY -Raw | gh secret set ORACLE_SSH_KEY --repo $REPO
Write-Host "OK" -ForegroundColor Green

# Read Oracle .env for API keys
Write-Host "  Reading Oracle ~/.env ..."
$envContent = & ssh -i $FOUND_KEY `
    -o StrictHostKeyChecking=no `
    -o ConnectTimeout=15 `
    "${ORACLE_USER}@${ORACLE_IP}" "cat ~/.env" 2>&1

$secretNames = @("YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN", "GOOGLE_TTS_API_KEY")
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
Write-Host "=== All done! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "GitHub Actions is ready."
Write-Host "Go to: GitHub -> Actions -> Social Media Pipeline -> Run workflow"
Write-Host ""
