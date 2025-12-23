import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChartPanel from './ChartPanel.vue'

describe('ChartPanel', () => {
  it('renders placeholder when no series', () => {
    // jsdom lacks canvas context; stub it here
    HTMLCanvasElement.prototype.getContext = function () { return { fillStyle: '', fillRect: () => {} } }
    const wrapper = mount(ChartPanel)
    expect(wrapper.find('canvas').exists()).toBe(true)
  })
  it('accepts series prop and does not throw', () => {
    const wrapper = mount(ChartPanel, { props: { series: [1,2,3,4] } })
    expect(wrapper.find('canvas').exists()).toBe(true)
  })
})
