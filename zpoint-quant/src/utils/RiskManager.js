/**
 * RiskManager - 风险管理模块
 * 负责管理交易风险，包括止损、止盈、持仓比例和回撤监控
 */

class RiskManager {
  constructor() {
    this.riskEvents = []
    this.strategyStates = new Map() // 存储每个策略的暂停状态
  }

  /**
   * 检查止损条件
   * @param {Object} position - 持仓对象
   * @param {number} currentPrice - 当前价格
   * @returns {boolean} 是否触发止损
   */
  checkStopLoss(position, currentPrice) {
    if (!position) {
      throw new Error('Position is required')
    }

    if (typeof currentPrice !== 'number' || currentPrice <= 0) {
      throw new Error('Current price must be a positive number')
    }

    // 如果没有设置止损价格，返回false
    if (!position.stopLoss || position.stopLoss <= 0) {
      return false
    }

    // 多头持仓：当前价格 <= 止损价格
    if (position.quantity > 0) {
      return currentPrice <= position.stopLoss
    }

    // 空头持仓：当前价格 >= 止损价格
    if (position.quantity < 0) {
      return currentPrice >= position.stopLoss
    }

    return false
  }

  /**
   * 检查止盈条件
   * @param {Object} position - 持仓对象
   * @param {number} currentPrice - 当前价格
   * @returns {boolean} 是否触发止盈
   */
  checkTakeProfit(position, currentPrice) {
    if (!position) {
      throw new Error('Position is required')
    }

    if (typeof currentPrice !== 'number' || currentPrice <= 0) {
      throw new Error('Current price must be a positive number')
    }

    // 如果没有设置止盈价格，返回false
    if (!position.takeProfit || position.takeProfit <= 0) {
      return false
    }

    // 多头持仓：当前价格 >= 止盈价格
    if (position.quantity > 0) {
      return currentPrice >= position.takeProfit
    }

    // 空头持仓：当前价格 <= 止盈价格
    if (position.quantity < 0) {
      return currentPrice <= position.takeProfit
    }

    return false
  }

  /**
   * 验证持仓比例
   * @param {Object} newPosition - 新持仓
   * @param {Object} portfolio - 投资组合
   * @param {number} maxPositionSize - 最大持仓比例 (0-1)
   * @returns {boolean} 是否通过验证
   */
  validatePositionSize(newPosition, portfolio, maxPositionSize = 0.2) {
    if (!newPosition) {
      throw new Error('New position is required')
    }

    if (!portfolio) {
      throw new Error('Portfolio is required')
    }

    if (typeof maxPositionSize !== 'number' || maxPositionSize <= 0 || maxPositionSize > 1) {
      throw new Error('Max position size must be between 0 and 1')
    }

    // 计算新持仓的价值
    const positionValue = Math.abs(newPosition.quantity * newPosition.entryPrice)

    // 计算投资组合总价值
    const totalValue = portfolio.totalValue !== undefined ? portfolio.totalValue : portfolio.cash

    if (!totalValue || totalValue <= 0) {
      throw new Error('Portfolio total value must be positive')
    }

    // 计算持仓比例
    const positionRatio = positionValue / totalValue

    // 验证是否超过最大持仓比例
    return positionRatio <= maxPositionSize
  }

  /**
   * 计算当前回撤
   * @param {Object} portfolio - 投资组合
   * @returns {number} 回撤比例 (0-1)
   */
  calculateDrawdown(portfolio) {
    if (!portfolio) {
      throw new Error('Portfolio is required')
    }

    const currentEquity = portfolio.equity !== undefined ? portfolio.equity : portfolio.totalValue
    const peakEquity = portfolio.peakEquity !== undefined ? portfolio.peakEquity : currentEquity

    if (typeof currentEquity !== 'number' || currentEquity < 0) {
      throw new Error('Current equity must be a non-negative number')
    }

    if (typeof peakEquity !== 'number' || peakEquity <= 0) {
      throw new Error('Peak equity must be a positive number')
    }

    // 如果当前净值大于等于峰值，回撤为0
    if (currentEquity >= peakEquity) {
      return 0
    }

    // 计算回撤比例
    const drawdown = (peakEquity - currentEquity) / peakEquity

    return Math.max(0, Math.min(1, drawdown))
  }

