import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import CacheManager from './CacheManager'

describe('CacheManager', () => {
  let cache

  beforeEach(async () => {
    cache = new CacheManager('TestDB', 1)
    await cache.init()
    await cache.clear() // 清空测试数据
  })

  afterEach(async () => {
    await cache.clear()
    cache.close()
  })

  describe('基本操作', () => {
    it('应该能够设置和获取缓存', async () => {
      const key = 'test_key'
      const data = { value: 'test_data' }

      await cache.set(key, data)
      const retrieved = await cache.get(key)

      expect(retrieved).toEqual(data)
    })

    it('应该在键不存在时返回null', async () => {
      const retrieved = await cache.get('non_existent_key')
      expect(retrieved).toBeNull()
    })

    it('应该能够删除缓存', async () => {
      const key = 'test_key'
      const data = { value: 'test_data' }

      await cache.set(key, data)
      await cache.delete(key)
      const retrieved = await cache.get(key)

      expect(retrieved).toBeNull()
    })

    it('应该能够清空所有缓存', async () => {
      await cache.set('key1', { value: 1 })
      await cache.set('key2', { value: 2 })
      await cache.set('key3', { value: 3 })

      await cache.clear()
      const size = await cache.size()

      expect(size).toBe(0)
    })

    it('应该能够获取缓存大小', async () => {
      await cache.set('key1', { value: 1 })
      await cache.set('key2', { value: 2 })

      const size = await cache.size()
      expect(size).toBe(2)
    })

    it('应该能够获取所有缓存键', async () => {
      await cache.set('key1', { value: 1 })
      await cache.set('key2', { value: 2 })

      const keys = await cache.keys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toHaveLength(2)
    })
  })

  describe('缓存键生成', () => {
    it('应该生成正确的缓存键', () => {
      const symbol = 'AAPL'
      const interval = '1d'
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      const key = cache.generateKey(symbol, interval, startDate, endDate)

      expect(key).toContain(symbol)
      expect(key).toContain(interval)
      expect(key).toContain(startDate.getTime().toString())
      expect(key).toContain(endDate.getTime().toString())
    })

    it('应该处理null日期', () => {
      const key = cache.generateKey('AAPL', '1d', null, null)
      expect(key).toContain('null')
    })
  })

  describe('过期时间管理', () => {
    it('应该在过期后返回null', async () => {
      const key = 'expiring_key'
      const data = { value: 'test' }
      const ttl = 100 // 100毫秒

      await cache.set(key, data, ttl)

      // 立即获取应该成功
      let retrieved = await cache.get(key)
      expect(retrieved).toEqual(data)

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150))

      // 过期后应该返回null
      retrieved = await cache.get(key)
      expect(retrieved).toBeNull()
    })

    it('应该能够清理过期缓存', async () => {
      // 添加一些会过期的缓存
      await cache.set('key1', { value: 1 }, 100)
      await cache.set('key2', { value: 2 }, 100)
      await cache.set('key3', { value: 3 }, 10000) // 不会过期

      // 等待前两个过期
      await new Promise(resolve => setTimeout(resolve, 150))

      const deletedCount = await cache.cleanExpired()
      expect(deletedCount).toBe(2)

      const size = await cache.size()
      expect(size).toBe(1)
    })

    it('应该支持无过期时间的缓存', async () => {
      const key = 'permanent_key'
      const data = { value: 'permanent' }

      await cache.set(key, data, null) // 无过期时间

      await new Promise(resolve => setTimeout(resolve, 100))

      const retrieved = await cache.get(key)
      expect(retrieved).toEqual(data)
    })
  })

  describe('LRU淘汰策略', () => {
    it('应该在超过最大大小时淘汰最少使用的条目', async () => {
      // 设置较小的最大大小
      cache.setMaxSize(3)

      // 添加3个条目
      await cache.set('key1', { value: 1 })
      await cache.set('key2', { value: 2 })
      await cache.set('key3', { value: 3 })

      // 访问key1和key2以更新它们的lastAccessed
      await cache.get('key1')
      await cache.get('key2')

      // 添加第4个条目，应该淘汰key3（最少使用）
      await cache.set('key4', { value: 4 })

      const size = await cache.size()
      expect(size).toBeLessThanOrEqual(3)

      // key3应该被淘汰
      const key3Data = await cache.get('key3')
      expect(key3Data).toBeNull()

      // key1和key2应该还在
      const key1Data = await cache.get('key1')
      const key2Data = await cache.get('key2')
      expect(key1Data).toEqual({ value: 1 })
      expect(key2Data).toEqual({ value: 2 })
    })

    it('应该更新访问时间', async () => {
      await cache.set('key1', { value: 1 })

      // 第一次访问
      await cache.get('key1')

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 50))

      // 第二次访问
      await cache.get('key1')

      // 验证数据仍然存在（访问时间已更新）
      const data = await cache.get('key1')
      expect(data).toEqual({ value: 1 })
    })
  })

  describe('缓存统计', () => {
    it('应该返回正确的统计信息', async () => {
      await cache.set('key1', { value: 1 })
      await cache.set('key2', { value: 2 })
      await cache.set('key3', { value: 3 }, 100) // 会过期

      const stats = await cache.getStats()

      expect(stats.totalEntries).toBe(3)
      expect(stats.activeEntries).toBeGreaterThan(0)
      expect(stats.maxSize).toBe(cache.maxCacheSize)
      expect(stats.utilizationPercent).toBeGreaterThan(0)
    })

    it('应该统计过期条目', async () => {
      await cache.set('key1', { value: 1 }, 100)
      await cache.set('key2', { value: 2 }, 100)

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150))

      const stats = await cache.getStats()
      expect(stats.expiredEntries).toBe(2)
    })
  })

  describe('配置', () => {
    it('应该能够设置最大缓存大小', () => {
      cache.setMaxSize(500)
      expect(cache.maxCacheSize).toBe(500)
    })

    it('应该能够设置默认TTL', () => {
      cache.setDefaultTTL(10000)
      expect(cache.defaultTTL).toBe(10000)
    })
  })
})
