# CloudLink Master Pro

**网盘直链解析与下载中枢 · Cloud Direct-Link Parser & Download Hub**

> 语言 / Language: [简体中文](#中文) | [English](#english)

---

<a id="中文"></a>

## 简介

CloudLink Master Pro 是一个 Tampermonkey / Violentmonkey 用户脚本，批量解析主流网盘文件的真实下载直链，并一键推送到你惯用的下载器，或在浏览器里直接保存。界面支持**中英双语切换**（面板头部 `EN / 中` 按钮）。

**全部逻辑本地运行**：无广告、无授权码、无远程配置服务器、不注入推广链接、不采集任何数据。

## 支持网盘

| 网盘 | 状态 |
|---|---|
| 百度网盘（含分享页） | ✅ 完整支持 |
| 阿里云盘 / Alipan（含分享页） | ✅ 完整支持 |
| 夸克网盘 | ✅ 完整支持 |
| UC 网盘 | ✅ 完整支持 |
| 天翼云盘 | ✅ 我的网盘 |
| 123 云盘 | ⚗️ 实验性 |
| 迅雷云盘 | ⚗️ 实验性 |
| 移动云盘 | ⚗️ 实验性 |

## 功能亮点

- **批量解析**：解析当前目录全部文件，或仅解析页面勾选项；支持文件名筛选
- **多种下载出口**：Aria2 / Motrix RPC（批量推送 + 子目录还原）、Gopeed、IDM、ABDM、cURL、BitComet（`bc://`）、aria2c 命令行
- **免软件下载**：网页下载页（浏览器原生保存）、增强下载（分片并发 + 进度 + 取消）
- **下载历史**：所有出口成功后自动记录，可搜索 / 复制 / 再下载（上限 200 条）
- **落地批量重命名**：前缀 / 后缀 / 查找替换 / 正则，作用于下载落地文件名
- **百度三通道兜底**：filemetas → locatedownload → OAuth 授权，附 PDF 改名技巧（9019 风控）
- **稳定性**：夸克 / UC 同源 412 防盗链自愈重推、迅雷文件夹递归 + medias 多候选直链
- **夸克签到领容量**：一键签到，无需打开活动页

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey）
2. 点击 `CloudLink-Master-Pro.user.js` 文件 → **Raw** 打开原始内容
3. Tampermonkey 会自动弹出安装页，确认即可
4. 打开任一支持的网盘页面，右下角出现悬浮球；`Alt + D` 快捷开关面板

## 使用

1. 进入网盘文件列表或分享页
2. 点击悬浮球打开面板，点 **解析当前列表** / **解析页面勾选**
3. 选择出口：复制直链、推送到下载器（RPC/IDM/Gopeed/ABDM）、增强下载、网页下载、导出 TXT……
4. 首次使用建议先到 **设置** 里配置下载器地址 / 端口 / 密钥，点 **测试连接** 验证

## Gopeed 扩展（无需浏览器）

`gopeed-extension/` 目录包含一个 **Gopeed 原生扩展**（逻辑与用户脚本同源）：把 **夸克 / UC / 阿里云盘(Alipan)** 的分享链接直接解析为 Gopeed 下载任务，支持提取码（`?pwd=xxx`）与子目录递归，自动附带下载所需的 UA / Referer / Cookie。

安装方式（Gopeed → 扩展页面）：

```
https://github.com/CZY1326/CloudLink-Master-Pro#gopeed-extension
```

本地调试可开启 Gopeed 开发者模式（扩展页面连续点击 5 次安装按钮）后选择 `gopeed-extension/` 目录。运行本地回归测试：`node gopeed-extension/test.local.js`。

## 免责声明

本项目仅供学习交流与技术演示使用。使用本脚本产生的任何下载行为，请遵守当地法律法规及各网盘平台的服务条款；由此产生的一切后果由使用者自行承担。请勿用于商业用途或大规模分发受版权保护的文件。

## 许可证

[MIT](LICENSE)

---

<a id="english"></a>

## English

**CloudLink Master Pro** is a Tampermonkey / Violentmonkey userscript that batch-parses real download links from mainstream cloud drives and pushes them to your favorite downloader, or saves them directly in the browser. The UI supports **Chinese / English switching** (the `EN / 中` button in the panel header).

Everything runs **locally**: no ads, no license keys, no remote config server, no tracking.

**Supported drives**: Baidu Netdisk ✅ · Alipan (Aliyun Drive) ✅ · Quark ✅ · UC Drive ✅ · Tianyi (China Telecom) ☁️ list view · 123pan ⚗️ experimental · Xunlei ⚗️ experimental · China Mobile Cloud ⚗️ experimental

**Highlights**:

- Batch parsing (whole directory or page-selected files) with filename filtering
- Multiple egress: Aria2/Motrix RPC (batch + sub-directory restore), Gopeed, IDM, ABDM, cURL, BitComet (`bc://`), aria2c CLI
- Software-free download: web download page (native browser save) and enhanced chunked download (concurrency, progress, cancellable)
- Download history (auto-recorded, searchable, up to 200 entries)
- Batch rename rules (prefix / suffix / replace / regex) for saved files
- Baidu triple-fallback channel (filemetas → locatedownload → OAuth) with a PDF-rename trick for HTTP 9019
- Quark/UC HTTP 412 hotlink self-healing & re-push; Quark sign-in for free storage

**Install**: install Tampermonkey → open the raw file → confirm installation → open any supported drive page.

**Disclaimer**: for learning and research only. Any downloading activity must comply with local laws and the terms of service of each cloud-drive platform. Use at your own risk.

**License**: [MIT](LICENSE)
