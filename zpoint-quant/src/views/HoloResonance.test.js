import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import HoloResonance from './HoloResonance.vue'

describe('HoloResonance view', () => {
  it('renders title, controls and demo stock rows', async () => {
    const wrapper = mount(HoloResonance, { global: { stubs: {} } })

    // header
    expect(wrapper.find('.title').text()).toContain('HoloResonance')

    // controls
    expect(wrapper.find('.controls input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('button.btn-blue').text()).toContain('扫描')

    // periods buttons
    expect(wrapper.findAll('.periods button').length).toBeGreaterThan(0)

    // demo stock rows
    const rows = wrapper.findAll('.stock-grid-row')
    expect(rows.length).toBe(3)
    expect(rows[0].text()).toContain('AAPL')
  })
})
