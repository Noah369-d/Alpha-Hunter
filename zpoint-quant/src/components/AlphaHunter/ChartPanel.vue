<template>
  <div class="chart-panel card">
    <div class="chart-header"><slot name="title">主图</slot></div>
    <div class="chart-body"><canvas :ref="canvasRef"></canvas></div>
  </div>
</template>

<script>
export default {
  name: 'ChartPanel',
  props: { canvasRef: { type: String, default: 'chart' }, series: { type: Array, default: () => [] } },
  mounted() {
    // try to dynamically load lightweight-charts in browser builds
    const c = this.$refs[this.canvasRef];
    if (this.series && this.series.length > 0) {
      // attempt dynamic import; if not available we fall back to canvas placeholder
      import('lightweight-charts').then(({ createChart }) => {
        const chart = createChart(c, { width: c.clientWidth || 600, height: 240, layout: { backgroundColor: '#fff' } });
        const line = chart.addLineSeries();
        line.setData(this.series.map((p, i) => ({ time: i, value: p })))
      }).catch(() => { this._drawPlaceholder(c) })
    } else {
      this._drawPlaceholder(c)
    }
  },
  methods: {
    _drawPlaceholder(c){ if (c && c.getContext) { const ctx = c.getContext('2d'); if (ctx) { ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, c.width || 600, c.height || 240) } } }
  }
}
</script>

<style scoped>
.chart-panel { padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
.chart-header { font-weight: 700; margin-bottom: 8px; }
.chart-body { min-height: 200px; }
</style>
