<template>
  <div class="strategies-page">
    <div class="page-header">
      <h1 class="page-title">策略管理</h1>
      <button @click="showCreateDialog = true" class="btn-primary">
        ➕ 创建策略
      </button>
    </div>
    
    <!-- 策略列表 -->
    <div class="strategies-grid">
      <div v-for="strategy in strategies" :key="strategy.id" class="strategy-card">
        <div class="strategy-header">
          <div>
            <h3 class="strategy-name">{{ strategy.name }}</h3>
            <p class="strategy-desc">{{ strategy.description || '无描述' }}</p>
          </div>
          <div class="strategy-status" :class="strategy.status">
            {{ strategy.status === 'active' ? '运行中' : '已停止' }}
          </div>
        </div>
        
        <div class="strategy-info">
          <div class="info-item">
            <span class="label">市场:</span>
            <span class="value">{{ strategy.config?.market || 'US' }}</span>
          </div>
          <div class="info-item">
            <span class="label">品种:</span>
            <span class="value">{{ strategy.config?.symbols?.join(', ') || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">创建时间:</span>
            <span class="value">{{ formatDate(strategy.createdAt) }}</span>
          </div>
        </div>
        
        <div class="strategy-actions">
          <button 
            @click="toggleStrategy(strategy)" 
            class="btn-action"
            :class="strategy.status === 'active' ? 'btn-stop' : 'btn-start'"
          >
            {{ strategy.status === 'active' ? '停止' : '启动' }}
          </button>
          <button @click="editStrategy(strategy)" class="btn-action">编辑</button>
          <button @click="deleteStrategy(strategy)" class="btn-action btn-danger">删除</button>
        </div>
      </div>
      
      <div v-if="strategies.length === 0" class="empty-state">
        <p>暂无策略</p>
        <button @click="showCreateDialog = true" class="btn-primary">创建第一个策略</button>
      </div>
    </div>
    
    <!-- 创建/编辑策略对话框 -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog">
        <div class="dialog-header">
          <h2>{{ editingStrategy ? '编辑策略' : '创建策略' }}</h2>
          <button @click="closeDialog" class="btn-close">✕</button>
        </div>
        
        <div class="dialog-body">
          <div class="form-group">
            <label>策略名称</label>
            <input v-model="formData.name" type="text" placeholder="输入策略名称" />
          </div>
          
          <div class="form-group">
            <label>策略描述</label>
            <input v-model="formData.description" type="text" placeholder="输入策略描述（可选）" />
          </div>
          
          <div class="form-group">
            <label>市场类型</label>
            <select v-model="formData.market">
              <option value="US">美股</option>
              <option value="HK">港股</option>
              <option value="CN">A股</option>
              <option value="CRYPTO">加密货币</option>
              <option value="FUTURES">期货</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>交易品种（逗号分隔）</label>
            <input v-model="formData.symbols" type="text" placeholder="例如: AAPL, MSFT, GOOGL" />
          </div>
          
          <div class="form-group">
            <label>策略代码</label>
            <textarea 
              v-model="formData.code" 
              rows="12" 
              placeholder="输入策略代码..."
              class="code-editor"
            ></textarea>
            <div class="code-hint">
              提示: 定义 onSignal(data, indicators) 函数来生成信号
            </div>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button @click="closeDialog" class="btn-secondary">取消</button>
          <button @click="saveStrategy" class="btn-primary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import StrategyManager from '../utils/StrategyManager.js'

const manager = new StrategyManager()

const strategies = ref([])
const showCreateDialog = ref(false)
const editingStrategy = ref(null)
const formData = ref({
  name: '',
  description: '',
  market: 'US',
  symbols: '',
  code: `function onSignal(data, indicators) {
  // 示例: 简单的价格突破策略
  if (data.close > 150) {
    return {
      type: 'BUY',
      price: data.close,
      strength: 75,
      conditions: ['价格突破150']
    }
  }
  return null
}`
})

onMounted(async () => {
  await loadStrategies()
})

async function loadStrategies() {
  try {
    strategies.value = await manager.listStrategies()
  } catch (error) {
    console.error('Failed to load strategies:', error)
    alert('加载策略失败')
  }
}

async function toggleStrategy(strategy) {
  try {
    if (strategy.status === 'active') {
      await manager.deactivateStrategy(strategy.id)
      strategy.status = 'inactive'
    } else {
      await manager.activateStrategy(strategy.id)
      strategy.status = 'active'
    }
  } catch (error) {
    console.error('Failed to toggle strategy:', error)
    alert('操作失败')
  }
}

function editStrategy(strategy) {
  editingStrategy.value = strategy
  formData.value = {
    name: strategy.name,
    description: strategy.description || '',
    market: strategy.config?.market || 'US',
    symbols: strategy.config?.symbols?.join(', ') || '',
    code: strategy.code
  }
  showCreateDialog.value = true
}

async function deleteStrategy(strategy) {
  if (!confirm(`确定要删除策略 "${strategy.name}" 吗？`)) {
    return
  }
  
  try {
    await manager.deleteStrategy(strategy.id)
    await loadStrategies()
  } catch (error) {
    console.error('Failed to delete strategy:', error)
    alert('删除失败')
  }
}

async function saveStrategy() {
  if (!formData.value.name || !formData.value.code) {
    alert('请填写策略名称和代码')
    return
  }
  
  try {
    const config = {
      market: formData.value.market,
      symbols: formData.value.symbols.split(',').map(s => s.trim()).filter(s => s),
      interval: '1d'
    }
    
    if (editingStrategy.value) {
      await manager.updateStrategy(editingStrategy.value.id, {
        name: formData.value.name,
        description: formData.value.description,
        code: formData.value.code,
        config
      })
    } else {
      manager.createStrategy(
        formData.value.name,
        formData.value.code,
        config
      )
      await manager.saveStrategy(manager.strategies[manager.strategies.length - 1])
    }
    
    await loadStrategies()
    closeDialog()
  } catch (error) {
    console.error('Failed to save strategy:', error)
    alert('保存失败: ' + error.message)
  }
}

function closeDialog() {
  showCreateDialog.value = false
  editingStrategy.value = null
  formData.value = {
    name: '',
    description: '',
    market: 'US',
    symbols: '',
    code: `function onSignal(data, indicators) {
  // 示例: 简单的价格突破策略
  if (data.close > 150) {
    return {
      type: 'BUY',
      price: data.close,
      strength: 75,
      conditions: ['价格突破150']
    }
  }
  return null
}`
  }
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.strategies-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
}

.btn-primary {
  padding: 10px 20px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #359268;
}

.strategies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.strategy-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s, box-shadow 0.2s;
}

.strategy-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.strategy-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.strategy-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.strategy-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.strategy-status {
  padding: 4px 12px;
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

.strategy-info {
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
}

.info-item .label {
  color: #666;
}

.info-item .value {
  color: #2c3e50;
  font-weight: 500;
}

.strategy-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.btn-action:hover {
  background: #f8f9fa;
}

.btn-start {
  border-color: #42b983;
  color: #42b983;
}

.btn-start:hover {
  background: #42b983;
  color: white;
}

.btn-stop {
  border-color: #e74c3c;
  color: #e74c3c;
}

.btn-stop:hover {
  background: #e74c3c;
  color: white;
}

.btn-danger {
  border-color: #e74c3c;
  color: #e74c3c;
}

.btn-danger:hover {
  background: #e74c3c;
  color: white;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state p {
  margin-bottom: 16px;
  font-size: 16px;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.dialog-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-close:hover {
  background: #f8f9fa;
  color: #666;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #42b983;
}

.code-editor {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.code-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #eee;
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
</style>

