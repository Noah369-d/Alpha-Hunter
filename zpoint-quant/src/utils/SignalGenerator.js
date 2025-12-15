/**
 * SignalGenerator
 * 负责编译策略中的 onSignal 方法，生成标准化信号，并持久化到 IndexedDB
 */

class SignalGenerator {
  constructor(dbName = 'ZpointSignalsDB', version = 1) {
    this.dbName = dbName
    this.version = version
    this.db = null
    this.storeName = 'signals'
  }

  async _init() {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(new Error('Failed to open IndexedDB'))

      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('strategyId', 'strategyId', { unique: false })
          store.createIndex('symbol', 'symbol', { unique: false })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  _generateId() {
    return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateSignal(strategy, data, indicators = {}) {
    if (!strategy || !data) {
      throw new Error('Strategy and current data are required')
    }

    if (!strategy.code) {
      throw new Error('Strategy code is required')
    }

    let fn
    try {
      fn = new Function('data', 'indicators', strategy.code + '\nreturn onSignal(data, indicators);')
    } catch (e) {
      throw new Error('Failed to generate signal')
    }

    let raw
    try {
      raw = fn(data, indicators)
    } catch (e) {
      throw new Error('Failed to generate signal')
    }

    if (!raw) return null

    const type = raw.type
    if (type !== 'BUY' && type !== 'SELL') {
      throw new Error('Invalid signal type')
    }

    const strength = raw.strength === undefined ? 50 : raw.strength
    if (typeof strength !== 'number' || strength < 0 || strength > 100) {
      throw new Error('Signal strength must be between 0 and 100')
    }

    const price = raw.price === undefined ? data.close : raw.price

    const signal = {
      id: this._generateId(),
      strategyId: strategy.id,
      strategyName: strategy.name,
      symbol: data.symbol,
      market: data.market,
      type: type,
      price: price,
      strength: strength,
      indicators: raw.indicators || indicators || {},
      conditions: raw.conditions || [],
      timestamp: new Date()
    }

    return signal
  }

  evaluateSignalStrength(signal, context = {}) {
    if (!signal) throw new Error('Signal is required')

    let s = typeof signal.strength === 'number' ? signal.strength : 50

    if (context.volume && context.avgVolume) {
      const ratio = context.volume / Math.max(1, context.avgVolume)
      if (ratio > 1) s += Math.min(100 - s, Math.round((ratio - 1) * 10))
    }

    if (context.volatility) {
      s -= Math.round(context.volatility * 100)
    }

    if (context.trend) {
      if ((context.trend === 'UP' && signal.type === 'BUY') || (context.trend === 'DOWN' && signal.type === 'SELL')) {
        s += 5
      }
    }

    s = Math.max(0, Math.min(100, Math.round(s)))
    return s
  }

  async logSignal(signal) {
    if (!signal) throw new Error('Signal is required')

    const required = ['id', 'strategyId', 'strategyName', 'symbol', 'market', 'type', 'price', 'strength', 'timestamp']
    for (const f of required) {
      if (!signal.hasOwnProperty(f)) {
        throw new Error('Signal missing required field')
      }
    }

    await this._init()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite')
      const store = tx.objectStore(this.storeName)
      const req = store.put(signal)

      req.onsuccess = () => resolve()
      req.onerror = () => reject(new Error('Failed to log signal'))
    })
  }

  async getSignalHistory(filter = {}) {
    await this._init()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readonly')
      const store = tx.objectStore(this.storeName)
      const req = store.getAll()

      req.onsuccess = () => {
        let arr = req.result || []

        if (filter.strategyId) arr = arr.filter(s => s.strategyId === filter.strategyId)
        if (filter.symbol) arr = arr.filter(s => s.symbol === filter.symbol)
        if (filter.type) arr = arr.filter(s => s.type === filter.type)
        if (filter.startDate) arr = arr.filter(s => new Date(s.timestamp) >= filter.startDate)
        if (filter.endDate) arr = arr.filter(s => new Date(s.timestamp) <= filter.endDate)

        // sort desc by timestamp
        arr.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

        if (filter.limit) arr = arr.slice(0, filter.limit)

        resolve(arr)
      }

      req.onerror = () => reject(new Error('Failed to read signal history'))
    })
  }

  async clearSignalHistory(filter = null) {
    await this._init()

    if (!filter) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([this.storeName], 'readwrite')
        const store = tx.objectStore(this.storeName)
        const req = store.clear()

        req.onsuccess = () => resolve(-1)
        req.onerror = () => reject(new Error('Failed to clear signals'))
      })
    }

    // delete by filter
    const history = await this.getSignalHistory(filter)
    let deleted = 0
    await this._init()

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite')
      const store = tx.objectStore(this.storeName)

      for (const s of history) {
        const req = store.delete(s.id)
        req.onsuccess = () => { deleted++ }
        req.onerror = () => { /* ignore individual errors */ }
      }

      tx.oncomplete = () => resolve(deleted)
      tx.onerror = () => reject(new Error('Failed to clear signals by filter'))
    })
  }

  async getSignalStats(strategyId = null) {
    const history = await this.getSignalHistory()
    const list = strategyId ? history.filter(s => s.strategyId === strategyId) : history

    const total = list.length
    const buySignals = list.filter(s => s.type === 'BUY').length
    const sellSignals = list.filter(s => s.type === 'SELL').length
    const avgStrength = total > 0 ? list.reduce((sum, s) => sum + (s.strength || 0), 0) / total : 0

    const bySymbol = {}
    const byStrategy = {}

    for (const s of list) {
      bySymbol[s.symbol] = (bySymbol[s.symbol] || 0) + 1
      if (!byStrategy[s.strategyId]) byStrategy[s.strategyId] = { name: s.strategyName, count: 0 }
      byStrategy[s.strategyId].count++
    }

    return {
      total,
      buySignals,
      sellSignals,
      avgStrength,
      bySymbol,
      byStrategy
    }
  }
}

export default SignalGenerator
