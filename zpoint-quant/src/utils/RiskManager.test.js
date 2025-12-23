/**
 * RiskManager 单元测试
 */

import { describe, test, expect, beforeEach } from 'vitest'
import RiskManager from './RiskManager.js'

describe('RiskManager', () => {
  let manager
  let mockPosition
  let mockPortfolio

  beforeEach(() => {
    manager = new RiskManager()

    mockPosition = {
      symbol: 'AAPL',
      market: 'US',
      quantity: 100,
      entryPrice: 150,
      currentPrice: 155,
      stopLoss: 145,
      takeProfit: 160,
      unrealizedPnL: 500,
      entryTime: new Date()
    }

    mockPortfolio = {
      cash: 50000,
      totalValue: 100000,
      positions: [mockPosition],
      equity: 100000,
      peakEquity: 110000,
      drawdown: 0.0909,
      maxDrawdown: 0.15
    }
  })

  // ========== 止损检查测试 ==========

  describe('checkStopLoss', () => {
    test('should trigger stop loss when price drops below stop loss', () => {
      const triggered = manager.checkStopLoss(mockPosition, 144)
      expect(triggered).toBe(true)
    })

    test('should trigger stop loss when price equals stop loss', () => {
      const triggered = manager.checkStopLoss(mockPosition, 145)
      expect(triggered).toBe(true)
    })

    test('should not trigger stop loss when price above stop loss', () => {
      const triggered = manager.checkStopLoss(mockPosition, 150)
      expect(triggered).toBe(false)
    })

    test('should not trigger when no stop loss set', () => {
      const position = { ...mockPosition, stopLoss: 0 }
      const triggered = manager.checkStopLoss(position, 100)
      expect(triggered).toBe(false)
    })

    test('should handle short positions correctly', () => {
      const shortPosition = { ...mockPosition, quantity: -100, stopLoss: 155 }
      
      // 价格上涨到止损价格，应该触发
      expect(manager.checkStopLoss(shortPosition, 155)).toBe(true)
      expect(manager.checkStopLoss(shortPosition, 156)).toBe(true)
      
      // 价格低于止损价格，不应该触发
      expect(manager.checkStopLoss(shortPosition, 154)).toBe(false)
    })

    test('should throw error when position is missing', () => {
      expect(() => {
        manager.checkStopLoss(null, 150)
      }).toThrow('Position is required')
    })

    test('should throw error when current price is invalid', () => {
      expect(() => {
        manager.checkStopLoss(mockPosition, -10)
      }).toThrow('Current price must be a positive number')

      expect(() => {
        manager.checkStopLoss(mockPosition, 0)
      }).toThrow('Current price must be a positive number')
    })
  })

  // ========== 止盈检查测试 ==========

  describe('checkTakeProfit', () => {
    test('should trigger take profit when price rises above take profit', () => {
      const triggered = manager.checkTakeProfit(mockPosition, 161)
      expect(triggered).toBe(true)
    })

    test('should trigger take profit when price equals take profit', () => {
      const triggered = manager.checkTakeProfit(mockPosition, 160)
      expect(triggered).toBe(true)
    })

    test('should not trigger take profit when price below take profit', () => {
      const triggered = manager.checkTakeProfit(mockPosition, 155)
      expect(triggered).toBe(false)
    })

    test('should not trigger when no take profit set', () => {
      const position = { ...mockPosition, takeProfit: 0 }
      const triggered = manager.checkTakeProfit(position, 200)
      expect(triggered).toBe(false)
    })

    test('should handle short positions correctly', () => {
      const shortPosition = { ...mockPosition, quantity: -100, takeProfit: 145 }
      
      // 价格下跌到止盈价格，应该触发
      expect(manager.checkTakeProfit(shortPosition, 145)).toBe(true)
      expect(manager.checkTakeProfit(shortPosition, 144)).toBe(true)
      
      // 价格高于止盈价格，不应该触发
      expect(manager.checkTakeProfit(shortPosition, 146)).toBe(false)
    })

    test('should throw error when position is missing', () => {
      expect(() => {
        manager.checkTakeProfit(null, 150)
      }).toThrow('Position is required')
    })

    test('should throw error when current price is invalid', () => {
      expect(() => {
        manager.checkTakeProfit(mockPosition, -10)
      }).toThrow('Current price must be a positive number')
    })
  })

  // ========== 持仓比例验证测试 ==========

  describe('validatePositionSize', () => {
    test('should pass validation when position size within limit', () => {
      const newPosition = {
        quantity: 100,
        entryPrice: 150
      }
      
      const valid = manager.validatePositionSize(newPosition, mockPortfolio, 0.2)
      expect(valid).toBe(true)
    })

    test('should fail validation when position size exceeds limit', () => {
      const newPosition = {
        quantity: 200,
        entryPrice: 150
      }
      
      const valid = manager.validatePositionSize(newPosition, mockPortfolio, 0.2)
      expect(valid).toBe(false)
    })

    test('should use default max position size of 0.2', () => {
      const newPosition = {
        quantity: 150,
        entryPrice: 150
      }
      
      const valid = manager.validatePositionSize(newPosition, mockPortfolio)
      expect(valid).toBe(false)
    })

    test('should handle negative quantities (short positions)', () => {
      const newPosition = {
        quantity: -100,
        entryPrice: 150
      }
      
      const valid = manager.validatePositionSize(newPosition, mockPortfolio, 0.2)
      expect(valid).toBe(true)
    })

    test('should throw error when new position is missing', () => {
      expect(() => {
        manager.validatePositionSize(null, mockPortfolio, 0.2)
      }).toThrow('New position is required')
    })

    test('should throw error when portfolio is missing', () => {
      expect(() => {
        manager.validatePositionSize(mockPosition, null, 0.2)
      }).toThrow('Portfolio is required')
    })

    test('should throw error when max position size is invalid', () => {
      expect(() => {
        manager.validatePositionSize(mockPosition, mockPortfolio, 0)
      }).toThrow('Max position size must be between 0 and 1')

      expect(() => {
        manager.validatePositionSize(mockPosition, mockPortfolio, 1.5)
      }).toThrow('Max position size must be between 0 and 1')
    })

    test('should throw error when portfolio total value is invalid', () => {
      const invalidPortfolio = { ...mockPortfolio, totalValue: 0 }
      
      expect(() => {
        manager.validatePositionSize(mockPosition, invalidPortfolio, 0.2)
      }).toThrow('Portfolio total value must be positive')
    })
  })

  // ========== 回撤计算测试 ==========

  describe('calculateDrawdown', () => {
    test('should calculate drawdown correctly', () => {
      const drawdown = manager.calculateDrawdown(mockPortfolio)
      expect(drawdown).toBeCloseTo(0.0909, 4)
    })

    test('should return 0 when current equity equals peak', () => {
      const portfolio = { ...mockPortfolio, equity: 110000, peakEquity: 110000 }
      const drawdown = manager.calculateDrawdown(portfolio)
      expect(drawdown).toBe(0)
    })

    test('should return 0 when current equity exceeds peak', () => {
      const portfolio = { ...mockPortfolio, equity: 120000, peakEquity: 110000 }
      const drawdown = manager.calculateDrawdown(portfolio)
      expect(drawdown).toBe(0)
    })

    test('should handle maximum drawdown (100%)', () => {
      const portfolio = { ...mockPortfolio, equity: 0, peakEquity: 110000 }
      const drawdown = manager.calculateDrawdown(portfolio)
      expect(drawdown).toBe(1)
    })

    test('should use totalValue if equity not provided', () => {
      const portfolio = { totalValue: 100000, peakEquity: 110000 }
      const drawdown = manager.calculateDrawdown(portfolio)
      expect(drawdown).toBeCloseTo(0.0909, 4)
    })

    test('should throw error when portfolio is missing', () => {
      expect(() => {
        manager.calculateDrawdown(null)
      }).toThrow('Portfolio is required')
    })

    test('should throw error when current equity is invalid', () => {
      const portfolio = { equity: -1000, peakEquity: 110000 }
      expect(() => {
        manager.calculateDrawdown(portfolio)
      }).toThrow('Current equity must be a non-negative number')
    })

    test('should throw error when peak equity is invalid', () => {
      const portfolio = { equity: 100000, peakEquity: 0 }
      expect(() => {
        manager.calculateDrawdown(portfolio)
      }).toThrow('Peak equity must be a positive number')
    })
  })

  // ========== 风险限制检查测试 ==========

  describe('checkRiskLimits', () => {
    test('should pass when all limits are satisfied', () => {
      const riskLimits = {
        maxDrawdown: 0.15,
        maxPositions: 5,
        maxPositionSize: 0.2,
        minCashBalance: 10000
      }

      const result = manager.checkRiskLimits(mockPortfolio, riskLimits)
      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    test('should detect max drawdown violation', () => {
      const riskLimits = { maxDrawdown: 0.05 }
      const result = manager.checkRiskLimits(mockPortfolio, riskLimits)

      expect(result.passed).toBe(false)
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].type).toBe('MAX_DRAWDOWN_EXCEEDED')
    })

    test('should detect max positions violation', () => {
      const portfolio = {
        ...mockPortfolio,
        positions: [mockPosition, mockPosition, mockPosition]
      }
      const riskLimits = { maxPositions: 2 }
      const result = manager.checkRiskLimits(portfolio, riskLimits)

      expect(result.passed).toBe(false)
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].type).toBe('MAX_POSITIONS_EXCEEDED')
    })

    test('should detect position size violation', () => {
      const largePosition = {
        ...mockPosition,
        quantity: 300,
        currentPrice: 150
      }
      const portfolio = {
        ...mockPortfolio,
        positions: [largePosition]
      }
      const riskLimits = { maxPositionSize: 0.2 }
      const result = manager.checkRiskLimits(portfolio, riskLimits)

      expect(result.passed).toBe(false)
      expect(result.violations.some(v => v.type === 'POSITION_SIZE_EXCEEDED')).toBe(true)
    })

    test('should detect min cash balance violation', () => {
      const portfolio = { ...mockPortfolio, cash: 5000 }
      const riskLimits = { minCashBalance: 10000 }
      const result = manager.checkRiskLimits(portfolio, riskLimits)

      expect(result.passed).toBe(false)
      expect(result.violations).toHaveLength(1)
      expect(result.violations[0].type).toBe('MIN_CASH_BALANCE_VIOLATED')
    })

    test('should detect multiple violations', () => {
      const portfolio = {
        ...mockPortfolio,
        cash: 5000,
        positions: [mockPosition, mockPosition, mockPosition]
      }
      const riskLimits = {
        maxPositions: 2,
        minCashBalance: 10000
      }
      const result = manager.checkRiskLimits(portfolio, riskLimits)

      expect(result.passed).toBe(false)
      expect(result.violations.length).toBeGreaterThanOrEqual(2)
    })

    test('should throw error when portfolio is missing', () => {
      expect(() => {
        manager.checkRiskLimits(null, {})
      }).toThrow('Portfolio is required')
    })
  })

  // ========== 策略暂停/恢复测试 ==========

  describe('Strategy Pause/Resume', () => {
    test('should pause strategy', () => {
      manager.pauseStrategy('strategy_123', 'Max drawdown exceeded')
      
      expect(manager.isStrategyPaused('strategy_123')).toBe(true)
      
      const state = manager.getStrategyState('strategy_123')
      expect(state.paused).toBe(true)
      expect(state.reason).toBe('Max drawdown exceeded')
      expect(state.pausedAt).toBeInstanceOf(Date)
    })

    test('should resume strategy', () => {
      manager.pauseStrategy('strategy_123')
      manager.resumeStrategy('strategy_123')
      
      expect(manager.isStrategyPaused('strategy_123')).toBe(false)
      
      const state = manager.getStrategyState('strategy_123')
      expect(state.paused).toBe(false)
      expect(state.resumedAt).toBeInstanceOf(Date)
    })

    test('should return false for non-paused strategy', () => {
      expect(manager.isStrategyPaused('strategy_456')).toBe(false)
    })

    test('should return null for non-existent strategy state', () => {
      const state = manager.getStrategyState('strategy_789')
      expect(state).toBeNull()
    })

    test('should throw error when strategy ID is missing', () => {
      expect(() => manager.pauseStrategy(null)).toThrow('Strategy ID is required')
      expect(() => manager.resumeStrategy(null)).toThrow('Strategy ID is required')
      expect(() => manager.isStrategyPaused(null)).toThrow('Strategy ID is required')
      expect(() => manager.getStrategyState(null)).toThrow('Strategy ID is required')
    })
  })

  // ========== 风险警告测试 ==========

  describe('sendRiskAlert', () => {
    test('should send risk alert', async () => {
      const alert = await manager.sendRiskAlert('STOP_LOSS_TRIGGERED', {
        symbol: 'AAPL',
        price: 145
      })

      expect(alert.id).toBeDefined()
      expect(alert.type).toBe('STOP_LOSS_TRIGGERED')
      expect(alert.details.symbol).toBe('AAPL')
      expect(alert.timestamp).toBeInstanceOf(Date)
      expect(alert.severity).toBe('HIGH')
    })

    test('should assign correct severity levels', async () => {
      const alert1 = await manager.sendRiskAlert('MAX_DRAWDOWN_EXCEEDED', {})
      expect(alert1.severity).toBe('CRITICAL')

      const alert2 = await manager.sendRiskAlert('TAKE_PROFIT_TRIGGERED', {})
      expect(alert2.severity).toBe('MEDIUM')

      const alert3 = await manager.sendRiskAlert('UNKNOWN_TYPE', {})
      expect(alert3.severity).toBe('MEDIUM')
    })

    test('should store risk events', async () => {
      await manager.sendRiskAlert('STOP_LOSS_TRIGGERED', {})
      await manager.sendRiskAlert('TAKE_PROFIT_TRIGGERED', {})

      const events = manager.getRiskEvents()
      expect(events.length).toBeGreaterThanOrEqual(2)
    })

    test('should limit risk events history to 1000', async () => {
      // 添加1100个事件
      for (let i = 0; i < 1100; i++) {
        await manager.sendRiskAlert('TEST_EVENT', { index: i })
      }

      const events = manager.getRiskEvents()
      expect(events.length).toBe(1000)
    })

    test('should throw error when alert type is missing', async () => {
      await expect(manager.sendRiskAlert(null, {})).rejects.toThrow('Alert type is required')
    })
  })

  // ========== 风险事件查询测试 ==========

  describe('getRiskEvents', () => {
    beforeEach(async () => {
      await manager.sendRiskAlert('STOP_LOSS_TRIGGERED', { symbol: 'AAPL' })
      await manager.sendRiskAlert('TAKE_PROFIT_TRIGGERED', { symbol: 'MSFT' })
      await manager.sendRiskAlert('MAX_DRAWDOWN_EXCEEDED', {})
    })

    test('should get all events without filters', () => {
      const events = manager.getRiskEvents()
      expect(events.length).toBeGreaterThanOrEqual(3)
    })

    test('should filter by type', () => {
      const events = manager.getRiskEvents({ type: 'STOP_LOSS_TRIGGERED' })
      expect(events.every(e => e.type === 'STOP_LOSS_TRIGGERED')).toBe(true)
    })

    test('should filter by severity', () => {
      const events = manager.getRiskEvents({ severity: 'CRITICAL' })
      expect(events.every(e => e.severity === 'CRITICAL')).toBe(true)
    })

    test('should filter by date range', () => {
      const startDate = new Date(Date.now() - 1000)
      const endDate = new Date(Date.now() + 1000)

      const events = manager.getRiskEvents({ startDate, endDate })
      expect(events.every(e => e.timestamp >= startDate && e.timestamp <= endDate)).toBe(true)
    })

    test('should limit results', () => {
      const events = manager.getRiskEvents({ limit: 2 })
      expect(events.length).toBeLessThanOrEqual(2)
    })
  })

  // ========== 清除风险事件测试 ==========

  describe('clearRiskEvents', () => {
    test('should clear all risk events', async () => {
      await manager.sendRiskAlert('TEST_EVENT', {})
      await manager.sendRiskAlert('TEST_EVENT', {})

      const count = manager.clearRiskEvents()
      expect(count).toBeGreaterThanOrEqual(2)

      const events = manager.getRiskEvents()
      expect(events.length).toBe(0)
    })
  })

  // ========== 盈亏计算测试 ==========

  describe('calculateUnrealizedPnL', () => {
    test('should calculate unrealized PnL for long position', () => {
      const pnl = manager.calculateUnrealizedPnL(mockPosition, 155)
      expect(pnl).toBe(500) // (155 - 150) * 100
    })

    test('should calculate unrealized PnL for short position', () => {
      const shortPosition = { ...mockPosition, quantity: -100 }
      const pnl = manager.calculateUnrealizedPnL(shortPosition, 145)
      expect(pnl).toBe(500) // (145 - 150) * -100
    })

    test('should handle negative PnL', () => {
      const pnl = manager.calculateUnrealizedPnL(mockPosition, 145)
      expect(pnl).toBe(-500)
    })

    test('should throw error when position is missing', () => {
      expect(() => {
        manager.calculateUnrealizedPnL(null, 150)
      }).toThrow('Position is required')
    })

    test('should throw error when current price is invalid', () => {
      expect(() => {
        manager.calculateUnrealizedPnL(mockPosition, -10)
      }).toThrow('Current price must be a positive number')
    })
  })

  describe('calculatePnLPercent', () => {
    test('should calculate PnL percentage for long position', () => {
      const pnlPercent = manager.calculatePnLPercent(mockPosition, 165)
      expect(pnlPercent).toBeCloseTo(0.1, 4) // (165 - 150) / 150 = 0.1 (10%)
    })

    test('should calculate PnL percentage for short position', () => {
      const shortPosition = { ...mockPosition, quantity: -100 }
      const pnlPercent = manager.calculatePnLPercent(shortPosition, 135)
      expect(pnlPercent).toBeCloseTo(0.1, 4) // (135 - 150) / 150 * -1 = 0.1 (10%)
    })

    test('should handle negative PnL percentage', () => {
      const pnlPercent = manager.calculatePnLPercent(mockPosition, 135)
      expect(pnlPercent).toBeCloseTo(-0.1, 4)
    })

    test('should throw error when position is missing', () => {
      expect(() => {
        manager.calculatePnLPercent(null, 150)
      }).toThrow('Position is required')
    })

    test('should throw error when current price is invalid', () => {
      expect(() => {
        manager.calculatePnLPercent(mockPosition, -10)
      }).toThrow('Current price must be a positive number')
    })

    test('should throw error when entry price is invalid', () => {
      const invalidPosition = { ...mockPosition, entryPrice: 0 }
      expect(() => {
        manager.calculatePnLPercent(invalidPosition, 150)
      }).toThrow('Entry price must be positive')
    })
  })
})

