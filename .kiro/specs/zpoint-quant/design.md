# Zpoint Quant 设计文档

## 概述

Zpoint Quant是一个基于Web的个人量化交易系统，采用前端为主的架构设计。系统通过模块化的组件设计，提供策略编写、回测、信号生成和风险管理等核心功能。系统支持多个全球主要交易市场，包括美股、港股、A股、加密货币和期货市场。

### 设计目标

- **可扩展性**：支持轻松添加新的技术指标和交易策略
- **高性能**：利用Web Workers处理密集计算任务
- **用户友好**：提供直观的界面和完善的操作指南
- **数据安全**：本地存储用户策略和配置数据
- **实时响应**：快速生成和推送交易信号

## 架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │策略编辑器│ │图表展示  │ │信号面板  │ │设置面板  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                        业务逻辑层                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │策略管理器│ │回测引擎  │ │信号生成器│ │风险管理  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │指标计算器│ │数据分析器│ │推送服务  │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                        数据访问层                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │市场数据  │ │本地存储  │ │缓存管理  │ │API适配器 │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                        外部服务                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │美股API   │ │港股API   │ │A股API    │ │加密货币  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐                                                │
│  │期货API   │                                                │
│  └──────────┘                                                │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

- **前端框架**：Vue.js 3 (Composition API)
- **图表库**：Lightweight Charts (TradingView)
- **状态管理**：Pinia
- **计算优化**：Web Workers
- **数据存储**：IndexedDB + LocalStorage
- **代码编辑**：Monaco Editor
- **通知服务**：Notification API + Webhook
- **数据源**：yfinance（免费的Yahoo Finance数据接口）

## 组件和接口

### 1. 市场数据适配器 (MarketDataAdapter)

负责通过yfinance获取不同市场的数据。yfinance支持美股、港股、A股、加密货币和期货等多个市场。

```javascript
class MarketDataAdapter {
  /**
   * 获取市场数据（使用yfinance）
   * @param {string} symbol - 交易品种代码（如：AAPL, 0700.HK, 000001.SS, BTC-USD）
   * @param {string} interval - 时间周期（1m, 5m, 15m, 1h, 1d等）
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Promise<MarketData[]>}
   */
  async fetchData(symbol, interval, startDate, endDate)
  
  /**
   * 获取实时报价（使用yfinance）
   * @param {string} symbol - 交易品种代码
   * @returns {Promise<Quote>}
   */
  async getRealtimeQuote(symbol)
  
  /**
   * 标准化数据格式
   * @param {Object} rawData - yfinance返回的原始数据
   * @returns {MarketData}
   */
  normalizeData(rawData)
  
  /**
   * 检测市场类型
   * @param {string} symbol - 交易品种代码
   * @returns {string} 市场类型 ('US', 'HK', 'CN', 'CRYPTO', 'FUTURES')
   */
  detectMarket(symbol)
}
```

**yfinance代码格式说明：**
- 美股：直接使用代码（如：AAPL, MSFT, TSLA）
- 港股：代码.HK（如：0700.HK, 9988.HK）
- A股：代码.SS（上交所）或 代码.SZ（深交所）（如：000001.SS, 000001.SZ）
- 加密货币：代码-USD（如：BTC-USD, ETH-USD）
- 期货：使用标准期货代码（如：ES=F, GC=F）

### 2. 技术指标计算器 (IndicatorCalculator)

计算各类技术指标。

```javascript
class IndicatorCalculator {
  /**
   * 计算移动平均线
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期
   * @returns {number[]}
   */
  calculateMA(prices, period)
  
  /**
   * 计算相对强弱指标
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期
   * @returns {number[]}
   */
  calculateRSI(prices, period)
  
  /**
   * 计算MACD指标
   * @param {number[]} prices - 价格数组
   * @param {number} fastPeriod - 快线周期
   * @param {number} slowPeriod - 慢线周期
   * @param {number} signalPeriod - 信号线周期
   * @returns {Object} {macd, signal, histogram}
   */
  calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod)
  
  /**
   * 计算布林带
   * @param {number[]} prices - 价格数组
   * @param {number} period - 周期
   * @param {number} stdDev - 标准差倍数
   * @returns {Object} {upper, middle, lower}
   */
  calculateBollingerBands(prices, period, stdDev)
  
  /**
   * 计算KDJ指标
   * @param {Object[]} klines - K线数据
   * @param {number} period - 周期
   * @returns {Object} {k, d, j}
   */
  calculateKDJ(klines, period)
}
```

