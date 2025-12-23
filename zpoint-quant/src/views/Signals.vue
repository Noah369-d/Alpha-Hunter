<template>
  <div class="signals-page">
    <h1 class="page-title">交易信号</h1>
    
    <!-- 过滤器 -->
    <div class="filters">
      <select v-model="filterType" @change="loadSignals" class="filter-select">
        <option value="">所有类型</option>
        <option value="BUY">买入</option>
        <option value="SELL">卖出</option>
      </select>
      
      <select v-model="filterStrategy" @change="loadSignals" class="filter-select">
        <option value="">所有策略</option>
        <option v-for="strategy in strategies" :key="strategy.id" :value="strategy.id">
          {{ strategy.name }}
        </option>
      </select>
      
      <button @click="clearSignals" class="btn-secondary">清除历史</button>
    </div>
    
    <!-- 信号列表 -->
    <div class="signals-container">
      <div v-if="signals.length > 0" class="signals-list">
        <div v-for="signal in signals" :key="signal.id" class="signal-card">
          <div class="signal-header">
            <div class="signal-type" :class="signal.type.toLowerCase()">
              {{ signal.type }}
            </div>
            <div class="signal-symbol">{{ signal.symbol }}</div>
            <div class="signal-time">{{ formatTime(signal.timestamp) }}</div>
          </div>
          
          <div class="signal-body">
            <div class="signal-row">
              <span class="label">策略:</span>
              <span class="value">{{ signal.strategyName }}</span>
            </div>
            <div class="signal-row">
              <span class="label">价格:</span>
              <span class="value">${{ signal.price.toFixed(2) }}</span>
            </div>
            <div class="signal-row">
              <span class="label">强度:</span>
              <span class="value">
                <div class="strength-bar">
                  <div class="strength-fill" :style="{ width: signal.strength + '%' }"></div>
                  <span class="strength-text">{{ signal.strength }}</span>
                </div>
              </span>
            </div>
            <div v-if="signal.conditions && signal.conditions.length > 0" class="signal-row">
              <span class="label">条件:</span>
              <span class="value">{{ signal.conditions.join(', ') }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <p>暂无信号记录</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SignalGenerator from '../utils/SignalGenerator.js'
import StrategyManager from '../utils/StrategyManager.js'

const signalGenerator = new SignalGenerator()
const strategyManager = new StrategyManager()

const signals = ref([])
const strategies = ref([])
const filterType = ref('')
const filterStrategy = ref('')

onMounted(async () => {
  await loadStrategies()
  await loadSignals()
})

async function loadStrategies() {
  try {
    strategies.value = await strategyManager.listStrategies()
  } catch (error) {
    console.error('Failed to load strategies:', error)
  }
}

async function loadSignals() {
  try {
    const filters = {}
    if (filterType.value) filters.type = filterType.value
    if (filterStrategy.value) filters.strategyId = filterStrategy.value
    
    signals.value = await signalGenerator.getSignalHistory(filters)
  } catch (error) {
    console.error('Failed to load signals:', error)
  }
}

async function clearSignals() {
  if (!confirm('确定要清除所有信号历史吗？')) {
    return
  }
  
  try {
    await signalGenerator.clearSignalHistory()
    await loadSignals()
  } catch (error) {
    console.error('Failed to clear signals:', error)
    alert('清除失败')
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.signals-page {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #2c3e50;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  cursor: pointer;
}

.btn-secondary {
  padding: 10px 20px;
  background: white;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f8f9fa;
}

.signals-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.signals-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.signal-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  transition: box-shadow 0.2s;
}

.signal-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.signal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.signal-type {
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  min-width: 60px;
  text-align: center;
}

.signal-type.buy {
  background: #d4edda;
  color: #155724;
}

.signal-type.sell {
  background: #f8d7da;
  color: #721c24;
}

.signal-symbol {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.signal-time {
  margin-left: auto;
  font-size: 13px;
  color: #999;
}

.signal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signal-row {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.signal-row .label {
  color: #666;
  min-width: 60px;
}

.signal-row .value {
  color: #2c3e50;
  flex: 1;
}

.strength-bar {
  position: relative;
  width: 200px;
  height: 24px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.strength-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #42b983, #359268);
  transition: width 0.3s;
}

.strength-text {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  color: #2c3e50;
  z-index: 1;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}
</style>

