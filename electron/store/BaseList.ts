import _ from "lodash";
import Store from "electron-store";
import store from "./index";
class BaseList {
  store: Store;
  maxReturn: number;
  key: string;
  constructor(key) {
    this.key = key;
    this.store = store;
    this.maxReturn = 30;
    this.key = key;
  }
  add(url) {
    let all = this.store.get(this.key);
    let newArray = _.filter(all, item => item !== url);
    //数组去重
    newArray.unshift(url);
    this.store.set(this.key, newArray);
  }
  remove(url) {
    let all = this.store.get(this.key);
    let newArray = _.filter(all, item => item !== url);
    //数组去重
    this.store.set(this.key, newArray);
  }
  getAll(): string[] {
    let all = <string[]>this.store.get(this.key);
    return all ? all.slice(0, this.maxReturn) : [];
  }
  removeAll() {
    this.store.set(this.key, []);
  }
}

export default BaseList;
