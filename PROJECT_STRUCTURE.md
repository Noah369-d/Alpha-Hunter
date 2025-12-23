# 📂 项目结构说明

## 🎯 概述

本项目采用模块化架构，将原始单文件应用重构为多模块系统，提升了可维护性和性能。

---

## 📁 完整目录结构

```
AlphaHunter/
│
├── 📄 index.html                    # 主应用入口页面
├── 📄 test.html                     # 模块测试页面
├── 📄 server.cjs                    # Node.js HTTP服务器
├── 📄 start.bat                     # Windows启动脚本
├── 📄 package.json                  # 项目配置文件
│
├── 📁 src/                          # 源代码目录
│   ├── 📄 app.js                    # 主应用逻辑（Vue组件）
│   │
│   ├── 📁 utils/                    # 工具模块
│   │   ├── 📄 ta.js                 # 技术指标库（EMA, SMA, RSI等）
│   │   ├── 📄 api.js                # API请求工具（Yahoo Finance）
│   │   ├── 📄 storage.js            # LocalStorage封装
│   │   ├── 📄 helpers.js            # 辅助函数（格式化、市场识别等）
│   │   └── 📄 errorHandler.js       # 错误处理系统
│   │
│   └── 📁 workers/                  # Web Worker
│       └── 📄 indicator-worker.js   # 后台计算引擎
│
├── 📁 public/                       # 静态资源（空）
│
├── 📁 archive/                      # 归档文件夹（不参与部署）
│   ├── 📄 README.md                 # 归档说明
│   └── 📁 legacy-versions/          # 旧版本HTML文件
│       ├── 📄 9.9.html              # 原始V10.0版本
│       ├── 📄 A+交易记录系统.html    # A+版本
│       └── 📄 Alpha Hunter System pro max.html  # Pro Max版本
│
├── 📁 .git/                         # Git版本控制
├── 📁 .vscode/                      # VS Code配置
│
├── 📄 .gitignore                    # Git忽略配置
│
├── 📄 README.md                     # 项目说明（主文档）
├── 📄 README_CN.md                  # 中文简介
├── 📄 GET_STARTED.md                # 快速开始指南
├── 📄 QUICK_REFERENCE.md            # API快速参考
├── 📄 ARCHITECTURE.md               # 架构设计文档
├── 📄 PROJECT_OVERVIEW.md           # 项目总览
├── 📄 IMPLEMENTATION_SUMMARY.md     # 实施总结
├── 📄 DELIVERY_CHECKLIST.md         # 交付清单
├── 📄 FINAL_REPORT.md               # 最终报告
├── 📄 COMPLETION_REPORT.md          # 完成报告
├── 📄 FINAL_FIX_SUMMARY.md          # 最终修复总结
├── 📄 INDEX.md                      # 文档索引
├── 📄 修复说明.md                    # 修复记录
└── 📄 PROJECT_STRUCTURE.md          # 项目结构说明（本文档）
```

---

## 🎨 核心模块说明

### 1. 入口文件

#### index.html
- **作用**: 主应用入口页面
- **技术**: Vue 3 + Tailwind CSS + LightweightCharts
- **特点**: 动态加载模块，完整UI界面

#### test.html
- **作用**: 模块单元测试页面
- **测试项**: 6个核心模块的功能测试
- **用途**: 开发调试和功能验证

### 2. 源代码模块 (src/)

#### app.js - 主应用
```javascript
// Vue 3组件，包含：
- 数据管理（股票列表、图表、交易）
- UI逻辑（多面板布局）
- 用户交互（扫描、选择、绘图）
- 生命周期管理
```

#### utils/ta.js - 技术指标库
```javascript
// 10+技术指标实现：
- EMA, SMA, WMA (移动平均)
- RSI (相对强弱指标)
- MACD (指数平滑异同移动平均线)
- ATR (真实波幅)
- T3 (Tillson T3移动平均)
- HHV, LLV (最高最低值)
```

#### utils/api.js - API工具
```javascript
// Yahoo Finance API封装：
- 股票数据获取
- 批量请求处理
- 自动重试机制
- 错误处理
- 数据格式化
```

#### utils/storage.js - 存储管理
```javascript
// LocalStorage封装：
- 自选列表管理
- 情绪标记存储
- 持仓组合管理
- 主题设置
- 策略偏好
```

#### utils/helpers.js - 辅助函数
```javascript
// 通用工具函数：
- 股票代码标准化
- 市场类型识别
- 数字格式化
- 时间处理
- 周期转换
```

#### utils/errorHandler.js - 错误处理
```javascript
// 完整错误处理系统：
- 错误分类（6种类型）
- 错误级别（4个级别）
- 日志记录
- 全局捕获
- 用户提示
```

#### workers/indicator-worker.js - 计算引擎
```javascript
// Web Worker后台计算：
- 技术指标计算
- 策略信号生成
- 趋势判断
- 非阻塞UI
- 性能优化
```

### 3. 服务器

