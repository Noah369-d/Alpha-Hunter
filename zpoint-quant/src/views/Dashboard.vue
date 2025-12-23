<template>
  <div class="dashboard">
    <h1 class="page-title">仪表板</h1>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🤖</div>
        <div class="stat-content">
          <div class="stat-label">活动策略</div>
          <div class="stat-value">{{ activeStrategies }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🔔</div>
        <div class="stat-content">
          <div class="stat-label">今日信号</div>
          <div class="stat-value">{{ todaySignals }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-label">投资组合价值</div>
          <div class="stat-value">${{ portfolioValue.toLocaleString() }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-label">总收益率</div>
          <div class="stat-value" :class="totalReturn >= 0 ? 'positive' : 'negative'">
            {{ totalReturn >= 0 ? '+' : '' }}{{ totalReturn.toFixed(2) }}%
          </div>
        </div>
      </div>
    </div>
    
    <!-- 最新信号 -->
    <div class="section">
      <div class="section-header">
        <h2>最新信号</h2>
        <router-link to="/signals" class="view-all">查看全部 →</router-link>
      </div>
      
      <div class="signals-list" v-if="recentSignals.length > 0">
        <div v-for="signal in recentSignals" :key="signal.id" class="signal-item">
          <div class="signal-type" :class="signal.type.toLowerCase()">
            {{ signal.type }}
          </div>
          <div class="signal-info">
            <div class="signal-symbol">{{ signal.symbol }}</div>
            <div class="signal-strategy">{{ signal.strategyName }}</div>
          </div>
          <div class="signal-details">
            <div class="signal-price">${{ signal.price.toFixed(2) }}</div>
            <div class="signal-strength">强度: {{ signal.strength }}</div>
          </div>
          <div class="signal-time">
            {{ formatTime(signal.timestamp) }}
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <p>暂无信号</p>
      </div>
    </div>
    
    <!-- 活动策略 -->
    <div class="section">
      <div class="section-header">
        <h2>活动策略</h2>
        <router-link to="/strategies" class="view-all">管理策略 →</router-link>
      </div>
      
      <div class="strategies-list" v-if="strategies.length > 0">
        <div v-for="strategy in strategies" :key="strategy.id" class="strategy-item">
          <div class="strategy-info">
            <div class="strategy-name">{{ strategy.name }}</div>
            <div class="strategy-status" :class="strategy.status">
              {{ strategy.status === 'active' ? '运行中' : '已停止' }}
            </div>
          </div>
          <div class="strategy-stats">
            <span>信号: {{ strategy.signalCount || 0 }}</span>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <p>暂无活动策略</p>
        <router-link to="/strategies" class="btn-primary">创建策略</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import StrategyManager from '../utils/StrategyManager.js'
import SignalGenerator from '../utils/SignalGenerator.js'

const router = useRouter()

// 数据
const activeStrategies = ref(0)
const todaySignals = ref(0)
const portfolioValue = ref(100000)
const totalReturn = ref(0)
const recentSignals = ref([])
const strategies = ref([])

// 管理器实例
const strategyManager = new StrategyManager()
const signalGenerator = new SignalGenerator()

// 加载数据
onMounted(async () => {
  await loadDashboardData()
})

async function loadDashboardData() {
  try {
    // 加载策略
    const allStrategies = await strategyManager.listStrategies()
    strategies.value = allStrategies.filter(s => s.status === 'active').slice(0, 5)
    activeStrategies.value = strategies.value.length
    
    // 加载今日信号
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const signals = await signalGenerator.getSignalHistory({
      startDate: today,
      limit: 10
    })
    recentSignals.value = signals
    todaySignals.value = signals.length
    
    // 计算信号数量
    for (const strategy of strategies.value) {
      const strategySignals = await signalGenerator.getSignalHistory({
        strategyId: strategy.id
      })
      strategy.signalCount = strategySignals.length
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #2c3e50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  font-size: 40px;
  margin-right: 16px;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.stat-value.positive {
  color: #42b983;
}

.stat-value.negative {
  color: #e74c3c;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.view-all {
  color: #42b983;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.view-all:hover {
  color: #359268;
}

.signals-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.signal-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  gap: 16px;
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

.signal-info {
  flex: 1;
}

.signal-symbol {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.signal-strategy {
  font-size: 13px;
  color: #666;
}

.signal-details {
  text-align: right;
}

.signal-price {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.signal-strength {
  font-size: 13px;
  color: #666;
}

.signal-time {
  font-size: 13px;
  color: #999;
  min-width: 80px;
  text-align: right;
}

.strategies-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strategy-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.strategy-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.strategy-name {
  font-weight: 600;
  color: #2c3e50;
}

.strategy-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.strategy-status.active {
  background: #d4edda;
  color: #155724;
}

.strategy-status.inactive {
  background: #f8d7da;
  color: #721c24;
}

.strategy-stats {
  font-size: 14px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state p {
  margin-bottom: 16px;
}

.btn-primary {
  display: inline-block;
  padding: 10px 20px;
  background: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #359268;
}
</style>

