<script setup lang="ts">
import { watch } from "vue";
const props = defineProps({
  config: { type: Object, default: {}, required: true },
});
watch(
  () => props.config.attr.setStartTime,
  () => {
    if (!props.config.attr.setStartTime) {
      props.config.attr.startTime = 0;
    }
  },
  {
    immediate: true,
  }
);
</script>
<template>
  <div class="items">
    <div class="item"><input type="checkbox" id="autoplay" name="play" v-model="props.config.attr.autoplay" /><label for="autoplay">自动播放</label></div>
    <div class="item"><input type="checkbox" id="loop" name="play" v-model="props.config.attr.loop" /><label for="loop">循环播放</label></div>
    <div class="item"><input type="checkbox" id="start-mute" name="play" v-model="props.config.attr.startMute" /><label for="start-mute">开始播放时静音</label></div>
    <div class="item">
      <input type="checkbox" id="set-start-time" name="play" v-model="props.config.attr.setStartTime" /><label for="set-start-time">设置播放开始时间</label>
      <input type="number" :disabled="!props.config.attr.setStartTime" max="99999" maxlength="4" min="0" id="start-time" v-model="props.config.attr.startTime" /> <span class="unit">(秒)</span>
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import url("./form.scss");
</style>
