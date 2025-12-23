import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TaskQueue from './TaskQueue.vue'

vi.mock('../../utils/marketService', () => ({
  scanSymbol: vi.fn()
}))

import { scanSymbol } from '../../utils/marketService'

const flush = () => new Promise(res => setTimeout(res, 0))

describe('TaskQueue component', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('starts and completes all tasks', async () => {
    scanSymbol.mockImplementation(sym => new Promise(res => setTimeout(()=>res({ symbol: sym }), 40)))
    const wrapper = mount(TaskQueue, { props: { symbols: ['AAA', 'BBB'], intervalMs: 5 } })
    await wrapper.find('button').trigger('click') // start (first button)
    // wait for 'done' event instead of fixed timeout (polling due to Vue3 instance limitations)
    await new Promise((resolve, reject) => {
      const start = Date.now()
      const iv = setInterval(() => {
        if (wrapper.emitted().done) { clearInterval(iv); resolve() }
        if (Date.now() - start > 500) { clearInterval(iv); reject(new Error('timeout waiting for done')) }
      }, 20)
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.emitted()).toHaveProperty('done')
    expect(wrapper.text()).toContain('成功 2')
    expect(wrapper.vm.finished).toBe(2)
  })

  it('records failures and emits failed', async () => {
    scanSymbol.mockImplementation(sym => sym === 'BAD' ? Promise.reject(new Error('oops')) : Promise.resolve({ symbol: sym }))
    const wrapper = mount(TaskQueue, { props: { symbols: ['OK', 'BAD'], maxRetries: 0, intervalMs: 5 } })
    await wrapper.find('button').trigger('click')
    await flush()
    await flush()
    expect(wrapper.vm.failureCount).toBe(1)
    // failed event emitted at least once
    const failed = wrapper.emitted().failed
    expect(failed).toBeTruthy()
  })

  it('can be paused (state changes to paused)', async () => {
    // make scanSymbol never resolve to simulate long-running task
    scanSymbol.mockImplementation(() => new Promise(() => {}))
    const wrapper = mount(TaskQueue, { props: { symbols: ['LONG'], intervalMs: 5 } })
    // start
    await wrapper.find('button').trigger('click')
    // ensure running state
    expect(wrapper.vm.state).toBe('running')
    // click pause (second button)
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.vm.state).toBe('paused')
    // when paused, progress should stop advancing
    const before = wrapper.vm.tasks[0].progress
    await new Promise(res => setTimeout(res, 120))
    expect(wrapper.vm.tasks[0].progress).toBe(before)
  })
})
