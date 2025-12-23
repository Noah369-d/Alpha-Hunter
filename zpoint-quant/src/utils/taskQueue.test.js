import { vi } from 'vitest'
import TaskQueue from '../components/AlphaHunter/TaskQueue.vue'
import { mount } from '@vue/test-utils'

// mock marketService before tests so TaskQueue imports mocked binding
vi.mock('../utils/marketService', () => {
  let calls = 0
  return {
    scanSymbol: vi.fn(async (s) => {
      calls++
      // fail first two calls then succeed
      if (calls < 3) throw new Error('transient')
      return { symbol: s, rsInfo: { rsStrength: 100 }, sniper: { signals: [] } }
    })
  }
})

describe('TaskQueue component', () => {
  it('retries failed tasks and emits result/failed', async () => {
    const wrapper = mount(TaskQueue, { props: { symbols: ['A','B'], maxRetries: 2, intervalMs: 1 } })
    await wrapper.vm.start()

    const emitted = wrapper.emitted()
    expect(emitted.result).toBeDefined()
    expect(emitted.failed).toBeUndefined()
  })
})
