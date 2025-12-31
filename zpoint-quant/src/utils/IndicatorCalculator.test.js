/**
 * 技术指标计算器单元测试
 * 
 * 需求：3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, test, expect, beforeEach } from 'vitest'
import IndicatorCalculator from './IndicatorCalculator.js'

describe('IndicatorCalculator', () => {
  let calculator

  beforeEach(() => {
    calculator = new IndicatorCalculator()
  })

  describe('calculateMA - 移动平均线', () => {
    test('should calculate simple moving average correctly', () => {
      const prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const ma = calculator.calculateMA(prices, 3)
      
      // MA(3) = [(1+2+3)/3, (2+3+4)/3, (3+4+5)/3, ...]
      expect(ma).toHaveLength(8)
      expect(ma[0]).toBeCloseTo(2, 5) // (1+2+3)/3 = 2
      expect(ma[1]).toBeCloseTo(3, 5) // (2+3+4)/3 = 3
      expect(ma[7]).toBeCloseTo(9, 5) // (8+9+10)/3 = 9
    })

    test('should handle period equal to array length', () => {
      const prices = [1, 2, 3, 4, 5]
      const ma = calculator.calculateMA(prices, 5)
      
      expect(ma).toHaveLength(1)
      expect(ma[0]).toBeCloseTo(3, 5) // (1+2+3+4+5)/5 = 3
    })

    test('should throw error for empty array', () => {
      expect(() => calculator.calculateMA([], 5)).toThrow('non-empty array')
    })

    test('should throw error for insufficient data', () => {
      const prices = [1, 2, 3]
      expect(() => calculator.calculateMA(prices, 5)).toThrow('Insufficient data')
    })

    test('should throw error for invalid period', () => {
      const prices = [1, 2, 3, 4, 5]
      expect(() => calculator.calculateMA(prices, 0)).toThrow('positive integer')
      expect(() => calculator.calculateMA(prices, -1)).toThrow('positive integer')
      expect(() => calculator.calculateMA(prices, 2.5)).toThrow('positive integer')
    })

    test('should throw error for invalid prices', () => {
      expect(() => calculator.calculateMA([1, 2, NaN, 4], 2)).toThrow('valid numbers')
      expect(() => calculator.calculateMA([1, 2, 'invalid', 4], 2)).toThrow('valid numbers')
    })

    test('should work with decimal prices', () => {
      const prices = [10.5, 11.2, 10.8, 11.5, 12.1]
      const ma = calculator.calculateMA(prices, 3)
      
      expect(ma).toHaveLength(3)
      expect(ma[0]).toBeCloseTo((10.5 + 11.2 + 10.8) / 3, 5)
    })
  })

  describe('calculateRSI - 相对强弱指标', () => {
    test('should calculate RSI correctly', () => {
      // 使用简单的价格序列
      const prices = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64]
      const rsi = calculator.calculateRSI(prices, 14)
      
      // 20 prices - 14 period = 6 RSI values (from index 14 to 19)
      expect(rsi).toHaveLength(6)
      expect(rsi[0]).toBeGreaterThan(0)
      expect(rsi[0]).toBeLessThan(100)
    })

    test('should return RSI values between 0 and 100', () => {
      const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
      const rsi = calculator.calculateRSI(prices, 14)
      
      rsi.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      })
    })

    test('should handle all increasing prices (RSI near 100)', () => {
      const prices = Array.from({ length: 20 }, (_, i) => i + 1)
      const rsi = calculator.calculateRSI(prices, 14)
      
      // 持续上涨应该接近100
      expect(rsi[rsi.length - 1]).toBeGreaterThan(90)
    })

    test('should handle all decreasing prices (RSI near 0)', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 20 - i)
      const rsi = calculator.calculateRSI(prices, 14)
      
      // 持续下跌应该接近0
      expect(rsi[rsi.length - 1]).toBeLessThan(10)
    })

    test('should throw error for insufficient data', () => {
      const prices = [1, 2, 3, 4, 5]
      expect(() => calculator.calculateRSI(prices, 14)).toThrow('Insufficient data')
    })

    test('should throw error for invalid period', () => {
      const prices = Array.from({ length: 20 }, (_, i) => i + 1)
      expect(() => calculator.calculateRSI(prices, 0)).toThrow('positive integer')
      expect(() => calculator.calculateRSI(prices, -1)).toThrow('positive integer')
    })

    test('should throw error for negative prices', () => {
      const prices = [10, 11, -5, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]
      expect(() => calculator.calculateRSI(prices, 14)).toThrow('non-negative')
    })

    test('should filter NaN/Infinity and compute RSI on cleaned data', () => {
      const raw = [100, NaN, 102, Infinity, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115]
      const cleaned = raw.filter(p => typeof p === 'number' && Number.isFinite(p))
      // sanity check
      expect(cleaned.length).toBeGreaterThanOrEqual(15)

      const rsiRaw = calculator.calculateRSI(raw, 14)
      const rsiClean = calculator.calculateRSI(cleaned, 14)

      expect(rsiRaw).toEqual(rsiClean)
    })
  })

  describe('calculateMACD - MACD指标', () => {
    test('should calculate MACD correctly', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i / 5) * 10)
      const macd = calculator.calculateMACD(prices, 12, 26, 9)
      
      expect(macd).toHaveProperty('macd')
      expect(macd).toHaveProperty('signal')
      expect(macd).toHaveProperty('histogram')
      
      expect(Array.isArray(macd.macd)).toBe(true)
      expect(Array.isArray(macd.signal)).toBe(true)
      expect(Array.isArray(macd.histogram)).toBe(true)
      
      expect(macd.macd.length).toBeGreaterThan(0)
      expect(macd.signal.length).toBeGreaterThan(0)
      expect(macd.histogram.length).toBeGreaterThan(0)
    })

    test('should have histogram equal to macd minus signal', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i)
      const macd = calculator.calculateMACD(prices, 12, 26, 9)
      
      // 验证柱状图 = MACD - 信号线
      for (let i = 0; i < macd.histogram.length; i++) {
        expect(macd.histogram[i]).toBeCloseTo(macd.macd[i] - macd.signal[i], 10)
      }
    })

    test('should have all arrays of same length', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i)
      const macd = calculator.calculateMACD(prices, 12, 26, 9)
      
      expect(macd.macd.length).toBe(macd.signal.length)
      expect(macd.signal.length).toBe(macd.histogram.length)
    })

    test('should throw error for insufficient data', () => {
      const prices = Array.from({ length: 30 }, (_, i) => i + 1)
      expect(() => calculator.calculateMACD(prices, 12, 26, 9)).toThrow('Insufficient data')
    })

    test('should throw error if fast period >= slow period', () => {
      const prices = Array.from({ length: 50 }, (_, i) => i + 1)
      expect(() => calculator.calculateMACD(prices, 26, 12, 9)).toThrow('Fast period must be less than slow period')
      expect(() => calculator.calculateMACD(prices, 26, 26, 9)).toThrow('Fast period must be less than slow period')
    })

    test('should throw error for invalid periods', () => {
      const prices = Array.from({ length: 50 }, (_, i) => i + 1)
      expect(() => calculator.calculateMACD(prices, 0, 26, 9)).toThrow('positive integer')
      expect(() => calculator.calculateMACD(prices, 12, 0, 9)).toThrow('positive integer')
      expect(() => calculator.calculateMACD(prices, 12, 26, 0)).toThrow('positive integer')
    })
  })

  describe('calculateBollingerBands - 布林带', () => {
    test('should calculate Bollinger Bands correctly', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3) * 5)
      const bands = calculator.calculateBollingerBands(prices, 20, 2)
      
      expect(bands).toHaveProperty('upper')
      expect(bands).toHaveProperty('middle')
      expect(bands).toHaveProperty('lower')
      
      expect(bands.upper.length).toBe(bands.middle.length)
      expect(bands.middle.length).toBe(bands.lower.length)
    })

    test('should maintain band order: upper >= middle >= lower', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.random() * 10)
      const bands = calculator.calculateBollingerBands(prices, 20, 2)
      
      for (let i = 0; i < bands.upper.length; i++) {
        expect(bands.upper[i]).toBeGreaterThanOrEqual(bands.middle[i])
        expect(bands.middle[i]).toBeGreaterThanOrEqual(bands.lower[i])
      }
    })

    test('should have middle band equal to MA', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i)
      const bands = calculator.calculateBollingerBands(prices, 20, 2)
      const ma = calculator.calculateMA(prices, 20)
      
      expect(bands.middle.length).toBe(ma.length)
      for (let i = 0; i < ma.length; i++) {
        expect(bands.middle[i]).toBeCloseTo(ma[i], 10)
      }
    })

    test('should widen bands with larger stdDev multiplier', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3) * 5)
      const bands1 = calculator.calculateBollingerBands(prices, 20, 1)
      const bands2 = calculator.calculateBollingerBands(prices, 20, 2)
      
      // 更大的标准差倍数应该产生更宽的带
      for (let i = 0; i < bands1.upper.length; i++) {
        const width1 = bands1.upper[i] - bands1.lower[i]
        const width2 = bands2.upper[i] - bands2.lower[i]
        expect(width2).toBeGreaterThan(width1)
      }
    })

    test('should throw error for insufficient data', () => {
      const prices = [1, 2, 3, 4, 5]
      expect(() => calculator.calculateBollingerBands(prices, 20, 2)).toThrow('Insufficient data')
    })

    test('should throw error for invalid parameters', () => {
      const prices = Array.from({ length: 30 }, (_, i) => i + 1)
      expect(() => calculator.calculateBollingerBands(prices, 0, 2)).toThrow('positive integer')
      expect(() => calculator.calculateBollingerBands(prices, 20, 0)).toThrow('positive number')
      expect(() => calculator.calculateBollingerBands(prices, 20, -1)).toThrow('positive number')
    })
  })

  describe('calculateKDJ - KDJ指标', () => {
    test('should calculate KDJ correctly', () => {
      const klines = Array.from({ length: 20 }, (_, i) => ({
        high: 105 + i,
        low: 95 + i,
        close: 100 + i
      }))
      const kdj = calculator.calculateKDJ(klines, 9)
      
      expect(kdj).toHaveProperty('k')
      expect(kdj).toHaveProperty('d')
      expect(kdj).toHaveProperty('j')
      
      expect(kdj.k.length).toBe(kdj.d.length)
      expect(kdj.d.length).toBe(kdj.j.length)
      expect(kdj.k.length).toBe(12) // 20 - 9 + 1
    })

    test('should have all arrays of same length', () => {
      const klines = Array.from({ length: 20 }, (_, i) => ({
        high: 105,
        low: 95,
        close: 100
      }))
      const kdj = calculator.calculateKDJ(klines, 9)
      
      expect(kdj.k.length).toBe(kdj.d.length)
      expect(kdj.d.length).toBe(kdj.j.length)
    })

    test('should throw error for insufficient data', () => {
      const klines = Array.from({ length: 5 }, (_, i) => ({
        high: 105,
        low: 95,
        close: 100
      }))
      expect(() => calculator.calculateKDJ(klines, 9)).toThrow('Insufficient data')
    })

    test('should throw error for invalid kline data', () => {
      const invalidKlines = [
        { high: 105, low: 95 }, // missing close
        { high: 105, low: 95, close: 100 }
      ]
      expect(() => calculator.calculateKDJ(invalidKlines, 2)).toThrow('valid high, low, and close')
    })

    test('should throw error for invalid price relationships', () => {
      const invalidKlines = Array.from({ length: 10 }, () => ({
        high: 95,  // high < low
        low: 105,
        close: 100
      }))
      expect(() => calculator.calculateKDJ(invalidKlines, 9)).toThrow('valid high, low, and close')
    })

    test('should throw error for close outside high-low range', () => {
      const invalidKlines = Array.from({ length: 10 }, () => ({
        high: 105,
        low: 95,
        close: 110  // close > high
      }))
      expect(() => calculator.calculateKDJ(invalidKlines, 9)).toThrow('valid high, low, and close')
    })

    test('should throw error for invalid period', () => {
      const klines = Array.from({ length: 20 }, (_, i) => ({
        high: 105,
        low: 95,
        close: 100
      }))
      expect(() => calculator.calculateKDJ(klines, 0)).toThrow('positive integer')
      expect(() => calculator.calculateKDJ(klines, -1)).toThrow('positive integer')
    })
  })

  describe('_calculateEMA - 指数移动平均（私有方法）', () => {
    test('should calculate EMA correctly', () => {
      const prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const ema = calculator._calculateEMA(prices, 3)
      
      expect(ema).toHaveLength(8) // 10 - 3 + 1
      expect(ema[0]).toBeCloseTo(2, 5) // 第一个值是SMA: (1+2+3)/3 = 2
    })

    test('should give more weight to recent prices', () => {
      // EMA应该对最近的价格给予更多权重
      const prices1 = [10, 10, 10, 10, 10, 10, 10, 10, 10, 20]
      const prices2 = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]
      
      const ema1 = calculator._calculateEMA(prices1, 5)
      const ema2 = calculator._calculateEMA(prices2, 5)
      
      // 最后一个价格是20的EMA应该大于全是10的EMA
      expect(ema1[ema1.length - 1]).toBeGreaterThan(ema2[ema2.length - 1])
    })
  })
})
