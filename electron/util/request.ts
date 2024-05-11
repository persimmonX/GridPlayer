import axios from "axios";
import progress from "progress-stream";

async function getFileSize(url) {
  try {
    const response = await axios.head(url);
    const contentLength = parseInt(response.headers["content-length"], 10);
    return contentLength;
  } catch (error) {
    console.error(`Error fetching size for ${url}:`, error);
    return 0; // 或抛出错误，根据你的需求
  }
}
async function getTotalSize(tsFileUrls) {
  let totalSize = 0;
  for (const url of tsFileUrls) {
    const size = await getFileSize(url);
    totalSize += size;
  }
  return totalSize;
}

async function getHlsSize(url) {
  return axios.get(url).then(res => {
    let m3u8Content = res.data;
    const regex = /\b.+.ts\b/g;
    const matches = m3u8Content.match(regex);
    const u = new URL(url);
    const pathParts = u.pathname.split("/");
    pathParts.pop(); // 移除最后一个路径段
    let pathname = pathParts.join("/"); // 设置新的路径
    let baseUrl = u.origin + pathname;
    const tsFileUrls = matches.map(segment => baseUrl + "/" + segment);
    return getTotalSize(tsFileUrls);
  });
}

async function getMp4Size(url) {
  let response = await axios.get(url, {
    headers: {
      Range: `bytes=0-`,
    },
  });
  let content = response.headers["content-range"];
  if (content) {
    let max = content.split("/")[1];
    const contentLength = parseInt(max);
    return contentLength;
  }
}

function getProgress(url: string) {
  if (String(url).toLocaleLowerCase().endsWith(".m3u8")) {
    return getHlsSize(url).then(size => {
      console.log("🐤 - returngetHlsSize - size:", size);
      return progress({
        length: size,
        time: 10 /* ms */,
      });
    });
  } else if (String(url).toLocaleLowerCase().endsWith(".mp4")) {
    return getMp4Size(url).then(size => {
      return progress({
        length: size,
        time: 10 /* ms */,
      });
    });
  }
}
export { getHlsSize, getMp4Size, getProgress};
