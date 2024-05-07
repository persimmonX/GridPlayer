import Store from "electron-store";
const appName = "gridplayer";
const schema = {
  properties: {
    playlist: {
      type: ["array", "string"],
      items: { type: "string" },
      default: [],
    },
    playhistory: {
      type: ["array", "string"],
      items: { type: "string" },
      default: [],
    },
    scriptlist: {
      type: ["array", "string"],
      items: { type: "string" },
      default: [],
    },
    configs: {
      type: ["array", "any"],
      items: { type: "any" },
      default: [],
    },
  },
  name: appName,
};
// Store.initRenderer();
const store: Store = new Store(schema);
export default store;
