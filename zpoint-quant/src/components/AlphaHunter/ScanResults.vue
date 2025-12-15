<template>
  <div class="scan-results">
    <div v-if="items.length===0" class="empty">请添加股票后开始扫描</div>
    <ul>
      <li v-for="(it, idx) in items" :key="it.symbol">{{ idx+1 }}. {{ it.symbol }} — RS: {{ it.rsInfo?.rsStrength?.toFixed(2) || '-' }}</li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'ScanResults',
  props: { items: { type: Array, default: () => [] } }
}
</script>

<style scoped>
.empty { color: #94a3b8; padding: 20px; text-align: center; }
ul { list-style: none; margin: 0; padding: 0 10px; }
li { padding: 8px 0; border-bottom: 1px solid #eef2f7; }
</style>
