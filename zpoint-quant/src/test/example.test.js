import { describe, it, expect } from 'vitest'
import { createMockMarketData, createMockStrategy } from './setup'

describe('测试框架验证', () => {
  it('应该能够运行基本测试', () => {
    expect(1 + 1).toBe(2)
  })
  
  it('应该能够创建模拟市场数据', () => {
    const data = createMockMarketData(10)
    expect(data).toHaveLength(10)
    expect(data[0]).toHaveProperty('timestamp')
    expect(data[0]).toHaveProperty('open')
    expect(data[0]).toHaveProperty('high')
    expect(data[0]).toHaveProperty('low')
    expect(data[0]).toHaveProperty('close')
    expect(data[0]).toHaveProperty('volume')
  })
  
  it('应该能够创建模拟策略', () => {
    const strategy = createMockStrategy()
    expect(strategy).toHaveProperty('id')
    expect(strategy).toHaveProperty('name')
    expect(strategy).toHaveProperty('code')
    expect(strategy.status).toBe('inactive')
  })
})
