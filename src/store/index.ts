import { createPinia, defineStore } from "pinia";
export const useStore = defineStore("main", {
  state: (): {
    currentWidget: null | undefined | string | number;
    allMuted: boolean;
    allPause: boolean;
    configs: any;
  } => {
    return {
      currentWidget: null,
      allMuted: true,
      allPause: false,
      configs: {
        list: [
          {
            type: "normal",
            title: "常规",
            sub: [
              {
                type: "play",
                title: "播放器",
                attr: {
                  layout: "vertical", //"horizontal" | "vertical" | "freeStyle"
                  background: {
                    use: false,
                    url: "",
                    size: "cover",
                    imageName: "",
                    repeat: "no-repeat",
                  },
                },
              },
            ],
          },
          {
            type: "default",
            title: "默认",
            sub: [
              {
                type: "video",
                title: "视频",
                attr: {
                  startMute: true,
                  setStartTime: true,
                  autoplay: true,
                  loop: true,
                  startTime: 0,
                },
              },
            ],
          },
        ],
      },
    };
  },
  getters: {},
  actions: {},
});
export const commonPinia = createPinia();
