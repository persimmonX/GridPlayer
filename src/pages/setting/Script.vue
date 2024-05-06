<script setup lang="ts">
import { onMounted, ref } from "vue";
import Ace from "ace-code";
import dracula from "ace-code/src/theme/dracula";
import mode from "ace-code/src/mode/javascript.js";
const editorDom = ref();
const resultDom = ref();
const resultValue = ref([]);
let editor: null | Ace.Ace.Editor = null;
onMounted(() => {
  editor = Ace.edit(editorDom.value);
  editor.getSession().setMode(new mode.Mode()); // 设置模式（例如，JavaScript）
  editor.setTheme(dracula);

  editor.setShowPrintMargin(false);
  editor.setValue(`/**
 * 执行脚本
 * @returns path[] | Promise
 */
function main() {
  //return new Promise(resolve=>{})
  return [];
}`); // 设置初始值

  window.ipcRenderer.on("history-script", (_e, script: string) => {
    editor?.setValue(script);
  });
});

const openInput = () => {
  let text = editor?.getValue();
  let promise = window.ipcRenderer.invoke("confirm-script", text);
  if (promise) {
    promise
      .then(result => {
        resultValue.value = result;
      })
      .catch(e => {
        console.log(e);
      });
  }
};
const confirmLink = () => {
  if (resultValue.value && resultValue.value.length > 0) {
    //校验视频地址
    let urls = resultValue.value.map(item => item);
    window.ipcRenderer.send("play-script", urls);
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
</script>

<template>
  <div class="box" novalidate>
    <div class="input-box">
      <div class="isOpen" ref="editorDom"></div>
      <div class="result" ref="resultDom">执行结果：{{ resultValue }}</div>
    </div>
    <div class="other">
      <p class="info">支持Javascript(右键查看记录)</p>
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
    .result {
      flex: 1;
      height: 100%;
      background-color: #44475a;
      color: white;
      padding: 10px;
      font-size: 12px;
      box-sizing: border-box;
      overflow: auto;
      border-left: 1px solid #282a36;
    }
    .isOpen {
      height: 100%;
      width: 100%;
      flex: 3;
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
        button:nth-child(1) {
          margin-right: 15px;
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
