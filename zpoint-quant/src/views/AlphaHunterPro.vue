<template>
  <div class="alpha-pro">
    <div class="ap-header card">
      <div class="ap-h-left">
        <span class="trophy">🏆</span>
        <strong>AlphaSniper</strong>
        <span class="muted"> 导入导出进度: <span class="stat">{{ progressCount }}/{{ progressTotal || 0 }}</span> 成功: <span class="stat">{{ successCount }}</span></span>
      </div>
      <div class="ap-h-right">
        <div class="progress-wrap">
          <div class="progress-bar"><div class="progress-fill" :style="{width: progressPercent + '%'}"></div></div>
        </div>
      </div>
    </div>

    <div class="layout">
      <div class="left">
        <div class="card">
          <label class="section-title">股票池</label>
          <SymbolInput v-model="symbols" placeholder="每行一个代码，例如: AAPL 或 0700.HK" />
          <div class="actions" style="margin-top:8px">
            <FileImportExport @import="onImport" @export="onExport" />
            <button class="primary" @click="runScan">🚀 全量扫描</button>
            <button class="danger" disabled>停止</button>
          </div>
        </div>

        <div class="card" style="margin-top:12px">
          <div class="tabs-row">
            <FilterTabs v-model="activeTab" :badges="badges" />
          </div>

          <div style="display:flex;gap:8px;margin:8px 0;align-items:center">
            <input class="input-dark" v-model="searchTerm" placeholder="搜索代码或公司名称" />

            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn-ghost" @click="showRsSettings = !showRsSettings">⚙️ RS 阈值</button>
            </div>

            <div style="flex:1"></div>
            <span class="font-muted">列表 ({{ filteredResults.length }})</span>
          </div>

          <div v-if="showRsSettings" style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
            <label class="font-muted">Very High</label>
            <input v-model.number="rsThresholds.veryHigh" class="input-dark" style="width:80px" />
            <label class="font-muted">High</label>
            <input v-model.number="rsThresholds.high" class="input-dark" style="width:80px" />
            <label class="font-muted">Mid</label>
            <input v-model.number="rsThresholds.mid" class="input-dark" style="width:80px" />
          </div>

          <ScanResults :items="filteredResults" :selectedSymbol="selected?.symbol" :watchlist="watchlist" :rsThresholds="rsThresholds" @select="selectResult" @toggle-star="onToggleStar" />
          <SniperPool :items="filteredResults.filter(r=>r.sniper && r.sniper.signals && r.sniper.signals.some(s=>s===1))" @select="onSniperSelect" />
        </div>
      </div>

      <div class="right">
        <div class="card">
          <div class="card-title">主图 (Price & RS Line)</div>
          <div class="chart-area">
            <ChartLegend :title="selected?.symbol||'--'" :price="selected?.rsInfo?.price" :subtitle="selected?.rsInfo?('RS '+selected.rsInfo.rsStrength.toFixed(2)):'--'" />
            <ChartPanel :series="chartSeries" :options="{type: chartType}" />
          </div>
        </div>

        <div class="card">
          <div class="card-title">机构猎手资金 (Traffic Light)</div>
          <div class="traffic-area">
            <TrafficLight :item="selected" :rsThresholds="rsThresholds" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SymbolInput from '../components/AlphaHunter/SymbolInput.vue'
import ScanResults from '../components/AlphaHunter/ScanResults.vue'
import ChartPanel from '../components/AlphaHunter/ChartPanel.vue'
import FilterPanel from '../components/AlphaHunter/FilterPanel.vue'
import SniperPool from '../components/AlphaHunter/SniperPool.vue'
import FilterTabs from '../components/AlphaHunter/FilterTabs.vue'
import TaskQueue from '../components/AlphaHunter/TaskQueue.vue'
import ChartLegend from '../components/AlphaHunter/ChartLegend.vue'
import FileImportExport from '../components/AlphaHunter/FileImportExport.vue'
import TrafficLight from '../components/AlphaHunter/TrafficLight.vue'
import { calculateRS_Standard } from '../utils/alphaAlgo'
import { scanSymbol } from '../utils/marketService'
import DEFAULT_RS_THRESHOLDS from '@/utils/rsThresholds'

