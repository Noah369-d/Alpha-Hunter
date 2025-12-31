# StrategyManager LocalStorage 时序问题修复总结

## 问题描述
StrategyManager 的属性测试中出现 6 个 Unhandled Rejections，都是 "Strategy not found" 错误。

## 根本原因
**LocalStorage 时序竞争条件**：
- 多个属性测试并发运行时，它们共享同一个 LocalStorage
- 当一个测试的 `clearAll()` 被调用时，会清空 LocalStorage
- 其他正在运行的测试可能会在保存策略后、加载策略前，遇到 LocalStorage 被清空的情况
- 导致 "Strategy not found" 错误

## 修复方案

### 1. 为每个属性测试创建独立的 manager 实例
**修改前**：所有测试共享 `beforeEach` 中创建的 `manager` 实例

**修改后**：每个属性测试内部创建独立的 `testManager` 实例，并在 `finally` 块中清理

```javascript
async (strategyData) => {
  // 为每个属性测试创建独立的 manager 实例
  const testManager = new StrategyManager()
  await testManager.clearAll()

  try {
    // 测试逻辑
    const strategy = testManager.createStrategy(...)
    await testManager.saveStrategy(strategy)
    const loaded = await testManager.loadStrategy(strategy.id)
    // 验证...
    return true
  } finally {
    // 清理测试数据
    await testManager.clearAll()
  }
}
```

### 2. 将依赖 LocalStorage 状态的测试标记为串行执行
使用 `describe.sequential()` 和 `test.sequential()` 确保测试按顺序执行：

```javascript
describe.sequential('Property 2: 策略持久化往返一致性', () => {
  test.sequential('Property 2.2: Persistence across manager instances', async () => {
    // ...
  })
})
```

## 修复结果

### 修复前
- **6 个 Unhandled Rejections**
- 所有涉及 LocalStorage 的属性测试都失败
- 错误：`Strategy not found: strategy_xxx`

### 修复后
- **2 个 Unhandled Rejections**（减少了 67%）
- 大部分 LocalStorage 相关测试通过
- 剩余 2 个问题：
  1. Property 2.1: Multiple strategies persistence - 返回 false
  2. Property: Duplicate strategy creates independent copy - 返回 false

## 剩余问题分析

剩余的 2 个 Unhandled Rejections 不是 "Strategy not found" 错误，而是属性测试返回 false。这表明：
- 不是时序问题导致的
- 是测试断言失败
- 可能是测试逻辑或实现逻辑的问题

需要进一步调查这两个测试的具体失败原因。

## 修改的文件
- `zpoint-quant/src/utils/StrategyManager.property.test.js`
  - 所有属性测试都使用独立的 manager 实例
  - 添加 `finally` 块确保清理
  - 将 LocalStorage 相关的 describe 标记为 sequential

## 测试结果
```
Test Files  1 failed (1)
Tests  2 failed | 9 passed (11)
Errors  2 errors
```

**通过率**：9/11 = 82% (之前是 0%)

## 下一步
1. 调查 Property 2.1 失败的具体原因
2. 调查 Property: Duplicate strategy 失败的具体原因
3. 可能需要添加更详细的日志来诊断问题
