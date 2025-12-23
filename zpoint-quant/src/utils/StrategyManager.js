/**
 * 策略管理器
 * 管理用户策略的生命周期：创建、保存、加载、验证、激活、停止
 * 
 * 需求：2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * @typedef {import('./models').Strategy} Strategy
 */

class StrategyManager {
  constructor() {
    // 使用LocalStorage作为持久化存储
    this.storageKey = 'zpoint_quant_strategies'
    this.activeStrategyKey = 'zpoint_quant_active_strategies'
    
    // 内存中的策略缓存
    this.strategies = new Map()
    this.activeStrategies = new Set()
    
    // 初始化：从LocalStorage加载策略
    this._loadFromStorage()
  }

  /**
   * 创建新策略
   * @param {string} name - 策略名称
   * @param {string} code - 策略代码
   * @param {Object} config - 策略配置
   * @returns {Strategy}
   */
  createStrategy(name, code, config = {}) {
    // 参数验证
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Strategy name is required and must be a non-empty string')
    }

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new Error('Strategy code is required and must be a non-empty string')
    }

    if (typeof config !== 'object' || config === null) {
      throw new Error('Strategy config must be an object')
    }

    // 验证策略代码
    const validation = this.validateStrategy(code)
    if (!validation.valid) {
      throw new Error(`Invalid strategy code: ${validation.errors.join(', ')}`)
    }

    // 生成唯一ID
    const id = this._generateId()
    const now = new Date()

    // 创建策略对象
    const strategy = {
      id,
      name: name.trim(),
      code: code.trim(),
      description: config.description || '',
      config: {
        market: config.market || 'US',
        symbols: Array.isArray(config.symbols) ? config.symbols : [],
        interval: config.interval || '1d',
        indicators: Array.isArray(config.indicators) ? config.indicators : [],
        parameters: config.parameters || {}
      },
      status: 'inactive',
      createdAt: now,
      updatedAt: now
    }

    // 存储到内存
    this.strategies.set(id, strategy)

    return strategy
  }

  /**
   * 保存策略到LocalStorage
   * @param {Strategy} strategy - 策略对象
   * @returns {Promise<void>}
   */
  async saveStrategy(strategy) {
    // 参数验证
    if (!strategy || typeof strategy !== 'object') {
      throw new Error('Strategy must be an object')
    }

    if (!strategy.id) {
      throw new Error('Strategy must have an id')
    }

    // 验证策略结构
    this._validateStrategyStructure(strategy)

    // 更新时间戳
    strategy.updatedAt = new Date()

    // 存储到内存
    this.strategies.set(strategy.id, strategy)

    // 持久化到LocalStorage
    await this._saveToStorage()
  }

  /**
   * 从LocalStorage加载策略
   * @param {string} strategyId - 策略ID
   * @returns {Promise<Strategy>}
   */
  async loadStrategy(strategyId) {
    // 参数验证
    if (!strategyId || typeof strategyId !== 'string') {
      throw new Error('Strategy ID is required and must be a string')
    }

    // 先从内存查找
    if (this.strategies.has(strategyId)) {
      return this.strategies.get(strategyId)
    }

    // 从LocalStorage重新加载
    await this._loadFromStorage()

    // 再次查找
    if (this.strategies.has(strategyId)) {
      return this.strategies.get(strategyId)
    }

    throw new Error(`Strategy not found: ${strategyId}`)
  }

  /**
   * 验证策略代码
   * @param {string} code - 策略代码
   * @returns {Object} {valid: boolean, errors: string[]}
   */
  validateStrategy(code) {
    const errors = []

    // 基本验证
    if (!code || typeof code !== 'string') {
      errors.push('Code must be a non-empty string')
      return { valid: false, errors }
    }

    const trimmedCode = code.trim()
    if (trimmedCode.length === 0) {
      errors.push('Code cannot be empty')
      return { valid: false, errors }
    }

    // 检查危险操作 (在语法检查之前，因为这些会导致语法错误)
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, message: 'eval() is not allowed' },
      { pattern: /Function\s*\(/, message: 'Function constructor is not allowed' },
      { pattern: /import\s+/, message: 'import statements are not allowed' },
      { pattern: /require\s*\(/, message: 'require() is not allowed' }
    ]

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(trimmedCode)) {
        errors.push(message)
      }
    }

    // 语法验证：尝试解析为函数
    try {
      // 尝试创建函数来检查语法
      new Function('data', 'indicators', trimmedCode)
    } catch (error) {
      errors.push(`Syntax error: ${error.message}`)
    }

    // 检查必需的策略接口
    const requiredPatterns = [
      { pattern: /function\s+onBar|const\s+onBar|let\s+onBar|var\s+onBar/, message: 'Strategy must define onBar function' }
    ]

    for (const { pattern, message } of requiredPatterns) {
      if (!pattern.test(trimmedCode)) {
        errors.push(message)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 激活策略
   * @param {string} strategyId - 策略ID
   * @returns {Promise<void>}
   */
  async activateStrategy(strategyId) {
    // 参数验证
    if (!strategyId || typeof strategyId !== 'string') {
      throw new Error('Strategy ID is required and must be a string')
    }

    // 加载策略
    const strategy = await this.loadStrategy(strategyId)

    // 验证策略代码
    const validation = this.validateStrategy(strategy.code)
    if (!validation.valid) {
      throw new Error(`Cannot activate invalid strategy: ${validation.errors.join(', ')}`)
    }

    // 更新状态
    strategy.status = 'active'
    strategy.updatedAt = new Date()

    // 添加到活动策略集合
    this.activeStrategies.add(strategyId)

    // 保存
    await this.saveStrategy(strategy)
    await this._saveActiveStrategies()
  }

  /**
   * 停止策略
   * @param {string} strategyId - 策略ID
   * @returns {Promise<void>}
   */
  async deactivateStrategy(strategyId) {
    // 参数验证
    if (!strategyId || typeof strategyId !== 'string') {
      throw new Error('Strategy ID is required and must be a string')
    }

    // 加载策略
    const strategy = await this.loadStrategy(strategyId)

    // 更新状态
    strategy.status = 'inactive'
    strategy.updatedAt = new Date()

    // 从活动策略集合移除
    this.activeStrategies.delete(strategyId)

    // 保存
    await this.saveStrategy(strategy)
    await this._saveActiveStrategies()
  }

  /**
   * 获取所有策略列表
   * @returns {Promise<Strategy[]>}
   */
  async listStrategies() {
    // 从LocalStorage重新加载以确保最新
    await this._loadFromStorage()

    // 返回所有策略的副本
    return Array.from(this.strategies.values()).map(s => ({ ...s }))
  }

  /**
   * 获取活动策略列表
   * @returns {Promise<Strategy[]>}
   */
  async getActiveStrategies() {
    const allStrategies = await this.listStrategies()
    return allStrategies.filter(s => s.status === 'active')
  }

  /**
   * 删除策略
   * @param {string} strategyId - 策略ID
   * @returns {Promise<void>}
   */
  async deleteStrategy(strategyId) {
    // 参数验证
    if (!strategyId || typeof strategyId !== 'string') {
      throw new Error('Strategy ID is required and must be a string')
    }

    // 如果策略是活动的，先停止它
    if (this.activeStrategies.has(strategyId)) {
      await this.deactivateStrategy(strategyId)
    }

    // 从内存删除
    this.strategies.delete(strategyId)

    // 持久化
    await this._saveToStorage()
  }

  /**
   * 更新策略
   * @param {string} strategyId - 策略ID
   * @param {Object} updates - 更新的字段
   * @returns {Promise<Strategy>}
   */
  async updateStrategy(strategyId, updates) {
    // 参数验证
    if (!strategyId || typeof strategyId !== 'string') {
      throw new Error('Strategy ID is required and must be a string')
    }

    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates must be an object')
    }

    // 加载策略
    const strategy = await this.loadStrategy(strategyId)

    // 不允许修改某些字段
    const protectedFields = ['id', 'createdAt']
    for (const field of protectedFields) {
      if (updates.hasOwnProperty(field)) {
        throw new Error(`Cannot update protected field: ${field}`)
      }
    }

    // 如果更新代码，需要验证
    if (updates.code) {
      const validation = this.validateStrategy(updates.code)
      if (!validation.valid) {
        throw new Error(`Invalid strategy code: ${validation.errors.join(', ')}`)
      }
    }

    // 应用更新
    Object.assign(strategy, updates)
    strategy.updatedAt = new Date()

    // 保存
    await this.saveStrategy(strategy)

    return strategy
  }

  /**
   * 复制策略
   * @param {string} strategyId - 源策略ID
   * @param {string} newName - 新策略名称
   * @returns {Promise<Strategy>}
   */
  async duplicateStrategy(strategyId, newName) {
    // 加载源策略
    const source = await this.loadStrategy(strategyId)

    // 创建新策略
    const newStrategy = this.createStrategy(
      newName || `${source.name} (Copy)`,
      source.code,
      {
        ...source.config,
        description: source.description
      }
    )

    // 保存
    await this.saveStrategy(newStrategy)

    return newStrategy
  }

  /**
   * 生成唯一ID
   * @private
   * @returns {string}
   */
  _generateId() {
    return `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 验证策略结构
   * @private
   * @param {Strategy} strategy - 策略对象
   */
  _validateStrategyStructure(strategy) {
    const requiredFields = ['id', 'name', 'code', 'config', 'status', 'createdAt', 'updatedAt']
    
    for (const field of requiredFields) {
      if (!strategy.hasOwnProperty(field)) {
        throw new Error(`Strategy missing required field: ${field}`)
      }
    }

    // 验证config结构
    if (!strategy.config || typeof strategy.config !== 'object') {
      throw new Error('Strategy config must be an object')
    }

    const requiredConfigFields = ['market', 'symbols', 'interval', 'indicators', 'parameters']
    for (const field of requiredConfigFields) {
      if (!strategy.config.hasOwnProperty(field)) {
        throw new Error(`Strategy config missing required field: ${field}`)
      }
    }

    // 验证状态
    const validStatuses = ['active', 'inactive', 'testing']
    if (!validStatuses.includes(strategy.status)) {
      throw new Error(`Invalid strategy status: ${strategy.status}`)
    }
  }

  /**
   * 从LocalStorage加载策略
   * @private
   */
  _loadFromStorage() {
    try {
      // 加载策略
      const strategiesJson = localStorage.getItem(this.storageKey)
      if (strategiesJson) {
        const strategiesArray = JSON.parse(strategiesJson)
        this.strategies.clear()
        
        for (const strategy of strategiesArray) {
          // 转换日期字符串为Date对象
          strategy.createdAt = new Date(strategy.createdAt)
          strategy.updatedAt = new Date(strategy.updatedAt)
          this.strategies.set(strategy.id, strategy)
        }
      }

      // 加载活动策略
      const activeJson = localStorage.getItem(this.activeStrategyKey)
      if (activeJson) {
        const activeArray = JSON.parse(activeJson)
        this.activeStrategies = new Set(activeArray)
      }
    } catch (error) {
      console.error('Error loading strategies from storage:', error)
      // 如果加载失败，初始化为空
      this.strategies.clear()
      this.activeStrategies.clear()
    }
  }

  /**
   * 保存策略到LocalStorage
   * @private
   */
  async _saveToStorage() {
    try {
      const strategiesArray = Array.from(this.strategies.values())
      const strategiesJson = JSON.stringify(strategiesArray)
      localStorage.setItem(this.storageKey, strategiesJson)
    } catch (error) {
      console.error('Error saving strategies to storage:', error)
      throw new Error(`Failed to save strategies: ${error.message}`)
    }
  }

  /**
   * 保存活动策略列表
   * @private
   */
  async _saveActiveStrategies() {
    try {
      const activeArray = Array.from(this.activeStrategies)
      const activeJson = JSON.stringify(activeArray)
      localStorage.setItem(this.activeStrategyKey, activeJson)
    } catch (error) {
      console.error('Error saving active strategies:', error)
      throw new Error(`Failed to save active strategies: ${error.message}`)
    }
  }

  /**
   * 清空所有策略（用于测试）
   * @returns {Promise<void>}
   */
  async clearAll() {
    this.strategies.clear()
    this.activeStrategies.clear()
    localStorage.removeItem(this.storageKey)
    localStorage.removeItem(this.activeStrategyKey)
  }
}

export default StrategyManager
