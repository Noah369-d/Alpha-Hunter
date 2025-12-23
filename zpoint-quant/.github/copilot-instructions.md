## 目的
为来访的 AI 编码代理提供快速上手参考：代码库的整体架构、关键工作流、约定与常见陷阱，和可直接运行的示例命令。

## 快速概览
- 前端：Vue 3 + Pinia（入口 `src/main.js`，页面在 `src/views/`，组件在 `src/components/`）。
- 业务/域逻辑：集中在 `src/utils/`（Backtest、Indicators、MarketData、Signal、Cache），这些模块为“无 UI 的域逻辑”，以单元 + 属性测试为规范。
- 网络/外部：由适配器封装（`MarketDataAdapter.js`），统一错误与重试策略；缓存使用 `CacheManager.js`（IndexedDB + LRU + TTL）。
- 测试：Vitest + fast-check（property tests），测试全局 mock 在 `src/test/setup.js`（`fake-indexeddb`、`LocalStorageMock`）。

## 必读文件（优先打开）
- `src/utils/BacktestEngine.js` — 策略通过 `new Function('data','indicators','state', code)` 编译并运行（务必测试异常、边界和返回值）。
- `src/utils/MarketDataAdapter.js` — 网络层：yfinance 调用、`createError(code,message,context)`、`retryWithBackoff(fn, ctx)`、默认超时 10s。注意：429／500 标记为 `retryable`。示例：`createError('RATE_LIMIT', ..., { retryable: true })`。
- `src/utils/CacheManager.js` — IndexedDB + LRU + TTL，常用方法：`generateKey(symbol,interval,start,end)`、`get/set/cleanExpired/evictIfNeeded`。
- `src/utils/SignalGenerator.js` + `src/utils/SignalGenerator.test.js` — 当前为重点修复目标（见项目文档与测试中的 `describe.skip`）。
- `src/test/setup.js` — 全局测试 mocks（`fake-indexeddb` 和 `LocalStorageMock`），请复用其中的 helper：`createMockMarketData`、`createMockStrategy`。

## 项目特有的开发 & 测试工作流
- 本地开发：`npm run dev`（Vite）
- 单元测试：`npm run test:unit`（默认排除 `.property.test.js`）
- 属性测试：`npm run test:property`（内部使用 `vitest run -t Property` —— 请用此命令而不是依赖 `--grep`）
- 运行所有测试（CI 风格）：`npm run test:run` 或使用 `run-tests.bat`（Windows 下优先使用仓库提供的批处理脚本以复现维护者环境）
- UI 测试与覆盖率：`npm run test:ui` / `npm run coverage`（查看 `coverage/index.html`）
- E2E：`npx playwright test`（E2E 测试位于 `e2e/*.spec.js`，Playwright 配置在 `playwright.config.js`）
- 常用 Windows 脚本：`run-tests.bat`, `run-all-tests.bat`, `fix-and-test.bat`, `install-fake-indexeddb.bat`。

## 约定与模式（必须遵守的、可做参考的）
- 测试是规格：很多未实现或跳过的行为在测试中声明（例：`SignalGenerator.test.js` 常含 `describe.skip`）。以测试为准，修复后移除 skip 并回归测试。
- 错误对象：使用 `createError(code, message, context)`；标准字段：`.code`、`.context`、`.timestamp`、`.retryable`（布尔）。示例：
  - `createError('RATE_LIMIT','API rate limit',{symbol, retryable: true})`
- 重试/退避：`retryWithBackoff(fn, ctx)` 使用指数退避（见 `MarketDataAdapter`）；函数会根据 `error.retryable` 或特定 codes (`NETWORK_ERROR`, `RATE_LIMIT`, `SERVER_ERROR`) 决定是否重试。
- 动态策略安全：策略 `code` 字段通过 `new Function` 运行（见 `BacktestEngine`），务必在单元测试中覆盖不良输入、异常抛出和返回值约束。
- 存储 mock：测试依赖 `fake-indexeddb` 和 `LocalStorageMock`（`src/test/setup.js`），新增缓存/DB 相关测试前请复用此 setup。

## 示例任务（如何快速动手）
- 修复或实现 `SignalGenerator`：参照 `src/utils/SignalGenerator.test.js` 编写实现，使所有测试通过；注意 `describe.skip` 表示这些测试目前被跳过，先把跳过移除再运行 `npm run test:unit`。
- 增加属性测试：在 `src/utils/*.property.test.js` 中使用 `fast-check`，并用 `npm run test:property` 验证属性稳定性（Vitest 配置中的 `propertyTesting.numRuns` 可调整）。
- 调试网络调用：在 `MarketDataAdapter._fetchDataInternal` 使用带 Mock fetch 的单测并覆盖错误分支（404、429、500、空数据、网络错误）。

## 提交与 PR 小贴士
- 保持测试通过：任何改动必须有对应单元或属性测试；先运行 `npm run test:unit` 与 `npm run test:property`。
- 覆盖率阈值在 `vitest.config.js` 中定义（80%），若做大范围重构，请在 PR 描述中说明覆盖率变化及理由。

## 仍需确认的细节（请在 PR 描述中列出）
- Signal/策略执行的安全沙箱策略（是否允许全局访问、IO、网络）。
- 实际生产环境下的 yfinance 代理与 CORS 处理策略。

如果你希望我将示例任务中的某个自动化地实现（例如：实现 `SignalGenerator` 并加入测试），告诉我想先做哪项，我会按仓库约定编写代码 + 测试并运行验证。
