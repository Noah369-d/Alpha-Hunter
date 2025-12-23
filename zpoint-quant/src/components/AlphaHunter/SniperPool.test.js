import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SniperPool from './SniperPool.vue'

describe('SniperPool', () => {
  it('renders items and emits select', async () => {
    const items = [{ symbol: 'A' , rsInfo:{rsStrength:10,changePct:1} }, { symbol: 'B', rsInfo:{rsStrength:50,changePct:2} }]
    const wrapper = mount(SniperPool, { props: { items } })
    expect(wrapper.text()).toContain('狙击池 (2)')
    await wrapper.findAll('li')[1].trigger('click')
    expect(wrapper.emitted().select[0][0].symbol).toBe('B')
  })
})
