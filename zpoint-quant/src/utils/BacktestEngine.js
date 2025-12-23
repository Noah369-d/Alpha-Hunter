/**
 * 回测引擎
 * 执行策略回测，模拟交易，计算性能指标
 * 
 * 需求：4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

/**
 * @typedef {import('./models').Strategy} Strategy
 * @typedef {import('./models').MarketData} MarketData
 * @typedef {import('./models').Trade} Trade
 * @typedef {import('./models').BacktestResult} BacktestResult
 */

class BacktestEngine {
  constructor() {
    // 默认配置
    this.defaultConfig = {
      initialCapital: 100000,      // 初始资金
      commission: 0.001,            // 手续费率 (0.1%)
      slippage: 0.0005,            // 滑点 (0.05%)
      riskFreeRate: 0.02           // 无风险利率 (2%)
    }
  }

  /**
   * 运行回测
   * @param {Strategy} strategy - 策略对象
   * @param {MarketData[]} historicalData - 历史数据
   * @param {Object} config - 回测配置
   * @returns {Promise<BacktestResult>}
   */
  async runBacktest(strategy, historicalData, config = {}) {
    // 参数验证
    if (!strategy || typeof strategy !== 'object') {
      throw new Error('Strategy is required and must be an object')
    }

    if (!Array.isArray(historicalData) || historicalData.length === 0) {
      throw new Error('Historical data is required and must be a non-empty array')
    }

    if (!strategy.code) {
      throw new Error('Strategy must have code')
    }

    // 合并配置
    const backtestConfig = {
      ...this.defaultConfig,
      ...config
    }

    // 验证配置
    if (backtestConfig.initialCapital <= 0) {
      throw new Error('Initial capital must be positive')
    }

    // 初始化回测状态
    const state = {
      capital: backtestConfig.initialCapital,
      position: null,              // 当前持仓
      trades: [],                  // 交易记录
      equity: backtestConfig.initialCapital,
      peakEquity: backtestConfig.initialCapital,
      equityCurve: [],
      drawdownCurve: []
    }

    // 编译策略代码
    let strategyFunction
    try {
      strategyFunction = new Function('data', 'indicators', 'state', strategy.code + '\nreturn onBar(data, indicators, state);')
    } catch (error) {
      throw new Error(`Failed to compile strategy: ${error.message}`)
    }

    // 执行回测循环
    for (let i = 0; i < historicalData.length; i++) {
      const currentBar = historicalData[i]

      try {
        // 执行策略
        const signal = strategyFunction(currentBar, {}, {
          capital: state.capital,
          position: state.position
        })

        // 处理信号
        if (signal && typeof signal === 'object') {
          if (signal.action === 'BUY' && !state.position) {
            // 开多仓
            const quantity = signal.quantity || Math.floor(state.capital / currentBar.close)
            if (quantity > 0) {
              const trade = this.simulateTrade(
                { action: 'BUY', quantity, price: currentBar.close },
                currentBar.close,
                backtestConfig
              )

              state.position = {
                symbol: currentBar.symbol,
                quantity: trade.quantity,
                entryPrice: trade.entryPrice,
                entryTime: currentBar.timestamp
              }

              state.capital -= trade.entryPrice * trade.quantity + trade.commission
            }
          } else if (signal.action === 'SELL' && state.position) {
            // 平仓
            const trade = this.simulateTrade(
              { action: 'SELL', quantity: state.position.quantity, price: currentBar.close },
              currentBar.close,
              backtestConfig
            )

            trade.entryPrice = state.position.entryPrice
            trade.entryTime = state.position.entryTime
            trade.exitPrice = trade.price
            trade.exitTime = currentBar.timestamp
            trade.profit = (trade.exitPrice - trade.entryPrice) * trade.quantity - trade.commission - trade.slippage
            trade.profitPercent = (trade.profit / (trade.entryPrice * trade.quantity)) * 100

            state.trades.push(trade)
            state.capital += trade.exitPrice * trade.quantity - trade.commission
            state.position = null
          }
        }

        // 更新净值
        let currentEquity = state.capital
        if (state.position) {
          currentEquity += state.position.quantity * currentBar.close
        }

        state.equity = currentEquity
        if (currentEquity > state.peakEquity) {
          state.peakEquity = currentEquity
        }

        // 记录净值曲线
        state.equityCurve.push({
          timestamp: currentBar.timestamp,
          equity: currentEquity
        })

        // 记录回撤曲线
        const drawdown = state.peakEquity > 0 ? (state.peakEquity - currentEquity) / state.peakEquity : 0
        state.drawdownCurve.push({
          timestamp: currentBar.timestamp,
          drawdown: drawdown
        })

      } catch (error) {
        // 策略执行错误
        console.error(`Strategy execution error at bar ${i}:`, error)
        // 继续执行，不中断回测
      }
    }

    // 如果还有持仓，强制平仓
    if (state.position) {
      const lastBar = historicalData[historicalData.length - 1]
      const trade = {
        id: this._generateTradeId(),
        strategyId: strategy.id,
        symbol: lastBar.symbol,
        market: lastBar.market,
        type: 'SELL',
        entryPrice: state.position.entryPrice,
        exitPrice: lastBar.close,
        quantity: state.position.quantity,
        entryTime: state.position.entryTime,
        exitTime: lastBar.timestamp,
        commission: lastBar.close * state.position.quantity * backtestConfig.commission,
        slippage: lastBar.close * state.position.quantity * backtestConfig.slippage
      }

      trade.profit = (trade.exitPrice - trade.entryPrice) * trade.quantity - trade.commission - trade.slippage
      trade.profitPercent = (trade.profit / (trade.entryPrice * trade.quantity)) * 100

      state.trades.push(trade)
      state.capital += trade.exitPrice * trade.quantity - trade.commission
      state.position = null
    }

    // 计算性能指标
    const metrics = this.calculateMetrics(state.trades, backtestConfig.initialCapital, backtestConfig.riskFreeRate)

    // 构建回测结果
    const result = {
      strategyId: strategy.id,
      strategyName: strategy.name,
      startDate: historicalData[0].timestamp,
      endDate: historicalData[historicalData.length - 1].timestamp,
      initialCapital: backtestConfig.initialCapital,
      finalCapital: state.capital,
      totalReturn: metrics.totalReturn,
      annualizedReturn: metrics.annualizedReturn,
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      winRate: metrics.winRate,
      profitLossRatio: metrics.profitLossRatio,
      totalTrades: state.trades.length,
      trades: state.trades,
      equityCurve: state.equityCurve,
      drawdownCurve: state.drawdownCurve,
      config: backtestConfig
    }

    return result
  }

