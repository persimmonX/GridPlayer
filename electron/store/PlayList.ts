import _ from "lodash";
import BaseList from "./BaseList";
const key = "playlist";
class PlayList extends BaseList {
  constructor() {
    super(key);
  }
}
const playList = new PlayList();
export default playList;
