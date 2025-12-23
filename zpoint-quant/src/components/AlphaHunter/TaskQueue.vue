<template>
  <div class="task-queue card">
    <div class="header">任务队列 <small v-if="total">（{{ finished }}/{{ total }}）</small></div>


    ,
    <div class="meta" style="margin-top:8px; display:flex; gap:12px; align-items:center">
      <div class="controls">
        <button @click="start" :disabled="state==='running'">开始</button>
        <button @click="pause" :disabled="state!=='running'">暂停</button>
        <button @click="resume" :disabled="state!=='paused'">继续</button>
        <button @click="stop" :disabled="state==='idle' || state==='completed'">停止</button>
      </div>
      <div class="progress-wrap" style="flex:1">
        <div class="progress">
          <div class="progress-inner" :class="{running: state==='running'}" :style="{width: progressPercent + '%'}"></div>
        </div>
        <div class="progress-info">{{ finished }}/{{ total }} • 当前: <strong>{{ currentSymbol || '-' }}</strong> • 成功 {{ successCount }} / 失败 {{ failureCount }} • {{ elapsedDisplay }} <span class="eta" v-if="estimatedRemaining()">• 预计剩余: {{ estimatedRemaining() }}s</span></div>
      </div>
    </div>

    <ul style="margin-top:10px">
      <li v-for="t in tasks" :key="t.symbol" :class="['task-item', t.status]">
        <div style="display:flex; align-items:center; gap:12px; width:100%">
          <div style="flex:1">
            <strong>{{ t.symbol }}</strong>
            <div class="tiny-progress" style="margin-top:6px">
              <div class="tiny-inner" :style="{width: t.progress + '%'}" :class="{running: t.status==='running'}"></div>
            </div>
          </div>
          <div style="min-width:140px; text-align:right">
            <span class="status">{{ t.status }}</span>
            <span v-if="t.retries"> (重试: {{ t.retries }})</span>
            <div style="font-size:12px; color:var(--ap-muted)">耗时: {{ t.durationMs ? (t.durationMs/1000).toFixed(1)+'s' : '-' }}</div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { scanSymbol } from '../../utils/marketService'

