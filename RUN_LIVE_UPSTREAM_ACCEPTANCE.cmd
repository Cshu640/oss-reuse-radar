@echo off
setlocal
cd /d "%~dp0"
node scripts\live-upstream-acceptance.mjs
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" echo Live acceptance completed with harness exit code %EXIT_CODE%. See artifacts\live-upstream-acceptance.json.
if not "%EXIT_CODE%"=="0" pause
exit /b %EXIT_CODE%