### 3. 策略管理器 (StrategyManager)

管理用户策略的生命周期。

```javascript
class StrategyManager {
  /**
   * 创建新策略
   * @param {string} name - 策略名称
   * @param {string} code - 策略代码
   * @param {Object} config - 策略配置
   * @returns {Strategy}
   */
  createStrategy(name, code, config)
  
  /**
   * 保存策略
   * @param {Strategy} strategy - 策略对象
   * @returns {Promise<void>}
   */
  async saveStrategy(strategy)
  
  /**
   * 加载策略
   * @param {string} strategyId - 策略ID
   * @returns {Promise<Strategy>}
   */
  async loadStrategy(strategyId)
  
  /**
   * 验证策略代码
   * @param {string} code - 策略代码
   * @returns {Object} {valid, errors}
   */
  validateStrategy(code)
  
  /**
   * 激活策略
   * @param {string} strategyId - 策略ID
   * @returns {Promise<void>}
   */
  async activateStrategy(strategyId)
  
  /**
   * 停止策略
   * @param {string} strategyId - 策略ID
   * @returns {Promise<void>}
   */
  async deactivateStrategy(strategyId)
  
  /**
   * 获取所有策略列表
   * @returns {Promise<Strategy[]>}
   */
  async listStrategies()
}
```

### 4. 回测引擎 (BacktestEngine)

执行策略回测。

```javascript
class BacktestEngine {
  /**
   * 运行回测
   * @param {Strategy} strategy - 策略对象
   * @param {MarketData[]} historicalData - 历史数据
   * @param {Object} config - 回测配置
   * @returns {Promise<BacktestResult>}
   */
  async runBacktest(strategy, historicalData, config)
  
  /**
   * 模拟交易执行
   * @param {Order} order - 订单
   * @param {number} currentPrice - 当前价格
   * @param {Object} config - 执行配置
   * @returns {Trade}
   */
  simulateTrade(order, currentPrice, config)
  
  /**
   * 计算性能指标
   * @param {Trade[]} trades - 交易记录
   * @param {number} initialCapital - 初始资金
   * @returns {PerformanceMetrics}
   */
  calculateMetrics(trades, initialCapital)
  
  /**
   * 生成回测报告
   * @param {BacktestResult} result - 回测结果
   * @returns {Report}
   */
  generateReport(result)
}
```

### 5. 信号生成器 (SignalGenerator)

生成交易信号。

```javascript
class SignalGenerator {
  /**
   * 生成信号
   * @param {Strategy} strategy - 策略对象
   * @param {MarketData} currentData - 当前市场数据
   * @param {Object} indicators - 技术指标值
   * @returns {Signal|null}
   */
  generateSignal(strategy, currentData, indicators)
  
  /**
   * 评估信号强度
   * @param {Signal} signal - 信号对象
   * @param {Object} context - 市场上下文
   * @returns {number} 信号强度 (0-100)
   */
  evaluateSignalStrength(signal, context)
  
  /**
   * 记录信号
   * @param {Signal} signal - 信号对象
   * @returns {Promise<void>}
   */
  async logSignal(signal)
  
  /**
   * 获取信号历史
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Signal[]>}
   */
  async getSignalHistory(filters)
}
```

### 6. 风险管理模块 (RiskManager)

管理交易风险。

```javascript
class RiskManager {
  /**
   * 检查止损条件
   * @param {Position} position - 持仓
   * @param {number} currentPrice - 当前价格
   * @returns {boolean}
   */
  checkStopLoss(position, currentPrice)
  
  /**
   * 检查止盈条件
   * @param {Position} position - 持仓
   * @param {number} currentPrice - 当前价格
   * @returns {boolean}
   */
  checkTakeProfit(position, currentPrice)
  
  /**
   * 验证持仓比例
   * @param {Position} newPosition - 新持仓
   * @param {Portfolio} portfolio - 投资组合
   * @returns {boolean}
   */
  validatePositionSize(newPosition, portfolio)
  
  /**
   * 计算当前回撤
   * @param {Portfolio} portfolio - 投资组合
   * @returns {number}
   */
  calculateDrawdown(portfolio)
  
  /**
   * 检查风险限制
   * @param {Portfolio} portfolio - 投资组合
   * @param {Object} riskLimits - 风险限制配置
   * @returns {Object} {passed, violations}
   */
  checkRiskLimits(portfolio, riskLimits)
  
  /**
   * 发送风险警告
   * @param {string} type - 警告类型
   * @param {Object} details - 详细信息
   * @returns {Promise<void>}
   */
  async sendRiskAlert(type, details)
}
```

