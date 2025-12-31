<template>
  <div class="scan-preview card">
    <div class="header-row">
      <h3>Scan Results Preview</h3>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <input class="input-dark" v-model="searchTerm" placeholder="搜索代码或公司名称" />
        <button class="btn-ghost" @click="generateSample">生成示例数据</button>
        <button class="btn-ghost" @click="exportCsv">导出 CSV</button>
      </div>
    </div>

    <div style="display:flex;gap:8px;align-items:center;margin:8px 0">
      <label class="font-muted">Very High</label>
      <input v-model.number="rsThresholds.veryHigh" class="input-dark" style="width:80px" />
      <label class="font-muted">High</label>
      <input v-model.number="rsThresholds.high" class="input-dark" style="width:80px" />
      <label class="font-muted">Mid</label>
      <input v-model.number="rsThresholds.mid" class="input-dark" style="width:80px" />
    </div>

    <ScanResults :items="filteredResults" :watchlist="watchlist" :rsThresholds="rsThresholds" :selectedSymbol="selectedSymbol" @select="onSelect" @toggle-star="onToggleStar" />

    <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
      <span class="font-muted">显示 {{ filteredResults.length }} 条示例</span>
      <div style="flex:1"></div>
      <button class="btn-ghost" @click="clear">清空</button>
    </div>
  </div>
</template>

<script>
import ScanResults from '@/components/AlphaHunter/ScanResults.vue'

export default {
  name: 'ScanResultsPreview',
  components: { ScanResults },
  data() {
    return {
      items: [],
      searchTerm: '',
      selectedSymbol: null,
      watchlist: [],
      rsThresholds: { veryHigh: 140, high: 110, mid: 90 }
    }
  },
  computed: {
    filteredResults() {
      const q = this.searchTerm && this.searchTerm.trim().toLowerCase()
      let res = this.items
      if (q) res = res.filter(r => r.symbol.toLowerCase().includes(q) || (r.name && r.name.toLowerCase().includes(q)))
      return res
    }
  },
  methods: {
    generateSample() {
      // create a few sample items with rsInfo and rsLine
      this.items = [
        { symbol: 'AAPL', name: 'Apple Inc.', rsInfo: { rsStrength: 150, price: 172.34, changePct: 1.2 }, rsLine: [80,90,100,120,150], sniper: { signals: [1] } },
        { symbol: 'TSLA', name: 'Tesla', rsInfo: { rsStrength: 115, price: 215.12, changePct: -0.8 }, rsLine: [100,105,110,115,115] },
        { symbol: '0700.HK', name: '腾讯', rsInfo: { rsStrength: 95, price: 420.5, changePct: 0.5 }, rsLine: [85,88,90,92,95] },
        { symbol: 'SPY', name: 'SPY ETF', rsInfo: { rsStrength: 75, price: 455.2, changePct: -2.2 }, rsLine: [90,88,85,80,75] },
        { symbol: 'BABA', name: 'Alibaba', error: 'failed to fetch' }
      ]
    },
    clear() { this.items = [] ; this.selectedSymbol = null; this.searchTerm = '' },
    onSelect(item) { this.selectedSymbol = item.symbol },
    onToggleStar(symbol) {
      const idx = this.watchlist.indexOf(symbol)
      if (idx >= 0) this.watchlist.splice(idx,1)
      else this.watchlist.push(symbol)
    },
    exportCsv() {
      const rows = this.filteredResults.map(r => ({ symbol: r.symbol, name: r.name || '', rs: r.rsInfo?.rsStrength || '', price: r.rsInfo?.price || '', changePct: r.rsInfo?.changePct != null ? r.rsInfo.changePct : '' }))
      const header = ['symbol','name','rs','price','changePct']
      const csv = [header.join(',')].concat(rows.map(row => header.map(h => JSON.stringify(row[h] ?? '')).join(','))).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'scan-results.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.scan-preview{padding:12px}
.header-row{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.input-dark{background:transparent;border:1px solid var(--border-color);padding:6px 8px;color:var(--text-main);border-radius:6px}
.btn-ghost{background:transparent;border:1px solid var(--border-color);padding:6px 8px;border-radius:6px}
.font-muted{color:var(--text-sub);font-size:13px}
</style>