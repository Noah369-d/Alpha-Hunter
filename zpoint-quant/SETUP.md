# Zpoint Quant 安装指南

## 前置要求

在开始之前，请确保您的系统已安装：

- **Node.js** (版本 18.0 或更高)
  - 下载地址：https://nodejs.org/
  - 验证安装：`node --version`

- **npm** (通常随Node.js一起安装)
  - 验证安装：`npm --version`

## 快速开始

### Windows用户

1. 双击运行 `start.bat` 文件
2. 首次运行会自动安装依赖
3. 浏览器会自动打开 http://localhost:3000

### 手动安装

1. **安装依赖**
   ```bash
   cd zpoint-quant
   npm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   ```

3. **打开浏览器**
   访问 http://localhost:3000

## 常见问题

### 问题1：npm命令无法识别

**解决方案**：
- 确保Node.js已正确安装
- 重启命令行窗口
- 检查环境变量PATH中是否包含Node.js路径

### 问题2：端口3000已被占用

**解决方案**：
- 修改 `vite.config.js` 中的端口号
- 或者关闭占用3000端口的其他程序

### 问题3：依赖安装失败

**解决方案**：
- 尝试使用淘宝镜像：`npm install --registry=https://registry.npmmirror.com`
- 清除npm缓存：`npm cache clean --force`
- 删除node_modules文件夹后重新安装

## 下一步

安装完成后，您可以：

1. 查看[需求文档](../.kiro/specs/zpoint-quant/requirements.md)了解系统功能
2. 查看[设计文档](../.kiro/specs/zpoint-quant/design.md)了解系统架构
3. 查看[任务列表](../.kiro/specs/zpoint-quant/tasks.md)了解开发进度

## 开发工具推荐

- **VS Code**：推荐的代码编辑器
  - 安装Vue插件：Volar
  - 安装ESLint插件
  - 安装Prettier插件

## 获取帮助

如果遇到问题，请：
1. 查看本文档的常见问题部分
2. 查看项目的GitHub Issues
3. 联系项目维护者
