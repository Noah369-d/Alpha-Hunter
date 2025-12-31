import { test } from 'vitest'
import fc from 'fast-check'
import StrategyManager from './StrategyManager.js'

// Re-run the specific property with a failing seed to capture the failing value
test('repro seed -730747428 for Property 2', async () => {
  const manager = new StrategyManager()
  await manager.clearAll()

  const strategyArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    code: fc.constantFrom(
      'function onBar() { return null }',
      'const onBar = () => { return { action: "BUY" } }',
      'function onBar(data, indicators) { if (data.close > 100) return { action: "SELL" }; return null }',
      'let onBar = function() { return { action: "BUY", quantity: 100 } }'
    ),
    config: fc.record({
      market: fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
      symbols: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 5 }),
      interval: fc.constantFrom('1m', '5m', '15m', '1h', '1d'),
      description: fc.string({ maxLength: 200 })
    })
  })

  await fc.assert(
    fc.asyncProperty(
      strategyArb,
      async (strategyData) => {
        const testManager = new StrategyManager()
        await testManager.clearAll()

        try {
          const strategy = testManager.createStrategy(
            strategyData.name,
            strategyData.code,
            strategyData.config
          )

          await testManager.saveStrategy(strategy)

          const loaded = await testManager.loadStrategy(strategy.id)

          if (loaded.id !== strategy.id) return false
          if (loaded.name !== strategy.name) return false
          if (loaded.code !== strategy.code) return false
          if (loaded.status !== strategy.status) return false
          if (loaded.config.market !== strategy.config.market) return false
          if (loaded.config.interval !== strategy.config.interval) return false
          if (JSON.stringify(loaded.config.symbols) !== JSON.stringify(strategy.config.symbols)) return false
          if (!(loaded.createdAt instanceof Date)) return false
          if (!(loaded.updatedAt instanceof Date)) return false
          if (loaded.createdAt.getTime() !== strategy.createdAt.getTime()) return false

          return true
        } finally {
          await testManager.clearAll()
        }
      }
    ),
    { numRuns: 100, seed: -730747428, verbose: true }
  )
})