import _ from "lodash";
import BaseList from "./BaseList";
const key = "scriptlist";
class ScriptList extends BaseList {
  constructor() {
    super(key);
  }
}
const scriptList = new ScriptList();
export default scriptList;