  /**
   * 检查风险限制
   * @param {Object} portfolio - 投资组合
   * @param {Object} riskLimits - 风险限制配置
   * @returns {Object} {passed: boolean, violations: Array}
   */
  checkRiskLimits(portfolio, riskLimits = {}) {
    if (!portfolio) {
      throw new Error('Portfolio is required')
    }

    const violations = []

    // 检查最大回撤限制
    if (riskLimits.maxDrawdown) {
      const currentDrawdown = this.calculateDrawdown(portfolio)
      if (currentDrawdown > riskLimits.maxDrawdown) {
        violations.push({
          type: 'MAX_DRAWDOWN_EXCEEDED',
          limit: riskLimits.maxDrawdown,
          current: currentDrawdown,
          message: `Maximum drawdown exceeded: ${(currentDrawdown * 100).toFixed(2)}% > ${(riskLimits.maxDrawdown * 100).toFixed(2)}%`
        })
      }
    }

    // 检查最大持仓数量限制
    if (riskLimits.maxPositions && portfolio.positions) {
      const positionCount = portfolio.positions.length
      if (positionCount > riskLimits.maxPositions) {
        violations.push({
          type: 'MAX_POSITIONS_EXCEEDED',
          limit: riskLimits.maxPositions,
          current: positionCount,
          message: `Maximum positions exceeded: ${positionCount} > ${riskLimits.maxPositions}`
        })
      }
    }

    // 检查单个持仓比例限制
    if (riskLimits.maxPositionSize && portfolio.positions && portfolio.totalValue) {
      for (const position of portfolio.positions) {
        const positionValue = Math.abs(position.quantity * position.currentPrice)
        const positionRatio = positionValue / portfolio.totalValue

        if (positionRatio > riskLimits.maxPositionSize) {
          violations.push({
            type: 'POSITION_SIZE_EXCEEDED',
            symbol: position.symbol,
            limit: riskLimits.maxPositionSize,
            current: positionRatio,
            message: `Position size exceeded for ${position.symbol}: ${(positionRatio * 100).toFixed(2)}% > ${(riskLimits.maxPositionSize * 100).toFixed(2)}%`
          })
        }
      }
    }

    // 检查最小现金余额限制
    if (riskLimits.minCashBalance && portfolio.cash) {
      if (portfolio.cash < riskLimits.minCashBalance) {
        violations.push({
          type: 'MIN_CASH_BALANCE_VIOLATED',
          limit: riskLimits.minCashBalance,
          current: portfolio.cash,
          message: `Minimum cash balance violated: ${portfolio.cash.toFixed(2)} < ${riskLimits.minCashBalance.toFixed(2)}`
        })
      }
    }

    return {
      passed: violations.length === 0,
      violations
    }
  }

  /**
   * 暂停策略执行
   * @param {string} strategyId - 策略ID
   * @param {string} reason - 暂停原因
   * @returns {void}
   */
  pauseStrategy(strategyId, reason = 'Risk limit exceeded') {
    if (!strategyId) {
      throw new Error('Strategy ID is required')
    }

    this.strategyStates.set(strategyId, {
      paused: true,
      reason,
      pausedAt: new Date()
    })
  }

  /**
   * 恢复策略执行
   * @param {string} strategyId - 策略ID
   * @returns {void}
   */
  resumeStrategy(strategyId) {
    if (!strategyId) {
      throw new Error('Strategy ID is required')
    }

    this.strategyStates.set(strategyId, {
      paused: false,
      reason: null,
      resumedAt: new Date()
    })
  }

  /**
   * 检查策略是否暂停
   * @param {string} strategyId - 策略ID
   * @returns {boolean}
   */
  isStrategyPaused(strategyId) {
    if (!strategyId) {
      throw new Error('Strategy ID is required')
    }

    const state = this.strategyStates.get(strategyId)
    return state ? state.paused : false
  }

