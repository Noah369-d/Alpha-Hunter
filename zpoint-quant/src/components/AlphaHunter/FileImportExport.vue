<template>
  <div class="file-import">
    <input type="file" ref="file" @change="onFile" style="display:none" accept=".txt,.csv" />
    <div class="actions">
      <button class="import" @click="$refs.file.click()">📁 导入股票池</button>
      <button class="csv" @click="$emit('export')">导出CSV</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileImportExport',
  methods: {
    onFile(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => this.$emit('import', ev.target.result);
      reader.readAsText(file);
      e.target.value = '';
    }
  }
}
</script>

<style scoped>
.actions { display:flex; gap:8px; }
button { padding:6px 10px; border-radius:8px; border:1px solid var(--ap-border); background: white; cursor:pointer }
button.import { background:#fff; color:var(--ap-accent); font-weight:600 }
button.csv { background:#fff; color:var(--ap-muted) }
</style>
