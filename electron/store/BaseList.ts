import _ from "lodash";
import Store from "electron-store";
class BaseList {
  store: Store<Record<any, string[]>>;
  maxReturn: number;
  key: string;
  name: string;
  constructor(name, key) {
    this.name = name;
    this.key = key;
    const schema = {
      properties: {
        [key]: {
          type: ["array", "string"],
          items: { type: "string" },
          default: [],
        },
      },
      name: this.name,
    };
    this.store = new Store(schema);
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
    let all = this.store.get(this.key);
    return all ? all.slice(0, this.maxReturn) : [];
  }
  removeAll() {
    this.store.set(this.key, []);
  }
}

export default BaseList;
