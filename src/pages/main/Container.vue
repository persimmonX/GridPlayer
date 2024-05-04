<script setup lang="ts">
import { GridStack, GridStackEngine, GridStackNode, GridStackMoveOpts } from "gridstack";
import { onMounted, createApp, watch, ref, Ref } from "vue";
import Box from "@/components/Box.vue";
import { useStore, commonPinia } from "@/store";
import throttle from "throttleit";
import mitter from "@/store/bus";
class CustomEngine extends GridStackEngine {
  public override moveNode(node: GridStackNode, o: GridStackMoveOpts): boolean {
    //超出屏幕不移动
    return startDrag ? false : super.moveNode(node, o);
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
let startDrag = false;
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
  if (layoutDirection.value == "horizontal") {
    let index = all.length - 1;
    all[index].w = row * column - count + 1;
  } else {
    //倒数第二行最后一位
    let index = column * (row - spaceCount) - 1;
    if (all[index]) {
      all[index].h = spaceCount + 1;
    }
  }

  grid.load(all);
  // //'list' | 'compact' | 'moveScale' | 'move' | 'scale' | 'none' |
  grid.column(column, "compact");
  grid.compact();
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
    nested: true,
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
function isPointInsideElement(el, point) {
  // 确保el是一个DOM元素
  if (!(el instanceof Element)) {
    return false;
  }

  // 获取元素的边界框
  var rect = el.getBoundingClientRect();

  // 检查坐标是否在边界框内
  // 注意：getBoundingClientRect() 返回的坐标是相对于视口的，而不是相对于文档的
  // 所以如果页面有滚动，你可能需要加上滚动的偏移量
  // 这里我们假设没有滚动，或者你已经处理了滚动偏移
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}
onMounted(() => {
  winWidth = document.body.clientWidth;
  winHeight = document.body.clientHeight;
  grid = GridStack.init({
    margin: "0px",
    float: false,
    cellHeight: winHeight,
    animate: true,
    column: 1,
    sizeToContent: false,
    acceptWidgets: true,
    // disableDrag: true,
    disableResize: true,
    resizable: {
      handles: "e,s,w,n",
    },
  });
  grid.on("dragstart", function (_event, _items) {
    // 处理拖动停止后的逻辑，例如更新数据库中的位置信息
    startDrag = true;
  });
  grid.on("dragstop", function (_event, dragDom) {
    // 处理拖动停止后的逻辑，例如更新数据库中的位置信息
    startDrag = false;
    let { clientX, clientY } = _event;
    let items = grid.getGridItems();
    let inDom = items.filter(item => {
      return isPointInsideElement(item, { x: clientX, y: clientY });
    })[0];
    if (inDom && dragDom) {
      let { x: tx, y: ty, w: tw, h: th } = inDom.gridstackNode;
      let { x: fx, y: fy, w: fw, h: fh } = _event.target.gridstackNode;
      if (tx == fx && ty == fy && tw == fw && th == fh) return;

      grid.update(inDom.gridstackNode.el, {
        x: fx,
        y: fy,
        w: fw,
        h: fh,
      });
      grid.update(dragDom, {
        x: tx,
        y: ty,
        w: tw,
        h: th,
      });
      grid.batchUpdate();
      grid.commit();
      layoutFill();
    }
  });
  grid.on("resizestart", (e, t) => {
    startDrag = true;
    console.log("resize", e, t);
  });
  grid.on("resizestop", (e, t) => {
    startDrag = false;
    console.log("resizestop", e, t);
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
    mitter.emit("setAllMute", true);
  });
  window.ipcRenderer.on("setAllReleaseMute", _event => {
    //全部解除静音
    mitter.emit("setAllMute", false);
    store.$state.allMuted = false;
  });
  window.ipcRenderer.on("setAllPause", _event => {
    //全部暂停
    store.$state.allPause = true;
    mitter.emit("setAllPause", true);
  });
  window.ipcRenderer.on("setAllStart", _event => {
    //全部播放
    store.$state.allPause = false;
    mitter.emit("setAllStart", true);
  });
});
window.ipcRenderer.on("layout-flex", (_event, direction: any) => {
  layoutDirection.value = direction;
  throttleLayout();
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
.grid-stack {
  height: 100% !important;
  overflow: hidden !important;
}
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
