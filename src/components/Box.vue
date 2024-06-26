<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount } from "vue";
import { useStore } from "../store";
import Player from "xgplayer";
// import HlsJsPlugin from "xgplayer-hls.js";
import HlsJsPlugin, { EVENT } from "xgplayer-hls";
// import FlvJsPlugin from "xgplayer-flv.js";
import FlvJsPlugin from "xgplayer-flv";
import mitter from "@/store/bus";
import debounce from "debounce";
import AceEditor from "./AceEditor.vue";
import _ from "lodash";
import WatchDog from "./WatchDog";

const props = defineProps({
  id: {
    type: String,
    required: true,
    default: "",
  },
  url: {
    type: String,
    required: true,
    default: "",
  },
  fileType: {
    type: String,
    required: false,
    default: "",
  },
  mimeType: {
    type: String,
    required: true,
    default: "",
  },
  name: {
    type: String,
    required: true,
    default: "",
  },
  xgOption: {
    type: Object,
    required: true,
    default: {},
  },
});

const { id, url, name, xgOption, mimeType } = props;
const store = useStore();
const box = ref();
const active = ref(false);
const select = ref(false);
const playerDom = ref();
const imageDom = ref();
const downloadPercentage = ref(0);
let scale = 1;
let moveXPercent = 0;
let moveYPercent = 0;

const disappear = debounce(() => {
  active.value = false;
}, 3000);
const showAndAutoHide = () => {
  active.value = true;
  disappear();
};
const selectThis = () => {
  select.value = !select.value;
  store.$state.currentWidget = id;
};
const cssFullScreen = ref(false);
let player: null | Player = null;
function isVideo(url, mimeType) {
  return url?.endsWith(".m3u8") || url?.endsWith(".flv") || /^video/.test(mimeType);
}
function isText(mimeType: string) {
  const editableTextContentTypes = [
    "text/plain",
    "text/html",
    "text/css",
    "application/xml", // 或者 'text/xml'
    "application/json",
    "text/javascript", // 或者 'application/javascript'
  ];
  return editableTextContentTypes.includes(mimeType);
}
function isImage(mimeType) {
  return /^image/.test(mimeType);
}
onMounted(() => {
  box.value.onmousemove = () => {
    //激活5
    select.value = true;
    showAndAutoHide();
    store.$state.currentWidget = id;
  };
  box.value.onmouseleave = () => {
    active.value = false;
    select.value = false;
  };
  if (isVideo(url, mimeType)) {
    const defaultMute = _.deepFind(store.$state.configs.list, "startMute");
    const loop = _.deepFind(store.$state.configs.list, "loop");
    const autoplay = _.deepFind(store.$state.configs.list, "startMute");
    const startTime = _.deepFind(store.$state.configs.list, "startTime", 0);
    const playerOption: any = {
      el: playerDom.value,
      url: url,
      autoplay: autoplay,
      autoplayMuted: defaultMute,
      lang: "zh-cn",
      width: "100%",
      height: "100%",
      mode: "cors",
      maxJumpDistance: 30,
      startTime: xgOption?.currentTime || startTime,
      loop: loop,
      download: true,
      closeVideoClick: true,
      videoFillMode: "cover",
      cssFullscreen: false,
      commonStyle: {
        playedColor: "green",
        sliderBtnStyle: {
          height: "20px",
        },
      },
      isLive: false,
    };
    let timeout = 10000;
    if (url?.endsWith(".m3u8")) {
      playerOption.plugins = [HlsJsPlugin];
      playerOption.hls = {
        retryCount: 1, // 重试 3 次，默认值
        retryDelay: 3000, // 每次重试间隔 1 秒，默认值
        loadTimeout: 10000, // 请求超时时间为 10 秒，默认值
        fetchOptions: {
          // 该参数会透传给 fetch，默认值为 undefined
          mode: "cors",
        },
      };
    } else if (url?.endsWith(".flv")) {
      playerOption.plugins = [FlvJsPlugin];
    }
    player = new Player(playerOption);
    let dog = new WatchDog(timeout, () => {
      if (player) {
        let time = player?.currentTime;
        player.switchURL(url, true);
        player?.seek(time);
      }
    });
    player.on("core_event", ({ eventName, ...rest }) => {
      if (eventName == EVENT.LOAD_RETRY) {
      }
      if (eventName == EVENT.LOAD_START) dog.feed();
      else if (eventName == EVENT.LOAD_COMPLETE) {
        dog.stop();
      }
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

    mitter.on("reload-video", () => {
      if (store.$state.currentWidget == id) {
        player?.reload();
        const startTime = _.deepFind(store.$state.configs.list, "startTime", 0);
        if (startTime && player) {
          player.currentTime = startTime;
        }
      }
    });
    mitter.on("reload-video-all", () => {
      player?.reload();
      const startTime = _.deepFind(store.$state.configs.list, "startTime", 0);
      if (startTime && player) {
        player.currentTime = startTime;
      }
    });
    mitter.on("all-play-forward", (option: { type: "percent" | "duration"; value: number }) => {
      if (option.type === "percent") {
        let total = player?.duration;
        if (total) {
          let to = Number(total * option.value);
          player?.seek(to);
        }
      } else if (option.type === "duration") {
        player?.seek(option.value);
      }
    });
    mitter.on("save-video-progress", (data: { id: string; progress: { percentage: number } }) => {
      if (data.id === id) {
        downloadPercentage.value = Math.floor(data.progress.percentage);
        active.value = true;
        if (downloadPercentage.value >= 100) {
          disappear();
          downloadPercentage.value = 100;
        }
      }
    });
  } else if (isText(mimeType)) {
  }
});
onBeforeUnmount(() => {
  if (player) {
    player.destroy();
  }
});
function getCurrentDom() {
  if (isVideo(url, mimeType)) {
    return playerDom.value?.querySelector("video");
  } else if (isImage(mimeType)) {
    return imageDom.value?.querySelector("img");
  }
}
mitter.on("scale-add", () => {
  if (store.$state.currentWidget == id) {
    let vDom = getCurrentDom();
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
      showAndAutoHide();
    }
  }
});
mitter.on("scale-reduce", () => {
  if (store.$state.currentWidget == id) {
    let vDom = getCurrentDom();
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
      showAndAutoHide();
    }
  }
});
mitter.on("move-up", () => {
  if (store.$state.currentWidget == id) {
    let vDom = getCurrentDom();
    if (vDom) {
      let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
      moveYPercent++;
      if (moveYPercent > maxPercent) {
        moveYPercent = maxPercent;
      }
      vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}%) translateY(${moveYPercent}%)`;
      showAndAutoHide();
    }
  }
});
mitter.on("move-down", () => {
  if (store.$state.currentWidget == id) {
    let vDom = getCurrentDom();
    if (vDom) {
      let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
      moveYPercent--;
      if (moveYPercent < -maxPercent) {
        moveYPercent = -maxPercent;
      }
      vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}%) translateY(${moveYPercent}%)`;
      showAndAutoHide();
    }
  }
});

