import { createPinia, defineStore } from "pinia";
export const useStore = defineStore("main", {
  state: (): {
    currentWidget: null | undefined | string | number;
  } => {
    return {
      currentWidget: null,
    };
  },
  getters: {},
  actions: {},
});
export const commonPinia = createPinia();
