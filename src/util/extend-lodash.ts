import _ from "lodash";

function deepFind(obj, key, defaultValue = undefined) {
  if (_.isPlainObject(obj)) {
    if (_.has(obj, key)) {
      return obj[key];
    } else {
      for (let subKey in obj) {
        let result = deepFind(obj[subKey], key, defaultValue);
        if (result != defaultValue) {
          return result;
        }
      }
    }
  } else if (_.isArray(obj)) {
    for (let item of obj) {
      const result = deepFind(item, key, defaultValue);
      if (result != defaultValue) {
        return result;
      }
    }
  }
  return defaultValue;
}
_.mixin({ deepFind });
export default _;
