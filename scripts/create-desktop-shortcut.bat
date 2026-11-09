@echo off
setlocal

echo ====================================================================
echo   SheetPulse Birthday Wisher - Create Desktop Shortcut
echo ====================================================================

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_DIR%\SheetPulse Birthday Wisher.lnk"
set "VBS_PATH=%SCRIPT_DIR%launch-hidden.vbs"

echo Creating desktop shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; ^
     $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); ^
     $s.TargetPath = 'wscript.exe'; ^
     $s.Arguments = '\"%VBS_PATH%\"'; ^
     $s.WorkingDirectory = '%PROJECT_DIR%'; ^
     $s.Description = 'Open SheetPulse Birthday Wisher Dashboard'; ^
     $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] Desktop shortcut created at:
    echo "%SHORTCUT_PATH%"
) else (
    echo [WARNING] Could not create shortcut directly on desktop.
)

echo ====================================================================
pause