  /**
   * 模拟交易执行
   * @param {Object} order - 订单 {action, quantity, price}
   * @param {number} currentPrice - 当前价格
   * @param {Object} config - 执行配置
   * @returns {Trade}
   */
  simulateTrade(order, currentPrice, config) {
    // 参数验证
    if (!order || typeof order !== 'object') {
      throw new Error('Order is required and must be an object')
    }

    if (typeof currentPrice !== 'number' || currentPrice <= 0) {
      throw new Error('Current price must be a positive number')
    }

    // 应用滑点
    const slippageAmount = currentPrice * config.slippage
    const executionPrice = order.action === 'BUY' 
      ? currentPrice + slippageAmount 
      : currentPrice - slippageAmount

    // 计算手续费
    const commission = executionPrice * order.quantity * config.commission

    // 创建交易记录
    const trade = {
      id: this._generateTradeId(),
      type: order.action,
      price: executionPrice,
      entryPrice: order.action === 'BUY' ? executionPrice : 0,
      exitPrice: order.action === 'SELL' ? executionPrice : 0,
      quantity: order.quantity,
      commission: commission,
      slippage: slippageAmount * order.quantity
    }

    return trade
  }

  /**
   * 计算性能指标
   * @param {Trade[]} trades - 交易记录
   * @param {number} initialCapital - 初始资金
   * @param {number} riskFreeRate - 无风险利率
   * @returns {Object} 性能指标
   */
  calculateMetrics(trades, initialCapital, riskFreeRate = 0.02) {
    // 参数验证
    if (!Array.isArray(trades)) {
      throw new Error('Trades must be an array')
    }

    if (typeof initialCapital !== 'number' || initialCapital <= 0) {
      throw new Error('Initial capital must be a positive number')
    }

    // 如果没有交易，返回默认指标
    if (trades.length === 0) {
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        winRate: 0,
        profitLossRatio: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        averageProfit: 0,
        averageLoss: 0
      }
    }

