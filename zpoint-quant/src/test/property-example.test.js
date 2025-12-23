import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  arbitraryMarketData,
  arbitraryPriceArray,
  arbitraryStrategy,
  arbitrarySignal,
  arbitraryTrade,
  runPropertyTest
} from './property-helpers'

describe('属性测试示例', () => {
  it('示例：任意价格数组的长度应该在指定范围内', () => {
    // Feature: zpoint-quant, Property Example: 价格数组长度验证
    fc.assert(
      fc.property(
        arbitraryPriceArray(10, 50),
        (prices) => {
          return prices.length >= 10 && prices.length <= 50
        }
      ),
      { numRuns: 100 }
    )
  })
  
  it('示例：任意市场数据应该有有效的价格关系', () => {
    // Feature: zpoint-quant, Property Example: 市场数据价格关系
    fc.assert(
      fc.property(
        arbitraryMarketData(),
        (data) => {
          // high应该 >= max(open, close)
          // low应该 <= min(open, close)
          const maxPrice = Math.max(data.open, data.close)
          const minPrice = Math.min(data.open, data.close)
          
          return data.high >= maxPrice && data.low <= minPrice
        }
      ),
      { numRuns: 100 }
    )
  })
  
  it('示例：任意策略应该有必需的字段', () => {
    // Feature: zpoint-quant, Property Example: 策略对象结构
    fc.assert(
      fc.property(
        arbitraryStrategy(),
        (strategy) => {
          return (
            strategy.hasOwnProperty('id') &&
            strategy.hasOwnProperty('name') &&
            strategy.hasOwnProperty('code') &&
            strategy.hasOwnProperty('config') &&
            strategy.hasOwnProperty('status') &&
            strategy.name.length > 0 &&
            strategy.code.length >= 10
          )
        }
      ),
      { numRuns: 100 }
    )
  })
  
  it('示例：任意交易信号的强度应该在0-100之间', () => {
    // Feature: zpoint-quant, Property Example: 信号强度范围
    fc.assert(
      fc.property(
        arbitrarySignal(),
        (signal) => {
          return signal.strength >= 0 && signal.strength <= 100
        }
      ),
      { numRuns: 100 }
    )
  })
  
  it('示例：任意交易记录的盈亏计算应该正确', () => {
    // Feature: zpoint-quant, Property Example: 交易盈亏计算
    fc.assert(
      fc.property(
        arbitraryTrade(),
        (trade) => {
          const expectedProfit = (trade.exitPrice - trade.entryPrice) * trade.quantity - trade.commission - trade.slippage
          const expectedProfitPercent = (expectedProfit / (trade.entryPrice * trade.quantity)) * 100
          
          // 允许浮点数精度误差
          const profitDiff = Math.abs(trade.profit - expectedProfit)
          const percentDiff = Math.abs(trade.profitPercent - expectedProfitPercent)
          
          return profitDiff < 0.01 && percentDiff < 0.01
        }
      ),
      { numRuns: 100 }
    )
  })
})
