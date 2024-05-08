<script setup lang="ts">
import { GridStack, GridStackEngine, GridStackNode, GridStackMoveOpts, GridStackWidget } from "gridstack";
import { onMounted, watch, ref, Ref, onBeforeUnmount, nextTick } from "vue";
import Box from "@/components/Box.vue";
import { useStore } from "@/store";
import throttle from "throttleit";
import mitter from "@/store/bus";
import _ from "lodash";
class CustomEngine extends GridStackEngine {
  public override moveNode(node: GridStackNode, o: GridStackMoveOpts): boolean {
    //超出屏幕不移动 设置maxRow
    if (layout.value == "freeStyle") {
      this.maxRow = 12;
      return super.moveNode(node, o);
    } else {
      this.maxRow = 0;
    }
    return startDrag ? false : super.moveNode(node, o);
  }
}
const store = useStore();
const backgroundUse = ref(false);
const originList: { id: string; originPath: string }[] = [];

GridStack.registerEngine(CustomEngine);
let grid: GridStack | null = null;
let currentWidgetId: any = ref("");
const gridStackDom = ref();
const emptyDom = ref();
const widgets: Ref<Array<any>> = ref([]);
let startDrag = false;
let layout: Ref<"horizontal" | "vertical" | "freeStyle"> = ref("vertical");

const throttleLayout = throttle(layoutFill, 100);
function layoutFill() {
  if (grid) {
    const count = widgets.value.length;
    const column = Math.ceil(Math.sqrt(count));
    let row = Math.ceil(count / column);
    const spaceCount = row * column - count;
    const winHeight = window.document.body.clientHeight;
    let all = <GridStackWidget[]>grid.save(false);
    if (layout.value == "horizontal") {
      let start = 0;
      for (let i = 0; i < row; i++) {
        for (let j = 0; j < column; j++) {
          if (all[start]) {
            all[start].y = i;
            all[start].x = j;
            all[start].h = 1;
            if (spaceCount && i == row - 1 && j == column - spaceCount - 1) {
              all[start].w = spaceCount + 1;
            } else {
              all[start].w = 1;
            }
            start++;
          }
        }
      }

      grid.float(false);
      grid.cellHeight(winHeight / row);
      grid.load(all);
      grid.column(column, "compact");
      grid.enableResize(false);
      grid.compact();
    } else if (layout.value == "freeStyle") {
      //自由布局
      let initColumn = 12;
      let tw = Math.floor(initColumn / column);
      let cellHeight = winHeight / initColumn;
      all.forEach((item: any) => {
        item.w = tw;
        item.h = Math.floor(initColumn / row);
      });
      //重新计算行高
      grid.float(true);
      grid.cellHeight(cellHeight);
      grid.column(initColumn);
      grid.load(all);
      grid.enableResize(true);
      grid.compact();
    } else {
      //倒数第二行最后一位
      let start = 0;
      for (let i = 0; i < row; i++) {
        for (let j = 0; j < column; j++) {
          if (all[start]) {
            all[start].y = i;
            all[start].x = j;
            all[start].w = 1;
            //倒数
            if (spaceCount && i == row - spaceCount - 1 && j == column - 1) {
              all[start].h = spaceCount + 1;
            } else {
              all[start].h = 1;
            }
            start++;
          }
        }
      }
      grid.float(false);
      grid.cellHeight(winHeight / row);
      grid.load(all, true);
      grid.column(column, "compact");
      grid.enableResize(false);
      grid.compact();
    }
  }
}

