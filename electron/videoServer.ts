import { createRequire } from "node:module";
import { separateDomainAndPath } from "../util/index";
import { rewriteDefault } from "vue/compiler-sfc";
const require = createRequire(import.meta.url);
const express = require("express");
const path = require("path");
const fs = require("fs");
const CryptoJS = require("crypto-js");
const net = require("net");
const { createProxyMiddleware } = require("http-proxy-middleware");
let startPort = 4000;
const app = express();
const usePorts = {};
//每个port只支持6路视频
function findAvailablePort(startPort = 3000, endPort = 18000, callback) {
  let currentPort = startPort;
  // 递归函数，用于尝试绑定到下一个端口
  function tryPort(port) {
    if (port > endPort) {
      // 如果所有端口都尝试过了，回调一个错误
      callback(new Error("No available ports in the specified range"));
      return;
    }
    const server = net.createServer();
    server.on("error", err => {
      // 如果端口被占用，尝试下一个端口
      if (err.code === "EADDRINUSE") {
        if (usePorts[port] && usePorts[port] <= 5) {
          //返回旧端口
          callback(null, port);
        } else {
          tryPort(port + 1);
        }
      } else {
        // 如果不是 EADDRINUSE 错误，直接回调错误
        callback(err);
      }
    });
    server.on("listening", () => {
      // 端口可用，关闭服务器并回调端口号
      server.close(() => {
        callback(null, port);
      });
    });
    // 尝试绑定到当前端口
    server.listen(port);
  }

  // 开始尝试从 startPort 开始的端口
  tryPort(currentPort);
}
// 设置静态文件目录
// app.use(
//   cors({
//     methods: ["GET", "POST"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//     exposedHeaders: ["Set-Cookie"],
//   })
// );
app.get("/video-stream/:videoId", (req: any, res: any) => {
  const videoId = req.params.videoId;

  const videoPath = pathList.get(videoId);
  fs.access(videoPath, fs.constants.F_OK, err => {
    if (err) {
      // 如果文件不存在或其他错误，返回 404 错误
      res.status(404).send("File not found");
    } else {
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        let start = parseInt(parts[0], 10);
        // let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        let end = start + 3 * 1024 * 1024;
        if (end > fileSize) end = fileSize - 1;
        if (start > end) start = end - 1;
        const chunksize = end - start + 1;

        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": "video/mp4",
          "Access-Control-Allow-Origin": "*",
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          "Content-Length": fileSize,
          "Content-Type": "video/mp4",
          "Access-Control-Allow-Origin": "*",
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    }
  });
  // 使用ffmpeg将视频转换为HTTP流
});

const pathList = new Map();
const addPlayPath = (filePath: string) => {
  return new Promise((resolve, reject) => {
    const addWidget = port => {
      let id = CryptoJS.MD5(filePath).toString();
      let url = `http://127.0.0.1:${port}/video-stream/${id}`;
      let fileName = path.basename(filePath);
      console.log("🐤 - addWidget - url:", url);
      // 如果你还想要获取文件扩展名，可以使用path.extname()
      let fileExtension = path.extname(filePath);
      let fileType = fileExtension.slice(1);
      // 如果你想要获取不带扩展名的文件名，可以这样做：
      let name = path.basename(filePath, path.extname(filePath));
      pathList.set(id, filePath);
      resolve({ id, url, fileName, fileExtension, fileType, name });
    };
    findAvailablePort(startPort, 180000, (err, port) => {
      if (err) {
        console.error("Error finding an available port:", err);
      } else {
        if (!usePorts[port]) {
          //开始使用
          usePorts[port] = 1;
          app.listen(port, () => {
            addWidget(port);
          });
        } else if (usePorts[port] && usePorts[port] <= 5) {
          usePorts[port]++;
          addWidget(port);
        }
      }
      startPort = port;
    });
  });
};
const addPlayLink = (link: string) => {
  return new Promise((resolve, reject) => {
    //@ts-ignore
    const { domain, path } = separateDomainAndPath(link);
    findAvailablePort(startPort, 180000, (err, port) => {
      if (err) {
        console.error("Error finding an available port:", err);
      } else {
        if (!usePorts[port]) {
          //开始使用
          usePorts[port] = 1;
          app.listen(port, () => {});
        } else if (usePorts[port] && usePorts[port] <= 5) {
          usePorts[port]++;
        }
      }
      startPort = port;
      let id = CryptoJS.MD5(link).toString();
      let url = `http://127.0.0.1:${port}/proxy-link/${path}`;
      let fileName = link;
      let fileExtension = link;
      let name = link;
      let fileType = "link";

      let middle = createProxyMiddleware({
        target: domain,
        changeOrigin: true,
      });
      app.use(`/proxy-link`, middle);

      resolve({ id, url, fileName, fileExtension, fileType, name });
    });
  });
};
export { addPlayPath, addPlayLink };
