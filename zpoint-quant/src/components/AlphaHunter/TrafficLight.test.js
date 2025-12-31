import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TrafficLight from './TrafficLight.vue'

describe('TrafficLight', () => {
  it('shows no active light when no data', () => {
    const w = mount(TrafficLight)
    expect(w.findAll('.light.active').length).toBe(0)
  })

  it('shows green for veryHigh', () => {
    const w = mount(TrafficLight, { props: { item: { rsInfo: { rsStrength: 130 } }, rsThresholds: { veryHigh: 120, high: 95 } } })
    expect(w.find('.light.green.active').exists()).toBe(true)
  })

  it('shows yellow for high', () => {
    const w = mount(TrafficLight, { props: { item: { rsInfo: { rsStrength: 100 } }, rsThresholds: { veryHigh: 120, high: 95 } } })
    expect(w.find('.light.yellow.active').exists()).toBe(true)
  })

  it('shows red for low', () => {
    const w = mount(TrafficLight, { props: { item: { rsInfo: { rsStrength: 50 } }, rsThresholds: { veryHigh: 120, high: 95 } } })
    expect(w.find('.light.red.active').exists()).toBe(true)
  })

  it('shows sniper badge when signals present', () => {
    const w = mount(TrafficLight, { props: { item: { rsInfo: { rsStrength: 50 }, sniper: { signals: [0, 1] } } } })
    expect(w.find('.sniper-badge').exists()).toBe(true)
  })
})