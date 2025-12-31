@echo off
echo Running tests to verify fixes...
cd /d "%~dp0"
call npm run test:run > test-results-latest.txt 2>&1
echo.
echo Test results saved to test-results-latest.txt
echo.
echo Showing last 100 lines:
echo ========================================
type test-results-latest.txt | more +100
