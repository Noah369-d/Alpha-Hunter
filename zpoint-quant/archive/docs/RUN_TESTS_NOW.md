# 🧪 立即运行测试

## ⚡ 快速开始（3步）

### 1️⃣ 打开新的命令提示符

按 `Win + R`，输入 `cmd`，按回车

### 2️⃣ 复制粘贴以下命令

```cmd
cd C:\Users\Administrator\Desktop\AlphaHunter\zpoint-quant && npm install --save-dev jsdom && npm run test:run
```

### 3️⃣ 等待测试完成

预计时间：5-10分钟

---

## 📊 你将看到什么

### 测试开始
```
RUN  v1.0.0
```

### 测试进行中
```
✓ src/utils/MarketDataAdapter.test.js (30)
✓ src/utils/CacheManager.test.js (20)
✓ src/utils/IndicatorCalculator.test.js (50)
...
```

### 测试完成
```
Test Files  14 passed (14)
Tests  310+ passed (310+)
Duration  ~5-10min
```

---

## ✅ 成功标志

- 所有测试显示绿色 ✓
- 没有红色 ✗ 失败标记
- 覆盖率 > 80%

---

## 🎯 测试内容

### 7个核心模块
1. MarketDataAdapter - 市场数据
2. CacheManager - 缓存管理
3. IndicatorCalculator - 技术指标
4. StrategyManager - 策略管理
5. BacktestEngine - 回测引擎
6. SignalGenerator - 信号生成
7. RiskManager - 风险管理

### 15个正确性属性
每个属性运行100次随机测试

### 250+单元测试
覆盖所有功能和边界情况

---

## 🔍 查看详细结果

### 查看覆盖率报告
```cmd
npm run coverage
```
然后打开 `coverage/index.html`

### 使用测试UI
```cmd
npm run test:ui
```
在浏览器中交互式查看

---

## ❓ 遇到问题？

### jsdom安装失败
```cmd
npm install --save-dev jsdom --force
```

### 测试失败
查看错误信息，运行：
```cmd
npx vitest run --reporter=verbose
```

### 只运行单元测试（更快）
```cmd
npm run test:unit
```

---

## 📚 更多信息

- `HOW_TO_RUN_TESTS.md` - 详细步骤
- `TEST_EXECUTION_SUMMARY.md` - 完整总结
- `TESTING_INSTRUCTIONS.md` - 测试指南

---

**准备就绪！现在就运行测试吧！** 🚀
