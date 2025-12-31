import { test, expect } from 'vitest'
import StrategyManager from './StrategyManager.js'

// 临时复现测试：重现 fast-check 报告的 counterexample
test('repro: strategy persistence with special name', async () => {
  const manager = new StrategyManager()
  await manager.clearAll()

  const sample = { name: "'", code: 'function onBar() { return null }' }

  const strategy = manager.createStrategy(sample.name, sample.code)
  await manager.saveStrategy(strategy)

  // 读取内存与 LocalStorage
  const loaded = await manager.loadStrategy(strategy.id)
  console.log('strategy (in-memory):', JSON.stringify(strategy, null, 2))
  console.log('loaded:', JSON.stringify(loaded, null, 2))
  console.log('localStorage store:', global.localStorage.store)

  expect(loaded.id).toBe(strategy.id)
  expect(loaded.name).toBe(strategy.name)
  expect(loaded.code).toBe(strategy.code)
  expect(loaded.createdAt.getTime()).toBe(strategy.createdAt.getTime())
})