const addWidget = (
  _event: any,
  option: {
    id: string;
    name: string;
    url: string;
    mimeType: string;
    fileType?: string;
    originPath: string;
    gridStackOption?: { x: number; y: number; h: number; w: number };
    xgOption?: { currentTime: number };
    layout?: "horizontal" | "vertical" | "freeStyle";
  }
) => {
  const { id, name, url, originPath, gridStackOption, xgOption, layout: layoutStyle, mimeType, fileType } = option;
  //检查id是否已存在
  if (layoutStyle) {
    layout.value = layoutStyle;
  }
  originList.push({
    id: id,
    originPath: originPath,
  });
  let node = {
    id: id,
    w: 1,
    h: gridStackOption?.h,
    x: gridStackOption?.x || 0,
    y: gridStackOption?.y || 0,
    name,
    url,
    originPath,
    xgOption,
    mimeType,
    fileType,
    content: "",
  };
  widgets.value.push(node);
  nextTick(() => {
    grid?.makeWidget(node.id);
    throttleLayout();
    nextTick(() => {
      throttleLayout();
    });
  });
};
const addWidgets = (
  _event: any,
  options: Array<{
    id: string;
    name: string;
    url: string;
    originPath: string;
    gridStackOption?: { x: number; y: number; h: number; w: number };
    xgOption?: { currentTime: number };
    layout?: "horizontal" | "vertical" | "freeStyle";
  }>
) => {
  for (let option of options) {
    const { id, name, url, originPath, gridStackOption, xgOption, layout: layoutStyle } = option;
    //检查id是否已存在
    if (layoutStyle) {
      layout.value = layoutStyle;
    }
    originList.push({
      id: id,
      originPath: originPath,
    });
    let node = {
      id: id,
      w: gridStackOption?.w || 0,
      h: gridStackOption?.h || 0,
      x: gridStackOption?.x || 0,
      y: gridStackOption?.y || 0,
      name,
      url,
      originPath,
      xgOption,
      content: "",
    };
    widgets.value.push(node);
  }

  nextTick(() => {
    for (let option of options) {
      if (option.layout) {
        layout.value = option.layout;
      }
      grid?.makeWidget(option.id);
    }
    //设置cell
    const count = widgets.value.length;
    const column = Math.ceil(Math.sqrt(count));
    let row = Math.ceil(count / column);
    const winHeight = window.document.body.clientHeight;
    const winWidth = window.document.body.clientWidth;
    if (layout.value == "horizontal") {
      grid?.float(false);
      grid?.cellHeight(winHeight / row);
      grid?.column(column, "compact");
      grid?.enableResize(false);
      grid?.compact();
    } else if (layout.value == "freeStyle") {
      let initColumn = 12;
      let cellHeight = (winWidth / initColumn) * (winHeight / winWidth);
      //重新计算行高
      grid?.float(true);
      grid?.cellHeight(cellHeight);
      grid?.column(initColumn);
      grid?.enableResize(true);
    } else {
      grid?.float(false);
      grid?.cellHeight(winHeight / row);
      grid?.column(column, "compact");
      grid?.enableResize(false);
      grid?.compact();
    }
  });
};
const removeWidget = () => {
  if (currentWidgetId.value) {
    //删除到当前grid;
    let index = _.findIndex(widgets.value, { id: currentWidgetId.value });
    if (index > -1) {
      grid?.removeWidget(`#${currentWidgetId.value}`, true);
      widgets.value.splice(index, 1);
      nextTick(() => {
        if (layout.value != "freeStyle") {
          throttleLayout();
        }
      });
    }
  }
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
  let winHeight = document.body.clientHeight;
  layout.value = _.deepFind(store.$state.configs.list, "layout", layout.value);
  let background = _.deepFind(store.$state.configs.list, "background", {});
  if (background.use && background.url) {
    backgroundUse.value = true;
    emptyDom.value.style.backgroundImage = `url(${background.url})`;
    emptyDom.value.style.backgroundSize = background.size;
    emptyDom.value.style.backgroundRepeat = background.repeat;
  }
  grid = GridStack.init({
    margin: "0px",
    cellHeight: winHeight,
    animate: true,
    column: 1,
    float: true,
    sizeToContent: false,
    disableResize: true,
    disableDrag: false,
    resizable: {
      handles: "e,s,w,ns,n,se,sw,ne,nw",
    },
  });

  grid.on("dragstart", function (_event, _items) {
    // 处理拖动停止后的逻辑，例如更新数据库中的位置信息
    startDrag = true;
  });
  grid.on("dragstop", (_event: Event, dragDom) => {
    // 处理拖动停止后的逻辑，例如更新数据库中的位置信息
    startDrag = false;
    //@ts-ignore
    let { clientX, clientY } = _event;
    let items = grid?.getGridItems();
    let inDom = items?.filter(item => {
      return isPointInsideElement(item, { x: clientX, y: clientY });
    })[0];
    if (inDom && dragDom) {
      //@ts-ignore
      let { x: tx, y: ty, w: tw, h: th } = inDom.gridstackNode;
      //@ts-ignore
      let { x: fx, y: fy, w: fw, h: fh } = _event.target.gridstackNode;
      if (tx == fx && ty == fy && tw == fw && th == fh) return;
      //@ts-ignore
      grid?.update(inDom.gridstackNode.el, {
        x: fx,
        y: fy,
        w: fw,
        h: fh,
      });
      grid?.update(dragDom, {
        x: tx,
        y: ty,
        w: tw,
        h: th,
      });
      grid?.batchUpdate();
      grid?.commit();
      layoutFill();
    }
  });
  grid.on("resizestart", () => {
    startDrag = true;
  });
  grid.on("resizestop", () => {
    startDrag = false;
  });

  window.ipcRenderer.on("addWidget", addWidget);
  window.ipcRenderer.on("addWidgets", addWidgets);
  window.ipcRenderer.on("removeWidget", removeWidget);
  window.addEventListener("resize", () => {
    //重新计算cellHeight
    throttleLayout();
  });
  window.ipcRenderer.on("getAllWidgetCount", _event => {
    let count = grid?.getGridItems().length;
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
  window.ipcRenderer.on("layout-flex", (_event, direction: any) => {
    layout.value = direction;
    throttleLayout();
  });
  window.ipcRenderer.on("select-next", _event => {
    //根据store获取当前的widget
    let all = <[]>grid?.save(false);
    const index = _.findIndex(all, o => {
      return o.id === currentWidgetId.value;
    });
    if (_.isNumber(index)) {
      let next = index + 1;
      if (all) {
        next = next >= all?.length ? 0 : next;
        if (all[next]) {
          store.$state.currentWidget = all[next]["id"];
          mitter.emit("duration-active", all[next]["id"]);
        }
      }
    }
  });

  window.ipcRenderer.on("scale-add", () => {
    mitter.emit("scale-add");
  });
  window.ipcRenderer.on("scale-reduce", () => {
    mitter.emit("scale-reduce");
  });
  window.ipcRenderer.on("move-up", () => {
    mitter.emit("move-up");
  });
  window.ipcRenderer.on("move-down", () => {
    mitter.emit("move-down");
  });

  window.ipcRenderer.on("move-left", () => {
    mitter.emit("move-left");
  });
  window.ipcRenderer.on("reset-normal", () => {
    mitter.emit("reset-normal");
  });
  window.ipcRenderer.on("move-right", () => {
    mitter.emit("move-right");
  });
  window.ipcRenderer.on("full-screen", () => {
    mitter.emit("full-screen");
  });
  window.ipcRenderer.on("save-play-list", () => {
    let items = grid?.save();
    if (items) {
      //@ts-ignore
      let currentList = items.map(item => {
        let origin = _.find(originList, { id: item.id });
        return {
          id: item.id,
          gridStackOption: { x: item.x, y: item.y, w: item.w, h: item.h },
          originPath: origin.originPath,
        };
      });
      //获取xg视频的播放进度
      mitter.emit("get-xg-option", option => {
        let tmp = _.find(currentList, { id: option.id });
        if (tmp) {
          tmp.xgOption = option;
        }
        let allReady = _.filter(currentList, item => Boolean(item.xgOption)).length == currentList.length;
        //检查所有播放设置都获取到
        if (allReady) {
          window.ipcRenderer.send("render-save-play-list", {
            layout: layout.value,
            widgets: currentList,
          });
        }
      });
    }
  });
  window.ipcRenderer.on("reload-video", () => {
    mitter.emit("reload-video");
  });
  window.ipcRenderer.on("reload-video-all", () => {
    mitter.emit("reload-video-all");
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
onBeforeUnmount(() => {
  mitter.all.clear();
});
</script>

<template>
  <div v-if="widgets.length == 0" class="empty" ref="emptyDom" @dragover="dragOver($event)" @drop="drop($event)">
    <div v-if="!backgroundUse">Ctrl+A/右键添加/拖拽文件</div>
  </div>
  <div v-show="widgets.length > 0" class="grid-stack" @dragover="dragOver($event)" @drop="drop($event)" ref="gridStackDom">
    <div class="grid-stack-item" v-for="w in widgets" :gs-x="w.x" :gs-y="w.y" :gs-w="w.w" :gs-h="w.h" :gs-id="w.id" :id="w.id" :key="w.id">
      <div class="grid-stack-item-content">
        <Box :id="w.id" :name="w.name" :url="w.url" :xg-option="w.xgOption" :mimeType="w.mimeType" :fileType="w.fileType" />
      </div>
    </div>
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
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 36px;
  color: #999;
  user-select: none;
}
</style>
