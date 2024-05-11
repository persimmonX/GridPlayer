import { createRequire } from "node:module";
import { separateDomainAndPath } from "./util/index";
import { v4 as uuidv4 } from "uuid";
import mime from "mime";
import { getProgress } from "./util/request";
const require = createRequire(import.meta.url);
const express = require("express");
const path = require("path");
const fs = require("fs");
const net = require("net");
const cors = require("cors");
const timeout = require("connect-timeout");
const ffmpeg = require("fluent-ffmpeg");
const { createProxyMiddleware } = require("http-proxy-middleware");
let startPort = 4000;
const maxTimeout = "120s";
const app = express();
app.use(timeout(maxTimeout));
const usePorts = {};
//每个port只支持6路视频
const maxPortSupport = 1;
let staticServer: any = null;
//public为静态文件夹
export function startStaticServer(path, callback) {
  if (staticServer) return callback(staticServer);
  findAvailablePort(startPort, 18000, (err, port) => {
    if (!err) {
      app.use(cors());
      app.use(express.static(path));
      staticServer = `http://127.0.0.1:${port}`;
      app.listen(port, () => {
        callback(staticServer);
      });
    }
  });
}

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
        if (usePorts[port] && usePorts[port] <= maxPortSupport) {
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
app.get("/static-source/:fileExtension", (req: any, res: any) => {
  const fileExtension = req.params.fileExtension;
  const temp = fileExtension.split(".");
  let mimeText = mime.getType(temp[1]);
  const fileId = temp[0];
  const filePath = pathList.get(fileId);
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) {
      // 如果文件不存在或其他错误，返回 404 错误
      res.status(404).send("File not found");
    } else {
      const head = {
        "Content-Type": `${mimeText}`,
        "Access-Control-Allow-Origin": "*",
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  });
  // 使用ffmpeg将视频转换为HTTP流
});

const pathList = new Map();
function getMIMEType(fileExtension: string): any {
  return mime.getType(fileExtension);
}
const addPlayPath = (filePath: string, originId?: string) => {
  return new Promise((resolve, reject) => {
    const addWidget = port => {
      let id = "v" + uuidv4();
      let url = `http://127.0.0.1:${port}/video-stream/${id}`;
      let fileName = path.basename(filePath);
      // 如果你还想要获取文件扩展名，可以使用path.extname()
      let fileExtension = path.extname(filePath);
      let fileType = fileExtension.slice(1);
      // 如果你想要获取不带扩展名的文件名，可以这样做：
      let name = path.basename(filePath, path.extname(filePath));
      pathList.set(id, filePath);
      let mimeType = getMIMEType(fileExtension);
      if (/^video/.test(mimeType)) {
        url = `http://127.0.0.1:${port}/video-stream/${id}`;
      } else {
        url = `http://127.0.0.1:${port}/static-source/${id}.${fileType}`;
      }
      resolve({ id, url, fileName, fileExtension, mimeType, fileType, name, originId });
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
        } else if (usePorts[port] && usePorts[port] <= maxPortSupport) {
          usePorts[port]++;
          addWidget(port);
        }
      }
      startPort = port;
    });
  });
};
const addPlayLink = (link: string, originId?: string) => {
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
        } else if (usePorts[port] && usePorts[port] <= maxPortSupport) {
          usePorts[port]++;
        }
      }
      startPort = port;
      let id = "v" + uuidv4();
      let url = `http://127.0.0.1:${port}/proxy-link/${path}`;
      let fileName = link;
      let fileExtension = link;
      let name = link;
      let fileType = "link";
      pathList.set(id, link);
      let mimeType = getMIMEType(fileExtension);
      let middle = createProxyMiddleware({
        target: domain,
        changeOrigin: true,
      });
      app.use(`/proxy-link`, middle);

      resolve({ id, url, fileName, fileExtension, fileType, mimeType, name, originId });
    });
  });
};

async function saveVideo(id: string, filePath: string, callback: (process) => void) {
  let url = pathList.get(id);
  let writeStream = fs.createWriteStream(filePath);
  let pro = await getProgress(url);
  if (pro) {
    pro.on("progress", (progress: { percentage: number }) => {
      callback(progress);
    });
  }

  ffmpeg()
    .input(url)
    .addOutputOptions("-movflags +frag_keyframe+separate_moof+omit_tfhd_offset+empty_moov")
    .videoCodec("copy")
    .format("mp4")
    .on("end", function () {
      callback({ percentage: 100 });
    })
    .pipe(pro)
    .pipe(writeStream);
}

function getFileById(id: string) {
  return pathList.get(id);
}

export { addPlayPath, addPlayLink, saveVideo, getFileById };
