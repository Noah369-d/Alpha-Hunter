<template>
  <div class="app-layout">
    <!-- 侧边栏导航 -->
    <aside class="sidebar">
      <div class="logo">
        <h1>📊 Zpoint Quant</h1>
      </div>
      
      <nav class="nav-menu">
        <router-link to="/" class="nav-item" active-class="active">
          <span class="icon">🏠</span>
          <span>仪表板</span>
        </router-link>
        
        <router-link to="/strategies" class="nav-item" active-class="active">
          <span class="icon">🤖</span>
          <span>策略管理</span>
        </router-link>
        
        <router-link to="/backtest" class="nav-item" active-class="active">
          <span class="icon">🔄</span>
          <span>回测</span>
        </router-link>
        
        <router-link to="/signals" class="nav-item" active-class="active">
          <span class="icon">🔔</span>
          <span>信号</span>
        </router-link>
        
        <router-link to="/alpha-pro" class="nav-item" active-class="active">
          <span class="icon">🚀</span>
          <span>Alpha Pro</span>
        </router-link>

        <router-link to="/holo" class="nav-item" active-class="active">
          <span class="icon">🌀</span>
          <span>HoloResonance</span>
        </router-link>
        
        <router-link to="/risk" class="nav-item" active-class="active">
          <span class="icon">🛡️</span>
          <span>风险管理</span>
        </router-link>
        
        <router-link to="/settings" class="nav-item" active-class="active">
          <span class="icon">⚙️</span>
          <span>设置</span>
        </router-link>
      </nav>
      
      <div class="sidebar-footer">
        <div class="version">v1.0.0</div>
      </div>
    </aside>
    
    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
// AppLayout - 主布局组件
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 240px;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.logo {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo h1 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.nav-menu {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-left: 3px solid #42b983;
}

.nav-item .icon {
  font-size: 20px;
  margin-right: 12px;
  width: 24px;
  text-align: center;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.version {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
</style>

