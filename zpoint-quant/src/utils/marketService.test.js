import { describe, it, expect } from 'vitest'
import { scanSymbol } from './marketService'

class MockAdapter {
  constructor(dataMap) { this.dataMap = dataMap }
  async fetchData(symbol) {
    if (!this.dataMap[symbol]) throw new Error('not found')
    return this.dataMap[symbol]
  }
}

describe('marketService', () => {
  it('scanSymbol computes RS and sniper using mocked adapter', async () => {
    const stockData = []
    const benchData = []
    for (let i=0;i<30;i++) {
      const ts = new Date(2020,0,1+i)
      stockData.push({ timestamp: ts, open: 100+i, high: 101+i, low: 99+i, close: 100+i, volume: 1000 })
      benchData.push({ timestamp: ts, open: 200+i, high: 201+i, low: 199+i, close: 200+i, volume: 2000 })
    }

    const adapter = new MockAdapter({ 'TEST': stockData, 'SPY': benchData })
    const res = await scanSymbol('TEST', { adapter })
    expect(res.symbol).toBe('TEST')
    expect(res.rsInfo).toHaveProperty('rsStrength')
    expect(res.sniper).toHaveProperty('mainMoney')
  })

  it('scanSymbol throws when adapter fails', async () => {
    const adapter = { fetchData: async () => { throw new Error('network') } }
    await expect(scanSymbol('X', { adapter })).rejects.toThrow()
  })
})
