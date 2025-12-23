/**
 * 策略管理器单元测试
 * 
 * 需求：2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import StrategyManager from './StrategyManager.js'

describe('StrategyManager', () => {
  let manager

  beforeEach(async () => {
    manager = new StrategyManager()
    // 清空所有策略
    await manager.clearAll()
  })

  afterEach(async () => {
    // 测试后清理
    await manager.clearAll()
  })

  describe('createStrategy - 创建策略', () => {
    test('should create a valid strategy', () => {
      const code = `
        function onBar(data, indicators) {
          if (indicators.ma20 > indicators.ma50) {
            return { action: 'BUY', quantity: 100 }
          }
          return null
        }
      `
      
      const strategy = manager.createStrategy('Test Strategy', code, {
        market: 'US',
        symbols: ['AAPL'],
        interval: '1d'
      })

      expect(strategy).toBeDefined()
      expect(strategy.id).toBeDefined()
      expect(strategy.name).toBe('Test Strategy')
      expect(strategy.code).toContain('onBar')
      expect(strategy.status).toBe('inactive')
      expect(strategy.config.market).toBe('US')
      expect(strategy.createdAt).toBeInstanceOf(Date)
      expect(strategy.updatedAt).toBeInstanceOf(Date)
    })

    test('should throw error for empty name', () => {
      const code = 'function onBar() {}'
      expect(() => manager.createStrategy('', code)).toThrow('name is required')
    })

    test('should throw error for empty code', () => {
      expect(() => manager.createStrategy('Test', '')).toThrow('code is required')
    })

    test('should throw error for invalid code', () => {
      const invalidCode = 'this is not valid javascript {'
      expect(() => manager.createStrategy('Test', invalidCode)).toThrow('Invalid strategy code')
    })

    test('should trim whitespace from name and code', () => {
      const code = '  function onBar() {}  '
      const strategy = manager.createStrategy('  Test  ', code)
      
      expect(strategy.name).toBe('Test')
      expect(strategy.code).toBe('function onBar() {}')
    })

    test('should set default config values', () => {
      const code = 'function onBar() {}'
      const strategy = manager.createStrategy('Test', code)
      
      expect(strategy.config.market).toBe('US')
      expect(strategy.config.symbols).toEqual([])
      expect(strategy.config.interval).toBe('1d')
      expect(strategy.config.indicators).toEqual([])
      expect(strategy.config.parameters).toEqual({})
    })
  })

  describe('validateStrategy - 验证策略代码', () => {
    test('should validate correct strategy code', () => {
      const code = `
        function onBar(data, indicators) {
          return { action: 'BUY' }
        }
      `
      const result = manager.validateStrategy(code)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject code without onBar function', () => {
      const code = `
        function someOtherFunction() {
          return true
        }
      `
      const result = manager.validateStrategy(code)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Strategy must define onBar function')
    })

    test('should reject code with syntax errors', () => {
      const code = 'function onBar() { this is invalid }'
      const result = manager.validateStrategy(code)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Syntax error'))).toBe(true)
    })

    test('should reject code with eval()', () => {
      const code = `
        function onBar() {
          eval('malicious code')
        }
      `
      const result = manager.validateStrategy(code)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('eval() is not allowed')
    })

    test('should reject code with Function constructor', () => {
      const code = `
        function onBar() {
          new Function('return 1')()
        }
      `
      const result = manager.validateStrategy(code)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Function constructor is not allowed')
    })

    test('should reject code with import statements', () => {
      const code = `
        import something from 'somewhere'
        function onBar() {}
      `
      const result = manager.validateStrategy(code)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('import statements are not allowed')
    })

    test('should reject code with require()', () => {
      const code = `
        const fs = require('fs')
        function onBar() {}
      `
      const result = manager.validateStrategy(code)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('require() is not allowed')
    })

    test('should accept code with const onBar', () => {
      const code = `
        const onBar = (data, indicators) => {
          return { action: 'BUY' }
        }
      `
      const result = manager.validateStrategy(code)
      
      expect(result.valid).toBe(true)
    })
  })

  describe('saveStrategy and loadStrategy - 保存和加载策略', () => {
    test('should save and load strategy', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      
      await manager.saveStrategy(strategy)
      const loaded = await manager.loadStrategy(strategy.id)
      
      expect(loaded.id).toBe(strategy.id)
      expect(loaded.name).toBe(strategy.name)
      expect(loaded.code).toBe(strategy.code)
    })

    test('should persist strategy to LocalStorage', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      
      // 创建新的manager实例来验证持久化
      const newManager = new StrategyManager()
      const loaded = await newManager.loadStrategy(strategy.id)
      
      expect(loaded.id).toBe(strategy.id)
      expect(loaded.name).toBe(strategy.name)
    })

    test('should throw error when loading non-existent strategy', async () => {
      await expect(manager.loadStrategy('non-existent-id')).rejects.toThrow('Strategy not found')
    })

    test('should update updatedAt timestamp on save', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      const originalUpdatedAt = strategy.updatedAt
      
      // 等待一小段时间确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await manager.saveStrategy(strategy)
      
      expect(strategy.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    test('should throw error when saving invalid strategy', async () => {
      const invalidStrategy = { id: 'test' } // 缺少必需字段
      await expect(manager.saveStrategy(invalidStrategy)).rejects.toThrow('missing required field')
    })
  })

  describe('activateStrategy and deactivateStrategy - 激活和停止策略', () => {
    test('should activate strategy', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      
      await manager.activateStrategy(strategy.id)
      
      const loaded = await manager.loadStrategy(strategy.id)
      expect(loaded.status).toBe('active')
    })

    test('should deactivate strategy', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      await manager.activateStrategy(strategy.id)
      
      await manager.deactivateStrategy(strategy.id)
      
      const loaded = await manager.loadStrategy(strategy.id)
      expect(loaded.status).toBe('inactive')
    })

    test('should track active strategies', async () => {
      const code = 'function onBar() { return null }'
      const strategy1 = manager.createStrategy('Test1', code)
      const strategy2 = manager.createStrategy('Test2', code)
      
      await manager.saveStrategy(strategy1)
      await manager.saveStrategy(strategy2)
      
      await manager.activateStrategy(strategy1.id)
      await manager.activateStrategy(strategy2.id)
      
      const activeStrategies = await manager.getActiveStrategies()
      expect(activeStrategies).toHaveLength(2)
      expect(activeStrategies.every(s => s.status === 'active')).toBe(true)
    })

    test('should persist active strategies', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      await manager.activateStrategy(strategy.id)
      
      // 创建新的manager实例
      const newManager = new StrategyManager()
      const activeStrategies = await newManager.getActiveStrategies()
      
      expect(activeStrategies).toHaveLength(1)
      expect(activeStrategies[0].id).toBe(strategy.id)
    })

    test('should throw error when activating invalid strategy', async () => {
      const invalidCode = 'this is invalid'
      const strategy = manager.createStrategy('Test', 'function onBar() {}')
      strategy.code = invalidCode // 手动设置无效代码
      await manager.saveStrategy(strategy)
      
      await expect(manager.activateStrategy(strategy.id)).rejects.toThrow('Cannot activate invalid strategy')
    })
  })

  describe('listStrategies - 列出所有策略', () => {
    test('should list all strategies', async () => {
      const code = 'function onBar() { return null }'
      const strategy1 = manager.createStrategy('Test1', code)
      const strategy2 = manager.createStrategy('Test2', code)
      
      await manager.saveStrategy(strategy1)
      await manager.saveStrategy(strategy2)
      
      const strategies = await manager.listStrategies()
      
      expect(strategies).toHaveLength(2)
      expect(strategies.map(s => s.name)).toContain('Test1')
      expect(strategies.map(s => s.name)).toContain('Test2')
    })

    test('should return empty array when no strategies', async () => {
      const strategies = await manager.listStrategies()
      expect(strategies).toEqual([])
    })

    test('should return copies of strategies', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      
      const strategies = await manager.listStrategies()
      strategies[0].name = 'Modified'
      
      const reloaded = await manager.loadStrategy(strategy.id)
      expect(reloaded.name).toBe('Test') // 原始名称未改变
    })
  })

  describe('deleteStrategy - 删除策略', () => {
    test('should delete strategy', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      
      await manager.deleteStrategy(strategy.id)
      
      await expect(manager.loadStrategy(strategy.id)).rejects.toThrow('Strategy not found')
    })

    test('should deactivate before deleting active strategy', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      await manager.activateStrategy(strategy.id)
      
      await manager.deleteStrategy(strategy.id)
      
      const activeStrategies = await manager.getActiveStrategies()
      expect(activeStrategies).toHaveLength(0)
    })
  })

  describe('updateStrategy - 更新策略', () => {
    test('should update strategy fields', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      
      const updated = await manager.updateStrategy(strategy.id, {
        name: 'Updated Name',
        description: 'New description'
      })
      
      expect(updated.name).toBe('Updated Name')
      expect(updated.description).toBe('New description')
    })

    test('should validate code when updating', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      
      await expect(manager.updateStrategy(strategy.id, {
        code: 'invalid code {'
      })).rejects.toThrow('Invalid strategy code')
    })

    test('should not allow updating protected fields', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      
      await expect(manager.updateStrategy(strategy.id, {
        id: 'new-id'
      })).rejects.toThrow('Cannot update protected field')
      
      await expect(manager.updateStrategy(strategy.id, {
        createdAt: new Date()
      })).rejects.toThrow('Cannot update protected field')
    })

    test('should update updatedAt timestamp', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      await manager.saveStrategy(strategy)
      const originalUpdatedAt = strategy.updatedAt
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const updated = await manager.updateStrategy(strategy.id, {
        name: 'New Name'
      })
      
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('duplicateStrategy - 复制策略', () => {
    test('should duplicate strategy', async () => {
      const code = 'function onBar() { return { action: "BUY" } }'
      const strategy = manager.createStrategy('Original', code, {
        market: 'US',
        symbols: ['AAPL'],
        description: 'Test strategy'
      })
      await manager.saveStrategy(strategy)
      
      const duplicate = await manager.duplicateStrategy(strategy.id, 'Copy')
      
      expect(duplicate.id).not.toBe(strategy.id)
      expect(duplicate.name).toBe('Copy')
      expect(duplicate.code).toBe(strategy.code)
      expect(duplicate.config.market).toBe(strategy.config.market)
      expect(duplicate.config.symbols).toEqual(strategy.config.symbols)
      expect(duplicate.description).toBe(strategy.description)
    })

    test('should use default name if not provided', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Original', code)
      await manager.saveStrategy(strategy)
      
      const duplicate = await manager.duplicateStrategy(strategy.id)
      
      expect(duplicate.name).toBe('Original (Copy)')
    })
  })

  describe('Edge Cases', () => {
    test('should handle multiple saves of same strategy', async () => {
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      
      await manager.saveStrategy(strategy)
      await manager.saveStrategy(strategy)
      await manager.saveStrategy(strategy)
      
      const strategies = await manager.listStrategies()
      expect(strategies).toHaveLength(1)
    })

    test('should handle concurrent operations', async () => {
      const code = 'function onBar() { return null }'
      const strategy1 = manager.createStrategy('Test1', code)
      const strategy2 = manager.createStrategy('Test2', code)
      
      // 并发保存
      await Promise.all([
        manager.saveStrategy(strategy1),
        manager.saveStrategy(strategy2)
      ])
      
      const strategies = await manager.listStrategies()
      expect(strategies).toHaveLength(2)
    })

    test('should handle LocalStorage errors gracefully', async () => {
      // 模拟LocalStorage错误
      const originalSetItem = localStorage.setItem
      localStorage.setItem = () => {
        throw new Error('Storage full')
      }
      
      const code = 'function onBar() { return null }'
      const strategy = manager.createStrategy('Test', code)
      
      await expect(manager.saveStrategy(strategy)).rejects.toThrow('Failed to save strategies')
      
      // 恢复
      localStorage.setItem = originalSetItem
    })
  })
})
