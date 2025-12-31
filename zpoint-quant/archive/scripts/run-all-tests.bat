@echo off
chcp 65001 >nul
echo ========================================
echo Zpoint Quant - Test Runner
echo ========================================
echo.
echo Running all tests...
echo.
call npx vitest run
echo.
echo ========================================
echo Test run complete!
echo ========================================
pause
