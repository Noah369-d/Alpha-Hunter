// Portable TA helpers extracted from 9.9.html
export const EMA = (data, period) => {
  if (!Array.isArray(data) || data.length === 0) return []
  const k = 2 / (period + 1)
  const res = [data[0]]
  for (let i = 1; i < data.length; i++) res.push(data[i] * k + res[i - 1] * (1 - k))
  return res
}

export const HHV = (data, period) => {
  const res = []
  for (let i = 0; i < data.length; i++) {
    res.push(Math.max(...data.slice(Math.max(0, i - period + 1), i + 1)))
  }
  return res
}

export const LLV = (data, period) => {
  const res = []
  for (let i = 0; i < data.length; i++) {
    res.push(Math.min(...data.slice(Math.max(0, i - period + 1), i + 1)))
  }
  return res
}

export const REF = (arr, n) => {
  if (!Array.isArray(arr)) return []
  const res = []
  for (let i = 0; i < arr.length; i++) {
    if (i < n) res.push(arr[0])
    else res.push(arr[i - n + 1])
  }
  return res
}

export const BARSLAST = (arr) => {
  const res = []
  let last = -1
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) last = i
    res.push(last === -1 ? 0 : i - last)
  }
  return res
}

export const SMA_TDX = (data, n, m) => {
  if (!Array.isArray(data) || data.length === 0) return []
  const res = [data[0]]
  for (let i = 1; i < data.length; i++) res.push((data[i] * m + res[i - 1] * (n - m)) / n)
  return res
}

export const MA = (data, period) => {
  const res = []
  for (let i = 0; i < data.length; i++) {
    const start = 0
    const end = i
    const len = Math.min(period, i + 1)
    let sum = 0
    for (let j = 0; j < len; j++) sum += data[i - j]
    res.push(sum / len)
  }
  return res
}

export const SMA = MA

export const RSI = (data, period) => {
  if (!Array.isArray(data) || data.length < 2) return []
  const rsi = []
  let gains = 0
  let losses = 0
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1]
    if (diff > 0) gains += diff
    else losses += -diff
    if (i < period) {
      rsi.push(50) // neutral early
    } else if (i === period) {
      const avgGain = gains / period
      const avgLoss = losses / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      rsi.push(100 - (100 / (1 + rs)))
    } else {
      // Wilder smoothing if needed is omitted for simplicity; use simple aggregation
      const window = data.slice(i - period + 1, i + 1)
      let g = 0, l = 0
      for (let k = 1; k < window.length; k++) {
        const d = window[k] - window[k - 1]
        if (d > 0) g += d
        else l += -d
      }
      const avgG = g / period
      const avgL = l / period
      const rs = avgL === 0 ? 100 : avgG / avgL
      rsi.push(100 - (100 / (1 + rs)))
    }
  }
  // pad to same length as input (first value missing) — prepend a neutral value
  return [50].concat(rsi)
}

export default {
  EMA, HHV, LLV, REF, BARSLAST, SMA_TDX, MA, SMA, RSI
}
