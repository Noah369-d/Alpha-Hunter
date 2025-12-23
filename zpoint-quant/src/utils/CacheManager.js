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
    // 单调访问计数器，用于确定性 LRU（在内存中维护）
    this._accessCounter = 0
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
          // 单调访问序列，便于确定性 LRU 排序
          objectStore.createIndex('accessSeq', 'accessSeq', { unique: false })
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

        // 更新最后访问信息（LRU）：lastAccessed + 单调访问计数器
        record.lastAccessed = Date.now()
        record.accessSeq = ++this._accessCounter
        const putReq = objectStore.put(record)
        putReq.onsuccess = () => resolve(record.data)
        putReq.onerror = () => reject(new Error('Failed to update accessSeq'))
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

      const now = Date.now()
      const record = {
        key: key,
        data: data,
        timestamp: now,
        lastAccessed: now,
        accessSeq: ++this._accessCounter,
        expiresAt: ttl ? now + ttl : null
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
          // 如果没有通过游标删除到任何条目，作为后备我们不进行额外删除（保守策略）
          if (deletedCount === 0) {
            return resolve(0)
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

    // 当当前条目数 <= 最大值时无需删除
    if (currentSize <= this.maxCacheSize - 1) {
      return
    }

    // 需要删除的条目数（考虑即将插入的新条目，因此 +1）
    const toDelete = Math.max(0, currentSize - this.maxCacheSize + 1)
    if (toDelete <= 0) return

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      // 尝试使用 accessSeq 索引以获得确定性排序；若不存在则回退到 lastAccessed
      let index
      try {
        index = objectStore.index('accessSeq')
      } catch (e) {
        index = objectStore.index('lastAccessed')
      }

      // 收集所有记录的主键与 accessSeq/lastAccessed、timestamp 信息，后续根据 accessSeq 排序以保证确定性
      const records = []
      const cursorReq = index.openCursor(null, 'next')
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          records.push({
            key: cursor.primaryKey,
            accessSeq: cursor.value.accessSeq != null ? cursor.value.accessSeq : (cursor.value.lastAccessed || 0),
            lastAccessed: cursor.value.lastAccessed || 0,
            timestamp: cursor.value.timestamp || 0
          })
          cursor.continue()
        } else {
          if (records.length === 0) return

          // 按 accessSeq 升序排序（较小先被淘汰）；若 accessSeq 相等则按 lastAccessed 再按 timestamp
          records.sort((a, b) => {
            if (a.accessSeq !== b.accessSeq) return a.accessSeq - b.accessSeq
            if (a.lastAccessed !== b.lastAccessed) return a.lastAccessed - b.lastAccessed
            return a.timestamp - b.timestamp
          })

          const keysToDelete = records.slice(0, toDelete).map(r => r.key)

          // 依次删除收集到的键，等到所有删除请求完成
          const deleteNext = () => {
            if (keysToDelete.length === 0) return
            const k = keysToDelete.shift()
            const delReq = objectStore.delete(k)
            delReq.onsuccess = () => {
              if (keysToDelete.length > 0) deleteNext()
            }
            delReq.onerror = () => reject(new Error('Failed to delete during eviction'))
          }

          if (keysToDelete.length > 0) deleteNext()
        }
      }

      cursorReq.onerror = () => reject(new Error('Failed to evict cache (cursor)'))

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Failed to evict cache (transaction error)'))
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
