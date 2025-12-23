/**
 * 市场数据适配器错误处理测试
 * 测试错误处理和重试机制
 * 
 * 需求：1.1-1.5（错误处理）
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import MarketDataAdapter from './MarketDataAdapter.js'

describe('MarketDataAdapter - Error Handling', () => {
  let adapter

  beforeEach(() => {
    adapter = new MarketDataAdapter({
      cacheEnabled: false, // 禁用缓存以便测试
      maxRetries: 3,
      initialRetryDelay: 100, // 缩短延迟以加快测试
      maxRetryDelay: 500
    })
  })

  describe('Symbol Validation', () => {
    test('should reject empty symbol', async () => {
      await expect(adapter.fetchData('')).rejects.toThrow('Symbol is required')
    })

    test('should reject null symbol', async () => {
      await expect(adapter.fetchData(null)).rejects.toThrow('Symbol is required')
    })

    test('should reject undefined symbol', async () => {
      await expect(adapter.fetchData(undefined)).rejects.toThrow('Symbol is required')
    })

    test('should reject symbol with invalid characters', async () => {
      await expect(adapter.fetchData('AAPL@#$')).rejects.toThrow('Invalid symbol format')
    })

    test('should reject symbol that is too long', async () => {
      const longSymbol = 'A'.repeat(25)
      await expect(adapter.fetchData(longSymbol)).rejects.toThrow('Invalid symbol format')
    })

    test('should accept valid US stock symbol', () => {
      expect(adapter.isValidSymbol('AAPL')).toBe(true)
    })

    test('should accept valid HK stock symbol', () => {
      expect(adapter.isValidSymbol('0700.HK')).toBe(true)
    })

    test('should accept valid crypto symbol', () => {
      expect(adapter.isValidSymbol('BTC-USD')).toBe(true)
    })

    test('should accept valid futures symbol', () => {
      expect(adapter.isValidSymbol('ES=F')).toBe(true)
    })
  })

  describe('Error Creation and Logging', () => {
    test('should create error with code and context', () => {
      const error = adapter.createError('TEST_ERROR', 'Test message', { key: 'value' })
      
      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.message).toBe('Test message')
      expect(error.context).toEqual({ key: 'value' })
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    test('should log error to error log', () => {
      const error = adapter.createError('TEST_ERROR', 'Test message')
      adapter.logError(error)
      
      const log = adapter.getErrorLog()
      expect(log.length).toBe(1)
      expect(log[0].code).toBe('TEST_ERROR')
      expect(log[0].message).toBe('Test message')
    })

    test('should limit error log size', () => {
      // 创建超过最大日志大小的错误
      for (let i = 0; i < 150; i++) {
        const error = adapter.createError('TEST_ERROR', `Error ${i}`)
        adapter.logError(error)
      }
      
      const log = adapter.getErrorLog(200)
      expect(log.length).toBeLessThanOrEqual(100) // maxErrorLogSize = 100
    })

    test('should clear error log', () => {
      const error = adapter.createError('TEST_ERROR', 'Test message')
      adapter.logError(error)
      
      expect(adapter.getErrorLog().length).toBe(1)
      
      adapter.clearErrorLog()
      expect(adapter.getErrorLog().length).toBe(0)
    })

    test('should get limited error log', () => {
      for (let i = 0; i < 20; i++) {
        const error = adapter.createError('TEST_ERROR', `Error ${i}`)
        adapter.logError(error)
      }
      
      const log = adapter.getErrorLog(5)
      expect(log.length).toBe(5)
      // 应该返回最新的5条
      expect(log[4].message).toBe('Error 19')
    })
  })

  describe('Network Error Handling', () => {
    test('should handle network connection failure', async () => {
      // Mock fetch to simulate network error
      global.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
      
      await expect(adapter.fetchData('AAPL')).rejects.toMatchObject({
        code: 'MAX_RETRIES_EXCEEDED'
      })
      
      // 应该尝试了3次
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    test('should handle timeout', async () => {
      // Mock fetch to simulate timeout
      global.fetch = vi.fn(() => new Promise((resolve, reject) => {
        setTimeout(() => reject(new TypeError('Network timeout')), 100)
      }))
      
      await expect(adapter.fetchData('AAPL')).rejects.toMatchObject({
        code: 'MAX_RETRIES_EXCEEDED'
      })
    })
  })

  describe('HTTP Error Handling', () => {
    test('should handle 404 symbol not found', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }))
      
      await expect(adapter.fetchData('INVALID')).rejects.toMatchObject({
        code: 'SYMBOL_NOT_FOUND'
      })
    })

    test('should handle 429 rate limit with retry', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests'
          })
        }
        // 第3次成功
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            chart: {
              result: [{
                timestamp: [Date.now() / 1000],
                indicators: {
                  quote: [{
                    open: [100],
                    high: [105],
                    low: [95],
                    close: [102],
                    volume: [1000000]
                  }]
                }
              }]
            }
          })
        })
      })
      
      const data = await adapter.fetchData('AAPL')
      expect(data).toBeDefined()
      expect(data.length).toBeGreaterThan(0)
      expect(callCount).toBe(3)
    })

    test('should handle 500 server error with retry', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      }))
      
      await expect(adapter.fetchData('AAPL')).rejects.toMatchObject({
        code: 'MAX_RETRIES_EXCEEDED'
      })
      
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    test('should handle other HTTP errors without retry', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      }))
      
      await expect(adapter.fetchData('AAPL')).rejects.toMatchObject({
        code: 'HTTP_ERROR'
      })
      
      // 不应该重试
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('API Error Handling', () => {
    test('should handle API error response', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            error: {
              code: 'API_ERROR',
              description: 'Invalid symbol'
            }
          }
        })
      }))
      
      await expect(adapter.fetchData('INVALID')).rejects.toMatchObject({
        code: 'API_ERROR',
        message: expect.stringContaining('Invalid symbol')
      })
    })

    test('should handle empty result', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: []
          }
        })
      }))
      
      await expect(adapter.fetchData('AAPL')).rejects.toMatchObject({
        code: 'NO_DATA'
      })
    })

    test('should handle invalid data structure', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              timestamp: null,
              indicators: null
            }]
          }
        })
      }))
      
      await expect(adapter.fetchData('AAPL')).rejects.toMatchObject({
        code: 'INVALID_DATA'
      })
    })

    test('should handle all null data points', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              timestamp: [Date.now() / 1000, Date.now() / 1000],
              indicators: {
                quote: [{
                  open: [null, null],
                  high: [null, null],
                  low: [null, null],
                  close: [null, null],
                  volume: [null, null]
                }]
              }
            }]
          }
        })
      }))
      
      await expect(adapter.fetchData('AAPL')).rejects.toMatchObject({
        code: 'NO_VALID_DATA'
      })
    })
  })

  describe('Retry Mechanism', () => {
    test('should use exponential backoff', async () => {
      const delays = []
      const originalSleep = adapter.sleep
      adapter.sleep = vi.fn((ms) => {
        delays.push(ms)
        return originalSleep.call(adapter, ms)
      })
      
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500
      }))
      
      await expect(adapter.fetchData('AAPL')).rejects.toThrow()
      
      // 应该有2次延迟（3次尝试，2次重试）
      expect(delays.length).toBe(2)
      // 第一次延迟应该是 initialRetryDelay * 2^0 = 100ms
      expect(delays[0]).toBe(100)
      // 第二次延迟应该是 initialRetryDelay * 2^1 = 200ms
      expect(delays[1]).toBe(200)
    })

    test('should respect max retry delay', async () => {
      const adapter2 = new MarketDataAdapter({
        cacheEnabled: false,
        maxRetries: 5,
        initialRetryDelay: 1000,
        maxRetryDelay: 2000
      })
      
      const delays = []
      adapter2.sleep = vi.fn((ms) => {
        delays.push(ms)
        return Promise.resolve()
      })
      
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500
      }))
      
      await expect(adapter2.fetchData('AAPL')).rejects.toThrow()
      
      // 所有延迟都不应该超过maxRetryDelay
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(2000)
      })
    })

    test('should not retry non-retryable errors', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 404
      }))
      
      await expect(adapter.fetchData('INVALID')).rejects.toMatchObject({
        code: 'SYMBOL_NOT_FOUND'
      })
      
      // 404错误不应该重试
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    test('should succeed on retry', async () => {
      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new TypeError('Network error'))
        }
        // 第2次成功
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            chart: {
              result: [{
                timestamp: [Date.now() / 1000],
                indicators: {
                  quote: [{
                    open: [100],
                    high: [105],
                    low: [95],
                    close: [102],
                    volume: [1000000]
                  }]
                }
              }]
            }
          })
        })
      })
      
      const data = await adapter.fetchData('AAPL')
      expect(data).toBeDefined()
      expect(data.length).toBeGreaterThan(0)
      expect(callCount).toBe(2)
    })
  })

  describe('Error Context', () => {
    test('should include symbol in error context', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 404
      }))
      
      try {
        await adapter.fetchData('INVALID')
      } catch (error) {
        expect(error.context.symbol).toBe('INVALID')
      }
    })

    test('should include retry information in max retries error', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500
      }))
      
      try {
        await adapter.fetchData('AAPL')
      } catch (error) {
        expect(error.code).toBe('MAX_RETRIES_EXCEEDED')
        expect(error.context.attempts).toBe(3)
        expect(error.context.lastError).toBe('SERVER_ERROR')
      }
    })
  })

  describe('Cache Error Handling', () => {
    test('should continue on cache read error', async () => {
      const adapterWithCache = new MarketDataAdapter({
        cacheEnabled: true,
        maxRetries: 1
      })
      
      // Mock cache to throw error
      adapterWithCache.cache = {
        generateKey: () => 'test-key',
        get: vi.fn(() => Promise.reject(new Error('Cache read error')))
      }
      
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              timestamp: [Date.now() / 1000],
              indicators: {
                quote: [{
                  open: [100],
                  high: [105],
                  low: [95],
                  close: [102],
                  volume: [1000000]
                }]
              }
            }]
          }
        })
      }))
      
      // 应该成功获取数据，即使缓存读取失败
      const data = await adapterWithCache.fetchData('AAPL')
      expect(data).toBeDefined()
      expect(data.length).toBeGreaterThan(0)
    })

    test('should continue on cache write error', async () => {
      const adapterWithCache = new MarketDataAdapter({
        cacheEnabled: true,
        maxRetries: 1
      })
      
      // Mock cache to throw error on write
      adapterWithCache.cache = {
        generateKey: () => 'test-key',
        get: vi.fn(() => Promise.resolve(null)),
        set: vi.fn(() => Promise.reject(new Error('Cache write error')))
      }
      
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chart: {
            result: [{
              timestamp: [Date.now() / 1000],
              indicators: {
                quote: [{
                  open: [100],
                  high: [105],
                  low: [95],
                  close: [102],
                  volume: [1000000]
                }]
              }
            }]
          }
        })
      }))
      
      // 应该成功获取数据，即使缓存写入失败
      const data = await adapterWithCache.fetchData('AAPL')
      expect(data).toBeDefined()
      expect(data.length).toBeGreaterThan(0)
    })
  })

  describe('Realtime Quote Error Handling', () => {
    test('should handle no quote data error', async () => {
      // Mock fetchData to return empty array
      adapter.fetchData = vi.fn(() => Promise.resolve([]))
      
      await expect(adapter.getRealtimeQuote('AAPL')).rejects.toMatchObject({
        code: 'NO_QUOTE_DATA'
      })
    })

    test('should propagate fetchData errors', async () => {
      // Mock fetchData to throw error
      adapter.fetchData = vi.fn(() => Promise.reject(
        adapter.createError('NETWORK_ERROR', 'Network failed')
      ))
      
      await expect(adapter.getRealtimeQuote('AAPL')).rejects.toMatchObject({
        code: 'NETWORK_ERROR'
      })
    })
  })
})
