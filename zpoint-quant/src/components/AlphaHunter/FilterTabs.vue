<template>
  <div class="filter-tabs">
    <button v-for="tab in tabs" :key="tab.id" :class="['tab', {active: tab.id===active, sniper: tab.id==='sniper'}]" @click="select(tab.id)">{{ tab.label }} <span v-if="badges[tab.id]" class="badge">{{ badges[tab.id] }}</span></button>
  </div>
</template>

<script>
export default {
  name: 'FilterTabs',
  props: {
    modelValue: { type: String, default: 'all' },
    badges: { type: Object, default: () => ({}) }
  },
  data() { return { tabs: [{id:'all',label:'全部'}, {id:'sniper',label:'狙击'}, {id:'failed',label:'失败'}], active: this.modelValue } },
  emits: ['update:modelValue'],
  methods: {
    select(id) { this.active = id; this.$emit('update:modelValue', id) }
  },
  watch: { modelValue(v){ this.active = v } }
}
</script>

<style scoped>
.filter-tabs { display:flex; gap:6px; }
.tab { padding:6px 10px; border-radius:6px; border:1px solid #e2e8f0; background:white; cursor:pointer }
.tab.active { background:#0f172a; color:white }
.badge { background:#ef4444; color:white; border-radius:10px; padding:0 6px; margin-left:6px; font-size:11px }

/* Sniper tab styling */
.tab.sniper { background: linear-gradient(90deg,#ffedd5,#fee2b3); border-color:#f59e0b; position:relative }
.tab.sniper::after { content: ''; position:absolute; right:6px; top:6px; width:8px; height:8px; border-radius:50%; background:#f97316; box-shadow: 0 0 8px rgba(249,115,22,0.8); animation: pulse 1.6s infinite }

@keyframes pulse { 0%{ transform:scale(.9); opacity:1 } 70%{ transform:scale(1.4); opacity:0 } 100%{ transform:scale(.9); opacity:0 } }
</style>
