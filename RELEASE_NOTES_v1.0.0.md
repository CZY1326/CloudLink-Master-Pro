## CloudLink Master Pro v1.0.0

首个正式版本 · First stable release.

### 功能 / Features

- **支持网盘**：百度网盘 / 阿里云盘(Alipan) / 夸克网盘 / UC 网盘（完整支持），天翼云盘（我的网盘），123 云盘 / 迅雷云盘 / 移动云盘（实验性）
- **下载出口**：Aria2 / Motrix RPC（批量推送 + 子目录还原）、Gopeed、IDM、ABDM、cURL、BitComet (`bc://`)、aria2c 命令行、网页下载页、增强分片下载
- **中英双语界面**：面板头部 `EN / 中` 一键切换，语言偏好持久化
- **下载历史**：自动记录所有出口，可搜索 / 复制 / 再下载（上限 200 条）
- **落地批量重命名**：前缀 / 后缀 / 查找替换 / 正则
- **百度三通道兜底**：filemetas → locatedownload → OAuth，附 9019 风控 PDF 改名技巧
- **稳定性**：夸克 / UC HTTP 412 防盗链自愈重推、迅雷文件夹递归解析
- **夸克签到领容量**

### 安装 / Install

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 下载下方附件 `CloudLink-Master-Pro.user.js`，或在 Tampermonkey 中通过 GitHub raw 链接安装
3. 打开任一支持的网盘页面，右下角悬浮球 → `Alt + D` 打开面板

### 免责声明 / Disclaimer

仅供学习交流与技术演示，下载行为请遵守当地法律法规及各网盘服务条款。

**Full Changelog**: https://github.com/CZY1326/CloudLink-Master-Pro/commits/v1.0.0
