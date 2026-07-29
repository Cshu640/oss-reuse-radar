@echo off
setlocal
title OpenRadar Server
cd /d "%~dp0"

echo.
echo ========================================
echo OpenRadar local server
echo Folder: %CD%
echo URL: http://localhost:8080
echo Press Ctrl+C to stop.
echo ========================================
echo.

node "%~dp0server.mjs"
set "OPENRADAR_EXIT=%ERRORLEVEL%"

echo.
echo OpenRadar stopped or failed to start.
echo Exit code: %OPENRADAR_EXIT%
echo If port 8080 is already in use, close the older OpenRadar window and run this launcher again.
pause
exit /b %OPENRADAR_EXIT%