export default {
  name: 'TaskQueue',
  props: { symbols: { type: Array, default: () => [] }, maxRetries: { type: Number, default: 3 }, intervalMs: { type: Number, default: 200 } },
  data() { return { tasks: [], state: 'idle', finished: 0, successCount: 0, failureCount: 0, startTime: null, elapsedMs: 0, _timer: null } },
  computed: { total() { return this.tasks.length }, progressPercent() { return this.total ? Math.round((this.finished / this.total) * 100) : 0 }, currentSymbol() { const t = this.tasks.find(x => x.status==='running') || this.tasks.find(x=>x.status==='pending'); return t ? t.symbol : null }, elapsedDisplay() { if (!this.startTime) return '00:00'; const s = Math.floor(this.elapsedMs/1000); const m = Math.floor(s/60); const ss = String(s%60).padStart(2,'0'); return `${m}:${ss}` } },
  methods: {
    reset() { this.tasks = this.symbols.map(s => ({ symbol: s, status: 'pending', retries: 0, progress: 0, durationMs: 0 })); this.finished = 0; this.successCount = 0; this.failureCount = 0; this.startTime = null; this.elapsedMs = 0 },
    _startTimer() { this.startTime = Date.now(); this._timer = setInterval(()=>{ this.elapsedMs = Date.now() - this.startTime }, 250) },
    _stopTimer() { if (this._timer) { clearInterval(this._timer); this._timer = null } },
    async start() {
      if (this.state === 'running') return; this.reset(); this.state = 'running'; this._startTimer(); this.$emit('start')
      for (let t of this.tasks) {
        if (this.state !== 'running') break;
        try {
          await this._runWithRetry(t)
        } catch (e) {
          // final failure
        }
      }
      if (this.state === 'running') this.state = 'completed'
      this._stopTimer();
      this.$emit('done')
    },
    pause() { if (this.state==='running') { this.state='paused'; this._stopTimer(); this.$emit('pause') } },
    resume() { if (this.state==='paused') { this.state='running'; this._startTimer(); this.$emit('resume'); this.start(); } },
    stop() { this.state = 'idle'; this._stopTimer(); this.$emit('stop') },
    async _runWithRetry(task) {
      // track start and simulate progress while waiting for async scan
      let progressInterval = null
      const startProgressSimulation = () => {
        task.progress = 2
        progressInterval = setInterval(() => {
          if (task.status !== 'running') return
          task.progress = Math.min(98, task.progress + Math.floor(Math.random() * 6) + 1)
        }, 200)
      }
      const stopProgressSimulation = () => { if (progressInterval) { clearInterval(progressInterval); progressInterval = null } }

      while (task.retries <= this.maxRetries && this.state === 'running') {
        try {
          task.status = 'running'
          startProgressSimulation()
          const before = Date.now()
          const r = await scanSymbol(task.symbol)
          const took = Date.now() - before
          task.durationMs = took
          // update ETA average
          if (!this._avgMs) this._avgMs = took
          else this._avgMs = Math.round((this._avgMs + took) / 2)
          stopProgressSimulation()
          task.progress = 100
          task.status = 'success'
          task.result = r
          this.finished++
          this.successCount++
          this.$emit('result', r)
          return r
        } catch (e) {
          stopProgressSimulation()
          task.retries++
          task.status = 'retrying'
          if (task.retries > this.maxRetries) { task.status = 'failed'; this.finished++; this.failureCount++; this.$emit('failed', task); throw e }
          await new Promise(res => setTimeout(res, this.intervalMs))
        }
      }
    },
    _updateEta(latestMs) {
      if (!this._avgMs) this._avgMs = latestMs
      else this._avgMs = Math.round((this._avgMs + latestMs) / 2)
    },
    estimatedRemaining() {
      const remaining = this.total - this.finished
      if (!this._avgMs || remaining <= 0) return 0
      return Math.round((this._avgMs * remaining) / 1000) // seconds
    }
  },
  watch: { symbols: { handler(){ this.reset() }, immediate: true } }
}
</script>

<style scoped>
.task-queue .header { font-weight:700 }
button { padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0; background:white; cursor:pointer }
.progress { height:8px; background:#f1f5f9; border-radius:6px; overflow:hidden; border:1px solid rgba(0,0,0,0.04) }
.progress-inner { height:100%; background:linear-gradient(90deg,var(--ap-up),#34d399); transition:width .4s ease }
.progress-inner.running { background: linear-gradient(90deg,#34d399,#10b981); box-shadow: 0 0 8px rgba(16,185,129,0.12); animation: pulseBar 1.8s infinite }

@keyframes pulseBar { 0%{ filter:brightness(.95); transform:translateY(0) } 50%{ filter:brightness(1.05) } 100%{ filter:brightness(.95); transform:translateY(0) } }
.progress-info { font-size:12px; color:var(--ap-muted); margin-top:6px }
.filter-tags { display:flex; gap:6px }
ul { list-style:none; padding:8px 0; margin:0 }
.task-item { padding:8px; border-bottom:1px dashed #eef2f7; display:flex; justify-content:space-between; align-items:center }
.task-item.running { background: rgba(59,130,246,0.04); }
.task-item.success { color:var(--ap-up) }
.task-item.failed { color:var(--ap-down) }
.status { font-size:12px; color:var(--ap-muted) }
.tiny-progress { height:6px; background:#f1f5f9; border-radius:8px; overflow:hidden; margin-top:4px }
.tiny-inner { height:100%; background:linear-gradient(90deg,#60a5fa,#3b82f6); transition:width .2s linear }
.tiny-inner.running { box-shadow:0 0 6px rgba(59,130,246,0.08); animation: flow 1.2s linear infinite }

@keyframes flow { 0%{transform:translateX(0)} 100%{transform:translateX(-6px)} }

.eta { font-size:12px; color:var(--ap-muted); margin-left:12px }
</style>
