import { app, BrowserWindow, Menu, dialog, globalShortcut, ipcMain, MenuItemConstructorOptions, MenuItem } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { addPlayPath, addPlayLink, startStaticServer } from "./videoServer";
import { readDirRecursive, isNetworkUrl } from "./util";
import playHistory from "./store/PlayHistory";
import scriptList from "./store/ScriptList";
import fs from "fs";
import { GridStackWidget } from "gridstack";
import playList from "./store/PlayList";
import _ from "lodash";
import store from "./store";
import mime from "mime";
import * as prettier from "prettier";
import { setupTitlebar, attachTitlebarToWindow } from "custom-electron-titlebar/main";
// import * as prettierPluginBabel from "prettier/plugins/babel.mjs";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vm = require("vm");
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "disabled";
// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win: BrowserWindow | null;
let linkPopup: null | BrowserWindow = null;
let scriptPopup: null | BrowserWindow = null;
let configPopup: null | BrowserWindow = null;
let devToolIsOpened = false;
let contextMenu: Menu | null = null;
const popups: BrowserWindow[] = [];
let template: Array<MenuItemConstructorOptions> = [
  {
    label: "Menu",
    submenu: [
      {
        label: "Reload",
        role: "reload",
      },
    ],
  },
];

const menus = Menu.buildFromTemplate(template);
// Menu.setApplicationMenu(null);
function findObjectsWithAccelerator(arr) {
  let result: any = [];
  function traverse(current) {
    if (Array.isArray(current)) {
      current.forEach(traverse); // 如果是数组，递归遍历每一项
    } else if (typeof current === "object" && current !== null) {
      if ("accelerator" in current) {
        // 如果对象包含accelerator属性，将其添加到结果数组中
        result.push(current);
      }
      if ("submenu" in current) {
        // 如果对象包含accelerator属性，将其添加到结果数组中
        traverse(current.submenu);
      }
    }
  }

  traverse(arr); // 开始遍历传入的数组
  return result;
}
function doSelectPlayByProtocol(urlOrPath, gridStackOption?: GridStackWidget, xgOption?: any, layout?: string) {
  if (isNetworkUrl(urlOrPath)) {
    return addPlayLink(urlOrPath).then(({ url, id, name, mimeType, fileType }: any) => {
      playHistory.add(urlOrPath);
      win?.webContents.send("addWidget", { id, originPath: urlOrPath, name, url, gridStackOption, xgOption, layout, mimeType, fileType });
    });
  } else {
    return addPlayPath(urlOrPath).then(({ url, id, name, fileType, mimeType }: any) => {
      playHistory.add(urlOrPath);
      win?.webContents.send("addWidget", { id, originPath: urlOrPath, name, url, gridStackOption, xgOption, layout, fileType, mimeType });
    });
  }
}
function playJSONList(filePath: string) {
  let str = fs.readFileSync(filePath, "utf-8");
  let data: { layout: string; widgets: Array<{ id: string; originPath: string; gridStackOption: any; xgOption: any }> } = JSON.parse(str);
  if (data && data.widgets.length > 0) {
    let all = data.widgets.map(widget => {
      if (isNetworkUrl(widget.originPath)) {
        return addPlayLink(widget.originPath, widget.id);
      } else {
        return addPlayPath(widget.originPath, widget.id);
      }
    });
    Promise.all(all).then(result => {
      //{ id, originPath: urlOrPath, name, url, gridStackOption, xgOption, layout }
      result.forEach((item: any) => {
        let w = _.find(data.widgets, { id: item.originId });
        if (w) {
          item.originPath = w.originPath;
          item.gridStackOption = w.gridStackOption;
          item.xgOption = w.xgOption;
          item.layout = data.layout;
        }
      });
      win?.webContents.send("addWidgets", result);
    });
  }
}
function getMainWindowPopup(type?: "played" | "all"): any {
  let plist = playList.getAll();
  //校验数据是否正常
  let pmenu = plist
    .filter(item => {
      let exist = fs.existsSync(item);
      if (exist) return true;
      playList.remove(item);
      return false;
    })
    .map(item => {
      item = String(item);
      return {
        label: item,
        click: () => {
          //doSelectPlayByProtocol(item);

          playJSONList(item);
        },
      };
    });
  if (pmenu.length > 0) {
    pmenu.push({
      label: "清空播放记录",
      click: () => {
        playList.removeAll();
      },
    });
  } else {
    pmenu.push({
      label: "(空)",
      click: () => {},
    });
  }

  let hlist = playHistory.getAll();
  let hmenu = hlist.map(item => {
    item = String(item);
    return {
      label: item,
      click: () => {
        doSelectPlayByProtocol(item);
      },
    };
  });
  if (hmenu.length > 0) {
    hmenu.push({
      label: "清空播放记录",
      click: () => {
        playHistory.removeAll();
      },
    });
  } else {
    hmenu.push({
      label: "(空)",
      click: () => {},
    });
  }

  let base: Array<MenuItemConstructorOptions> = [
    {
      label: "添加",
      icon: path.join(process.env.VITE_PUBLIC, "basic/003-add.png"),
      submenu: [
        {
          label: "添加文件",
          accelerator: "CmdOrCtrl+A",
          icon: path.join(process.env.VITE_PUBLIC, "basic/065-archives.png"),
          click: addFile,
        },
        {
          label: "添加URL",
          accelerator: "CmdOrCtrl+U",
          icon: path.join(process.env.VITE_PUBLIC, "basic/088-thunder.png"),
          click: () => {
            // 播放在线视频
            linkPopup = createPopupWindow("link", "外部连接", 500, 200);
          },
        },
        {
          label: "使用脚本",
          icon: path.join(process.env.VITE_PUBLIC, "basic/179-document.png"),
          accelerator: "CmdOrCtrl+/",
          click: () => {
            // 播放在线视频
            scriptPopup = createPopupWindow("script", "脚本", 1200, 750);
            scriptPopup.webContents.on("context-menu", (e, params) => {
              let allScript = scriptList.getAll();
              let template = allScript.map(item => {
                return {
                  label: item,
                  click: () => {
                    //加载脚本
                    const script = fs.readFileSync(item, "utf-8");
                    scriptPopup?.webContents.send("history-script", script);
                  },
                };
              });
              if (template && template.length) {
                template.push({
                  label: "清空脚本记录",
                  click: () => {
                    //清空脚本记录
                  },
                });
              } else {
                template = [
                  {
                    label: "暂无记录",
                    click: () => {},
                  },
                ];
              }
              let historySavedMenu = Menu.buildFromTemplate(template);
              historySavedMenu.popup();
            });
          },
        },
        {
          label: "最近播放",
          icon: path.join(process.env.VITE_PUBLIC, "basic/131-notepad.png"),
          submenu: hmenu,
        },
      ],
    },

    {
      label: "打开播放列表",
      accelerator: "CmdOrCtrl+O",
      icon: path.join(process.env.VITE_PUBLIC, "basic/092-folder.png"),
      click: () => {
        if (win) {
          const options: { properties?: ("openFile" | "openDirectory")[]; title: string; filters: any } = {
            title: "选择文件",
            properties: ["openFile"], // 只允许选择文件
            filters: [
              { name: "Text Files", extensions: ["json"] }, // 限制文件类型为.json
            ],
          };
          dialog.showOpenDialog(win, options).then(result => {
            if (!result.canceled) {
              let filePath = result.filePaths[0];
              playJSONList(filePath);
            }
          });
        }
      },
    },
    {
      label: "保存播放列表",
      accelerator: "CmdOrCtrl+T",
      icon: path.join(process.env.VITE_PUBLIC, "basic/131-notepad.png"),
      click: () => {
        dialog
          .showMessageBox({
            type: "question",
            buttons: ["确定", "取消"],
            title: "确认",
            message: "是否确定保存当前播放列表？",
            defaultId: 0, // 默认选中的按钮索引，0 对应 "确定"
            cancelId: 1, // 取消按钮的索引，1 对应 "取消"
          })
          .then(response => {
            // response 是一个对象，包含 buttonIndex 和 checkedButtons 属性
            if (response.response === 0) {
              // 用户点击了 "确定"
              // 执行你的操作...
              win?.webContents.send("save-play-list");
              ipcMain.once("render-save-play-list", (_e, list) => {
                dialog
                  .showSaveDialog({
                    title: "保存播放列表",
                    filters: [
                      { name: "Text Files", extensions: ["json"] },
                      { name: "All Files", extensions: ["*"] },
                    ],
                  })
                  .then(result => {
                    if (!result.canceled) {
                      let filePath = result.filePath;
                      fs.writeFileSync(filePath, JSON.stringify(list));
                      playList.add(filePath);
                    }
                  })
                  .catch(err => {
                    console.error(err);
                  });
              });
            } else {
              // 用户点击了 "取消" 或关闭了对话框
              console.log("用户点击了取消或关闭了对话框");
            }
          })
          .catch(err => {
            console.error("显示对话框时出错:", err);
          });
      },
    },
    {
      label: "最近播放列表",
      icon: path.join(process.env.VITE_PUBLIC, "basic/046-compass.png"),
      submenu: pmenu,
    },
  ];
  let split: MenuItemConstructorOptions = {
    type: "separator",
  };
  let played: Array<MenuItemConstructorOptions> = [
    {
      label: "重新加载",
      accelerator: "CmdOrCtrl+R",
      icon: path.join(process.env.VITE_PUBLIC, "basic/150-recycle.png"),
      click: event => {
        win?.webContents.send("reload-video");
      },
    },
    {
      label: "删除窗口",
      accelerator: "CmdOrCtrl+X",
      icon: path.join(process.env.VITE_PUBLIC, "basic/031-cancel.png"),
      click: event => {
        win?.webContents.send("removeWidget");
      },
    },
    {
      type: "separator",
    },
    {
      label: "全部",
      icon: path.join(process.env.VITE_PUBLIC, "basic/111-layers.png"),
      submenu: [
        {
          label: "视频",
          icon: path.join(process.env.VITE_PUBLIC, "basic/223-video.png"),
          submenu: [
            {
              label: "暂停",
              accelerator: "CmdOrCtrl+Shift+P",
              icon: path.join(process.env.VITE_PUBLIC, "basic/140-pause.png"),
              click: () => {
                win?.webContents.send("setAllPause");
              },
            },
            {
              label: "播放",
              accelerator: "CmdOrCtrl+P",
              icon: path.join(process.env.VITE_PUBLIC, "basic/145-play.png"),
              click: () => {
                win?.webContents.send("setAllStart");
              },
            },
            {
              label: "重新加载",
              accelerator: "CmdOrCtrl+Shift+R",
              icon: path.join(process.env.VITE_PUBLIC, "basic/151-recycle.png"),
              click: event => {
                win?.webContents.send("reload-video-all");
              },
            },
          ],
        },
        {
          label: "声音",
          icon: path.join(process.env.VITE_PUBLIC, "basic/130-note.png"),
          submenu: [
            {
              label: "静音",
              accelerator: "CmdOrCtrl+M",
              icon: path.join(process.env.VITE_PUBLIC, "basic/226-mute.png"),
              click: () => {
                win?.webContents.send("setAllMute");
              },
            },
            {
              label: "解除静音",
              accelerator: "CmdOrCtrl+Shift+M",
              icon: path.join(process.env.VITE_PUBLIC, "basic/227-low volume.png"),
              click: () => {
                win?.webContents.send("setAllReleaseMute");
              },
            },
          ],
        },
      ],
    },
    {
      label: "布局",
      icon: path.join(process.env.VITE_PUBLIC, "basic/099-squares.png"),
      submenu: [
        {
          label: "横向填充",
          accelerator: "CmdOrCtrl+H",
          icon: path.join(process.env.VITE_PUBLIC, "basic/034-center align.png"),
          click: () => {
            win?.webContents.send("layout-flex", "horizontal");
          },
        },
        {
          label: "纵向填充",
          accelerator: "CmdOrCtrl+J",
          icon: path.join(process.env.VITE_PUBLIC, "basic/033-center align.png"),
          click: () => {
            win?.webContents.send("layout-flex", "vertical");
          },
        },
        {
          label: "自由布局",
          accelerator: "CmdOrCtrl+F",
          icon: path.join(process.env.VITE_PUBLIC, "basic/185-top alignment.png"),
          click: () => {
            win?.webContents.send("layout-flex", "freeStyle");
          },
        },
      ],
    },
    {
      label: "裁剪",
      icon: path.join(process.env.VITE_PUBLIC, "basic/047-compress.png"),
      submenu: [
        {
          label: "放大",
          accelerator: "CmdOrCtrl+numadd",
          icon: path.join(process.env.VITE_PUBLIC, "basic/235-zoom in.png"),
          click: () => {
            win?.webContents.send("scale-add");
          },
        },
        {
          label: "缩小",
          accelerator: "CmdOrCtrl+numsub",
          icon: path.join(process.env.VITE_PUBLIC, "basic/236-zoom out.png"),
          click: () => {
            win?.webContents.send("scale-reduce");
          },
        },
        {
          label: "↑",
          accelerator: "CmdOrCtrl+Up",
          icon: path.join(process.env.VITE_PUBLIC, "basic/052-crop.png"),
          click: () => {
            win?.webContents.send("move-up");
          },
        },
        {
          label: "↓",
          accelerator: "CmdOrCtrl+Down",
          icon: path.join(process.env.VITE_PUBLIC, "basic/052-crop.png"),
          click: () => {
            win?.webContents.send("move-down");
          },
        },
        {
          label: "←",
          accelerator: "CmdOrCtrl+Left",
          icon: path.join(process.env.VITE_PUBLIC, "basic/052-crop.png"),
          click: () => {
            win?.webContents.send("move-left");
          },
        },
        {
          label: "→",
          accelerator: "CmdOrCtrl+Right",
          icon: path.join(process.env.VITE_PUBLIC, "basic/052-crop.png"),
          click: () => {
            win?.webContents.send("move-right");
          },
        },
        {
          label: "还原",
          accelerator: "CmdOrCtrl+num0",
          icon: path.join(process.env.VITE_PUBLIC, "basic/163-search.png"),
          click: () => {
            win?.webContents.send("reset-normal");
          },
        },
      ],
    },
    {
      label: "控制",
      icon: path.join(process.env.VITE_PUBLIC, "basic/048-monitor.png"),
      submenu: [
        {
          label: "全屏",
          accelerator: "CmdOrCtrl+Space",
          icon: path.join(process.env.VITE_PUBLIC, "basic/048-monitor.png"),
          click: () => {
            win?.webContents.send("full-screen");
          },
        },
        {
          label: "Next",
          accelerator: "CmdOrCtrl+Tab",
          icon: path.join(process.env.VITE_PUBLIC, "basic/048-monitor.png"),
          click: () => {
            //选择下一个
            win?.webContents.send("select-next");
          },
        },
      ],
    },
  ];
  let dev: Array<MenuItemConstructorOptions> = [
    {
      label: "设置",
      accelerator: "CmdOrCtrl+F6",
      icon: path.join(process.env.VITE_PUBLIC, "basic/128-monitor.png"),
      click: () => {
        // 打开设置弹窗
        configPopup = createPopupWindow("config", "设置", 800, 600, false);
      },
    },
    {
      label: "打开控制台",
      accelerator: "CmdOrCtrl+F12",
      icon: path.join(process.env.VITE_PUBLIC, "basic/128-monitor.png"),
      click: () => {
        // 播放在线视频
        toggleDev();
      },
    },

    {
      label: "重载程序",
      accelerator: "CmdOrCtrl+l",
      icon: path.join(process.env.VITE_PUBLIC, "basic/188-recycle.png"),
      role: "reload",
      click: () => {
        // 播放在线视频
      },
    },
  ];
  let setting: Array<MenuItemConstructorOptions> = [
    {
      label: "查看SVG",
      icon: path.join(process.env.VITE_PUBLIC, "basic/107-image.png"),
      click: () => {
        // 播放在线视频
        createPopupWindow("svg", "svg");
        //获取/public/basic/*.svg
      },
    },
    {
      label: "关于",
      icon: path.join(process.env.VITE_PUBLIC, "basic/132-note.png"),
      click: () => {
        // 播放在线视频
        createPopupWindow("about", "关于");
      },
    },
  ];
  if (type == "played") {
    return base.concat(split, ...played, split, ...dev, split, ...setting);
  } else if (type == "all") {
    return base.concat(split, ...played, split, ...dev, split, ...setting);
  } else {
    return base.concat(split, ...dev, split, ...setting);
  }
}
function addFile() {
  let allImage = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/tiff", "image/webp"].reduce(
    (current, next) => {
      let types = mime.getAllExtensions(next) || [];
      let arr = Array.from(types);
      return arr ? current.concat(arr) : current;
    },
    <string[]>[]
  );
  let allVideo = ["video/mp4", "image/webm", "image/ogg", "video/x-msvideo", "video/quicktime", "application/vnd.apple.mpegurl", "video/x-flv", "video/x-matroska"].reduce(
    (current, next) => {
      let types = mime.getAllExtensions(next) || [];
      let arr = Array.from(types);
      return arr ? current.concat(arr) : current;
    },
    <string[]>[]
  );
  dialog
    .showOpenDialog({
      title: "选择文件",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "所有", extensions: ["*"] },
        // { name: "视频", extensions: allVideo },
        // { name: "图片", extensions: allImage },
      ],
    })
    .then(result => {
      if (!result.canceled) {
        for (let path of result.filePaths) {
          doSelectPlayByProtocol(path);
        }
      }
    })
    .catch(err => {
      console.log(err);
    });
}
function createPopupWindow(hashPath: string, title?: string, width = 500, height = 400, resizable = true) {
  const popup = new BrowserWindow({
    width: width,
    height: height,
    title: title,
    show: false,
    resizable: resizable,
    titleBarStyle: "hidden",
    icon: path.join(process.env.VITE_PUBLIC, "main/png/16x16.png"),
    backgroundColor: "#f8f8f8",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  popup.once("ready-to-show", () => {
    popup.show();
  });
  if (VITE_DEV_SERVER_URL) {
    popup.loadURL(VITE_DEV_SERVER_URL + `/#/${hashPath}`);
  } else {
    startStaticServer(RENDERER_DIST, server => {
      popup?.loadURL(server + `/#/${hashPath}`);
    });
  }
  popups.push(popup);
  return popup;
}
function toggleDev() {
  if (devToolIsOpened) {
    win?.webContents.closeDevTools();
  } else {
    win?.webContents.openDevTools();
  }
}
setupTitlebar();
function createWindow() {
  win = new BrowserWindow({
    title: "GridPlayer",
    icon: path.join(process.env.VITE_PUBLIC, "main/png/16x16.png"),
    focusable: false,
    titleBarStyle: "hidden",
    // titleBarOverlay: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });
  win.setFocusable(true);
  attachTitlebarToWindow(win);
  contextMenu = Menu.buildFromTemplate(getMainWindowPopup());
  win.webContents.on("context-menu", (e, params) => {
    //判断是否在播放 添加全部=>操作指令
    win?.webContents.send("getAllWidgetCount");
    ipcMain.once("get-widget-count", (_e, count) => {
      if (count > 0) {
        //弹出菜单中需要添加新的
        contextMenu = Menu.buildFromTemplate(getMainWindowPopup("played"));
      } else {
        contextMenu = Menu.buildFromTemplate(getMainWindowPopup());
      }
      contextMenu?.popup();
    });
    //检查当前有多少个窗口
  });
  win.webContents.on("devtools-opened", () => {
    devToolIsOpened = true;
  });
  win.webContents.on("devtools-closed", () => {
    devToolIsOpened = false;
  });
  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    startStaticServer(RENDERER_DIST, server => {
      win?.loadURL(server + "/#/");
    });
  }
  //关闭所有弹框
  win.on("close", () => {
    popups.forEach(p => {
      if (p && !p.isDestroyed()) {
        p.close();
      }
    });
  });

  // 当窗口获得焦点时注册快捷键
  win.on("focus", () => {
    let menus = findObjectsWithAccelerator(getMainWindowPopup("all"));
    menus.forEach(menu => {
      if (menu.accelerator && typeof menu.click == "function") {
        globalShortcut.register(menu.accelerator, menu.click);
      } else {
        console.log(`${menu.label} register shortcut fail command:${menu.accelerator}`);
      }
    });
  });

  // 当窗口失去焦点时注销快捷键
  win.on("blur", () => {
    globalShortcut.unregisterAll();
  });
  win.on("minimize", () => {
    globalShortcut.unregisterAll();
  });
}
ipcMain.handle("viewSvg", async (event, data) => {
  try {
    let files: any = await readDirRecursive(path.resolve(process.env.VITE_PUBLIC, "basic"));
    files = files.map((file: any) => file.replace(path.resolve(__dirname, "../public"), ""));
    return files;
  } catch (err) {
    console.error("无法读取目录", err);
  }
  return [];
});
ipcMain.handle("changeToPNG", async (event, url) => {
  const filePath = path.join(path.resolve(__dirname, "../public"), url);
  if (fs.existsSync(filePath)) {
    let pngPath = filePath.replace(".svg", ".png");
    return await sharp(filePath)
      .png()
      .resize(16)
      .toFile(pngPath)
      .then((_data: any) => {
        console.log(`sharp filePath ${filePath}:ok`);
        return true;
      })
      .catch(err => {
        console.log(`sharp filePath ${filePath}:error`);
        return false;
      });
  } else {
    console.log(`${filePath} false`);
    return false;
  }
});
ipcMain.handle("dropList", (e, list) => {
  for (let path of list) {
    doSelectPlayByProtocol(path);
  }
});
ipcMain.on("open-input-large", () => {
  linkPopup?.setContentSize(500, 400, true);
});
ipcMain.on("open-input-small", () => {
  linkPopup?.setContentSize(500, 200, true);
});
ipcMain.on("cancel-link", () => {
  linkPopup?.close();
});
ipcMain.on("confirm-link", (e, links) => {
  for (let link of links) {
    doSelectPlayByProtocol(link).then(() => {
      linkPopup?.close();
    });
  }
});

ipcMain.handle("confirm-script", (_e, text) => {
  return new Promise((resolve, reject) => {
    try {
      text += "main();";
      const result = vm.runInNewContext(text);
      resolve(result);
    } catch (error) {
      reject(error);
      console.error("Error executing code:", error);
    }
  });
});
ipcMain.on("play-script", (_e, links, text) => {
  dialog
    .showMessageBox({
      type: "info",
      buttons: ["确定", "取消"],
      title: "确认",
      message: "播放前请确定是否保存当前脚本？",
      defaultId: 0, // 默认选中的按钮索引，0 对应 "确定"
      cancelId: 1, // 取消按钮的索引，1 对应 "取消"
    })
    .then(res => {
      if (res.response == 0) {
        dialog
          .showSaveDialog({
            title: "保存脚本",
            filters: [
              { name: "Text Files", extensions: ["js"] },
              { name: "All Files", extensions: ["*"] },
            ],
          })
          .then(result => {
            if (!result.canceled) {
              // 发送文件路径给渲染进程
              let filePath = result.filePath;
              fs.writeFileSync(filePath, text);
              scriptList.add(filePath);
            }
            for (let link of links) {
              doSelectPlayByProtocol(link).then(() => {
                scriptPopup?.close();
              });
            }
          })
          .catch(err => {
            console.error(err);
          });
      } else {
        for (let link of links) {
          doSelectPlayByProtocol(link).then(() => {
            scriptPopup?.close();
          });
        }
      }
    })
    .finally(() => {})
    .catch(err => {
      console.log("show confirm dialog error", err);
    });
});
ipcMain.on("cancel-script", _e => {
  scriptPopup?.close();
});
ipcMain.on("save-script", (_e, text) => {
  dialog
    .showSaveDialog({
      title: "保存脚本",
      filters: [
        { name: "Text Files", extensions: ["js"] },
        { name: "All Files", extensions: ["*"] },
      ],
    })
    .then(result => {
      if (!result.canceled) {
        // 发送文件路径给渲染进程
        let filePath = result.filePath;
        fs.writeFileSync(filePath, text);
        scriptList.add(filePath);
      }
    })
    .catch(err => {
      console.error(err);
    });
});
ipcMain.handle("get-near-last-script", () => {
  let all = scriptList.getAll();
  let last = _.last(all);
  if (last) {
    //检查文件是否存在，不存在删除记录
    if (fs.existsSync(last)) {
      let text = fs.readFileSync(last, "utf-8");
      return text;
    } else {
      scriptList.remove(last);
      return "";
    }
  } else {
    return "";
  }
});
ipcMain.handle("import-script", _e => {
  const options = {
    title: "选择文件",
    properties: ["openFile"], // 只允许选择文件
    filters: [
      { name: "Text Files", extensions: ["js"] }, // 限制文件类型为.txt
      { name: "All Files", extensions: ["*"] },
    ],
  };
  return new Promise((resolve, reject) => {
    if (!scriptPopup) {
      resolve("");
      return;
    }

    dialog //@ts-ignore
      .showOpenDialog(scriptPopup, options)
      .then(result => {
        if (!result.canceled) {
          const text = fs.readFileSync(result.filePaths[0], "utf-8");
          // 处理文件...
          resolve(text);
        } else {
          resolve("");
        }
      })
      .catch(err => {
        console.error(err);
        reject("error");
      });
  });
});
ipcMain.handle("get-store-value", (_e, key: string) => {
  return store.get(key);
});
ipcMain.handle("set-store-value", (_e, key: string, value: any) => {
  store.set(key, value);
});
ipcMain.on("close-config-popup", _e => {
  configPopup?.close();
});
ipcMain.handle("parse-text", (_e, text, parser) => {
  try {
    return prettier.format(text, {
      parser: parser,
    });
  } catch (e) {
    return text;
  }
});

//changeToPNG
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    globalShortcut.unregisterAll();
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();
});
