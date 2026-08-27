#!/usr/bin/env powershell
# GitHub Secrets Auto Setup Script
# Run: powershell -ExecutionPolicy Bypass -File scripts\setup-github-secrets.ps1

$ORACLE_IP   = "161.33.136.154"
$ORACLE_USER = "opc"
$REPO        = "kimdh4790-cpu/mbti-logistics"
$DESKTOP     = [Environment]::GetFolderPath("Desktop")

Write-Host ""
Write-Host "=== MBTICO GitHub Secrets Setup ===" -ForegroundColor Cyan
Write-Host ""

# -- 1. Find SSH Key --
Write-Host "[1/3] Finding Oracle VM SSH key..." -ForegroundColor Yellow

$keyFiles = Get-ChildItem $DESKTOP -File | Where-Object {
    $_.Name -match "ssh" -or $_.Extension -eq ".key" -or $_.Extension -eq ".pem"
} | Sort-Object LastWriteTime

if ($keyFiles.Count -eq 0) {
    Write-Host "No SSH key files found on Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "Found $($keyFiles.Count) key file(s):"
$keyFiles | ForEach-Object { Write-Host "  - $($_.Name)" }
Write-Host ""

$workingKey = $null
$workingKeyPath = $null

foreach ($kf in $keyFiles) {
    Write-Host -NoNewline "  Testing $($kf.Name) ... "

    $tmpKey = "$env:TEMP\test_oracle_$((Get-Random))"
    Copy-Item $kf.FullName $tmpKey

    icacls $tmpKey /inheritance:r /grant:r "${env:USERNAME}:R" 2>&1 | Out-Null

    $sshArgs = @(
        "-i", $tmpKey,
        "-o", "ConnectTimeout=8",
        "-o", "BatchMode=yes",
        "-o", "StrictHostKeyChecking=no",
        "${ORACLE_USER}@${ORACLE_IP}",
        "echo __OK__"
    )

    try {
        $result = & ssh @sshArgs 2>&1
        if ("$result" -match "__OK__") {
            Write-Host "OK" -ForegroundColor Green
            $workingKey = $kf.Name
            $workingKeyPath = $kf.FullName
            Remove-Item $tmpKey -Force -ErrorAction SilentlyContinue
            break
        } else {
            Write-Host "FAIL" -ForegroundColor Red
        }
    } catch {
        Write-Host "FAIL (error)" -ForegroundColor Red
    }

    Remove-Item $tmpKey -Force -ErrorAction SilentlyContinue
}

if (-not $workingKey) {
    Write-Host ""
    Write-Host "No matching SSH key found." -ForegroundColor Red
    Write-Host "Check Oracle Cloud Console -> Console Connection -> cat ~/.ssh/authorized_keys"
    exit 1
}

Write-Host ""
Write-Host "  Working key: $workingKey" -ForegroundColor Green

# -- 2. Register GitHub Secrets --
Write-Host ""
Write-Host "[2/3] Registering GitHub Secrets..." -ForegroundColor Yellow

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "gh CLI not found. Install from https://cli.github.com" -ForegroundColor Red
    exit 1
}

Write-Host -NoNewline "  ORACLE_SSH_KEY ... "
Get-Content $workingKeyPath -Raw | gh secret set ORACLE_SSH_KEY --repo $REPO
Write-Host "OK" -ForegroundColor Green

# -- 3. Read Oracle .env and register API keys --
Write-Host ""
Write-Host "[3/3] Reading Oracle ~/.env and registering API keys..." -ForegroundColor Yellow

$tmpKey3 = "$env:TEMP\oracle_key_env"
Copy-Item $workingKeyPath $tmpKey3
icacls $tmpKey3 /inheritance:r /grant:r "${env:USERNAME}:R" 2>&1 | Out-Null

$envContent = & ssh -i $tmpKey3 `
    -o StrictHostKeyChecking=no `
    -o ConnectTimeout=15 `
    "${ORACLE_USER}@${ORACLE_IP}" "cat ~/.env" 2>&1

Remove-Item $tmpKey3 -Force -ErrorAction SilentlyContinue

if (-not $envContent -or "$envContent" -match "Permission denied") {
    Write-Host "  Could not read Oracle ~/.env" -ForegroundColor Yellow
} else {
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
            Write-Host "SKIP (not found)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now run GitHub Actions:"
Write-Host "  Actions -> Social Media Pipeline -> Run workflow"
Write-Host "  product: yongcha  /  steps: record,compose,youtube"
Write-Host ""
