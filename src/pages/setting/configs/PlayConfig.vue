<script setup lang="ts">
import { ref, onMounted } from "vue";
const props = defineProps({
  config: { type: Object, default: {}, required: true },
});
const changeFile = e => {
  console.log("cha");
  let files = e.target.files;
  if (files && files[0]) {
    const reader = new FileReader();
    reader.readAsDataURL(files[0]);
    reader.onload = e => {
      // e.target.result 是Base64编码的字符串
      props.config.attr.background.url = e.target?.result;
      props.config.attr.background.imageName = files[0].name;
    };
  }
};
const fileDom = ref();
onMounted(() => {
  setTimeout(() => {
    let name = props.config.attr.background.imageName || "image.png";
    if (props.config.attr.background.url) {
      var file = new File([name], name, {
        type: "image/png",
        lastModified: Date.now(),
        //@ts-ignore
        lastModifiedDate: new Date(),
      });
      Object.defineProperty(file, "size", { value: 1024 });
      let newFileList = new DataTransfer();
      newFileList.items.add(new File([], file.name, { type: file.type }));
      fileDom.value.files = newFileList.files;
    }
  }, 200);
});
</script>
<template>
  <div class="items">
    <div class="item">
      <span class="station-label"></span>
      <label for="layout">窗口布局</label>
      <select id="layout" v-model="props.config.attr.layout">
        <option value="horizontal">横向填充</option>
        <option value="vertical">纵向填充</option>
        <option value="freeStyle">自由布局</option>
      </select>
    </div>
    <div class="item">
      <input type="checkbox" id="background" name="play" v-model="props.config.attr.background.use" /><label for="background">窗口背景</label>
      <select id="layout" :disabled="!props.config.attr.background.use" v-model="props.config.attr.background.size">
        <option value="contain">填充保持元素的宽高比</option>
        <option value="cover">填充保持元素的宽高比(裁剪)</option>
        <option value="auto">保持原尺寸</option>
        <option value="100% 100%">拉伸</option>
      </select>
      <select :disabled="!props.config.attr.background.use" v-model="props.config.attr.background.repeat">
        <option value="no-repeat">不平铺</option>
        <option value="repeat">平铺</option>
      </select>
      <input :disabled="!props.config.attr.background.use" @change="changeFile" type="file" ref="fileDom" />
    </div>
  </div>
</template>
<style lang="scss" scoped>
@import url("./form.scss");
.item {
  position: relative;
  .short-image {
    width: 100px;
    height: 50px;
    position: absolute;
    left: 340px;
    top: 0px;
  }
}
</style>
