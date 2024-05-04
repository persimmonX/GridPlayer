<script setup lang="ts">
import { inject, onMounted, ref, watch } from "vue";
import { useStore } from "../store";
import Player from "xgplayer";
import HlsJsPlugin from "xgplayer-hls.js";
import FlvJsPlugin from "xgplayer-flv.js";
const id: string | undefined = inject("id");
const url: string | undefined = inject("url");
const name: string | undefined = inject("name");
const store = useStore();
const box = ref();
const active = ref(false);
const select = ref(false);
const playerDom = ref();
let isMove = false;
let plugins: any = [];
const disapear = () => {
  if (!isMove) {
    setTimeout(() => {
      active.value = false;
      isMove = false;
    }, 3000);
  }
};
const selectThis = () => {
  select.value = !select.value;
  store.$state.currentWidget = id;
};
let player: null | Player = null;
onMounted(() => {
  box.value.onmousemove = () => {
    //激活5
    active.value = true;

    store.$state.currentWidget = id;
    disapear();
    isMove = true;
  };
  box.value.onmouseleave = () => {
    active.value = false;
  };
  if (url?.endsWith(".m3u8")) {
    plugins.push(HlsJsPlugin);
  } else if (url?.endsWith(".flv")) {
    plugins.push(FlvJsPlugin);
  }
  player = new Player({
    el: playerDom.value,
    url: url,
    autoplay: true,
    autoplayMuted: true,
    lang: "zh-cn",
    width: "100%",
    height: "100%",
    mode: "cors",
    loading: false,
    loop: true,
    plugins: plugins,
    // fitVideoSize: "fixWidth",
    videoFillMode: "cover",
    commonStyle: {
      playedColor: "green",
      sliderBtnStyle: {
        height: "20px",
      },
    },
    isLive: false,
    // plugins: [Mp4Plugin],
  });
});
watch(
  () => store.$state.currentWidget,
  value => {
    if (value != id) {
      select.value = false;
    }
  }
);
watch(
  () => store.$state.allMuted,
  (value: boolean) => {
    if (player) {
      player.muted = value;
    }
  }
);
watch(
  () => store.$state.allPause,
  (value: boolean) => {
    if (player) {
      value ? player.pause() : player.play();
    }
  }
);
</script>
<template>
  <div class="box" @click="selectThis" ref="box">
    <div class="" ref="playerDom"></div>
    <div v-if="select || active" class="activeBox">
      <div class="title">{{ name }}</div>
    </div>
  </div>
</template>
<style scoped>
.box {
  background-color: white;
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  text-align: center;
  line-height: 100%;
  position: relative;
}
.activeBox {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 5px solid rgba(173, 170, 170, 0.5);
  z-index: 1000;
  pointer-events: none;
}
.title {
  max-width: calc(100% - 50px);
  padding: 0 20px;
  min-height: 24px;
  font-size: 12px;
  line-height: 24px;
  text-align: center;
  background-color: rgba(173, 170, 170, 0.5);
  position: absolute;
  top: 5px;
  left: 0px;
  right: 0px;
  margin: auto;
}
</style>
