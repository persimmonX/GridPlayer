import { ipcRenderer, contextBridge } from "electron";
import { Titlebar, Color } from "custom-electron-titlebar";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
  setStoreValue(key: string, data: any) {
    return ipcRenderer.invoke("set-store-value", key, data);
  },
  getStoreValue(key: string) {
    return ipcRenderer.invoke("get-store-value", key);
  },
});
window.addEventListener("DOMContentLoaded", () => {
  // Title bar implementation
  new Titlebar({
    backgroundColor: "#4d4d4d",
  });
});
