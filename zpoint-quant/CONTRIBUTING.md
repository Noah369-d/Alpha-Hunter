# CONTRIBUTING.md

感谢你关注并贡献到 Zpoint-Quant。下面是简要的贡献说明与 PR 检查清单。

## 提交前检查（PR Checklist）
- [ ] 本地通过 `npm run test:unit`（并在需要时运行 `npm run test:property`）。
- [ ] 新增的功能/修复附带相应的单元测试或属性测试。
- [ ] 如果修改了持久层（IndexedDB schema），在 PR 描述中写明迁移方案。
- [ ] 更新或添加相应文档（`README.md`, `ARCHITECTURE.md`, `DEVELOPER_GUIDE.md`, `TESTING.md` 等）。
- [ ] 确认覆盖率没有意外下降（门槛：80%），若下降需在 PR 描述中说明。
- [ ] 删除不再必要的 `describe.skip` 或在 PR 中说明为何暂保留。

## 代码风格
- 遵守现有项目风格；遇到不一致时优先跟随现有实现。
- 包含清晰的注释和 JSDoc（特别是公共 API）。

## 评审期望
- 小而聚焦的提交更容易通过审查（每个 PR 专注一件事）。
- 提供复现步骤与测试用例，方便 reviewer 本地验证。

---
需要我把一个 GitHub Actions 的 CI 模板也加入仓库（运行 `npm run test:run`、`npm run coverage` 与 Playwright E2E）吗？