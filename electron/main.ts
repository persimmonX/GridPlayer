import { app, BrowserWindow, Menu, dialog, globalShortcut, ipcMain, MenuItemConstructorOptions, MenuItem } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { addPlayPath, addPlayLink } from "./videoServer";
import { readDirRecursive } from "../util";

import fs from "fs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vm = require("vm");
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
let devToolIsOpen = false;
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

function getMainWindowPopup(type?: "played"): any {
  let base = [
    {
      label: "添加",
      icon: path.join(__dirname, "../public/basic/003-add.png"),
      submenu: [
        {
          label: "添加文件",
          accelerator: "CmdOrCtrl+A",
          icon: path.join(__dirname, "../public/basic/065-archives.png"),
          click: addFile,
        },
        {
          label: "添加URL",
          accelerator: "CmdOrCtrl+U",
          icon: path.join(__dirname, "../public/basic/088-thunder.png"),
          click: () => {
            // 播放在线视频
            linkPopup = createPopupWindow("link", "外部连接", 500, 200);
          },
        },
        {
          label: "使用脚本",
          icon: path.join(__dirname, "../public/basic/179-document.png"),
          accelerator: "CmdOrCtrl+X",
          click: () => {
            // 播放在线视频
            scriptPopup = createPopupWindow("script", "脚本", 1200, 750);
            scriptPopup.webContents.on("context-menu", (e, params) => {
              const recentScriptFiles = path.resolve(__dirname, "/history/recentScriptFiles.txt");
              if (fs.existsSync(recentScriptFiles)) {
                let text = fs.readFileSync(recentScriptFiles, "utf-8");
                let template: any = [];
                if (!text) {
                  template.push({
                    label: "暂无保存记录",
                  });
                } else {
                  const history = text
                    .split("\n")
                    .filter(item => Boolean(item))
                    .map(item => {
                      return item.split("|");
                    });
                  template = history.map(item => {
                    return {
                      label: item[1],
                      click: () => {
                        const script = fs.readFileSync(item[1], "utf-8");
                        scriptPopup?.webContents.send("history-script", script);
                      },
                    };
                  });
                  template.push({
                    label: "清空播放历史",
                    click: () => {
                      console.log("clear recentScriptFiles");
                      fs.truncate(recentScriptFiles, 0, () => {});
                    },
                  });
                }

                let historySavedMenu = Menu.buildFromTemplate(template);
                historySavedMenu.popup();
              }
            });
          },
        },
      ],
    },
    {
      label: "删除窗口",
      icon: path.join(__dirname, "../public/basic/031-cancel.png"),
      click: event => {
        win?.webContents.send("removeWidget");
      },
    },
    {
      label: "重载程序",
      accelerator: "CmdOrCtrl+R",
      icon: path.join(__dirname, "../public/basic/188-recycle.png"),
      role: "reload",
      click: () => {
        // 播放在线视频
      },
    },
  ];
  let split = {
    type: "separator",
  };
  let played = [
    {
      label: "全部",
      icon: path.join(__dirname, "../public/basic/111-layers.png"),
      submenu: [
        {
          label: "视频",
          icon: path.join(__dirname, "../public/basic/223-video.png"),
          submenu: [
            {
              label: "暂停",
              accelerator: "CmdOrCtrl+Shift+P",
              icon: path.join(__dirname, "../public/basic/140-pause.png"),
              click: () => {
                win?.webContents.send("setAllPause");
              },
            },
            {
              label: "播放",
              accelerator: "CmdOrCtrl+P",
              icon: path.join(__dirname, "../public/basic/145-play.png"),
              click: () => {
                win?.webContents.send("setAllStart");
              },
            },
          ],
        },
        {
          label: "声音",
          icon: path.join(__dirname, "../public/basic/130-note.png"),
          submenu: [
            {
              label: "静音",
              accelerator: "CmdOrCtrl+M",
              icon: path.join(__dirname, "../public/basic/226-mute.png"),
              click: () => {
                win?.webContents.send("setAllMute");
              },
            },
            {
              label: "解除静音",
              accelerator: "CmdOrCtrl+Shift+M",
              icon: path.join(__dirname, "../public/basic/227-low volume.png"),
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
      icon: path.join(__dirname, "../public/basic/099-squares.png"),
      submenu: [
        {
          label: "横向填充",
          icon: path.join(__dirname, "../public/basic/034-center align.png"),
          click: () => {
            win?.webContents.send("layout-flex", "horizontal");
          },
        },
        {
          label: "纵向填充",
          icon: path.join(__dirname, "../public/basic/033-center align.png"),
          click: () => {
            win?.webContents.send("layout-flex", "vertical");
          },
        },
      ],
    },
    {
      label: "裁剪",
      icon: path.join(__dirname, "../public/basic/047-compress.png"),
      submenu: [
        {
          label: "放大",
          accelerator: "CmdOrCtrl+numadd",
          icon: path.join(__dirname, "../public/basic/235-zoom in.png"),
          click: () => {
            win?.webContents.send("scale-add");
          },
        },
        {
          label: "缩小",
          accelerator: "CmdOrCtrl+numsub",
          icon: path.join(__dirname, "../public/basic/236-zoom out.png"),
          click: () => {
            win?.webContents.send("scale-reduce");
          },
        },
        {
          label: "↑",
          accelerator: "CmdOrCtrl+Up",
          icon: path.join(__dirname, "../public/basic/052-crop.png"),
          click: () => {
            win?.webContents.send("move-up");
          },
        },
        {
          label: "↓",
          accelerator: "CmdOrCtrl+Down",
          icon: path.join(__dirname, "../public/basic/052-crop.png"),
          click: () => {
            win?.webContents.send("move-down");
          },
        },
        {
          label: "←",
          accelerator: "CmdOrCtrl+Left",
          icon: path.join(__dirname, "../public/basic/052-crop.png"),
          click: () => {
            win?.webContents.send("move-left");
          },
        },
        {
          label: "→",
          accelerator: "CmdOrCtrl+Right",
          icon: path.join(__dirname, "../public/basic/052-crop.png"),
          click: () => {
            win?.webContents.send("move-right");
          },
        },
      ],
    },
    {
      label: "全屏",
      accelerator: "CmdOrCtrl+Space",
      icon: path.join(__dirname, "../public/basic/048-monitor.png"),
      click: () => {
        win?.webContents.send("full-screen");
      },
    },
  ];
  let dev = [
    {
      label: "打开控制台",
      accelerator: "CmdOrCtrl+O",
      icon: path.join(__dirname, "../public/basic/128-monitor.png"),
      click: () => {
        // 播放在线视频
        toggleDev();
      },
    },
    {
      label: "查看SVG",
      icon: path.join(__dirname, "../public/basic/107-image.png"),
      click: () => {
        // 播放在线视频
        createPopupWindow("svg", "svg");
        //获取/public/basic/*.svg
      },
    },
  ];
  let setting = [
    {
      label: "关于",
      icon: path.join(__dirname, "../public/basic/132-note.png"),
      click: () => {
        // 播放在线视频
        createPopupWindow("about", "关于");
      },
    },
  ];
  if (type == "played") {
    //@ts-ignore
    return base.concat(split, ...played, split, ...dev, split, ...setting);
  } else {
    //@ts-ignore
    return base.concat(split, ...dev, split, ...setting);
  }
}
function addFile() {
  dialog
    .showOpenDialog({
      title: "选择文件",
      properties: ["openFile", "multiSelections"],
    })
    .then(result => {
      if (!result.canceled) {
        for (let path of result.filePaths) {
          addPlayPath(path).then(({ url, id, name }: any) => {
            win?.webContents.send("addWidget", { id, path, name, url });
          });
        }
      }
    })
    .catch(err => {
      console.log(err);
    });
}
function createPopupWindow(hashPath: string, title?: string, width = 500, height = 400) {
  const popup = new BrowserWindow({
    width: width,
    height: height,
    title: title,
    show: false,
    // resizable: false,
    icon: path.join(__dirname, "../public/main/png/16x16.png"),
    backgroundColor: "red",
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
    popup.loadFile(path.join(RENDERER_DIST, `index.html/#/${hashPath}`));
  }
  popups.push(popup);
  return popup;
}
function toggleDev() {
  if (devToolIsOpen) {
    win?.webContents.closeDevTools();
  } else {
    win?.webContents.openDevTools();
  }
}
function createWindow() {
  win = new BrowserWindow({
    title: "GridPlayer",
    icon: path.join(__dirname, "../public/main/png/16x16.png"),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

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
    console.log("开发者工具已打开");
    devToolIsOpen = true;
  });
  win.webContents.on("devtools-closed", () => {
    console.log("开发者工具已关闭");
    devToolIsOpen = false;
  });
  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
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
    globalShortcut.register("CmdOrCtrl+A", addFile);
    globalShortcut.register("CmdOrCtrl+H", () => {
      if (win?.isFullScreen()) {
        win?.setFullScreen(false);
      } else {
        win?.setFullScreen(true);
      }
    });
    globalShortcut.register("CmdOrCtrl+m", () => {
      win?.webContents.send("setAllMute");
    });
    globalShortcut.register("CmdOrCtrl+o", () => {
      toggleDev();
    });
    globalShortcut.register("CmdOrCtrl+shift+m", () => {
      win?.webContents.send("setAllReleaseMute");
    });
    globalShortcut.register("CmdOrCtrl+P", () => {
      win?.webContents.send("setAllStart");
    });
    globalShortcut.register("CmdOrCtrl+shift+P", () => {
      win?.webContents.send("setAllPause");
    });
    globalShortcut.register("CmdOrCtrl+numadd", () => {
      win?.webContents.send("scale-add");
    });
    globalShortcut.register("CmdOrCtrl+numsub", () => {
      win?.webContents.send("scale-reduce");
    });
    globalShortcut.register("CmdOrCtrl+Up", () => {
      win?.webContents.send("move-up");
    });
    globalShortcut.register("CmdOrCtrl+Down", () => {
      win?.webContents.send("move-down");
    });
    globalShortcut.register("CmdOrCtrl+Right", () => {
      win?.webContents.send("move-right");
    });
    globalShortcut.register("CmdOrCtrl+Left", () => {
      win?.webContents.send("move-left");
    });
    globalShortcut.register("CmdOrCtrl+Space", () => {
      win?.webContents.send("full-screen");
    });
  });

  // 当窗口失去焦点时注销快捷键
  win.on("blur", () => {
    globalShortcut.unregister("CmdOrCtrl+A");
    globalShortcut.unregister("CmdOrCtrl+H");
    globalShortcut.unregister("CmdOrCtrl+m");
    globalShortcut.unregister("CmdOrCtrl+o");
    globalShortcut.unregister("CmdOrCtrl+shift+m");
    globalShortcut.unregister("CmdOrCtrl+p");
    globalShortcut.unregister("CmdOrCtrl+shift+p");
    globalShortcut.unregister("CmdOrCtrl+numadd");
    globalShortcut.unregister("CmdOrCtrl+numsub");
    globalShortcut.unregister("CmdOrCtrl+Up");
    globalShortcut.unregister("CmdOrCtrl+Down");
    globalShortcut.unregister("CmdOrCtrl+Right");
    globalShortcut.unregister("CmdOrCtrl+Left");
    globalShortcut.unregister("CmdOrCtrl+Space");
  });
}
ipcMain.handle("viewSvg", async (event, data) => {
  try {
    let files: any = await readDirRecursive(path.resolve(__dirname, "../public/basic"));
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
    addPlayPath(path).then(({ url, id, name }: any) => {
      win?.webContents.send("addWidget", { id, path, name, url });
    });
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
    addPlayLink(link).then(({ url, id, name }: any) => {
      win?.webContents.send("addWidget", { id, name, url });
      linkPopup?.close();
    });
  }
});

ipcMain.handle("confirm-script", (_e, text) => {
  return new Promise(resolve => {
    try {
      text += "main();";
      const result = vm.runInNewContext(text);
      resolve(result);
    } catch (error) {
      console.error("Error executing code:", error);
    }
  });
});
ipcMain.on("play-script", (_e, links) => {
  for (let link of links) {
    addPlayLink(link).then(({ url, id, name }: any) => {
      win?.webContents.send("addWidget", { id, name, url });
      scriptPopup?.close();
    });
  }
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
        const recentScriptFiles = path.resolve(__dirname, "/history/recentScriptFiles.txt");
        const data = `${Date.now()}|${filePath}\n`;
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(path.resolve(__dirname, "/history"));
        }
        fs.appendFile(recentScriptFiles, data, { encoding: "utf8", flag: "a" }, err => {
          if (err) throw err;
          console.log("ipcMain.on - recentScriptFiles:", recentScriptFiles);
        });
      }
    })
    .catch(err => {
      console.error(err);
    });
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
// ipcMain.on("get-widget-count", (_e, count) => {
//   if (count > 0) {
//     //弹出菜单中需要添加新的
//     contextMenu = Menu.buildFromTemplate(getMainWindowPopup("played"));
//   } else {
//     contextMenu = Menu.buildFromTemplate(getMainWindowPopup());
//   }
// });
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
