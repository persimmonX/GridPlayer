<script setup lang="ts">
import { GridStack, GridStackEngine, GridStackNode, GridStackMoveOpts } from "gridstack";
import { onMounted, createApp, watch, ref, nextTick, Ref } from "vue";
import Box from "@/components/Box.vue";
import { useStore, commonPinia } from "@/store";
import throttle from "throttleit";
class CustomEngine extends GridStackEngine {
  public override moveNode(node: GridStackNode, o: GridStackMoveOpts): boolean {
    //超出屏幕不移动
    return super.moveNode(node, o);
  }
  // public override moveNodeCheck(node: GridStackNode, o: GridStackMoveOpts): boolean {
  //   //超出屏幕不移动
  //   return super.moveNodeCheck(node, o);
  // }
}

const store = useStore();
const empty = ref(true);
const ids = {};
GridStack.registerEngine(CustomEngine);
let grid: any = null;
let currentWidgetId: any = ref("");
let winHeight = 1080;
let winWidth = 1920;
let layoutDirection: Ref<"horizontal" | "vertical"> = ref("vertical");
function createUnique(id: string) {
  //ids
  let newId = id;
  if (ids[id]) {
    newId = id + ids[id].length;
    ids[id].push(newId);
  } else {
    ids[id] = [id];
  }
  return newId;
}
const throttleLayout = throttle(layoutFill, 100);
function layoutFill() {
  const items = grid.getGridItems();
  const count = items.length;
  const column = Math.ceil(Math.sqrt(count));
  const row = Math.ceil(count / column);
  let all = grid.save(false);
  const spaceCount = row * column - count;
  all.forEach((item: any) => {
    item.w = 1;
    item.h = 1;
  });
  grid.cellHeight(winHeight / row);
  grid.load(all);
  // //'list' | 'compact' | 'moveScale' | 'move' | 'scale' | 'none' |
  grid.column(column, "compact");
  grid.compact();
  nextTick(() => {
    if (spaceCount) {
      all = grid.save(false);
      if (layoutDirection.value == "horizontal") {
        let index = all.length - 1;
        all[index].w = row * column - count + 1;
      } else {
        //倒数第二行最后一位
        let index = column * (row - spaceCount) - 1;
        all[index].h = spaceCount + 1;
      }
    }
    grid.load(all);
    // //'list' | 'compact' | 'moveScale' | 'move' | 'scale' | 'none' |
    grid.column(column, "compact");
    grid.compact();
  });
  isEmpty();
}

const addWidget = (_event: any, options: any) => {
  const { id, name, url } = options;
  //检查id是否已存在
  let uniqueId = createUnique(id);
  let el = grid.addWidget({
    id: uniqueId,
    w: 1,
    autoPosition: false,
    locked: false,
    content: "",
    resizable: {
      handles: "e,s,w,n",
    },
  });
  createApp(Box).use(commonPinia).provide("id", id).provide("url", url).provide("name", name).mount(el.querySelector(".grid-stack-item-content"));
  throttleLayout();
};
const removeWidget = () => {
  if (currentWidgetId.value) {
    //删除到当前grid;
    let widget = grid.getGridItems().filter((item: any) => {
      let id = item.getAttribute("gs-id");
      return id == currentWidgetId.value;
    })[0];
    if (!widget) return;
    grid.removeWidget(widget);
    throttleLayout();
  }
};
const isEmpty = () => {
  empty.value = grid.getGridItems().length <= 0;
};
onMounted(() => {
  winWidth = document.body.clientWidth;
  winHeight = document.body.clientHeight;
  grid = GridStack.init({
    margin: "0px",
    float: false,
    cellHeight: winHeight,
    animate: false,
    column: 1,
    sizeToContent: false,
    disableDrag: true,
    disableResize: true,
    // resizable: {
    //   handles: "e,s,w,n",
    // },
  });
  window.ipcRenderer.on("addWidget", addWidget);
  window.ipcRenderer.on("removeWidget", removeWidget);
  window.addEventListener("resize", () => {
    //重新计算cellHeight
    winWidth = document.body.clientWidth;
    winHeight = document.body.clientHeight;
    throttleLayout();
  });
  window.ipcRenderer.on("getAllWidgetCount", _event => {
    let count = grid.getGridItems().length;
    window.ipcRenderer.send("get-widget-count", count);
  });
  window.ipcRenderer.on("setAllMute", _event => {
    //全部静音
    store.$state.allMuted = true;
  });
  window.ipcRenderer.on("setAllReleaseMute", _event => {
    //全部解除静音
    store.$state.allMuted = false;
  });
  window.ipcRenderer.on("setAllPause", _event => {
    //全部暂停
    store.$state.allPause = true;
  });
  window.ipcRenderer.on("setAllStart", _event => {
    //全部播放
    store.$state.allPause = false;
  });
  window.ipcRenderer.on("layout-flex", (_event, direction: any) => {
    layoutDirection.value = direction;
    throttleLayout();
  });
});

watch(
  () => store.$state.currentWidget,
  value => {
    currentWidgetId.value = value;
  }
);
const dragOver = event => {
  event.preventDefault();
};

const drop = event => {
  event.preventDefault();
  const files = event.dataTransfer.files;
  const list = Array.from(files).map((file: any) => file.path);
  window.ipcRenderer.invoke("dropList", list);
};
</script>

<template>
  <div class="grid-stack" @dragover="dragOver($event)" @drop="drop($event)">
    <div v-if="empty" class="empty">Ctrl+A或右键添加文件</div>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
:deep(.grid-stack-item-content) {
  background: palegreen;
}
.empty {
  width: 100%;
  height: 100%;
  line-height: 100vh;
  text-align: center;
  font-size: 36px;
  color: #999;
  user-select: none;
}
</style>
