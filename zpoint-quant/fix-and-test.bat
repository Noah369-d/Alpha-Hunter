@echo off
chcp 65001 >nul
echo ========================================
echo Zpoint Quant - Fix and Test
echo ========================================
echo.
echo Step 1: Installing fake-indexeddb...
call npm install --save-dev fake-indexeddb
echo.
echo Step 2: Running tests...
echo.
call npm run test:run
echo.
echo ========================================
echo Done!
echo ========================================
pause
