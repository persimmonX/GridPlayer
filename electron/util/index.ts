import fs from "fs";
import path from "path";
import _ from "lodash";
function readDirRecursive(dirPath: any) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return reject(err);
      }

      Promise.all(
        files.map(file => {
          const fullPath = path.join(dirPath, file);
          return fs.promises.stat(fullPath).then(stats => {
            if (stats.isFile()) {
              return fullPath;
            } else if (stats.isDirectory()) {
              return readDirRecursive(fullPath); // 递归调用
            }
          });
        })
      )
        .then(files => {
          // 扁平化数组（如果子目录中有文件）
          resolve(files.flat());
        })
        .catch(reject);
    });
  });
}
function separateDomainAndPath(url) {
  // 创建一个URL对象（如果环境支持）
  const parsedUrl = new URL(url);

  // 如果环境不支持URL对象（例如旧版浏览器），则使用正则表达式
  if (!parsedUrl) {
    // 正则表达式来匹配域名和路径
    // 这个正则表达式很简单，可能不适用于所有URL，但通常对于HTTP和HTTPS协议是足够的
    const match = url.match(/^(https?:\/\/[^\/]+)(.*)$/);
    if (match) {
      return {
        domain: match[1],
        path: match[2] || "/", // 如果没有路径，则默认为根路径'/'
      };
    }
    // 如果不匹配，返回null或其他错误处理
    return null;
  }

  // 使用URL对象提取域名和路径
  const domain = parsedUrl.origin; // 这将返回协议、域名和端口（如果有的话）
  const path = parsedUrl.pathname; // 这将返回路径部分，不包括查询字符串或哈希

  return {
    domain,
    path,
  };
}

function isNetworkUrl(url) {
  // 使用正则表达式匹配常见的网络协议
  const networkProtocols = /^(https?:|ftp:|file:)/i;
  return networkProtocols.test(url);
}


export { readDirRecursive, separateDomainAndPath, isNetworkUrl };
