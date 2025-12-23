<template>
  <div class="filter-panel card">
    <div class="header">筛选条件</div>
    <div class="field"><label>RS 强度最低</label><input type="number" v-model.number="local.rsMin" /></div>
    <div class="field"><label>涨幅最低 (%)</label><input type="number" v-model.number="local.minChange" /></div>
    <div class="field"><label>最小成交额 (万)</label><input type="number" v-model.number="local.minVol" /></div>
    <div style="margin-top:8px"><button @click="apply">应用</button> <button @click="reset">重置</button></div>
  </div>
</template>

<script>
export default {
  name: 'FilterPanel',
  props: { value: { type: Object, default: () => ({ rsMin: 0, minChange: -999, minVol: 0 }) } },
  data() { return { local: { ...this.value } } },
  methods: {
    apply() { this.$emit('update:value', { ...this.local }); this.$emit('apply', { ...this.local }) },
    reset() { this.local = { rsMin: 0, minChange: -999, minVol: 0 }; this.apply() }
  }
}
</script>

<style scoped>
.filter-panel { padding:8px; }
.field { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:6px }
label { font-size:13px; color:var(--ap-muted) }
input { width:120px; padding:6px; border-radius:6px; border:1px solid var(--ap-border); }
</style>
