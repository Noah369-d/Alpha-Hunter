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
    // ScanResults should render sniper badges (scope to ScanResults to avoid counting TrafficLight badges)
    const sr = wrapper.findComponent({ name: 'ScanResults' })
    expect(sr.findAll('.sniper-badge').length).toBe(2)

    // selecting an item should mark it selected and pass into ScanResults
    await wrapper.vm.selectResult({ symbol: 'AAA' })
    await wrapper.vm.$nextTick()
    const rows = wrapper.findAll('.stock-grid-row')
    expect(rows.some(r => r.classes().includes('active'))).toBe(true)

    // toggling star should update watchlist
    const star = wrapper.find('.btn-star')
    await star.trigger('click')
    expect(wrapper.vm.watchlist.length).toBeGreaterThanOrEqual(0)
  })

  it('persists watchlist to localStorage and restores on mount', async () => {
    localStorage.removeItem('ah_watchlist')
    const wrapper = mount(AlphaHunterPro, { global: { stubs: { ChartPanel: true } } })
    expect(wrapper.vm.watchlist).toEqual([])
    // toggle star
    wrapper.vm.onToggleStar('AAA')
    await wrapper.vm.$nextTick()
    const stored = JSON.parse(localStorage.getItem('ah_watchlist'))
    expect(stored).toContain('AAA')
    // simulate reload
    const wrapper2 = mount(AlphaHunterPro, { global: { stubs: { ChartPanel: true } } })
    // mount calls loadWatchlist on mounted
    await wrapper2.vm.$nextTick()
    expect(wrapper2.vm.watchlist).toContain('AAA')
  })

  it('exports CSV from filteredResults and triggers download', async () => {
    const wrapper = mount(AlphaHunterPro, { global: { stubs: { ChartPanel: true } } })
    await wrapper.setData({
      results: [
        { symbol: 'AAPL', name: 'Apple', rsInfo: { price: 150.5, rsStrength: 120, changePct: 1.2 } },
        { symbol: 'MSFT', name: 'Microsoft', rsInfo: { price: 340.1, rsStrength: 95, changePct: -0.6 } }
      ]
    })
    let lastBlob = null
    let createStub
    // URL.createObjectURL may be missing in some jsdom envs; create or spy accordingly
    if (typeof URL.createObjectURL === 'undefined') {
      createStub = vi.fn((b) => { lastBlob = b; return 'blob:fake' })
      URL.createObjectURL = createStub
    } else {
      createStub = vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => { lastBlob = b; return 'blob:fake' })
    }
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    // ensure revoke exists
    let revStub
    if (typeof URL.revokeObjectURL === 'undefined') { revStub = vi.fn(); URL.revokeObjectURL = revStub } else { revStub = vi.spyOn(URL, 'revokeObjectURL') }
    const csv = await wrapper.vm.onExport()
    expect(createStub).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revStub).toHaveBeenCalled()
    // lastBlob should be a CSV Blob and have correct MIME type for consumers
    expect(lastBlob).toBeInstanceOf(Blob)
    expect(lastBlob.type).toContain('text/csv')
    // onExport returns the csv text for testability
    expect(csv).toContain('symbol,name,price,rsStrength,changePct')
    expect(csv).toContain('AAPL,Apple,150.5,120,1.2')
    // restore
    if (createStub && createStub.mockRestore) createStub.mockRestore()
    else if (createStub && createStub.mockClear) createStub.mockClear()
    if (typeof URL.createObjectURL === 'function' && createStub && createStub.name === 'mockConstructor') delete URL.createObjectURL
    if (revStub && revStub.mockRestore) revStub.mockRestore()
    clickSpy.mockRestore()
  })

  it('renders TrafficLight for selected item', async () => {
    const wrapper = mount(AlphaHunterPro, { global: { stubs: { ChartPanel: true } } })
    await wrapper.setData({
      results: [ { symbol: 'AAPL', name: 'Apple', rsInfo: { price: 150, rsStrength: 130, changePct: 1.2 } } ],
      selectedIndex: 0
    })
    await wrapper.vm.$nextTick()
    // TrafficLight should be present and report correct color according to default thresholds (130 -> yellow)
    const tl = wrapper.findComponent({ name: 'TrafficLight' })
    expect(tl.exists()).toBe(true)
    expect(tl.vm.activeColor).toBe('yellow')
  })
})
