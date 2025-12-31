<template>
  <div class="holo-resonance">
    <div class="ap-header card" style="display:flex;justify-content:space-between;align-items:center;padding:10px;margin-bottom:8px">
      <div class="title">
        <strong>HoloResonance</strong>
        <span class="font-muted">V9.0 · 分组增强</span>
      </div>
      <div class="controls" style="display:flex;align-items:center;gap:8px">
        <input type="text" class="input-dark" v-model="inputSymbols" placeholder="输入代码 (逗号分隔)" />
        <button class="btn btn-blue" @click="runScanner(false)" :disabled="loading">扫描</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" @click="toggleTheme">{{ isDark ? '日间' : '夜间' }}</button>
          <button class="btn btn-purple" @click="openComparisonWindow">📊 对比</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn-ghost" @click="exportData">导出</button>
          <button class="btn-ghost" @click="$refs.fileInput.click()">导入</button>
          <input type="file" ref="fileInput" @change="importData" style="display:none" accept=".json" />
        </div>
      </div>
    </div>

    <div class="layout" style="display:flex;gap:12px;align-items:stretch">
      <div style="width:320px;display:flex;flex-direction:column;gap:8px">
        <div class="card" style="padding:8px;">
          <div style="display:flex;gap:8px;align-items:center">
            <input class="input-dark" v-model="inputSymbols" placeholder="输入代码 (逗号分隔)" />
            <button class="primary" @click="runScanner(false)" :disabled="loading">{{ loading ? progress : '扫描' }}</button>
          </div>
        </div>

        <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;flex:1">
          <div style="padding:8px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:8px">
            <div style="font-weight:700">股票池</div>
            <div style="flex:1"></div>
            <input class="input-dark" v-model="listFilter" placeholder="筛选列表" style="width:120px" />
          </div>

          <div class="periods" style="display:flex;gap:6px;padding:8px;border-bottom:1px solid var(--border-color);background:var(--bg-root)">
            <button @click="activeGroup='ALL'" :class="['group-tab', activeGroup==='ALL'?'active':'']">全部</button>
            <button @click="activeGroup='US'" :class="['group-tab', activeGroup==='US'?'active':'']">美股</button>
            <button @click="activeGroup='HK'" :class="['group-tab', activeGroup==='HK'?'active':'']">港股</button>
            <button @click="activeGroup='CN'" :class="['group-tab', activeGroup==='CN'?'active':'']">A股</button>
          </div>

          <div style="flex:1;overflow:auto;padding:8px">
            <ScanResults :items="scanResultsFiltered" :selectedSymbol="currentStock?.symbol" :watchlist="watchlist" @select="selectStock" @toggle-star="toggleWatchlist" />
          </div>
        </div>
      </div>

      <div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:0">
        <div class="card" style="padding:8px;min-height:320px;display:flex;flex-direction:column">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div><strong>{{ currentStock?.symbol || '--' }}</strong> <span class="font-muted">{{ currentStock?.name || '' }}</span></div>
            <div style="display:flex;gap:8px;align-items:center">
              <span v-if="currentStock">价格: <strong>{{ currentStock.price.toFixed(2) }}</strong></span>
              <span v-if="currentStock">RS: <strong>{{ Math.round(currentStock.rsInfo?.rsStrength||0) }}</strong></span>
            </div>
          </div>

          <div style="flex:1;display:flex;gap:8px;margin-top:8px;min-height:200px">
            <ChartPanel :series="chartSeries" :options="chartOptions" />
            <div style="width:280px;display:flex;flex-direction:column;gap:8px">
              <div class="card" style="padding:8px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div style="font-weight:700">系统日志</div>
                  <div class="font-muted" v-if="currentStock">策略: {{ currentStock.action || '—' }}</div>
                </div>
                <div style="margin-top:8px;font-size:13px;color:var(--text-secondary);min-height:80px">
                  <div v-if="currentStock">{{ currentStock.description || '策略日志在此显示' }}</div>
                  <div v-else>请选择一只股票以查看详情</div>
                </div>
              </div>

              <div class="card" style="padding:8px;flex:1;overflow:auto">
                <div style="font-weight:700;margin-bottom:6px">新闻</div>
                <div v-if="newsLoading" class="font-muted">正在加载…</div>
                <div v-else-if="newsList.length===0" class="font-muted">暂无新闻</div>
                <div v-else>
                  <a v-for="(n,i) in newsList" :key="i" :href="n.link" target="_blank" class="news-link">
                    <div class="news-title">{{ n.title }}</div>
                    <div class="news-meta">{{ n.time }}</div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="padding:8px;display:flex;gap:8px;align-items:flex-start">
          <div style="flex:1">
            <div style="font-weight:700;margin-bottom:6px">资产/模拟交易</div>
            <div style="display:flex;gap:8px;align-items:center">
              <input v-model.number="trade.entry" type="number" class="input-dark" placeholder="成本" style="width:120px" />
              <input v-model.number="trade.qty" type="number" class="input-dark" placeholder="股数" style="width:120px" />
              <button class="btn btn-blue" @click="addToPortfolio">加入持仓</button>
            </div>
          </div>

          <div style="width:280px">
            <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:6px">持仓</div>
            <div style="max-height:160px;overflow:auto">
              <div v-if="portfolio.length===0" class="font-muted">暂无持仓</div>
              <div v-else>
                <div v-for="(p,idx) in portfolio" :key="idx" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color)">
                  <div><strong>{{ p.symbol }}</strong><div class="font-muted" style="font-size:11px">{{ p.name }}</div></div>
                  <div style="text-align:right">{{ p.plPercent }}%<div style="font-size:12px">{{ p.marketVal }}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import ScanResults from '@/components/AlphaHunter/ScanResults.vue'
