# Zpoint Quant - 个人量化交易系统

一个综合性的个人量化交易系统，支持策略回测、数据分析和交易策略编写。

## 功能特性

- 📊 **多市场支持**：美股、港股、A股、加密货币、期货
- 📝 **策略编写**：内置代码编辑器，支持自定义交易策略
- 📈 **技术指标**：MA、RSI、MACD、布林带、KDJ等常用指标
- 🔄 **策略回测**：在历史数据上测试策略性能
- 🔔 **信号推送**：实时交易信号通知
- ⚠️ **风险管理**：止损止盈、持仓控制、回撤限制
- 📉 **数据分析**：可视化图表和性能报告

## 技术栈

- **前端框架**：Vue 3 (Composition API)
- **构建工具**：Vite
- **状态管理**：Pinia
- **图表库**：Lightweight Charts
- **代码编辑**：Monaco Editor
- **测试框架**：Vitest + fast-check
- **数据源**：yfinance (免费)

## 开发指南

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

### 测试覆盖率

```bash
npm run coverage
```

## 项目结构

```
zpoint-quant/
├── src/
│   ├── components/     # Vue组件
│   ├── composables/    # Vue Composables
│   ├── utils/          # 工具函数
│   ├── workers/        # Web Workers
│   ├── stores/         # Pinia状态管理
│   ├── views/          # 页面视图
│   ├── router/         # 路由配置
│   ├── test/           # 测试文件
│   ├── App.vue         # 根组件
│   └── main.js         # 入口文件
├── public/             # 静态资源
├── .kiro/              # Kiro配置
│   └── specs/          # 功能规格文档
├── index.html          # HTML模板
├── vite.config.js      # Vite配置
└── package.json        # 项目配置
```

## 文档

详细的设计文档和需求文档请查看：
- [需求文档](.kiro/specs/zpoint-quant/requirements.md)
- [设计文档](.kiro/specs/zpoint-quant/design.md)
- [任务列表](.kiro/specs/zpoint-quant/tasks.md)

---

## 维护 & 归档策略 📦

为保持仓库整洁并避免测试噪声，我们采用保守的“归档”策略：

- 过时或重复的脚本、示例、演示和临时 repro 测试会被移动到 `archive/` 目录（而非直接删除）。
- 对归档测试文件：通过将后缀由 `.test.js` 重命名为 `.test.js.disabled` 来**临时禁用**，以便保留历史但不被 Vitest 自动运行。
- 归档目录结构建议：
  - `archive/scripts/` — 过时的运行/安装脚本
  - `archive/docs/` — 合并后的旧文档或历史参考稿
  - `archive/demos/` — 老的 HTML 预览/演示文件
  - `archive/tools/` — 小工具与临时修复脚本
  - `archive/tests-repro/` — 临时的 reproducer 测试（迁移后改名禁用）
- 恢复流程：若需要恢复某个文件，从 `archive/` 移回并恢复文件名（或打开 PR 恢复并添加说明），并运行 `npm run test:unit` 与 `npm run test:property` 验证。
- 删除准则：归档后 90 天内未被引用或恢复且没有正当保留理由，可考虑在发出通知后永久删除（需在 PR 中列出并获得维护者审批）。

请在 PR 描述中记录 **为何** 要归档、移动的具体文件列表以及运行的测试结果（见本次 PR 示例）。

---

## 许可证

MIT
