@echo off
echo ========================================
echo Zpoint Quant - 测试运行器
echo ========================================
echo.

:menu
echo 请选择测试类型:
echo 1. 运行所有测试
echo 2. 运行单元测试
echo 3. 运行属性测试
echo 4. 生成测试覆盖率报告
echo 5. 打开测试UI界面
echo 6. 退出
echo.

set /p choice=请输入选项 (1-6): 

if "%choice%"=="1" goto all_tests
if "%choice%"=="2" goto unit_tests
if "%choice%"=="3" goto property_tests
if "%choice%"=="4" goto coverage
if "%choice%"=="5" goto test_ui
if "%choice%"=="6" goto end

echo 无效选项，请重新选择
echo.
goto menu

:all_tests
echo.
echo 运行所有测试...
call npm run test:run
goto menu

:unit_tests
echo.
echo 运行单元测试...
call npm run test:unit
goto menu

:property_tests
echo.
echo 运行属性测试...
call npm run test:property
goto menu

:coverage
echo.
echo 生成测试覆盖率报告...
call npm run coverage
echo.
echo 覆盖率报告已生成在 coverage/ 目录
echo 打开 coverage/index.html 查看详细报告
start coverage\index.html
goto menu

:test_ui
echo.
echo 启动测试UI界面...
call npm run test:ui
goto menu

:end
echo.
echo 测试完成！
pause
