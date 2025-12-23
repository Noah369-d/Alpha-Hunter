@echo off
echo ========================================
echo 验证 fc.float 修复效果
echo ========================================
echo.
echo 正在运行测试...
echo.
npm run test:run > 测试结果-修复后.txt 2>&1
echo.
echo 测试完成！结果已保存到: 测试结果-修复后.txt
echo.
echo 显示测试总结...
echo.
findstr /C:"Test Files" /C:"Tests" /C:"Errors" 测试结果-修复后.txt
echo.
pause
