<script lang="ts" setup>
import { ref, onMounted } from "vue";
import Ace from "ace-code";
import dracula from "ace-code/src/theme/dracula";
import javascriptMode from "ace-code/src/mode/javascript.js";
import jsonMode from "ace-code/src/mode/json";
import textMode from "ace-code/src/mode/text";
const props = defineProps({
  fileExtension: {
    type: String,
    required: false,
  },
  url: {
    type: String,
    default: "",
    required: false,
  },
  filePath: {
    type: String,
    default: "",
    required: false,
  },
});
const editorDom = ref();
let editor: null | Ace.Ace.Editor = null;

onMounted(() => {
  if (!props.url) return;
  editor = Ace.edit(editorDom.value);
  editor.setTheme(dracula);
  editor.setShowPrintMargin(false);
  let fileExtension = props.fileExtension;
  if (!fileExtension) {
    const regex = /\.([^.]+)$/;
    const matches = props.url.match(regex);
    if (matches) {
      fileExtension = matches[1];
    }
  }
  //可编辑的文本
  fetch(props.url)
    .then(res => {
      return res.text();
    })
    .then(async result => {
      if (!result) return;
      if (fileExtension == "js") {
        editor?.getSession().setMode(new javascriptMode.Mode());
      } else if (fileExtension == "json") {
        editor?.getSession().setMode(new jsonMode.Mode());
      } else {
        editor?.getSession().setMode(new textMode.Mode());
      }
      if (fileExtension) {
        window.ipcRenderer
          .invoke("parse-text", result, fileExtension)
          .then(res => {
            editor?.setValue(res);
          })
          .catch(() => {
            editor?.setValue(result);
          });
      }
    });
});
</script>
<template>
  <div class="editor-box" ref="editorDom"></div>
</template>
<style scoped lang="scss">
.editor-box {
  width: 100%;
  height: 100%;
}
</style>
