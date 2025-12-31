import { test } from 'vitest'
import fc from 'fast-check'
import StrategyManager from './StrategyManager.js'

const runWithSeed = async (seed) => {
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

          // same checks as before
          if (loaded.id !== strategy.id) throw new Error(`id mismatch for sample ${JSON.stringify(strategyData)}`)
          if (loaded.name !== strategy.name) throw new Error(`name mismatch for sample ${JSON.stringify(strategyData)}`)
          if (loaded.code !== strategy.code) throw new Error(`code mismatch for sample ${JSON.stringify(strategyData)}`)
          if (loaded.status !== strategy.status) throw new Error(`status mismatch for sample ${JSON.stringify(strategyData)}`)
          if (loaded.config.market !== strategy.config.market) throw new Error(`market mismatch for sample ${JSON.stringify(strategyData)}`)
          if (loaded.config.interval !== strategy.config.interval) throw new Error(`interval mismatch for sample ${JSON.stringify(strategyData)}`)
          if (JSON.stringify(loaded.config.symbols) !== JSON.stringify(strategy.config.symbols)) throw new Error(`symbols mismatch for sample ${JSON.stringify(strategyData)}`)
          if (!(loaded.createdAt instanceof Date)) throw new Error(`createdAt not a Date for sample ${JSON.stringify(strategyData)}`)
          if (!(loaded.updatedAt instanceof Date)) throw new Error(`updatedAt not a Date for sample ${JSON.stringify(strategyData)}`)
          if (loaded.createdAt.getTime() !== strategy.createdAt.getTime()) throw new Error(`createdAt time mismatch for sample ${JSON.stringify(strategyData)}`)

          return true
        } finally {
          await testManager.clearAll()
        }
      }
    ),
    { numRuns: 100, seed, verbose: true }
  )
}

test('repro seed -1037441528', async () => {
  await runWithSeed(-1037441528)
})

test('repro seed -1896401399', async () => {
  await runWithSeed(-1896401399)
})