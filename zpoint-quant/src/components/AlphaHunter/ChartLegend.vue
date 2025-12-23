<template>
  <div class="chart-legend card">
    <div><strong>{{ title || '主图' }}</strong></div>
    <div style="font-size:12px; color:var(--ap-muted)">{{ subtitle }}</div>
    <div style="margin-top:8px; font-size:13px">价格: <strong>{{ priceDisplay }}</strong></div>
  </div>
</template>

<script>
export default { name: 'ChartLegend', props: { title: String, subtitle: String, price: [String,Number] }, computed: { priceDisplay(){ return this.price==null? '--': (typeof this.price==='number'? this.price.toFixed(2): this.price) } } }
</script>

<style scoped>
.chart-legend { padding:8px; }
</style>
