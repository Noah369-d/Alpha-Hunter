<template>
  <div class="scan-results">
    <div v-if="items.length===0" class="empty">请点击 "导入股票池" 或手动输入，然后点击 🚀 全量扫描</div>
    <table v-else class="scan-table">
      <thead>
        <tr>
          <th>#</th>
          <th>代码</th>
          <th>价格</th>
          <th>RS强度</th>
          <th>涨幅</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(it, idx) in items" :key="it.symbol" @click="$emit('select', it)" style="cursor:pointer">
          <td>{{ idx+1 }}</td>
          <td>
            <strong>{{ it.symbol }}</strong>
            <span v-if="it.sniper" class="sniper-badge">狙击</span>
            <div v-if="it.error" style="color:#ef4444; font-size:12px">失败</div>
          </td>
          <td>{{ it.rsInfo?.price ?? '--' }}</td>
          <td>{{ it.rsInfo?.rsStrength ? it.rsInfo.rsStrength.toFixed(2) : '--' }}</td>
          <td>{{ it.rsInfo?.changePct ? it.rsInfo.changePct.toFixed(2) + '%' : '--' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'ScanResults',
  props: { items: { type: Array, default: () => [] } }
}
</script>

<style scoped>
.empty { color: var(--ap-muted); padding: 28px; text-align: center; }
.scan-table { width:100%; border-collapse:collapse; font-size:13px }
.scan-table th, .scan-table td { padding:8px 10px; border-bottom:1px solid #f1f5f9; text-align:left }
.scan-table tr:hover { background: rgba(59,130,246,0.04); transform: translateY(-1px); }
.sniper-badge { background: linear-gradient(90deg,#fff7ed,#fff1c2); border:1px solid #f59e0b; color:#92400e; padding:4px 10px; border-radius:12px; font-size:12px }
</style>