### 7. 信号推送服务 (NotificationService)

推送交易信号通知。

```javascript
class NotificationService {
  /**
   * 发送通知
   * @param {Signal} signal - 信号对象
   * @param {string[]} channels - 推送渠道
   * @returns {Promise<void>}
   */
  async sendNotification(signal, channels)
  
  /**
   * 发送浏览器通知
   * @param {string} title - 标题
   * @param {string} body - 内容
   * @returns {void}
   */
  sendBrowserNotification(title, body)
  
  /**
   * 发送邮件通知
   * @param {string} email - 邮箱地址
   * @param {Object} content - 邮件内容
   * @returns {Promise<void>}
   */
  async sendEmailNotification(email, content)
  
  /**
   * 发送Webhook通知
   * @param {string} url - Webhook URL
   * @param {Object} payload - 数据负载
   * @returns {Promise<void>}
   */
  async sendWebhookNotification(url, payload)
  
  /**
   * 检查推送过滤条件
   * @param {Signal} signal - 信号对象
   * @param {Object} filters - 过滤条件
   * @returns {boolean}
   */
  shouldNotify(signal, filters)
  
  /**
   * 记录推送日志
   * @param {Object} notification - 通知记录
   * @returns {Promise<void>}
   */
  async logNotification(notification)
}
```

### 8. 数据分析器 (DataAnalyzer)

提供数据分析功能。

```javascript
class DataAnalyzer {
  /**
   * 分析策略性能
   * @param {Trade[]} trades - 交易记录
   * @returns {Object} 性能统计
   */
  analyzePerformance(trades)
  
  /**
   * 计算胜率
   * @param {Trade[]} trades - 交易记录
   * @returns {number}
   */
  calculateWinRate(trades)
  
  /**
   * 计算盈亏比
   * @param {Trade[]} trades - 交易记录
   * @returns {number}
   */
  calculateProfitLossRatio(trades)
  
  /**
   * 计算夏普比率
   * @param {number[]} returns - 收益率序列
   * @param {number} riskFreeRate - 无风险利率
   * @returns {number}
   */
  calculateSharpeRatio(returns, riskFreeRate)
  
  /**
   * 生成收益曲线
   * @param {Trade[]} trades - 交易记录
   * @param {number} initialCapital - 初始资金
   * @returns {Object[]} 曲线数据点
   */
  generateEquityCurve(trades, initialCapital)
  
  /**
   * 导出分析数据
   * @param {Object} data - 分析数据
   * @param {string} format - 导出格式 ('csv', 'json')
   * @returns {Blob}
   */
  exportData(data, format)
}
```

## 数据模型

### MarketData (市场数据)

```javascript
{
  timestamp: Date,        // 时间戳
  symbol: string,         // 交易品种代码
  market: string,         // 市场类型
  open: number,           // 开盘价
  high: number,           // 最高价
  low: number,            // 最低价
  close: number,          // 收盘价
  volume: number,         // 成交量
  interval: string        // 时间周期
}
```

### Strategy (策略)

```javascript
{
  id: string,             // 策略ID
  name: string,           // 策略名称
  code: string,           // 策略代码
  description: string,    // 策略描述
  config: {
    market: string,       // 目标市场
    symbols: string[],    // 交易品种列表
    interval: string,     // 时间周期
    indicators: Object[], // 使用的技术指标
    parameters: Object    // 策略参数
  },
  status: string,         // 状态 ('active', 'inactive', 'testing')
  createdAt: Date,        // 创建时间
  updatedAt: Date         // 更新时间
}
```

### Signal (交易信号)

