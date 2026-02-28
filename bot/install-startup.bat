@echo off
echo Creating startup shortcut for Survivor Fantasy Telegram Bot...

set "VBS_PATH=%~dp0start-hidden.vbs"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_DIR%\SurvivorFantasyBot.lnk"

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_PATH%\"'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'Survivor Fantasy Telegram Bot'; $s.Save()"

echo Done! Bot will start automatically on login.
echo Shortcut created at: %SHORTCUT%
echo.
echo To remove: delete %SHORTCUT%
pause
