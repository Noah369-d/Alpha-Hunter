<template>
  <div class="alpha-pro">
    <div class="ap-header card">
      <div class="ap-h-left">
        <span class="trophy">🏆</span>
        <strong>AlphaSniper</strong>
        <span class="muted"> 导入导出进度: <span class="stat">0/0</span> 成功: <span class="stat">0</span></span>
      </div>
      <div class="ap-h-right">
        <div class="progress-wrap">
          <div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>
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
          <ScanResults :items="filteredResults" @select="selectResult" />
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
            <!-- placeholder traffic light content -->
            <div class="traffic-placeholder">--</div>
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
import { calculateRS_Standard } from '../utils/alphaAlgo'
import { scanSymbol } from '../utils/marketService'

export default {
  name: 'AlphaHunterPro',
  components: { SymbolInput, ScanResults, ChartPanel, FileImportExport, FilterTabs, TaskQueue, ChartLegend, FilterPanel, SniperPool },
  data() {
    return { symbols: '', results: [], activeTab: 'all', selectedIndex: 0, filters: { rsMin: 0, minChange: -999, minVol: 0 }, chartType: 'line' }
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
      return res
    },
    badges() { return { sniper: this.results.filter(r=>r.sniper && r.sniper.signals && r.sniper.signals.some(s=>s===1)).length, failed: this.results.filter(r=>r.error).length } },
    selected() { return this.results[this.selectedIndex] }
    ,
    chartSeries() {
      if (this.selected && this.selected.rsInfo && this.selected.rsInfo.price) return [this.selected.rsInfo.price]
      return this.results.slice(0, 20).map((r, i) => (r.rsInfo?.price || (100 + i)))
    }
  },
  mounted() {
    document.body.classList.add('alpha-pro')
  },
  unmounted() {
    document.body.classList.remove('alpha-pro')
  },
  methods: {
    onImport(text) {
      this.symbols = text;
      alert('已导入股票池');
    },
    onExport() {
      alert('导出示例 - 稍后实现');
    },
    runScan() {
      const syms = [...new Set(this.symbols.split(/\s|,|\n/).map(s => s.trim()).filter(Boolean))];
      this.results = syms.map(s => ({ symbol: s, rsInfo: { rsStrength: 100, price: 0, changePct: 0 } }))
      // schedule async scans
      syms.forEach(async (s, i) => {
        try {
          const r = await scanSymbol(s)
          this.results.splice(i, 1, { symbol: s, rsInfo: r.rsInfo, sniper: r.sniper })
        } catch (e) {
          this.results.splice(i, 1, { symbol: s, error: e.message })
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
</style>
