/**
 * 回测引擎单元测试
 * 
 * 需求：4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, test, expect, beforeEach } from 'vitest'
import BacktestEngine from './BacktestEngine.js'

describe('BacktestEngine', () => {
  let engine

  beforeEach(() => {
    engine = new BacktestEngine()
  })

  // 辅助函数：生成测试数据
  const generateTestData = (length = 100, startPrice = 100) => {
    const data = []
    let price = startPrice
    const startDate = new Date('2023-01-01')

    for (let i = 0; i < length; i++) {
      price += (Math.random() - 0.5) * 2 // 随机波动
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      data.push({
        timestamp: date,
        symbol: 'TEST',
        market: 'US',
        open: price,
        high: price + Math.random(),
        low: price - Math.random(),
        close: price,
        volume: 1000000,
        interval: '1d'
      })
    }

    return data
  }

  // 简单的买入持有策略
  const buyAndHoldStrategy = {
    id: 'test-strategy-1',
    name: 'Buy and Hold',
    code: `
      function onBar(data, indicators, state) {
        if (!state.position) {
          return { action: 'BUY', quantity: 100 }
        }
        return null
      }
    `
  }

  describe('runBacktest - 运行回测', () => {
    test('should run backtest successfully', async () => {
      const data = generateTestData(50)
      const result = await engine.runBacktest(buyAndHoldStrategy, data)

      expect(result).toBeDefined()
      expect(result.strategyId).toBe('test-strategy-1')
      expect(result.initialCapital).toBe(100000)
      expect(result.finalCapital).toBeGreaterThan(0)
      expect(result.trades).toBeInstanceOf(Array)
      expect(result.equityCurve).toBeInstanceOf(Array)
      expect(result.equityCurve).toHaveLength(50)
    })

    test('should throw error for missing strategy', async () => {
      const data = generateTestData(10)
      await expect(engine.runBacktest(null, data)).rejects.toThrow('Strategy is required')
    })

    test('should throw error for empty historical data', async () => {
      await expect(engine.runBacktest(buyAndHoldStrategy, [])).rejects.toThrow('non-empty array')
    })

    test('should throw error for invalid initial capital', async () => {
      const data = generateTestData(10)
      await expect(
        engine.runBacktest(buyAndHoldStrategy, data, { initialCapital: -1000 })
      ).rejects.toThrow('Initial capital must be positive')
    })

    test('should handle strategy execution errors gracefully', async () => {
      const buggyStrategy = {
        id: 'buggy',
        name: 'Buggy Strategy',
        code: `
          function onBar() {
            throw new Error('Intentional error')
          }
        `
      }

      const data = generateTestData(10)
      const result = await engine.runBacktest(buggyStrategy, data)

      // 应该完成回测，即使策略有错误
      expect(result).toBeDefined()
      expect(result.trades).toHaveLength(0)
    })

    test('should apply custom configuration', async () => {
      const data = generateTestData(20)
      const config = {
        initialCapital: 50000,
        commission: 0.002,
        slippage: 0.001
      }

      const result = await engine.runBacktest(buyAndHoldStrategy, data, config)

      expect(result.initialCapital).toBe(50000)
      expect(result.config.commission).toBe(0.002)
      expect(result.config.slippage).toBe(0.001)
    })

    test('should close position at end of backtest', async () => {
      const data = generateTestData(20)
      const result = await engine.runBacktest(buyAndHoldStrategy, data)

      // 买入持有策略应该有一笔交易（买入后在结束时平仓）
      expect(result.trades.length).toBeGreaterThan(0)
      
      // 最后一笔应该是平仓
      const lastTrade = result.trades[result.trades.length - 1]
      expect(lastTrade.type).toBe('SELL')
    })
  })

  describe('simulateTrade - 模拟交易', () => {
    test('should simulate buy order', () => {
      const order = { action: 'BUY', quantity: 100, price: 100 }
      const config = { commission: 0.001, slippage: 0.0005 }
      
      const trade = engine.simulateTrade(order, 100, config)

      expect(trade).toBeDefined()
      expect(trade.type).toBe('BUY')
      expect(trade.quantity).toBe(100)
      expect(trade.price).toBeGreaterThan(100) // 买入有正滑点
      expect(trade.commission).toBeGreaterThan(0)
      expect(trade.slippage).toBeGreaterThan(0)
    })

    test('should simulate sell order', () => {
      const order = { action: 'SELL', quantity: 100, price: 100 }
      const config = { commission: 0.001, slippage: 0.0005 }
      
      const trade = engine.simulateTrade(order, 100, config)

      expect(trade.type).toBe('SELL')
      expect(trade.price).toBeLessThan(100) // 卖出有负滑点
    })

    test('should apply commission correctly', () => {
      const order = { action: 'BUY', quantity: 100, price: 100 }
      const config = { commission: 0.01, slippage: 0 } // 1% 手续费
      
      const trade = engine.simulateTrade(order, 100, config)

      // 手续费应该约为 100 * 100 * 0.01 = 100
      expect(trade.commission).toBeCloseTo(100, 0)
    })

    test('should apply slippage correctly', () => {
      const order = { action: 'BUY', quantity: 100, price: 100 }
      const config = { commission: 0, slippage: 0.01 } // 1% 滑点
      
      const trade = engine.simulateTrade(order, 100, config)

      // 买入价格应该是 100 + 1 = 101
      expect(trade.price).toBeCloseTo(101, 1)
      // 滑点成本应该是 1 * 100 = 100
      expect(trade.slippage).toBeCloseTo(100, 0)
    })

    test('should throw error for invalid order', () => {
      const config = { commission: 0.001, slippage: 0.0005 }
      expect(() => engine.simulateTrade(null, 100, config)).toThrow('Order is required')
    })

    test('should throw error for invalid price', () => {
      const order = { action: 'BUY', quantity: 100 }
      const config = { commission: 0.001, slippage: 0.0005 }
      expect(() => engine.simulateTrade(order, -100, config)).toThrow('positive number')
    })
  })

  describe('calculateMetrics - 计算性能指标', () => {
    test('should calculate metrics for profitable trades', () => {
      const trades = [
        { profit: 1000, entryTime: new Date('2023-01-01'), exitTime: new Date('2023-01-10') },
        { profit: 500, entryTime: new Date('2023-01-11'), exitTime: new Date('2023-01-20') },
        { profit: -200, entryTime: new Date('2023-01-21'), exitTime: new Date('2023-01-30') }
      ]

      const metrics = engine.calculateMetrics(trades, 100000)

      expect(metrics.totalReturn).toBeCloseTo(0.013, 3) // (1000+500-200)/100000
      expect(metrics.winRate).toBeCloseTo(0.667, 3) // 2/3
      expect(metrics.totalTrades).toBe(3)
      expect(metrics.winningTrades).toBe(2)
      expect(metrics.losingTrades).toBe(1)
    })

    test('should calculate win rate correctly', () => {
      const trades = [
        { profit: 100, entryTime: new Date(), exitTime: new Date() },
        { profit: 200, entryTime: new Date(), exitTime: new Date() },
        { profit: -50, entryTime: new Date(), exitTime: new Date() },
        { profit: -30, entryTime: new Date(), exitTime: new Date() }
      ]

      const metrics = engine.calculateMetrics(trades, 10000)

      expect(metrics.winRate).toBe(0.5) // 2 wins out of 4
      expect(metrics.winningTrades).toBe(2)
      expect(metrics.losingTrades).toBe(2)
    })

    test('should calculate profit/loss ratio correctly', () => {
      const trades = [
        { profit: 300, entryTime: new Date(), exitTime: new Date() },
        { profit: 300, entryTime: new Date(), exitTime: new Date() },
        { profit: -100, entryTime: new Date(), exitTime: new Date() }
      ]

      const metrics = engine.calculateMetrics(trades, 10000)

      // 平均盈利 = 300, 平均亏损 = 100
      expect(metrics.profitLossRatio).toBe(3)
      expect(metrics.averageProfit).toBe(300)
      expect(metrics.averageLoss).toBe(100)
    })

    test('should handle empty trades array', () => {
      const metrics = engine.calculateMetrics([], 100000)

      expect(metrics.totalReturn).toBe(0)
      expect(metrics.winRate).toBe(0)
      expect(metrics.totalTrades).toBe(0)
      expect(metrics.sharpeRatio).toBe(0)
    })

    test('should calculate max drawdown', () => {
      const trades = [
        { profit: 1000, entryTime: new Date(), exitTime: new Date() },
        { profit: -2000, entryTime: new Date(), exitTime: new Date() },
        { profit: 1500, entryTime: new Date(), exitTime: new Date() }
      ]

      const metrics = engine.calculateMetrics(trades, 100000)

      // 最大回撤应该在第二笔交易后
      expect(metrics.maxDrawdown).toBeGreaterThan(0)
    })

    test('should throw error for invalid initial capital', () => {
      const trades = [{ profit: 100, entryTime: new Date(), exitTime: new Date() }]
      expect(() => engine.calculateMetrics(trades, -1000)).toThrow('positive number')
    })
  })

  describe('generateReport - 生成报告', () => {
    test('should generate report text', () => {
      const result = {
        strategyId: 'test-1',
        strategyName: 'Test Strategy',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        initialCapital: 100000,
        finalCapital: 110000,
        totalReturn: 0.1,
        annualizedReturn: 0.1,
        maxDrawdown: 0.05,
        sharpeRatio: 1.5,
        totalTrades: 10,
        winRate: 0.6,
        profitLossRatio: 2.0
      }

      const report = engine.generateReport(result)

      expect(report).toContain('回测报告')
      expect(report).toContain('Test Strategy')
      expect(report).toContain('$100,000.00')
      expect(report).toContain('$110,000.00')
      expect(report).toContain('10.00%')
      expect(report).toContain('5.00%')
      expect(report).toContain('1.50')
      expect(report).toContain('60.00%')
    })

    test('should throw error for invalid result', () => {
      expect(() => engine.generateReport(null)).toThrow('Result is required')
    })
  })

  describe('Integration Tests', () => {
    test('should handle complete backtest workflow', async () => {
      // 创建上涨趋势数据
      const data = []
      for (let i = 0; i < 30; i++) {
        data.push({
          timestamp: new Date(2023, 0, i + 1),
          symbol: 'TEST',
          market: 'US',
          open: 100 + i,
          high: 101 + i,
          low: 99 + i,
          close: 100 + i,
          volume: 1000000,
          interval: '1d'
        })
      }

      // 简单的趋势跟随策略
      const strategy = {
        id: 'trend-follow',
        name: 'Trend Following',
        code: `
          function onBar(data, indicators, state) {
            if (!state.position && data.close > 105) {
              return { action: 'BUY', quantity: 100 }
            }
            if (state.position && data.close > 120) {
              return { action: 'SELL' }
            }
            return null
          }
        `
      }

      const result = await engine.runBacktest(strategy, data, {
        initialCapital: 10000,
        commission: 0.001,
        slippage: 0.0005
      })

      // 验证结果完整性
      expect(result.strategyId).toBe('trend-follow')
      expect(result.initialCapital).toBe(10000)
      expect(result.trades.length).toBeGreaterThan(0)
      expect(result.equityCurve.length).toBe(30)
      expect(result.drawdownCurve.length).toBe(30)

      // 验证性能指标存在
      expect(typeof result.totalReturn).toBe('number')
      expect(typeof result.maxDrawdown).toBe('number')
      expect(typeof result.sharpeRatio).toBe('number')
      expect(typeof result.winRate).toBe('number')

      // 生成报告
      const report = engine.generateReport(result)
      expect(report).toContain('Trend Following')
    })
  })
})
