@echo off
chcp 65001 >nul
echo ========================================
echo Zpoint Quant - Test Verification
echo ========================================
echo.
echo Running all tests...
echo.
call npx vitest run --reporter=verbose
echo.
echo ========================================
echo Test verification complete!
echo ========================================
pause
