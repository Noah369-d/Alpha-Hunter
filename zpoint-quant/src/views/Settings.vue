<template>
  <div class="settings-page">
    <h1 class="page-title">系统设置</h1>
    
    <div class="settings-container">
      <!-- 回测设置 -->
      <div class="settings-section">
        <h2>回测参数</h2>
        <div class="form-group">
          <label>初始资金 ($)</label>
          <input v-model.number="settings.backtest.initialCapital" type="number" />
        </div>
        <div class="form-group">
          <label>手续费率 (%)</label>
          <input v-model.number="settings.backtest.commission" type="number" step="0.001" />
        </div>
        <div class="form-group">
          <label>滑点 (%)</label>
          <input v-model.number="settings.backtest.slippage" type="number" step="0.0001" />
        </div>
      </div>
      
      <!-- 风险管理设置 -->
      <div class="settings-section">
        <h2>风险管理</h2>
        <div class="form-group">
          <label>最大回撤 (%)</label>
          <input v-model.number="settings.risk.maxDrawdown" type="number" step="1" />
        </div>
        <div class="form-group">
          <label>最大持仓比例 (%)</label>
          <input v-model.number="settings.risk.maxPositionSize" type="number" step="1" />
        </div>
        <div class="form-group">
          <label>最小现金余额 ($)</label>
          <input v-model.number="settings.risk.minCashBalance" type="number" />
        </div>
      </div>
      
      <div class="settings-actions">
        <button @click="saveSettings" class="btn-primary">保存设置</button>
        <button @click="resetSettings" class="btn-secondary">恢复默认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const settings = ref({
  backtest: {
    initialCapital: 100000,
    commission: 0.1,
    slippage: 0.05
  },
  risk: {
    maxDrawdown: 15,
    maxPositionSize: 20,
    minCashBalance: 10000
  }
})

onMounted(() => {
  loadSettings()
})

function loadSettings() {
  const saved = localStorage.getItem('zpoint-quant-settings')
  if (saved) {
    settings.value = JSON.parse(saved)
  }
}

function saveSettings() {
  localStorage.setItem('zpoint-quant-settings', JSON.stringify(settings.value))
  alert('设置已保存')
}

function resetSettings() {
  settings.value = {
    backtest: {
      initialCapital: 100000,
      commission: 0.1,
      slippage: 0.05
    },
    risk: {
      maxDrawdown: 15,
      maxPositionSize: 20,
      minCashBalance: 10000
    }
  }
}
</script>

<style scoped>
.settings-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #2c3e50;
}

.settings-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.settings-section {
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid #eee;
}

.settings-section:last-of-type {
  border-bottom: none;
}

.settings-section h2 {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #42b983;
}

.settings-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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

