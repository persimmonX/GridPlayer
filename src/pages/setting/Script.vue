<script setup lang="ts">
import { onMounted, ref, Ref } from "vue";
import Ace from "ace-code";
import dracula from "ace-code/src/theme/dracula";
import mode from "ace-code/src/mode/javascript.js";
import _ from "lodash";

const editorDom = ref();
const resultDom = ref();
const checking = ref(false);
const resultValue: Ref<
  Array<{
    url: string;
    disabled: boolean;
    checked: boolean;
  }>
> = ref([]);
let editor: null | Ace.Ace.Editor = null;

onMounted(() => {
  editor = Ace.edit(editorDom.value);
  editor.getSession().setMode(new mode.Mode()); // 设置模式（例如，JavaScript）
  editor.setTheme(dracula);
  editor.setShowPrintMargin(false);

  window.ipcRenderer.invoke("get-near-last-script").then(result => {
    if (result) {
      editor?.setValue(result);
    } else {
      editor?.setValue(`/**
 * 执行脚本
 * @returns path[] | Promise
 */
function main() {
  //return new Promise(resolve=>{})
  return [];
}`); // 设置初始值
    }
  });

  window.ipcRenderer.on("history-script", (_e, script: string) => {
    editor?.setValue(script);
  });
  window.ipcRenderer.on("format-script", () => {
    let text = editor?.getValue();
    window.ipcRenderer.invoke("parse-text", text, "typescript").then(res => {
      if (res) {
        editor?.setValue(res);
      }
    });
  });
});

const openInput = () => {
  let text = editor?.getValue();
  let promise = window.ipcRenderer.invoke("confirm-script", text);
  if (promise) {
    promise
      .then(result => {
        resultValue.value = result.map(item => {
          return {
            disabled: false,
            checked: true,
            url: item,
          };
        });
      })
      .catch(e => {
        console.log(e);
      });
  }
};
const confirmLink = () => {
  if (resultValue.value && resultValue.value.length > 0) {
    //校验视频地址
    let text = editor?.getValue();
    let urls = resultValue.value.filter(item => item.checked).map(item => item.url);
    window.ipcRenderer.send("play-script", urls, text);
  }
};
const cancelLink = () => {
  window.ipcRenderer.send("cancel-script");
};
const exportScript = () => {
  let text = editor?.getValue();
  window.ipcRenderer.send("save-script", text);
};
const importScript = () => {
  const promise = window.ipcRenderer.invoke("import-script");
  promise
    .then((result: any) => {
      if (result) {
        editor?.setValue(result);
      }
    })
    .then(e => {
      console.log(e);
    });
};

const checkResult = async () => {
  checking.value = true;
  let urls = resultValue.value.map(item => item.url);
  window.ipcRenderer.invoke("check-urls-disabled", urls).then(urls => {
    console.log("urls", urls);
    checking.value = false;
    let results = urls.map(item => {
      return {
        url: item.url,
        disabled: !item.ok,
        checked: item.ok,
      };
    });
    _.merge(resultValue.value, results);
  });
};
let isMoving = false;
let offsetX = 0;
let positionX = 0;
const dragDom = ref();
const startDrag = _e => {
  _e.preventDefault();
  isMoving = true;
  positionX = _e.clientX;
};
const overDrag = _e => {
  if (isMoving) {
    positionX = _e.clientX;
    offsetX = 0;
    dragDom.value.style.transform = `translateX(${offsetX}px)`;
    dragDom.value.style.left = `${positionX - 20}px`; //padding + 自身宽度/2
    isMoving = false;
  }
};
const moveDrag = _e => {
  if (isMoving) {
    offsetX = _e.clientX - positionX;
    dragDom.value.style.transform = `translateX(${offsetX}px)`;
    editorDom.value.style.width = `${_e.clientX - 20}px`;
  }
};
</script>

<template>
  <div class="box" novalidate @mouseup="overDrag($event)" @mousemove="moveDrag($event)">
    <div class="input-box">
      <div class="isOpen" ref="editorDom"></div>
      <div class="drag" ref="dragDom" @mousedown="startDrag($event)"></div>
      <div class="result" ref="resultDom">
        <div>执行结果：<span v-if="checking">.....checking</span></div>
        <div class="item" v-for="(result, index) in resultValue" :key="index">
          <input type="checkbox" v-model="result.checked" :id="`r-${index}`" :value="result.url" />
          <del v-if="result.disabled">{{ result.url }}</del>
          <label v-else>{{ result.url }}</label>
        </div>
      </div>
    </div>
    <div class="other">
      <p class="info">Javascript脚本(右键查看记录/Ctrl+F格式化)</p>
      <div class="btns">
        <div class="left-btns">
          <button @click="importScript">
            <span>导入脚本</span>
          </button>
          <button @click="openInput">
            <span>执行脚本</span>
          </button>
          <button @click="exportScript">
            <span>保存脚本</span>
          </button>
        </div>
        <div class="right-btns">
          <button class="" @click="checkResult" :disabled="resultValue.length == 0">校验</button>
          <button class="" @click="confirmLink" :disabled="resultValue.length == 0">播放</button>
          <button @click="cancelLink">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.box {
  width: 100%;
  height: 100%;
  padding: 15px;
  display: flex;
  box-sizing: border-box;
  flex-direction: column;
  .input-box {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    position: relative;
    .result {
      width: 35%;
      flex: 1;
      height: 100%;
      background-color: #44475a;
      color: white;
      padding: 10px;
      font-size: 12px;
      box-sizing: border-box;
      overflow: auto;
      border-left: 1px solid #282a36;
      .item {
        display: flex;
        align-items: center;
        justify-self: flex-start;
      }
    }
    .isOpen {
      height: 100%;
      width: 65%;
      overflow: hidden;
    }
    .drag {
      position: absolute;
      width: 10px;
      height: 100%;
      background-color: transparent;
      cursor: col-resize;
      right: calc(35% - 5px);
      z-index: 100;
    }
  }
  .other {
    height: max-content;
    width: 100%;
    .info {
      font-size: 12px;
    }
    .btns {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      button {
        width: 80px;
        height: 24px;
        line-height: 16px;
        font-size: 12px;
        cursor: pointer;
      }
      .right-btns {
        button {
          margin-left: 15px;
        }
      }
      .left-btns {
        button {
          margin-right: 15px;
        }
      }
    }
  }
}
</style>