```javascript
{
  id: string,             // 信号ID
  strategyId: string,     // 策略ID
  strategyName: string,   // 策略名称
  symbol: string,         // 交易品种
  market: string,         // 市场类型
  type: string,           // 信号类型 ('BUY', 'SELL')
  price: number,          // 信号价格
  strength: number,       // 信号强度 (0-100)
  timestamp: Date,        // 生成时间
  conditions: Object[],   // 触发条件
  indicators: Object      // 相关指标值
}
```

### Trade (交易记录)

```javascript
{
  id: string,             // 交易ID
  strategyId: string,     // 策略ID
  symbol: string,         // 交易品种
  market: string,         // 市场类型
  type: string,           // 交易类型 ('BUY', 'SELL')
  entryPrice: number,     // 入场价格
  exitPrice: number,      // 出场价格
  quantity: number,       // 数量
  entryTime: Date,        // 入场时间
  exitTime: Date,         // 出场时间
  profit: number,         // 盈亏金额
  profitPercent: number,  // 盈亏百分比
  commission: number,     // 手续费
  slippage: number        // 滑点
}
```

### Position (持仓)

```javascript
{
  symbol: string,         // 交易品种
  market: string,         // 市场类型
  quantity: number,       // 持仓数量
  entryPrice: number,     // 入场价格
  currentPrice: number,   // 当前价格
  stopLoss: number,       // 止损价格
  takeProfit: number,     // 止盈价格
  unrealizedPnL: number,  // 未实现盈亏
  entryTime: Date         // 入场时间
}
```

### Portfolio (投资组合)

```javascript
{
  cash: number,           // 现金余额
  totalValue: number,     // 总资产价值
  positions: Position[],  // 持仓列表
  equity: number,         // 净值
  peakEquity: number,     // 历史最高净值
  drawdown: number,       // 当前回撤
  maxDrawdown: number     // 最大回撤
}
```

### BacktestResult (回测结果)

```javascript
{
  strategyId: string,     // 策略ID
  startDate: Date,        // 回测开始日期
  endDate: Date,          // 回测结束日期
  initialCapital: number, // 初始资金
  finalCapital: number,   // 最终资金
  totalReturn: number,    // 总收益率
  annualizedReturn: number, // 年化收益率
  maxDrawdown: number,    // 最大回撤
  sharpeRatio: number,    // 夏普比率
  winRate: number,        // 胜率
  profitLossRatio: number, // 盈亏比
  totalTrades: number,    // 总交易次数
  trades: Trade[],        // 交易记录
  equityCurve: Object[],  // 净值曲线
  drawdownCurve: Object[] // 回撤曲线
}
```

## 正确性属性

*属性是系统所有有效执行中应该保持为真的特征或行为——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*


### 属性反思

在编写具体属性之前，让我识别可以合并或消除的冗余属性：

**合并的属性：**
- 需求1.1-1.5（所有市场数据获取）可以合并为一个属性：对于任意市场类型，数据获取应该返回标准格式
- 需求5.1和5.2（买入/卖出信号）可以合并为一个属性：信号生成应该正确反映策略条件
- 需求6.1和6.2（止损/止盈）可以合并为一个属性：价格触发条件应该生成相应信号

**消除的冗余：**
- 需求2.4被2.3包含（往返属性已覆盖加载功能）
- 需求4.4被4.3包含（回测报告已包含交易记录）
- 需求5.5是UI更新，不需要单独的属性测试

### 正确性属性列表

**属性 1：市场数据标准化一致性**
*对于任意*市场类型（美股、港股、A股、加密货币、期货）和交易品种，获取的数据经过标准化后应该包含相同的字段结构（timestamp, symbol, market, open, high, low, close, volume, interval），且所有字段值应该有效（价格为正数，时间戳有效）
**验证需求：1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

**属性 2：策略持久化往返一致性**
*对于任意*策略对象，保存到本地存储后再加载，应该得到完全相同的策略代码、配置和元数据
**验证需求：2.3, 2.4**

**属性 3：策略代码语法验证正确性**
*对于任意*包含语法错误的策略代码，验证函数应该返回非空的错误列表，且错误信息应该包含错误位置
**验证需求：2.2, 2.5**

**属性 4：移动平均线计算有效性**
*对于任意*价格序列和周期参数，计算的MA值数组长度应该等于输入价格数组长度减去周期加一，且所有MA值应该在价格序列的最小值和最大值之间
**验证需求：3.1**

