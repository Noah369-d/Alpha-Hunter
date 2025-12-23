# Zpoint Quant 测试指南

## 测试框架

本项目使用双重测试策略：

### 1. 单元测试 (Vitest)

用于测试特定的功能实现、边缘情况和组件集成。

**运行单元测试：**
```bash
npm run test
```

**运行测试并查看UI：**
```bash
npm run test:ui
```

**生成测试覆盖率报告：**
```bash
npm run coverage
```

### 2. 属性测试 (fast-check)

用于验证通用的正确性属性，跨多种输入测试系统行为。

**配置要求：**
- 每个属性测试至少运行100次迭代
- 每个属性测试必须标注对应的设计文档中的正确性属性

**标记格式：**
```javascript
// Feature: zpoint-quant, Property {number}: {property_text}
```

## 测试文件组织

```
src/test/
├── setup.js                    # 测试环境配置和工具函数
├── property-helpers.js         # 属性测试辅助函数
├── example.test.js             # 单元测试示例
└── property-example.test.js    # 属性测试示例
```

## 编写单元测试

### 基本结构

```javascript
import { describe, it, expect } from 'vitest'

describe('功能模块名称', () => {
  it('应该做某事', () => {
    // 准备
    const input = 'test'
    
    // 执行
    const result = someFunction(input)
    
    // 断言
    expect(result).toBe('expected')
  })
})
```

### 使用测试工具函数

```javascript
import { createMockMarketData, createMockStrategy } from './setup'

it('应该处理市场数据', () => {
  const data = createMockMarketData(100)
  expect(data).toHaveLength(100)
})
```

## 编写属性测试

### 基本结构

```javascript
import { describe, it } from 'vitest'
import fc from 'fast-check'
import { arbitraryMarketData } from './property-helpers'

describe('属性测试', () => {
  it('Property 1: 市场数据标准化一致性', () => {
    // Feature: zpoint-quant, Property 1: 市场数据标准化一致性
    fc.assert(
      fc.property(
        arbitraryMarketData(),
        (data) => {
          // 验证属性
          return data.hasOwnProperty('timestamp') &&
                 data.hasOwnProperty('open') &&
                 data.open > 0
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### 可用的Arbitrary生成器

在 `property-helpers.js` 中提供了以下生成器：

- `arbitraryMarketData()` - 生成市场数据
- `arbitraryPriceArray(min, max)` - 生成价格序列
- `arbitraryStrategy()` - 生成策略对象
- `arbitrarySignal()` - 生成交易信号
- `arbitraryTrade()` - 生成交易记录
- `arbitraryPosition()` - 生成持仓
- `arbitraryPortfolio()` - 生成投资组合

## 测试覆盖率目标

- **单元测试代码覆盖率**：≥ 80%
- **属性测试**：覆盖所有25个正确性属性
- **集成测试**：覆盖主要用户流程

## 测试最佳实践

### 1. 测试命名

- 使用描述性的测试名称
- 说明测试的目的和预期结果
- 中文或英文都可以，保持一致

### 2. 测试隔离

- 每个测试应该独立运行
- 不依赖其他测试的执行顺序
- 使用 `beforeEach` 和 `afterEach` 进行清理

### 3. 断言清晰

- 每个测试应该有明确的断言
- 避免过多的断言在一个测试中
- 使用有意义的错误消息

### 4. 属性测试技巧

- 从简单的属性开始
- 逐步增加复杂度
- 使用 `fc.pre()` 添加前置条件
- 使用 `fc.statistics()` 了解生成的数据分布

## 调试测试

### 查看失败的测试

```bash
npm run test -- --reporter=verbose
```

### 运行特定的测试文件

```bash
npm run test -- example.test.js
```

### 运行特定的测试用例

```bash
npm run test -- -t "测试名称"
```

### 调试属性测试

当属性测试失败时，fast-check 会提供反例（seed、path 和缩小后的 counterexample）。有几种常见手法来定位与复现：

- 使用 `verbose: true` 查看生成过程和首次失败值：

```javascript
fc.assert(
  fc.property(
    fc.integer(),
    (n) => n * 2 === n + n
  ),
  { 
    numRuns: 100,
    verbose: true
  }
)
```

- 使用输出中的 `seed` 与 `path` 复现失败用例：

```javascript
// 在测试中固定 seed 复现
fc.assert(
  fc.property(myArb, (v) => /* predicate */),
  { seed: -1952293897, verbose: true }
)
```

- 常见失败原因与对策：
  - 输入不满足隐含前置条件：在 property 中使用 `fc.pre()` 或改进 Arbitrary 来过滤/约束输入（例如：价格数组长度至少为 N）。
  - 边界未处理：在实现中添加防御性检查（例如 `IndicatorCalculator` 必须接受恒定数组或含 NaN 的数据并返回可定义的结果或抛出明确错误）。
  - 隔离的不确定性：如果测试依赖全局状态，请在 property 中重置或 mock 环境。

- 复现 `StrategyManager.property.test.js` 中失败的策略相关问题：生成器可能产生返回 `null` 或非法 `onBar` 的策略，改进 Arbitrary 或在 `BacktestEngine` 中硬化对 `undefined`/`null` 信号的处理。

如果你希望，我可以把本次 property 运行的关键失败（BacktestEngine / IndicatorCalculator / StrategyManager）记录为 issue 并列出具体修复建议与 PR 模板。

## 持续集成

测试会在以下情况自动运行：

1. 代码提交前（pre-commit hook）
2. Pull Request创建时
3. 合并到主分支时

## 常见问题

### Q: 测试运行很慢怎么办？

A: 
- 使用 `it.only()` 只运行特定测试
- 减少属性测试的 `numRuns` 数量（开发时）
- 使用 `--run` 标志避免watch模式

### Q: 如何跳过某个测试？

A:
```javascript
it.skip('暂时跳过的测试', () => {
  // ...
})
```

### Q: 如何模拟异步操作？

A:
```javascript
it('应该处理异步操作', async () => {
  const result = await asyncFunction()
  expect(result).toBe('expected')
})
```

## 参考资源

- [Vitest文档](https://vitest.dev/)
- [fast-check文档](https://fast-check.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [设计文档中的正确性属性](../.kiro/specs/zpoint-quant/design.md#正确性属性)
