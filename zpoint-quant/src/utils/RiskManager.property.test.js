/**
 * RiskManager 属性测试
 * 使用fast-check进行基于属性的测试
 */

import { describe, test, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import RiskManager from './RiskManager.js'

describe('RiskManager Property-Based Tests', () => {
  let manager

  beforeEach(() => {
    manager = new RiskManager()
  })

  // ========== Property 13: 止损止盈触发正确性 ==========

  test('Property 13: Stop loss triggers correctly for long positions', () => {
    // Feature: zpoint-quant, Property 13: 对于任意持仓和价格变化序列，当价格触及或超过止损价格时应该生成平仓信号
    fc.assert(
      fc.property(
        // 生成随机持仓
        fc.record({
          symbol: fc.constantFrom('AAPL', 'MSFT', 'GOOGL'),
          quantity: fc.integer({ min: 1, max: 1000 }), // 多头持仓
          entryPrice: fc.float({ min: Math.fround(10), max: Math.fround(1000) , noNaN: true }),
          stopLoss: fc.float({ min: Math.fround(5), max: Math.fround(500) , noNaN: true })
        }),
        (position) => {
          // 确保止损价格低于入场价格（多头）
          const stopLoss = Math.min(position.stopLoss, position.entryPrice * 0.9)
          const testPosition = { ...position, stopLoss }

          // 测试价格低于止损价格
          const belowStopLoss = stopLoss * 0.95
          expect(manager.checkStopLoss(testPosition, belowStopLoss)).toBe(true)

          // 测试价格等于止损价格
          expect(manager.checkStopLoss(testPosition, stopLoss)).toBe(true)

          // 测试价格高于止损价格
          const aboveStopLoss = stopLoss * 1.05
          expect(manager.checkStopLoss(testPosition, aboveStopLoss)).toBe(false)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 13: Stop loss triggers correctly for short positions', () => {
    // Feature: zpoint-quant, Property 13: 空头持仓的止损逻辑
    fc.assert(
      fc.property(
        fc.record({
          symbol: fc.constantFrom('AAPL', 'MSFT', 'GOOGL'),
          quantity: fc.integer({ min: -1000, max: -1 }), // 空头持仓
          entryPrice: fc.float({ min: Math.fround(10), max: Math.fround(1000) , noNaN: true }),
          stopLoss: fc.float({ min: Math.fround(15), max: Math.fround(1500) , noNaN: true })
        }),
        (position) => {
          // 确保止损价格高于入场价格（空头）
          const stopLoss = Math.max(position.stopLoss, position.entryPrice * 1.1)
          const testPosition = { ...position, stopLoss }

          // 测试价格高于止损价格
          const aboveStopLoss = stopLoss * 1.05
          expect(manager.checkStopLoss(testPosition, aboveStopLoss)).toBe(true)

          // 测试价格等于止损价格
          expect(manager.checkStopLoss(testPosition, stopLoss)).toBe(true)

          // 测试价格低于止损价格
          const belowStopLoss = stopLoss * 0.95
          expect(manager.checkStopLoss(testPosition, belowStopLoss)).toBe(false)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 13: Take profit triggers correctly for long positions', () => {
    // Feature: zpoint-quant, Property 13: 止盈触发正确性
    fc.assert(
      fc.property(
        fc.record({
          symbol: fc.constantFrom('AAPL', 'MSFT', 'GOOGL'),
          quantity: fc.integer({ min: 1, max: 1000 }),
          entryPrice: fc.float({ min: Math.fround(10), max: Math.fround(1000) , noNaN: true }),
          takeProfit: fc.float({ min: Math.fround(15), max: Math.fround(1500) , noNaN: true })
        }),
        (position) => {
          // 确保止盈价格高于入场价格（多头）
          const takeProfit = Math.max(position.takeProfit, position.entryPrice * 1.1)
          const testPosition = { ...position, takeProfit }

          // 测试价格高于止盈价格
          const aboveTakeProfit = takeProfit * 1.05
          expect(manager.checkTakeProfit(testPosition, aboveTakeProfit)).toBe(true)

          // 测试价格等于止盈价格
          expect(manager.checkTakeProfit(testPosition, takeProfit)).toBe(true)

          // 测试价格低于止盈价格
          const belowTakeProfit = takeProfit * 0.95
          expect(manager.checkTakeProfit(testPosition, belowTakeProfit)).toBe(false)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 13: Take profit triggers correctly for short positions', () => {
    // Feature: zpoint-quant, Property 13: 空头持仓的止盈逻辑
    fc.assert(
      fc.property(
        fc.record({
          symbol: fc.constantFrom('AAPL', 'MSFT', 'GOOGL'),
          quantity: fc.integer({ min: -1000, max: -1 }),
          entryPrice: fc.float({ min: Math.fround(10), max: Math.fround(1000) , noNaN: true }),
          takeProfit: fc.float({ min: Math.fround(5), max: Math.fround(500) , noNaN: true })
        }),
        (position) => {
          // 确保止盈价格低于入场价格（空头）
          const takeProfit = Math.min(position.takeProfit, position.entryPrice * 0.9)
          const testPosition = { ...position, takeProfit }

          // 测试价格低于止盈价格
          const belowTakeProfit = takeProfit * 0.95
          expect(manager.checkTakeProfit(testPosition, belowTakeProfit)).toBe(true)

          // 测试价格等于止盈价格
          expect(manager.checkTakeProfit(testPosition, takeProfit)).toBe(true)

          // 测试价格高于止盈价格
          const aboveTakeProfit = takeProfit * 1.05
          expect(manager.checkTakeProfit(testPosition, aboveTakeProfit)).toBe(false)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ========== Property 14: 持仓比例限制有效性 ==========

  test('Property 14: Position size validation effectiveness', () => {
    // Feature: zpoint-quant, Property 14: 对于任意新持仓请求和最大持仓比例设置，如果新持仓会导致单个品种持仓超过总资金的指定比例，验证函数应该返回false
    fc.assert(
      fc.property(
        // 生成随机新持仓
        fc.record({
          quantity: fc.integer({ min: 1, max: 1000 }),
          entryPrice: fc.float({ min: Math.fround(1), max: Math.fround(1000) , noNaN: true })
        }),
        // 生成随机投资组合
        fc.record({
          cash: fc.float({ min: Math.fround(10000), max: Math.fround(1000000) , noNaN: true }),
          totalValue: fc.float({ min: Math.fround(50000), max: Math.fround(1000000) , noNaN: true })
        }),
        // 生成随机最大持仓比例
        fc.float({ min: Math.fround(0.05), max: Math.fround(0.5) , noNaN: true }),
        (newPosition, portfolio, maxPositionSize) => {
          const positionValue = newPosition.quantity * newPosition.entryPrice
          const positionRatio = positionValue / portfolio.totalValue

          const isValid = manager.validatePositionSize(newPosition, portfolio, maxPositionSize)

          // 验证结果与实际比例一致
          if (positionRatio <= maxPositionSize) {
            expect(isValid).toBe(true)
          } else {
            expect(isValid).toBe(false)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 14: Position size validation with absolute values', () => {
    // Feature: zpoint-quant, Property 14: 持仓比例验证应该使用绝对值（支持空头）
    fc.assert(
      fc.property(
        fc.record({
          quantity: fc.integer({ min: -1000, max: 1000 }).filter(q => q !== 0),
          entryPrice: fc.float({ min: Math.fround(1), max: Math.fround(1000) , noNaN: true })
        }),
        fc.record({
          totalValue: fc.float({ min: Math.fround(50000), max: Math.fround(1000000) , noNaN: true })
        }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) , noNaN: true }),
        (newPosition, portfolio, maxPositionSize) => {
          const positionValue = Math.abs(newPosition.quantity * newPosition.entryPrice)
          const positionRatio = positionValue / portfolio.totalValue

          const isValid = manager.validatePositionSize(newPosition, portfolio, maxPositionSize)

          // 验证使用绝对值计算
          expect(isValid).toBe(positionRatio <= maxPositionSize)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ========== Property 15: 回撤限制触发正确性 ==========

  test('Property 15: Drawdown calculation correctness', () => {
    // Feature: zpoint-quant, Property 15: 对于任意投资组合状态序列和最大回撤限制，当计算的回撤值超过限制时，风险管理模块应该暂停策略执行并发送警告
    fc.assert(
      fc.property(
        // 生成随机投资组合
        fc.record({
          equity: fc.float({ min: Math.fround(50000), max: Math.fround(200000) , noNaN: true }),
          peakEquity: fc.float({ min: Math.fround(100000), max: Math.fround(300000) , noNaN: true })
        }),
        (portfolio) => {
          // 确保当前净值不超过峰值
          const currentEquity = Math.min(portfolio.equity, portfolio.peakEquity)
          const testPortfolio = { ...portfolio, equity: currentEquity }

          const drawdown = manager.calculateDrawdown(testPortfolio)

          // 验证回撤计算正确性
          const expectedDrawdown = (testPortfolio.peakEquity - currentEquity) / testPortfolio.peakEquity

          expect(drawdown).toBeCloseTo(expectedDrawdown, 6)

          // 验证回撤范围
          expect(drawdown).toBeGreaterThanOrEqual(0)
          expect(drawdown).toBeLessThanOrEqual(1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 15: Drawdown limit triggers strategy pause', () => {
    // Feature: zpoint-quant, Property 15: 回撤超限应该触发策略暂停
    fc.assert(
      fc.property(
        fc.record({
          equity: fc.float({ min: Math.fround(50000), max: Math.fround(150000) , noNaN: true }),
          peakEquity: fc.float({ min: Math.fround(100000), max: Math.fround(200000) , noNaN: true })
        }),
        fc.float({ min: Math.fround(0.05), max: Math.fround(0.3) , noNaN: true }), // 最大回撤限制
        fc.string({ minLength: 5, maxLength: 20 }), // 策略ID
        (portfolio, maxDrawdown, strategyId) => {
          const currentEquity = Math.min(portfolio.equity, portfolio.peakEquity)
          const testPortfolio = { ...portfolio, equity: currentEquity }

          const drawdown = manager.calculateDrawdown(testPortfolio)
          const riskLimits = { maxDrawdown }

          const result = manager.checkRiskLimits(testPortfolio, riskLimits)

          // 如果回撤超限
          if (drawdown > maxDrawdown) {
            // 应该检测到违规
            expect(result.passed).toBe(false)
            expect(result.violations.some(v => v.type === 'MAX_DRAWDOWN_EXCEEDED')).toBe(true)

            // 暂停策略
            manager.pauseStrategy(strategyId, 'Max drawdown exceeded')
            expect(manager.isStrategyPaused(strategyId)).toBe(true)
          } else {
            // 不应该检测到回撤违规
            const drawdownViolations = result.violations.filter(v => v.type === 'MAX_DRAWDOWN_EXCEEDED')
            expect(drawdownViolations.length).toBe(0)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 15: Drawdown is zero when equity at peak', () => {
    // Feature: zpoint-quant, Property 15: 净值在峰值时回撤为0
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(10000), max: Math.fround(1000000) , noNaN: true }),
        (equity) => {
          const portfolio = { equity, peakEquity: equity }
          const drawdown = manager.calculateDrawdown(portfolio)

          expect(drawdown).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 15: Drawdown is zero when equity exceeds peak', () => {
    // Feature: zpoint-quant, Property 15: 净值超过峰值时回撤为0
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(10000), max: Math.fround(500000) , noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) , noNaN: true }),
        (peakEquity, excessRatio) => {
          const currentEquity = peakEquity * (1 + excessRatio)
          const portfolio = { equity: currentEquity, peakEquity }
          const drawdown = manager.calculateDrawdown(portfolio)

          expect(drawdown).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ========== 风险限制检查属性 ==========

  test('Property: Risk limits check consistency', () => {
    // 风险限制检查应该一致地检测违规
    fc.assert(
      fc.property(
        fc.record({
          cash: fc.float({ min: Math.fround(0), max: Math.fround(100000) , noNaN: true }),
          totalValue: fc.float({ min: Math.fround(50000), max: Math.fround(500000) , noNaN: true }),
          equity: fc.float({ min: Math.fround(50000), max: Math.fround(200000) , noNaN: true }),
          peakEquity: fc.float({ min: Math.fround(100000), max: Math.fround(300000) , noNaN: true }),
          positions: fc.array(
            fc.record({
              symbol: fc.constantFrom('AAPL', 'MSFT', 'GOOGL'),
              quantity: fc.integer({ min: 1, max: 100 }),
              currentPrice: fc.float({ min: Math.fround(10), max: Math.fround(500) , noNaN: true })
            }),
            { minLength: 0, maxLength: 10 }
          )
        }),
        fc.record({
          maxDrawdown: fc.option(fc.float({ min: Math.fround(0.05), max: Math.fround(0.5) , noNaN: true })),
          maxPositions: fc.option(fc.integer({ min: 1, max: 20 })),
          maxPositionSize: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) , noNaN: true })),
          minCashBalance: fc.option(fc.float({ min: Math.fround(1000), max: Math.fround(50000) , noNaN: true }))
        }),
        (portfolio, riskLimits) => {
          const result = manager.checkRiskLimits(portfolio, riskLimits)

          // 验证结果结构
          expect(result).toHaveProperty('passed')
          expect(result).toHaveProperty('violations')
          expect(Array.isArray(result.violations)).toBe(true)

          // 验证passed与violations的一致性
          if (result.violations.length > 0) {
            expect(result.passed).toBe(false)
          } else {
            expect(result.passed).toBe(true)
          }

          // 验证每个违规都有必需字段
          for (const violation of result.violations) {
            expect(violation).toHaveProperty('type')
            expect(violation).toHaveProperty('message')
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ========== 盈亏计算属性 ==========

  test('Property: Unrealized PnL calculation correctness', () => {
    // 未实现盈亏计算应该正确
    fc.assert(
      fc.property(
        fc.record({
          quantity: fc.integer({ min: -1000, max: 1000 }).filter(q => q !== 0),
          entryPrice: fc.float({ min: Math.fround(1), max: Math.fround(1000) , noNaN: true })
        }),
        fc.float({ min: Math.fround(1), max: Math.fround(1000) , noNaN: true }),
        (position, currentPrice) => {
          const pnl = manager.calculateUnrealizedPnL(position, currentPrice)
          const expectedPnL = position.quantity * (currentPrice - position.entryPrice)

          expect(pnl).toBeCloseTo(expectedPnL, 6)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property: PnL percentage calculation correctness', () => {
    // 盈亏百分比计算应该正确
    fc.assert(
      fc.property(
        fc.record({
          quantity: fc.integer({ min: -1000, max: 1000 }).filter(q => q !== 0),
          entryPrice: fc.float({ min: Math.fround(1), max: Math.fround(1000) , noNaN: true })
        }),
        fc.float({ min: Math.fround(1), max: Math.fround(1000) , noNaN: true }),
        (position, currentPrice) => {
          const pnlPercent = manager.calculatePnLPercent(position, currentPrice)
          
          const priceDiff = currentPrice - position.entryPrice
          const expectedPercent = (priceDiff / position.entryPrice) * (position.quantity > 0 ? 1 : -1)

          expect(pnlPercent).toBeCloseTo(expectedPercent, 6)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property: PnL percentage sign consistency', () => {
    // 盈亏百分比符号应该与盈亏方向一致
    fc.assert(
      fc.property(
        fc.record({
          quantity: fc.integer({ min: 1, max: 1000 }), // 多头
          entryPrice: fc.float({ min: Math.fround(10), max: Math.fround(500) , noNaN: true })
        }),
        fc.float({ min: Math.fround(0.5), max: Math.fround(2) , noNaN: true }), // 价格变化倍数
        (position, priceMultiplier) => {
          const currentPrice = position.entryPrice * priceMultiplier
          const pnlPercent = manager.calculatePnLPercent(position, currentPrice)

          // 多头：价格上涨应该盈利（正），价格下跌应该亏损（负）
          if (currentPrice > position.entryPrice) {
            expect(pnlPercent).toBeGreaterThan(0)
          } else if (currentPrice < position.entryPrice) {
            expect(pnlPercent).toBeLessThan(0)
          } else {
            expect(pnlPercent).toBe(0)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // ========== 策略暂停/恢复属性 ==========

  test('Property: Strategy pause/resume state consistency', () => {
    // 策略暂停/恢复状态应该一致
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 20 }),
        fc.string({ minLength: 10, maxLength: 50 }),
        (strategyId, reason) => {
          // 暂停策略
          manager.pauseStrategy(strategyId, reason)
          expect(manager.isStrategyPaused(strategyId)).toBe(true)

          const pausedState = manager.getStrategyState(strategyId)
          expect(pausedState.paused).toBe(true)
          expect(pausedState.reason).toBe(reason)

          // 恢复策略
          manager.resumeStrategy(strategyId)
          expect(manager.isStrategyPaused(strategyId)).toBe(false)

          const resumedState = manager.getStrategyState(strategyId)
          expect(resumedState.paused).toBe(false)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

