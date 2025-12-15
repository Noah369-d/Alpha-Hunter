<template>
  <div class="symbol-input">
    <label class="label">股票池</label>
    <textarea v-model="value" rows="4" placeholder="每行一个代码，例如：AAPL\n0700.HK"></textarea>
  </div>
</template>

<script>
export default {
  name: 'SymbolInput',
  props: {
    modelValue: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  computed: {
    value: {
      get() { return this.modelValue },
      set(v) { this.$emit('update:modelValue', v) }
    }
  }
}
</script>

<style scoped>
textarea { width: 100%; font-family: monospace; padding: 8px; box-sizing: border-box; }
.label { font-size: 12px; color: #64748b; font-weight: 700; }
</style>
