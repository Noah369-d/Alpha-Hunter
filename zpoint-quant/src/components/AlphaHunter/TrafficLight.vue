<template>
  <div class="traffic-light">
    <div class="lights">
      <div class="light red" :class="{ active: activeColor==='red' }" data-test="red"></div>
      <div class="light yellow" :class="{ active: activeColor==='yellow' }" data-test="yellow"></div>
      <div class="light green" :class="{ active: activeColor==='green' }" data-test="green"></div>
    </div>
    <div v-if="hasSniper" class="sniper-badge">🔴</div>
  </div>
</template>

<script>
export default {
  name: 'TrafficLight',
  props: {
    item: { type: Object, default: null },
    rsThresholds: { type: Object, default: () => ({ veryHigh: 120, high: 95, mid: 65 }) }
  },
  computed: {
    rs() { return this.item?.rsInfo?.rsStrength ?? null },
    hasSniper() { return this.item?.sniper?.signals?.some(s => s === 1) },
    activeColor() {
      if (this.rs == null) return null
      if (this.rs >= (this.rsThresholds.veryHigh || 120)) return 'green'
      if (this.rs >= (this.rsThresholds.high || 95)) return 'yellow'
      return 'red'
    }
  }
}
</script>

<style scoped>
.traffic-light { display:flex; align-items:center; gap:8px }
.lights { display:flex; flex-direction:column; gap:6px }
.light { width:18px;height:18px;border-radius:999px;background:#444;opacity:0.35; }
.light.red.active { background:#e53e3e; opacity:1 }
.light.yellow.active { background:#f6e05e; opacity:1 }
.light.green.active { background:#48bb78; opacity:1 }
.sniper-badge { margin-left:8px }
</style>