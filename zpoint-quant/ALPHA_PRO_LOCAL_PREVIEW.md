运行本地开发服务器并预览 Alpha Pro 界面

1. 安装依赖（如尚未安装）：

```bash
npm install
```

2. 启动开发服务器：

```bash
npm run dev
```

3. 在浏览器打开页面（默认 Vite 端口为 `5173`）：

- 直接打开： http://localhost:5173/alpha-pro
- 或在 Windows 上用命令行自动打开：

```powershell
start http://localhost:5173/alpha-pro
```

说明：
- 页面包含：筛选面板、股票输入、扫描（调用 `scanSymbol`）、任务队列（带进度/暂停/继续）与狙击池。
- 如果要运行单独的组件测试：

```bash
npx vitest run src/components/AlphaHunter/TaskQueue.test.js
```
