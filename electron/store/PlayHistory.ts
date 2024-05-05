import _ from "lodash";
import BaseList from "./BaseList";
const name = "playhistory";
const key = "list";
class PlayHistory extends BaseList {
  constructor() {
    super(name, key);
  }
}
const playHistory = new PlayHistory();
export default playHistory;
