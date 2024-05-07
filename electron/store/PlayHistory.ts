import _ from "lodash";
import BaseList from "./BaseList";
const key = "playhistory";
class PlayHistory extends BaseList {
  constructor() {
    super(key);
  }
}
const playHistory = new PlayHistory();
export default playHistory;
