<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { GridStack } from "gridstack";
const svgs = ref<Array<{ url: string; hasPNG: boolean; name: string }>>([]);
function getNameFromPath(path: string) {
  let regex = /\\([^\\]+\\)(.+)\.\w+$/;
  let match = path.match(regex);
  if (match) {
    let name = match[2];
    return name;
  }
  return "";
}
let grid: any = null;
const changeToPNG = (item: any) => {
  window.ipcRenderer.invoke("changeToPNG", item.url).then((result: boolean) => {
    item.hasPNG = result;
  });
};
onMounted(() => {
  window.ipcRenderer.invoke("viewSvg").then((result: any[]) => {
    result.forEach((item: string) => {
      if (item.endsWith(".svg")) {
        svgs.value.push({
          url: item,
          name: getNameFromPath(item),
          hasPNG: result.includes(item.replace(".svg", ".png")),
        });
      }
    });
    nextTick(() => {
      grid = GridStack.init({
        margin: 2,
        float: true,
        animate: false,
        // column: 10,
        sizeToContent: false,
        disableDrag: true,
        disableResize: true,
      });
    });
  });
});
</script>
<template>
  <div class="view-box grid-stack">
    <div class="grid-stack-item" :id="item.name" v-for="(item, index) in svgs" :key="index">
      <div class="grid-stack-item-content">
        <div class="icon" :class="{ hasPNG: item.hasPNG }">
          <div class="img-box">
            <img width="20" height="20" :src="item.url" :alt="item.url" />
          </div>
          <div class="btn" v-if="!item.hasPNG"><button @click="changeToPNG(item)">转换为PNG</button></div>
          <div class="name">{{ item.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.view-box {
  width: 100%;
  height: 100% !important;
  overflow: auto;
  display: grid;
  background: white;
  .icon {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #99999956;
    &.hasPNG {
      background-color: rgba(46, 113, 168, 0.637);
    }
    .img-box {
      flex: 3;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn {
      text-align: center;
      button {
        width: fit-content;
      }
    }
    .name {
      flex: 1;
      text-align: center;
      word-break: break-word;
      text-overflow: ellipsis;
    }
  }
  .grid-stack-item-content {
    overflow: hidden;
  }
}
</style>
