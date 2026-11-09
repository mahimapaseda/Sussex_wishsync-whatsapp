@echo off
setlocal enabledelayedexpansion

echo ====================================================================
echo   SheetPulse Birthday Wisher - Windows Startup Registration
echo ====================================================================

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "VBS_PATH=%SCRIPT_DIR%launch-hidden.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\SheetPulse.lnk"

echo.
echo [1/3] Locating silent launcher script...
if not exist "%VBS_PATH%" (
    echo [ERROR] Could not find "%VBS_PATH%".
    pause
    exit /b 1
)
echo Found: "%VBS_PATH%"

echo.
echo [2/3] Creating Windows Startup shortcut...
echo Target folder: "%STARTUP_FOLDER%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; ^
     $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); ^
     $s.TargetPath = 'wscript.exe'; ^
     $s.Arguments = '\"%VBS_PATH%\"'; ^
     $s.WorkingDirectory = '%PROJECT_DIR%'; ^
     $s.Description = 'SheetPulse Birthday Wisher Auto-Startup'; ^
     $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] Shortcut successfully created:
    echo "%SHORTCUT_PATH%"
) else (
    echo [WARNING] Could not create shortcut directly. Falling back to Startup .bat runner...
    set "FALLBACK_BAT=%STARTUP_FOLDER%\SheetPulse_Runner.bat"
    echo @echo off > "!FALLBACK_BAT!"
    echo start "" wscript.exe "%VBS_PATH%" >> "!FALLBACK_BAT!"
    echo Created fallback at "!FALLBACK_BAT!"
)

echo.
echo [3/3] Registration Complete!
echo SheetPulse will now automatically start every time you log into Windows,
echo check today's birthdays, and open http://localhost:3847 in your browser.
echo ====================================================================
echo.
pause

