/**
 * 回测引擎属性测试
 * 使用fast-check进行基于属性的测试
 * 
 * 需求：4.3, 4.5
 */

import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import BacktestEngine from './BacktestEngine.js'

describe('BacktestEngine - Property-Based Tests', () => {
  const engine = new BacktestEngine()

  // 辅助函数：生成市场数据
  const marketDataArbitrary = fc.record({
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
    symbol: fc.constantFrom('AAPL', 'MSFT', 'GOOGL'),
    market: fc.constantFrom('US', 'HK', 'CN'),
    open: fc.float({ min: Math.fround(50), max: Math.fround(200) , noNaN: true }),
    high: fc.float({ min: Math.fround(50), max: Math.fround(200) , noNaN: true }),
    low: fc.float({ min: Math.fround(50), max: Math.fround(200) , noNaN: true }),
    close: fc.float({ min: Math.fround(50), max: Math.fround(200) , noNaN: true }),
    volume: fc.integer({ min: 100000, max: 10000000 }),
    interval: fc.constantFrom('1d', '1h', '15m')
  }).filter(data => data.high >= Math.max(data.open, data.close) && data.low <= Math.min(data.open, data.close))

  describe('Property 9: 回测报告完整性', () => {
    test('Property 9: Backtest report completeness', () => {
      // Feature: zpoint-quant, Property 9: 回测报告完整性
      fc.assert(
        fc.asyncProperty(
          // 生成历史数据
          fc.array(marketDataArbitrary, { minLength: 20, maxLength: 100 }),
          // 生成初始资金
          fc.float({ min: Math.fround(10000), max: Math.fround(1000000) , noNaN: true }),
          async (historicalData, initialCapital) => {
            // 排序数据
            historicalData.sort((a, b) => a.timestamp - b.timestamp)

            // 简单策略
            const strategy = {
              id: 'test-strategy',
              name: 'Test Strategy',
              code: `
                function onBar(data, indicators, state) {
                  if (!state.position && Math.random() > 0.7) {
                    return { action: 'BUY', quantity: 10 }
                  }
                  if (state.position && Math.random() > 0.8) {
                    return { action: 'SELL' }
                  }
                  return null
                }
              `
            }

            try {
              const result = await engine.runBacktest(strategy, historicalData, {
                initialCapital
              })

              // 属性1: 结果应该包含所有必需的性能指标字段
              const requiredFields = [
                'totalReturn', 'maxDrawdown', 'sharpeRatio', 
                'winRate', 'profitLossRatio', 'totalTrades'
              ]

              for (const field of requiredFields) {
                if (!result.hasOwnProperty(field)) {
                  return false
                }
              }

              // 属性2: 所有字段的值应该是有效数值
              for (const field of requiredFields) {
                const value = result[field]
                if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
                  return false
                }
              }

              // 属性3: 某些指标应该在合理范围内
              if (result.winRate < 0 || result.winRate > 1) return false
              if (result.maxDrawdown < 0 || result.maxDrawdown > 1) return false
              if (result.totalTrades < 0) return false

              // 属性4: 初始和最终资金应该存在
              if (typeof result.initialCapital !== 'number') return false
              if (typeof result.finalCapital !== 'number') return false
              if (result.initialCapital !== initialCapital) return false

              return true
            } catch (error) {
              // 如果出错，至少不应该是因为缺少字段
              return false
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    test('Property 9.1: Report contains all required sections', () => {
      // 验证报告包含所有必需部分
      fc.assert(
        fc.property(
          fc.record({
            strategyName: fc.string({ minLength: 1, maxLength: 30 }),
            startDate: fc.date(),
            endDate: fc.date(),
            initialCapital: fc.float({ min: Math.fround(10000), max: Math.fround(1000000) , noNaN: true }),
            finalCapital: fc.float({ min: Math.fround(5000), max: Math.fround(2000000) , noNaN: true }),
            totalReturn: fc.float({ min: Math.fround(-0.5), max: Math.fround(2) , noNaN: true }),
            annualizedReturn: fc.float({ min: Math.fround(-0.5), max: Math.fround(2) , noNaN: true }),
            maxDrawdown: fc.float({ min: Math.fround(0), max: Math.fround(0.5) , noNaN: true }),
            sharpeRatio: fc.float({ min: Math.fround(-2), max: Math.fround(5) , noNaN: true }),
            totalTrades: fc.integer({ min: 0, max: 1000 }),
            winRate: fc.float({ min: Math.fround(0), max: Math.fround(1) , noNaN: true }),
            profitLossRatio: fc.float({ min: Math.fround(0), max: Math.fround(10) , noNaN: true })
          }),
          (result) => {
            const report = engine.generateReport(result)

            // 报告应该包含关键信息
            const requiredSections = [
              '回测报告',
              '资金情况',
              '风险指标',
              '交易统计'
            ]

            return requiredSections.every(section => report.includes(section))
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 10: 回测参数应用一致性', () => {
    test('Property 10: Backtest parameter application consistency', () => {
      // Feature: zpoint-quant, Property 10: 回测参数应用一致性
      fc.assert(
        fc.asyncProperty(
          // 生成历史数据
          fc.array(marketDataArbitrary, { minLength: 10, maxLength: 30 }),
          // 生成回测参数
          fc.record({
            initialCapital: fc.float({ min: Math.fround(10000), max: Math.fround(100000) , noNaN: true }),
            commission: fc.float({ min: Math.fround(0), max: Math.fround(0.01) , noNaN: true }),
            slippage: fc.float({ min: Math.fround(0), max: Math.fround(0.01) , noNaN: true })
          }),
          async (historicalData, config) => {
            historicalData.sort((a, b) => a.timestamp - b.timestamp)

            // 确保至少有一笔交易的策略
            const strategy = {
              id: 'test',
              name: 'Test',
              code: `
                function onBar(data, indicators, state) {
                  if (!state.position) {
                    return { action: 'BUY', quantity: 10 }
                  }
                  return null
                }
              `
            }

            try {
              const result = await engine.runBacktest(strategy, historicalData, config)

              // 属性1: 初始资金应该与配置一致
              if (result.initialCapital !== config.initialCapital) {
                return false
              }

              // 属性2: 如果有交易，手续费和滑点应该从利润中扣除
              if (result.trades.length > 0) {
                for (const trade of result.trades) {
                  // 每笔交易都应该有手续费和滑点
                  if (typeof trade.commission !== 'number' || trade.commission < 0) {
                    return false
                  }
                  if (typeof trade.slippage !== 'number' || trade.slippage < 0) {
                    return false
                  }

                  // 如果有利润字段，应该已经扣除了手续费和滑点
                  if (trade.profit !== undefined) {
                    // 利润应该考虑了成本
                    const grossProfit = (trade.exitPrice - trade.entryPrice) * trade.quantity
                    const netProfit = grossProfit - trade.commission - trade.slippage
                    
                    // 允许小的浮点误差
                    if (Math.abs(trade.profit - netProfit) > 0.01) {
                      return false
                    }
                  }
                }
              }

              // 属性3: 配置应该保存在结果中
              if (!result.config) return false
              if (result.config.commission !== config.commission) return false
              if (result.config.slippage !== config.slippage) return false

              return true
            } catch (error) {
              return false
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    test('Property 10.1: Commission is applied to all trades', () => {
      // 验证手续费应用到所有交易
      fc.assert(
        fc.property(
          fc.record({
            action: fc.constantFrom('BUY', 'SELL'),
            quantity: fc.integer({ min: 1, max: 1000 }),
            price: fc.float({ min: Math.fround(10), max: Math.fround(200) , noNaN: true })
          }),
          fc.float({ min: Math.fround(0.0001), max: Math.fround(0.01) , noNaN: true }),
          (order, commissionRate) => {
            const config = {
              commission: commissionRate,
              slippage: 0
            }

            const trade = engine.simulateTrade(order, order.price, config)

            // 手续费应该等于 价格 * 数量 * 费率
            const expectedCommission = trade.price * order.quantity * commissionRate
            
            return Math.abs(trade.commission - expectedCommission) < 0.01
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property 10.2: Slippage is applied correctly', () => {
      // 验证滑点正确应用
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(50), max: Math.fround(150) , noNaN: true }),
          fc.integer({ min: 1, max: 100 }),
          fc.float({ min: Math.fround(0.0001), max: Math.fround(0.01) , noNaN: true }),
          (price, quantity, slippageRate) => {
            const buyOrder = { action: 'BUY', quantity, price }
            const sellOrder = { action: 'SELL', quantity, price }
            const config = { commission: 0, slippage: slippageRate }

            const buyTrade = engine.simulateTrade(buyOrder, price, config)
            const sellTrade = engine.simulateTrade(sellOrder, price, config)

            // 买入价格应该高于原价（正滑点）
            if (buyTrade.price <= price) return false

            // 卖出价格应该低于原价（负滑点）
            if (sellTrade.price >= price) return false

            // 滑点金额应该正确
            const buySlippage = (buyTrade.price - price) * quantity
            const sellSlippage = (price - sellTrade.price) * quantity

            return Math.abs(buyTrade.slippage - buySlippage) < 0.01 &&
                   Math.abs(sellTrade.slippage - sellSlippage) < 0.01
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Performance Metrics Properties', () => {
    test('Property: Win rate is between 0 and 1', () => {
      // 验证胜率在0-1之间
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              profit: fc.float({ min: Math.fround(-1000), max: Math.fround(1000) , noNaN: true }),
              entryTime: fc.date(),
              exitTime: fc.date()
            }),
            { minLength: 1, maxLength: 100 }
          ),
          fc.float({ min: Math.fround(1000), max: Math.fround(100000) , noNaN: true }),
          (trades, initialCapital) => {
            const metrics = engine.calculateMetrics(trades, initialCapital)

            return metrics.winRate >= 0 && metrics.winRate <= 1
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property: Total trades equals winning plus losing trades', () => {
      // 验证总交易数等于盈利+亏损交易数
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              profit: fc.float({ min: Math.fround(-1000), max: Math.fround(1000) , noNaN: true }),
              entryTime: fc.date(),
              exitTime: fc.date()
            }),
            { minLength: 1, maxLength: 100 }
          ),
          fc.float({ min: Math.fround(1000), max: Math.fround(100000) , noNaN: true }),
          (trades, initialCapital) => {
            const metrics = engine.calculateMetrics(trades, initialCapital)

            // 允许出现零利润（平手）交易，确保总交易数等于赢+输+平手
            const neutralTrades = trades.filter(t => typeof t.profit === 'number' && Math.abs(t.profit) <= 1e-8).length
            return metrics.totalTrades === metrics.winningTrades + metrics.losingTrades + neutralTrades
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property: Max drawdown is non-negative', () => {
      // 验证最大回撤非负
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              profit: fc.float({ min: Math.fround(-1000), max: Math.fround(1000) , noNaN: true }),
              entryTime: fc.date(),
              exitTime: fc.date()
            }),
            { minLength: 1, maxLength: 100 }
          ),
          fc.float({ min: Math.fround(1000), max: Math.fround(100000) , noNaN: true }),
          (trades, initialCapital) => {
            const metrics = engine.calculateMetrics(trades, initialCapital)

            return metrics.maxDrawdown >= 0
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
