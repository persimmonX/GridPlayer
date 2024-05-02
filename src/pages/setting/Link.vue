<script setup lang="ts">
import { ref } from "vue";
const isOpen = ref(false);
const links = ref("");
const openInput = () => {
  isOpen.value = !isOpen.value;
  isOpen.value ? window.ipcRenderer.send("open-input-large") : window.ipcRenderer.send("open-input-small");
};
const confirmLink = () => {
  const lines = links.value.split("\n");
  const urls = lines.map(line => line.trim()).filter(item => Boolean(item));
  window.ipcRenderer.send("confirm-link", urls);
};
const cancelLink = () => {
  window.ipcRenderer.send("cancel-link");
};
</script>

<template>
  <div class="box" novalidate>
    <div class="input-box">
      <textarea v-model="links" spellcheck="false" name="links" id="link" cols="30" :rows="isOpen ? 9 : 1" :class="{ isOpen }"></textarea>
    </div>
    <div class="other">
      <p>支持的URL:http,https,mp4,flv,m3u8</p>
      <div class="btns">
        <div class="left-btns">
          <button @click="openInput">
            <span v-if="!isOpen">+</span>
            <span v-else>-</span>
          </button>
        </div>
        <div class="right-btns">
          <button class="" @click="confirmLink">确定</button>
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
    textarea {
      width: 100%;
      resize: none;
    }
    textarea.isOpen {
      height: 100%;
    }
  }
  .other {
    height: max-content;
    width: 100%;
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
    }
  }
}
</style>
