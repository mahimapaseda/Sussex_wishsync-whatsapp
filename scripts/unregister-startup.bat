@echo off
setlocal

echo ====================================================================
echo   SheetPulse Birthday Wisher - Unregister Windows Startup
echo ====================================================================

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\SheetPulse.lnk"
set "FALLBACK_BAT=%STARTUP_FOLDER%\SheetPulse_Runner.bat"

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo Removed: "%SHORTCUT_PATH%"
)

if exist "%FALLBACK_BAT%" (
    del /f /q "%FALLBACK_BAT%"
    echo Removed: "%FALLBACK_BAT%"
)

echo.
echo [SUCCESS] SheetPulse has been removed from Windows Startup.
echo ====================================================================
pause

