# 目的
为 AI 代理快速上手本仓库：关键组件、工作流、约定与可直接运行的示例命令。

## 快速概览 ✅
- **前端**：Vue 3 + Pinia（入口 `src/main.js`；页面 `src/views/`，组件 `src/components/`）。
- **域逻辑（无 UI）**：`src/utils/`（Backtest、Indicators、MarketData、Signal、Cache），以单元 + 属性测试为规范。
- **网络**：`src/utils/MarketDataAdapter.js`（yfinance 调用，10s 超时；使用 `createError(code,msg,context)`；429/5xx 标记 `retryable`；`retryWithBackoff` 实现指数退避）。
- **缓存**：`src/utils/CacheManager.js`（IndexedDB、LRU + TTL；常用 `generateKey(symbol,interval,start,end)`）。
- **策略执行**：`src/utils/BacktestEngine.js`（策略通过 `new Function('data','indicators','state', code)` 动态编译执行 — 注意安全与异常处理）。
- **信号**：`src/utils/SignalGenerator.js`（属性测试 `src/utils/SignalGenerator.property.test.js` 当前被 `describe.skip`，这是常见的优先修复点）。

## 必读文件（快速定位）
- `src/utils/BacktestEngine.js` — 策略运行时、交易模拟、指标计算。
- `src/utils/MarketDataAdapter.js` — HTTP 调用、错误建模、退避重试逻辑。
- `src/utils/CacheManager.js` — IndexedDB 操作与 LRU 淘汰实现。
- `src/utils/SignalGenerator*.js` — 信号生成、IndexedDB 持久化、单元与属性测试。
- `src/test/setup.js` — 全局测试 mocks（`fake-indexeddb`、`LocalStorageMock`）及 helper：`createMockMarketData`、`createMockStrategy`。

## 运行 & 调试 🔧
- 本地开发：`npm run dev`
- 单元测试（排除属性测试）：`npm run test:unit`
- 属性测试（fast-check）：`npm run test:property` （在 `vitest.config.js` 中 `propertyTesting.numRuns` 可调整）
- 全量测试（CI 风格）：`npm run test:run` 或在 Windows 使用仓库脚本：`run-tests.bat` / `fix-and-test.bat`
- 单文件运行示例：`npx vitest run src/utils/SignalGenerator.test.js`
- 覆盖率阈值：80%（见 `vitest.config.js`）

## 项目约定 & 实务提示 📌
- **测试即规范**：遇到 `describe.skip`（尤其在 `SignalGenerator` 的属性测试）优先评估并修复后移除 skip。
- **错误对象**：统一使用 `createError(code,message,context)`；确保 `.code`, `.context`, `.timestamp`, `.retryable` 在 tests 中得到校验。
- **重试逻辑**：实现网络调用时覆盖 `retryable` 和 `non-retryable` 分支（`NETWORK_ERROR`/`RATE_LIMIT`/`SERVER_ERROR`）。
- **IndexedDB 测试**：复用 `src/test/setup.js` 的 mocks，写入/清理操作要在 before/after 钩子中处理。
- **动态策略代码**：所有通过 `new Function` 执行的策略必须有异常与边界测试（不可信任输入）。

## PR & 提交建议 💡
- 每个功能或修复必须带相应单元或属性测试；运行 `npm run test:unit` 与 `npm run test:property` 本地验证。
- 若变更 IndexedDB schema，请同时更新 `src/test/setup.js` 并在 PR 描述中写明迁移步骤。
- 对于大范围改动，说明对 coverage 的影响并附上复现步骤或截图。

---
需要我将上述某项（例如：修复 `SignalGenerator` 的一个属性测试）自动实现为补丁并本地运行测试吗？告诉我优先级，我会继续。
