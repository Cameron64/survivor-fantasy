Set-Location $PSScriptRoot

# Skip if already running
$existing = Get-Process -Name "bun" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "survivor-fantasy.*bot" }

if ($existing) {
    exit 0
}

& bun run src/index.ts >> "$env:TEMP\survivor-bot.log" 2>&1
