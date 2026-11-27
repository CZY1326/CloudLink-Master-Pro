# CloudLink Master Pro

**网盘直链解析与下载中枢 · Cloud Direct-Link Parser & Download Hub**

> 语言 / Language: [简体中文](#中文) | [English](#english)

---

<a id="中文"></a>

## 简介

CloudLink Master Pro 包含两个组件，共享同一套解析内核：

| 组件 | 形态 | 用途 |
|---|---|---|
| **用户脚本** | Tampermonkey / Violentmonkey | 在网盘网页里批量解析直链，推送到 Aria2 / Motrix / IDM / Gopeed 等下载器，或浏览器直接保存 |
| **Gopeed 原生扩展** | Gopeed 内置扩展系统 | 把网盘**分享链接**直接解析为 Gopeed 下载任务，无需浏览器、无需用户脚本 |

**全部逻辑本地运行**：无广告、无授权码、无远程配置服务器、不采集任何数据。

---

## 一、用户脚本

### 支持网盘

| 网盘 | 状态 |
|---|---|
| 百度网盘（含分享页） | ✅ 完整支持 |
| 阿里云盘 / Alipan（含分享页） | ✅ 完整支持 |
| 夸克网盘 | ✅ 完整支持 |
| UC 网盘 | ✅ 完整支持 |
| 天翼云盘 | ✅ 我的网盘 |
| 123 / 迅雷 / 移动云盘 | ⚗️ 实验性 |

### 功能亮点

- **批量解析**：整个目录或页面勾选项，支持文件名筛选
- **多种下载出口**：Aria2 / Motrix RPC（批量推送 + 子目录还原）、Gopeed、IDM、ABDM、cURL、BitComet、aria2c 命令行
- **免软件下载**：网页下载页、增强下载（分片并发 + 进度 + 取消）
- **下载历史**：自动记录、可搜索 / 再下载（上限 200 条）
- **落地批量重命名**：前缀 / 后缀 / 查找替换 / 正则
- **稳定性**：夸克 / UC 412 防盗链自愈重推、百度三通道兜底（filemetas → locatedownload → OAuth）
- **夸克签到领容量**：一键签到

### 安装与使用

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey）
2. 点击 `CloudLink-Master-Pro.user.js` → **Raw** 打开原始内容 → 确认安装
3. 打开任一支持的网盘页面，右下角出现悬浮球；`Alt + D` 快捷开关面板
4. 点 **解析当前列表** / **解析页面勾选**，选择下载出口即可；下载器地址 / 端口 / 密钥在 **设置** 里配置

---

## 二、Gopeed 原生扩展

把 **夸克 / UC / 阿里云盘（Alipan）** 的分享链接直接解析为 Gopeed 下载任务：

- 支持提取码（链接尾 `?pwd=xxx` 或 `#提取码/密码`）
- 支持子目录递归、批量文件
- 自动附带下载所需的 UA / Referer / Cookie

### 安装

Gopeed → 扩展页面 → 从 URL 安装：

```
https://github.com/CZY1326/CloudLink-Master-Pro#gopeed-extension
```

或下载 `gopeed-extension/` 目录下的 `manifest.json` + `index.js` 打包为 zip 后本地安装。

### 设置

| 设置项 | 说明 |
|---|---|
| **夸克 Cookie** | **必填**。夸克已强制登录才能取直链和下载（未登录报 31001）。F12 → 网络 → 任意请求 → 请求标头 Cookie 整串复制 |
| UC Cookie | 可选，需要登录的分享才需要 |
| 单次最多解析文件数 | 递归子目录时的文件总数上限，默认 500 |

### 注意事项

- 解析失败时 Gopeed 会**静默回退为普通下载**（下载到的是分享页 HTML）——多为 Cookie 缺失或失效
- 需要浏览器扩展开发模式之外的帮助？提交 [Issue](https://github.com/CZY1326/CloudLink-Master-Pro/issues) 并附上 Gopeed 的 `extension.log`

---

## 免责声明

本项目仅供学习交流与技术演示使用。使用本项目产生的任何下载行为，请遵守当地法律法规及各网盘平台的服务条款；由此产生的一切后果由使用者自行承担。请勿用于商业用途或大规模分发受版权保护的文件。

## 许可证

[MIT](LICENSE)

---

<a id="english"></a>

## English

**CloudLink Master Pro** ships two components sharing the same parsing core:

| Component | Form | Purpose |
|---|---|---|
| **Userscript** | Tampermonkey / Violentmonkey | Batch-parses direct links on cloud-drive web pages and pushes them to Aria2 / Motrix / IDM / Gopeed, or saves them in the browser |
| **Gopeed native extension** | Gopeed extension system | Parses cloud-drive **share links** directly into Gopeed download tasks — no browser, no userscript needed |

Everything runs **locally**: no ads, no license keys, no remote config server, no tracking.

### 1. Userscript

**Supported drives**: Baidu Netdisk ✅ (incl. share pages) · Alipan (Aliyun Drive) ✅ (incl. share pages) · Quark ✅ · UC Drive ✅ · Tianyi ☁️ list view · 123pan / Xunlei / China Mobile ⚗️ experimental

**Highlights**:

- Batch parsing (whole directory or page-selected files) with filename filtering
- Multiple egress: Aria2/Motrix RPC (batch + sub-directory restore), Gopeed, IDM, ABDM, cURL, BitComet, aria2c CLI
- Software-free download: web download page and enhanced chunked download (concurrency, progress, cancellable)
- Download history (auto-recorded, searchable, up to 200 entries)
- Batch rename rules (prefix / suffix / replace / regex) for saved files
- Quark/UC HTTP 412 hotlink self-healing; Baidu triple-fallback (filemetas → locatedownload → OAuth); Quark sign-in for free storage

**Install**: install [Tampermonkey](https://www.tampermonkey.net/) → open the raw `CloudLink-Master-Pro.user.js` → confirm → open any supported drive page (floating ball at bottom-right, `Alt + D` to toggle).

### 2. Gopeed Native Extension

Parses **Quark / UC / Alipan** share links directly into Gopeed download tasks, with passcode support (`?pwd=xxx`), sub-folder recursion, and the UA / Referer / Cookie headers required for download.

**Install** (Gopeed → Extensions → Install from URL):

```
https://github.com/CZY1326/CloudLink-Master-Pro#gopeed-extension
```

**Settings**:

| Setting | Description |
|---|---|
| **Quark Cookie** | **Required**. Quark enforces login for direct links and downloads (guest requests fail with 31001). Copy the full Cookie string from DevTools → Network → any request → Request Headers |
| UC Cookie | Optional, only for login-required shares |
| Max files per resolve | Recursion cap for sub-folders, default 500 |

**Note**: when a resolve fails, Gopeed silently falls back to a plain download (you get the share-page HTML instead of the file) — usually a missing or expired Cookie.

**Disclaimer**: for learning and research only. Any downloading activity must comply with local laws and the terms of service of each cloud-drive platform. Use at your own risk.

**License**: [MIT](LICENSE)
