import { createPinia, defineStore } from "pinia";
export const useStore = defineStore("main", {
  state: (): {
    currentWidget: null | undefined | string | number;
    allMuted: boolean;
    allPause: boolean;
  } => {
    return {
      currentWidget: null,
      allMuted: true,
      allPause: false,
    };
  },
  getters: {},
  actions: {},
});
export const commonPinia = createPinia();
