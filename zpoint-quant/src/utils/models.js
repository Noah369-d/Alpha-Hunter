/**
 * 数据模型定义
 * 定义系统中使用的所有数据结构
 */

/**
 * 市场数据模型
 * @typedef {Object} MarketData
 * @property {Date} timestamp - 时间戳
 * @property {string} symbol - 交易品种代码
 * @property {string} market - 市场类型 ('US', 'HK', 'CN', 'CRYPTO', 'FUTURES')
 * @property {number} open - 开盘价
 * @property {number} high - 最高价
 * @property {number} low - 最低价
 * @property {number} close - 收盘价
 * @property {number} volume - 成交量
 * @property {string} interval - 时间周期
 */

/**
 * 实时报价模型
 * @typedef {Object} Quote
 * @property {string} symbol - 交易品种代码
 * @property {number} price - 当前价格
 * @property {number} change - 涨跌额
 * @property {number} changePercent - 涨跌幅
 * @property {number} volume - 成交量
 * @property {Date} timestamp - 时间戳
 */

/**
 * 策略模型
 * @typedef {Object} Strategy
 * @property {string} id - 策略ID
 * @property {string} name - 策略名称
 * @property {string} code - 策略代码
 * @property {string} description - 策略描述
 * @property {Object} config - 策略配置
 * @property {string} status - 状态 ('active', 'inactive', 'testing')
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */

/**
 * 交易信号模型
 * @typedef {Object} Signal
 * @property {string} id - 信号ID
 * @property {string} strategyId - 策略ID
 * @property {string} strategyName - 策略名称
 * @property {string} symbol - 交易品种
 * @property {string} market - 市场类型
 * @property {string} type - 信号类型 ('BUY', 'SELL')
 * @property {number} price - 信号价格
 * @property {number} strength - 信号强度 (0-100)
 * @property {Date} timestamp - 生成时间
 * @property {Array} conditions - 触发条件
 * @property {Object} indicators - 相关指标值
 */

/**
 * 交易记录模型
 * @typedef {Object} Trade
 * @property {string} id - 交易ID
 * @property {string} strategyId - 策略ID
 * @property {string} symbol - 交易品种
 * @property {string} market - 市场类型
 * @property {string} type - 交易类型 ('BUY', 'SELL')
 * @property {number} entryPrice - 入场价格
 * @property {number} exitPrice - 出场价格
 * @property {number} quantity - 数量
 * @property {Date} entryTime - 入场时间
 * @property {Date} exitTime - 出场时间
 * @property {number} profit - 盈亏金额
 * @property {number} profitPercent - 盈亏百分比
 * @property {number} commission - 手续费
 * @property {number} slippage - 滑点
 */

/**
 * 持仓模型
 * @typedef {Object} Position
 * @property {string} symbol - 交易品种
 * @property {string} market - 市场类型
 * @property {number} quantity - 持仓数量
 * @property {number} entryPrice - 入场价格
 * @property {number} currentPrice - 当前价格
 * @property {number} stopLoss - 止损价格
 * @property {number} takeProfit - 止盈价格
 * @property {number} unrealizedPnL - 未实现盈亏
 * @property {Date} entryTime - 入场时间
 */

/**
 * 投资组合模型
 * @typedef {Object} Portfolio
 * @property {number} cash - 现金余额
 * @property {number} totalValue - 总资产价值
 * @property {Position[]} positions - 持仓列表
 * @property {number} equity - 净值
 * @property {number} peakEquity - 历史最高净值
 * @property {number} drawdown - 当前回撤
 * @property {number} maxDrawdown - 最大回撤
 */

/**
 * 回测结果模型
 * @typedef {Object} BacktestResult
 * @property {string} strategyId - 策略ID
 * @property {Date} startDate - 回测开始日期
 * @property {Date} endDate - 回测结束日期
 * @property {number} initialCapital - 初始资金
 * @property {number} finalCapital - 最终资金
 * @property {number} totalReturn - 总收益率
 * @property {number} annualizedReturn - 年化收益率
 * @property {number} maxDrawdown - 最大回撤
 * @property {number} sharpeRatio - 夏普比率
 * @property {number} winRate - 胜率
 * @property {number} profitLossRatio - 盈亏比
 * @property {number} totalTrades - 总交易次数
 * @property {Trade[]} trades - 交易记录
 * @property {Array} equityCurve - 净值曲线
 * @property {Array} drawdownCurve - 回撤曲线
 */

export {
  // 导出类型定义供JSDoc使用
}
