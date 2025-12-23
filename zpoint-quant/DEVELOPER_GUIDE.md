# DEVELOPER_GUIDE.md

目的：快速让新开发者/自动化代理可以立即运行、调试和修改代码。

## 环境与安装
- Node 版本建议：在本仓库中使用 Node 16+ 或更高
- 安装依赖：
  ```bash
  npm install
  ```
- Windows helper scripts（推荐）：`install-fake-indexeddb.bat`, `install-deps.bat`

## 常用命令
- 开发服务器：`npm run dev`
- 构建生产：`npm run build`
- 单元测试：`npm run test:unit`
- 属性（property）测试：`npm run test:property`（Vitest 内部使用 `vitest run -t Property`）
- 运行所有测试（CI）：`npm run test:run`
- UI 测试：`npm run test:ui`
- 覆盖率：`npm run coverage`（结果在 `coverage/`）
- E2E：`npx playwright test`（参见 `E2E_README.md`）

## 调试技巧
- 运行单个测试文件：
  ```bash
  npx vitest run path/to/file.test.js
  ```
- 在失败的测试中可以临时加 `.only` 或使用 `--testNamePattern`。
- 网络依赖：对 `MarketDataAdapter` 使用 fetch mock（或注入可替换的 HTTP client）来控制响应与错误分支。
- IndexedDB：`src/test/setup.js` 提供 `fake-indexeddb`；如果本地遇到 DB 问题，先运行 `install-fake-indexeddb.bat`。

## 代码约定
- 错误：统一使用 `createError(code, message, context)`。
- 动态策略：任何对 `strategy.code` 的改动必须有单元测试来验证异常处理与返回值契约。
- 测试即规范：看到 `describe.skip` 时请评估是否应该修复并移除 skip。

## PR 流程（简要）
- Fork -> 新分支 -> 变更 + 测试 -> 本地跑 `npm run test:unit` 与 `npm run test:property` -> 提交 PR，并在 PR 描述中列出更改与测试覆盖情况。

---
需要我把常用命令再配上 Windows 批处理示例或 CI 模板（GitHub Actions）吗？