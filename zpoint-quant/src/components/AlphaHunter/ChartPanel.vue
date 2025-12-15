<template>
  <div class="chart-panel card">
    <div class="chart-header"><slot name="title">主图</slot></div>
    <div class="chart-body"><canvas :ref="canvasRef"></canvas></div>
  </div>
</template>

<script>
export default {
  name: 'ChartPanel',
  props: { canvasRef: { type: String, default: 'chart' } },
  mounted() {
    // minimal placeholder - actual charting can be added later
    const c = this.$refs[this.canvasRef];
    if (c && c.getContext) {
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, c.width, c.height);
    }
  }
}
</script>

<style scoped>
.chart-panel { padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
.chart-header { font-weight: 700; margin-bottom: 8px; }
.chart-body { min-height: 200px; }
</style>
