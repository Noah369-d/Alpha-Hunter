# E2E_README.md

E2E 测试与演示说明

建议使用 Playwright 来运行示例 E2E 测试并生成截图（本库仅提供示例脚本）。

## 本地准备
- 安装 Playwright（只需在本地开发机执行一次）：

```bash
npm i -D @playwright/test
npx playwright install
```

- 启动开发服务器：
```bash
npm run dev
```

## 运行示例
- 运行 `alpha-pro` 的测试并在有界面模式下观察：
```bash
npx playwright test e2e/alpha-pro.spec.js --headed
```
输出示例：`e2e/alpha-pro-snapshot.png`（页面截图，用于 PR 预览或文档）。

- 运行 `holo-resonance` 的测试并生成截图：
```bash
npm run dev
npx playwright test e2e/holo-resonance.spec.js --headed
```
输出：`e2e/holo-resonance-snapshot.png` 包含截图。

## 无头与 CI 模式
- 在 CI/无头模式下（推荐）运行：
```bash
# 无头运行所有 E2E 测试
npx playwright test --project=chromium
```

- 如果 CI 无法直接访问 dev server，请先在 CI 中启动 `vite preview`：
```bash
# 构建并预览（在 CI job 中）
npm run build
npx vite preview --port=5173 &
# 然后运行 Playwright
npx playwright test
```

## 生成与收集测试工件
- Playwright 会在 `playwright-report` 目录生成 HTML 报告。你可以在 CI 中存储截图和报告作为 artifacts。

## GitHub Actions 示例（简要）
```yaml
name: E2E
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm ci
      - run: npm run build
      - run: npx vite preview --port=5173 &
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          CI: true
```

## 调试与常见问题
- 若截图为空或元素未加载：增加 `await page.waitForSelector('#your-element', {timeout: 5000})`。
- 若 Playwright 报端口不可达：确保 dev server / preview 已经成功运行并监听可达端口。

---
需要我把该 GitHub Actions job 写成完整的 workflow 并加入 `.github/workflows/e2e.yml` 吗？
