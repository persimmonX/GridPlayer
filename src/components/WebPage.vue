<script setup lang="ts">
const props = defineProps({
  fileExtension: {
    type: String,
    required: false,
  },
  url: {
    type: String,
    default: "",
    required: false,
  },
  filePath: {
    type: String,
    default: "",
    required: false,
  },
});
</script>
<template>
  <webview class="web-view" :src="props.url"></webview>
</template>
<style lang="scss" scoped>
.web-view {
  width: 100%;
  height: 100%;
}
</style>
