import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FilterTabs from './FilterTabs.vue'

describe('FilterTabs', () => {
  it('renders sniper tab with sniper class', () => {
    const wrapper = mount(FilterTabs, { props: { modelValue: 'all' } })
    const sniperBtn = wrapper.find('button.sniper')
    expect(sniperBtn.exists()).toBe(true)
  })
})
