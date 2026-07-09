@echo off
echo Starting Performance App server...
echo.
cd /d "%~dp0"
cd backend
echo Installing dependencies...
call npm install
echo Starting server...
node server.js
pause
