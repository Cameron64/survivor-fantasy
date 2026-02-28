Set-Location $PSScriptRoot

# Skip if already running — test by trying to lock the log file
$logFile = "$env:TEMP\survivor-bot.log"

try {
    $stream = [System.IO.File]::Open($logFile, 'Open', 'ReadWrite', 'None')
    $stream.Close()
} catch [System.IO.IOException] {
    # File is locked by another process — bot is already running
    exit 0
} catch {
    # File doesn't exist yet — first run, continue
}

& bun run src/index.ts *>> $logFile
