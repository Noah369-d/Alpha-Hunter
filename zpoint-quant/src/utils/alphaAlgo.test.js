import { describe, it, expect } from 'vitest'
import { calculateRS_Standard, calculateSniper } from './alphaAlgo'

describe('alphaAlgo', () => {
  it('calculateRS_Standard computes RS ratio using bench map', () => {
    const stock = { dates: ['2020-01-01','2020-01-02'], close: [100, 110] };
    const benchMap = { '2020-01-01': 200, '2020-01-02': 220 };
    const r = calculateRS_Standard(stock, benchMap);
    // sRet = 110/100 = 1.1; bench ratio = 220/200 = 1.1 -> RS should be ~100
    expect(r.rsStrength).toBeCloseTo(100)
    expect(r.changePct).toBeCloseTo(10)
  })

  it('calculateSniper returns arrays with expected lengths and signals', () => {
    const len = 60;
    const close = new Array(len).fill(0).map((_,i)=>100 + i*0.5);
    const high = close.map(c=>c + 1);
    const low = close.map(c=>c - 1);
    const res = calculateSniper({ high, low, close });
    expect(res.mainMoney.length).toBe(len)
    expect(res.lights.length).toBe(len)
    expect(res.signals.length).toBe(len)
    // signals should be 0 or 1
    expect(res.signals.every(s => s === 0 || s === 1)).toBeTruthy()
  })

  it('calculateRS_Standard handles missing benchMap or zero denom safely', () => {
    const stock = { dates: ['2020-01-01','2020-01-02'], close: [100, 110] };
    // missing benchMap entries
    const benchMap = { '2020-01-01': 0 };
    const r = calculateRS_Standard(stock, benchMap);
    expect(Number.isFinite(r.rsStrength)).toBeTruthy()
    expect(r.price).toBe(110)
  })

  it('calculateSniper handles very short series without throwing', () => {
    const close = [100, 101, 102];
    const high = close.map(c => c + 0.5);
    const low = close.map(c => c - 0.5);
    const res = calculateSniper({ high, low, close });
    expect(res.mainMoney.length).toBe(close.length)
    expect(res.lights.length).toBe(close.length)
    expect(res.signals.length).toBe(close.length)
  })
})
