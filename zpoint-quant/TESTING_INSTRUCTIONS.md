# Zpoint Quant 测试验证指南

## 当前状态

✅ **依赖已安装** - 所有核心依赖已成功安装（158个包）

## 运行测试的步骤

### 方法1：使用npm脚本（推荐）

1. 打开命令提示符（CMD）或PowerShell
2. 进入项目目录：
   ```bash
   cd zpoint-quant
   ```

3. 安装测试依赖（首次运行需要）：
   ```bash
   npm install --save-dev jsdom
   ```

4. 运行所有测试：
   ```bash
   npm run test:run
   ```

5. 查看测试覆盖率：
   ```bash
   npm run coverage
   ```

### 方法2：使用批处理文件

1. 双击 `install-test-deps.bat` 安装测试依赖
2. 双击 `run-test-verification.bat` 运行测试

### 方法3：分别运行不同类型的测试

#### 只运行单元测试
```bash
npm run test:unit
```

#### 只运行属性测试
```bash
npm run test:property
```

#### 运行测试UI界面
```bash
npm run test:ui
```

## 预期测试结果

### 核心模块测试（7个模块）

1. **MarketDataAdapter** - 市场数据适配器
   - 单元测试：~30个测试用例
   - 属性测试：Property 1（市场数据标准化一致性）

2. **CacheManager** - 缓存管理器
   - 单元测试：~20个测试用例

3. **IndicatorCalculator** - 技术指标计算器
   - 单元测试：~50个测试用例
   - 属性测试：Property 4-8（MA、RSI、MACD、布林带、KDJ）

4. **StrategyManager** - 策略管理器
   - 单元测试：~40个测试用例
   - 属性测试：Property 2-3（持久化、语法验证）

5. **BacktestEngine** - 回测引擎
   - 单元测试：~30个测试用例
   - 属性测试：Property 9-10（报告完整性、参数一致性）

6. **SignalGenerator** - 信号生成器
   - 单元测试：~60个测试用例
   - 属性测试：Property 11-12（信号完整性、多策略隔离）

7. **RiskManager** - 风险管理器
   - 单元测试：~80个测试用例
   - 属性测试：Property 13-15（止损止盈、持仓限制、回撤限制）

### 总计
- **单元测试**: 250+ 测试用例
- **属性测试**: 15个属性，每个运行100次迭代 = 1500+次测试
- **目标覆盖率**: 80%

## 测试文件位置

```
zpoint-quant/src/utils/
├── MarketDataAdapter.test.js
├── MarketDataAdapter.property.test.js
├── MarketDataAdapter.error.test.js
├── CacheManager.test.js
├── IndicatorCalculator.test.js
├── IndicatorCalculator.property.test.js
├── StrategyManager.test.js
├── StrategyManager.property.test.js
├── BacktestEngine.test.js
├── BacktestEngine.property.test.js
├── SignalGenerator.test.js
├── SignalGenerator.property.test.js
├── RiskManager.test.js
└── RiskManager.property.test.js
```

## 常见问题

### Q: 测试运行很慢怎么办？
A: 属性测试会运行大量迭代，这是正常的。可以先运行单元测试：
```bash
npm run test:unit
```

### Q: 如何查看详细的测试输出？
A: 使用verbose模式：
```bash
npx vitest run --reporter=verbose
```

### Q: 如何只运行特定模块的测试？
A: 指定文件名：
```bash
npx vitest run MarketDataAdapter
```

### Q: 测试失败了怎么办？
A: 
1. 查看错误信息
2. 检查是否所有依赖都已安装
3. 确认Node.js版本（需要v18+）
4. 查看具体的测试文件和错误堆栈

## 测试覆盖率报告

运行覆盖率测试后，会生成HTML报告：
```
zpoint-quant/coverage/index.html
```

用浏览器打开此文件可以查看详细的覆盖率报告。

## 下一步

测试通过后，可以：
1. 查看测试覆盖率报告
2. 修复任何失败的测试
3. 继续开发其他功能（如图表可视化、完整的回测UI等）
4. 编写集成测试（Task 17）

---

**文档更新时间**: 2024-12-13