#### server.cjs
- **作用**: Node.js HTTP服务器
- **端口**: 8000
- **功能**: 静态文件服务、CORS支持
- **用途**: 本地开发和测试

---

## 🚀 部署结构

### GitHub Pages 部署

**部署文件**（会被部署到GitHub Pages）:
```
✅ index.html              # 主应用
✅ test.html               # 测试页
✅ src/                    # 所有源代码
✅ public/                 # 静态资源
✅ README.md               # 项目说明
✅ 所有文档.md             # 文档文件
```

**不部署文件**（.gitignore排除）:
```
❌ archive/                # 归档文件夹
❌ debug.html              # 调试文件
❌ node_modules/           # 依赖包
❌ *.log                   # 日志文件
❌ 临时文件                # 各种临时文件
```

### 本地开发结构

本地开发时包含所有文件，但归档文件夹不会影响部署。

---

## 📊 文件大小统计

| 类型 | 文件数 | 总大小 | 说明 |
|------|--------|--------|------|
| 核心代码 | 7个模块 | ~60KB | src/ 目录 |
| 入口页面 | 2个 | ~20KB | index.html, test.html |
| 文档 | 15个 | ~200KB | 各种.md文件 |
| 归档 | 3个 | ~240KB | archive/（不部署） |
| 总计（部署） | ~25个 | ~280KB | 不含归档 |

---

## 🔄 版本演进

### 阶段1: 单文件版本
- **文件**: 9.9.html
- **大小**: 80KB, 1000+行
- **特点**: 所有代码在一个文件中

### 阶段2: 模块化重构
- **文件**: 7个独立模块
- **大小**: 总计60KB
- **特点**: 清晰的模块划分

### 阶段3: 功能完善
- **新增**: Web Worker, 错误处理
- **优化**: 性能提升62%
- **完善**: 完整UI和测试

---

## 🎯 使用指南

### 开发环境
```bash
# 1. 启动服务器
node server.cjs

# 2. 访问应用
http://localhost:8000/index.html

# 3. 运行测试
http://localhost:8000/test.html
```

### 生产部署
```bash
# 1. 推送到GitHub
git add .
git commit -m "Update"
git push origin main

# 2. GitHub Pages自动部署
# 访问: https://yourusername.github.io/AlphaHunter/
```

---

## 📝 文档导航

### 快速开始
- 📖 `README.md` - 项目主文档
- 🚀 `GET_STARTED.md` - 5分钟快速开始
- 📚 `QUICK_REFERENCE.md` - API快速参考

### 技术文档
- 🏗️ `ARCHITECTURE.md` - 架构设计
- 💻 `IMPLEMENTATION_SUMMARY.md` - 实施总结
- 📊 `PROJECT_OVERVIEW.md` - 项目总览

### 维护文档
- 🔧 `修复说明.md` - 修复记录
- ✅ `COMPLETION_REPORT.md` - 完成报告
- 📋 `FINAL_FIX_SUMMARY.md` - 最终修复总结

### 归档文档
- 📦 `archive/README.md` - 归档说明
- 🕰️ `archive/legacy-versions/` - 旧版本文件

---

## ⚙️ 配置文件

### package.json
```json
{
  "name": "alpha-hunter",
  "version": "10.0.0",
  "description": "全息共振交易系统 - 模块化版",
  "type": "module"
}
```

### .gitignore
```
archive/          # 归档文件夹
debug.html        # 调试文件
node_modules/     # 依赖包
*.log             # 日志文件
```

---

## 🔍 查找文件

### 按功能查找

**需要修改UI？**
→ `src/app.js` (template部分)

**需要添加指标？**
→ `src/utils/ta.js`

**需要修改API？**
→ `src/utils/api.js`

**需要调整样式？**
→ `index.html` (style部分)

**需要查看旧版本？**
→ `archive/legacy-versions/`

### 按类型查找

**源代码**: `src/`
**文档**: `*.md`
**测试**: `test.html`
**配置**: `package.json`, `.gitignore`
**归档**: `archive/`

---

## 🎓 最佳实践

### 1. 开发流程
```
1. 修改代码 → src/
2. 本地测试 → http://localhost:8000/test.html
3. 功能验证 → http://localhost:8000/index.html
4. 提交代码 → git commit
5. 推送部署 → git push
```

### 2. 文件管理
- ✅ 新功能代码放在 `src/`
- ✅ 文档更新在根目录
- ✅ 旧版本归档到 `archive/`
- ❌ 不要修改 `archive/` 中的文件

### 3. 版本控制
- ✅ 提交前运行测试
- ✅ 写清楚commit信息
- ✅ 定期推送到GitHub
- ❌ 不要提交临时文件

---

## 📞 支持

遇到问题？查看：
1. `README.md` - 基础说明
2. `修复说明.md` - 常见问题
3. `FINAL_FIX_SUMMARY.md` - 最新修复

---

**文档版本**: V1.0  
**更新日期**: 2025-12-13  
**维护状态**: ✅ 活跃维护
