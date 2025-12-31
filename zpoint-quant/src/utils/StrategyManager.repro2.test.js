import { test } from 'vitest'
import StrategyManager from './StrategyManager.js'

test('repro numeric name "2" persistence', async () => {
  const m = new StrategyManager()
  await m.clearAll()

  const s = m.createStrategy('2', 'function onBar() { return null }')
  await m.saveStrategy(s)

  const list = await m.listStrategies()
  console.log('created:', s)
  console.log('list:', list)

  if (!list.find(x => x.id === s.id)) throw new Error('not found')
})