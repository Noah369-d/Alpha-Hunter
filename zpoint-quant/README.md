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

## 许可证

MIT
