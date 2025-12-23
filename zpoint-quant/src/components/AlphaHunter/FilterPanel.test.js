import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FilterPanel from './FilterPanel.vue'

describe('FilterPanel', () => {
  it('emits apply with values', async () => {
    const wrapper = mount(FilterPanel)
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue(40)
    await inputs[1].setValue(1.5)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted().apply).toBeTruthy()
    const payload = wrapper.emitted().apply[0][0]
    expect(payload.rsMin).toBe(40)
    expect(payload.minChange).toBe(1.5)
  })
})
