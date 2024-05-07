<script lang="ts" setup>
import VideoConfig from "./configs/VideoConfig.vue";
import PlayConfig from "./configs/PlayConfig.vue";
import { reactive, markRaw, ref, toRaw } from "vue";
import _ from "lodash";
const select = ref("play");
function cloneObjectWithoutKey(obj, keyToExclude) {
  const clonedObj = {};
  for (let key in obj) {
    if (key !== keyToExclude && obj.hasOwnProperty(key)) {
      clonedObj[key] = typeof obj[key] === "object" && obj[key] !== null ? cloneObjectWithoutKey(obj[key], keyToExclude) : obj[key];
    }
  }
  return clonedObj;
}
const init = {
  list: [
    {
      type: "normal",
      title: "常规",
      sub: [
        {
          type: "play",
          title: "播放器",
          component: markRaw(PlayConfig),
          attr: {
            layout: "vertical", //"horizontal" | "vertical" | "freeStyle"
          },
        },
      ],
    },
    {
      type: "default",
      title: "默认",
      sub: [
        {
          type: "video",
          title: "视频",
          component: markRaw(VideoConfig),
          attr: {
            startMute: true,
            autoplay: true,
            loop: true,
            setStartTime: true,
            startTime: 0,
          },
        },
      ],
    },
  ],
};
const configs = reactive(init);
window.ipcRenderer.getStoreValue("configs").then(res => {
  if (res) {
    //重新设置数据
    _.merge(configs, res);
  }
});
const saveConfig = () => {
  //转为普通对象
  let confirm = window.confirm("是否确认提交本次修改");
  if (confirm) {
    const configsObj = cloneObjectWithoutKey(toRaw(configs), "component");
    window.ipcRenderer.setStoreValue("configs", configsObj);
    window.ipcRenderer.send("close-config-popup");
  }
};
const cancel = () => {
  window.ipcRenderer.send("close-config-popup");
};
</script>
<template>
  <div class="config">
    <div class="container">
      <div class="tabs">
        <template v-for="c in configs.list" :key="c.type">
          <div class="level-1">{{ c.title }}</div>
          <template v-for="s in c.sub" :key="s.type">
            <div class="level-2" :class="{ active: s.type == select }" @click="select = s.type">{{ s.title }}</div>
          </template>
        </template>
      </div>

      <template v-for="c in configs.list" :key="c.type">
        <template v-for="item in c.sub" :key="item.type">
          <div class="tab-view" v-if="select == item.type">
            <component :is="item.component" :config="item"></component>
          </div>
        </template>
      </template>
    </div>
    <div class="btns">
      <div><button>打开日志</button></div>
      <div><button @click="saveConfig">OK</button> <button @click="cancel">Cancel</button></div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.config {
  width: 100%;
  height: 100%;
  display: flex;
  background-color: #f6f6f6;
  flex-direction: column;
  padding: 10px;
  box-sizing: border-box;
  color: black;
  font-size: 12px;
  .container {
    width: 100%;
    flex: 1;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    .tabs {
      width: 240px;
      height: 100%;
      background-color: white;
      padding: 10px;
      box-sizing: border-box;
      user-select: none;
      .level-1 {
        font-weight: 600;
        font-size: 16px;
      }
      .level-2 {
        font-size: 14px;
        padding: 5px;
      }
      .level-2:hover {
        background-color: #f6f6f6;
      }
      .level-2.active {
        background-color: #f6f6f6;
      }
    }
    .tab-view {
      flex: 1;
      height: 100%;
      padding: 0px 10px;
      box-sizing: border-box;
    }
  }
  .btns {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    button {
      min-width: 80px;
      height: 30px;
    }
  }
}
</style>