export default {
  name: 'AlphaHunterPro',
  components: { SymbolInput, ScanResults, ChartPanel, FileImportExport, FilterTabs, TaskQueue, ChartLegend, FilterPanel, SniperPool, TrafficLight },
  data() {
    return {
      symbols: '',
      results: [],
      activeTab: 'all',
      selectedIndex: 0,
      filters: { rsMin: 0, minChange: -999, minVol: 0 },
      chartType: 'line',
      searchTerm: '',
      progressTotal: 0,
      progressCount: 0,
      watchlist: [],
      showRsSettings: false,
      rsThresholds: { ...DEFAULT_RS_THRESHOLDS }
    }
  },
  computed: {
    symbolsList() { return this.symbols.split(/\s|,|\n/).map(s=>s.trim()).filter(Boolean) },
    filteredResults() {
      let res = this.results
      // apply tab filters
      if (this.activeTab === 'sniper') res = res.filter(r=>r.sniper && r.sniper.signals && r.sniper.signals.some(s=>s===1))
      if (this.activeTab === 'failed') res = res.filter(r=>r.error)
      // apply filter panel criteria
      res = res.filter(r => {
        if (!r.rsInfo) return true
        if (r.rsInfo.rsStrength < this.filters.rsMin) return false
        if (r.rsInfo.changePct < this.filters.minChange) return false
        if (this.filters.minVol && (r.rsInfo.volume || 0) < this.filters.minVol * 10000) return false
        return true
      })
      // apply search
      if (this.searchTerm && this.searchTerm.trim()) {
        const q = this.searchTerm.trim().toLowerCase()
        res = res.filter(r => r.symbol.toLowerCase().includes(q) || (r.name && r.name.toLowerCase().includes(q)))
      }
      return res
    },
    badges() { return { sniper: this.results.filter(r=>r.sniper && r.sniper.signals && r.sniper.signals.some(s=>s===1)).length, failed: this.results.filter(r=>r.error).length } },
    selected() { return this.results[this.selectedIndex] }
    ,
    chartSeries() {
      if (this.selected && this.selected.rsInfo && this.selected.rsInfo.price) return [this.selected.rsInfo.price]
      return this.results.slice(0, 20).map((r, i) => (r.rsInfo?.price || (100 + i)))
    },
    successCount() { return this.results.filter(r => !r.error).length },
    progressPercent() { return this.progressTotal ? Math.round((this.progressCount / this.progressTotal) * 100) : 0 }

  },
  mounted() {
    document.body.classList.add('alpha-pro')
    this.loadWatchlist()
  },
  unmounted() {
    document.body.classList.remove('alpha-pro')
  },
  methods: {
    onImport(text) {
      this.symbols = text;
      const list = text.split(/\s|,|\n/).map(s => s.trim()).filter(Boolean)
      this.progressTotal = list.length
      this.progressCount = 0
      alert(`已导入股票池 (${this.progressTotal} 条)`);
    },
    async onExport() {
      // export current filtered results as CSV; return csv string for testability
      const rows = []
      const headers = ['symbol','name','price','rsStrength','changePct']
      rows.push(headers.join(','))
      for (const r of this.filteredResults) {
        const s = r.symbol || ''
        const name = (r.name || '').replace(/,/g, '')
        const price = r.rsInfo?.price != null ? r.rsInfo.price : ''
        const rs = r.rsInfo?.rsStrength != null ? r.rsInfo.rsStrength : ''
        const cp = r.rsInfo?.changePct != null ? r.rsInfo.changePct : ''
        rows.push([s, name, price, rs, cp].join(','))
      }
      const csv = rows.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const date = new Date().toISOString().split('T')[0]
      a.download = `alpha_export_${date}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      return csv
    },
    runScan() {
      const syms = [...new Set(this.symbols.split(/\s|,|\n/).map(s => s.trim()).filter(Boolean))];
      this.results = syms.map(s => ({ symbol: s, rsInfo: { rsStrength: 100, price: 0, changePct: 0 } }))
      this.progressTotal = syms.length
      this.progressCount = 0
      // schedule async scans
      syms.forEach(async (s, i) => {
        try {
          const r = await scanSymbol(s)
          this.results.splice(i, 1, { symbol: s, rsInfo: r.rsInfo, sniper: r.sniper })
        } catch (e) {
          this.results.splice(i, 1, { symbol: s, error: e.message })
        } finally {
          this.progressCount = Math.min(this.progressTotal, this.progressCount + 1)
        }
      })
    }
    ,
    onTaskResult(result) {
      const idx = this.results.findIndex(r=>r.symbol===result.symbol)
      if (idx>=0) this.results.splice(idx,1,{ symbol: result.symbol, rsInfo: result.rsInfo, sniper: result.sniper })
    },
    onTaskFailed(task) {
      const idx = this.results.findIndex(r=>r.symbol===task.symbol)
      if (idx>=0) this.results.splice(idx,1,{ symbol: task.symbol, error: 'failed after retries' })
    },
    selectResult(item) {
      // item comes from click event; set selectedIndex
      const idx = this.results.findIndex(r=>r.symbol===item.symbol)
      if (idx>=0) this.selectedIndex = idx
    }
    ,
    onToggleStar(symbol) {
      const i = this.watchlist.indexOf(symbol)
      if (i>=0) this.watchlist.splice(i,1)
      else this.watchlist.push(symbol)
      this.saveWatchlist()
    },
    saveWatchlist() {
      try {
        localStorage.setItem('ah_watchlist', JSON.stringify(this.watchlist))
      } catch (e) {
        // ignore storage errors
        console.warn('Failed to save watchlist', e)
      }
    },
    loadWatchlist() {
      try {
        const v = localStorage.getItem('ah_watchlist')
        if (v) this.watchlist = JSON.parse(v)
      } catch (e) {
        console.warn('Failed to load watchlist', e)
      }
    },
    onFilterApply(filters) {
      this.filters = { ...filters }
    },
    onSniperSelect(item) { const idx = this.results.findIndex(r=>r.symbol===item.symbol); if (idx>=0) this.selectedIndex = idx }
  }
  
}
</script>

<style scoped>
.layout { display:flex; gap:12px; }
.left { width:320px }
.right { flex:1 }
button { padding:8px 10px; border-radius:6px; border:1px solid #e2e8f0; background:white; cursor:pointer }

.ap-header .muted{margin-left:8px;color:var(--text-sub);font-size:13px}
.ap-header .stat{font-weight:700;color:var(--accent-blue)}
.input-dark{background:transparent;border:1px solid var(--border-color);padding:6px 8px;color:var(--text-main);border-radius:6px}

</style>
