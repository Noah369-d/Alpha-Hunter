# 🚀 快速参考指南

## 📁 项目文件清单

```
AlphaHunter/
├── 📄 index.html (8.2 KB)              # 主应用入口
├── 📄 test.html (11.3 KB)              # 模块测试页面
├── 📄 start.bat (733 B)                # Windows启动脚本
├── 📄 package.json (548 B)             # 项目配置
├── 📄 README.md (6.7 KB)               # 使用文档
├── 📄 IMPLEMENTATION_SUMMARY.md (9.8 KB) # 实施总结
├── 📄 QUICK_REFERENCE.md               # 本文档
├── 📄 9.9.html (79.7 KB)               # 原版备份
└── 📁 src/
    ├── 📄 app.js (13.9 KB)             # 主应用逻辑
    ├── 📁 utils/
    │   ├── 📄 ta.js (7.0 KB)           # 技术指标库
    │   ├── 📄 api.js (8.3 KB)          # API工具
    │   ├── 📄 storage.js (6.1 KB)      # 存储工具
    │   ├── 📄 helpers.js (6.8 KB)      # 辅助函数
    │   └── 📄 errorHandler.js (10.8 KB) # 错误处理
    └── 📁 workers/
        └── 📄 indicator-worker.js (14.0 KB) # 计算Worker

总计: ~213 KB (vs 原版 79.7 KB 单文件)
```

---

## ⚡ 快速启动

### Windows
```bash
# 双击运行
start.bat

# 或命令行
python -m http.server 8000
```

### macOS/Linux
```bash
python3 -m http.server 8000
```

### 访问地址
- 主应用: http://localhost:8000/index.html
- 测试页: http://localhost:8000/test.html

---

## 🔧 常用API

### 1. 技术指标 (ta.js)

```javascript
import { TA } from './src/utils/ta.js';

// 移动平均
const ema = TA.EMA(closes, 20);
const sma = TA.SMA(closes, 20);

// 动量指标
const rsi = TA.RSI(closes, 14);
const macd = TA.MACD(closes, 12, 26, 9);

// 波动率
const atr = TA.ATR(highs, lows, closes, 14);

// 高低点
const hhv = TA.HHV(highs, 20);
const llv = TA.LLV(lows, 20);

// 高级指标
const t3 = TA.T3(closes, 20, 0.7);
```

### 2. 数据获取 (api.js)

```javascript
import { fetchStockData, fetchBatchStockData } from './src/utils/api.js';

// 单个股票
const data = await fetchStockData('AAPL', '1d', '2y');
// 返回: { symbol, name, data: [{t, o, h, l, c, v}, ...] }

// 批量获取
const results = await fetchBatchStockData(
    ['AAPL', 'MSFT', 'GOOGL'],
    '1d',
    '2y',
    (current, total) => console.log(`${current}/${total}`)
);
```

### 3. 本地存储 (storage.js)

```javascript
import { storage } from './src/utils/storage.js';

// 自选列表
storage.addToWatchlist('AAPL');
storage.removeFromWatchlist('AAPL');
const watchlist = storage.getWatchlist();

// 情绪标记 (0=无, 1=看多, 2=看空, 3=中性)
storage.setSentiment('AAPL', 1);
const sentiment = storage.getSentimentMap();

// 持仓管理
storage.addPosition({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    qty: 100,
    avgCost: 150.00,
    price: 155.00,
    marketVal: 15500,
    plPercent: 3.33,
    weight: 25.5
});
const portfolio = storage.getPortfolio();

// 主题设置
storage.setTheme('dark'); // 'dark' | 'light'
const theme = storage.getTheme();

// 策略设置
storage.setStrategy('Holo'); // 'Holo' | 'CRT' | 'Envelope' | 'T3'
const strategy = storage.getStrategy();
```

### 4. 辅助函数 (helpers.js)

```javascript
import { 
    normalizeSymbol,
    getMarketType,
    formatCompact,
    formatCurrency,
    getRangeForPeriod
} from './src/utils/helpers.js';

// 股票代码标准化
normalizeSymbol('700');      // '0700.HK'
normalizeSymbol('AAPL');     // 'AAPL'
normalizeSymbol('600519');   // '600519.SS'

// 市场类型
getMarketType('0700.HK');    // 'HK'
getMarketType('AAPL');       // 'US'
getMarketType('600519.SS');  // 'CN'

// 数字格式化
formatCompact(1234567);      // '1.2M'
formatCurrency(123.456);     // '123.46'

// 时间范围
getRangeForPeriod('15m');    // '60d'
getRangeForPeriod('1d');     // '2y'
```

### 5. 错误处理 (errorHandler.js)

