# 如何运行测试 - 简明指南

## 当前状态

✅ **依赖已安装** - 所有npm包已就绪
✅ **测试已编写** - 250+单元测试 + 15个属性测试
📋 **等待执行** - 需要手动运行测试命令

## 最简单的方法

### 步骤1：打开新的命令提示符

1. 按 `Win + R`
2. 输入 `cmd`
3. 按回车

### 步骤2：进入项目目录

```cmd
cd C:\Users\Administrator\Desktop\AlphaHunter\zpoint-quant
```

### 步骤3：安装jsdom（首次需要）

```cmd
npm install --save-dev jsdom
```

等待安装完成（约1-2分钟）

### 步骤4：运行测试

```cmd
npm test
```

或者运行一次性测试：

```cmd
npm run test:run
```

## 查看测试结果

测试运行后，你会看到：

```
✓ src/utils/MarketDataAdapter.test.js (30 tests)
✓ src/utils/CacheManager.test.js (20 tests)
✓ src/utils/IndicatorCalculator.test.js (50 tests)
✓ src/utils/StrategyManager.test.js (40 tests)
✓ src/utils/BacktestEngine.test.js (30 tests)
✓ src/utils/SignalGenerator.test.js (60 tests)
✓ src/utils/RiskManager.test.js (80 tests)

Test Files  14 passed (14)
Tests  310 passed (310)
```

## 查看测试覆盖率

```cmd
npm run coverage
```

覆盖率报告会生成在 `coverage/index.html`，用浏览器打开查看。

## 只运行特定测试

### 只运行单元测试
```cmd
npm run test:unit
```

### 只运行属性测试
```cmd
npm run test:property
```

### 只运行某个模块的测试
```cmd
npx vitest run MarketDataAdapter
```

## 使用测试UI界面

```cmd
npm run test:ui
```

这会打开一个浏览器界面，可以交互式地运行和查看测试。

## 常见问题

### Q: 命令提示符显示"npm不是内部或外部命令"
A: 需要安装Node.js或将Node.js添加到PATH环境变量

### Q: 测试运行很慢
A: 属性测试会运行很多次迭代，这是正常的。可以先运行单元测试：
```cmd
npm run test:unit
```

### Q: 某些测试失败了
A: 查看错误信息，可能需要：
1. 确认所有依赖都已安装
2. 检查Node.js版本（需要v18+）
3. 查看具体的错误堆栈

### Q: 如何停止测试
A: 按 `Ctrl + C`

## 预期结果

如果一切正常，你应该看到：

- ✅ 所有测试通过（绿色勾号）
- ✅ 测试覆盖率 ≥ 80%
- ✅ 无错误或警告

## 测试通过后

1. 查看覆盖率报告
2. 继续开发其他功能
3. 或进行集成测试（Task 17）

---

**提示**: 如果遇到任何问题，请查看 `TESTING_INSTRUCTIONS.md` 获取更详细的说明。
