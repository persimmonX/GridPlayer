import IpcRenderer from "electron";
interface MyipcRender{
  setStoreValue: (string, any) => any;
  getStoreValue: (string) => any;
}
