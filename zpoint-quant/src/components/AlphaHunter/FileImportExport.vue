<template>
  <div class="file-import">
    <input type="file" ref="file" @change="onFile" style="display:none" accept=".txt,.csv" />
    <div class="actions">
      <button @click="$refs.file.click()">导入</button>
      <button @click="$emit('export')">导出</button>
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
button { padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0; background: white; cursor:pointer }
</style>
