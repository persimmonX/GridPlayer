<script setup lang="ts">
const props = defineProps({
  config: { type: Object, default: {}, required: true },
});
</script>
<template>
  <div class="items">
    <div class="item">
      <label for="layout">窗口布局</label>
      <select id="layout" v-model="props.config.attr.layout">
        <option value="horizontal">横向填充</option>
        <option value="vertical">纵向填充</option>
        <option value="freeStyle">自由布局</option>
      </select>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import url("./form.scss");
</style>
