import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
vi.mock('../utils/marketService', () => ({ scanSymbol: vi.fn() }))
import AlphaHunterPro from './AlphaHunterPro.vue'
import { scanSymbol } from '../utils/marketService'

describe('AlphaHunterPro integration', () => {
  it('runScan updates results and shows sniper badge', async () => {
    scanSymbol.mockImplementation(sym => Promise.resolve({ rsInfo: { rsStrength: 50, price: 10, changePct: 1 }, sniper: { signals: [1,0] }, symbol: sym }))
    const wrapper = mount(AlphaHunterPro, { global: { stubs: { ChartPanel: true } } })
    // set symbols and click scan
    const input = wrapper.findComponent({ name: 'SymbolInput' })
    // set using data directly for simplicity
    await wrapper.setData({ symbols: 'AAA,BBB' })
    // find the '扫描' button specifically
    const runBtn = wrapper.findAll('button').find(b => b.text().includes('扫描'))
    await runBtn.trigger('click')
    // wait for async updates
    await new Promise(res => setTimeout(res, 20))
    await wrapper.vm.$nextTick()
    // badges should report sniper count 2
    expect(wrapper.vm.badges.sniper).toBe(2)
    // ScanResults should render sniper badges
    expect(wrapper.findAll('.sniper-badge').length).toBe(2)
  })
})
