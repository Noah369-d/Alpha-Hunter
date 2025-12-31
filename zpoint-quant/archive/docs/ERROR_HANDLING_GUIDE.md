# MarketDataAdapter 错误处理指南

## 快速参考

### 错误代码速查表

| 代码 | 含义 | 重试 | 处理建议 |
|------|------|------|---------|
| `INVALID_SYMBOL` | Symbol格式错误 | ❌ | 检查symbol格式 |
| `SYMBOL_NOT_FOUND` | Symbol不存在 | ❌ | 确认symbol是否正确 |
| `NETWORK_ERROR` | 网络连接失败 | ✅ | 自动重试，检查网络 |
| `RATE_LIMIT` | API限流 | ✅ | 自动重试，降低请求频率 |
| `SERVER_ERROR` | 服务器错误 | ✅ | 自动重试，稍后再试 |
| `MAX_RETRIES_EXCEEDED` | 重试次数用尽 | ❌ | 检查网络或稍后再试 |

## 配置选项

```javascript
const adapter = new MarketDataAdapter({
  // 缓存配置
  cacheEnabled: true,           // 是否启用缓存
  cacheTTL: 5 * 60 * 1000,     // 缓存过期时间（毫秒）
  
  // 重试配置
  maxRetries: 3,                // 最大重试次数
  initialRetryDelay: 1000,      // 初始重试延迟（毫秒）
  maxRetryDelay: 10000,         // 最大重试延迟（毫秒）
  
  // 日志配置
  maxErrorLogSize: 100          // 最大错误日志条数
})
```

## 使用示例

### 1. 基本错误处理

```javascript
try {
  const data = await adapter.fetchData('AAPL')
  console.log('Data fetched successfully:', data)
} catch (error) {
  console.error(`Error: ${error.code} - ${error.message}`)
}
```

### 2. 详细错误处理

```javascript
try {
  const data = await adapter.fetchData('AAPL')
} catch (error) {
  switch (error.code) {
    case 'INVALID_SYMBOL':
      alert('请输入有效的股票代码')
      break
    
    case 'SYMBOL_NOT_FOUND':
      alert('找不到该股票代码，请检查是否正确')
      break
    
    case 'NETWORK_ERROR':
      alert('网络连接失败，请检查网络设置')
      break
    
    case 'RATE_LIMIT':
      alert('请求过于频繁，请稍后再试')
      break
    
    case 'MAX_RETRIES_EXCEEDED':
      alert(`多次重试失败: ${error.context.lastError}`)
      break
    
    default:
      alert(`未知错误: ${error.message}`)
  }
}
```

### 3. 查看错误日志

```javascript
// 获取最近10条错误
const recentErrors = adapter.getErrorLog(10)
console.log('Recent errors:', recentErrors)

// 清空错误日志
adapter.clearErrorLog()
```

### 4. 自定义重试逻辑

```javascript
const adapter = new MarketDataAdapter({
  maxRetries: 5,              // 增加重试次数
  initialRetryDelay: 500,     // 减少初始延迟
  maxRetryDelay: 5000         // 减少最大延迟
})
```

## Symbol格式规范

### 美股
```javascript
'AAPL'    // Apple
'MSFT'    // Microsoft
'TSLA'    // Tesla
```

### 港股
```javascript
'0700.HK'  // 腾讯
'9988.HK'  // 阿里巴巴
```

### A股
```javascript
'000001.SS'  // 上证指数（上交所）
'000001.SZ'  // 平安银行（深交所）
```

### 加密货币
```javascript
'BTC-USD'  // 比特币
'ETH-USD'  // 以太坊
```

### 期货
```javascript
'ES=F'  // E-mini S&P 500
'GC=F'  // 黄金期货
```

## 错误对象结构

```javascript
{
  code: 'NETWORK_ERROR',           // 错误代码
  message: 'Network failed',       // 错误消息
  context: {                       // 错误上下文
    symbol: 'AAPL',
    originalError: '...',
    retryable: true
  },
  timestamp: Date,                 // 错误时间
  retryable: true,                 // 是否可重试
  stack: '...'                     // 堆栈跟踪
}
```

## 重试机制说明

### 指数退避算法

重试延迟按指数增长：

```
尝试 1: 立即执行
尝试 2: 延迟 1秒 (1000ms)
尝试 3: 延迟 2秒 (2000ms)
尝试 4: 延迟 4秒 (4000ms)
...
```

