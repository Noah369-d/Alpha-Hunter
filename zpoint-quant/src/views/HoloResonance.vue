<template>
  <div class="holo-root">
    <div class="topbar flex items-center justify-between mb-2">
      <div class="flex items-center gap-4">
        <h1 class="title">HoloResonance <span class="sub">V10.0</span></h1>
        <div class="periods">
          <button class="btn btn-ghost">15m</button>
          <button class="btn btn-ghost">1h</button>
          <button class="btn btn-ghost">1d</button>
        </div>
      </div>
      <div class="controls">
        <input type="text" class="input-dark" placeholder="代码 (如: 700)" />
        <button class="btn btn-blue">扫描</button>
      </div>
    </div>

    <div class="layout flex gap-2">
      <div class="left w-80">
        <div class="card list">
          <div class="stock-grid-header">
            <div>研判</div><div>代码/名称</div><div class="text-right">现价</div><div>趋势</div><div>信号</div>
          </div>
          <div class="overflow-y-auto rows">
            <div class="stock-grid-row" v-for="s in demoStocks" :key="s.symbol">
              <div class="w-10">★</div>
              <div class="w-18 font-bold">{{ s.symbol }}</div>
              <div class="text-right w-14">{{ s.price }}</div>
              <div class="w-14">S</div>
              <div class="flex-1 text-right">-</div>
            </div>
          </div>
        </div>
      </div>

      <div class="center flex-1 flex flex-col">
        <div class="card chart flex-1 p-1">
          <div id="tv-chart-container" class="w-full h-full">(chart)</div>
        </div>

        <div class="card h-52 mt-2 p-2 bottom-area flex gap-2">
          <div class="flex-1">Logs / SOP / News (placeholder)</div>
          <div class="w-48">SOP</div>
          <div class="w-72">Assets</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const demoStocks = ref([
  { symbol: 'AAPL', price: '193.45' },
  { symbol: 'NVDA', price: '450.12' },
  { symbol: 'TSLA', price: '210.35' }
])
</script>

<style src="../styles/holo-resonance.css" scoped></style>