    // 计算总收益
    const totalProfit = trades.reduce((sum, trade) => sum + (trade.profit || 0), 0)
    const finalCapital = initialCapital + totalProfit
    const totalReturn = (finalCapital - initialCapital) / initialCapital

    // 计算年化收益率
    const firstTrade = trades[0]
    const lastTrade = trades[trades.length - 1]
    const daysElapsed = (lastTrade.exitTime - firstTrade.entryTime) / (1000 * 60 * 60 * 24)
    const yearsElapsed = daysElapsed / 365
    const annualizedReturn = yearsElapsed > 0 
      ? Math.pow(1 + totalReturn, 1 / yearsElapsed) - 1 
      : 0

    // 计算胜率和盈亏比
    const winningTrades = trades.filter(t => (t.profit || 0) > 0)
    const losingTrades = trades.filter(t => (t.profit || 0) < 0)
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0

    const averageProfit = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length
      : 0

    const averageLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length)
      : 0

    const profitLossRatio = averageLoss > 0 ? averageProfit / averageLoss : 0

    // 计算最大回撤
    let peak = initialCapital
    let maxDrawdown = 0
    let equity = initialCapital

    for (const trade of trades) {
      equity += trade.profit || 0
      if (equity > peak) {
        peak = equity
      }
      const drawdown = (peak - equity) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    // 计算夏普比率
    const returns = trades.map(t => (t.profit || 0) / initialCapital)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    )
    const sharpeRatio = stdDev > 0 
      ? (avgReturn - riskFreeRate / 252) / stdDev * Math.sqrt(252) 
      : 0

    return {
      totalReturn,
      annualizedReturn,
      maxDrawdown,
      sharpeRatio,
      winRate,
      profitLossRatio,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageProfit,
      averageLoss
    }
  }

  /**
   * 生成回测报告
   * @param {BacktestResult} result - 回测结果
   * @returns {string} 报告文本
   */
  generateReport(result) {
    if (!result || typeof result !== 'object') {
      throw new Error('Result is required and must be an object')
    }

    const report = []
    report.push('='.repeat(60))
    report.push('回测报告')
    report.push('='.repeat(60))
    report.push('')
    report.push(`策略名称: ${result.strategyName || result.strategyId}`)
    report.push(`回测期间: ${result.startDate.toLocaleDateString()} - ${result.endDate.toLocaleDateString()}`)
    report.push('')
    report.push('资金情况:')
    report.push(`  初始资金: $${result.initialCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    report.push(`  最终资金: $${result.finalCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    report.push(`  总收益率: ${(result.totalReturn * 100).toFixed(2)}%`)
    report.push(`  年化收益率: ${(result.annualizedReturn * 100).toFixed(2)}%`)
    report.push('')
    report.push('风险指标:')
    report.push(`  最大回撤: ${(result.maxDrawdown * 100).toFixed(2)}%`)
    report.push(`  夏普比率: ${result.sharpeRatio.toFixed(2)}`)
    report.push('')
    report.push('交易统计:')
    report.push(`  总交易次数: ${result.totalTrades}`)
    report.push(`  胜率: ${(result.winRate * 100).toFixed(2)}%`)
    report.push(`  盈亏比: ${result.profitLossRatio.toFixed(2)}`)
    report.push('')
    report.push('='.repeat(60))

    return report.join('\n')
  }

  /**
   * 生成交易ID
   * @private
   * @returns {string}
   */
  _generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export default BacktestEngine