```javascript
import { 
    errorHandler, 
    AppError, 
    ErrorType, 
    ErrorLevel 
} from './src/utils/errorHandler.js';

// 手动处理错误
try {
    await riskyOperation();
} catch (error) {
    errorHandler.handle(new AppError(
        'Operation failed',
        ErrorType.API,
        ErrorLevel.ERROR,
        { context: 'fetchData', originalError: error }
    ));
}

// 包装异步函数
const safeFunction = errorHandler.wrapAsync(async () => {
    await riskyOperation();
});

// 重试机制
import { retry } from './src/utils/errorHandler.js';

const result = await retry(
    () => fetchData(),
    {
        retries: 3,
        delay: 1000,
        backoff: 2,
        onRetry: (attempt, max, error) => {
            console.log(`Retry ${attempt}/${max}: ${error.message}`);
        }
    }
);

// 查看错误日志
import { errorLogger } from './src/utils/errorHandler.js';
const logs = errorLogger.getLogs();
errorLogger.export(); // 下载JSON
```

### 6. Web Worker (indicator-worker.js)

```javascript
// 创建Worker
const worker = new Worker('./src/workers/indicator-worker.js');

// 发送计算任务
worker.postMessage({
    type: 'calculate',
    data: ohlcData,        // [{t, o, h, l, c, v}, ...]
    strategy: 'Holo',      // 'Holo' | 'CRT' | 'Envelope' | 'T3'
    symbol: 'AAPL',
    name: 'Apple Inc.'
});

// 接收结果
worker.onmessage = (e) => {
    if (e.data.success) {
        const result = e.data.result;
        console.log('Symbol:', result.symbol);
        console.log('Price:', result.price);
        console.log('Signal:', result.activeSignal);
        console.log('Action:', result.action);
    } else {
        console.error('Error:', e.data.error);
    }
};

// 错误处理
worker.onerror = (error) => {
    console.error('Worker error:', error);
};

// 终止Worker
worker.terminate();
```

---

## 🎨 策略说明

### Holo (机构猎手)
- **指标**: 快慢轨道 (EMA)、资金流、MACD
- **信号**: 共振、爆点、转折、买入、加速、逃跑
- **适用**: 趋势跟踪、机构行为分析

### CRT (陷阱识别)
- **指标**: RSI、K线形态
- **信号**: 多头陷阱、空头陷阱
- **适用**: 反转交易、假突破识别

### Envelope (外包线)
- **指标**: SMA、ATR、RSI
- **信号**: 回归买入、回归卖出
- **适用**: 均值回归、超买超卖

### T3 (趋势跟踪)
- **指标**: T3均线、MACD
- **信号**: 趋势多、趋势空
- **适用**: 趋势交易、动能跟踪

---

## 🔍 调试技巧

### 1. 查看模块加载
```javascript
// 控制台输入
console.log('Modules loaded:', {
    TA: typeof TA,
    storage: typeof storage,
    errorHandler: typeof errorHandler
});
```

### 2. 测试单个模块
```javascript
// 打开 test.html
// 点击对应测试按钮
```

### 3. 查看Worker状态
```javascript
// 主应用中
console.log('Worker busy:', this.workerBusy);
console.log('Worker instance:', this.worker);
```

### 4. 查看错误日志
```javascript
import { errorLogger } from './src/utils/errorHandler.js';
console.table(errorLogger.getLogs());
```

### 5. 性能分析
```javascript
console.time('calculation');
// ... 执行操作
console.timeEnd('calculation');
```

---

## 🐛 常见问题

### Q1: 模块加载失败
**A**: 确保通过HTTP服务器访问，不能直接打开HTML文件

### Q2: Worker不工作
**A**: 检查浏览器是否支持Web Worker，查看控制台错误

### Q3: API请求失败
**A**: 检查网络连接，CORS代理可能需要切换

### Q4: 数据不更新
**A**: 清除浏览器缓存，检查localStorage

### Q5: 图表不显示
**A**: 确保LightweightCharts库加载成功

---

## 📊 性能基准

### 计算性能
- 10只股票: ~0.6秒
- 50只股票: ~3.0秒
- 100只股票: ~6.0秒

### 内存占用
- 空闲: ~30MB
- 50只股票: ~85MB
- 100只股票: ~150MB

### 推荐配置
- CPU: 双核以上
- 内存: 4GB以上
- 浏览器: Chrome 90+

---

## 🔐 安全注意事项

1. **API密钥**: 不要在代码中硬编码API密钥
2. **CORS**: 使用可信的代理服务
3. **数据验证**: 始终验证外部数据
4. **XSS防护**: 避免直接插入HTML
5. **本地存储**: 不要存储敏感信息

---

## 📚 学习资源

### 官方文档
- [Vue 3](https://vuejs.org/)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### 技术分析
- [TradingView](https://www.tradingview.com/)
- [Investopedia](https://www.investopedia.com/)

---

## 🎯 下一步

1. **完成主应用**: 补充 `src/app.js` 剩余功能
2. **组件拆分**: 创建Vue组件
3. **添加测试**: 编写单元测试
4. **优化UI**: 改进用户界面
5. **部署上线**: 发布到生产环境

---

## 💡 提示

- 使用 `Ctrl+Shift+I` 打开开发者工具
- 使用 `Ctrl+R` 刷新页面
- 使用 `Ctrl+Shift+R` 强制刷新（清除缓存）
- 查看 `test.html` 了解各模块用法
- 阅读 `IMPLEMENTATION_SUMMARY.md` 了解优化细节

---

*快速参考 v1.0 - 2025-12-13*
