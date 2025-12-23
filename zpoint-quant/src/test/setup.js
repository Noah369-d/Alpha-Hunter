/**
 * Vitest 测试环境配置
 */

// Mock IndexedDB
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'

// 设置全局变量
global.indexedDB = indexedDB
global.IDBKeyRange = IDBKeyRange

// Mock LocalStorage
class LocalStorageMock {
  constructor() {
    this.store = {}
  }

  clear() {
    this.store = {}
  }

  getItem(key) {
    return this.store[key] || null
  }

  setItem(key, value) {
    this.store[key] = String(value)
  }

  removeItem(key) {
    delete this.store[key]
  }

  get length() {
    return Object.keys(this.store).length
  }

  key(index) {
    const keys = Object.keys(this.store)
    return keys[index] || null
  }
}

global.localStorage = new LocalStorageMock()

// 全局测试设置
beforeEach(() => {
  // 清理 LocalStorage
  localStorage.clear()
  
  // 清理 IndexedDB (fake-indexeddb会自动处理)
})

afterEach(() => {
  // 每个测试后的清理
  localStorage.clear()
})

// 全局测试工具函数
export const createMockMarketData = (count = 100) => {
  const data = []
  const basePrice = 100
  const baseTime = new Date('2024-01-01').getTime()
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(baseTime + i * 24 * 60 * 60 * 1000)
    const open = basePrice + Math.random() * 10 - 5
    const close = open + Math.random() * 10 - 5
    const high = Math.max(open, close) + Math.random() * 5
    const low = Math.min(open, close) - Math.random() * 5
    const volume = Math.floor(Math.random() * 1000000)
    
    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      symbol: 'TEST',
      market: 'US',
      interval: '1d'
    })
  }
  
  return data
}

export const createMockStrategy = () => {
  return {
    id: 'test-strategy-' + Date.now(),
    name: 'Test Strategy',
    code: 'function onBar(data) { return null; }',
    description: 'A test strategy',
    config: {
      market: 'US',
      symbols: ['AAPL'],
      interval: '1d',
      indicators: [],
      parameters: {}
    },
    status: 'inactive',
    createdAt: new Date(),
    updatedAt: new Date()
  }
}
