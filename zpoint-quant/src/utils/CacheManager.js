/**
 * 缓存管理器
 * 使用IndexedDB存储历史数据，实现LRU缓存策略
 * 
 * 需求：1.6
 */

class CacheManager {
  constructor(dbName = 'ZpointQuantDB', version = 1) {
    this.dbName = dbName
    this.version = version
    this.db = null
    this.storeName = 'marketData'
    this.maxCacheSize = 1000 // 最大缓存条目数
    this.defaultTTL = 5 * 60 * 1000 // 默认5分钟过期
  }

  /**
   * 初始化数据库
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) {
      return this.db
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // 创建对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'key' })
          
          // 创建索引
          objectStore.createIndex('timestamp', 'timestamp', { unique: false })
          objectStore.createIndex('lastAccessed', 'lastAccessed', { unique: false })
          objectStore.createIndex('expiresAt', 'expiresAt', { unique: false })
        }
      }
    })
  }

  /**
   * 生成缓存键
   * @param {string} symbol - 交易品种代码
   * @param {string} interval - 时间周期
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {string}
   */
  generateKey(symbol, interval, startDate, endDate) {
    const start = startDate ? startDate.getTime() : 'null'
    const end = endDate ? endDate.getTime() : 'null'
    return `${symbol}_${interval}_${start}_${end}`
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键
   * @returns {Promise<any|null>}
   */
  async get(key) {
    await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const request = objectStore.get(key)

      request.onsuccess = () => {
        const record = request.result

        if (!record) {
          resolve(null)
          return
        }

        // 检查是否过期
        if (record.expiresAt && Date.now() > record.expiresAt) {
          // 删除过期数据
          objectStore.delete(key)
          resolve(null)
          return
        }

        // 更新最后访问时间（LRU）并等待写入完成再返回
        record.lastAccessed = Date.now()
        const putReq = objectStore.put(record)
        putReq.onsuccess = () => resolve(record.data)
        putReq.onerror = () => reject(new Error('Failed to update lastAccessed'))
      }

      request.onerror = () => {
        reject(new Error('Failed to get cache'))
      }
    })
  }

  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {any} data - 数据
   * @param {number} ttl - 过期时间（毫秒），默认5分钟
   * @returns {Promise<void>}
   */
  async set(key, data, ttl = this.defaultTTL) {
    await this.init()

    // 检查缓存大小，如果超过限制则清理
    await this.evictIfNeeded()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)

      const record = {
        key: key,
        data: data,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        expiresAt: ttl ? Date.now() + ttl : null
      }

      const request = objectStore.put(record)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to set cache'))
      }
    })
  }

  /**
   * 删除缓存数据
   * @param {string} key - 缓存键
   * @returns {Promise<void>}
   */
  async delete(key) {
    await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const request = objectStore.delete(key)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to delete cache'))
      }
    })
  }

  /**
   * 清空所有缓存
   * @returns {Promise<void>}
   */
  async clear() {
    await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const request = objectStore.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to clear cache'))
      }
    })
  }

  /**
   * 获取缓存大小
   * @returns {Promise<number>}
   */
  async size() {
    await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)
      const request = objectStore.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to get cache size'))
      }
    })
  }

  /**
   * 清理过期缓存
   * @returns {Promise<number>} 清理的条目数
   */
  async cleanExpired() {
    await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const index = objectStore.index('expiresAt')
      const now = Date.now()
      let deletedCount = 0

      const request = index.openCursor()

      request.onsuccess = async (event) => {
        const cursor = event.target.result

        if (cursor) {
          const record = cursor.value

          // 删除过期的记录
          if (record.expiresAt && now > record.expiresAt) {
            cursor.delete()
            deletedCount++
          }

          cursor.continue()
        } else {
          // 如果没有通过游标删除到任何条目，作为后备，按 lastAccessed 排序删除最旧的条目
          if (deletedCount === 0) {
            try {
              const allReq = objectStore.getAll()
              allReq.onsuccess = () => {
                const all = allReq.result || []
                if (all.length === 0) return resolve(0)
                all.sort((a, b) => a.lastAccessed - b.lastAccessed)
                const toRemove = Math.min(toDelete, all.length)
                for (let i = 0; i < toRemove; i++) {
                  objectStore.delete(all[i].key || all[i].keyPath || all[i].key)
                }
                resolve(toRemove)
              }
              allReq.onerror = () => resolve(0)
            } catch (e) {
              resolve(0)
            }
          } else {
            resolve(deletedCount)
          }
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to clean expired cache'))
      }
    })
  }

  /**
   * LRU淘汰策略：如果缓存超过限制，删除最少使用的条目
   * @returns {Promise<void>}
   */
  async evictIfNeeded() {
    const currentSize = await this.size()

    if (currentSize < this.maxCacheSize) {
      return
    }

    // 需要删除的条目数
    const toDelete = currentSize - this.maxCacheSize + 1

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const index = objectStore.index('lastAccessed')

      // 按最后访问时间升序排列（最旧的在前）
      const request = index.openCursor(null, 'next')
      let deletedCount = 0

      request.onsuccess = (event) => {
        const cursor = event.target.result

        if (cursor && deletedCount < toDelete) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to evict cache'))
      }
    })
  }

  /**
   * 获取所有缓存键
   * @returns {Promise<string[]>}
   */
  async keys() {
    await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)
      const request = objectStore.getAllKeys()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to get cache keys'))
      }
    })
  }

  /**
   * 获取缓存统计信息
   * @returns {Promise<Object>}
   */
  async getStats() {
    await this.init()

    const totalSize = await this.size()
    const allKeys = await this.keys()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)
      const request = objectStore.getAll()

      request.onsuccess = () => {
        const records = request.result
        const now = Date.now()

        let expiredCount = 0
        let totalDataSize = 0

        records.forEach(record => {
          if (record.expiresAt && now > record.expiresAt) {
            expiredCount++
          }
          // 估算数据大小（字节）
          totalDataSize += JSON.stringify(record.data).length
        })

        resolve({
          totalEntries: totalSize,
          expiredEntries: expiredCount,
          activeEntries: totalSize - expiredCount,
          estimatedSize: totalDataSize,
          maxSize: this.maxCacheSize,
          utilizationPercent: (totalSize / this.maxCacheSize) * 100
        })
      }

      request.onerror = () => {
        reject(new Error('Failed to get cache stats'))
      }
    })
  }

  /**
   * 设置最大缓存大小
   * @param {number} size - 最大缓存条目数
   */
  setMaxSize(size) {
    this.maxCacheSize = size
  }

  /**
   * 设置默认TTL
   * @param {number} ttl - 过期时间（毫秒）
   */
  setDefaultTTL(ttl) {
    this.defaultTTL = ttl
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

export default CacheManager
