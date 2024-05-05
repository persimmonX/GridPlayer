import _ from "lodash";
import BaseList from "./BaseList";
const name = "playlist";
const key = "list";
class PlayList extends BaseList {
  constructor() {
    super(name, key);
  }
}
const playList = new PlayList();
export default playList;
