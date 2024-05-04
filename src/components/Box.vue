<script setup lang="ts">
import { inject, onMounted, ref, watch } from "vue";
import { useStore } from "../store";
import Player from "xgplayer";
import HlsJsPlugin from "xgplayer-hls.js";
import FlvJsPlugin from "xgplayer-flv.js";
import mitter from "@/store/bus";
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
let scale = 1;
let moveXPercent = 0;
let moveYPercent = 0;
const disapear = () => {
  if (!isMove) {
    setTimeout(() => {
      active.value = false;
      select.value = false;
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
    select.value = true;
    store.$state.currentWidget = id;
    disapear();
    isMove = true;
  };
  box.value.onmouseleave = () => {
    active.value = false;
    select.value = false;
  };
  if (url?.endsWith(".m3u8")) {
    plugins.push(HlsJsPlugin);
  } else if (url?.endsWith(".flv")) {
    plugins.push(FlvJsPlugin);
  }
  player = new Player({
    el: playerDom.value,
    url: url,
    autoplay: !store.allPause,
    autoplayMuted: store.allMuted,
    lang: "zh-cn",
    width: "100%",
    height: "100%",
    mode: "cors",
    loading: false,
    loop: true,
    closeVideoClick: true,
    plugins: plugins,
    // fitVideoSize: "fixWidth",
    videoFillMode: "cover",
    cssFullscreen: false,
    commonStyle: {
      playedColor: "green",
      sliderBtnStyle: {
        height: "20px",
      },
    },
    isLive: false,
    // plugins: [Mp4Plugin],
  });
  window.ipcRenderer.on("scale-add", () => {
    if (store.$state.currentWidget == id) {
      let vDom = playerDom.value?.querySelector("video");
      if (vDom) {
        scale += 0.5;
        if (scale > 5) {
          scale = 5;
        }
        let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
        if (Math.abs(moveXPercent) > maxPercent) {
          moveXPercent = moveXPercent <= 0 ? maxPercent : -maxPercent;
        }

        if (Math.abs(moveYPercent) > maxPercent) {
          moveYPercent = moveYPercent <= 0 ? maxPercent : -maxPercent;
        }
        vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}px) translateY(${moveYPercent}%)`;
      }
    }
  });
  window.ipcRenderer.on("scale-reduce", () => {
    if (store.$state.currentWidget == id) {
      let vDom = playerDom.value?.querySelector("video");
      if (vDom) {
        scale -= 0.5;
        if (scale < 1) scale = 1;
        let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
        if (Math.abs(moveXPercent) > maxPercent) {
          moveXPercent = moveXPercent <= 0 ? maxPercent : -maxPercent;
        }

        if (Math.abs(moveYPercent) > maxPercent) {
          moveYPercent = moveYPercent <= 0 ? maxPercent : -maxPercent;
        }
        vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}px) translateY(${moveYPercent}%)`;
      }
    }
  });
  window.ipcRenderer.on("move-up", () => {
    if (store.$state.currentWidget == id) {
      let vDom = playerDom.value?.querySelector("video");
      if (vDom) {
        let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
        moveYPercent++;
        if (moveYPercent > maxPercent) {
          moveYPercent = maxPercent;
        }
        vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}%) translateY(${moveYPercent}%)`;
      }
    }
  });
  window.ipcRenderer.on("move-down", () => {
    if (store.$state.currentWidget == id) {
      let vDom = playerDom.value?.querySelector("video");
      if (vDom) {
        let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
        moveYPercent--;
        if (moveYPercent < -maxPercent) {
          moveYPercent = -maxPercent;
        }
        vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}%) translateY(${moveYPercent}%)`;
      }
    }
  });

  window.ipcRenderer.on("move-left", () => {
    if (store.$state.currentWidget == id) {
      let vDom = playerDom.value?.querySelector("video");
      if (vDom) {
        let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
        moveXPercent++;
        if (moveXPercent > maxPercent) {
          moveXPercent = maxPercent;
        }
        vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}%) translateY(${moveYPercent}%)`;
      }
    }
  });
  window.ipcRenderer.on("move-right", () => {
    if (store.$state.currentWidget == id) {
      let vDom = playerDom.value?.querySelector("video");
      if (vDom) {
        let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
        moveXPercent--;
        if (moveXPercent < -maxPercent) {
          moveXPercent = -maxPercent;
        }
        vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}%) translateY(${moveYPercent}%)`;
      }
    }
  });
  window.ipcRenderer.on("full-screen", () => {
    if (store.$state.currentWidget == id) {
      try {
        if (player?.cssfullscreen) {
          player.exitCssFullscreen();
        } else {
          player?.getCssFullscreen();
        }
      } catch (e) {
        console.log("full screen error", e);
      }
    }
  });
});
mitter.on("setAllMute", (value: boolean) => {
  if (player) {
    player.muted = value;
  }
});
mitter.on("setAllStart", (value: boolean) => {
  if (player && value) {
    player.play();
  }
});
mitter.on("setAllPause", (value: boolean) => {
  if (player && value) {
    player.pause();
  }
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
  },
  {
    immediate: true,
  }
);
watch(
  () => store.$state.allPause,
  (value: boolean) => {
    if (player) {
      value ? player.pause() : player.play();
    }
  },
  {
    immediate: true,
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
  color: rgb(219, 215, 215);
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
