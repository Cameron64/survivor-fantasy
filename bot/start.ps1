Set-Location $PSScriptRoot

$pidFile = "$env:TEMP\survivor-bot.pid"
$bunExe = "$env:APPDATA\npm\node_modules\bun\bin\bun.exe"

# Check if already running via PID file
if (Test-Path $pidFile) {
    $savedPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($savedPid -and (Get-Process -Id $savedPid -ErrorAction SilentlyContinue)) {
        exit 0
    }
    Remove-Item $pidFile -Force
}

# Start bot and record PID
$proc = Start-Process -FilePath $bunExe -ArgumentList "run", "src/index.ts" `
    -RedirectStandardOutput "$env:TEMP\survivor-bot.log" `
    -RedirectStandardError "$env:TEMP\survivor-bot-err.log" `
    -NoNewWindow -PassThru

$proc.Id | Out-File $pidFile -NoNewline
Write-Host "Bot started (PID: $($proc.Id))"