**属性 5：RSI指标范围约束**
*对于任意*价格序列和周期参数，计算的RSI值应该始终在0到100之间（包含边界）
**验证需求：3.2**

**属性 6：MACD指标结构完整性**
*对于任意*价格序列和MACD参数，返回的结果应该包含macd、signal和histogram三个字段，且histogram值应该等于macd值减去signal值
**验证需求：3.3**

**属性 7：布林带轨道顺序不变性**
*对于任意*价格序列和布林带参数，在所有数据点上，上轨值应该大于等于中轨值，中轨值应该大于等于下轨值
**验证需求：3.4**

**属性 8：KDJ指标结构完整性**
*对于任意*K线数据和周期参数，返回的结果应该包含k、d和j三个字段，且所有字段的数组长度应该相同
**验证需求：3.5**

**属性 9：回测报告完整性**
*对于任意*策略和历史数据的回测结果，生成的报告应该包含所有必需的性能指标字段（totalReturn, maxDrawdown, sharpeRatio, winRate, profitLossRatio, totalTrades），且这些字段的值应该是有效数值
**验证需求：4.3**

**属性 10：回测参数应用一致性**
*对于任意*指定的初始资金、手续费率和滑点参数，回测结果中的交易记录应该反映这些参数的影响（手续费和滑点应该从利润中扣除）
**验证需求：4.5**

**属性 11：信号生成完整性**
*对于任意*生成的交易信号，应该包含所有必需的元数据字段（strategyId, symbol, market, type, price, strength, timestamp, conditions），且信号强度应该在0到100之间
**验证需求：5.1, 5.2, 5.3**

**属性 12：多策略信号隔离性**
*对于任意*同时运行的多个策略，每个策略生成的信号应该包含正确的strategyId，且不同策略的信号不应该相互干扰
**验证需求：5.4**

**属性 13：止损止盈触发正确性**
*对于任意*持仓和价格变化序列，当价格触及或超过止损价格时应该生成平仓信号，当价格触及或超过止盈价格时也应该生成平仓信号
**验证需求：6.1, 6.2**

**属性 14：持仓比例限制有效性**
*对于任意*新持仓请求和最大持仓比例设置，如果新持仓会导致单个品种持仓超过总资金的指定比例，验证函数应该返回false
**验证需求：6.3**

**属性 15：回撤限制触发正确性**
*对于任意*投资组合状态序列和最大回撤限制，当计算的回撤值超过限制时，风险管理模块应该暂停策略执行并发送警告
**验证需求：6.4, 6.5**

**属性 16：策略切换状态一致性**
*对于任意*策略切换操作，切换完成后，新策略应该处于活动状态，旧策略应该处于非活动状态，且旧策略的历史交易记录应该保持不变
**验证需求：7.2, 7.3**

**属性 17：多策略状态隔离性**
*对于任意*同时运行的多个策略，每个策略应该维护独立的状态和持仓，修改一个策略的状态不应该影响其他策略
**验证需求：7.4**

**属性 18：策略切换错误回滚**
*对于任意*策略切换操作，如果切换过程中发生错误，系统状态应该与切换前完全相同（活动策略、持仓、配置等）
**验证需求：7.5**

**属性 19：交易统计计算正确性**
*对于任意*交易记录集合，计算的胜率应该等于盈利交易数除以总交易数，盈亏比应该等于平均盈利除以平均亏损的绝对值
**验证需求：8.4**

**属性 20：数据导出往返一致性**
*对于任意*分析数据，导出为CSV或JSON格式后再导入，应该得到等价的数据结构和数值
**验证需求：8.5**

**属性 21：信号推送时效性**
*对于任意*新生成的交易信号，从信号生成到推送通知发送的时间间隔应该不超过5秒
**验证需求：10.1**

**属性 22：推送通知内容完整性**
*对于任意*发送的推送通知，应该包含交易品种、信号类型、价格和策略名称这四个必需字段
**验证需求：10.3**

**属性 23：推送过滤条件有效性**
*对于任意*设置的过滤条件，只有满足所有过滤条件的信号应该被推送，不满足条件的信号不应该触发推送
**验证需求：10.4**

