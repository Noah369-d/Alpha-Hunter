import { test } from 'vitest'
import StrategyManager from './StrategyManager.js'

test('repro multi persistence single strategy name "2"', async () => {
  const strategiesData = [{ name: '|v|', code: 'function onBar() { return null }' }, { name: 'P', code: 'function onBar() { return null }' }, { name: 'ocaN', code: 'function onBar() { return null }' }]
  const testManager = new StrategyManager()
  await testManager.clearAll()

  try {
    const createdStrategies = []
    for (const data of strategiesData) {
      try {
        const strategy = testManager.createStrategy(data.name, data.code)
        await testManager.saveStrategy(strategy)
        createdStrategies.push(strategy)
        console.log('created id:', strategy.id)
        console.log('map keys now:', Array.from(testManager.strategies.keys()))
      } catch (err) {
        console.error('Error creating/saving strategy in Property 2.1:', err)
        throw err
      }
    }

    const loadedStrategies = await testManager.listStrategies()
    console.log('created.length=', createdStrategies.length, 'loaded.length=', loadedStrategies.length)
    console.log('stored IDs:', Array.from(loadedStrategies.map(s => s.id)))
    if (loadedStrategies.length !== createdStrategies.length) throw new Error('length mismatch')
  } finally {
    await testManager.clearAll()
  }
})