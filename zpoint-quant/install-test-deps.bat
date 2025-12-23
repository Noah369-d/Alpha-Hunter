@echo off
chcp 65001 >nul
echo Installing test dependencies...
call npm install --save-dev jsdom happy-dom
echo.
echo Test dependencies installed!
pause
