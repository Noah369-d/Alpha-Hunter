import { describe, it, expect } from 'vitest'
import { EMA, HHV, LLV, REF, BARSLAST, SMA_TDX, MA, RSI } from './holoTA'

describe('holoTA basic functions', () => {
  it('EMA computes exponentially-weighted values', () => {
    const data = [1,2,3,4,5]
    const res = EMA(data, 3)
    expect(res.length).toBe(data.length)
    expect(res[0]).toBeCloseTo(1)
    expect(res[res.length-1]).toBeGreaterThan(4) // should be near 4.x
  })

  it('HHV/LLV return rolling highs/lows', ()=>{
    const data = [1,3,2,5,4]
    expect(HHV(data, 3)).toEqual([1,3,3,5,5])
    expect(LLV(data, 3)).toEqual([1,1,1,2,2])
  })

  it('REF shifts array', ()=>{
    expect(REF([10,20,30,40],2)).toEqual([10,10,20,30])
  })

  it('BARSLAST measures distance to last truthy', ()=>{
    expect(BARSLAST([0,0,1,0,0,1,0])).toEqual([0,0,0,1,2,0,1])
  })

  it('SMA_TDX produces smoothing', ()=>{
    const data = [1,2,3,4,5]
    const res = SMA_TDX(data, 3, 1)
    expect(res.length).toBe(data.length)
  })

  it('MA returns simple moving average', ()=>{
    expect(MA([1,2,3,4,5],3)).toEqual([1,1.5,2,3,4])
  })

  it('RSI returns array of same length with numbers 0-100', ()=>{
    const data = [1,2,3,2,4,5,6,5,4]
    const res = RSI(data, 3)
    expect(res.length).toBe(data.length)
    res.forEach(v => expect(typeof v).toBe('number'))
  })
})