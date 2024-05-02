<script setup lang="ts">
import { GridStack, GridStackEngine, GridStackNode, GridStackMoveOpts } from "gridstack";
import { onMounted, createApp, watch, ref, nextTick } from "vue";
import Box from "@/components/Box.vue";
import { useStore, commonPinia } from "@/store";
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
function layoutFill() {
  const items = grid.getGridItems();
  const count = items.length;
  const column = Math.ceil(Math.sqrt(count));
  const row = Math.ceil(count / column);
  const all = grid.save(false);
  all.forEach((item: any) => {
    item.w = 1;
  });
  if (all[all.length - 1]) {
    all[all.length - 1].w = row * column - count + 1;
  }
  nextTick(() => {
    grid.load(all);
    grid.cellHeight(winHeight / row);
    //'list' | 'compact' | 'moveScale' | 'move' | 'scale' | 'none' |
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
  layoutFill();
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
    layoutFill();
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
    layoutFill();
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
