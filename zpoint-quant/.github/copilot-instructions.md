## 目的
为来访的 AI 编码代理提供快速上手参考：代码库的整体架构、关键工作流、约定与常见陷阱，和可直接运行的示例命令。

## 大局观（为什么这样组织）
- 前端单页应用：Vue 3 + Pinia；界面与路由在 `src/views`/`src/components`，应用入口在 `src/main.js`。
- 核心域逻辑放在 `src/utils`（回测、指标、市场数据、信号、风险、策略管理），这些模块被视为“无 UI 的业务逻辑层”，适合单元 & 属性测试。
- 异步/外部依赖通过适配器封装（例如 `MarketDataAdapter` 使用 yfinance），并在内部统一错误模型与重试策略。
- 持久化使用 IndexedDB（通过 `CacheManager`）与 LocalStorage；测试使用 `fake-indexeddb` 模拟。测试入口与全局 mock 在 `src/test/setup.js`。

## 关键文件（快速定位行为与约定）
- 回测与策略执行：`src/utils/BacktestEngine.js`（策略以字符串形式编译为 `onBar` 函数）
- 市场数据与网络：`src/utils/MarketDataAdapter.js`（fetch、重试/退避、yfinance 格式化）
- 缓存层：`src/utils/CacheManager.js`（IndexedDB + LRU + TTL）
- 信号生成（TODO / 测试规范）：`src/utils/SignalGenerator.js`（测试位于 `src/utils/SignalGenerator.test.js`，测试即规范）
- 测试 setup：`src/test/setup.js`（全局 jsdom、fake-indexeddb、LocalStorageMock、createMockMarketData）

## 项目特有的开发 & 测试工作流
- 运行开发服务器：`npm run dev`（Vite）
- 运行所有测试：`npm run test:run` 或交互式菜单 `run-tests.bat`
- 单元测试：`npm run test:unit`；属性测试（fast-check）：`npm run test:property`（测试约定：文件名含 `Property` 或 `.property.test.js`）
  - 注意：某些 Vitest 版本可能不支持 `--grep` 参数（会导致 CLI 报错），遇到此类错误时可直接运行 `npm run test`、使用 `npx vitest run`，或更新本地 Vitest 版本。
- 测试 UI：`npm run test:ui`；覆盖率：`npm run coverage`（报告输出到 `coverage/` 并可用 `coverage/index.html` 打开）
- 在 Windows 上有多种便捷批处理脚本（例如 `run-tests.bat`, `fix-and-test.bat`, `install-fake-indexeddb.bat`），优先使用它们可以复现仓库维护者的检查流程。

## 约定与模式（必须遵守的、可做参考的）
- 测试是规格：很多未实现或跳过的行为直接在 `.test.js` 里定义（例如 `SignalGenerator.test.js`），以测试为准。
- 错误对象：使用 `createError(code, message, context)` 风格，错误对象包含 `.code`、`.context` 和 `.retryable` 字段；请按此格式抛错以便上层统一处理。
- 外部请求需防护：所有外部调用应有超时、可识别错误码、并通过 `retryWithBackoff` 或等价机制重试。
- IndexedDB / LocalStorage：测试套件依赖 `src/test/setup.js` 提供的全局 mock（`fake-indexeddb` / `LocalStorageMock`），新增涉及这些存储的测试前请检查并复用 setup。
- 策略代码动态执行：策略对象内的 `code` 字段会被 `new Function()` 编译并运行（例如 `onBar` / `onSignal`），请对输入/输出及异常处理写入覆盖测试。

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
