import _ from "lodash";
import BaseList from "./BaseList";
const name = "scriptlist";
const key = "list";
class ScriptList extends BaseList {
  constructor() {
    super(name, key);
  }
}
const scriptList = new ScriptList();
export default scriptList;
