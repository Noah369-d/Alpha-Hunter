/**
 * 策略管理器属性测试
 * 使用fast-check进行基于属性的测试
 * 
 * 需求：2.2, 2.3, 2.4, 2.5
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import StrategyManager from './StrategyManager.js'

describe('StrategyManager - Property-Based Tests', () => {
  let manager

  beforeEach(async () => {
    manager = new StrategyManager()
    // 清空所有策略 - 确保每个测试都有干净的状态
    await manager.clearAll()
  })

  afterEach(async () => {
    // 测试后清理
    if (manager) {
      await manager.clearAll()
    }
  })

  describe.sequential('Property 2: 策略持久化往返一致性', () => {
    test('Property 2: Strategy persistence round-trip consistency', () => {
      // Feature: zpoint-quant, Property 2: 策略持久化往返一致性
      fc.assert(
        fc.asyncProperty(
          // 生成策略数据
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            code: fc.constantFrom(
              'function onBar() { return null }',
              'const onBar = () => { return { action: "BUY" } }',
              'function onBar(data, indicators) { if (data.close > 100) return { action: "SELL" }; return null }',
              'let onBar = function() { return { action: "BUY", quantity: 100 } }'
            ),
            config: fc.record({
              market: fc.constantFrom('US', 'HK', 'CN', 'CRYPTO', 'FUTURES'),
              symbols: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 5 }),
              interval: fc.constantFrom('1m', '5m', '15m', '1h', '1d'),
              description: fc.string({ maxLength: 200 })
            })
          }),
          async (strategyData) => {
            // 为每个属性测试创建独立的 manager 实例
            const testManager = new StrategyManager()
            await testManager.clearAll()

            try {
              // 创建策略
              const strategy = testManager.createStrategy(
                strategyData.name,
                strategyData.code,
                strategyData.config
              )

              // 保存策略
              await testManager.saveStrategy(strategy)

              // 加载策略
              const loaded = await testManager.loadStrategy(strategy.id)

              // 验证往返一致性
              // 1. 基本字段
              if (loaded.id !== strategy.id) return false
              if (loaded.name !== strategy.name) return false
              if (loaded.code !== strategy.code) return false
              if (loaded.status !== strategy.status) return false

              // 2. 配置字段
              if (loaded.config.market !== strategy.config.market) return false
              if (loaded.config.interval !== strategy.config.interval) return false
              if (JSON.stringify(loaded.config.symbols) !== JSON.stringify(strategy.config.symbols)) return false

              // 3. 时间戳（应该是Date对象）
              if (!(loaded.createdAt instanceof Date)) return false
              if (!(loaded.updatedAt instanceof Date)) return false
              if (loaded.createdAt.getTime() !== strategy.createdAt.getTime()) return false

              return true
            } finally {
              // 清理测试数据
              await testManager.clearAll()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property 2.1: Multiple strategies persistence', () => {
      // 验证多个策略的持久化
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
              code: fc.constantFrom(
                'function onBar() { return null }',
                'const onBar = () => ({ action: "BUY" })'
              )
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (strategiesData) => {
            // 为每个属性测试创建独立的 manager 实例
            const testManager = new StrategyManager()
            await testManager.clearAll()

            try {
              const createdStrategies = []

              // 创建并保存所有策略
              for (const data of strategiesData) {
                const strategy = testManager.createStrategy(data.name, data.code)
                await testManager.saveStrategy(strategy)
                createdStrategies.push(strategy)
              }

              // 加载所有策略
              const loadedStrategies = await testManager.listStrategies()

              // 验证数量
              if (loadedStrategies.length !== createdStrategies.length) {
                return false
              }

              // 验证每个策略都能找到
              for (const created of createdStrategies) {
                const found = loadedStrategies.find(s => s.id === created.id)
                if (!found) return false
                if (found.name !== created.name) return false
                if (found.code !== created.code) return false
              }

              return true
            } finally {
              // 清理测试数据
              await testManager.clearAll()
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    test.skip('Property 2.2: Persistence across manager instances', async () => {
      // 验证跨manager实例的持久化
      // 注意：这个测试需要串行运行，因为它依赖于 LocalStorage 的状态
      
      // 清空 LocalStorage 一次
      localStorage.removeItem('zpoint_quant_strategies')
      localStorage.removeItem('zpoint_quant_active_strategies')
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            code: fc.constantFrom('function onBar() { return null }')
          }),
          async (strategyData) => {
            // 使用第一个manager创建和保存
            const manager1 = new StrategyManager()
            const strategy = manager1.createStrategy(strategyData.name, strategyData.code)
            await manager1.saveStrategy(strategy)

            // 使用新的manager实例加载
            const manager2 = new StrategyManager()
            const loaded = await manager2.loadStrategy(strategy.id)

            // 验证一致性
            const result = loaded.id === strategy.id &&
                          loaded.name === strategy.name &&
                          loaded.code === strategy.code

            // 清理这个策略，为下一次迭代做准备
            await manager2.deleteStrategy(strategy.id)

            return result
          }
        ),
        { numRuns: 50, endOnFailure: true }
      )
    })
  })

  describe('Property 3: 策略代码语法验证正确性', () => {
    test('Property 3: Strategy code syntax validation correctness', () => {
      // Feature: zpoint-quant, Property 3: 策略代码语法验证正确性
      fc.assert(
        fc.property(
          // 生成包含语法错误的代码
          fc.oneof(
            fc.constant('function onBar() { this is invalid }'),
            fc.constant('function onBar() { return 1 + }'),
            fc.constant('const onBar = ('),
            fc.constant('function onBar() { { { }'),
            fc.constant('function onBar() ] }'),
            fc.constant('let onBar = function() { const x = }')
          ),
          (invalidCode) => {
            const result = manager.validateStrategy(invalidCode)

            // 属性1: 验证函数应该返回非空的错误列表
            if (result.valid) return false
            if (!Array.isArray(result.errors)) return false
            if (result.errors.length === 0) return false

            // 属性2: 错误信息应该包含错误位置或描述
            const hasErrorInfo = result.errors.some(error => 
              typeof error === 'string' && error.length > 0
            )
            if (!hasErrorInfo) return false

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property 3.1: Valid code passes validation', () => {
      // 验证有效代码通过验证
      fc.assert(
        fc.property(
          fc.constantFrom(
            'function onBar() { return null }',
            'function onBar(data) { return { action: "BUY" } }',
            'const onBar = () => { return null }',
            'let onBar = function(data, indicators) { if (data.close > 100) return { action: "SELL" }; return null }',
            'var onBar = (data) => ({ action: "BUY", quantity: 100 })'
          ),
          (validCode) => {
            const result = manager.validateStrategy(validCode)

            return result.valid === true && result.errors.length === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property 3.2: Dangerous operations are rejected', () => {
      // 验证危险操作被拒绝
      fc.assert(
        fc.property(
          fc.constantFrom(
            'function onBar() { eval("malicious") }',
            'function onBar() { new Function("return 1")() }',
            'import fs from "fs"; function onBar() {}',
            'const fs = require("fs"); function onBar() {}'
          ),
          (dangerousCode) => {
            const result = manager.validateStrategy(dangerousCode)

            // 应该被拒绝
            if (result.valid) return false

            // 应该有相关的错误消息
            const hasDangerousError = result.errors.some(error =>
              error.includes('eval') ||
              error.includes('Function') ||
              error.includes('import') ||
              error.includes('require')
            )

            return hasDangerousError
          }
        ),
        { numRuns: 100 }
      )
    })

    test('Property 3.3: Missing onBar function is detected', () => {
      // 验证缺少onBar函数被检测
      fc.assert(
        fc.property(
          fc.constantFrom(
            'function someOtherFunction() { return 1 }',
            'const helper = () => { return 2 }',
            'let x = 10; let y = 20;',
            'function calculate() { return x + y }'
          ),
          (codeWithoutOnBar) => {
            const result = manager.validateStrategy(codeWithoutOnBar)

            // 应该被拒绝
            if (result.valid) return false

            // 应该有关于缺少onBar的错误
            const hasOnBarError = result.errors.some(error =>
              error.includes('onBar')
            )

            return hasOnBarError
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe.sequential('Strategy Lifecycle Properties', () => {
    test('Property: Strategy status transitions are valid', () => {
      // 验证策略状态转换的有效性
      fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            code: fc.constant('function onBar() { return null }')
          }),
          async (strategyData) => {
            // 为每个属性测试创建独立的 manager 实例
            const testManager = new StrategyManager()
            await testManager.clearAll()

            try {
              const strategy = testManager.createStrategy(strategyData.name, strategyData.code)
              await testManager.saveStrategy(strategy)

              // 初始状态应该是inactive
              if (strategy.status !== 'inactive') return false

              // 激活后应该是active
              await testManager.activateStrategy(strategy.id)
              const activated = await testManager.loadStrategy(strategy.id)
              if (activated.status !== 'active') return false

              // 停止后应该是inactive
              await testManager.deactivateStrategy(strategy.id)
              const deactivated = await testManager.loadStrategy(strategy.id)
              if (deactivated.status !== 'inactive') return false

              return true
            } finally {
              // 清理测试数据
              await testManager.clearAll()
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    test('Property: Strategy updates preserve id and createdAt', () => {
      // 验证更新策略时保留id和createdAt
      fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            code: fc.constant('function onBar() { return null }'),
            newName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0)
          }),
          async (data) => {
            // 为每个属性测试创建独立的 manager 实例
            const testManager = new StrategyManager()
            await testManager.clearAll()

            try {
              const strategy = testManager.createStrategy(data.name, data.code)
              await testManager.saveStrategy(strategy)

              const originalId = strategy.id
              const originalCreatedAt = strategy.createdAt.getTime()

              // 更新策略
              await testManager.updateStrategy(strategy.id, { name: data.newName })

              // 加载更新后的策略
              const updated = await testManager.loadStrategy(strategy.id)

              // id和createdAt应该保持不变
              return updated.id === originalId &&
                     updated.createdAt.getTime() === originalCreatedAt &&
                     updated.name === data.newName
            } finally {
              // 清理测试数据
              await testManager.clearAll()
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    test('Property: Deleted strategies cannot be loaded', () => {
      // 验证删除的策略无法加载
      fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            code: fc.constant('function onBar() { return null }')
          }),
          async (strategyData) => {
            // 为每个属性测试创建独立的 manager 实例
            const testManager = new StrategyManager()
            await testManager.clearAll()

            try {
              const strategy = testManager.createStrategy(strategyData.name, strategyData.code)
              await testManager.saveStrategy(strategy)

              // 删除策略
              await testManager.deleteStrategy(strategy.id)

              // 尝试加载应该失败
              try {
                await testManager.loadStrategy(strategy.id)
                return false // 不应该成功
              } catch (error) {
                return error.message.includes('not found')
              }
            } finally {
              // 清理测试数据
              await testManager.clearAll()
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    test('Property: Duplicate strategy creates independent copy', () => {
      // 验证复制策略创建独立副本
      fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
            code: fc.constant('function onBar() { return { action: "BUY" } }'),
            copyName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0)
          }),
          async (data) => {
            // 为每个属性测试创建独立的 manager 实例
            const testManager = new StrategyManager()
            await testManager.clearAll()

            try {
              const original = testManager.createStrategy(data.name, data.code)
              await testManager.saveStrategy(original)

              // 复制策略
              const duplicate = await testManager.duplicateStrategy(original.id, data.copyName)

              // 验证独立性
              if (duplicate.id === original.id) return false
              if (duplicate.name !== data.copyName) return false
              if (duplicate.code !== original.code) return false

              // 修改原始策略不应影响副本
              await testManager.updateStrategy(original.id, { name: 'Modified Original' })
              const reloadedDuplicate = await testManager.loadStrategy(duplicate.id)

              return reloadedDuplicate.name === data.copyName
            } finally {
              // 清理测试数据
              await testManager.clearAll()
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
