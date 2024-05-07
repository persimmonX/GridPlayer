import { createApp } from "vue";
import "./styles/style.css";
import "./styles/resetxg.scss";
import App from "./App.vue";
import "gridstack/dist/gridstack.min.css";
import "gridstack/dist/gridstack-extra.css";
import "xgplayer/dist/index.min.css";
import { commonPinia, useStore } from "./store";
import router from "@/router/router";
import _ from "@/util/extend-lodash";

createApp(App)
  .use(commonPinia)
  .use(router)
  .mount("#app")
  .$nextTick(() => {
    // Use contextBridge
    window.ipcRenderer.on("main-process-message", (_event, message) => {
      console.log(message);
    });
    window.ipcRenderer.getStoreValue("configs").then(result => {
      const store = useStore();
      if (result) {
        _.merge(store.$state.configs, result);
      }
    });
  });
