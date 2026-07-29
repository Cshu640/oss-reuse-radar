@echo off
setlocal
title OpenRadar Launcher
cd /d "%~dp0"

if not exist "server.mjs" (
  echo [ERROR] server.mjs was not found.
  echo Current folder: %CD%
  echo Please run this file from the extracted open-source-radar folder.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install Node.js, close this window, then try again.
  pause
  exit /b 1
)

echo Starting OpenRadar...
echo The server window must remain open while OpenRadar is in use.
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8080'"
call "%~dp0run-openradar-server.cmd"
endlocal
