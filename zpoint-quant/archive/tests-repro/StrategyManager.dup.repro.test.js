import { test, expect } from 'vitest'
import StrategyManager from './StrategyManager.js'

const cases = [
  { originalName: '!', copyName: ' !' },
  { originalName: '2', copyName: ' 2 ' },
  { originalName: 'C', copyName: 'C (copy)' },
  { originalName: ' ] ', copyName: ' ] ' }
]

cases.forEach(({ originalName, copyName }) => {
  test(`repro duplicate: ${JSON.stringify({ originalName, copyName })}`, async () => {
    const manager = new StrategyManager()
    await manager.clearAll()

    const orig = manager.createStrategy(originalName, 'function onBar() { return { action: "BUY" } }')
    await manager.saveStrategy(orig)

    const dup = await manager.duplicateStrategy(orig.id, copyName)

    console.log('orig.name:', JSON.stringify(orig.name), 'dup.name:', JSON.stringify(dup.name))

    expect(dup.id).not.toBe(orig.id)
    expect(dup.code).toBe(orig.code)
    expect(dup.name).toBe((copyName || `${orig.name} (Copy)`).trim())
  })
})