import ChartPanel from '@/components/AlphaHunter/ChartPanel.vue'
import { scanSymbol } from '@/utils/marketService'
import MarketDataAdapter from '@/utils/MarketDataAdapter'

export default {
  name: 'HoloResonance',
  components: { ScanResults, ChartPanel },
  data() {
    return {
      inputSymbols: '',
      listFilter: '',
      activeGroup: 'ALL',
      stocks: [
        { symbol: 'AAPL', name: 'Apple Inc.', price: 175.12, rsInfo: { rsStrength: 120, price: 175.12, changePct: 1.2 }, sniper: true },
        { symbol: 'NVDA', name: 'NVIDIA', price: 420.33, rsInfo: { rsStrength: 150, price: 420.33, changePct: 2.5 }, sniper: false },
        { symbol: 'MSFT', name: 'Microsoft', price: 340.45, rsInfo: { rsStrength: 95, price: 340.45, changePct: -0.6 }, sniper: false }
      ],
      currentStock: null,
      loading: false,
      progress: '',
      chartSeries: [],
      chartOptions: {},
      newsList: [],
      newsLoading: false,
      watchlist: [],
      portfolio: [],
      trade: { entry: 0, qty: 100 },
      isDark: true
    }
  },
  computed: {
    scanResultsFiltered() {
      let res = this.stocks
      if (this.activeGroup === 'US') res = res.filter(s => !s.symbol.includes('.HK') && !s.symbol.includes('.SS') && !s.symbol.includes('.SZ'))
      if (this.activeGroup === 'HK') res = res.filter(s => s.symbol.includes('.HK'))
      if (this.activeGroup === 'CN') res = res.filter(s => s.symbol.includes('.SS') || s.symbol.includes('.SZ'))
      if (this.listFilter) { const q = this.listFilter.toLowerCase(); res = res.filter(r => r.symbol.toLowerCase().includes(q) || (r.name && r.name.toLowerCase().includes(q))) }
      return res
    }
  },
  mounted() {
    // load persisted state
    try { const w = localStorage.getItem('holo_watchlist'); if (w) this.watchlist = JSON.parse(w) } catch (e) {}
    try { const p = localStorage.getItem('holo_portfolio'); if (p) this.portfolio = JSON.parse(p) } catch (e) {}
  },
  methods: {
    async runScanner(keepSelection = false) {
      const raw = (this.inputSymbols || '').split(',').map(s => s.trim()).filter(Boolean)
      if (raw.length === 0) return
      this.loading = true; this.progress = '0/' + raw.length
      this.stocks = raw.map(s => ({ symbol: s, name: '', loading: true }))
      for (let i = 0; i < raw.length; i++) {
        const sym = raw[i]
        try {
          const r = await scanSymbol(sym)
          const stock = { symbol: r.symbol || sym, name: '', price: r.rsInfo?.price || 0, change: r.rsInfo?.changePct || 0, rsInfo: r.rsInfo, sniper: r.sniper }
          this.$set(this.stocks, i, stock)
        } catch (e) {
          this.$set(this.stocks, i, { symbol: sym, error: e.message })
        } finally {
          this.progress = `${i+1}/${raw.length}`
        }
      }
      this.loading = false
      if (!keepSelection && this.stocks.length > 0) this.selectStock(this.stocks[0])
      this.inputSymbols = ''
    },
    async selectStock(stock) {
      if (!stock || !stock.symbol) return
      this.currentStock = stock
      // fetch full history for chart
      try {
        const adapter = new MarketDataAdapter()
        const data = await adapter.fetchData(stock.symbol, '1d')
        const prices = data.map(d => d.close)
        this.chartSeries = prices.slice(-120)
        // attach data for some indicator display
        this.currentStock.data = data
      } catch (e) {
        this.chartSeries = []
      }
      // fetch news
      this.fetchNews(stock.symbol)
    },
    toggleWatchlist(symbol) {
      const i = this.watchlist.indexOf(symbol)
      if (i >= 0) this.watchlist.splice(i, 1)
      else this.watchlist.push(symbol)
      try { localStorage.setItem('holo_watchlist', JSON.stringify(this.watchlist)) } catch (e) {}
    },
    isWatchlisted(symbol) { return this.watchlist.includes(symbol) },
    loadWatchlist() { if (this.watchlist && this.watchlist.length>0) { this.inputSymbols = this.watchlist.join(','); this.runScanner(false) } },
    loadList(type) { const STOCK_LISTS = { SPY: 'NVDA,AAPL,MSFT,AMZN,GOOGL,TSLA', HSI: '0700.HK,9988.HK,3690.HK', CSI: '600519.SS,300750.SZ,601318.SS' }; if (STOCK_LISTS[type]) { this.inputSymbols = STOCK_LISTS[type]; this.runScanner(false) } },
    exportData() {
      const data = { watchlist: this.watchlist, portfolio: this.portfolio }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `holo_backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    },
    importData(e) { const file = e.target.files && e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { try { const data = JSON.parse(ev.target.result); if (data.watchlist) { this.watchlist = data.watchlist; localStorage.setItem('holo_watchlist', JSON.stringify(this.watchlist)) } if (data.portfolio) { this.portfolio = data.portfolio; localStorage.setItem('holo_portfolio', JSON.stringify(this.portfolio)) } alert('导入成功'); } catch (err) { alert('文件格式错误') } }; reader.readAsText(file); e.target.value = '' },
    async fetchNews(symbol) {
      this.newsList = []; this.newsLoading = true
      try {
        // try a lightweight fetch using marketService's adapter proxy isn't exposed; keep it simple: use Yahoo RSS via proxy used earlier
        const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US`
        const proxy = 'https://corsproxy.io/?' + encodeURIComponent(rssUrl)
        const res = await fetch(proxy); const json = await res.json(); const parser = new DOMParser(); const xml = parser.parseFromString(json.contents, 'text/xml'); const items = xml.querySelectorAll('item'); const news = []; items.forEach((it,i)=>{ if(i<6) news.push({ title: it.querySelector('title')?.textContent || '', link: it.querySelector('link')?.textContent || '', time: it.querySelector('pubDate') ? new Date(it.querySelector('pubDate').textContent).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '' }) }); this.newsList = news
      } catch (e) { console.warn('news err', e) } finally { this.newsLoading = false }
    },
    addToPortfolio() {
      if (!this.currentStock || !this.trade.entry || !this.trade.qty) return
      const p = { symbol: this.currentStock.symbol, name: this.currentStock.name, qty: this.trade.qty, avgCost: this.trade.entry, price: this.currentStock.price, marketVal: (this.currentStock.price * this.trade.qty).toFixed(2), plPercent: (((this.currentStock.price - this.trade.entry)/this.trade.entry)*100).toFixed(2) }
      const idx = this.portfolio.findIndex(x=>x.symbol===p.symbol); if (idx>=0) this.portfolio[idx] = p; else this.portfolio.push(p)
      try { localStorage.setItem('holo_portfolio', JSON.stringify(this.portfolio)) } catch(e){}
    },
    toggleTheme() { this.isDark = !this.isDark }
  }
}
</script>

<style scoped>
.layout{display:flex}
.card{background:var(--bg-panel);border:1px solid var(--border-color);border-radius:6px}
.primary{background:var(--accent-blue);color:#fff;padding:6px 8px;border-radius:6px}
.input-dark{background:transparent;border:1px solid var(--border-color);padding:6px 8px;color:var(--text-primary);border-radius:6px}
.font-muted{color:var(--text-secondary);font-size:13px}
.group-tab{flex:1;text-align:center;font-size:12px;padding:6px 6px;cursor:pointer;color:var(--text-secondary);border-bottom:2px solid transparent}
.group-tab.active{color:var(--accent-blue);border-bottom-color:var(--accent-blue);font-weight:700}
.news-link{display:block;padding:6px 0;border-bottom:1px solid var(--border-color);text-decoration:none}
.news-title{font-size:12px;color:var(--text-primary)}
</style>
