<template>
  <div class="alpha-pro">
    <h1>AlphaSniper Pro — 模块化预览</h1>
    <div class="layout">
      <div class="left">
        <SymbolInput v-model="symbols" />
        <FileImportExport @import="onImport" @export="onExport" />
        <div style="margin-top:8px">
          <button @click="runScan">🚀 扫描</button>
        </div>
      </div>
      <div class="right">
        <ScanResults :items="results" />
        <ChartPanel />
      </div>
    </div>
  </div>
</template>

<script>
import SymbolInput from '../components/AlphaHunter/SymbolInput.vue'
import ScanResults from '../components/AlphaHunter/ScanResults.vue'
import ChartPanel from '../components/AlphaHunter/ChartPanel.vue'
import FileImportExport from '../components/AlphaHunter/FileImportExport.vue'
import { calculateRS_Standard } from '../utils/alphaAlgo'

export default {
  name: 'AlphaHunterPro',
  components: { SymbolInput, ScanResults, ChartPanel, FileImportExport },
  data() {
    return { symbols: '', results: [] }
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
      this.results = syms.map(s => ({ symbol: s, rsInfo: { rsStrength: 100, price: 0, changePct: 0 } }));
      // demonstrate algorithm usage on synthetic data
      const stock = { dates: ['2020-01-01','2020-01-02'], close: [100, 110] };
      const benchMap = { '2020-01-01': 200, '2020-01-02': 220 };
      const rs = calculateRS_Standard(stock, benchMap);
      if (this.results[0]) this.results[0].rsInfo = rs;
    }
  }
}
</script>

<style scoped>
.layout { display:flex; gap:12px; }
.left { width:320px }
.right { flex:1 }
button { padding:8px 10px; border-radius:6px; border:1px solid #e2e8f0; background:white; cursor:pointer }
</style>
