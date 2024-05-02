import { app, BrowserWindow, Menu, dialog, globalShortcut, ipcMain, MenuItemConstructorOptions } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { addPlayPath, addPlayLink } from "./videoServer";
import { readDirRecursive } from "../util";

import fs from "fs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
let devToolIsOpen = false;
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
let linkPopup: null | BrowserWindow = null;
const menus = Menu.buildFromTemplate(template);
// Menu.setApplicationMenu(null);
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
    resizable: false,
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

  let contextMenu = Menu.buildFromTemplate([
    {
      label: "添加",
      icon: path.join(__dirname, "../public/basic/003-add.png"),
      submenu: [
        {
          label: "添加文件     Ctrl+A",
          icon: path.join(__dirname, "../public/basic/065-archives.png"),
          click: addFile,
        },
        {
          label: "添加URL     Ctrl+U",
          icon: path.join(__dirname, "../public/basic/088-thunder.png"),
          click: () => {
            // 播放在线视频
            linkPopup = createPopupWindow("link", "外部连接", 500, 200);
          },
        },
      ],
    },
    {
      label: "查看SVG",
      icon: path.join(__dirname, "../public/basic/107-image.png"),
      click: () => {
        // 播放在线视频
        createPopupWindow("svg", "svg");
        //获取/public/basic/*.svg

        // console.log("🐤 - createWindow - files:", files);
      },
    },
    {
      label: "删除窗口",
      icon: path.join(__dirname, "../public/basic/031-cancel.png"),
      click: event => {
        win?.webContents.send("removeWidget");
      },
    },
    {
      label: "打开控制台    Ctrl+O",
      icon: path.join(__dirname, "../public/basic/107-image.png"),
      click: () => {
        // 播放在线视频
        toggleDev();
      },
    },

    {
      label: "关于",
      icon: path.join(__dirname, "../public/basic/107-image.png"),
      click: () => {
        // 播放在线视频
        createPopupWindow("about", "关于");
      },
    },
  ]);
  win.webContents.on("context-menu", (e, params) => {
    contextMenu.popup();
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
    globalShortcut.register("ctrl+A", addFile);
    globalShortcut.register("ctrl+O", () => {
      toggleDev();
    });
    globalShortcut.register("ctrl+f", () => {
      if (win?.isFullScreen()) {
        win?.setFullScreen(false);
      } else {
        win?.setFullScreen(true);
      }
    });
  });

  // 当窗口失去焦点时注销快捷键
  win.on("blur", () => {
    globalShortcut.unregister("ctrl+A");
    globalShortcut.unregister("ctrl+O");
    globalShortcut.unregister("ctrl+f");
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
