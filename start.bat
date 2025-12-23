@echo off
echo ========================================
echo   全息共振交易系统 V10.0 - 启动脚本
echo ========================================
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo [√] 检测到 Node.js
    echo [*] 启动HTTP服务器...
    echo.
    node server.cjs
) else (
    REM 检查Python是否安装
    python --version >nul 2>&1
    if %errorlevel% == 0 (
        echo [√] 检测到 Python
        echo [*] 启动HTTP服务器...
        echo [*] 访问地址: http://localhost:8000
        echo.
        echo 按 Ctrl+C 停止服务器
        echo.
        python -m http.server 8000
    ) else (
        echo [×] 未检测到 Node.js 或 Python
        echo.
        echo 请安装以下任一工具后重试:
        echo   1. Node.js: https://nodejs.org/ (推荐)
        echo   2. Python: https://www.python.org/downloads/
        echo   3. VS Code Live Server 插件
        echo.
        pause
    )
)
