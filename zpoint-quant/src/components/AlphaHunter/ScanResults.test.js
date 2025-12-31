import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ScanResults from './ScanResults.vue'

describe('ScanResults', () => {
  it('shows empty placeholder when no items', () => {
    const w = mount(ScanResults, { props: { items: [] } })
    expect(w.text()).toContain('请点击')
  })

  it('renders RS badges and change classes', async () => {
    const items = [
      { symbol: 'A', rsInfo: { rsStrength: 150, price: 10, changePct: 12.3 } },
      { symbol: 'B', rsInfo: { rsStrength: 120, price: 20, changePct: -3.4 } },
      { symbol: 'C', rsInfo: { rsStrength: 95, price: 5, changePct: 0.5 } },
      { symbol: 'D', rsInfo: { rsStrength: 60, price: 7, changePct: -1.2 } }
    ]
    const w = mount(ScanResults, { props: { items } })
    const badges = w.findAll('.rs-badge')
    expect(badges.length).toBe(4)
    expect(badges[0].classes()).toContain('rs-very-high')
    expect(badges[1].classes()).toContain('rs-high')
    expect(badges[2].classes()).toContain('rs-mid')
    expect(badges[3].classes()).toContain('rs-low')

    const changes = w.findAll('.text-up, .text-down')
    // at least two ups and downs present
    expect(changes.some(n => n.text().includes('+12.3'))).toBeTruthy()
    expect(changes.some(n => n.text().includes('-3.4'))).toBeTruthy()
  })

  it('emits toggle-star on star click', async () => {
    const items = [{ symbol: 'Z', rsInfo: { rsStrength: 100 } }]
    const w = mount(ScanResults, { props: { items } })
    await w.find('.btn-star').trigger('click')
    expect(w.emitted('toggle-star')).toBeDefined()
    expect(w.emitted('toggle-star')[0][0]).toBe('Z')
  })
})