mitter.on("move-left", () => {
  if (store.$state.currentWidget == id) {
    let vDom = getCurrentDom();
    if (vDom) {
      let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
      moveXPercent++;
      if (moveXPercent > maxPercent) {
        moveXPercent = maxPercent;
      }
      vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}%) translateY(${moveYPercent}%)`;
      showAndAutoHide();
    }
  }
});
mitter.on("move-right", () => {
  if (store.$state.currentWidget == id) {
    let vDom = getCurrentDom();
    if (vDom) {
      let maxPercent = Math.floor(((scale - 1) / 2 / scale) * 100);
      moveXPercent--;
      if (moveXPercent < -maxPercent) {
        moveXPercent = -maxPercent;
      }
      vDom.style.transform = `scale(${scale}) translateX(${moveXPercent}%) translateY(${moveYPercent}%)`;
      showAndAutoHide();
    }
  }
});
mitter.on("reset-normal", () => {
  if (store.$state.currentWidget == id) {
    let vDom = getCurrentDom();
    if (vDom) {
      scale = 1;
      vDom.style.transform = `scale(${scale}) translateX(0%) translateY(0%)`;
      showAndAutoHide();
    }
  }
});
mitter.on("duration-active", (activeId: string) => {
  if (activeId == id) {
    select.value = true;
    cssFullScreen.value = store.$state.cssFullScreen;
  } else {
    if (cssFullScreen.value) {
      cssFullScreen.value = false;
    }
  }
});
mitter.on("full-screen", () => {
  if (store.$state.currentWidget == id) {
    cssFullScreen.value = !cssFullScreen.value;
    store.$state.cssFullScreen = cssFullScreen.value;
  }
});

mitter.on("get-xg-option", callback => {
  if (isVideo(url, mimeType)) {
    callback({
      id,
      currentTime: player?.currentTime,
    });
  } else {
    callback({
      id,
    });
  }
});

watch(select, value => {
  if (value) {
    showAndAutoHide();
  } else {
    active.value = value;
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
  <div class="box" @click="selectThis" ref="box" :class="{ cssFullScreen }">
    <div v-if="isVideo(url, mimeType)" class="" ref="playerDom"></div>
    <div v-else-if="isImage(mimeType)" class="image-box" ref="imageDom">
      <img :src="url" :alt="name" />
    </div>
    <div class="text-box" v-else-if="isText(mimeType)">
      <AceEditor :url="url" :name="name" :fileType="fileType" :mimeType="mimeType"></AceEditor>
    </div>
    <div class="other-type" v-else>
      <p>不支持的文件类型</p>
      <p>文件名:{{ name }}.{{ fileType }},类型:{{ mimeType }}</p>
    </div>
    <div v-if="active" class="activeBox">
      <div class="title">
        <data class="download-bar" :style="`width:${downloadPercentage}%;background-color:${downloadPercentage == 100 ? 'green' : 'red'}`"></data>
        <div>{{ name }}</div>
      </div>
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
  border: 5px solid rgba(173, 170, 170, 0.6);
  z-index: 1000;
  color: white;
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
  box-sizing: border-box;
  overflow: hidden;
  user-select: all;
  .download-bar {
    position: absolute;
    left: 0;
    top: 0;
    background-color: red;
    opacity: 0.2;
    height: 100%;
  }
}
.image-box {
  width: 100%;
  height: 100%;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.text-box {
  width: 100%;
  height: 100%;
}
.other-type {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  p {
    margin: 5px;
  }
}
.cssFullScreen {
  position: fixed;
  width: 100%;
  /*electron-titlebar会占据30px顶部高度*/
  height: 100%;
  top: 0px;
  left: 0;
  z-index: 3000;
}
</style>
<style>
.cet-titlebar + .cet-container {
  .cssFullScreen {
    height: calc(100% - 30px);
    top: 30px;
  }
}
.cet-titlebar[aria-hidden="true"] + .cet-container {
  .cssFullScreen {
    height: 100%;
    top: 0px;
  }
}
</style>
