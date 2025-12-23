import MarketDataAdapter from './MarketDataAdapter.js'
import { calculateRS_Standard, calculateSniper } from './alphaAlgo'

function getBenchSym(sym) {
  if (!sym) return 'SPY'
  const s = sym.toUpperCase()
  if (s.includes('.SS') || s.includes('.SZ')) return '000001.SS'
  if (s.includes('.HK')) return '^HSI'
  return 'SPY'
}

export async function scanSymbol(symbol, options = {}) {
  const adapter = options.adapter || new MarketDataAdapter()
  const benchSym = getBenchSym(symbol)

  // fetch stock and bench histories (1d)
  const [stockData, benchData] = await Promise.all([
    adapter.fetchData(symbol, '1d'),
    adapter.fetchData(benchSym, '1d')
  ])

  // normalize to arrays for algorithm
  const stock = {
    dates: stockData.map(d => d.timestamp.toISOString().split('T')[0]),
    close: stockData.map(d => d.close)
  }
  const benchMap = {}
  benchData.forEach(d => benchMap[d.timestamp.toISOString().split('T')[0]] = d.close)

  const rsInfo = calculateRS_Standard(stock, benchMap)
  const sniper = calculateSniper({ high: stockData.map(d=>d.high), low: stockData.map(d=>d.low), close: stockData.map(d=>d.close) })

  return { symbol, rsInfo, sniper }
}

export default { scanSymbol }
