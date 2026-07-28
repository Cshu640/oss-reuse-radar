@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js，请先安装 Node.js 后再运行。
  pause
  exit /b 1
)
start "" "http://localhost:8080"
node server.mjs
if errorlevel 1 pause