**属性 24：推送失败重试机制**
*对于任意*推送失败的通知，应该在失败日志中记录，且在下次连接恢复时应该重新尝试发送
**验证需求：10.5**

**属性 25：推送开关功能隔离**
*对于任意*信号生成事件，当推送功能关闭时，不应该发送通知，但信号应该正常生成并记录到历史中
**验证需求：10.6**

## 错误处理

### 错误类型

1. **数据获取错误**
   - 网络连接失败
   - API限流或认证失败
   - 数据格式不正确
   - 处理：重试机制（指数退避），显示友好错误提示，使用缓存数据

2. **策略执行错误**
   - 策略代码语法错误
   - 运行时异常
   - 资源不足（内存、计算）
   - 处理：捕获异常，记录详细日志，停止策略执行，通知用户

3. **计算错误**
   - 数据不足（指标计算需要最小数据量）
   - 数值溢出或无效计算
   - 处理：参数验证，返回明确的错误信息，提供最小数据量要求

4. **存储错误**
   - 存储空间不足
   - 数据损坏
   - 读写权限问题
   - 处理：检查可用空间，数据校验，提供导出备份功能

5. **推送错误**
   - 推送服务不可用
   - 用户权限未授予
   - 网络问题
   - 处理：失败重试，记录失败日志，降级到其他推送渠道

6. **yfinance数据获取错误**
   - 网络连接失败
   - 代码不存在或格式错误
   - 数据暂时不可用
   - 处理：友好的错误提示，使用缓存数据，提供重试选项

### 错误处理策略

```javascript
class ErrorHandler {
  /**
   * 处理数据获取错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {Object} 处理结果
   */
  handleDataFetchError(error, context) {
    // 判断错误类型
    if (error.code === 'NETWORK_ERROR') {
      // 实施重试策略
      return this.retryWithBackoff(context.fetchFunction, context.params)
    } else if (error.code === 'RATE_LIMIT') {
      // 等待并重试
      return this.waitAndRetry(context.fetchFunction, context.params, error.retryAfter)
    }
    // 记录错误并返回缓存数据
    this.logError(error, context)
    return this.getCachedData(context.params)
  }
  
  /**
   * 处理策略执行错误
   * @param {Error} error - 错误对象
   * @param {Strategy} strategy - 策略对象
   * @returns {void}
   */
  handleStrategyError(error, strategy) {
    // 停止策略执行
    strategy.stop()
    // 记录详细错误信息
    this.logError(error, {
      strategyId: strategy.id,
      strategyName: strategy.name,
      timestamp: new Date(),
      stackTrace: error.stack
    })
    // 通知用户
    this.notifyUser({
      type: 'STRATEGY_ERROR',
      message: `策略 ${strategy.name} 执行出错: ${error.message}`,
      severity: 'ERROR'
    })
  }
  
  /**
   * 指数退避重试
   * @param {Function} fn - 要重试的函数
   * @param {Object} params - 函数参数
   * @param {number} maxRetries - 最大重试次数
   * @returns {Promise<any>}
   */
  async retryWithBackoff(fn, params, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn(params)
      } catch (error) {
        if (i === maxRetries - 1) throw error
        const delay = Math.pow(2, i) * 1000
        await this.sleep(delay)
      }
    }
  }
}
```

## 测试策略

### 双重测试方法

Zpoint Quant采用单元测试和基于属性的测试相结合的方法，以确保全面的代码覆盖和正确性验证。

### 单元测试

单元测试用于验证：
- 特定的示例场景（如首次启动显示欢迎向导）
- 边缘情况（如数据不足时的错误处理）
- 组件集成点（如策略管理器与存储层的交互）

**单元测试框架**：Vitest

**示例单元测试**：

```javascript
describe('StrategyManager', () => {
  test('should display welcome wizard on first launch', async () => {
    const manager = new StrategyManager()
    const isFirstLaunch = await manager.isFirstLaunch()
    expect(isFirstLaunch).toBe(true)
    
    const wizard = await manager.getWelcomeWizard()
    expect(wizard).toBeDefined()
    expect(wizard.steps).toHaveLength(3)
  })
  
  test('should handle insufficient data for indicator calculation', () => {
    const calculator = new IndicatorCalculator()
    const prices = [100, 101, 102] // 只有3个数据点
    
    expect(() => {
      calculator.calculateMA(prices, 20) // 需要20个数据点
    }).toThrow('Insufficient data: need at least 20 data points')
  })
})
```

