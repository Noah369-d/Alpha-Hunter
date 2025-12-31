@echo off
chcp 65001 >nul
echo ========================================
echo Zpoint Quant - Complete Test Suite
echo ========================================
echo.
echo Step 1: Installing jsdom...
call npm install --save-dev jsdom
echo.
echo Step 2: Running all tests...
echo.
call npx vitest run
echo.
echo ========================================
echo Test execution complete!
echo ========================================
pause
