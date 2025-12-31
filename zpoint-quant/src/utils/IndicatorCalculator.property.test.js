/**
 * 技术指标计算器属性测试
 * 使用fast-check进行基于属性的测试
 * 
 * 需求：3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import IndicatorCalculator from './IndicatorCalculator.js'

describe('IndicatorCalculator - Property-Based Tests', () => {
  const calculator = new IndicatorCalculator()

  describe('Property 4: MA计算有效性', () => {
    test('Property 4: Moving Average calculation validity', () => {
      // Feature: zpoint-quant, Property 4: 移动平均线计算有效性
      fc.assert(
        fc.property(
          // 生成价格数组（50-200个数据点，价格在1-1000之间）
          fc.array(fc.float({ min: Math.fround(1), max: Math.fround(1000) , noNaN: true }), { minLength: 50, maxLength: 200 }),
          // 生成周期（5-30）
          fc.integer({ min: 5, max: 30 }),
          (prices, period) => {
            // 确保有足够的数据
            if (prices.length < period) {
              return true
            }

            const ma = calculator.calculateMA(prices, period)

            // 属性1: MA数组长度应该等于 prices.length - period + 1
            const expectedLength = prices.length - period + 1
            if (ma.length !== expectedLength) {
              return false
            }

            // 属性2: 所有MA值应该在价格序列的最小值和最大值之间
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)

            for (const value of ma) {
              if (value < minPrice || value > maxPrice) {
                return false
              }
            }

            // 属性3: 所有MA值都应该是有效数字
            if (!ma.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) {
              return false
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property 4.1: MA is within price range', () => {
      // 验证MA值始终在价格范围内
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: Math.fround(10), max: Math.fround(100) , noNaN: true }), { minLength: 30, maxLength: 100 }),
          fc.integer({ min: 5, max: 20 }),
          (prices, period) => {
            if (prices.length < period) return true

            const ma = calculator.calculateMA(prices, period)
            const min = Math.min(...prices)
            const max = Math.max(...prices)

            return ma.every(v => v >= min && v <= max)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 5: RSI范围约束', () => {
    test('Property 5: RSI indicator range constraint', () => {
      // Feature: zpoint-quant, Property 5: RSI指标范围约束
      fc.assert(
        fc.property(
          // 生成价格数组（50-200个数据点，价格在1-1000之间）
          fc.array(fc.float({ min: Math.fround(1), max: Math.fround(1000) , noNaN: true }), { minLength: 50, maxLength: 200 }),
          // 生成周期（5-30）
          fc.integer({ min: 5, max: 30 }),
          (prices, period) => {
            // 确保有足够的数据（RSI需要period+1个数据点）
            if (prices.length < period + 1) {
              return true
            }

            const rsi = calculator.calculateRSI(prices, period)

            // 属性: 所有RSI值应该在0到100之间（包含边界）
            return rsi.every(value => 
              typeof value === 'number' &&
              !isNaN(value) &&
              value >= 0 &&
              value <= 100
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property 5.1: RSI responds to price trends', () => {
      // 验证RSI对价格趋势的响应
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 100 }),
          fc.float({ min: Math.fround(0.5), max: Math.fround(2) , noNaN: true }),
          (basePrice, trend) => {
            // 生成上涨趋势的价格
            const upPrices = Array.from({ length: 30 }, (_, i) => basePrice + i * trend)
            // 生成下跌趋势的价格
            const downPrices = Array.from({ length: 30 }, (_, i) => basePrice - i * trend)

            // 如果价格序列包含负值则跳过（无效样本）
            if (downPrices.some(p => p < 0) || upPrices.some(p => p < 0)) return true

            const upRSI = calculator.calculateRSI(upPrices, 14)
            const downRSI = calculator.calculateRSI(downPrices, 14)

            // 上涨趋势的RSI应该高于下跌趋势
            return upRSI[upRSI.length - 1] > downRSI[downRSI.length - 1]
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 6: MACD结构完整性', () => {
    test('Property 6: MACD indicator structure integrity', () => {
      // Feature: zpoint-quant, Property 6: MACD指标结构完整性
      fc.assert(
        fc.property(
          // 生成价格数组（50-200个数据点）
          fc.array(fc.float({ min: Math.fround(10), max: Math.fround(1000) , noNaN: true }), { minLength: 50, maxLength: 200 }),
          (prices) => {
            const macd = calculator.calculateMACD(prices, 12, 26, 9)

            // 属性1: 返回的结果应该包含macd、signal和histogram三个字段
            if (!macd.hasOwnProperty('macd') || 
                !macd.hasOwnProperty('signal') || 
                !macd.hasOwnProperty('histogram')) {
              return false
            }

            // 属性2: 所有字段都应该是数组
            if (!Array.isArray(macd.macd) || 
                !Array.isArray(macd.signal) || 
                !Array.isArray(macd.histogram)) {
              return false
            }

            // 属性3: 所有数组长度应该相同
            if (macd.macd.length !== macd.signal.length || 
                macd.signal.length !== macd.histogram.length) {
              return false
            }

            // 属性4: histogram值应该等于macd值减去signal值
            for (let i = 0; i < macd.histogram.length; i++) {
              const expected = macd.macd[i] - macd.signal[i]
              const actual = macd.histogram[i]
              // 使用较小的容差来处理浮点数精度问题
              if (Math.abs(expected - actual) > 1e-10) {
                return false
              }
            }

            // 属性5: 所有值都应该是有效数字
            const allValues = [...macd.macd, ...macd.signal, ...macd.histogram]
            if (!allValues.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) {
              return false
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 7: 布林带轨道顺序不变性', () => {
    test('Property 7: Bollinger Bands track order invariance', () => {
      // Feature: zpoint-quant, Property 7: 布林带轨道顺序不变性
      fc.assert(
        fc.property(
          // 生成价格数组（50-200个数据点）
          fc.array(fc.float({ min: Math.fround(10), max: Math.fround(1000) , noNaN: true }), { minLength: 50, maxLength: 200 }),
          // 生成周期（10-50）
          fc.integer({ min: 10, max: 50 }),
          // 生成标准差倍数（1-3）
          fc.float({ min: Math.fround(1), max: Math.fround(3) , noNaN: true }),
          (prices, period, stdDev) => {
            // 确保有足够的数据
            if (prices.length < period) {
              return true
            }

            const bands = calculator.calculateBollingerBands(prices, period, stdDev)

            // 属性: 在所有数据点上，上轨值应该大于等于中轨值，中轨值应该大于等于下轨值
            for (let i = 0; i < bands.upper.length; i++) {
              if (bands.upper[i] < bands.middle[i]) {
                return false
              }
              if (bands.middle[i] < bands.lower[i]) {
                return false
              }
            }

            // 额外验证: 所有值都应该是有效数字
            const allValues = [...bands.upper, ...bands.middle, ...bands.lower]
            if (!allValues.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) {
              return false
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property 7.1: Bollinger Bands width increases with stdDev', () => {
      // 验证标准差倍数增加时带宽增加
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: Math.fround(10), max: Math.fround(100) , noNaN: true }), { minLength: 30, maxLength: 100 }),
          fc.integer({ min: 10, max: 20 }),
          (prices, period) => {
            if (prices.length < period) return true

            const bands1 = calculator.calculateBollingerBands(prices, period, 1)
            const bands2 = calculator.calculateBollingerBands(prices, period, 2)

            // 更大的标准差倍数应该产生更宽的带
            for (let i = 0; i < bands1.upper.length; i++) {
              const width1 = bands1.upper[i] - bands1.lower[i]
              const width2 = bands2.upper[i] - bands2.lower[i]
              if (width2 <= width1) {
                return false
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8: KDJ结构完整性', () => {
    test('Property 8: KDJ indicator structure integrity', () => {
      // Feature: zpoint-quant, Property 8: KDJ指标结构完整性
      fc.assert(
        fc.property(
          // 生成K线数据数组（20-100个数据点）
          fc.array(
            fc.record({
              high: fc.float({ min: Math.fround(100), max: Math.fround(200) , noNaN: true }),
              low: fc.float({ min: Math.fround(50), max: Math.fround(99) , noNaN: true }),
              close: fc.float({ min: Math.fround(50), max: Math.fround(200) , noNaN: true })
            }).filter(k => k.close >= k.low && k.close <= k.high),
            { minLength: 20, maxLength: 100 }
          ),
          // 生成周期（5-14）
          fc.integer({ min: 5, max: 14 }),
          (klines, period) => {
            // 确保有足够的数据
            if (klines.length < period) {
              return true
            }

            const kdj = calculator.calculateKDJ(klines, period)

            // 属性1: 返回的结果应该包含k、d和j三个字段
            if (!kdj.hasOwnProperty('k') || 
                !kdj.hasOwnProperty('d') || 
                !kdj.hasOwnProperty('j')) {
              return false
            }

            // 属性2: 所有字段都应该是数组
            if (!Array.isArray(kdj.k) || 
                !Array.isArray(kdj.d) || 
                !Array.isArray(kdj.j)) {
              return false
            }

            // 属性3: 所有字段的数组长度应该相同
            if (kdj.k.length !== kdj.d.length || kdj.d.length !== kdj.j.length) {
              return false
            }

            // 属性4: 数组长度应该等于 klines.length - period + 1
            const expectedLength = klines.length - period + 1
            if (kdj.k.length !== expectedLength) {
              return false
            }

            // 属性5: 所有值都应该是有效数字
            const allValues = [...kdj.k, ...kdj.d, ...kdj.j]
            if (!allValues.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) {
              return false
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property 8.1: KDJ J line relationship', () => {
      // 验证J线与K、D线的关系: J = 3K - 2D
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              high: fc.float({ min: Math.fround(100), max: Math.fround(200) , noNaN: true }),
              low: fc.float({ min: Math.fround(50), max: Math.fround(99) , noNaN: true }),
              close: fc.float({ min: Math.fround(50), max: Math.fround(200) , noNaN: true })
            }).filter(k => k.close >= k.low && k.close <= k.high),
            { minLength: 20, maxLength: 50 }
          ),
          fc.integer({ min: 5, max: 14 }),
          (klines, period) => {
            if (klines.length < period) return true

            const kdj = calculator.calculateKDJ(klines, period)

            // 验证 J = 3K - 2D
            for (let i = 0; i < kdj.j.length; i++) {
              const expected = 3 * kdj.k[i] - 2 * kdj.d[i]
              const actual = kdj.j[i]
              // 使用较小的容差来处理浮点数精度问题
              if (Math.abs(expected - actual) > 1e-10) {
                return false
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge Cases and Invariants', () => {
    test('All indicators should handle constant prices', () => {
      // 所有指标都应该能处理恒定价格
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(10), max: Math.fround(1000) , noNaN: true }),
          fc.integer({ min: 50, max: 100 }),
          (price, length) => {
            const prices = Array(length).fill(price)

            // MA应该返回相同的价格
            const ma = calculator.calculateMA(prices, 20)
            if (!ma.every(v => Math.abs(v - price) < 1e-10)) {
              return false
            }

            // RSI应该是50（没有涨跌）
            const rsi = calculator.calculateRSI(prices, 14)
            if (!rsi.every(v => Math.abs(v - 50) < 1)) {
              return false
            }

            // 布林带的上中下轨应该相同
            const bands = calculator.calculateBollingerBands(prices, 20, 2)
            for (let i = 0; i < bands.upper.length; i++) {
              if (Math.abs(bands.upper[i] - bands.middle[i]) > 1e-10 ||
                  Math.abs(bands.middle[i] - bands.lower[i]) > 1e-10) {
                return false
              }
            }

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    test('Indicators should be deterministic', () => {
      // 指标计算应该是确定性的（相同输入产生相同输出）
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: Math.fround(10), max: Math.fround(1000) , noNaN: true }), { minLength: 50, maxLength: 100 }),
          (prices) => {
            const ma1 = calculator.calculateMA(prices, 20)
            const ma2 = calculator.calculateMA(prices, 20)

            if (ma1.length !== ma2.length) return false

            for (let i = 0; i < ma1.length; i++) {
              if (Math.abs(ma1[i] - ma2[i]) > 1e-10) {
                return false
              }
            }

            return true
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
