const ffmpeg = require("fluent-ffmpeg");
var progress = require("progress-stream");
const cliProgress = require("cli-progress");
const { getHlsSize, getMp4Size } = require("../util/request");
const fs = require("fs");
const video = "https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/hls/xgplayer-demo.m3u8";
const videoMp4 = "https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4";
const ffmpegPath = "./ffmpeg.exe";
// const ffmpegPath = "C:/Users/yqy20/AppData/Local/ffmpeg-2023-08-20/bin/ffmpeg.exe";
ffmpeg.setFfmpegPath(ffmpegPath);
// getHlsSize(video)
getMp4Size(videoMp4).then(size => {
  if (size) {
    let str = progress({
      length: size,
      time: 10 /* ms */,
    });
    const singleBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    singleBar.start(size, 0); // 第二个参数是初始值，这里设为0
    str.on("progress", function (progress) {
      singleBar.update(progress.transferred);
      if (progress.percentage == 100) {
        singleBar.stop();
        console.log("完成下载");
      }
    });
    const write = fs.createWriteStream("./x.mp4");
    ffmpeg().input(videoMp4).addOutputOptions("-movflags +frag_keyframe+separate_moof+omit_tfhd_offset+empty_moov").videoCodec("copy").format("mp4").pipe(str).pipe(write);
  }
});
