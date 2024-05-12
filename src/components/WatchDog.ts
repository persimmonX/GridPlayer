class Watchdog {
  timeout: number;
  onTimeoutCallback: Function;
  timerId: any;
  constructor(timeout, onTimeoutCallback) {
    this.timeout = timeout; // 超时时间（毫秒）
    this.onTimeoutCallback = onTimeoutCallback; // 超时回调函数
    this.timerId = null; // 定时器ID
  }
  start() {
    this.reset();
  }
  // 重置看门狗
  reset() {
    if (this.timerId) {
      clearTimeout(this.timerId); // 清除之前的定时器
    }
    this.timerId = setTimeout(() => {
      this.onTimeoutCallback(); // 触发超时回调函数
    }, this.timeout);
  }

  // 通常在程序正常执行时调用，以重置看门狗
  feed() {
    this.reset();
  }
  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId); // 清除之前的定时器
      this.timerId = null;
    }
  }
}
export default Watchdog;