### 基于属性的测试

基于属性的测试用于验证：
- 通用的正确性属性（如数据标准化一致性）
- 跨多种输入的行为（如所有市场类型的数据获取）
- 不变量（如布林带轨道顺序）

**属性测试框架**：fast-check

**配置要求**：
- 每个属性测试至少运行100次迭代
- 每个属性测试必须使用注释标记其对应的设计文档中的正确性属性

**标记格式**：`// Feature: zpoint-quant, Property {number}: {property_text}`

**示例属性测试**：

```javascript
import fc from 'fast-check'

describe('Property-Based Tests', () => {
  test('Property 1: Market data normalization consistency', () => {
    // Feature: zpoint-quant, Property 1: 市场数据标准化一致性
    fc.assert(
      fc.property(
        fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.array(fc.record({
          timestamp: fc.date(),
          open: fc.float({ min: 0.01, max: 100000 }),
          high: fc.float({ min: 0.01, max: 100000 }),
          low: fc.float({ min: 0.01, max: 100000 }),
          close: fc.float({ min: 0.01, max: 100000 }),
          volume: fc.float({ min: 0, max: 1000000000 })
        }), { minLength: 1 }),
        (market, symbol, rawData) => {
          const adapter = new MarketDataAdapter()
          const normalized = rawData.map(data => 
            adapter.normalizeData(data, market)
          )
          
          // 验证所有标准化数据包含必需字段
          return normalized.every(data => 
            data.hasOwnProperty('timestamp') &&
            data.hasOwnProperty('symbol') &&
            data.hasOwnProperty('market') &&
            data.hasOwnProperty('open') &&
            data.hasOwnProperty('high') &&
            data.hasOwnProperty('low') &&
            data.hasOwnProperty('close') &&
            data.hasOwnProperty('volume') &&
            data.hasOwnProperty('interval') &&
            data.open > 0 &&
            data.high > 0 &&
            data.low > 0 &&
            data.close > 0 &&
            data.volume >= 0
          )
        }
      ),
      { numRuns: 100 }
    )
  })
  
  test('Property 2: Strategy persistence round-trip consistency', () => {
    // Feature: zpoint-quant, Property 2: 策略持久化往返一致性
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          code: fc.string({ minLength: 10, maxLength: 1000 }),
          config: fc.record({
            market: fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
            symbols: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
            interval: fc.constantFrom('1m', '5m', '15m', '1h', '1d')
          })
        }),
        async (strategyData) => {
          const manager = new StrategyManager()
          
          // 创建并保存策略
          const strategy = manager.createStrategy(
            strategyData.name,
            strategyData.code,
            strategyData.config
          )
          await manager.saveStrategy(strategy)
          
          // 加载策略
          const loaded = await manager.loadStrategy(strategy.id)
          
          // 验证往返一致性
          return loaded.name === strategy.name &&
                 loaded.code === strategy.code &&
                 JSON.stringify(loaded.config) === JSON.stringify(strategy.config)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  test('Property 5: RSI indicator range constraint', () => {
    // Feature: zpoint-quant, Property 5: RSI指标范围约束
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 1, max: 1000 }), { minLength: 50, maxLength: 200 }),
        fc.integer({ min: 5, max: 30 }),
        (prices, period) => {
          const calculator = new IndicatorCalculator()
          const rsi = calculator.calculateRSI(prices, period)
          
          // 验证所有RSI值在0-100范围内
          return rsi.every(value => value >= 0 && value <= 100)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  test('Property 7: Bollinger Bands track order invariance', () => {
    // Feature: zpoint-quant, Property 7: 布林带轨道顺序不变性
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 1, max: 1000 }), { minLength: 50, maxLength: 200 }),
        fc.integer({ min: 10, max: 50 }),
        fc.float({ min: 1, max: 3 }),
        (prices, period, stdDev) => {
          const calculator = new IndicatorCalculator()
          const bands = calculator.calculateBollingerBands(prices, period, stdDev)
          
          // 验证轨道顺序：上轨 >= 中轨 >= 下轨
          return bands.upper.every((upper, i) => 
            upper >= bands.middle[i] && bands.middle[i] >= bands.lower[i]
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### 测试覆盖目标

- 单元测试代码覆盖率：≥ 80%
- 属性测试覆盖所有25个正确性属性
- 集成测试覆盖主要用户流程（策略创建→回测→信号生成→推送）

### 持续集成

- 所有测试在代码提交前必须通过
- 使用GitHub Actions或类似CI工具自动运行测试
- 性能回归测试：确保关键操作（如指标计算、回测）的性能不下降

## 性能考虑

### 计算优化

1. **Web Workers**
   - 将技术指标计算移至Web Worker
   - 回测引擎在独立线程中运行
   - 避免阻塞主线程UI

2. **数据缓存**
   - 缓存已计算的技术指标
   - 缓存市场数据（带过期时间）
   - 使用LRU策略管理缓存大小

3. **增量计算**
   - 新数据到达时只计算增量部分
   - 避免重复计算整个数据集

### 内存管理

1. **数据分页**
   - 历史数据按时间分页加载
   - 图表只渲染可见区域的数据

2. **对象池**
   - 复用频繁创建的对象（如Signal、Trade）
   - 减少垃圾回收压力

### 响应时间目标

- 策略保存/加载：< 100ms
- 技术指标计算（1000个数据点）：< 50ms
- 信号生成：< 10ms
- 回测（1年日线数据）：< 5s
- 推送通知延迟：< 5s

## 安全考虑

### 数据安全

1. **本地存储保护**
   - 用户策略和配置使用本地存储
   - 定期备份重要数据

2. **数据隐私**
   - 所有数据存储在用户本地
   - 不上传用户策略和交易数据到服务器
   - 使用yfinance免费接口，无需API密钥

### 代码安全

1. **策略代码沙箱**
   - 在隔离环境中执行用户策略代码
   - 限制可访问的API和资源
   - 防止恶意代码访问系统资源

2. **输入验证**
   - 验证所有用户输入
   - 防止注入攻击
   - 限制输入长度和格式

### 网络安全

1. **HTTPS通信**
   - 所有API请求使用HTTPS
   - 验证SSL证书

2. **CORS策略**
   - 配置适当的CORS头
   - 限制允许的来源

## 扩展性设计

### 插件架构

系统设计支持未来扩展：

1. **技术指标插件**
   - 定义标准的指标接口
   - 支持动态加载自定义指标

2. **数据源插件**
   - 标准化的数据适配器接口
   - 轻松添加新的市场数据源

3. **策略模板**
   - 提供常用策略模板
   - 用户可以基于模板快速创建策略

### 配置管理

```javascript
{
  "dataSource": {
    "provider": "yfinance",
    "cacheEnabled": true,
    "cacheDuration": 300000, // 5分钟缓存
    "requestTimeout": 10000
  },
  "backtest": {
    "defaultInitialCapital": 100000,
    "defaultCommission": 0.001,
    "defaultSlippage": 0.0005
  },
  "risk": {
    "maxPositionSize": 0.2,
    "maxDrawdown": 0.15,
    "stopLossPercent": 0.05,
    "takeProfitPercent": 0.10
  },
  "notification": {
    "enabled": true,
    "channels": ["browser", "webhook"],
    "filters": {
      "minSignalStrength": 60
    }
  }
}
```

## 部署架构

### 静态Web应用

- 纯前端应用，可部署到任何静态托管服务
- 推荐平台：Vercel, Netlify, GitHub Pages
- 无需后端服务器，降低运维成本

### 本地开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 浏览器兼容性

- Chrome/Edge: 最新版本
- Firefox: 最新版本
- Safari: 14+
- 需要支持：ES2020, Web Workers, IndexedDB, Notification API

## 未来增强

以下功能在初始版本后可以考虑添加：

1. **实盘交易集成**
   - 连接券商API进行实盘交易
   - 订单管理和执行

2. **社区策略分享**
   - 用户可以分享和下载策略
   - 策略评分和评论系统

3. **机器学习集成**
   - 使用ML模型进行价格预测
   - 自动优化策略参数

4. **移动端应用**
   - 开发iOS和Android应用
   - 推送通知到移动设备

5. **多用户协作**
   - 团队共享策略和分析
   - 权限管理

6. **高级风险分析**
   - VaR（风险价值）计算
   - 压力测试和情景分析
