<template>
  <div class="sniper-pool card">
    <div class="header">狙击池 ({{ items.length }})</div>
    <ul>
      <li v-for="it in items" :key="it.symbol" @click="$emit('select', it)" class="sniper-item">
        <strong>{{ it.symbol }}</strong>
        <span class="meta">RS {{ it.rsInfo?.rsStrength?.toFixed(1) || '--' }} • {{ it.rsInfo?.changePct?.toFixed(2) }}%</span>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'SniperPool',
  props: { items: { type: Array, default: () => [] } }
}
</script>

<style scoped>
.sniper-item { padding:8px; display:flex; justify-content:space-between; cursor:pointer; border-bottom:1px solid #eef2f7 }
.sniper-item:hover { background: rgba(249,115,22,0.03); transform:translateX(2px) }
.meta { color:var(--ap-muted); font-size:12px }
</style>
