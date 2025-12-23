# ARCHITECTURE.md

目的：概述 Zpoint-Quant 的整体架构、组件边界、主要数据流与设计理由，帮助开发者快速定位职责并安全改动。

## 大局观（为什么这样组织）
- 前端层：Vue 3 + Pinia；路由与页面在 `src/views/`，可交互组件在 `src/components/`。
- 域逻辑层（无 UI）：位于 `src/utils/`，包含回测、指标计算、市场数据适配器、信号生成与缓存等。该层由测试驱动（单元 + 属性测试）。
- 外部适配器：对网络/第三方（如 yfinance）的调用集中在 `MarketDataAdapter.js`，统一错误建模与重试策略，便于监控与降级。
- 缓存/持久化：使用 `CacheManager.js` 封装 IndexedDB（LRU + TTL），减少外部请求，支持本地回放。
- 策略运行时：策略由字符串 `code` 字段以 `new Function(...)` 动态编译执行（见 `BacktestEngine.js`），因此输入校验、隔离与测试非常关键。

## 主要组件与责任（文件示例）
- 回测：`src/utils/BacktestEngine.js` — 负责按条遍历历史数据、执行策略（onBar）、模拟交易并计算指标。
- 市场数据：`src/utils/MarketDataAdapter.js` — 请求 yfinance、解析并标准化数据，抛出标准化错误（见 `createError`）。
- 缓存：`src/utils/CacheManager.js` — IndexedDB 操作，LRU 淘汰和过期清理（`generateKey`, `evictIfNeeded`）。
- 信号生成：`src/utils/SignalGenerator.js`（当前存在测试/实现差异，参见 `SignalGenerator.test.js` 与 repo issue 文档）。
- 测试帮助：`src/test/setup.js` — 提供 `fake-indexeddb`、`LocalStorageMock` 与 `createMockMarketData`/`createMockStrategy`。

## 数据流（简要）
1. UI/用户触发 -> 请求市场数据（`MarketDataAdapter.fetchData`）
2. `MarketDataAdapter` 尝试从 `CacheManager` 读取 -> 若未命中，调用 yfinance -> 标准化后写入缓存
3. 回测/策略执行通过 `BacktestEngine` 加载历史数据并以 `new Function` 执行策略代码，生成信号
4. 信号流入策略执行记录与性能计算，必要时外部通知/持久化

## 错误与重试设计
- 使用 `createError(code, message, context)` 生成标准错误，包含 `.code`, `.context`, `.timestamp`, `.retryable`。
- `retryWithBackoff` 在 `MarketDataAdapter` 中实现：对 `NETWORK_ERROR`、`RATE_LIMIT`、`SERVER_ERROR` 等可重试错误使用指数退避，超过 `maxRetries` 抛 `MAX_RETRIES_EXCEEDED`。

## 安全与易错点
- 动态执行：策略代码通过 `new Function` 运行，必须通过测试覆盖恶意/异常行为并考虑未来引入沙箱措施（例如 VM2 或隔离进程）。
- IndexedDB 模式变更：若更改 `CacheManager` 的数据库 schema，请在 PR 中包含迁移步骤并更新测试 setup。
- 脆弱的 E2E：Playwright 依赖 dev server 或 preview 在 CI 中可访问，CI 脚本需先启动服务或用 `vite preview`。

## 改进建议（高优先级）
- 明确策略执行沙箱策略（是否允许 IO、网络）。
- 为 `MarketDataAdapter` 增加可注入的 HTTP client 以便更容易 Mock 与测试超时/重试。
- 将关键集成测试（MarketDataAdapter 回退分支、CacheManager LRU）加入 CI 的快速套件。

---
（需要我将本文件细化为图（Mermaid）或直接生成到仓库 wiki 吗？）