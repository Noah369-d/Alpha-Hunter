<template>
  <div class="scan-results">
    <div v-if="items.length===0" class="empty">请点击 "📁 导入股票池" 或手动输入，然后点击 🚀 全量扫描</div>

    <div v-else>
      <div class="stock-grid-header">
        <div>#</div>
        <div>代码 / 名称</div>
        <div class="text-right">现价</div>
        <div>RS</div>
        <div class="text-right">涨幅</div>
      </div>

      <div class="rows">
        <div v-for="(it, idx) in items" :key="it.symbol" :class="['stock-grid-row', selectedSymbol===it.symbol? 'active' : '']" @click="$emit('select', it)">
          <div class="w-10">
            <span :class="['btn-star', isWatchlisted(it.symbol) ? 'active' : '']" @click.stop="$emit('toggle-star', it.symbol)">★</span>
          </div>

          <div class="meta">
            <div class="symbol-line">
              <strong class="symbol">{{ it.symbol }}</strong>
              <span v-if="it.sniper" class="sniper-badge">狙击</span>
            </div>
            <div v-if="it.error" class="error">失败</div>
            <div v-else class="name" v-if="it.name">{{ it.name }}</div>
          </div>

          <div class="text-right price">{{ it.rsInfo?.price ? it.rsInfo.price.toFixed(2) : '--' }}</div>

          <div class="rs-wrap">
            <div class="rs-badge" :class="rsClass(it.rsInfo?.rsStrength)">{{ it.rsInfo?.rsStrength ? Math.round(it.rsInfo.rsStrength) : '--' }}</div>
            <div class="rs-mini" v-if="it.rsLine && it.rsLine.length>5">
              <!-- tiny inline sparkline using background linear-gradient as placeholder -->
              <div class="spark" :style="miniStyle(it.rsLine)"></div>
            </div>
          </div>

          <div class="text-right change-col">
            <div :class="changeClass(it.rsInfo?.changePct)">{{ it.rsInfo?.changePct!=null ? formatChange(it.rsInfo.changePct) : '--' }}</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: 'ScanResults',
  props: {
    items: { type: Array, default: () => [] },
    selectedSymbol: { type: String, default: null },
    watchlist: { type: Array, default: () => [] },
    rsThresholds: { type: Object, default: () => ({ veryHigh: 140, high: 110, mid: 90 }) }
  },
  methods: {
    rsClass(val) {
      const t = this.rsThresholds || { veryHigh:140, high:110, mid:90 }
      if (!val && val !== 0) return 'rs-na'
      if (val >= t.veryHigh) return 'rs-very-high'
      if (val >= t.high) return 'rs-high'
      if (val >= t.mid) return 'rs-mid'
      return 'rs-low'
    },
    changeClass(c) {
      if (c == null) return ''
      return c >= 0 ? 'text-up' : 'text-down'
    },
    formatChange(c) {
      const sign = c >= 0 ? '+' : ''
      return `${sign}${c.toFixed(1)}%`
    },
    isWatchlisted(sym) { return this.watchlist && this.watchlist.includes(sym) },
    miniStyle(rsLine) {
      // simple placeholder: color of last change
      try {
        const last = rsLine[rsLine.length-1]
        const first = rsLine[0]
        const up = last - first >= 0
        const color = up ? 'linear-gradient(90deg,#bbf7d0,#10b981)' : 'linear-gradient(90deg,#fecaca,#ef4444)'
        return { background: color }
      } catch (e) { return {} }
    }
  }
}
</script>

<style scoped>
.empty { color: var(--ap-muted); padding: 26px; text-align: center; font-size:13px }
.stock-grid-header{display:grid;grid-template-columns:30px 1fr 78px 80px 86px;padding:8px 10px;font-size:11px;color:var(--text-sub);border-bottom:1px solid var(--border-color);background:var(--bg-root)}
.stock-grid-row{display:grid;grid-template-columns:30px 1fr 78px 80px 86px;padding:10px 10px;align-items:center;border-bottom:1px solid var(--border-color);cursor:pointer;border-left:4px solid transparent}
.stock-grid-row:hover{background:var(--bg-hover);transform:translateY(-0.5px)}
.stock-grid-row.active{background:linear-gradient(90deg, rgba(14,165,233,0.02), transparent); border-left-color:var(--accent-blue)}
.btn-star{cursor:pointer;color:var(--text-sub);padding:0 6px;font-size:14px}
.btn-star.active{color:#f59e0b}
.symbol-line{display:flex;gap:8px;align-items:center}
.sniper-badge{background:linear-gradient(90deg,#ecfdf5,#dcfce7);border:1px solid #10b981;color:#065f46;padding:4px 10px;border-radius:12px;font-size:12px}
.error{color:#ef4444;font-size:12px;margin-top:4px}
.name{font-size:11px;color:var(--text-sub);margin-top:3px}
.text-right{text-align:right}
.price{font-weight:700;font-size:14px}
.rs-wrap{display:flex;align-items:center;gap:8px}
.rs-badge{display:inline-block;padding:6px 10px;border-radius:12px;color:#fff;font-weight:700;font-size:12px;text-align:center;min-width:46px}
.rs-very-high{background:linear-gradient(90deg,#059669,#10b981)}
.rs-high{background:linear-gradient(90deg,#10b981,#34d399)}
.rs-mid{background:linear-gradient(90deg,#f59e0b,#fbbf24);color:#7c2d12}
.rs-low{background:linear-gradient(90deg,#ef4444,#fb7185)}
.rs-na{background:#e2e8f0;color:#475569}
.rs-mini{width:40px;height:18px;border-radius:3px;overflow:hidden}
.rs-mini .spark{height:100%;width:100%}
.text-up{color:#16a34a;font-weight:600}
.text-down{color:#ef4444;font-weight:600}
.change-col{font-size:13px}
.rows{max-height:520px;overflow:auto}
</style>