最大延迟不超过 `maxRetryDelay`（默认10秒）

### 可重试的错误

- `NETWORK_ERROR`: 网络连接失败
- `RATE_LIMIT`: API限流（429）
- `SERVER_ERROR`: 服务器错误（500+）

### 不可重试的错误

- `INVALID_SYMBOL`: Symbol格式错误
- `SYMBOL_NOT_FOUND`: Symbol不存在（404）
- `HTTP_ERROR`: 其他HTTP错误（400等）
- `API_ERROR`: API返回错误
- `NO_DATA`: 没有数据
- `INVALID_DATA`: 数据无效

## 最佳实践

### 1. 总是处理错误

```javascript
// ❌ 不好
const data = await adapter.fetchData('AAPL')

// ✅ 好
try {
  const data = await adapter.fetchData('AAPL')
} catch (error) {
  // 处理错误
}
```

### 2. 验证Symbol格式

```javascript
// ✅ 在调用前验证
if (adapter.isValidSymbol(symbol)) {
  const data = await adapter.fetchData(symbol)
} else {
  console.error('Invalid symbol format')
}
```

### 3. 监控错误日志

```javascript
// 定期检查错误日志
setInterval(() => {
  const errors = adapter.getErrorLog(5)
  if (errors.length > 0) {
    console.warn('Recent errors:', errors)
  }
}, 60000) // 每分钟检查一次
```

### 4. 合理配置重试

```javascript
// 生产环境：更多重试，更长延迟
const prodAdapter = new MarketDataAdapter({
  maxRetries: 5,
  initialRetryDelay: 2000,
  maxRetryDelay: 30000
})

// 开发环境：更少重试，更短延迟
const devAdapter = new MarketDataAdapter({
  maxRetries: 2,
  initialRetryDelay: 500,
  maxRetryDelay: 5000
})
```

### 5. 用户友好的错误提示

```javascript
function getUserFriendlyMessage(error) {
  const messages = {
    'INVALID_SYMBOL': '股票代码格式不正确',
    'SYMBOL_NOT_FOUND': '找不到该股票',
    'NETWORK_ERROR': '网络连接失败，请检查网络',
    'RATE_LIMIT': '请求过于频繁，请稍后再试',
    'SERVER_ERROR': '服务器暂时不可用，请稍后再试',
    'MAX_RETRIES_EXCEEDED': '多次尝试失败，请稍后再试'
  }
  
  return messages[error.code] || '发生未知错误'
}

try {
  const data = await adapter.fetchData(symbol)
} catch (error) {
  alert(getUserFriendlyMessage(error))
}
```

## 调试技巧

### 1. 启用详细日志

```javascript
// 在开发环境中查看所有错误
adapter.getErrorLog(100).forEach(error => {
  console.log(`[${error.timestamp}] ${error.code}: ${error.message}`)
  console.log('Context:', error.context)
})
```

### 2. 模拟错误场景

```javascript
// 测试网络错误处理
global.fetch = () => Promise.reject(new TypeError('Network error'))

// 测试限流处理
global.fetch = () => Promise.resolve({
  ok: false,
  status: 429
})
```

### 3. 监控重试行为

```javascript
const originalSleep = adapter.sleep
adapter.sleep = (ms) => {
  console.log(`Retrying after ${ms}ms`)
  return originalSleep.call(adapter, ms)
}
```

## 常见问题

### Q: 为什么我的请求一直失败？

A: 检查以下几点：
1. Symbol格式是否正确
2. 网络连接是否正常
3. 是否触发了API限流
4. 查看错误日志了解详细原因

### Q: 如何减少API请求次数？

A: 
1. 启用缓存（默认已启用）
2. 增加缓存TTL
3. 避免频繁请求相同数据

### Q: 重试次数太多怎么办？

A: 减少 `maxRetries` 配置：

```javascript
const adapter = new MarketDataAdapter({
  maxRetries: 1  // 只重试一次
})
```

### Q: 如何处理缓存错误？

A: 缓存错误不会影响数据获取，系统会自动降级到直接请求API。

---

**相关文档**:
- [MarketDataAdapter API文档](./src/utils/MarketDataAdapter.js)
- [错误处理测试](./src/utils/MarketDataAdapter.error.test.js)
- [Task 3.5 完成总结](./TASK_3.5_SUMMARY.md)
