@echo off
echo ========================================
echo Zpoint Quant - 个人量化交易系统
echo ========================================
echo.

REM 检查node_modules是否存在
if not exist "node_modules\" (
    echo 首次运行，正在安装依赖...
    call npm install
    echo.
)

echo 启动开发服务器...
call npm run dev

pause