  /**
   * 获取策略状态
   * @param {string} strategyId - 策略ID
   * @returns {Object|null}
   */
  getStrategyState(strategyId) {
    if (!strategyId) {
      throw new Error('Strategy ID is required')
    }

    return this.strategyStates.get(strategyId) || null
  }

  /**
   * 发送风险警告
   * @param {string} type - 警告类型
   * @param {Object} details - 详细信息
   * @returns {Promise<void>}
   */
  async sendRiskAlert(type, details = {}) {
    if (!type) {
      throw new Error('Alert type is required')
    }

    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      details,
      timestamp: new Date(),
      severity: this._getAlertSeverity(type)
    }

    // 记录风险事件
    this.riskEvents.push(alert)

    // 限制事件历史长度
    if (this.riskEvents.length > 1000) {
      this.riskEvents = this.riskEvents.slice(-1000)
    }

    // 在实际应用中，这里可以集成NotificationService
    // 现在只是记录事件
    console.warn(`[Risk Alert] ${type}:`, details)

    return alert
  }

  /**
   * 获取警告严重程度
   * @private
   * @param {string} type - 警告类型
   * @returns {string}
   */
  _getAlertSeverity(type) {
    const severityMap = {
      'STOP_LOSS_TRIGGERED': 'HIGH',
      'TAKE_PROFIT_TRIGGERED': 'MEDIUM',
      'MAX_DRAWDOWN_EXCEEDED': 'CRITICAL',
      'POSITION_SIZE_EXCEEDED': 'HIGH',
      'MAX_POSITIONS_EXCEEDED': 'MEDIUM',
      'MIN_CASH_BALANCE_VIOLATED': 'HIGH'
    }

    return severityMap[type] || 'MEDIUM'
  }

  /**
   * 获取风险事件历史
   * @param {Object} filters - 过滤条件
   * @returns {Array}
   */
  getRiskEvents(filters = {}) {
    let events = [...this.riskEvents]

    if (filters.type) {
      events = events.filter(e => e.type === filters.type)
    }

    if (filters.severity) {
      events = events.filter(e => e.severity === filters.severity)
    }

    if (filters.startDate) {
      events = events.filter(e => e.timestamp >= filters.startDate)
    }

    if (filters.endDate) {
      events = events.filter(e => e.timestamp <= filters.endDate)
    }

    if (filters.limit && filters.limit > 0) {
      events = events.slice(-filters.limit)
    }

    return events
  }

  /**
   * 清除风险事件历史
   * @returns {number} 清除的事件数量
   */
  clearRiskEvents() {
    const count = this.riskEvents.length
    this.riskEvents = []
    return count
  }

  /**
   * 计算持仓的未实现盈亏
   * @param {Object} position - 持仓对象
   * @param {number} currentPrice - 当前价格
   * @returns {number}
   */
  calculateUnrealizedPnL(position, currentPrice) {
    if (!position) {
      throw new Error('Position is required')
    }

    if (typeof currentPrice !== 'number' || currentPrice <= 0) {
      throw new Error('Current price must be a positive number')
    }

    const priceDiff = currentPrice - position.entryPrice
    return position.quantity * priceDiff
  }

  /**
   * 计算持仓的盈亏百分比
   * @param {Object} position - 持仓对象
   * @param {number} currentPrice - 当前价格
   * @returns {number}
   */
  calculatePnLPercent(position, currentPrice) {
    if (!position) {
      throw new Error('Position is required')
    }

    if (typeof currentPrice !== 'number' || currentPrice <= 0) {
      throw new Error('Current price must be a positive number')
    }

    if (position.entryPrice <= 0) {
      throw new Error('Entry price must be positive')
    }

    const priceDiff = currentPrice - position.entryPrice
    return (priceDiff / position.entryPrice) * (position.quantity > 0 ? 1 : -1)
  }
}

export default RiskManager

