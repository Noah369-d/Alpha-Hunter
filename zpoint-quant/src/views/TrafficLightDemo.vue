<template>
  <div class="card">
    <h2>TrafficLight Demo</h2>
    <p>示例：不同 RS 值对 TrafficLight 的显示</p>
    <div style="display:flex;gap:20px;align-items:flex-start;margin-top:12px">
      <div v-for="(item, i) in items" :key="i" style="padding:12px;border:1px solid var(--border-color);border-radius:8px">
        <div style="font-weight:700">{{ item.symbol }}</div>
        <div style="margin:8px 0">RS: {{ item.rsInfo.rsStrength }}</div>
        <TrafficLight :item="item" :rsThresholds="rsThresholds" />
      </div>
    </div>
    <div style="margin-top:12px">
      <label class="font-muted">阈值 (veryHigh / high / mid)</label>
      <input v-model.number="rsThresholds.veryHigh" style="width:80px;margin-left:8px" />
      <input v-model.number="rsThresholds.high" style="width:80px;margin-left:8px" />
      <input v-model.number="rsThresholds.mid" style="width:80px;margin-left:8px" />
    </div>
  </div>
</template>

<script>
import TrafficLight from '../components/AlphaHunter/TrafficLight.vue'
export default {
  name: 'TrafficLightDemo',
  components: { TrafficLight },
  data() {
    return {
      rsThresholds: { veryHigh: 120, high: 95, mid: 65 },
      items: [
        { symbol: 'AAPL', rsInfo: { rsStrength: 130 }, sniper: { signals: [1] } },
        { symbol: 'MSFT', rsInfo: { rsStrength: 100 } },
        { symbol: 'LOW', rsInfo: { rsStrength: 50 } }
      ]
    }
  }
}
</script>

<style scoped>
.card { padding:18px }
</style>