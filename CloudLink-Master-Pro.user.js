// ==UserScript==
// @name         CloudLink Master Pro
// @namespace    https://github.com/CZY1326/CloudLink-Master-Pro
// @version      1.0.1
// @author       Lucian-Cosmo & WorkBuddy
// @icon         https://raw.githubusercontent.com/CZY1326/CloudLink-Master-Pro/main/docs/assets/icon.png
// @updateURL    https://raw.githubusercontent.com/CZY1326/CloudLink-Master-Pro/main/CloudLink-Master-Pro.user.js
// @downloadURL  https://raw.githubusercontent.com/CZY1326/CloudLink-Master-Pro/main/CloudLink-Master-Pro.user.js
// @homepageURL  https://czy1326.github.io/CloudLink-Master-Pro/
// @supportURL   https://github.com/CZY1326/CloudLink-Master-Pro/issues
// @description  CloudLink Master Pro · 网盘直链解析与下载中枢：批量解析百度/阿里/夸克/UC/天翼/123 云盘文件直链（迅雷云盘、移动云盘实验性支持），一键推送 Aria2/Motrix RPC（批量+子目录还原）、Gopeed、IDM、ABDM、cURL、BitComet，或经网页下载页/增强分片下载在浏览器直接保存；支持下载历史、落地批量重命名、百度三通道兜底、夸克/UC 412 自愈与夸克签到领容量。全部逻辑本地运行：无广告、无授权码、无远程配置、不采集数据。
// @license      MIT
// @match        *://pan.baidu.com/*
// @match        *://yun.baidu.com/*
// @match        *://openapi.baidu.com/oauth/*
// @match        *://www.alipan.com/*
// @match        *://www.aliyundrive.com/*
// @match        *://pan.quark.cn/*
// @match        *://drive.uc.cn/*
// @match        *://cloud.189.cn/*
// @match        *://*.cloud.189.cn/*
// @match        *://pan.xunlei.com/*
// @match        *://yun.139.com/*
// @match        *://caiyun.139.com/*
// @match        *://*.123pan.com/*
// @match        *://*.123pan.cn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_info
// @grant        unsafeWindow
// @connect      pan.baidu.com
// @connect      yun.baidu.com
// @connect      openapi.baidu.com
// @connect      d.pcs.baidu.com
// @connect      *.pcs.baidu.com
// @connect      *.baidupcs.com
// @connect      api.alipan.com
// @connect      www.alipan.com
// @connect      api.aliyundrive.com
// @connect      www.aliyundrive.com
// @connect      pan.quark.cn
// @connect      drive.quark.cn
// @connect      pc-api.quark.cn
// @connect      drive.uc.cn
// @connect      pc-api.uc.cn
// @connect      *.uc.cn
// @connect      cloud.189.cn
// @connect      *.cloud.189.cn
// @connect      pan.xunlei.com
// @connect      api-pan.xunlei.com
// @connect      *.xunlei.com
// @connect      yun.139.com
// @connect      caiyun.139.com
// @connect      *.139.com
// @connect      *.cmecloud.cn
// @connect      drive-m.quark.cn
// @connect      www.123pan.com
// @connect      *.123pan.com
// @connect      *.123pan.cn
// @connect      *.123684.com
// @connect      *.123865.com
// @connect      *.123952.com
// @connect      *.123912.com
// @connect      *.cjjd19.com
// @connect      127.0.0.1
// @connect      localhost
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* ============================================================
     *  可视报错：脚本内任何崩溃都在页面顶部显示红条，不再静默
     * ============================================================ */
    function showFatal(msg, autoHide) {
        try {
            if (!document.body || document.getElementById('dlm-fatal')) return;
            const bar = document.createElement('div');
            bar.id = 'dlm-fatal';
            bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#e53935;color:#fff;font-size:13px;line-height:20px;padding:4px 10px;white-space:pre-wrap;word-break:break-all;font-family:monospace;pointer-events:none;';
            bar.textContent = '【CloudLink Master Pro · 直链大师】出错：' + msg;
            document.body.appendChild(bar);
            if (autoHide) setTimeout(function () { bar.remove(); }, 10000); /* 运行期错误 10s 后自动消失；初始化失败常驻 */
        } catch (e) { /* 兜底失败只能靠控制台 */ }
    }
    console.log('[CLM] 已注入 ' + location.href);

    /* 页面网络捕获：记录夸克 SPA 自身请求里的当前目录 fid（解决“解析停在一级目录”）
       天翼的 folderId（同款机制）、迅雷的 parent_file_id（同款机制） */
    const Captured = { quarkFid: '', quarkShareFid: '', ucFid: '', ucShareFid: '', c189Fid: '', xlFid: '' };
    (function installQuarkHook() {
        try {
            if (window.__dlmHooked) return;
            window.__dlmHooked = true;
            const pick = (u) => {
                try {
                    const s = String(u || '');
                    if (/drive\.quark\.cn/.test(s)) {
                        let m = s.match(/[?&]pdir_fid=([^&]*)/);
                        if (m && m[1]) {
                            if (/\/file\/sort/.test(s)) Captured.quarkFid = m[1];
                            if (/share\/sharepage\/detail/.test(s)) Captured.quarkShareFid = m[1];
                        }
                    }
                    /* UC 与夸克同源（clouddrive 架构），pdir_fid 捕获逻辑完全一致 */
                    if (/pc-api\.uc\.cn/.test(s)) {
                        let mu = s.match(/[?&]pdir_fid=([^&]*)/);
                        if (mu && mu[1]) {
                            if (/\/file\/sort/.test(s)) Captured.ucFid = mu[1];
                            if (/share\/sharepage\/detail/.test(s)) Captured.ucShareFid = mu[1];
                        }
                    }
                    if (/cloud\.189\.cn/.test(s)) {
                        const m2 = s.match(/[?&]folderId=(-?\d+)/);
                        if (m2 && m2[1]) Captured.c189Fid = m2[1];
                    }
                    if (/api-pan\.xunlei\.com/.test(s)) {
                        const m3 = s.match(/[?&]parent_file_id=([^&]*)/);
                        if (m3 && m3[1]) Captured.xlFid = m3[1];
                    }
                } catch (e) { /* 忽略 */ }
            };
            const of = window.fetch;
            if (typeof of === 'function') {
                window.fetch = function (input) {
                    try { pick(typeof input === 'string' ? input : (input && input.url)); } catch (e) { /* 忽略 */ }
                    return of.apply(this, arguments);
                };
            }
            const oo = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (method, url) {
                try { pick(url); } catch (e) { /* 忽略 */ }
                return oo.apply(this, arguments);
            };
        } catch (e) {
            console.warn('[CLM] 网络捕获挂载失败（不影响使用，目录解析可能停在根目录）', e);
        }
    })();

    window.addEventListener('error', function (ev) {
        const f = String((ev && ev.filename) || '');
        const ours = f === '' || /extension/i.test(f); /* 扩展沙盒注入的才可能是我们的；页面自身脚本报错不认领 */
        if (!ours) {
            console.error('[CLM] （页面自身报错，与本脚本无关）', ev.message, '@', f + ':' + (ev.lineno || 0));
            return;
        }
        showFatal(((ev && ev.message) || '未知错误') + ' @ 第' + ((ev && ev.lineno) || 0) + '行', true);
    });
    window.addEventListener('unhandledrejection', function (ev) {
        const r = ev && ev.reason;
        let txt = '未知';
        try {
            if (r instanceof Error) {
                txt = r.message + '\n' + String(r.stack || '').split('\n').slice(0, 4).join('\n');
            } else if (r != null && typeof r === 'object') {
                txt = (r.message || '') + ' ' + JSON.stringify(r).slice(0, 300);
            } else if (r != null) {
                txt = String(r);
            }
        } catch (e) { txt = String(r); }
        showFatal('异步异常：' + txt);
    });

    /* 异步入口兜底：未 catch 的 Promise 统一转成 toast + 控制台警告，不再静默 */
    function guard(p) {
        Promise.resolve(p).catch(function (err) {
            const m = (err && err.message) || String(err) || '未知';
            console.warn('[CLM] 异步操作失败：', err);
            try { UI.toast(TF('mOpFail', { msg: m }), 'err'); } catch (e2) { showFatal('异步异常：' + m); }
        });
        return p;
    }

    /* ============================================================
     *  0. 常量
     * ============================================================ */
    const APP = {
        name: 'CloudLink Master Pro',
        /* 版本号优先读元数据头，避免双处硬编码不同步 */
        version: (typeof GM_info !== 'undefined' && GM_info.script && GM_info.script.version) || '1.0.0',
        prefix: 'dlm'
    };

    const QUARK_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch';

    const REFERER = {
        baidu: 'https://pan.baidu.com/',
        ali: 'https://www.alipan.com/',
        quark: 'https://pan.quark.cn/',
        uc: 'https://drive.uc.cn/',
        cloud189: 'https://cloud.189.cn/',
        xunlei: 'https://pan.xunlei.com/',
        mcloud: 'https://yun.139.com/',
        pan123: 'https://www.123pan.com/'
    };

    /* ============================================================
     *  1. 基础工具
     * ============================================================ */
    const U = {
        sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

        qs(key, url) {
            try {
                const u = new URL(url || location.href);
                return u.searchParams.get(key) || '';
            } catch (e) { return ''; }
        },

        esc(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        size(bytes) {
            const n = Number(bytes) || 0;
            if (n <= 0) return '-';
            const k = 1024, i = Math.min(4, Math.floor(Math.log(n) / Math.log(k)));
            return (n / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
        },

        safeName(name) {
            return String(name || '未命名文件').replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 180);
        },

        date(ts) {
            const d = new Date(ts || 0);
            const p = (n) => (n < 10 ? '0' + n : '' + n);
            return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
        },

        /* 落地重命名（借鉴 LinkSwift增强 的四模式，前缀/后缀保留扩展名）：
           prefix: pattern + 主名 + 扩展名 · suffix: 主名 + pattern + 扩展名
           replace: 全文替换 pattern → replacement · regex: 正则替换 */
        renameFile(name, mode, pattern, replacement) {
            name = String(name || '');
            pattern = String(pattern || '');
            if (!name || !pattern) return name;
            let ext = '', base = name;
            const dot = name.lastIndexOf('.');
            if (dot > 0) { base = name.substring(0, dot); ext = name.substring(dot); }
            try {
                switch (mode) {
                    case 'prefix': return pattern + base + ext;
                    case 'suffix': return base + pattern + ext;
                    case 'replace': return name.split(pattern).join(replacement || '');
                    case 'regex': return name.replace(new RegExp(pattern, 'g'), replacement || '');
                    default: return name;
                }
            } catch (e) { return name; /* 正则非法时静默回退原名 */ }
        },

        cookie(name) {
            const key = name + '=';
            for (const part of document.cookie.split(';')) {
                const c = part.trim();
                if (c.indexOf(key) === 0) return c.slice(key.length);
            }
            return '';
        },

        storage(key) {
            try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
        },

        hashPath() {
            // 百度：#list/path=%2Fxxx
            const m = location.hash.match(/[?&]path=([^&]+)/);
            if (m) { try { return decodeURIComponent(m[1]) || '/'; } catch (e) { return '/'; } }
            return '/';
        },

        ext(name) {
            const m = String(name || '').match(/\.([a-z0-9]{1,8})$/i);
            return m ? m[1].toUpperCase() : 'FILE';
        },

        bytes(n) {
            return (Number(n) || 0).toLocaleString('en-US');
        },

        /* CSS 属性选择器转义（老环境无 CSS.escape 时兜底） */
        escSel(s) {
            const v = String(s == null ? '' : s);
            if (typeof CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') return CSS.escape(v);
            return v.replace(/["\\\]]/g, '\\$&');
        },

        /* UTF-8 base64 编码（借鉴 网盘直链下载助手 的 base.e） */
        b64(s) {
            try { return btoa(unescape(encodeURIComponent(String(s)))); } catch (e) { return ''; }
        },

        /* base64 解码（UTF-8 还原），用于 123 云盘直链 ?params= 参数还原真实地址 */
        b64dec(s) {
            try { return decodeURIComponent(escape(atob(String(s)))); } catch (e) { return ''; }
        },

        /* 16 位随机串（借鉴 网盘直链下载助手 的 getRandomString，排除易混淆字符） */
        rand16() {
            const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
            let pwd = '';
            for (let i = 0; i < 16; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
            return pwd;
        },

        /* ---- 纯 JS MD5（按 RFC 1321 直接实现，K 表程序化生成，零外部依赖；
                天翼签名/移动云盘 mcloud-sign 用） ---- */
        md5(str) {
            const bytes = [];
            const s = unescape(encodeURIComponent(String(str)));
            for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i) & 0xFF);
            const bitLen = bytes.length * 8;
            bytes.push(0x80);
            while (bytes.length % 64 !== 56) bytes.push(0);
            for (let i = 0; i < 8; i++) bytes.push(Math.floor(bitLen / Math.pow(2, 8 * i)) & 0xFF);

            /* T 表：K[i] = floor(|sin(i+1)| * 2^32)（RFC 1321） */
            const K = new Array(64);
            for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
            const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
                5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
                4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
                6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

            let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
            const hexc = '0123456789abcdef';
            for (let off = 0; off < bytes.length; off += 64) {
                const M = new Array(16);
                for (let j = 0; j < 16; j++) {
                    M[j] = bytes[off + j * 4] | (bytes[off + j * 4 + 1] << 8) | (bytes[off + j * 4 + 2] << 16) | (bytes[off + j * 4 + 3] << 24);
                }
                let A = a0, B = b0, C = c0, D = d0;
                for (let i = 0; i < 64; i++) {
                    let F, g;
                    if (i < 16) { F = (B & C) | (~B & D); g = i; }
                    else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
                    else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
                    else { F = C ^ (B | ~D); g = (7 * i) % 16; }
                    F = (F + A + K[i] + M[g]) >>> 0;
                    A = D; D = C; C = B;
                    B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
                }
                a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
            }
            let out = '';
            [a0, b0, c0, d0].forEach(n => {
                for (let j = 0; j < 4; j++) {
                    const byte = (n >>> (j * 8)) & 0xFF;
                    out += hexc.charAt(byte >> 4) + hexc.charAt(byte & 0xF);
                }
            });
            return out;
        }
    };

    /* ============================================================
     *  2. 网络层（统一 GM_xmlhttpRequest 封装）
     * ============================================================ */
    const Net = {
        request(opt) {
            return new Promise((resolve, reject) => {
                const task = GM_xmlhttpRequest({
                    method: opt.method || 'GET',
                    url: opt.url,
                    headers: opt.headers || {},
                    data: opt.data,
                    timeout: opt.timeout === undefined ? 25000 : opt.timeout,
                    responseType: opt.blob ? 'blob' : (opt.raw ? 'text' : opt.ab ? 'arraybuffer' : 'json'),
                    withCredentials: opt.credentials !== false,
                    onprogress: opt.onprogress,
                    onload(res) {
                        let data = res.response;
                        /* responseType:'json' 解析失败时部分管理器返回 null/''，回退用原始文本解析 */
                        if (!opt.blob && (data == null || data === '')) {
                            const txt = (res.responseText != null && res.responseText !== '')
                                ? res.responseText : '';
                            try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt || null; }
                        }
                        if (!opt.blob && !opt.raw && typeof data === 'string') {
                            try { data = JSON.parse(data); } catch (e) { /* 保持原样 */ }
                        }
                        resolve({ status: res.status, data, raw: res.responseText != null ? res.responseText : res.response, headers: res.responseHeaders });
                    },
                    onerror() { reject(new Error(T('mNetErr'))); },
                    ontimeout() { reject(new Error(T('mTimeout'))); },
                    onabort() { reject(new Error(T('mAborted'))); }
                });
                if (opt.onTask) opt.onTask(task);
            });
        },

        get(url, headers, opt) {
            return this.request(Object.assign({ method: 'GET', url, headers }, opt || {}));
        },

        postJSON(url, body, headers, opt) {
            return this.request(Object.assign({
                method: 'POST',
                url,
                headers: Object.assign({ 'Content-Type': 'application/json;charset=UTF-8' }, headers || {}),
                data: JSON.stringify(body)
            }, opt || {}));
        },

        postForm(url, body, headers, opt) {
            return this.request(Object.assign({ method: 'POST', url, headers: headers || {}, data: body }, opt || {}));
        }
    };

    /* ============================================================
     *  3. 配置存储
     * ============================================================ */
    const Store = {
        defaults: {
            rpcType: 'aria2',
            rpcHost: 'http://127.0.0.1',
            rpcPort: '6800',
            rpcPath: '/jsonrpc',
            rpcToken: '',
            rpcUser: '',
            rpcPass: '',
            rpcDir: 'D:/Downloads',
            ua: navigator.userAgent,
            theme: 'auto',
            lang: 'zh',
            autoOpen: false,
            curlCookie: false,
            baiduPdfTrick: false,
            renameMode: 'off',
            renamePattern: '',
            renameRepl: '',
            pageSize: 100
        },

        cache: null,

        all() {
            if (!this.cache) {
                const raw = GM_getValue('dlm_settings', null);
                this.cache = Object.assign({}, this.defaults, raw && typeof raw === 'object' ? raw : {});
            }
            return this.cache;
        },

        get(key) { return this.all()[key]; },

        set(patch) {
            this.cache = Object.assign(this.all(), patch);
            GM_setValue('dlm_settings', this.cache);
            return this.cache;
        },

        reset() {
            this.cache = Object.assign({}, this.defaults);
            GM_setValue('dlm_settings', this.cache);
        }
    };

    /* 下载历史：独立键 dlm_history，上限 200 条（借鉴 LinkSwift增强 的下载历史模块）。
       每条：{ t: 时间戳, way: 出口, pan: 网盘名, name: 文件名, size: 字节, url: 直链 } */
    const History = {
        KEY: 'dlm_history',
        MAX: 200,

        all() {
            try {
                const v = GM_getValue(this.KEY, []);
                return Array.isArray(v) ? v : [];
            } catch (e) { return []; }
        },

        add(rec) {
            try {
                const list = this.all();
                list.unshift(Object.assign({ t: Date.now() }, rec));
                if (list.length > this.MAX) list.length = this.MAX;
                GM_setValue(this.KEY, list);
            } catch (e) { /* 历史写入失败不影响主流程 */ }
        },

        remove(i) {
            const list = this.all();
            if (i >= 0 && i < list.length) { list.splice(i, 1); GM_setValue(this.KEY, list); }
        },

        clear() { GM_setValue(this.KEY, []); }
    };

    /* ============================================================
     *  3b. 双语界面（中/英）：文案表 + 取词函数
     *      覆盖主面板、下载历史、设置页的全部静态文案；
     *      运行期 toast / 错误信息保持中文（诊断性质，量过大）。
     * ============================================================ */
    const I18N = {
        zh: {
            ballTip: '（Alt+D）', menuOpen: '打开',
            tRefresh: '重新解析', tHistory: '下载历史', tSettings: '设置', tClose: '关闭',
            tGithub: 'GitHub 仓库', tSite: '项目主页（使用教程）',
            langTip: 'Language / 切换语言',
            bParse: '解析当前列表', bChecked: '解析页面勾选',
            bCopyAll: '复制全部直链', bRpcAll: '推送全部到 RPC',
            bRpcIdm: '全部推送到 IDM', bRpcGopeed: '全部推送到 Gopeed',
            tRpcAll: '推送到 Aria2/Motrix（JSON-RPC）',
            tRpcIdm: '逐条直推给 IDM（127.0.0.1:1001）',
            tRpcGopeed: '推送到 Gopeed（REST API）',
            bEnhance: '增强下载',
            tEnhance: '脚本内分片并发下载：多线程 + 智能分块 + 进度，无需任何下载软件；任务进行中再点一次可取消',
            bPageDl: '网页下载',
            tPageDl: '生成网页下载页，浏览器直接保存，无需安装下载软件',
            filterPh: '筛选文件名…',
            fAll: '全选', fSel: '已选', fTotal: '总大小', bExport: '导出 TXT',
            hName: '文件名', hSize: '大小', hProg: '进度', hAct: '操作',
            bCopy: '复制', bDl: '下载',
            folderHint: '文件夹（请进入后解析）',
            noMatch: '没有匹配的文件',
            eTip: '点击上方 <code>解析当前列表</code> 读取当前目录文件；<br>也可以先在页面勾选文件，再点 <code>解析页面勾选</code>。',
            eUnsupported: '当前页面暂不支持。',
            eOpenUnsupported: '当前页面不受支持，脚本作用于 百度网盘 / 阿里云盘 / 夸克网盘 / 天翼云盘（迅雷云盘、移动云盘为实验性支持）。',
            metaUnknown: '未识别网盘', kindShare: '分享页', kindHome: '我的网盘',
            histSearchPh: '搜索文件名…', histMatched: '匹配', histOf: '条',
            histTotal: '共', histMax: '条 · 上限', histCap: '条',
            histClear: '清空历史', histBack: '返回文件列表',
            hTime: '时间', hPan: '网盘', hMethod: '出口',
            histEmptyMatch: '没有匹配的历史记录',
            histEmpty: '还没有下载历史。任何出口（复制 / 下载 / RPC / 增强 / 网页下载…）成功后都会自动记录在这里。',
            bCopyLink: '复制直链', bRedl: '再下载', bDel: '删除',
            histUnknownFile: '(未知文件)',
            wayCopy: '复制', wayBrowser: '浏览器', wayEnhance: '增强', wayPage: '网页下载',
            wayAria: 'Aria2', wayCurl: 'cURL', wayBc: 'BC',
            sRpc: '下载器推送（RPC）', sDlTheme: '下载与外观', sRename: '落地文件名（批量重命名）', sDiag: '诊断信息',
            lbType: '类型', lbHost: '主机', lbPort: '端口', lbPath: '路径',
            lbToken: '密钥/令牌', lbUser: 'RPC 用户名', lbPass: 'RPC 密码',
            lbDir: '保存目录', lbAddr: '实际地址', bTest: '测试连接',
            lbUa: 'User-Agent', lbTheme: '主题',
            thAuto: '跟随系统', thLight: '浅色', thDark: '深色',
            lbCurlCookie: 'cURL 带 Cookie', lbPdfTrick: '百度PDF格式妙招',
            hintCurlCookie: '生成的命令包含登录 Cookie（注意隐私）',
            hintPdfTrick: '9019 风控时临时把文件改名为 .pdf 骗接口，完成后自动恢复（默认关）',
            hintUa: '直链下载校验 UA',
            lbMode: '模式', lbRule: '规则', lbRepl: '替换为', lbPreview: '预览',
            rnOff: '关闭（保留原名）', rnPrefix: '添加前缀（保留扩展名）', rnSuffix: '添加后缀（保留扩展名）',
            rnReplace: '查找替换（全文）', rnRegex: '正则替换',
            hintRename: '作用于「下载 / 增强下载 / 网页下载」的落地文件名',
            phRule: '前缀内容 / 后缀内容 / 查找内容 / 正则表达式',
            phRepl: '替换 / 替换 / 替换内容（前缀后缀模式忽略此项）',
            lbHotkey: '快捷键', hotkeyVal: 'Alt + D 打开/关闭面板',
            lbCurPan: '当前网盘', lbPageUrl: '页面地址', diagUnknown: '未识别',
            bReset: '恢复默认设置',
            /* 运行期提示（toast / Error message），{x} 为占位符 */
            mOpFail: '操作失败：{msg}',
            mNetErr: '网络错误，请检查网络或稍后重试', mTimeout: '请求超时（25s）', mAborted: '请求已取消',
            mNoLink: '接口未返回直链', mNoLinkMember: '接口未返回直链（可能需要网盘会员权限）',
            mLoginExpired: '登录态失效，请重新登录',
            mBdShareInfo: '未读取到分享信息，请刷新页面后重试', mBdPwdErr: '提取码错误或分享已失效',
            mPageExpired: '页面已过期，请刷新后重试',
            mListFail: '获取文件列表失败（errno={n}）', mBdLogin: '登录态失效，请重新登录百度网盘',
            mBdLinkFail: '获取直链失败（errno={n}）', mBdLinkFailShare: '获取直链失败（errno={n}），请确认已登录且分享有效',
            mBdTokenFail: '无法获取 bdstoken（errno={n}，可能未登录或百度已改版）',
            mBdNoToken: '未登录或登录态失效，请先登录百度网盘',
            mBdAuthOpen: '需要百度下载授权：已打开授权页，点击“授权”后自动继续',
            mBdAuthTimeout: '百度授权超时：请稍后重试',
            mBdNoSign: '分享签名缺失，请刷新页面后重试',
            mBdNoSekey: '未找到提取码校验信息（BDCLND），请先在页面输入提取码',
            mBdLimited: '接口未返回直链，可能被限流，请稍后重试',
            mBdLocateFail: 'locatedownload 失败（errno={n}）',
            mBdLocateNoLink: 'locatedownload 未返回直链（文件可能大于 150MB 或接口受限）',
            mBdRenameFail: '重命名失败（errno={n}）',
            mBd9019Ok: '9019 风控 → locatedownload 通道成功',
            mBdPdfOk: '9019 风控 → PDF格式妙招成功（文件名已恢复）',
            mBdPdfRestore: '注意：恢复文件名失败，请手动把 {name}.pdf 改回原名',
            mAliNoToken: '未读取到登录令牌，请先登录阿里云盘并刷新',
            mAliNoShareToken: '未读取到分享令牌，请刷新分享页重试',
            mAliListFail: '获取列表失败（{n}）', mAliLinkFail: '获取直链失败（{n}）',
            mAliTokenInvalid: '登录令牌已过期，请刷新页面重新登录',
            mNoShareId: '未识别到分享 ID，请确认链接格式', mPwdWrong: '提取码错误',
            mShareTokenFail: '获取分享令牌失败（code={n}）', mShareListFail: '获取分享列表失败（code={n}）',
            mQuarkLogin: '未登录夸克网盘，请先登录', mUcLogin: '未登录 UC 网盘，请先登录',
            mListFailCode: '获取文件列表失败（code={n}）', mLinkFailCode: '获取直链失败（code={n}）',
            mLinkFailSave: '获取直链失败（code={n}），可尝试先保存到网盘',
            mSignInfoFail: '查询签到状态失败（code={n}），请确认已登录夸克',
            mSignFailCode: '签到失败（code={n}）：{msg}',
            mC189Share: '天翼分享页暂不支持直接解析，请先把文件「转存到我的网盘」，进入我的网盘后解析',
            mC189ListFail: '获取文件列表失败', mC189NoLink: '接口未返回直链（文件可能已删除或会话失效）',
            mXlShare: '迅雷分享页暂不支持直接解析，请先把文件「保存到我的云盘」再解析',
            mXlNoCred: '未取到迅雷登录凭据：请先登录 pan.xunlei.com 并刷新页面（实验性通道依赖页面登录态）',
            mXlNoLink: '接口未返回直链（可能需要会员权限、文件未完成转存或已被和谐）',
            mMcListSel: '移动云盘（实验性）：请先在页面勾选文件，再点「解析页面勾选」获取直链',
            mMcNoAuth: '未取到移动云盘登录凭据（authorization Cookie），请先登录 yun.139.com',
            m123ListSel: '123 云盘列表接口各版本变动频繁，请先在页面勾选文件后点「解析页面勾选」（实验性）',
            m123NoLogin: '未登录 123 云盘，请先登录', m123NoTraffic: '本月免费流量不足，请开通 123 云盘会员',
            mNoSel: '请先勾选文件', mNoCtx: '当前页面不受支持',
            mParsing: '解析中…', mNoChecked: '未检测到页面勾选，已改为解析当前列表',
            mNoFiles: '没有找到文件', mLoaded: '已加载 {n} 项', mParseFail: '解析失败',
            mGettingLink: '获取直链中…', mCopied: '已复制：{name}',
            mGenAria: '生成 aria2c 命令…', mAriaCopied: 'aria2c 命令已复制到剪贴板',
            mGenCurl: '生成 cURL…', mCurlCopied: 'cURL 已复制到剪贴板',
            mPushing: '推送中…', mPushed: '已推送到下载器：{name}{status}', mPushStatus: '（下载器状态：{s}）',
            mTooBig2G: '文件超过 2GB，浏览器直存易失败：建议用「RPC」或「cURL」。如仍要下载请再点一次',
            mPreparing: '准备下载…', mEmptyBlob: '下载为空（直链可能已过期，请重新解析）',
            mDlDone: '下载完成：{name}', mDlFallback: '下载器通道失败（{err}），已改用浏览器直接下载', mDlFail: '下载失败',
            mGenBc: '生成 BitComet 链接…', mBcCopied: 'bc:// 链接已复制，浏览器里点击即可唤起 BitComet',
            mBcFail: 'BitComet 链接生成失败：{err}',
            mEnhNoSel: '请先勾选文件（增强下载逐个串行执行，避免内存爆掉）',
            mEnhCancelReq: '已请求取消增强下载：当前分片完成后即停止，稍候出结果',
            mEnhStopping: '正在停止增强下载，请稍候…',
            mEnhStart: '开始增强下载 {n} 个文件（分片并发，进度见文件行与底部状态栏）',
            mEnhCancelled: '增强下载已取消：本次成功 {ok} 个', mFailPart: '，失败 {n} 个',
            mEnhDoneN: '增强下载完成：成功 {ok} 个{fail}',
            mEnhNoSize: '缺少文件大小（请先完成解析）',
            mEnhTooBig: '文件超过 2GB，浏览器内存无法承载，请改用 RPC / IDM / cURL',
            mEnhNoRange: '直链不支持分片下载（HTTP {n}），请改用「下载」/「网页下载」/RPC',
            mStopCancel: '已手动取消', mStopStall: '下载停滞（60 秒无进度），已中止',
            mChunkHttp: '分片 HTTP {n}', mEnhProg: '增强下载',
            mEnhMerging: '增强下载 合并中…', mEnhPartial: '部分分片下载失败，已中止',
            mEnhDoneFile: '增强下载完成：{name}',
            mRpcNoGid: 'RPC 未返回任务 ID', mTaskFail: '下载器任务失败：{err}{hint}',
            m412Hint: '（HTTP 412 = 夸克 CDN 防盗链校验失败：__puus Cookie/签名已过期，脚本将自动用新直链重推一次；若仍失败请重新解析后再推，或改用「网页下载」/cURL）',
            mHintCommon: '（常见原因：下载目录不存在/无写权限、直链已过期，可重新解析后再推）',
            mRpc404: 'RPC 地址不对（HTTP 404）：{url}。请核对端口与路径，并确认下载器正在运行',
            mRpc404Full: 'RPC 地址不对（HTTP 404）：{url} 上没有 JSON-RPC 服务。请核对：端口（aria2 默认 6800，Motrix 默认 16800）与路径（通常 /jsonrpc），并确认下载器正在运行',
            mBatchInvalid: 'Aria2 批量响应无效（HTTP {n}）',
            mRpcUnauthorized: 'RPC 密钥错误（Unauthorized）：请核对设置里的 RPC 密钥',
            mRpcNoMethod: '下载器不支持该方法：请确认推送的是 aria2/Motrix 而非其他程序',
            mRpcNoResult: 'RPC 响应异常：未收到 result（HTTP {n}）。原始响应：{raw}',
            mBatchGetting: '批量获取中…', mGetLinkN: '获取直链 {i}/{n}', mCopiedN: '已复制 {n} 条直链',
            mPushN: '推送 {i}/{n}', mPushDone: '推送完成：成功 {ok} 个{fail}',
            mBatchGet: '批量获取直链…', mAllLinksFail: '所有文件的直链都获取失败，无法推送',
            mBatchPush: '批量推送 {n} 个任务…', mRetrying: '重试失败任务…',
            mBatchDone: '批量推送完成：成功 {ok} 个{fail}',
            mGenFile: '生成文件中…', mExportN: '导出 {i}/{n}', mExported: '已导出 {n} 条',
            mHistNoLink: '该记录没有可用直链', mHistCopied: '已复制历史直链：{name}',
            mHistDlHint: '已发起下载。若浏览器未开始，多半是直链已过期（约 8 小时有效），回网盘重新生成即可',
            mHistClearArm: '再点一次「清空历史」确认删除全部记录', mHistCleared: '已清空全部下载历史',
            mPageNoDl: '勾选的文件里没有可下载项', mPageNoSel: '请先勾选文件，或先解析出直链',
            mPageGen: '生成下载页…', mPageLinkN: '解析直链 {i}/{n}',
            mPageNoLink: '没有可用直链，无法生成下载页',
            mPageBlocked: '弹窗被浏览器拦截，已把下载页保存为本地 HTML 文件，请手动打开（Cookie 通道在该文件下可能失效）',
            mPageOpened: '下载页已在新标签页打开（{n} 个文件）。请在页面里点「全部下载」；如浏览器询问“允许下载多个文件”请选允许',
            mResetDone: '已恢复默认设置', mSwitched: '已切换到 {name}，地址已自动载入',
            mTesting: '连接中…', mIdmTest: 'ℹ IDM 无连通测试：推送时直接发送任务验证（请先启动 IDM）',
            mTestGopeed: '✔ 已连接 Gopeed', mTestAbdm: '✔ 已连接 ABDM',
            mTestAria: '✔ 已连接 aria2 {v}',
            mTestIncomplete: '⚠ 已连上但响应不完整（版本为空），推送可能受影响',
            mSignedAlready: '今天已经签过啦，明天再来（容量已入账）', mSignedOk: '签到成功！获得容量：{gain}',
            mSignFail: '签到失败', mInitFail: '初始化失败：{msg}', mUnknown: '未知',
            mAbdmPong: 'ABDM 未响应 pong（HTTP {n}），请确认 ABDM 正在运行且端口正确',
            mGopeedAuth: 'Gopeed 鉴权失败（HTTP {n}）：请在 Gopeed 设置里复制 API 令牌，填到本脚本设置的「密钥/令牌」栏',
            mGopeed404: 'Gopeed 地址不对（HTTP 404）：{url}，请检查端口与路径',
            mGopeedErr: 'Gopeed 返回错误：{msg}',
            mIdmRejected: 'IDM 未接受下载任务（响应：{body}）。请确认 IDM 已启动且「高级浏览器集成」可用',
            mIdmUnreachable: '无法连接 IDM（HTTP {n}）：请确认 IDM 正在运行',
            mAbdmRejected: 'ABDM 未接受任务（HTTP {n}）{body}。请确认 ABDM 正在运行、端口正确，且设置里已开启「接受外部任务」',
            mGopeedNoId: 'Gopeed 未返回任务 ID（HTTP {n}）。原始响应：{raw}',
            mGopeedTaskFail: 'Gopeed 任务失败：{err}{hint}'
        },
        en: {
            ballTip: ' (Alt+D)', menuOpen: 'Open',
            tRefresh: 'Re-parse', tHistory: 'Download history', tSettings: 'Settings', tClose: 'Close',
            tGithub: 'GitHub repository', tSite: 'Docs site (guide)',
            langTip: 'Language / 切换语言',
            bParse: 'Parse list', bChecked: 'Parse checked',
            bCopyAll: 'Copy all links', bRpcAll: 'Push all to RPC',
            bRpcIdm: 'Push all to IDM', bRpcGopeed: 'Push all to Gopeed',
            tRpcAll: 'Push to Aria2/Motrix (JSON-RPC)',
            tRpcIdm: 'Push directly to IDM (127.0.0.1:1001)',
            tRpcGopeed: 'Push to Gopeed (REST API)',
            bEnhance: 'Enhanced download',
            tEnhance: 'In-browser chunked concurrent download: multi-thread + adaptive chunks + progress, no downloader app needed; click again while running to cancel',
            bPageDl: 'Web download',
            tPageDl: 'Generate a download page and save files directly in the browser, no downloader app needed',
            filterPh: 'Filter by name…',
            fAll: 'All', fSel: 'Selected', fTotal: 'Total', bExport: 'Export TXT',
            hName: 'Name', hSize: 'Size', hProg: 'Progress', hAct: 'Actions',
            bCopy: 'Copy', bDl: 'Save',
            folderHint: 'Folder (open it, then parse)',
            noMatch: 'No matching files',
            eTip: 'Click <code>Parse list</code> above to read files of the current directory;<br>or check files on the page first, then click <code>Parse checked</code>.',
            eUnsupported: 'This page is not supported yet.',
            eOpenUnsupported: 'This page is not supported. The script works on Baidu / Aliyun Drive / Quark / UC / Tianyi / 123 Cloud (Xunlei & Mobile Cloud experimental).',
            metaUnknown: 'Unknown pan', kindShare: 'Share', kindHome: 'My drive',
            histSearchPh: 'Search by name…', histMatched: 'matched', histOf: '',
            histTotal: '', histMax: ' total · max ', histCap: '',
            hTime: 'Time', hPan: 'Pan', hMethod: 'Method',
            histEmptyMatch: 'No matching history',
            histEmpty: 'No download history yet. Every successful action (copy / save / RPC / enhanced / web download…) is recorded here automatically.',
            bCopyLink: 'Copy link', bRedl: 'Re-download', bDel: 'Delete',
            histUnknownFile: '(unknown file)',
            wayCopy: 'Copy', wayBrowser: 'Browser', wayEnhance: 'Enhanced', wayPage: 'Web page',
            wayAria: 'Aria2', wayCurl: 'cURL', wayBc: 'BC',
            sRpc: 'Downloader push (RPC)', sDlTheme: 'Download & appearance', sRename: 'Output filename (batch rename)', sDiag: 'Diagnostics',
            lbType: 'Type', lbHost: 'Host', lbPort: 'Port', lbPath: 'Path',
            lbToken: 'Key / token', lbUser: 'RPC user', lbPass: 'RPC password',
            lbDir: 'Save folder', lbAddr: 'Actual address', bTest: 'Test connection',
            lbUa: 'User-Agent', lbTheme: 'Theme',
            thAuto: 'Follow system', thLight: 'Light', thDark: 'Dark',
            lbCurlCookie: 'cURL with Cookie', lbPdfTrick: 'Baidu PDF trick',
            hintCurlCookie: 'Generated command includes login Cookie (privacy notice)',
            hintPdfTrick: 'On 9019 risk-control, temporarily rename file to .pdf to pass the API, auto-restore afterwards (off by default)',
            hintUa: 'UA checked by direct-link download',
            lbMode: 'Mode', lbRule: 'Rule', lbRepl: 'Replace with', lbPreview: 'Preview',
            rnOff: 'Off (keep original name)', rnPrefix: 'Add prefix (keep extension)', rnSuffix: 'Add suffix (keep extension)',
            rnReplace: 'Find & replace (full text)', rnRegex: 'Regex replace',
            hintRename: 'Applies to output filenames of Save / Enhanced download / Web download',
            phRule: 'Prefix / Suffix / Find / Regex pattern',
            phRepl: 'Replacement (ignored in prefix/suffix modes)',
            lbHotkey: 'Hotkey', hotkeyVal: 'Alt + D toggle panel',
            lbCurPan: 'Current pan', lbPageUrl: 'Page URL', diagUnknown: 'Unknown',
            bReset: 'Reset settings',
            /* Runtime messages (toast / Error message), {x} = placeholder */
            mOpFail: 'Operation failed: {msg}',
            mNetErr: 'Network error. Check your connection and retry later', mTimeout: 'Request timed out (25s)', mAborted: 'Request aborted',
            mNoLink: 'API returned no download link', mNoLinkMember: 'No link returned (membership may be required)',
            mLoginExpired: 'Session expired, please sign in again',
            mBdShareInfo: 'Share info not found, refresh the page and retry', mBdPwdErr: 'Wrong passcode or expired share',
            mPageExpired: 'Page expired, please refresh and retry',
            mListFail: 'Failed to list files (errno={n})', mBdLogin: 'Baidu session expired, please sign in again',
            mBdLinkFail: 'Failed to get link (errno={n})', mBdLinkFailShare: 'Failed to get link (errno={n}). Make sure you are signed in and the share is valid',
            mBdTokenFail: 'Cannot get bdstoken (errno={n}, not signed in or Baidu page changed)',
            mBdNoToken: 'Not signed in or session expired. Sign in to Baidu Netdisk first',
            mBdAuthOpen: 'Baidu download authorization needed: opened the auth page, it continues after you click Authorize',
            mBdAuthTimeout: 'Baidu authorization timed out, try again later',
            mBdNoSign: 'Share signature missing, refresh the page and retry',
            mBdNoSekey: 'Passcode token (BDCLND) not found. Enter the passcode on the page first',
            mBdLimited: 'No link returned, possibly rate-limited. Try again later',
            mBdLocateFail: 'locatedownload failed (errno={n})',
            mBdLocateNoLink: 'locatedownload returned no link (file may exceed 150MB or API is restricted)',
            mBdRenameFail: 'Rename failed (errno={n})',
            mBd9019Ok: '9019 risk-control → locatedownload channel succeeded',
            mBdPdfOk: '9019 risk-control → PDF trick succeeded (filename restored)',
            mBdPdfRestore: 'Notice: failed to restore filename, please manually rename {name}.pdf back',
            mAliNoToken: 'Login token not found. Sign in to Aliyun Drive and refresh',
            mAliNoShareToken: 'Share token not found, refresh the share page and retry',
            mAliListFail: 'Failed to list files ({n})', mAliLinkFail: 'Failed to get link ({n})',
            mAliTokenInvalid: 'Login token expired, refresh the page and sign in again',
            mNoShareId: 'Share ID not recognized, check the link format', mPwdWrong: 'Wrong passcode',
            mShareTokenFail: 'Failed to get share token (code={n})', mShareListFail: 'Failed to list share files (code={n})',
            mQuarkLogin: 'Not signed in to Quark, please sign in first', mUcLogin: 'Not signed in to UC Drive, please sign in first',
            mListFailCode: 'Failed to list files (code={n})', mLinkFailCode: 'Failed to get link (code={n})',
            mLinkFailSave: 'Failed to get link (code={n}). Try saving the files to your drive first',
            mSignInfoFail: 'Failed to query sign-in status (code={n}). Make sure you are signed in to Quark',
            mSignFailCode: 'Sign-in failed (code={n}): {msg}',
            mC189Share: 'Tianyi share pages are not supported yet. Save files to your own drive first, then parse there',
            mC189ListFail: 'Failed to list files', mC189NoLink: 'No link returned (file may be deleted or session invalid)',
            mXlShare: 'Xunlei share pages are not supported yet. Save files to your own drive first, then parse there',
            mXlNoCred: 'Xunlei credentials not found: sign in at pan.xunlei.com and refresh (experimental channel relies on page session)',
            mXlNoLink: 'No link returned (membership may be required, file not saved yet, or blocked)',
            mMcListSel: 'Mobile Cloud (experimental): check files on the page first, then click "Parse checked" to get links',
            mMcNoAuth: 'Mobile Cloud credentials (authorization Cookie) not found. Sign in at yun.139.com first',
            m123ListSel: '123 Cloud list API changes often across versions. Check files on the page first, then click "Parse checked" (experimental)',
            m123NoLogin: 'Not signed in to 123 Cloud, please sign in first', m123NoTraffic: 'Monthly free quota exhausted, please upgrade to 123 Cloud VIP',
            mNoSel: 'Please check files first', mNoCtx: 'This page is not supported',
            mParsing: 'Parsing…', mNoChecked: 'No page selection detected, falling back to parsing the current list',
            mNoFiles: 'No files found', mLoaded: 'Loaded {n} items', mParseFail: 'Parse failed',
            mGettingLink: 'Getting link…', mCopied: 'Copied: {name}',
            mGenAria: 'Generating aria2c command…', mAriaCopied: 'aria2c command copied to clipboard',
            mGenCurl: 'Generating cURL…', mCurlCopied: 'cURL copied to clipboard',
            mPushing: 'Pushing…', mPushed: 'Pushed to downloader: {name}{status}', mPushStatus: ' (downloader status: {s})',
            mTooBig2G: 'File exceeds 2GB, direct browser save may fail: use "RPC" or "cURL" instead. Click again to force download',
            mPreparing: 'Preparing download…', mEmptyBlob: 'Download is empty (link may be expired, re-parse first)',
            mDlDone: 'Download finished: {name}', mDlFallback: 'Downloader channel failed ({err}), fell back to browser download', mDlFail: 'Download failed',
            mGenBc: 'Generating BitComet link…', mBcCopied: 'bc:// link copied, click it in the browser to launch BitComet',
            mBcFail: 'Failed to generate BitComet link: {err}',
            mEnhNoSel: 'Please check files first (enhanced download runs one by one to avoid memory blowup)',
            mEnhCancelReq: 'Cancel requested: enhanced download stops at the next chunk boundary',
            mEnhStopping: 'Stopping enhanced download, please wait…',
            mEnhStart: 'Enhanced download started for {n} file(s) (chunked concurrent, progress in file rows and status bar)',
            mEnhCancelled: 'Enhanced download cancelled: {ok} succeeded this run', mFailPart: ', {n} failed',
            mEnhDoneN: 'Enhanced download finished: {ok} succeeded{fail}',
            mEnhNoSize: 'File size missing (parse first)',
            mEnhTooBig: 'File exceeds 2GB, browser memory cannot hold it. Use RPC / IDM / cURL instead',
            mEnhNoRange: 'Link does not support ranged download (HTTP {n}). Use Save / Web download / RPC instead',
            mStopCancel: 'Manually cancelled', mStopStall: 'Download stalled (no progress for 60s), aborted',
            mChunkHttp: 'Chunk HTTP {n}', mEnhProg: 'Enhanced dl',
            mEnhMerging: 'Enhanced download merging…', mEnhPartial: 'Some chunks failed, aborted',
            mEnhDoneFile: 'Enhanced download finished: {name}',
            mRpcNoGid: 'RPC returned no task ID', mTaskFail: 'Downloader task failed: {err}{hint}',
            m412Hint: ' (HTTP 412 = Quark CDN anti-leech check failed: __puus Cookie/signature expired. The script will re-push once with a fresh link; if it still fails, re-parse and push again, or use Web download / cURL)',
            mHintCommon: ' (common causes: download folder missing/no write permission, or link expired — re-parse and push again)',
            mRpc404: 'Wrong RPC address (HTTP 404): {url}. Check the port and path, and make sure the downloader is running',
            mRpc404Full: 'Wrong RPC address (HTTP 404): no JSON-RPC service at {url}. Check the port (aria2 default 6800, Motrix default 16800) and path (usually /jsonrpc), and make sure the downloader is running',
            mBatchInvalid: 'Invalid Aria2 batch response (HTTP {n})',
            mRpcUnauthorized: 'RPC secret wrong (Unauthorized): check the RPC key in Settings',
            mRpcNoMethod: 'Downloader does not support this method: make sure you are pushing to aria2/Motrix, not another program',
            mRpcNoResult: 'RPC response error: no result (HTTP {n}). Raw response: {raw}',
            mBatchGetting: 'Batch fetching…', mGetLinkN: 'Getting link {i}/{n}', mCopiedN: 'Copied {n} link(s)',
            mPushN: 'Pushing {i}/{n}', mPushDone: 'Push finished: {ok} succeeded{fail}',
            mBatchGet: 'Batch fetching links…', mAllLinksFail: 'All links failed to fetch, cannot push',
            mBatchPush: 'Batch pushing {n} tasks…', mRetrying: 'Retrying failed tasks…',
            mBatchDone: 'Batch push finished: {ok} succeeded{fail}',
            mGenFile: 'Generating file…', mExportN: 'Exporting {i}/{n}', mExported: 'Exported {n} item(s)',
            mHistNoLink: 'This record has no usable link', mHistCopied: 'Copied history link: {name}',
            mHistDlHint: 'Download started. If the browser does not begin, the link is likely expired (~8h validity) — regenerate it in your pan',
            mHistClearArm: 'Click "Clear history" again to confirm deleting all records', mHistCleared: 'All download history cleared',
            mPageNoDl: 'No downloadable items among checked files', mPageNoSel: 'Please check files first, or parse links first',
            mPageGen: 'Generating download page…', mPageLinkN: 'Parsing link {i}/{n}',
            mPageNoLink: 'No usable links, cannot generate the download page',
            mPageBlocked: 'Popup blocked: the download page was saved as a local HTML file, please open it manually (Cookie channel may not work in that file)',
            mPageOpened: 'Download page opened in a new tab ({n} files). Click "Download all" in it; if the browser asks "allow multiple downloads", choose Allow',
            mResetDone: 'Settings restored to defaults', mSwitched: 'Switched to {name}, address loaded automatically',
            mTesting: 'Connecting…', mIdmTest: 'ℹ IDM has no connectivity test: tasks are sent directly on push (start IDM first)',
            mTestGopeed: '✔ Connected to Gopeed', mTestAbdm: '✔ Connected to ABDM',
            mTestAria: '✔ Connected to aria2 {v}',
            mTestIncomplete: '⚠ Connected but response incomplete (empty version), push may be affected',
            mSignedAlready: 'Already signed today, come back tomorrow (capacity credited)', mSignedOk: 'Signed in! Capacity gained: {gain}',
            mSignFail: 'Sign-in failed', mInitFail: 'Init failed: {msg}', mUnknown: 'unknown',
            mAbdmPong: 'ABDM did not respond pong (HTTP {n}). Make sure ABDM is running and the port is correct',
            mGopeedAuth: 'Gopeed auth failed (HTTP {n}): copy the API token from Gopeed settings into the "Key / token" field of this script',
            mGopeed404: 'Wrong Gopeed address (HTTP 404): {url}, check the port and path',
            mGopeedErr: 'Gopeed returned an error: {msg}',
            mIdmRejected: 'IDM rejected the task (response: {body}). Make sure IDM is running with advanced browser integration enabled',
            mIdmUnreachable: 'Cannot connect to IDM (HTTP {n}): make sure IDM is running',
            mAbdmRejected: 'ABDM rejected the task (HTTP {n}){body}. Make sure ABDM is running, the port is correct, and "accept external tasks" is enabled in its settings',
            mGopeedNoId: 'Gopeed returned no task ID (HTTP {n}). Raw response: {raw}',
            mGopeedTaskFail: 'Gopeed task failed: {err}{hint}'
        }
    };
    const T = (k) => {
        const lang = (Store.get('lang') === 'en') ? I18N.en : I18N.zh;
        return (k in lang) ? lang[k] : (k in I18N.zh ? I18N.zh[k] : k);
    };
    /* 带占位符取词：TF('mLoaded', { n: 3 }) → 文案里的 {n} 被替换 */
    const TF = (k, vars) => T(k).replace(/\{(\w+)\}/g, (m0, n) => (vars && vars[n] != null) ? String(vars[n]) : '');

    /* ============================================================
     *  4. 网盘适配器
     *     统一接口：
     *       pageType()          -> 'home' | 'share' | null
     *       listFiles(kind)     -> [{ id, name, size, isDir }]
     *       getLink(file, kind) -> 'https://...'
     *       checked()           -> 页面已勾选文件（可选）
     * ============================================================ */

    /* ---------------------- 4.1 百度网盘 ---------------------- */
    const Baidu = {
        key: 'baidu',
        name: '百度网盘',
        color: '#06a7ff',
        referer: REFERER.baidu,

        pageType() {
            if (!/(^|\.)(pan|yun)\.baidu\.com$/.test(location.hostname)) return null;
            if (/^\/s\//.test(location.pathname) || /\/share\//.test(location.pathname)) return 'share';
            return 'home';
        },

        yun() {
            try {
                const w = unsafeWindow;
                return w.yunData || w.locals && w.locals.yunData || {};
            } catch (e) { return {}; }
        },

        logId() {
            let s = '';
            const chars = 'ABCDEF0123456789';
            for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * 16));
            return s;
        },

        /* 分享页：URL 带 pwd 时自动填入提取码 */
        async autoUnlock() {
            const pwd = U.qs('pwd') || U.qs('password');
            if (!pwd) return;
            for (let i = 0; i < 12; i++) {
                const input = document.querySelector('#accessCode, input[name="accessCode"], .access-code-input input');
                if (input && !input.value) {
                    input.value = pwd;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    const btn = document.querySelector('#submitBtn, .g-button-blue, button[class*="submit"]');
                    if (btn) btn.click();
                    await U.sleep(600);
                    return;
                }
                await U.sleep(400);
            }
        },

        /* 页面已勾选（百度自身 AMD 模块） */
        checked() {
            try {
                const w = unsafeWindow;
                const req = w.require || window.require;
                if (typeof req !== 'function') return [];
                const isShare = this.pageType() === 'share';
                const mod = isShare
                    ? 'disk-share:widget/pageModule/list/listInit.js'
                    : 'disk-system:widget/pageModule/list/listInit.js';
                const items = req(mod).getCheckedItems() || [];
                return items.filter(i => +i.isdir !== 1).map(i => ({
                    id: String(i.fs_id),
                    name: i.server_filename || i.filename || '未命名文件',
                    size: Number(i.size) || 0,
                    isDir: false
                }));
            } catch (e) { return []; }
        },

        async listFiles(kind) {
            const y = this.yun();

            if (kind === 'share') {
                if (y.SHAREPAGETYPE === 'single_file_page' && y.FILEINFO) {
                    const f = y.FILEINFO;
                    return [{ id: String(f.fs_id), name: f.server_filename || f.filename || '未命名文件', size: Number(f.size) || 0, isDir: false }];
                }
                if (!y.SHARE_ID || !y.SHARE_UK) throw new Error(T('mBdShareInfo'));

                const dir = U.hashPath();
                const url = 'https://pan.baidu.com/share/list?uk=' + y.SHARE_UK +
                    '&shareid=' + y.SHARE_ID +
                    '&order=other&desc=1&showempty=0&web=1&page=1&num=1000' +
                    '&dir=' + encodeURIComponent(dir) +
                    '&t=' + Date.now() + '&channel=chunlei&app_id=250528';

                const res = await Net.get(url, { 'User-Agent': Store.get('ua') });
                const d = res.data || {};
                if (d.errno === -9) throw new Error(T('mBdPwdErr'));
                if (d.errno === 112) throw new Error(T('mPageExpired'));
                if (d.errno !== 0) throw new Error(TF('mListFail', { n: d.errno }));

                return (d.list || []).map(i => ({
                    id: String(i.fs_id),
                    name: i.server_filename || '未命名文件',
                    size: Number(i.size) || 0,
                    isDir: +i.isdir === 1
                }));
            }

            /* 我的网盘：新版页面（/disk/main）已无 yunData 全局，改为接口现取 bdstoken */
            const bdstoken = y.MYBDSTOKEN || y.mybdstoken || await this.fetchBdstoken();
            const dir = U.hashPath();
            const url = 'https://pan.baidu.com/api/list?order=name&desc=0&showempty=0&web=1&page=1&num=1000' +
                '&dir=' + encodeURIComponent(dir) +
                '&t=' + Date.now() + '&channel=chunlei&app_id=250528&bdstoken=' + encodeURIComponent(bdstoken);

            const res = await Net.get(url, { 'User-Agent': Store.get('ua') }, { credentials: true });
            const d = res.data || {};
            if (d.errno === -6) throw new Error(T('mBdLogin'));
            if (d.errno !== 0) throw new Error(TF('mListFail', { n: d.errno }));

            return (d.list || []).map(i => ({
                id: String(i.fs_id),
                name: i.server_filename || '未命名文件',
                size: Number(i.size) || 0,
                isDir: +i.isdir === 1
            }));
        },

        /* 取 bdstoken：优先读页面全局 window.locals（新版页面自带，零请求），失败再走接口 */
        async fetchBdstoken() {
            try {
                const w = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
                const quick = w && w.locals && w.locals.userInfo && w.locals.userInfo.bdstoken;
                if (quick) return quick;
            } catch (e) { /* 跨域沙箱读不到则走接口 */ }
            const res = await Net.get(
                'https://pan.baidu.com/api/gettemplatevariable?clienttype=0&app_id=250528&web=1&channel=chunlei&fields='
                    + encodeURIComponent('["bdstoken"]'),
                { 'User-Agent': Store.get('ua') },
                { credentials: true }
            );
            const d = res.data || {};
            if (d.errno === -6) throw new Error(T('mBdNoToken'));
            if (d && d.errno === 0 && d.result && d.result.bdstoken) return d.result.bdstoken;
            throw new Error(TF('mBdTokenFail', { n: d && d.errno }));
        },

        /* ---- 开放平台 access_token 通道（借鉴 网盘直链下载助手 / VIP工具箱，用于 Cookie 下载授权被风控时） ---- */
        authorizeUrl() {
            return 'https://openapi.baidu.com/oauth/2.0/authorize?client_id=IlLqBbU3GjQ0t46TRwFateTprHWl39zF' +
                '&response_type=token&redirect_uri=oob&scope=basic,netdisk';
        },

        /* 在 openapi.baidu.com/oauth/* 页面上：抓 token / 自动点授权按钮 / 抓到后存 GM 并关页 */
        captureTokenPage() {
            const grab = () => {
                const text = location.href + ' ' + (document.body ? document.body.textContent : '');
                const m = text.match(/access_token=([^&\s"'<>]+)/);
                if (m) {
                    GM_setValue('dlm_baidu_token', { t: m[1], ts: Date.now() });
                    document.title = '✔ 百度授权成功，可关闭此页';
                    setTimeout(() => { try { window.close(); } catch (e) { /* 某些浏览器不允许脚本关页 */ } }, 1500);
                    return true;
                }
                return false;
            };
            if (grab()) return;
            const consent = () => {
                const els = document.querySelectorAll('button, input[type=submit], a');
                for (const el of els) {
                    if (/授权|同意/.test(el.textContent || el.value || '')) { el.click(); return true; }
                }
                return false;
            };
            let tries = 0;
            const timer = setInterval(() => {
                tries++;
                if (grab()) { clearInterval(timer); return; }
                if (tries === 2) consent();
                if (tries > 60) {
                    clearInterval(timer);
                    document.title = '百度授权未完成，请关闭此页重试';
                }
            }, 1000);
        },

        async accessToken() {
            const saved = GM_getValue('dlm_baidu_token', null);
            if (saved && saved.t && Date.now() - saved.ts < 25 * 864e5) return saved.t; /* token 有效期 30 天，提前 5 天刷新 */
            const res = await Net.get(this.authorizeUrl(), {}, { raw: true });
            const text = typeof res.raw === 'string' ? res.raw : '';
            const m = text.match(/access_token=([^&\s"'<>]+)/);
            if (m) {
                GM_setValue('dlm_baidu_token', { t: m[1], ts: Date.now() });
                return m[1];
            }
            /* 授权页需要用户确认：后台开页，脚本会在那页自动完成授权 */
            UI.toast(T('mBdAuthOpen'), 'ok');
            GM_openInTab(this.authorizeUrl(), { active: false, setParent: true });
            for (let i = 0; i < 90; i++) {
                await U.sleep(1000);
                const t = GM_getValue('dlm_baidu_token', null);
                if (t && t.t) return t.t;
            }
            throw new Error(T('mBdAuthTimeout'));
        },

        async getLink(file, kind) {
            if (kind === 'share') return this.shareLink(file);
            return this.homeLink(file);
        },

        async shareLink(file) {
            const y = this.yun();
            if (!y.SIGN || !y.TIMESTAMP) throw new Error(T('mBdNoSign'));

            const fd = new FormData();
            fd.append('encrypt', '0');
            fd.append('product', 'share');
            fd.append('uk', String(y.SHARE_UK || ''));
            fd.append('primaryid', String(y.SHARE_ID || ''));
            fd.append('fid_list', JSON.stringify([Number(file.id)]));

            /* 加密分享：必须带 sekey */
            if (y.SHARE_PUBLIC !== 1) {
                const sekey = decodeURIComponent(U.cookie('BDCLND') || '');
                if (!sekey) throw new Error(T('mBdNoSekey'));
                fd.append('extra', JSON.stringify({ sekey }));
            }

            const url = 'https://pan.baidu.com/api/sharedownload?channel=chunlei&clienttype=12&web=1&app_id=250528' +
                '&sign=' + encodeURIComponent(y.SIGN) + '&timestamp=' + y.TIMESTAMP + '&logid=' + this.logId();

            const res = await Net.postForm(url, fd, { 'User-Agent': Store.get('ua') });
            const d = res.data || {};
            if (d.errno === 112) throw new Error(T('mPageExpired'));
            if (d.errno !== 0) throw new Error(TF('mBdLinkFailShare', { n: d.errno }));
            const item = (d.list || [])[0];
            if (!item || !item.dlink) throw new Error(T('mBdLimited'));
            return item.dlink;
        },

        /* ---- locatedownload 通道（借鉴 百度网盘直链下载助手/百万修改版）：纯网页 Cookie，
                不走 xpan 开放平台，风控逻辑独立，作为 9019 后的第二兜底 ---- */
        async locateLink(path) {
            const token = await this.fetchBdstoken();
            const url = 'https://pan.baidu.com/api/locatedownload?clienttype=0&app_id=250528&web=1' +
                '&channel=chunlei&origin=pdf&use=1&bdstoken=' + encodeURIComponent(token) +
                '&path=' + encodeURIComponent(path);
            const res = await Net.get(url, {
                'User-Agent': Store.get('ua'),
                'Referer': 'https://pan.baidu.com/',
                'X-Requested-With': 'XMLHttpRequest'
            }, { credentials: true });
            const d = res.data || {};
            if (d.errno && d.errno !== 0) throw new Error(TF('mBdLocateFail', { n: d.errno }));
            const link = (d.dlink) || (d.data && d.data.dlink) || '';
            if (!link) throw new Error(T('mBdLocateNoLink'));
            return link;
        },

        /* filemanager 重命名（PDF格式妙招用：临时改名骗接口，下载后恢复） */
        async renameFile(fileId, path, newName) {
            const token = await this.fetchBdstoken();
            const url = 'https://pan.baidu.com/api/filemanager?async=2&onnest=fail&opera=rename' +
                '&clienttype=0&app_id=250528&web=1&bdstoken=' + encodeURIComponent(token);
            const filelist = JSON.stringify([{ id: String(fileId), path, newname: newName }]);
            const res = await Net.request({
                method: 'POST',
                url,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': Store.get('ua'),
                    'Referer': 'https://pan.baidu.com/',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                data: 'filelist=' + encodeURIComponent(filelist),
                timeout: 10000,
                credentials: true
            });
            const d = res.data || {};
            if (d.errno !== 0) throw new Error(TF('mBdRenameFail', { n: d.errno }));
        },

        async homeLink(file) {
            /* 主通道：网页 Cookie + filemetas */
            const fsids = encodeURIComponent(JSON.stringify([Number(file.id)]));
            const mkUrl = (token) => 'https://pan.baidu.com/rest/2.0/xpan/multimedia?method=filemetas&dlink=1&fsids=' + fsids +
                '&app_id=250528&web=1&clienttype=0' + (token ? '&access_token=' + encodeURIComponent(token) : '');
            const parse = (d) => {
                if (d.errno === -6) throw new Error(T('mLoginExpired'));
                const item = (d.list || [])[0];
                if (!item || !item.dlink) throw new Error(T('mNoLinkMember'));
                return item.dlink;
            };

            let res = await Net.get(mkUrl(), { 'User-Agent': Store.get('ua') }, { credentials: true });
            let d = res.data || {};
            if (d.errno !== 0 && d.errno !== 9019) {
                if (d.errno === -6) throw new Error(T('mLoginExpired'));
                throw new Error(TF('mBdLinkFail', { n: d.errno }));
            }

            /* 9019 = 网页下载授权被风控 → 先试 locatedownload（纯 Cookie 通道，与开放平台风控独立），
               再退到 OAuth access_token 通道 */
            if (d.errno === 9019) {
                /* locatedownload 需要"目录/文件名"全路径 */
                const dir = U.hashPath();
                const origPath = (dir === '/' ? '' : dir) + '/' + file.name;

                try {
                    const link = await this.locateLink(origPath);
                    UI.toast(T('mBd9019Ok'), 'ok');
                    return link;
                } catch (err1) {
                    console.warn('[CLM][百度] locatedownload 兜底失败：', err1.message);
                }

                /*PDF格式妙招（设置开关，默认关）：临时改名为 .pdf 再试一次 locatedownload，
                   无论成败都在 finally 里恢复原文件名 */
                if (Store.get('baiduPdfTrick') && !/\.pdf$/i.test(file.name)) {
                    try {
                        await this.renameFile(file.id, origPath, file.name + '.pdf');
                        await U.sleep(1200);
                        const link = await this.locateLink(origPath + '.pdf');
                        UI.toast(T('mBdPdfOk'), 'ok');
                        return link;
                    } catch (err2) {
                        console.warn('[CLM][百度]PDF格式妙招失败：', err2.message);
                    } finally {
                        try {
                            await this.renameFile(file.id, origPath + '.pdf', file.name);
                        } catch (e3) {
                            console.error('[CLM][百度] 恢复文件名失败，请手动改回：', e3.message);
                            UI.toast(TF('mBdPdfRestore', { name: file.name }), 'err');
                        }
                    }
                }

                /* 最后兜底：开放平台 OAuth access_token 通道 */
                const token = await this.accessToken();
                res = await Net.get(mkUrl(token), { 'User-Agent': 'pan.baidu.com' }, { credentials: true });
                d = res.data || {};
                const link = parse(d);
                return link + '&access_token=' + token;
            }
            return parse(d);
        }
    };

    /* ---------------------- 4.2 阿里云盘 ---------------------- */
    const Ali = {
        key: 'ali',
        name: '阿里云盘',
        color: '#ff6a00',
        referer: REFERER.ali,

        api() {
            return /aliyundrive\.com$/.test(location.hostname) ? 'https://api.aliyundrive.com' : 'https://api.alipan.com';
        },

        pageType() {
            if (!/(^|\.)(alipan|aliyundrive)\.com$/.test(location.hostname)) return null;
            return /^\/s\//.test(location.pathname) ? 'share' : 'home';
        },

        token() {
            const t = U.storage('token');
            if (!t || !t.access_token) throw new Error(T('mAliNoToken'));
            return t;
        },

        shareToken() {
            const s = U.storage('shareToken');
            if (!s || !s.share_token) throw new Error(T('mAliNoShareToken'));
            return s;
        },

        headers(kind) {
            const h = {
                'Content-Type': 'application/json;charset=UTF-8',
                'x-canary': 'client=windows,app=adrive,version=v6.0.0',
                'Referer': REFERER.ali
            };
            if (kind === 'share') {
                h['x-share-token'] = this.shareToken().share_token;
            } else {
                const t = this.token();
                h['Authorization'] = (t.token_type || 'Bearer') + ' ' + t.access_token;
            }
            return h;
        },

        async listFiles(kind) {
            const body = {
                limit: 200,
                order_by: 'name',
                order_direction: 'ASC',
                parent_file_id: 'root',
                fields: '*'
            };
            if (kind === 'share') {
                const s = this.shareToken();
                body.share_id = s.share_id;
                body.share_token = s.share_token;
            } else {
                body.drive_id = this.token().default_drive_id;
                body.image_thumbnail_process = 'image/resize,w_160/format,jpg';
                body.video_thumbnail_process = 'video/snapshot,t_1000,f_jpg,ar_auto,w_300';
            }
            const res = await Net.postJSON(this.api() + '/adrive/v2/file/list', body, this.headers(kind));
            const d = res.data || {};
            if (d.code) throw new Error(d.message || TF('mAliListFail', { n: d.code }));
            return (d.items || []).map(i => ({
                id: i.file_id,
                name: i.name,
                size: Number(i.size) || 0,
                isDir: i.type === 'folder',
                extra: i
            }));
        },

        async getLink(file, kind) {
            const body = { file_id: file.id, expire_sec: 900 };
            if (kind === 'share') {
                body.share_id = this.shareToken().share_id;
            } else {
                body.drive_id = this.token().default_drive_id;
            }
            const res = await Net.postJSON(this.api() + '/adrive/v2/file/get_download_url', body, this.headers(kind));
            const d = res.data || {};
            if (d.code && d.code !== 'AccessTokenInvalid') throw new Error(d.message || TF('mAliLinkFail', { n: d.code }));
            if (d.code === 'AccessTokenInvalid') throw new Error(T('mAliTokenInvalid'));
            if (!d.url) throw new Error(T('mNoLink'));
            return d.url;
        },

        /* 阿里网页勾选：优先读 React 树中的选中项 */
        checked() { return []; }
    };

    /* 共享：React fiber 上溯找文件记录（夸克/UC/123 勾选解析共用）。
       pred 用于各家字段名不同时的匹配：夸克/UC 认 fid，123 认 FileId */
    function reactFileRecord(dom, pred) {
        const key = Object.keys(dom).find(k => k.indexOf('__reactFiber$') === 0 || k.indexOf('__reactInternalInstance$') === 0);
        if (!key) return null;
        let fiber = dom[key], depth = 0;
        while (fiber && depth < 25) {
            const props = fiber.memoizedProps || fiber.pendingProps;
            const cands = [];
            /* 一层扫 record/file/item/data/node，二层扫 dataSource/files（123 的 antd 表格把列表挂在表级） */
            Object.keys(props || {}).forEach(k => {
                const v = props[k];
                if (v && typeof v === 'object') {
                    if (pred(v)) cands.push(v);
                    else if (Array.isArray(v)) v.forEach(x => { if (x && typeof x === 'object' && pred(x)) cands.push(x); });
                }
            });
            if (cands.length) return cands[0];
            fiber = fiber.return;
            depth++;
        }
        return null;
    }

    /* ---------------------- 4.3 夸克网盘 ---------------------- */
    const Quark = {
        key: 'quark',
        name: '夸克网盘',
        color: '#ff4d4f',
        referer: REFERER.quark,
        base: 'https://drive.quark.cn/1/clouddrive',

        pageType() {
            if (!/(^|\.)quark\.cn$/.test(location.hostname)) return null;
            return /\/s\//.test(location.pathname) ? 'share' : 'home';
        },

        shareId() {
            const m = location.pathname.match(/\/s\/([a-zA-Z0-9]+)/);
            return m ? m[1] : '';
        },

        passcode() {
            return U.qs('pwd') || U.qs('passcode') || '';
        },

        headers(kind) {
            const h = {
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': QUARK_UA,
                'Referer': REFERER.quark
            };
            return h;
        },

        async stoken() {
            const pwdId = this.shareId();
            if (!pwdId) throw new Error(T('mNoShareId'));
            const res = await Net.postJSON(
                this.base + '/share/sharepage/token?pr=ucpro&fr=pc',
                { pwd_id: pwdId, passcode: this.passcode() },
                this.headers('share')
            );
            const d = res.data || {};
            if (d.code === 41004) throw new Error(T('mPwdWrong'));
            if (d.code !== 0 || !d.data || !d.data.stoken) {
                throw new Error(d.message || TF('mShareTokenFail', { n: d.code }));
            }
            this._stoken = d.data.stoken;
            return d.data.stoken;
        },

        async listFiles(kind) {
            if (kind === 'share') {
                const stoken = await this.stoken();
                const pwdId = this.shareId();
                /* pdir_fid 优先取页面自身请求捕获的当前目录，跟随用户在分享页点进的文件夹 */
                const pdir = Captured.quarkShareFid || '0';
                const url = this.base + '/share/sharepage/detail?pr=ucpro&fr=pc' +
                    '&pwd_id=' + encodeURIComponent(pwdId) +
                    '&stoken=' + encodeURIComponent(stoken) +
                    '&pdir_fid=' + encodeURIComponent(pdir) +
                    '&force=0&_page=1&_size=200&_fetch_banner=0&_fetch_share=1&_fetch_total=1' +
                    '&_sort=file_type:asc,file_name:asc';
                const res = await Net.get(url, this.headers('share'));
                const d = res.data || {};
                if (d.code !== 0) throw new Error(d.message || TF('mShareListFail', { n: d.code }));
                return ((d.data && d.data.list) || []).map(i => ({
                    id: i.fid,
                    name: i.file_name,
                    size: Number(i.size) || 0,
                    isDir: i.dir === true || i.file_type === 0,
                    extra: i
                }));
            }

            /* pdir_fid 跟随页面：捕获到你在夸克页面点进的目录就用它，捕获不到回落根目录 */
            const pdirFid = Captured.quarkFid || '0';
            const url = this.base + '/file/sort?pr=ucpro&fr=pc&uc_param_str=&pdir_fid=' + encodeURIComponent(pdirFid) +
                '&_page=1&_size=200&_fetch_total=1&_fetch_sub_dirs=0' +
                '&_sort=file_type:asc,updated_at:desc';
            const res = await Net.get(url, this.headers('home'));
            const d = res.data || {};
            if (d.code === 31001) throw new Error(T('mQuarkLogin'));
            if (d.code !== 0) throw new Error(d.message || TF('mListFailCode', { n: d.code }));
            return ((d.data && d.data.list) || []).map(i => ({
                id: i.fid,
                name: i.file_name,
                size: Number(i.size) || 0,
                isDir: i.dir === true || i.file_type === 0,
                extra: i
            }));
        },

        async getLink(file, kind) {
            if (kind === 'share') {
                const stoken = this._stoken || await this.stoken();
                const res = await Net.postJSON(
                    this.base + '/share/sharepage/download?pr=ucpro&fr=pc',
                    { fids: [file.id], pwd_id: this.shareId(), stoken },
                    this.headers('share')
                );
                const d = res.data || {};
                if (d.code !== 0) throw new Error(d.message || TF('mLinkFailSave', { n: d.code }));
                const item = (d.data || [])[0];
                if (!item || !item.download_url) throw new Error(T('mNoLink'));
                return item.download_url;
            }

            const res = await Net.postJSON(
                this.base + '/file/download?pr=ucpro&fr=pc',
                { fids: [file.id] },
                this.headers('home')
            );
            const d = res.data || {};
            if (d.code === 31001) throw new Error(T('mQuarkLogin'));
            if (d.code !== 0) throw new Error(d.message || TF('mLinkFailCode', { n: d.code }));
            const item = (d.data || [])[0];
            if (!item || !item.download_url) throw new Error('接口未返回直链');
            return item.download_url;
        },

        /* 页面勾选：从 React fiber 上取 fid（源自夸克直链助手思路） */
        checked() {
            const out = new Map();
            const boxes = document.querySelectorAll('.ant-checkbox-wrapper-checked, .file-item-selected, [aria-checked="true"]');
            boxes.forEach(box => {
                if (box.closest('.ant-table-thead') || box.closest('.list-head')) return;
                const rec = this.fiberRecord(box);
                if (rec && rec.fid) out.set(rec.fid, {
                    id: rec.fid,
                    name: rec.file_name || rec.name || '未命名文件',
                    size: Number(rec.size) || 0,
                    isDir: rec.dir === true
                });
            });
            return Array.from(out.values());
        },

        fiberRecord(dom) {
            return reactFileRecord(dom, r => typeof r.fid === 'string' && r.fid.length > 0);
        },

        /* 夸克签到领容量（借鉴 【玩的嗨】VIP工具箱）：GET info 查状态 → POST sign 领取 */
        async capacitySign() {
            const common = { 'Accept': 'application/json', 'Referer': REFERER.quark };
            const info = await Net.get('https://drive-m.quark.cn/1/clouddrive/capacity/growth/info?pr=ucpro&fr=pc&uc_param_str', common, { credentials: true });
            const infoD = info.data || {};
            if (infoD.code !== 0) throw new Error(TF('mSignInfoFail', { n: infoD.code }));
            const signed = infoD.data && (infoD.data.firstSign === false && infoD.data.signed === true || infoD.data.signed === true);
            if (signed) return { already: true };
            const fd = new FormData();
            fd.append('sign_cyclic', 'true');
            const r = await Net.postForm('https://drive-m.quark.cn/1/clouddrive/capacity/growth/sign?pr=ucpro&fr=pc&uc_param_str', fd, common);
            const d = r.data || {};
            if (d.code !== 0) throw new Error(TF('mSignFailCode', { n: d.code, msg: d.message || '' }));
            return { already: false, gain: d.data && (d.data.gainCapacity || d.data.totalGrowth) };
        }
    };

    /* ---------------------- 4.3b UC 网盘 ----------------------
       UC 与夸克同一底座（clouddrive 架构，UC 事业群），接口同构，
       仅域名换 pc-api.uc.cn、平台标识 pr=UCBrowser（借鉴 LinkSwift）。
       直链 CDN 同样带 __puus 式 Cookie 防盗链 → 复用夸克的
       Cookie 重排序 + 412 自动重推机制（见 App.headers / pushRpc）。 */
    const Uc = {
        key: 'uc',
        name: 'UC网盘',
        color: '#ffb800',
        referer: REFERER.uc,
        base: 'https://pc-api.uc.cn/1/clouddrive',

        pageType() {
            if (!/(^|\.)uc\.cn$/.test(location.hostname)) return null;
            return /\/s\//.test(location.pathname) ? 'share' : 'home';
        },

        shareId() {
            const m = location.pathname.match(/\/s\/([a-zA-Z0-9]+)/);
            return m ? m[1] : '';
        },

        passcode() {
            return U.qs('pwd') || U.qs('passcode') || '';
        },

        headers(kind) {
            return {
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': Store.get('ua'),
                'Referer': REFERER.uc
            };
        },

        async stoken() {
            const pwdId = this.shareId();
            if (!pwdId) throw new Error(T('mNoShareId'));
            const res = await Net.postJSON(
                this.base + '/share/sharepage/token?pr=UCBrowser&fr=pc',
                { pwd_id: pwdId, passcode: this.passcode() },
                this.headers('share')
            );
            const d = res.data || {};
            if (d.code === 41004) throw new Error(T('mPwdWrong'));
            if (d.code !== 0 || !d.data || !d.data.stoken) {
                throw new Error(d.message || TF('mShareTokenFail', { n: d.code }));
            }
            this._stoken = d.data.stoken;
            return d.data.stoken;
        },

        async listFiles(kind) {
            const pdirFid = kind === 'share' ? (Captured.ucShareFid || '0') : (Captured.ucFid || '0');
            if (kind === 'share') {
                const stoken = await this.stoken();
                const pwdId = this.shareId();
                const url = this.base + '/share/sharepage/detail?pr=UCBrowser&fr=pc' +
                    '&pwd_id=' + encodeURIComponent(pwdId) +
                    '&stoken=' + encodeURIComponent(stoken) +
                    '&pdir_fid=' + encodeURIComponent(pdirFid) +
                    '&force=0&_page=1&_size=200&_fetch_banner=0&_fetch_share=1&_fetch_total=1' +
                    '&_sort=file_type:asc,file_name:asc';
                const res = await Net.get(url, this.headers('share'));
                const d = res.data || {};
                if (d.code !== 0) throw new Error(d.message || TF('mShareListFail', { n: d.code }));
                return ((d.data && d.data.list) || []).map(i => ({
                    id: i.fid,
                    name: i.file_name,
                    size: Number(i.size) || 0,
                    isDir: i.dir === true || i.file_type === 0,
                    extra: i
                }));
            }

            const url = this.base + '/file/sort?pr=UCBrowser&fr=pc&uc_param_str=&pdir_fid=' + encodeURIComponent(pdirFid) +
                '&_page=1&_size=200&_fetch_total=1&_fetch_sub_dirs=0' +
                '&_sort=file_type:asc,updated_at:desc';
            const res = await Net.get(url, this.headers('home'), { credentials: true });
            const d = res.data || {};
            if (d.code === 31001) throw new Error(T('mUcLogin'));
            if (d.code !== 0) throw new Error(d.message || TF('mListFailCode', { n: d.code }));
            return ((d.data && d.data.list) || []).map(i => ({
                id: i.fid,
                name: i.file_name,
                size: Number(i.size) || 0,
                isDir: i.dir === true || i.file_type === 0,
                extra: i
            }));
        },

        async getLink(file, kind) {
            if (kind === 'share') {
                const stoken = this._stoken || await this.stoken();
                const res = await Net.postJSON(
                    this.base + '/share/sharepage/download?pr=UCBrowser&fr=pc',
                    { fids: [file.id], pwd_id: this.shareId(), stoken },
                    this.headers('share')
                );
                const d = res.data || {};
                if (d.code !== 0) throw new Error(d.message || TF('mLinkFailSave', { n: d.code }));
                const item = (d.data || [])[0];
                if (!item || !item.download_url) throw new Error(T('mNoLink'));
                return item.download_url;
            }

            const res = await Net.postJSON(
                this.base + '/file/download?pr=UCBrowser&fr=pc',
                { fids: [file.id] },
                this.headers('home')
            );
            const d = res.data || {};
            if (d.code === 31001) throw new Error(T('mUcLogin'));
            if (d.code !== 0) throw new Error(d.message || TF('mLinkFailCode', { n: d.code }));
            const item = (d.data || [])[0];
            if (!item || !item.download_url) throw new Error('接口未返回直链');
            return item.download_url;
        },

        /* 页面勾选：UC 同为 React + antd，复用夸克同款 fiber 取值 */
        checked() {
            const out = new Map();
            const boxes = document.querySelectorAll('.ant-checkbox-wrapper-checked, .file-item-selected, [aria-checked="true"]');
            boxes.forEach(box => {
                if (box.closest('.ant-table-thead') || box.closest('.list-head')) return;
                const rec = reactFileRecord(box, r => r.fid);
                if (rec && rec.fid) out.set(rec.fid, {
                    id: rec.fid,
                    name: rec.file_name || rec.name || '未命名文件',
                    size: Number(rec.size) || 0,
                    isDir: rec.dir === true
                });
            });
            return Array.from(out.values());
        }
    };

    /* ============================================================
     *  天翼云盘（cloud.189.cn）—— 借鉴 Aruelius/cloud189 CLI 逆向成果：
     *  网页接口仅依赖登录 Cookie，无需签名/加密（签名仅上传需要）。
     *  列表：/api/open/file/listFiles.action（fileListAO.folderList/fileList，count 判分页）
     *  直链：/v2/getFileInfo.action?fileId=x → downloadUrl（//开头需补协议）
     *  分享页直链提取流程复杂，第一版引导用户先转存到自己的网盘。
     * ============================================================ */
    const Cloud189 = {
        key: 'cloud189',
        name: '天翼云盘',
        color: '#e60012',
        referer: REFERER.cloud189,
        base: 'https://cloud.189.cn',

        pageType() {
            if (!/(^|\.)cloud\.189\.cn$/.test(location.hostname)) return null;
            return /\/(t|s)\//.test(location.pathname) ? 'share' : 'home';
        },

        headers(kind) {
            return {
                'User-Agent': Store.get('ua'),
                'Referer': REFERER.cloud189,
                'Accept': 'application/json;charset=UTF-8'
            };
        },

        /* 目录跟随：Captured 捕获你在天翼页面点进的目录 folderId；根目录 fid = -11 */
        currentFid() { return Captured.c189Fid || '-11'; },

        errText(d, fallback) {
            const code = d && (d.errorCode || d.code);
            if (code === 'InvalidSessionKey') return '登录态失效，请重新登录天翼云盘';
            if (code) return fallback + '（' + code + '）';
            return fallback;
        },

        async listFiles(kind) {
            if (kind === 'share') {
                throw new Error(T('mC189Share'));
            }
            const fid = this.currentFid();
            const all = [];
            let pageNum = 1;
            for (;;) {
                const url = this.base + '/api/open/file/listFiles.action?folderId=' + encodeURIComponent(fid) +
                    '&pageNum=' + pageNum + '&pageSize=60&iconOption=5&mediaType=0' +
                    '&orderBy=lastOpTime&descending=true&noCache=' + Math.random();
                const res = await Net.get(url, this.headers('home'), { credentials: true });
                const d = res.data || {};
                if (d.errorCode) throw new Error(this.errText(d, T('mC189ListFail')));
                const ao = d.fileListAO || {};
                const folders = ao.folderList || [];
                const files = ao.fileList || [];
                folders.forEach(i => all.push({
                    id: i.id, name: i.name, size: 0, isDir: true, extra: i
                }));
                files.forEach(i => all.push({
                    id: i.id, name: i.name, size: Number(i.size) || 0, isDir: false, extra: i
                }));
                const count = Number(ao.count) || (folders.length + files.length);
                if (pageNum * 60 >= count || pageNum >= 8) break;
                pageNum++;
                await U.sleep(400); /* 官方 CLI 同款防限流间隔 */
            }
            return all;
        },

        async getLink(file, kind) {
            const res = await Net.get(
                this.base + '/v2/getFileInfo.action?fileId=' + encodeURIComponent(String(file.id)),
                this.headers('home'),
                { credentials: true }
            );
            const d = res.data || {};
            let u = d.downloadUrl || d.fileDownloadUrl || '';
            if (!u) throw new Error(this.errText(d, T('mC189NoLink')));
            if (u.indexOf('//') === 0) u = 'https:' + u;
            return u;
        }
    };

    /* ============================================================
     *  迅雷云盘（pan.xunlei.com）—— 实验性支持。
     *  借鉴 网盘直链下载助手：复用页面登录态写入的 localStorage
     *  （credentials_* / captcha_* / deviceid），无需逆向签名流程。
     *  列表/直链走 drive/v1 接口，需 x-captcha-token（页面会自行刷新）。
     * ============================================================ */
    const Xunlei = {
        key: 'xunlei',
        name: '迅雷云盘',
        color: '#0b76d1',
        referer: REFERER.xunlei,
        base: 'https://api-pan.xunlei.com/drive/v1',

        pageType() {
            if (!/(^|\.)pan\.xunlei\.com$/.test(location.hostname)) return null;
            return /\/s\//.test(location.pathname) ? 'share' : 'home';
        },

        /* 从页面 localStorage 取登录凭据（迅雷页面自身的登录/验证码流程会写入） */
        cred() {
            const out = { credentials: null, captcha: null, deviceid: '' };
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (!out.credentials && /^credentials_/.test(k)) {
                        try { out.credentials = JSON.parse(localStorage.getItem(k)); } catch (e) { /* 跳过脏数据 */ }
                    }
                    if (!out.captcha && /^captcha_[\w]{16}/.test(k)) {
                        try { out.captcha = JSON.parse(localStorage.getItem(k)); } catch (e) { /* 跳过脏数据 */ }
                    }
                }
                const m = /(\w{32})/.exec(String(localStorage.getItem('deviceid') || ''));
                out.deviceid = m ? m[1] : '';
            } catch (e) { /* localStorage 不可用时静默 */ }
            return out;
        },

        headers(kind) {
            const c = this.cred();
            const h = { 'Content-Type': 'application/json;charset=UTF-8', 'Referer': REFERER.xunlei };
            if (c.credentials && c.credentials.access_token) {
                h['Authorization'] = (c.credentials.token_type || 'Bearer') + ' ' + c.credentials.access_token;
            }
            if (c.captcha && c.captcha.token) h['x-captcha-token'] = c.captcha.token;
            if (c.deviceid) h['x-device-id'] = c.deviceid;
            return h;
        },

        /* 目录跟随：捕获页面请求里的 parent_file_id（根目录 0） */
        currentFid() { return Captured.xlFid || '0'; },

        errText(d) {
            const e = String((d && d.error) || '');
            let msg = (d && d.error_description) || e || '未知错误';
            if (e === 'captcha_invalid') msg += '（验证码凭据过期：请在迅雷页面随便点一下/刷新，让页面自行生成新凭据后重试）';
            if (e === 'permission_denied') msg += '（无权限：请确认已登录迅雷云盘）';
            return msg;
        },

        async listFiles(kind) {
            if (kind === 'share') {
                throw new Error(T('mXlShare'));
            }
            const c = this.cred();
            if (!c.credentials || !c.credentials.access_token) {
                throw new Error('未取到迅雷登录凭据：请先登录 pan.xunlei.com 并刷新页面（实验性通道依赖页面登录态）');
            }
            const filters = encodeURIComponent('{"phase":{"in":["PHASE_TYPE_COMPLETE"]},"trashed":{"eq":false}}');
            const url = this.base + '/files?parent_file_id=' + encodeURIComponent(this.currentFid()) +
                '&parent_type=drive&limit=100&filters=' + filters + '&with_audit=false';
            const res = await Net.get(url, this.headers('home'));
            const d = res.data || {};
            if (d.error) throw new Error('迅雷接口错误：' + this.errText(d));
            return ((d.files) || []).map(i => ({
                id: i.id,
                name: i.name,
                size: Number(i.size) || 0,
                isDir: i.kind !== 'drive#file',
                extra: i
            }));
        },

        /* 直链多候选链（借鉴 迅雷云盘直链 xndeye）：
           web_content_link → medias 原画 → 其他 medias 转码 → links.primary
           —— 视频文件经常不返回 web_content_link，只有 medias 媒体直链 */
        pickLink(d) {
            const media = Array.isArray(d.medias)
                ? d.medias.filter(m => m && m.link && m.link.url && !m.need_more_quota)
                : [];
            const origin = media.find(m => m.category === 'category_origin');
            const cands = [
                d.web_content_link,
                origin && origin.link && origin.link.url,
                ...media.map(m => m.link.url),
                d.links && d.links.primary && d.links.primary.url
            ];
            for (const c of cands) {
                if (typeof c !== 'string' || !/^https?:\/\//i.test(c)) continue;
                return c;
            }
            return '';
        },

        async getLink(file, kind) {
            const res = await Net.get(
                this.base + '/files/' + encodeURIComponent(String(file.id)) + '?with_audit=true&with_url=true',
                this.headers('home')
            );
            const d = res.data || {};
            if (d.error) throw new Error('迅雷直链失败：' + this.errText(d));
            const url = this.pickLink(d);
            if (!url) throw new Error('接口未返回直链（可能需要会员权限、文件未完成转存或已被和谐）');
            return url;
        },

        /* 子目录列表（分页 page_token） */
        async children(folderId) {
            const filters = encodeURIComponent('{"phase":{"in":["PHASE_TYPE_COMPLETE"]},"trashed":{"eq":false}}');
            const files = [];
            let page = '';
            for (let guard = 0; guard < 50; guard++) {
                const url = this.base + '/files?parent_type=drive&limit=100&filters=' + filters +
                    '&parent_id=' + encodeURIComponent(folderId) + (page ? '&page_token=' + encodeURIComponent(page) : '');
                const res = await Net.get(url, this.headers('home'));
                const d = res.data || {};
                if (d.error) throw new Error('迅雷接口错误：' + this.errText(d));
                files.push(...(d.files || []));
                page = d.next_page_token || '';
                if (!page) break;
            }
            return files;
        },

        /* 文件夹递归展开（借鉴 迅雷云盘直链）：勾选文件夹 → 收集全部子孙文件，
           path 记录相对目录，推送 RPC 时按 保存目录/子路径 落盘。并发 4 防限流 */
        async expand(ids, basePath) {
            const tasks = ids.map(id => ({ id, path: basePath || '' }));
            const seen = new Set();
            const files = [];
            while (tasks.length) {
                const batch = tasks.splice(0, 4);
                const entries = await Promise.all(batch.map(async (t) => {
                    if (!t.id || seen.has(t.id)) return null;
                    seen.add(t.id);
                    const res = await Net.get(
                        this.base + '/files/' + encodeURIComponent(String(t.id)) + '?with_audit=true',
                        this.headers('home')
                    );
                    const d = res.data || {};
                    if (d.error) throw new Error('迅雷接口错误：' + this.errText(d));
                    if (d.kind !== 'drive#file') {
                        const nextPath = (t.path ? t.path + '/' : '') + (d.name || t.id);
                        const kids = await this.children(d.id);
                        for (const k of kids) tasks.push({ id: k.id, path: nextPath });
                        return null;
                    }
                    return {
                        id: d.id, name: d.name || d.id, size: Number(d.size) || 0,
                        isDir: false, extra: d, path: t.path || ''
                    };
                }));
                files.push(...entries.filter(Boolean));
            }
            return files;
        },

        /* 页面勾选读取（借鉴 迅雷云盘直链）：读迅雷列表的复选框，
           选中文件夹自动递归展开成文件 */
        async checked() {
            const ids = [...new Set(
                [...document.querySelectorAll('[data-file-id] input[type="checkbox"]:checked')]
                    .map(input => {
                        const box = input.closest('[data-file-id]');
                        return box ? box.getAttribute('data-file-id') : '';
                    })
                    .filter(Boolean)
            )];
            if (!ids.length) return [];
            return this.expand(ids, '');
        }
    };

    /* ============================================================
     *  移动云盘（yun.139.com / caiyun.139.com）—— 实验性支持。
     *  借鉴 网盘直链下载助手：直链走 downloadRequest 接口，
     *  需 mcloud-sign 签名（md5 链）+ authorization Cookie；
     *  列表依赖页面 Vue 数据（先勾选文件再「解析页面勾选」）。
     * ============================================================ */
    const Mcloud = {
        key: 'mcloud',
        name: '移动云盘',
        color: '#0aa770',
        referer: REFERER.mcloud,
        base: 'https://yun.139.com',

        pageType() {
            if (!/(^|\.)(yun|caiyun)\.139\.com$/.test(location.hostname)) return null;
            return /\/(link|shareweb)/.test(location.pathname) ? 'share' : 'home';
        },

        headers(kind) {
            return { 'Content-Type': 'application/json;charset=UTF-8', 'Referer': REFERER.mcloud };
        },

        /* mcloud-sign：md5(md5(b64(逐字符排序(encodeURIComponent(body)))) + md5(time:key)) 大写
           —— 与 网盘直链下载助手 / AList 生态一致 */
        mcloudSign(body, time, key) {
            let i = '';
            if (body) {
                i = JSON.stringify(Object.assign({}, body)).replace(/\s*/g, '');
                i = encodeURIComponent(i);
                i = i.split('').sort().join('');
            }
            const a = U.md5(U.b64(i));
            const l = U.md5(time + ':' + key);
            return U.md5(a + l).toUpperCase();
        },

        /* UTC+8 时间字符串（签名用） */
        signTime() {
            return new Date(+new Date() + 8 * 3600 * 1000).toJSON().substr(0, 19).replace('T', ' ');
        },

        /* 页面勾选：移动云盘列表数据在 Vue 组件里（借鉴原脚本 getSelectedList） */
        checked() {
            const out = [];
            try {
                const el = document.querySelector('.main_file_list');
                const list = el && el.__vue__ && el.__vue__.selectList;
                if (Array.isArray(list)) {
                    list.forEach(v => {
                        const item = (v && v.item) || v;
                        if (!item || !item.contentID) return; /* 文件夹走 coName/coSize，无 contentID */
                        out.push({
                            id: String(item.contentID),
                            name: item.contentName || '未命名文件',
                            size: Number(item.contentSize) || 0,
                            isDir: false,
                            extra: item
                        });
                    });
                }
            } catch (e) { /* 页面结构变化时静默，走 listFiles 的提示 */ }
            return out;
        },

        async listFiles(kind) {
            throw new Error('移动云盘（实验性）：请先在页面勾选文件，再点「解析页面勾选」获取直链');
        },

        async getLink(file, kind) {
            if (kind === 'share') {
                /* 分享页：外链下载接口（需页面 linkID） */
                const el = document.querySelector('.main_file_list');
                const linkId = el && el.__vue__ && el.__vue__.linkID;
                if (!linkId) throw new Error('未识别到分享 ID，请在移动云盘分享页操作');
                const res = await Net.postForm(
                    'https://caiyun.139.com/stapi/outlink/content/download',
                    'linkId=' + encodeURIComponent(String(linkId)) +
                    '&contentIds=' + encodeURIComponent(String((file.extra && file.extra.path) || file.id)) +
                    '&catalogIds=',
                    { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': REFERER.mcloud }
                );
                const d = res.data || {};
                if (d.code === 0 && d.data && d.data.redrUrl) return d.data.redrUrl;
                throw new Error('移动云盘分享直链失败：' + (d.msg || d.message || d.code || '未知'));
            }

            const auth = U.cookie('authorization');
            if (!auth) throw new Error('未取到移动云盘登录凭据（authorization Cookie），请先登录 yun.139.com');
            const time = this.signTime();
            const key = U.rand16();
            const body = {
                contentID: String((file.extra && (file.extra.contentID || file.extra.contentId)) || file.id),
                commonAccountInfo: { account: String((file.extra && file.extra.owner) || ''), accountType: 1 },
                operation: '0',
                inline: '0',
                extInfo: { isReturnCdnDownloadUrl: '1' }
            };
            const res = await Net.postJSON(
                this.base + '/orchestration/personalCloud/uploadAndDownload/v1.0/downloadRequest',
                body,
                {
                    'authorization': auth,
                    'x-huawei-channelSrc': '10000034',
                    'x-inner-ntwk': '2',
                    'mcloud-channel': '1000101',
                    'mcloud-client': '10701',
                    'mcloud-sign': time + ',' + key + ',' + this.mcloudSign(body, time, key),
                    'caller': 'web',
                    'CMS-DEVICE': 'default',
                    'x-DeviceInfo': '||9|7.12.0|chrome|118.0.0.0||windows 10||zh-CN|||',
                    'x-SvcType': '1'
                }
            );
            const d = res.data || {};
            if (d.success && d.data && d.data.downloadURL) return d.data.downloadURL;
            throw new Error('移动云盘直链失败：' + (d.message || d.code || '未知（签名校验失败或文件已删除）'));
        }
    };

    /* ============================================================
     *  123 云盘（www.123pan.com）—— 实验性支持。
     *  借鉴 LinkSwift：登录令牌取页面 localStorage 的 authorToken，
     *  直链 POST /api/file/download_info（Bearer + Platform: ios），
     *  返回的 DownloadUrl 带 ?params=<base64> 时还原为真实 CDN 地址。
     *  123 网页端文件记录靠 React fiber（antd 表格），列表 API 各版本
     *  域名/参数多变，第一版以「解析页面勾选」为主通道。
     * ============================================================ */
    const Pan123 = {
        key: 'pan123',
        name: '123云盘',
        color: '#4a90e2',
        referer: REFERER.pan123,
        base: 'https://www.123pan.com/api',

        pageType() {
            if (!/(^|\.)(123pan\.(com|cn)|123684\.com|123865\.com|123952\.com|123912\.com)$/.test(location.hostname)) return null;
            return /\/s\//.test(location.pathname) ? 'share' : 'home';
        },

        shareKey() {
            const m = location.pathname.match(/\/s\/([0-9a-zA-Z]+)/);
            return m ? m[1] : '';
        },

        headers(kind) {
            return {
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': Store.get('ua'),
                'Referer': REFERER.pan123,
                'Platform': 'ios',
                'Authorization': 'Bearer ' + this.token()
            };
        },

        /* 登录令牌：123 页面登录后写入 localStorage（authorToken），
           可能是 JSON 字符串（"xxx"）或对象（{token:...}），两种都兼容 */
        token() {
            const t = U.storage('authorToken');
            if (typeof t === 'string') return t;
            if (t && typeof t === 'object') return String(t.token || t.value || t.access_token || '');
            return '';
        },

        async listFiles(kind) {
            throw new Error('123 云盘列表接口各版本变动频繁，请先在页面勾选文件后点「解析页面勾选」（实验性）');
        },

        /* 页面勾选：antd React 表格，记录字段 FileId/FileName/Size/Type/Etag/S3KeyFlag */
        checked() {
            const out = new Map();
            const boxes = document.querySelectorAll('.ant-checkbox-wrapper-checked, [aria-checked="true"]');
            boxes.forEach(box => {
                if (box.closest('.ant-table-thead')) return;
                const rec = reactFileRecord(box, r => r.FileId !== undefined && r.FileId !== null);
                if (rec && rec.FileId !== undefined) out.set(String(rec.FileId), {
                    id: String(rec.FileId),
                    name: rec.FileName || '未命名文件',
                    size: Number(rec.Size) || 0,
                    isDir: rec.Type !== 0,
                    extra: rec
                });
            });
            return Array.from(out.values());
        },

        /* 123 直链统一处理：DownloadUrl/DownloadURL 二选一，?params= 内是 base64 的真实地址 */
        extractUrl(d) {
            const raw = (d && d.data && (d.data.DownloadUrl || d.data.DownloadURL)) || '';
            if (!raw) return '';
            try {
                const m = raw.match(/[?&]params=([^&]+)/);
                if (m && m[1]) {
                    const real = U.b64dec(decodeURIComponent(m[1]));
                    if (/^https?:/i.test(real)) return real;
                }
            } catch (e) { /* 还原失败就用原始地址 */ }
            return raw;
        },

        async getLink(file, kind) {
            if (kind === 'share') {
                const shareKey = this.shareKey();
                if (!shareKey) throw new Error('未识别到分享 Key，请确认链接格式');
                const x = file.extra || {};
                const res = await Net.postJSON(
                    this.base + '/share/download/info',
                    { ShareKey: shareKey, FileID: file.id, S3keyFlag: x.S3KeyFlag || x.s3KeyFlag || '', Size: file.size, Etag: x.Etag || x.etag || '' },
                    this.headers('share')
                );
                const url = this.extractUrl(res.data);
                if (!url) {
                    if (res.data && res.data.code === 5112) throw new Error('未登录 123 云盘，请先登录');
                    if (res.data && res.data.code === 5113) throw new Error('本月免费流量不足，请开通 123 云盘会员');
                    throw new Error((res.data && (res.data.message || res.data.msg)) || '获取直链失败（接口未返回 DownloadUrl）');
                }
                return url;
            }

            const x = file.extra || {};
            const res = await Net.postJSON(
                this.base + '/file/download_info',
                {
                    driveId: 0,
                    etag: x.Etag || x.etag || '',
                    fileId: file.id,
                    s3keyFlag: x.S3KeyFlag || x.s3KeyFlag || '',
                    type: x.Type !== undefined ? x.Type : 0,
                    fileName: file.name,
                    size: Number(x.Size) || Number(file.size) || 0
                },
                this.headers('home')
            );
            const url = this.extractUrl(res.data);
            if (!url) {
                if (res.data && res.data.code === 5112) throw new Error('未登录 123 云盘，请先登录');
                if (res.data && res.data.code === 5113) throw new Error('本月免费流量不足，请开通 123 云盘会员');
                throw new Error((res.data && (res.data.message || res.data.msg)) || '获取直链失败（接口未返回 DownloadUrl，可能是接口已变动——123 各版本调整频繁）');
            }
            return url;
        }
    };

    const PROVIDERS = [Baidu, Ali, Quark, Uc, Cloud189, Xunlei, Mcloud, Pan123];

    function detectProvider() {
        for (const p of PROVIDERS) {
            try {
                const kind = p.pageType();
                if (kind) return { provider: p, kind };
            } catch (e) { /* ignore */ }
        }
        return null;
    }

    /* ============================================================
     *  5. UI（Shadow DOM 隔离，避免污染页面样式）
     * ============================================================ */
    const UI = {
        shadow: null,
        host: null,
        refs: {},
        state: {
            files: [],
            selected: new Set(),
            busy: false
        },

        isDark() {
            const t = Store.get('theme');
            if (t === 'dark') return true;
            if (t === 'light') return false;
            return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        },

        css() {
            return `
:host { all: initial; display: block; }
* { box-sizing: border-box; }
.wrap { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 13px;
        --bg: #f6f7f9; --panel: #ffffff; --text: #1f2329; --sub: #75797f; --line: #e8eaee;
        --hover: #f2f4f8; --head: #fbfcfd; --accent: #3b7bff; --accent-2: #2456e0;
        --accent-soft: rgba(59,123,255,.10);
        --ok: #2ea45a; --warn: #f59e0b; --err: #e5484d;
        --grad: linear-gradient(135deg, #5b8cff 0%, #3b7bff 45%, #2456e0 100%);
        --shadow-2: 0 32px 90px rgba(9,14,22,.42), 0 6px 22px rgba(9,14,22,.18); }
.wrap.dark { --bg: #17181b; --panel: #202226; --text: #e8eaee; --sub: #9aa1ab; --line: #34373e;
        --hover: #2a2d33; --head: #1b1d21; --accent: #6d95ff; --accent-2: #557ef2;
        --accent-soft: rgba(109,149,255,.16);
        --grad: linear-gradient(135deg, #6d95ff 0%, #557ef2 55%, #3f63d9 100%);
        --shadow-2: 0 32px 90px rgba(0,0,0,.62), 0 6px 22px rgba(0,0,0,.42); }

/* 悬浮球 */
.ball { position: fixed; right: 18px; top: 42%; width: 50px; height: 50px; border-radius: 19px;
        background: var(--grad); color: #fff;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        box-shadow: 0 8px 24px rgba(43,108,255,.45), inset 0 1px 0 rgba(255,255,255,.35), inset 0 -3px 8px rgba(0,0,0,.16);
        z-index: 2147483000;
        user-select: none; transition: transform .18s cubic-bezier(.2,.9,.3,1.4), box-shadow .18s; }
.ball::before { content: ''; position: absolute; inset: 1px; border-radius: inherit;
        background: linear-gradient(160deg, rgba(255,255,255,.40), rgba(255,255,255,0) 46%); pointer-events: none; }
.ball:hover { transform: scale(1.1) rotate(-3deg);
        box-shadow: 0 14px 36px rgba(43,108,255,.62), inset 0 1px 0 rgba(255,255,255,.35); }
.ball:active { transform: scale(.96); }
.ball svg { width: 23px; height: 23px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.25)); position: relative; }
.ball.dragging { cursor: grabbing; transition: none; }
.ball .dot { position: absolute; top: -3px; right: -3px; width: 11px; height: 11px; border-radius: 50%;
      background: #2ea45a; border: 2px solid var(--panel); box-shadow: 0 0 6px rgba(46,164,90,.7); }
.ball::after { content: ''; position: absolute; inset: -5px; border-radius: 24px;
      border: 2px solid rgba(74,134,255,.4); pointer-events: none; animation: ring 2.8s ease-out infinite; }
@keyframes ring { 0% { transform: scale(.92); opacity: .8; } 65% { transform: scale(1.22); opacity: 0; } 100% { opacity: 0; } }

/* 遮罩与面板 */
.mask { position: fixed; inset: 0; background: radial-gradient(120% 120% at 50% 30%, rgba(20,26,40,.55), rgba(10,12,18,.62));
        backdrop-filter: blur(9px) saturate(1.1);
        z-index: 2147483001; display: none; align-items: center; justify-content: center; }
.mask.show { display: flex; animation: fade .18s ease-out; }
.panel { width: min(920px, 94vw); height: min(660px, 86vh); background: var(--panel); color: var(--text);
        border-radius: 18px; display: flex; flex-direction: column; overflow: hidden; position: relative;
        box-shadow: var(--shadow-2); border: 1px solid var(--line); }
.mask.show .panel { animation: pop .28s cubic-bezier(.2,.9,.3,1.12); }
.panel.small { height: auto; max-height: 88vh; width: min(560px, 94vw); }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop { from { opacity: 0; transform: scale(.95) translateY(16px); } to { opacity: 1; transform: none; } }

/* 顶部加载条：busy 时显示 */
.loadbar { position: absolute; top: 0; left: 0; right: 0; height: 2.5px; overflow: hidden; z-index: 3; pointer-events: none; opacity: 0; transition: opacity .2s; }
.loadbar.on { opacity: 1; }
.loadbar i { position: absolute; top: 0; bottom: 0; width: 34%; border-radius: 3px;
        background: var(--grad); animation: slide 1.1s ease-in-out infinite; box-shadow: 0 0 8px rgba(59,123,255,.6); }
@keyframes slide { from { left: -36%; } to { left: 102%; } }

.hd { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, var(--head), transparent); }
.hd .logo { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 12.5px; font-weight: 800; letter-spacing: .5px; position: relative;
      background: var(--grad); box-shadow: 0 3px 12px rgba(43,108,255,.4), inset 0 1px 0 rgba(255,255,255,.3); }
.hd .title { font-size: 15.5px; font-weight: 700; letter-spacing: .2px; }
.hd .tag { font-size: 11px; padding: 3px 10px; border-radius: 999px; background: var(--accent-soft); color: var(--accent);
      font-weight: 600; border: 1px solid rgba(59,123,255,.18); }
.wrap.dark .hd .tag { border-color: rgba(109,149,255,.25); }
.hd .grow { flex: 1; }
.icon-btn { width: 30px; height: 30px; border-radius: 9px; border: 1px solid transparent; background: transparent;
      color: var(--sub); cursor: pointer; font-size: 15px; line-height: 1; display: flex; align-items: center; justify-content: center;
      transition: all .13s; }
.icon-btn svg { width: 16px; height: 16px; }
.icon-btn:hover { background: var(--hover); color: var(--accent); transform: translateY(-1px); }
.icon-btn.lang-btn { font-size: 11px; font-weight: 700; letter-spacing: .02em; width: 34px; }
.icon-btn:active { transform: none; }
.icon-btn:focus-visible { outline: none; color: var(--accent); background: var(--accent-soft); }

.toolbar { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--line); flex-wrap: wrap;
      background: linear-gradient(180deg, var(--head), transparent); }
.btn { border: 1px solid var(--line); background: var(--panel); color: var(--text); border-radius: 9px;
       padding: 6px 13px; cursor: pointer; font-size: 12.5px; transition: all .13s;
       display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.btn svg { width: 14px; height: 14px; flex: 0 0 auto; opacity: .88; transition: opacity .13s; }
.btn:hover svg { opacity: 1; }
.btn:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-1px);
       box-shadow: 0 3px 10px rgba(59,123,255,.16); }
.btn:active { transform: none; box-shadow: none; }
.btn:focus-visible { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.btn.primary { background: var(--grad); border-color: transparent; color: #fff;
       box-shadow: 0 3px 12px rgba(59,123,255,.35), inset 0 1px 0 rgba(255,255,255,.25); font-weight: 600; }
.btn.primary svg { opacity: 1; }
.btn.primary:hover { color: #fff; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(59,123,255,.45), inset 0 1px 0 rgba(255,255,255,.25); }
.btn.ghost { border-style: dashed; background: transparent; }
.btn:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }
.btn.sm { padding: 3px 9px; font-size: 11.5px; border-radius: 7px; }
.search { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.search svg { width: 15px; height: 15px; color: var(--sub); flex: 0 0 auto; margin-left: 10px; }
.search input { border: 1px solid var(--line); background: var(--bg); color: var(--text);
      border-radius: 999px; padding: 6px 15px; font-size: 12.5px; width: 200px; outline: none; transition: all .15s; }
.search input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); width: 230px; }

.body { flex: 1; overflow: auto; }
.body::-webkit-scrollbar, .form::-webkit-scrollbar { width: 8px; height: 8px; }
.body::-webkit-scrollbar-thumb, .form::-webkit-scrollbar-thumb { background: var(--line); border-radius: 8px;
      border: 2px solid transparent; background-clip: content-box; }
.body::-webkit-scrollbar-thumb:hover, .form::-webkit-scrollbar-thumb:hover { background: var(--sub); border: 2px solid transparent; background-clip: content-box; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
thead th { position: sticky; top: 0; background: var(--head); color: var(--sub); font-weight: 600;
      font-size: 11px; text-align: center; padding: 10px; letter-spacing: .8px; border-bottom: 1px solid var(--line); z-index: 2; }
tbody td { padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
tbody tr { transition: background .12s, box-shadow .12s; }
tbody tr:nth-child(even) { background: rgba(0,0,0,.016); }
.wrap.dark tbody tr:nth-child(even) { background: rgba(255,255,255,.024); }
tbody tr:hover { background: var(--hover); box-shadow: inset 2.5px 0 0 var(--accent); }
tbody input[type="checkbox"] { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; vertical-align: middle; }
.col-check { width: 38px; }
.col-size { width: 88px; color: var(--sub); white-space: nowrap; font-variant-numeric: tabular-nums; text-align: center; }
.col-act { width: 190px; }
.name { display: flex; align-items: center; justify-content: center; gap: 9px; overflow: hidden; }
.name .ext { flex: 0 0 auto; min-width: 34px; height: 22px; padding: 0 6px; border-radius: 7px; font-size: 10px; font-weight: 800;
      display: inline-flex; align-items: center; justify-content: center; letter-spacing: .4px;
      box-shadow: inset 0 0 0 1px currentColor; }
.name .txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name .path { color: var(--sub); margin-right: 2px; }
.name .txt.dim { color: var(--sub); }
.acts { display: flex; gap: 5px; justify-content: flex-end; flex-wrap: wrap; }
.acts .btn { padding: 3px 9px; font-size: 11.5px; border-radius: 7px; background: var(--bg); }
.acts .btn:hover { background: var(--accent-soft); box-shadow: none; }
/* 操作列：六个出口固定 3+3 两行网格，列宽随内容收紧 */
.col-act .acts { display: grid; grid-template-columns: repeat(3, max-content); justify-content: center;
      gap: 4px 5px; }
.col-act .acts .btn { justify-content: center; min-width: 46px; }
/* 进度列：圆环进度 */
.col-prog { width: 58px; text-align: center; white-space: nowrap; }
.ring-wrap { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; }
.ring-wrap svg { display: block; }
.ring-bg { stroke: var(--line); }
.ring-fg { stroke: var(--accent); transition: stroke-dashoffset .35s linear; }
.ring-fg.ring-done { stroke: #2ab36a; }
.ring-spin { transform-origin: 14px 14px; animation: ringspin .9s linear infinite; }
@keyframes ringspin { to { transform: rotate(360deg); } }
.ring-pct { font-size: 10px; line-height: 1.2; color: var(--sub); font-variant-numeric: tabular-nums;
      max-width: 54px; overflow: hidden; text-overflow: ellipsis; }
.ring-wrap .ring-done ~ .ring-pct { color: #2ab36a; }

.foot { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-top: 1px solid var(--line);
      background: var(--head); font-size: 12px; color: var(--sub); }
.foot .grow { flex: 1; }
.foot strong { color: var(--text); font-weight: 600; }
.foot input[type="checkbox"] { width: 14px; height: 14px; accent-color: var(--accent); cursor: pointer; }

.empty { padding: 52px 20px; text-align: center; color: var(--sub); line-height: 2; }
.empty .big { width: 76px; height: 76px; margin: 0 auto 12px; border-radius: 24px; background: var(--accent-soft);
      display: flex; align-items: center; justify-content: center; font-size: 32px;
      animation: float 3.2s ease-in-out infinite; }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
.empty code { background: var(--hover); padding: 1px 6px; border-radius: 4px; color: var(--accent); }

/* 设置 */
.form { padding: 14px 18px; overflow: auto; }
.row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.row label { flex: 0 0 108px; color: var(--sub); font-size: 12.5px; }
.row input[type="text"], .row input[type="password"], .row select {
      flex: 1; border: 1px solid var(--line); background: var(--bg); color: var(--text);
      border-radius: 8px; padding: 7px 11px; font-size: 12.5px; outline: none; transition: all .15s; }
.row input:focus, .row select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.row .hint { flex: 0 0 auto; font-size: 11px; color: var(--sub); }
.sect { font-size: 12px; font-weight: 700; color: var(--accent); margin: 18px 0 6px; padding: 6px 12px;
      background: var(--accent-soft); border-radius: 7px; letter-spacing: .3px; border-left: 3px solid var(--accent); }
.sect:first-child { margin-top: 0; }
.switch { position: relative; width: 40px; height: 22px; border-radius: 20px; background: var(--line); cursor: pointer; transition: .18s; flex: 0 0 auto; }
.switch.on { background: var(--accent); box-shadow: 0 0 8px var(--accent-soft); }
.switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
      background: #fff; transition: .18s cubic-bezier(.2,.9,.3,1.3); box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.switch.on::after { left: 20px; }

/* 下载历史 */
.hist-bar { display: flex; gap: 10px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, var(--head), transparent); flex-wrap: wrap; }
.hist-bar input { border: 1px solid var(--line); background: var(--bg); color: var(--text);
      border-radius: 999px; padding: 6px 15px; font-size: 12.5px; width: 200px; outline: none; transition: all .15s; }
.hist-bar input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); width: 240px; }
.hist-bar .stat { font-size: 12px; color: var(--sub); }
.col-htime { width: 118px; color: var(--sub); font-variant-numeric: tabular-nums; white-space: nowrap; font-size: 12px; }
.col-hmeta { width: 92px; color: var(--sub); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-hops { width: 240px; }

/* toast */
.toasts { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 2147483003;
      display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
.toast { background: rgba(24,26,30,.94); color: #fff; padding: 10px 18px 10px 14px; border-radius: 12px; font-size: 12.5px;
      box-shadow: 0 10px 32px rgba(0,0,0,.32); animation: drop .22s cubic-bezier(.2,.9,.3,1.2); max-width: 66vw;
      white-space: pre-wrap; word-break: break-all; border-left: 3px solid rgba(255,255,255,.35);
      border-top: 1px solid rgba(255,255,255,.06); backdrop-filter: blur(6px); display: flex; align-items: flex-start; gap: 8px; }
.toast::before { content: 'ℹ️'; flex: 0 0 auto; filter: saturate(.8); }
.toast.ok { background: rgba(30,116,62,.95); border-left-color: rgba(255,255,255,.55); }
.toast.ok::before { content: '✅'; }
.toast.err { background: rgba(186,42,47,.95); border-left-color: rgba(255,255,255,.55); }
.toast.err::before { content: '⚠️'; }
@keyframes drop { from { opacity: 0; transform: translateY(-14px) scale(.96); } to { opacity: 1; transform: none; } }

.stat { font-size: 11.5px; color: var(--sub); }
.progress { font-size: 11px; color: var(--accent); white-space: nowrap; font-variant-numeric: tabular-nums; }
`;
        },

        mount() {
            if (this.host) return;
            this.host = document.createElement('div');
            this.host.id = APP.prefix + '-host';
            (document.body || document.documentElement).appendChild(this.host);
            this.shadow = this.host.attachShadow({ mode: 'open' });

            const dark = this.isDark() ? 'dark' : '';
            this.shadow.innerHTML = `
<style>${this.css()}</style>
<div class="wrap ${dark}">
  <div class="ball" title="${APP.name} v${APP.version}${T('ballTip')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m6 11 6 6 6-6"/><path d="M5 21h14"/></svg><i class="dot"></i></div>
  <div class="mask">
    <section class="panel">
      <div class="loadbar" data-ref="loadbar"><i></i></div>
      <div class="hd">
        <div class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><polyline points="16 16 12 20 8 16"/><line x1="12" y1="20" x2="12" y2="9"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg></div>
        <div class="title">${APP.name}</div>
        <span class="tag" data-ref="tag">-</span>
        <span class="tag" data-ref="kind">-</span>
        <div class="grow"></div>
        <button class="icon-btn" data-act="github" title="${T('tGithub')}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.05.78 2.12 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg></button>
        <button class="icon-btn" data-act="site" title="${T('tSite')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></button>
        <button class="icon-btn lang-btn" data-act="lang" title="${T('langTip')}">${Store.get('lang') === 'en' ? '中' : 'EN'}</button>
        <button class="icon-btn" data-act="refresh" title="${T('tRefresh')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button>
        <button class="icon-btn" data-act="history" title="${T('tHistory')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
        <button class="icon-btn" data-act="settings" title="${T('tSettings')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
        <button class="icon-btn" data-act="close" title="${T('tClose')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="toolbar">
        <button class="btn primary" data-act="parse"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>${T('bParse')}</button>
        <button class="btn" data-act="parse-checked"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>${T('bChecked')}</button>
        <button class="btn ghost" data-act="copy-all"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>${T('bCopyAll')}</button>
        <button class="btn ghost" data-act="rpc-all"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>${T('bRpcAll')}</button>
        <button class="btn ghost" data-act="enhance-all" title="${T('tEnhance')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>${T('bEnhance')}</button>
        <button class="btn ghost" data-act="page-dl" title="${T('tPageDl')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>${T('bPageDl')}</button>
        <div class="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
          <input type="text" placeholder="${T('filterPh')}" data-ref="filter">
        </div>
      </div>
      <div class="body" data-ref="body"></div>
      <div class="foot">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" data-act="check-all"> ${T('fAll')}
        </label>
        <span>${T('fSel')} <strong data-ref="cnt">0</strong> / <span data-ref="total">0</span></span>
        <span>${T('fTotal')} <strong data-ref="sum">0 B</strong></span>
        <div class="grow"></div>
        <span class="stat" data-ref="msg"></span>
        <button class="btn sm" data-act="export">${T('bExport')}</button>
      </div>
    </section>
  </div>
  <div class="toasts" data-ref="toasts"></div>
</div>`;

            this.refs.wrap = this.shadow.querySelector('.wrap');
            this.refs.ball = this.shadow.querySelector('.ball');
            this.refs.mask = this.shadow.querySelector('.mask');
            this.refs.panel = this.shadow.querySelector('.panel');
            this.refs.body = this.shadow.querySelector('[data-ref="body"]');
            this.refs.tag = this.shadow.querySelector('[data-ref="tag"]');
            this.refs.kind = this.shadow.querySelector('[data-ref="kind"]');
            this.refs.cnt = this.shadow.querySelector('[data-ref="cnt"]');
            this.refs.total = this.shadow.querySelector('[data-ref="total"]');
            this.refs.sum = this.shadow.querySelector('[data-ref="sum"]');
            this.refs.msg = this.shadow.querySelector('[data-ref="msg"]');
            this.refs.loadbar = this.shadow.querySelector('[data-ref="loadbar"]');
            this.refs.filter = this.shadow.querySelector('[data-ref="filter"]');
            this.refs.toasts = this.shadow.querySelector('[data-ref="toasts"]');

            this.bind();
            this.renderEmpty();
            this.updateMeta();
        },

        bind() {
            const s = this.shadow;
            s.addEventListener('click', (e) => {
                const t = e.target.closest('[data-act]');
                if (!t) return;
                const act = t.getAttribute('data-act');
                if (act === 'close') return this.close();
                if (act === 'lang') return this.toggleLang();
                if (act === 'github') return GM_openInTab('https://github.com/CZY1326/CloudLink-Master-Pro', { active: true });
                if (act === 'site') return GM_openInTab('https://czy1326.github.io/CloudLink-Master-Pro/' + (Store.get('lang') === 'en' ? '#english' : ''), { active: true });
                if (act === 'settings') return Settings.open();
                if (act === 'refresh') return guard(App.parse('list'));
                if (act === 'parse') return guard(App.parse('list'));
                if (act === 'parse-checked') return guard(App.parse('checked'));
                if (act === 'copy-all') return guard(App.copyAll());
                if (act === 'rpc-all') return guard(App.rpcAll());
                if (act === 'enhance-all') return guard(App.enhanceAll());
                if (act === 'page-dl') return guard(App.pageDownload());
                if (act === 'export') return guard(App.exportTxt());
                if (act === 'history') return guard(App.historyView());
                if (act === 'h-copy') return guard(App.histCopy(t.getAttribute('data-hi')));
                if (act === 'h-dl') return guard(App.histDl(t.getAttribute('data-hi')));
                if (act === 'h-del') return guard(App.histDel(t.getAttribute('data-hi')));
                if (act === 'h-clear') return guard(App.histClear());
                if (act === 'back-list') {
                    UI.refs.panel.classList.remove('small');
                    UI.renderRows();
                    UI.updateStats();
                    return;
                }

                const id = t.getAttribute('data-id');
                if (!id) return;
                if (act === 'copy') return guard(App.copyOne(id));
                if (act === 'dl') return guard(App.download(id));
                if (act === 'rpc') return guard(App.rpcOne(id));
                if (act === 'curl') return guard(App.curlOne(id));
                if (act === 'aria') return guard(App.ariaOne(id));
                if (act === 'bc') return guard(App.bcOne(id));
            });

            s.addEventListener('change', (e) => {
                const t = e.target;
                if (t.matches('[data-act="check-all"]')) {
                    const on = t.checked;
                    this.state.files.forEach(f => {
                        if (f.isDir) return;
                        on ? this.state.selected.add(f.id) : this.state.selected.delete(f.id);
                    });
                    this.renderRows();
                    this.updateStats();
                }
                if (t.matches('[data-check]')) {
                    const id = t.getAttribute('data-check');
                    t.checked ? this.state.selected.add(id) : this.state.selected.delete(id);
                    this.updateStats();
                }
            });

            this.refs.filter.addEventListener('input', () => this.renderRows());
            this.refs.ball.addEventListener('click', () => {
                if (this._justDragged) { this._justDragged = false; return; }
                if (this._pointerUsed) { this._pointerUsed = false; return; } /* 支持 Pointer 事件的浏览器由 pointerup 处理 */
                this.open();
            });

            /* 悬浮球拖拽（并记忆位置） */
            let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
            const ball = this.refs.ball;
            const saved = GM_getValue('dlm_ball_pos', null);
            if (saved && typeof saved.top === 'number') {
                ball.style.top = Math.max(8, Math.min(window.innerHeight - 60, saved.top)) + 'px';
                ball.style.right = 'auto';
                ball.style.left = Math.max(8, Math.min(window.innerWidth - 60, saved.left)) + 'px';
            }
            ball.addEventListener('pointerdown', (e) => {
                dragging = true; moved = false; this._pointerUsed = false;
                const r = ball.getBoundingClientRect();
                sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
                ball.setPointerCapture(e.pointerId);
            });
            ball.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const dx = e.clientX - sx, dy = e.clientY - sy;
                if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; ball.classList.add('dragging'); }
                if (!moved) return;
                const left = Math.max(6, Math.min(window.innerWidth - 52, ox + dx));
                const top = Math.max(6, Math.min(window.innerHeight - 52, oy + dy));
                ball.style.left = left + 'px'; ball.style.top = top + 'px'; ball.style.right = 'auto';
            });
            ball.addEventListener('pointerup', (e) => {
                if (!dragging) return;
                dragging = false;
                this._pointerUsed = true;
                ball.classList.remove('dragging');
                if (moved) {
                    this._justDragged = true;
                    const r = ball.getBoundingClientRect();
                    GM_setValue('dlm_ball_pos', { left: r.left, top: r.top });
                } else {
                    this.open();
                }
            });

            if (window.matchMedia) {
                const mq = window.matchMedia('(prefers-color-scheme: dark)');
                if (mq.addEventListener) mq.addEventListener('change', () => {
                    this.refs.wrap.classList.toggle('dark', this.isDark());
                });
            }

            document.addEventListener('keydown', (e) => {
                if (e.altKey && (e.key === 'd' || e.key === 'D')) {
                    e.preventDefault();
                    this.refs.mask.classList.contains('show') ? this.close() : this.open();
                }
            });
        },

        updateMeta() {
            const ctx = App.ctx;
            const c = ctx ? ctx.provider.color : '';
            this.refs.tag.textContent = ctx ? ctx.provider.name : T('metaUnknown');
            this.refs.tag.style.background = c ? c + '1f' : 'rgba(0,0,0,.06)';
            this.refs.tag.style.color = c || '';
            this.refs.tag.style.borderColor = c ? c + '44' : '';
            this.refs.kind.textContent = ctx ? (ctx.kind === 'share' ? T('kindShare') : T('kindHome')) : '-';
            /* 推送按钮文案随当前下载器变化，避免"找不到推送IDM按钮"的困惑 */
            const rpcType = String(Store.get('rpcType') || 'aria2');
            const allBtn = this.shadow.querySelector('[data-act="rpc-all"]');
            if (allBtn) {
                allBtn.textContent = rpcType === 'idm' ? T('bRpcIdm')
                    : rpcType === 'gopeed' ? T('bRpcGopeed')
                    : T('bRpcAll');
                allBtn.title = rpcType === 'idm' ? T('tRpcIdm')
                    : rpcType === 'gopeed' ? T('tRpcGopeed')
                    : T('tRpcAll');
            }
        },

        /* 语言切换（中/EN）：存偏好 → 重建面板 DOM → 恢复解析结果与勾选 */
        toggleLang() {
            const cur = Store.get('lang') === 'en' ? 'en' : 'zh';
            const next = cur === 'zh' ? 'en' : 'zh';
            Store.set({ lang: next });
            const files = this.state.files;
            const selected = this.state.selected;
            const showing = this.refs.mask.classList.contains('show');
            const inSettings = this.refs.panel.classList.contains('small');
            /* 历史页以其特有的搜索框识别，切换语言后重渲染并保留搜索关键词 */
            const histKwEl = this.shadow.querySelector('#hist-kw');
            const histKw = histKwEl ? (histKwEl.value || '') : '';
            const inHistory = !!histKwEl;
            if (this.host) { this.host.remove(); this.host = null; }
            this.mount();
            this.state.files = files;
            this.state.selected = selected;
            if (showing) {
                this.refs.mask.classList.add('show');
                if (inSettings) return Settings.open();
                if (inHistory) {
                    App.historyView();
                    const inp = this.shadow.querySelector('#hist-kw');
                    if (inp && histKw) {
                        inp.value = histKw;
                        inp.dispatchEvent(new Event('input', { bubbles: true })); /* 触发按新语言重渲染 */
                    }
                    return;
                }
                this.renderRows();
                this.updateStats();
            }
            this.updateMeta();
        },

        open() {
            this.mount();
            this.refs.mask.classList.add('show');
            this.refs.panel.classList.remove('small');
            this.updateMeta();
            if (!App.ctx) {
                this.renderEmpty(T('eOpenUnsupported'));
                return;
            }
            if (!this.state.files.length) {
                this.renderEmpty();
                if (!this.state.busy) guard(App.parse('list')); /* 打开面板即自动解析，解析完成后出现“下载”等按钮 */
                return;
            }
            this.renderRows();
            this.updateStats();
        },

        close() { this.refs.mask.classList.remove('show'); },

        toast(msg, type) {
            this.mount();
            const el = document.createElement('div');
            el.className = 'toast' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
            el.textContent = msg;
            this.refs.toasts.appendChild(el);
            const keep = type === 'err' ? 6500 : 2200; /* 错误提示停留更久，避免来不及看清 */
            setTimeout(() => {
                el.style.transition = 'opacity .25s';
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 260);
            }, keep);
        },

        renderEmpty(extra) {
            const ctx = App.ctx;
            const tip = extra || (ctx ? T('eTip') : T('eUnsupported'));
            this.refs.body.innerHTML = `<div class="empty"><div class="big">☁️</div>${tip}</div>`;
            this.state.files = [];
            this.state.selected.clear();
            this.updateStats();
        },

        renderRows() {
            const kw = (this.refs.filter.value || '').trim().toLowerCase();
            const files = this.state.files.filter(f => !kw || f.name.toLowerCase().indexOf(kw) >= 0);

            if (!files.length) {
                this.refs.body.innerHTML = `<div class="empty"><div class="big">🗂️</div>${T('noMatch')}</div>`;
                return;
            }

            const rpcType = String(Store.get('rpcType') || 'aria2');
            const rpcLabel = rpcType === 'idm' ? 'IDM' : rpcType === 'gopeed' ? 'Gopeed' : rpcType === 'abdm' ? 'ABDM' : 'RPC';
            const rows = files.map(f => {
                const checked = this.state.selected.has(f.id) ? 'checked' : '';
                const linkState = f.link ? '' : ' dim';
                const ec = f.isDir ? '#8a94a6' : this.extColor(f.name);
                const pathPart = f.path ? `<span class="path" title="${U.esc(f.path)}">${U.esc(f.path)}/</span>` : '';
                const acts = f.isDir
                    ? `<span class="stat">${T('folderHint')}</span>`
                    : `<button class="btn" data-act="copy" data-id="${U.esc(f.id)}">${T('bCopy')}</button>
                       <button class="btn" data-act="dl" data-id="${U.esc(f.id)}">${T('bDl')}</button>
                       <button class="btn" data-act="rpc" data-id="${U.esc(f.id)}">${rpcLabel}</button>
                       <button class="btn" data-act="curl" data-id="${U.esc(f.id)}">cURL</button>
                       <button class="btn" data-act="aria" data-id="${U.esc(f.id)}" title="复制 aria2c 命令行（XDown / Linux Shell）">Aria</button>
                       <button class="btn" data-act="bc" data-id="${U.esc(f.id)}" title="复制 bc:// 链接（BitComet）">BC</button>`;
                return `<tr>
  <td class="col-check"><input type="checkbox" data-check="${U.esc(f.id)}" ${checked} ${f.isDir ? 'disabled' : ''}></td>
  <td>
    <div class="name">
      <span class="ext" style="background:${ec}1f;color:${ec}">${f.isDir ? 'DIR' : U.esc(U.ext(f.name))}</span>
      <span class="txt${linkState}" title="${U.esc(f.path ? f.path + '/' : '')}${U.esc(f.name)}">${pathPart}${U.esc(f.name)}</span>
    </div>
  </td>
  <td class="col-size">${f.isDir ? '-' : U.esc(U.size(f.size))}</td>
  <td class="col-prog"><span class="progress" data-progress="${U.esc(f.id)}"></span></td>
  <td class="col-act"><div class="acts">${acts}</div></td>
</tr>`;
            }).join('');

            this.refs.body.innerHTML = `<table>
  <thead><tr>
    <th class="col-check"></th><th>${T('hName')}</th><th class="col-size">${T('hSize')}</th><th class="col-prog">${T('hProg')}</th><th class="col-act">${T('hAct')}</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>`;
        },

        extColor(name) {
            const map = {
                MP4: '#f5626a', MKV: '#f5626a', AVI: '#f5626a', MOV: '#f5626a', FLV: '#f5626a',
                MP3: '#a970ff', FLAC: '#a970ff', WAV: '#a970ff', M4A: '#a970ff',
                ZIP: '#f5a623', RAR: '#f5a623', '7Z': '#f5a623', ISO: '#f5a623', TAR: '#f5a623', GZ: '#f5a623',
                PDF: '#e5484d', DOC: '#2b6cff', DOCX: '#2b6cff', XLS: '#34a853', XLSX: '#34a853', PPT: '#ff7a45', PPTX: '#ff7a45',
                JPG: '#00b8a9', PNG: '#00b8a9', GIF: '#00b8a9', WEBP: '#00b8a9', SVG: '#00b8a9',
                EXE: '#6b7280', MSI: '#6b7280', APK: '#3ddc84', DMG: '#9aa0a6', TXT: '#9aa0a6'
            };
            return map[U.ext(name)] || '#8a94a6';
        },

        updateStats() {
            const sel = this.state.selected;
            let sum = 0, n = 0;
            this.state.files.forEach(f => {
                if (sel.has(f.id) && !f.isDir) { n++; sum += Number(f.size) || 0; }
            });
            this.refs.cnt.textContent = String(n);
            this.refs.total.textContent = String(this.state.files.filter(f => !f.isDir).length);
            this.refs.sum.textContent = U.size(sum);
        },

        setMsg(text) {
            this.refs.msg.textContent = text || '';
        },

        setProgress(id, text) {
            const el = this.refs.body.querySelector('[data-progress="' + U.escSel(id) + '"]');
            if (!el) return;
            text = String(text || '');
            if (!text) { el.innerHTML = ''; return; }
            el.innerHTML = this.ringHtml(text);
        },

        /* 圆环进度：文本含 N% → 确定进度环；"完成" → 绿色满环；其余（准备中/探测中…） → 旋转环 */
        ringHtml(text) {
            const R = 10, C = (2 * Math.PI * R).toFixed(1);
            const base = '<circle class="ring-bg" cx="14" cy="14" r="' + R + '" fill="none" stroke-width="3"/>';
            const m = text.match(/(\d+(?:\.\d+)?)\s*%/);
            let inner, label;
            if (text === '完成' || (m && parseFloat(m[1]) >= 100)) {
                inner = base + '<circle class="ring-fg ring-done" cx="14" cy="14" r="' + R + '" fill="none" stroke-width="3" stroke-dasharray="' + C + '" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 14 14)"/>';
                label = '完成';
            } else if (m) {
                const pct = Math.max(0, Math.min(100, parseFloat(m[1])));
                inner = base + '<circle class="ring-fg" cx="14" cy="14" r="' + R + '" fill="none" stroke-width="3" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 14 14)"/>';
                label = (Math.round(pct * 10) / 10) + '%';
            } else {
                inner = base + '<circle class="ring-fg ring-spin" cx="14" cy="14" r="' + R + '" fill="none" stroke-width="3" stroke-dasharray="' + (C * 0.28).toFixed(1) + ' ' + C + '" stroke-linecap="round"/>';
                label = U.esc(text);
            }
            return '<span class="ring-wrap" title="' + U.esc(text) + '"><svg width="26" height="26" viewBox="0 0 28 28">' + inner + '</svg><span class="ring-pct">' + label + '</span></span>';
        },

        setBusy(flag) {
            this.state.busy = flag;
            if (this.refs.loadbar) this.refs.loadbar.classList.toggle('on', !!flag);
            this.shadow.querySelectorAll('.toolbar .btn').forEach(b => {
                if (['parse', 'parse-checked'].indexOf(b.getAttribute('data-act')) >= 0) b.disabled = flag;
            });
        }
    };

    /* ============================================================
     *  6. 设置面板
     * ============================================================ */
    const Settings = {
        open() {
            UI.mount();
            const s = Store.all();
            const mask = UI.refs.mask;
            const panel = UI.refs.panel;
            panel.classList.add('small');
            UI.refs.body.innerHTML = `
<div class="form">
  <div class="sect">${T('sRpc')}</div>
  <div class="row"><label>${T('lbType')}</label>
    <select id="s-rpc-type">
      <option value="aria2"${s.rpcType !== 'gopeed' && s.rpcType !== 'idm' && s.rpcType !== 'abdm' ? ' selected' : ''}>Aria2 / Motrix（JSON-RPC）</option>
      <option value="gopeed"${s.rpcType === 'gopeed' ? ' selected' : ''}>Gopeed（REST API）</option>
      <option value="idm"${s.rpcType === 'idm' ? ' selected' : ''}>IDM</option>
      <option value="abdm"${s.rpcType === 'abdm' ? ' selected' : ''}>ABDM（AB Download Manager）</option>
    </select><span class="hint">Gopeed 9999 · IDM 127.0.0.1:1001 · ABDM 10000</span></div>
  <div class="row"><label>${T('lbHost')}</label><input type="text" id="s-rpc-host" value="${U.esc(s.rpcHost)}"><span class="hint">http://127.0.0.1</span></div>
  <div class="row"><label>${T('lbPort')}</label><input type="text" id="s-rpc-port" value="${U.esc(s.rpcPort)}"><span class="hint"></span></div>
  <div class="row"><label>${T('lbPath')}</label><input type="text" id="s-rpc-path" value="${U.esc(s.rpcPath)}"><span class="hint"></span></div>
  <div class="row"><label>${T('lbToken')}</label><input type="password" id="s-rpc-token" value="${U.esc(s.rpcToken)}"><span class="hint"></span></div>
  <div class="row"><label>${T('lbUser')}</label><input type="text" id="s-rpc-user" value="${U.esc(s.rpcUser || '')}"><span class="hint">aria2 HTTP Basic Auth</span></div>
  <div class="row"><label>${T('lbPass')}</label><input type="password" id="s-rpc-pass" value="${U.esc(s.rpcPass || '')}"><span class="hint"></span></div>
  <div class="row"><label>${T('lbDir')}</label><input type="text" id="s-rpc-dir" value="${U.esc(s.rpcDir)}"><span class="hint"></span></div>
  <div class="row"><label>${T('lbAddr')}</label><span class="stat" id="rpc-url-preview" style="word-break:break-all"></span></div>
  <div class="row"><label></label><button class="btn" data-sact="test">${T('bTest')}</button><span class="stat" data-ref="testMsg"></span></div>

  <div class="sect">${T('sDlTheme')}</div>
  <div class="row"><label>${T('lbUa')}</label><input type="text" id="s-ua" value="${U.esc(s.ua)}"><span class="hint">${T('hintUa')}</span></div>
  <div class="row"><label>${T('lbTheme')}</label>
    <select id="s-theme">
      <option value="auto"${s.theme === 'auto' ? ' selected' : ''}>${T('thAuto')}</option>
      <option value="light"${s.theme === 'light' ? ' selected' : ''}>${T('thLight')}</option>
      <option value="dark"${s.theme === 'dark' ? ' selected' : ''}>${T('thDark')}</option>
    </select><span class="hint"></span></div>
  <div class="row"><label>${T('lbCurlCookie')}</label><div class="switch ${s.curlCookie ? 'on' : ''}" data-sact="toggle-cookie"></div><span class="hint">${T('hintCurlCookie')}</span></div>
  <div class="row"><label>${T('lbPdfTrick')}</label><div class="switch ${s.baiduPdfTrick ? 'on' : ''}" data-sact="toggle-pdftrick"></div><span class="hint">${T('hintPdfTrick')}</span></div>

  <div class="sect">${T('sRename')}</div>
  <div class="row"><label>${T('lbMode')}</label>
    <select id="s-rename-mode">
      <option value="off"${s.renameMode === 'off' || !s.renameMode ? ' selected' : ''}>${T('rnOff')}</option>
      <option value="prefix"${s.renameMode === 'prefix' ? ' selected' : ''}>${T('rnPrefix')}</option>
      <option value="suffix"${s.renameMode === 'suffix' ? ' selected' : ''}>${T('rnSuffix')}</option>
      <option value="replace"${s.renameMode === 'replace' ? ' selected' : ''}>${T('rnReplace')}</option>
      <option value="regex"${s.renameMode === 'regex' ? ' selected' : ''}>${T('rnRegex')}</option>
    </select><span class="hint">${T('hintRename')}</span></div>
  <div class="row"><label>${T('lbRule')}</label><input type="text" id="s-rename-pattern" value="${U.esc(s.renamePattern || '')}" placeholder="${T('phRule')}"><span class="hint"></span></div>
  <div class="row"><label>${T('lbRepl')}</label><input type="text" id="s-rename-repl" value="${U.esc(s.renameRepl || '')}" placeholder="${T('phRepl')}"><span class="hint"></span></div>
  <div class="row"><label>${T('lbPreview')}</label><span class="stat" id="s-rename-preview" style="word-break:break-all"></span></div>

  <div class="row"><label>${T('lbHotkey')}</label><span class="stat">${T('hotkeyVal')}</span></div>

  <div class="sect">${T('sDiag')}</div>
  <div class="row"><label>${T('lbCurPan')}</label><span class="stat">${App.ctx ? App.ctx.provider.name + ' · ' + (App.ctx.kind === 'share' ? T('kindShare') : T('kindHome')) : T('diagUnknown')}</span></div>
  <div class="row"><label>${T('lbPageUrl')}</label><span class="stat" style="word-break:break-all">${U.esc(location.href.slice(0, 110))}</span></div>
  <div class="row"><label></label><button class="btn" data-sact="reset">${T('bReset')}</button></div>
</div>`;
            mask.classList.add('show');
            this.bind();
        },

        bind() {
            const body = UI.refs.body;
            body.onclick = async (e) => {
                const t = e.target.closest('[data-sact]');
                if (!t) return;
                const act = t.getAttribute('data-sact');
                if (act === 'toggle-cookie') {
                    const on = !t.classList.contains('on');
                    t.classList.toggle('on', on);
                    Store.set({ curlCookie: on });
                }
                if (act === 'toggle-pdftrick') {
                    const on = !t.classList.contains('on');
                    t.classList.toggle('on', on);
                    Store.set({ baiduPdfTrick: on });
                }
                if (act === 'test') {
                    const msg = body.querySelector('[data-ref="testMsg"]');
                    msg.textContent = '连接中…';
                    this.save();
                    try {
                        if (Store.get('rpcType') === 'gopeed') {
                            await App.gopeedReq('GET', '/api/v1/tasks');
                            msg.textContent = '✔ 已连接 Gopeed';
                            msg.style.color = 'var(--ok)';
                        } else if (Store.get('rpcType') === 'idm') {
                            msg.textContent = 'ℹ IDM 无连通测试：推送时直接发送任务验证（请先启动 IDM）';
                            msg.style.color = 'var(--sub)';
                        } else if (Store.get('rpcType') === 'abdm') {
                            const abHost = String(Store.get('rpcHost') || '').replace(/\/+$/, '');
                            const abPort = String(Store.get('rpcPort') || '10000').trim();
                            const abBase = /:\d+$/.test(abHost) || !abPort ? abHost : abHost + ':' + abPort;
                            const r = await Net.request({
                                method: 'POST', url: abBase + '/ping',
                                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                                raw: true, data: String(Date.now()), timeout: 8000, credentials: false
                            });
                            if (/pong/i.test(String(r.raw || ''))) {
                                msg.textContent = '✔ 已连接 ABDM';
                                msg.style.color = 'var(--ok)';
                            } else {
                                throw new Error(TF('mAbdmPong', { n: r.status }));
                            }
                        } else {
                            const r = await App.rpcCall('aria2.getVersion', []);
                            if (r && r.version) {
                                msg.textContent = '✔ 已连接 aria2 ' + r.version;
                                msg.style.color = 'var(--ok)';
                            } else {
                                msg.textContent = '⚠ 已连上但响应不完整（版本为空），推送可能受影响';
                                msg.style.color = 'var(--warn, #e6a23c)';
                            }
                        }
                    } catch (err) {
                        msg.textContent = '✘ ' + err.message;
                        msg.style.color = 'var(--err)';
                    }
                }
                if (act === 'reset') {
                    Store.reset();
                    UI.refs.wrap.classList.toggle('dark', UI.isDark());
                    this.open();
                    UI.toast(T('mResetDone'), 'ok');
                }
            };

            const urlPreview = () => {
                const el = body.querySelector('#rpc-url-preview');
                if (!el) return;
                const g = (id) => { const n = body.querySelector('#' + id); return n ? n.value.trim() : ''; };
                const host = (g('s-rpc-host') || Store.defaults.rpcHost).replace(/\/+$/, '');
                const port = g('s-rpc-port');
                const type = g('s-rpc-type');
                if (type === 'idm') { el.textContent = 'http://127.0.0.1:1001/client/1（IDM 本地协议）'; return; }
                const defPath = type === 'gopeed' ? '/api/v1/tasks' : '/jsonrpc';
                const path = g('s-rpc-path') || defPath;
                el.textContent = (/:\d+$/.test(host) || !port ? host : host + ':' + port) + path;
            };
            urlPreview();
            /* 切换下载器类型：各自记住地址配置，切换时自动载入 */
            const rpcDefaults = (type) => type === 'gopeed'
                ? { rpcHost: 'http://127.0.0.1', rpcPort: '9999', rpcPath: '/api/v1/tasks', rpcToken: '', rpcDir: 'D:/' }
                : type === 'idm'
                    ? { rpcHost: 'http://127.0.0.1', rpcPort: '1001', rpcPath: '', rpcToken: '', rpcDir: '' }
                    : type === 'abdm'
                        ? { rpcHost: 'http://127.0.0.1', rpcPort: '10000', rpcPath: '/start-headless-download', rpcToken: '', rpcDir: 'D:/Downloads' }
                        : { rpcHost: 'http://127.0.0.1', rpcPort: '6800', rpcPath: '/jsonrpc', rpcToken: '', rpcDir: 'D:/Downloads' };
            const typeName = (t) => t === 'gopeed' ? 'Gopeed' : t === 'idm' ? 'IDM' : t === 'abdm' ? 'ABDM' : 'Aria2/Motrix';
            const typeSel = body.querySelector('#s-rpc-type');
            if (typeSel) typeSel.onchange = () => {
                const g = (id) => { const n = body.querySelector('#' + id); return n ? n.value.trim() : ''; };
                const setv = (id, v) => { const n = body.querySelector('#' + id); if (n) n.value = v; };
                const prev = String(Store.get('rpcType') || 'aria2');
                /* 把当前界面上的配置存进旧类型档案（空值按旧类型自己的默认回填，避免串档污染） */
                const prevDef = rpcDefaults(prev);
                const profiles = GM_getValue('dlm_rpc_profiles', {}) || {};
                profiles[prev] = {
                    rpcHost: g('s-rpc-host') || prevDef.rpcHost,
                    rpcPort: g('s-rpc-port') || prevDef.rpcPort,
                    rpcPath: g('s-rpc-path') || prevDef.rpcPath,
                    rpcToken: g('s-rpc-token'),
                    rpcDir: g('s-rpc-dir') || prevDef.rpcDir
                };
                GM_setValue('dlm_rpc_profiles', profiles);

                const next = ['gopeed', 'idm', 'abdm'].indexOf(typeSel.value) >= 0 ? typeSel.value : 'aria2';
                const prof = profiles[next] || rpcDefaults(next);
                /* IDM 兼容：历史档案可能存了脏端口（非数字或 aria2 遗留的 6800），一律回落 1001 */
                if (next === 'idm') {
                    const p = String(prof.rpcPort || '').trim();
                    prof.rpcPort = (/^\d+$/.test(p) && p !== '6800') ? p : '1001';
                }
                setv('s-rpc-host', prof.rpcHost);
                setv('s-rpc-port', prof.rpcPort);
                setv('s-rpc-path', prof.rpcPath);
                setv('s-rpc-token', prof.rpcToken || '');
                setv('s-rpc-dir', prof.rpcDir || '');
                Store.set({
                    rpcType: next,
                    rpcHost: prof.rpcHost, rpcPort: prof.rpcPort, rpcPath: prof.rpcPath,
                    rpcToken: prof.rpcToken || '', rpcDir: prof.rpcDir || ''
                });
                urlPreview();
                syncHints();
                UI.toast(TF('mSwitched', { name: typeName(next) }), 'ok');
            };
            /* 按下载器类型刷新各行的提示文案（IDM 没有 HTTP 路径概念，重点解释端口） */
            const HINTS = {
                zh: {
                    aria2: { 's-rpc-port': 'Aria2/Motrix 6800~16800', 's-rpc-path': 'Aria2：/jsonrpc', 's-rpc-token': 'Aria2 填 RPC Secret，无则留空', 's-rpc-dir': 'Aria2 下载目录（绝对路径）' },
                    gopeed: { 's-rpc-port': 'Gopeed 默认 9999', 's-rpc-path': 'Gopeed：/api/v1/tasks', 's-rpc-token': 'Gopeed API 令牌，无则留空', 's-rpc-dir': 'Gopeed 下载目录（绝对路径）' },
                    idm: { 's-rpc-port': 'IDM 默认 1001（本机 MSG 报文协议）', 's-rpc-path': 'IDM 无路径概念，留空即可', 's-rpc-token': 'IDM 无需令牌', 's-rpc-dir': 'IDM 按自身分类规则存放，无需填写' },
                    abdm: { 's-rpc-port': 'ABDM 默认 10000', 's-rpc-path': 'ABDM：/start-headless-download', 's-rpc-token': 'ABDM 一般无需令牌', 's-rpc-dir': 'ABDM 下载目录（绝对路径）' }
                },
                en: {
                    aria2: { 's-rpc-port': 'Aria2/Motrix 6800~16800', 's-rpc-path': 'Aria2: /jsonrpc', 's-rpc-token': 'Aria2 RPC secret, leave empty if none', 's-rpc-dir': 'Aria2 download folder (absolute path)' },
                    gopeed: { 's-rpc-port': 'Gopeed default 9999', 's-rpc-path': 'Gopeed: /api/v1/tasks', 's-rpc-token': 'Gopeed API token, leave empty if none', 's-rpc-dir': 'Gopeed download folder (absolute path)' },
                    idm: { 's-rpc-port': 'IDM default 1001 (local MSG protocol)', 's-rpc-path': 'IDM has no path, leave empty', 's-rpc-token': 'Not needed for IDM', 's-rpc-dir': 'IDM categorizes by itself, not needed' },
                    abdm: { 's-rpc-port': 'ABDM default 10000', 's-rpc-path': 'ABDM: /start-headless-download', 's-rpc-token': 'Usually not needed for ABDM', 's-rpc-dir': 'ABDM download folder (absolute path)' }
                }
            };
            function syncHints() {
                const t = (body.querySelector('#s-rpc-type') || {}).value || 'aria2';
                const langMap = HINTS[Store.get('lang') === 'en' ? 'en' : 'zh'] || HINTS.zh;
                const map = langMap[t] || langMap.aria2;
                Object.keys(map).forEach(id => {
                    const el = body.querySelector('#' + id);
                    const hint = el && el.parentElement ? el.parentElement.querySelector('.hint') : null;
                    if (hint) hint.textContent = map[id];
                });
            }
            syncHints();
            const onInput = () => { this.save(); urlPreview(); };
            ['s-rpc-host', 's-rpc-port', 's-rpc-path', 's-rpc-token', 's-rpc-dir', 's-ua', 's-rpc-user', 's-rpc-pass'].forEach(id => {
                const el = body.querySelector('#' + id);
                if (el) el.onchange = onInput;
            });

            /* 落地文件名：实时预览（取当前列表第一个已选文件做样例） */
            const renamePreview = () => {
                const el = body.querySelector('#s-rename-preview');
                if (!el) return;
                const mode = (body.querySelector('#s-rename-mode') || {}).value || 'off';
                const pattern = ((body.querySelector('#s-rename-pattern') || {}).value || '').trim();
                const repl = ((body.querySelector('#s-rename-repl') || {}).value || '');
                const sample = (UI.state.files.find(f => UI.state.selected.has(f.id) && !f.isDir) || UI.state.files.find(f => !f.isDir) || {}).name || '示例文件.mp4';
                if (mode === 'off') { el.textContent = sample + ' （保持原名）'; return; }
                if (!pattern) { el.textContent = sample + ' （规则为空，保持原名）'; return; }
                el.textContent = sample + '  →  ' + U.renameFile(sample, mode, pattern, repl);
                el.style.color = 'var(--accent)';
            };
            const rmSel = body.querySelector('#s-rename-mode');
            const rmPat = body.querySelector('#s-rename-pattern');
            const rmRepl = body.querySelector('#s-rename-repl');
            if (rmSel) rmSel.onchange = () => { this.save(); renamePreview(); };
            if (rmPat) rmPat.oninput = renamePreview;
            if (rmRepl) rmRepl.oninput = renamePreview;
            renamePreview();
            const theme = body.querySelector('#s-theme');
            if (theme) theme.onchange = () => {
                Store.set({ theme: theme.value });
                UI.refs.wrap.classList.toggle('dark', UI.isDark());
            };
        },

        save() {
            const g = (id) => {
                const el = UI.refs.body.querySelector('#' + id);
                return el ? el.value.trim() : '';
            };
            const typeSel = g('s-rpc-type');
            const type = (typeSel === 'gopeed' || typeSel === 'idm' || typeSel === 'abdm') ? typeSel : 'aria2';
            const defPath = type === 'gopeed' ? '/api/v1/tasks' : type === 'idm' ? '' : type === 'abdm' ? '/start-headless-download' : '/jsonrpc';
            Store.set({
                rpcType: type,
                rpcHost: g('s-rpc-host') || Store.defaults.rpcHost,
                rpcPort: g('s-rpc-port') || (type === 'gopeed' ? '9999' : type === 'idm' ? '1001' : type === 'abdm' ? '10000' : '6800'),
                rpcPath: g('s-rpc-path') || defPath,
                rpcToken: g('s-rpc-token'),
                rpcUser: g('s-rpc-user'),
                rpcPass: g('s-rpc-pass'),
                rpcDir: g('s-rpc-dir'),
                ua: g('s-ua') || navigator.userAgent,
                renameMode: (['off', 'prefix', 'suffix', 'replace', 'regex'].indexOf(g('s-rename-mode')) >= 0) ? g('s-rename-mode') : 'off',
                renamePattern: g('s-rename-pattern'),
                renameRepl: g('s-rename-repl')
            });
        }
    };

    /* ============================================================
     *  7. 主控制器
     * ============================================================ */
    const App = {
        ctx: null,

        init() {
            /* 百度 OAuth 授权页：专职抓 access_token 后关页，不挂 UI */
            if (/(^|\.)openapi\.baidu\.com$/.test(location.hostname) && /oauth/.test(location.pathname)) {
                Baidu.captureTokenPage();
                return;
            }
            this.ctx = detectProvider();
            /* 无论是否识别到网盘，都挂载 UI 并注册菜单：保证悬浮球和“助手设置”始终可用 */
            UI.mount();
            UI.updateMeta();
            console.log('[CLM] 已加载', location.href,
                this.ctx ? (this.ctx.provider.key + ' / ' + this.ctx.kind) : '未识别到网盘页面');

            if (this.ctx && this.ctx.provider === Baidu && this.ctx.kind === 'share') {
                Baidu.autoUnlock().catch(function (e) { console.warn('[CLM] autoUnlock 失败：', e); });
            }

            try {
                GM_registerMenuCommand(T('menuOpen') + ' ' + APP.name, () => UI.open());
                GM_registerMenuCommand('助手设置', () => Settings.open());
                GM_registerMenuCommand('下载历史', () => App.historyView());
                if (this.ctx) GM_registerMenuCommand('解析当前列表', () => App.parse('list'));
                /* 夸克页面：签到领容量（借鉴 【玩的嗨】VIP工具箱） */
                if (this.ctx && this.ctx.provider === Quark) {
                    GM_registerMenuCommand('夸克签到领容量', () => guard(App.quarkSign()));
                }
            } catch (e) { /* 个别管理器不支持菜单命令，忽略 */ }

            document.addEventListener('keydown', (e) => {
                if (e.altKey && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
                    e.preventDefault();
                    UI.open();
                }
            });

            /* SPA 路由变化（百度 hash / 夸克、阿里 pushState）时重新识别页面 */
            let lastUrl = location.href;
            const redetect = () => {
                if (location.href === lastUrl) return;
                lastUrl = location.href;
                this.ctx = detectProvider();
                UI.updateMeta();
            };
            window.addEventListener('popstate', redetect);
            window.addEventListener('hashchange', redetect);
            setInterval(redetect, 1500);
        },

        async quarkSign() {
            try {
                const r = await Quark.capacitySign();
                if (r.already) UI.toast(T('mSignedAlready'), 'ok');
                else UI.toast(TF('mSignedOk', { gain: r.gain != null ? r.gain : T('mUnknown') }), 'ok');
            } catch (err) {
                UI.toast(err.message || T('mSignFail'), 'err');
            }
        },

        async parse(mode) {
            if (!this.ctx) return UI.toast(T('mNoCtx'), 'err');
            const { provider, kind } = this.ctx;
            if (UI.state.busy) return;

            UI.state.busy = true;
            UI.setBusy(true);
            if (!UI.refs.mask.classList.contains('show')) UI.open();
            UI.refs.panel.classList.remove('small'); /* 从设置页直接点解析/重新解析时恢复面板宽度 */
            UI.setMsg(T('mParsing'));

            try {
                let files = [];
                if (mode === 'checked' && typeof provider.checked === 'function') {
                    files = await provider.checked();
                    if (!files.length) {
                        UI.toast(T('mNoChecked'));
                        files = await provider.listFiles(kind);
                    }
                } else {
                    files = await provider.listFiles(kind);
                }

                if (!files.length) {
                    UI.renderEmpty('当前目录没有可解析的文件，请进入文件夹后重试。');
                    UI.toast(T('mNoFiles'), 'err');
                    return;
                }

                UI.state.files = files;
                UI.state.selected.clear();
                files.filter(f => !f.isDir).forEach(f => UI.state.selected.add(f.id));

                UI.renderRows();
                UI.updateStats();
                UI.setMsg(TF('mLoaded', { n: files.length }));

                if (Store.get('autoOpen')) UI.open();
            } catch (err) {
                UI.setMsg('');
                UI.toast(err.message || T('mParseFail'), 'err');
                UI.refs.body.innerHTML = `<div class="empty"><div class="big">⚠️</div>
                    <div style="color:var(--err);font-weight:600;margin-bottom:8px">${U.esc(err.message || '解析失败')}</div>
                    <div>常见原因：未登录、登录态过期、分享失效、接口限流。<br>请刷新页面后重试；若仍失败，打开 <code>设置 → 诊断信息</code> 查看状态。</div>
                </div>`;
            } finally {
                UI.setBusy(false);
            }
        },

        async ensureLink(file) {
            if (file.link) return file.link;
            if (file._loading) return file._loading;
            const { provider, kind } = this.ctx;
            file._loading = provider.getLink(file, kind).then(url => {
                file.link = url;
                file._loading = null;
                return url;
            }).catch(err => {
                file._loading = null;
                throw err;
            });
            return file._loading;
        },

        byId(id) { return UI.state.files.find(f => f.id === id); },

        /* 落地文件名：按设置里的重命名规则变换原名（用于浏览器/增强/网页下载出口） */
        outName(f) {
            const mode = Store.get('renameMode');
            if (!mode || mode === 'off') return U.safeName(f.name);
            return U.safeName(U.renameFile(f.name, mode, Store.get('renamePattern'), Store.get('renameRepl')));
        },

        /* 记录下载历史：way 为出口标识（copy/browser/enhance/page/aria/curl/bc 或 rpcType） */
        record(way, f, url) {
            if (!url || !/^https?:/i.test(url)) return;
            try {
                History.add({
                    way: String(way || ''),
                    pan: this.ctx ? this.ctx.provider.name : '',
                    name: f && f.name ? f.name : '',
                    size: Number(f && f.size) || 0,
                    url: String(url)
                });
            } catch (e) { /* 忽略 */ }
        },

        async copyOne(id) {
            const f = this.byId(id);
            if (!f) return;
            try {
                UI.setMsg(T('mGettingLink'));
                const url = await this.ensureLink(f);
                GM_setClipboard(url, 'text');
                this.record('copy', f, url);
                UI.setMsg('');
                UI.toast(TF('mCopied', { name: f.name.slice(0, 24) }), 'ok');
                this.markLinked(f);
            } catch (err) {
                UI.setMsg('');
                UI.toast(err.message, 'err');
            }
        },

        /* aria2c 命令行导出（XDown / Linux Shell / 手动 aria2 用户）；
           Cookie 策略与 cURL 一致：夸克必带（防盗链），其他网盘按开关 */
        ariaCmd(url, name, sub) {
            const h = this.headers();
            const { provider } = this.ctx;
            let dir = String(Store.get('rpcDir') || 'D:/Downloads').replace(/\\/g, '/');
            if (sub) dir = dir.replace(/\/+$/, '') + '/' + String(sub).replace(/\\/g, '/');
            let cmd = 'aria2c -x16 -s16 -k1M --file-allocation=none';
            cmd += ' -U "' + (h['User-Agent'] || navigator.userAgent) + '"';
            cmd += ' --referer "' + h['Referer'] + '"';
            if (h['Cookie'] && (provider === Quark || provider === Uc || Store.get('curlCookie'))) cmd += ' --header "Cookie: ' + h['Cookie'] + '"';
            cmd += ' -d "' + dir + '" -o "' + U.safeName(name) + '"';
            cmd += ' "' + url + '"';
            return cmd;
        },

        async ariaOne(id) {
            const f = this.byId(id);
            if (!f) return;
            try {
                UI.setMsg(T('mGenAria'));
                const url = await this.ensureLink(f);
                GM_setClipboard(this.ariaCmd(url, f.name, f.path), 'text');
                this.record('aria', f, url);
                UI.setMsg('');
                UI.toast(T('mAriaCopied'), 'ok');
                this.markLinked(f);
            } catch (err) {
                UI.setMsg('');
                UI.toast(err.message, 'err');
            }
        },

        async curlOne(id) {
            const f = this.byId(id);
            if (!f) return;
            try {
                UI.setMsg(T('mGenCurl'));
                const url = await this.ensureLink(f);
                GM_setClipboard(this.curl(url, f.name), 'text');
                this.record('curl', f, url);
                UI.setMsg('');
                UI.toast(T('mCurlCopied'), 'ok');
                this.markLinked(f);
            } catch (err) {
                UI.setMsg('');
                UI.toast(err.message, 'err');
            }
        },

        /* 推送 + 夸克 412 自动重推：
           夸克 CDN 的 __puus 签名绑定直链与 Cookie，过期即 412。
           抓到 412 就丢弃旧直链、重新解析（新直链自带新 __puus）再推一次。 */
        async pushRpc(f) {
            let url;
            try {
                url = await this.ensureLink(f);
                const r = await this.rpcAdd(url, f.name, f.path, f.size);
                this.record(String(Store.get('rpcType') || 'aria2'), f, url);
                return r;
            } catch (err) {
                if (this.ctx && (this.ctx.provider === Quark || this.ctx.provider === Uc) && /412/.test(String((err && err.message) || ''))) {
                    console.warn('[CLM][RPC] ' + this.ctx.provider.name + ' 412：已刷新直链与 Cookie，自动重推', f.name);
                    f.link = null;
                    f._loading = null;
                    url = await this.ensureLink(f);
                    const r2 = await this.rpcAdd(url, f.name, f.path, f.size);
                    this.record(String(Store.get('rpcType') || 'aria2'), f, url);
                    return r2;
                }
                throw err;
            }
        },

        async rpcOne(id) {
            const f = this.byId(id);
            if (!f) return;
            try {
                UI.setMsg(T('mPushing'));
                const r = await this.pushRpc(f);
                UI.setMsg('');
                const status = String(r).split('|')[1] || '';
                UI.toast(TF('mPushed', { name: f.name.slice(0, 20), status: status ? TF('mPushStatus', { s: status }) : '' }), 'ok');
                this.markLinked(f);
            } catch (err) {
                UI.setMsg('');
                console.error('[CLM][RPC] 推送失败：', err);
                UI.toast(err && err.message ? err.message : String(err), 'err');
            }
        },

        async download(id) {
            const f = this.byId(id);
            if (!f) return;
            if (f.size > 2 * 1024 * 1024 * 1024 && !f._bigOk) {
                f._bigOk = true;
                return UI.toast(T('mTooBig2G'), 'err');
            }
            try {
                UI.setMsg(T('mPreparing'));
                const url = await this.ensureLink(f);
                this.markLinked(f);

                const headers = this.headers(f);
                let lastTick = 0;
                let task = null;
                let done = false;
                /* 看门狗：45 秒无进展则中止，回退浏览器原生下载（直链带 access_token 时服务端有 Content-Disposition） */
                const watchdog = setTimeout(() => {
                    if (!done && task) { try { task.abort(); } catch (e) { /* 已结束则忽略 */ } }
                }, 45000);
                try {
                    await Net.request({
                        method: 'GET',
                        url,
                        headers,
                        blob: true,
                        timeout: 0,
                        onTask: (t) => { task = t; },
                        onprogress: (e) => {
                            const now = Date.now();
                            if (now - lastTick < 300) return;
                            lastTick = now;
                            const loaded = e.loaded || 0;
                            const pct = f.size ? ' ' + Math.min(100, Math.floor(loaded / f.size * 100)) + '%' : '';
                            UI.setProgress(f.id, U.size(loaded) + pct);
                        }
                    }).then(res => {
                        done = true;
                        clearTimeout(watchdog);
                        const blob = res.data;
                        if (!blob || !blob.size) throw new Error(T('mEmptyBlob'));
                        this.saveBlob(blob, this.outName(f));
                        this.record('browser', f, url);
                        UI.setProgress(f.id, '完成');
                        setTimeout(() => UI.setProgress(f.id, ''), 2500);
                    });

                    UI.setMsg('');
                    UI.toast(TF('mDlDone', { name: f.name.slice(0, 22) }), 'ok');
                } catch (err) {
                    done = true;
                    clearTimeout(watchdog);
                    UI.setProgress(f.id, '');
                    /* 回退：浏览器原生下载（d.pcs 直链自带 Content-Disposition，无需 UA/Cookie） */
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = this.outName(f);
                    a.rel = 'noopener';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => a.remove(), 3000);
                    this.record('browser', f, url);
                    UI.toast(TF('mDlFallback', { err: (err && err.message) || T('mUnknown') }), 'ok');
                }
                UI.setMsg('');
            } catch (err) {
                UI.setMsg('');
                UI.setProgress(f.id, '');
                UI.toast((err && err.message) || T('mDlFail'), 'err');
            }
        },

        saveBlob(blob, name) {
            const a = document.createElement('a');
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 20000);
        },

        markLinked(f) {
            const el = UI.refs.body.querySelector('[data-check="' + U.escSel(f.id) + '"]');
            if (!el) return;
            const txt = el.closest('tr').querySelector('.txt');
            if (txt) txt.classList.remove('dim');
        },

        headers(f) {
            const { provider } = this.ctx;
            const h = {
                'User-Agent': provider === Quark ? QUARK_UA : Store.get('ua'),
                'Referer': provider.referer || location.origin + '/'
            };
            if (provider === Baidu && U.cookie('BDUSS')) {
                h['Cookie'] = 'BDUSS=' + U.cookie('BDUSS') + (U.cookie('STOKEN') ? '; STOKEN=' + U.cookie('STOKEN') : '');
            }
            /* 夸克/UC 直链 CDN 有防盗链校验（缺 Cookie 时 HTTP 412），必须带 __puus 等本站 Cookie。
               按 __puus → __pus → __kp 优先级排序：aria2 的 cookie 参数等只取第一对 */
            if ((provider === Quark || provider === Uc) && document.cookie) {
                h['Cookie'] = this.quarkCookie() || document.cookie;
            }
            /* 天翼 CDN 部分链路校验会话 Cookie，尽力携带（HttpOnly 的部分拿不到，靠浏览器直存兜底） */
            if (provider === Cloud189 && document.cookie) {
                h['Cookie'] = document.cookie;
            }
            return h;
        },

        /* 夸克防盗链 Cookie 重排序：__puus 是 412 校验的关键，必须排在最前 */
        quarkCookie() {
            const prio = ['__puus', '__pus', '__kp', '__kps', '__ktd', '__uid'];
            const pairs = [];
            (document.cookie || '').split(';').forEach(p => {
                p = p.trim();
                if (!p) return;
                const i = p.indexOf('=');
                if (i > 0) pairs.push([p.slice(0, i), p.slice(i + 1)]);
            });
            pairs.sort((a, b) => {
                const ia = prio.indexOf(a[0]), ib = prio.indexOf(b[0]);
                return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
            });
            return pairs.map(x => x.join('=')).join('; ');
        },

        curl(url, name) {
            const h = this.headers();
            const { provider } = this.ctx;
            let cmd = 'curl -L -C - "' + url + '" -o "' + U.safeName(name) + '"';
            cmd += ' -H "User-Agent: ' + h['User-Agent'] + '"';
            cmd += ' -H "Referer: ' + h['Referer'] + '"';
            /* 夸克/UC 直链必须带 Cookie（否则 412），其他网盘按用户开关决定 */
            if (h['Cookie'] && (provider === Quark || provider === Uc || Store.get('curlCookie'))) cmd += ' -H "Cookie: ' + h['Cookie'] + '"';
            return cmd;
        },

        /* BitComet bc:// 协议导出（借鉴 KubeDown 的本地编码格式，零服务器依赖） */
        bitcomet(url, name) {
            const h = this.headers();
            const payload = 'AA/' + U.safeName(name) + '/?url=' + encodeURIComponent(url) + '&user_agent=' + (h['User-Agent'] || navigator.userAgent) + 'ZZ';
            return 'bc://http/' + btoa(unescape(encodeURIComponent(payload)));
        },

        async bcOne(id) {
            const f = this.byId(id);
            if (!f) return;
            try {
                UI.setMsg(T('mGenBc'));
                const url = await this.ensureLink(f);
                GM_setClipboard(this.bitcomet(url, f.name), 'text');
                this.record('bc', f, url);
                UI.setMsg('');
                UI.toast(T('mBcCopied'), 'ok');
                this.markLinked(f);
            } catch (err) {
                UI.setMsg('');
                UI.toast(TF('mBcFail', { err: (err && err.message) || err }), 'err');
            }
        },

        /* 只有配置了密钥才发 token 参数；未启用密钥的下载器不期望收到 token: */
        rpcTokenParam() {
            const t = String(Store.get('rpcToken') || '').trim();
            return t ? 'token:' + t : null;
        },

        /* ---- Gopeed（Go 下载器，REST API，非 aria2 JSON-RPC 协议） ---- */
        gopeedBase() {
            const host = String(Store.get('rpcHost') || '').replace(/\/+$/, '');
            const port = String(Store.get('rpcPort') || '').trim();
            return (/:\d+$/.test(host) || !port) ? host : host + ':' + port;
        },

        gopeedHeaders() {
            const h = { 'Content-Type': 'application/json' };
            const token = String(Store.get('rpcToken') || '').trim();
            if (token) h['X-Api-Token'] = token;
            return h;
        },

        async gopeedReq(method, path, body) {
            const res = await Net.request({
                method,
                url: this.gopeedBase() + path,
                headers: this.gopeedHeaders(),
                data: body ? JSON.stringify(body) : undefined,
                timeout: 10000
            });
            const d = (res.data && typeof res.data === 'object') ? res.data : {};
            if (res.status === 401 || res.status === 403) {
                throw new Error(TF('mGopeedAuth', { n: res.status }));
            }
            if (res.status === 404) {
                throw new Error(TF('mGopeed404', { url: this.gopeedBase() + path }));
            }
            if (d.code !== 0 && d.code !== undefined && d.code !== null) {
                throw new Error(TF('mGopeedErr', { msg: d.msg || JSON.stringify(d).slice(0, 120) }));
            }
            return { d, raw: res.raw, status: res.status };
        },

        /* 保存目录拼接：子目录还原（迅雷文件夹递归的相对路径） */
        joinDir(base, sub) {
            const b = String(base || '').replace(/[\\/]+$/, '');
            const s = String(sub || '').replace(/\\/g, '/').replace(/^\/+/, '');
            return s ? (b ? b + '/' + s : s) : (b || '');
        },

        /* IDM（Internet Download Manager）本地协议直推。
           协议来自 迅雷云盘直链 xndeye：POST http://127.0.0.1:1001/client/1，
           MSG#seq#13#1#10241 文本报文，字段为 key=UTF8字节长度:value */
        idmSeq: 0,

        async idmAdd(url, name, size) {
            this.idmSeq++;
            const seq = this.idmSeq;
            const enc = new TextEncoder();
            const h = this.headers();
            const headerLines = {
                'User-Agent': h['User-Agent'] || navigator.userAgent,
                'Origin': location.origin,
                'Referer': (h['Referer'] || location.origin) + '/'
            };
            /* 夸克防盗链等场景需要 Cookie，IDM 请求头里也带上 */
            if (h['Cookie']) headerLines['Cookie'] = h['Cookie'];
            const headerText = Object.entries(headerLines).map(([k, v]) => k + ': ' + v).join('\n') + '\n';
            const ext = String(name).indexOf('.') >= 0 ? String(name).slice(String(name).lastIndexOf('.') + 1) : '';
            const field = (k, v) => k + '=' + enc.encode(String(v == null ? '' : v)).length + ':' + String(v == null ? '' : v);
            const data = 'MSG#' + seq + '#13#1#10241:' + (seq + 1000) + ':0:' + Date.now() + ':0:1:2:' + (Number(size) || 0) + ':0,' +
                [field(4, ext), field(6, url), field(7, location.origin), field(11, headerText), field(100, name), field(122, 4)].join(',') + ';';
            console.log('[CLM][IDM] 发送任务 #' + seq + ' →', name);
            /* IDM 端口解析：数字且不等于全局 aria2 默认 6800（= 旧版遗留的未配置标志）才生效，否则回落 1001 */
            const rawPort = String(Store.get('rpcPort') || '').trim();
            const idmPort = /^\d+$/.test(rawPort) && rawPort !== '6800' ? rawPort : '1001';
            const res = await Net.request({
                method: 'POST',
                url: 'http://127.0.0.1:' + idmPort + '/client/1?seq=' + seq,
                headers: { 'Content-Type': 'text/plain' },
                data,
                timeout: 5000
            });
            const body = String(res.raw || (typeof res.data === 'string' ? res.data : '') || '');
            if (res.status >= 200 && res.status < 300 && body.indexOf(seq + ':3;') >= 0) return seq + '|accepted';
            if (res.status >= 200 && res.status < 300) {
                throw new Error(TF('mIdmRejected', { body: body.slice(0, 80) }));
            }
            throw new Error(TF('mIdmUnreachable', { n: res.status }));
        },

        /* AB Download Manager（ABDM）直推（借鉴 LinkSwift sendLinkToABDM）：
           POST /start-headless-download，body 含 downloadSource（link/headers），响应文本 OK 即成功 */
        async abdmAdd(url, name, sub) {
            const h = this.headers();
            const header = { 'User-Agent': h['User-Agent'] || navigator.userAgent };
            if (h['Referer']) header['Referer'] = h['Referer'];
            if (h['Cookie']) header['Cookie'] = h['Cookie'];
            const host = String(Store.get('rpcHost') || '').replace(/\/+$/, '');
            const port = String(Store.get('rpcPort') || '10000').trim();
            const base = /:\d+$/.test(host) || !port ? host : host + ':' + port;
            const body = {
                downloadSource: {
                    name: U.safeName(name),
                    description: 'CloudLink Master Pro',
                    link: url,
                    headers: header,
                    downloadPage: h['Referer'] || location.origin
                },
                name: U.safeName(name)
            };
            const folder = this.joinDir(Store.get('rpcDir'), sub);
            if (folder) body.folder = folder;
            console.log('[CLM][ABDM] 创建任务 →', base, name);
            const res = await Net.request({
                method: 'POST',
                url: base + (Store.get('rpcPath') || '/start-headless-download'),
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                data: JSON.stringify(body),
                raw: true,
                timeout: 8000,
                credentials: false
            });
            const txt = String(res.raw == null ? '' : res.raw).trim();
            if (!/^OK$/i.test(txt) || res.status >= 400) {
                throw new Error(TF('mAbdmRejected', { n: res.status, body: txt ? '：' + txt.slice(0, 80) : '' }));
            }
            return 'abdm-task';
        },

        async gopeedAdd(url, name, sub) {
            const h = this.headers();
            const header = { 'User-Agent': h['User-Agent'] };
            if (h['Referer']) header['Referer'] = h['Referer'];
            if (h['Cookie']) header['Cookie'] = h['Cookie'];
            const body = {
                req: { url, extra: { method: 'GET', header } },
                opt: { path: this.joinDir(Store.get('rpcDir'), sub), name: U.safeName(name) }
            };
            console.log('[CLM][Gopeed] 创建任务 →', this.gopeedBase(), name);
            const { d, raw, status } = await this.gopeedReq('POST', Store.get('rpcPath') || '/api/v1/tasks', body);
            const id = d.data;
            if (!id) throw new Error(TF('mGopeedNoId', { n: status, raw: String(raw || '(空)').slice(0, 120) }));
            /* 追问任务状态：把“创建成功但没下载”变成明确报错 */
            await U.sleep(800);
            try {
                const st = await this.gopeedReq('GET', '/api/v1/tasks/' + encodeURIComponent(String(id)));
                const task = (st.d.data && typeof st.d.data === 'object') ? st.d.data : {};
                console.log('[CLM][Gopeed] 任务状态：', task.status || '?', task.msg || '');
                if (task.status === 'error') {
                    const em = String(task.msg || task.error || '未知错误');
                    const hint = /412/.test(em)
                        ? '（HTTP 412 = 夸克 CDN 防盗链校验失败：脚本将自动用新直链重推一次；若仍失败请重新解析后再推，或改用「网页下载」/cURL）'
                        : '（常见原因：保存目录不存在/无写权限、直链已过期）';
                    throw new Error(TF('mGopeedTaskFail', { err: em, hint: hint }));
                }
                return id + '|' + (task.status || 'running');
            } catch (e) {
                if (/Gopeed (任务失败|task failed)/.test(e && e.message || '')) throw e;
                return id; /* 状态查询失败不影响已创建的任务 */
            }
        },

        /* aria2 addUri 的任务参数（rpcAdd 单推与 ariaBatch 批推共用） */
        ariaOpt(name, sub) {
            const h = this.headers();
            const ariaHeaders = ['User-Agent: ' + h['User-Agent'], 'Referer: ' + h['Referer']];
            if (h['Cookie']) ariaHeaders.push('Cookie: ' + h['Cookie']);
            const opt = {
                dir: this.joinDir(Store.get('rpcDir'), sub),
                out: U.safeName(name),
                'user-agent': h['User-Agent'],
                referer: h['Referer'],
                header: ariaHeaders
            };
            if (h['Cookie']) opt.cookie = h['Cookie'].split(';')[0].trim();
            return opt;
        },

        /* 增强下载（借鉴 LinkSwift enhance 引擎）：
           Range 分片并发（单文件 3 线程）+ 智能分块调整 + 失败重试，
           全部数据在浏览器内存合成 Blob 后保存。适合无下载软件的场景。 */
        async enhanceAll() {
            const sel = UI.state.files.filter(f => UI.state.selected.has(f.id) && !f.isDir);
            if (!sel.length) return UI.toast(T('mEnhNoSel'), 'err');
            if (this._enhanceBusy) {
                /* 任务进行中再点 = 请求取消（分片边界安全退出），而不是干等 */
                if (!this._enhanceCancel) {
                    this._enhanceCancel = true;
                    return UI.toast(T('mEnhCancelReq'), 'warn');
                }
                return UI.toast(T('mEnhStopping'), 'warn');
            }
            this._enhanceBusy = true;
            this._enhanceCancel = false;
            UI.toast(TF('mEnhStart', { n: sel.length }));
            let ok = 0, fail = 0, cancel = false;
            const errors = [];
            try {
                for (let i = 0; i < sel.length; i++) {
                    const f = sel[i];
                    if (this._enhanceCancel) { cancel = true; break; }
                    try {
                        await this.enhanceDownload(f);
                        ok++;
                        this.markLinked(f);
                    } catch (err) {
                        const msg = String((err && err.message) || err);
                        if (/已手动取消|Manually cancelled/.test(msg)) { cancel = true; break; }
                        fail++;
                        console.error('[CLM][增强] 失败「' + f.name + '」：', err);
                        if (errors.length < 3) errors.push(f.name.slice(0, 16) + '：' + msg.slice(0, 60));
                    }
                }
            } finally {
                this._enhanceBusy = false;
                if (this._enhanceCancel) cancel = true;
                this._enhanceCancel = false;
                UI.setMsg('');
            }
            if (cancel) UI.toast(TF('mEnhCancelled', { ok: ok }), 'warn');
            else {
                const extra = fail ? '\n' + errors.join('\n') : '';
                UI.toast(TF('mEnhDoneN', { ok: ok, fail: fail ? TF('mFailPart', { n: fail }) : '' }), fail ? 'err' : 'ok');
            }
        },

        async enhanceDownload(f) {
            UI.setProgress(f.id, '准备中…');
            let done = false, wd = null;
            try {
                const url = await this.ensureLink(f);
                const h = this.headers();
                const size = Number(f.size) || 0;
                if (!size) throw new Error(T('mEnhNoSize'));
                if (size > 2 * 1024 * 1024 * 1024) throw new Error(T('mEnhTooBig'));

                /* 探测分片支持：bytes=0-0 应答 206 才走分片，否则直接引导用户走别的出口 */
                UI.setProgress(f.id, '探测中…');
                const probe = await Net.request({
                    method: 'GET', url,
                    headers: Object.assign({}, h, { Range: 'bytes=0-0' }),
                    ab: true, timeout: 20000, credentials: true
                });
                if (probe.status !== 206) {
                    throw new Error(TF('mEnhNoRange', { n: probe.status }));
                }

                /* 智能分块参数（与 LinkSwift enhance 同款思路）：50KB~8MB，初始取 37% 位 */
                const MIN = 50 * 1024, MAX = 8 * 1024 * 1024;
                let chunk = Math.floor(MIN + (MAX - MIN) * 0.37);
                let offset = 0, seq = 0, loaded = 0, maxSpeed = 0, lastMsg = 0;
                /* 停滞看门狗：60 秒没有任何字节增长视为卡死，让分片循环自行中止（不再无限干等） */
                let stall = false, lastLoaded = 0, lastMove = Date.now();
                wd = setInterval(() => {
                    if (loaded > lastLoaded) { lastLoaded = loaded; lastMove = Date.now(); }
                    else if (Date.now() - lastMove > 60000) stall = true;
                }, 5000);
                const results = [];
                const WORKERS = 3, RETRY = 5;
                const stopMsg = () => this._enhanceCancel ? T('mStopCancel') : T('mStopStall');
                const worker = async () => {
                    while (offset < size) {
                        if (this._enhanceCancel || stall) throw new Error(stopMsg());
                        const i = seq++;
                        const start = offset;
                        const end = Math.min(start + chunk - 1, size - 1);
                        const seg = end - start + 1;
                        offset += seg;
                        let attempt = 0;
                        while (attempt <= RETRY) {
                            const t0 = Date.now();
                            try {
                                const res = await Net.request({
                                    method: 'GET', url,
                                    headers: Object.assign({}, h, { Range: 'bytes=' + start + '-' + end }),
                                    ab: true, timeout: 60000, credentials: true
                                });
                                if (res.status < 200 || res.status >= 300) throw new Error(TF('mChunkHttp', { n: res.status }));
                                results[i] = res.data;
                                loaded += seg;
                                /* 智能分块调整：速度维持高位 → 放大 1.5x；跑太快 → 1.2x；太慢 → 0.8x；平滑过渡 */
                                const dur = (Date.now() - t0) / 1000 || 0.1;
                                const speed = seg / dur;
                                let next;
                                if (speed > maxSpeed * 0.9) { next = chunk * 1.5; maxSpeed = Math.max(maxSpeed, speed); }
                                else if (dur < 0.75) next = chunk * 1.2;
                                else if (dur > 3) next = chunk * 0.8;
                                else next = chunk;
                                chunk = Math.floor(Math.max(MIN, Math.min(MAX, chunk * 0.7 + next * 0.3)));
                                const now = Date.now();
                                if (now - lastMsg > 400) {
                                    lastMsg = now;
                                    const pct = Math.min(100, loaded * 100 / size).toFixed(1) + '%';
                                    UI.setProgress(f.id, pct);
                                    UI.setMsg(T('mEnhProg') + ' ' + f.name.slice(0, 12) + ' ' + pct + ' · ' + U.size(loaded) + '/' + U.size(size) + ' · ' + U.size(speed) + '/s');
                                }
                                break;
                            } catch (e) {
                                attempt++;
                                if (this._enhanceCancel || stall) throw new Error(stopMsg());
                                if (attempt > RETRY) throw e;
                                await U.sleep(800 * attempt);
                            }
                        }
                    }
                };
                await Promise.all([worker(), worker(), worker()]);
                if (results.some(r => !r)) throw new Error(T('mEnhPartial'));
                UI.setMsg(T('mEnhMerging'));
                const out = this.outName(f);
                this.saveBlob(new Blob(results), out);
                this.record('enhance', f, url);
                UI.setProgress(f.id, '完成');
                UI.toast(TF('mEnhDoneFile', { name: out.slice(0, 30) }), 'ok');
                done = true;
            } finally {
                if (wd) clearInterval(wd);
                if (!done) UI.setProgress(f.id, '');
            }
        },

        async rpcAdd(url, name, sub, size) {
            if (Store.get('rpcType') === 'gopeed') return this.gopeedAdd(url, name, sub);
            if (Store.get('rpcType') === 'idm') return this.idmAdd(url, name, size);
            if (Store.get('rpcType') === 'abdm') return this.abdmAdd(url, name, sub);
            const opt = this.ariaOpt(name, sub);
            const tp = this.rpcTokenParam();
            const params = tp ? [tp, [url], opt] : [[url], opt];
            console.log('[CLM][RPC] addUri 请求 →', opt.dir, opt.out);
            const gid = await this.rpcCall('aria2.addUri', params);
            if (!gid) throw new Error(T('mRpcNoGid'));
            /* 轮询任务状态（共 3 次 / 约 3 秒）：把“推送成功但没下载”变成明确报错 */
            let st = null;
            for (let i = 0; i < 3; i++) {
                await U.sleep(700 + i * 400);
                try {
                    st = await this.rpcCall('aria2.tellStatus',
                        tp ? [tp, gid, ['status', 'errorCode', 'errorMessage']] : [gid, ['status', 'errorCode', 'errorMessage']]);
                } catch (e) {
                    console.warn('[CLM][RPC] tellStatus 查询失败：', e && e.message);
                    break; /* 状态查询失败不影响已被接受的任务 */
                }
                if (!st) break;
                console.log('[CLM][RPC] 任务状态[' + (i + 1) + ']：', st.status || '?', st.errorMessage || '');
                if (st.status === 'error' || st.status === 'removed') {
                    const em = String(st.errorMessage || st.errorCode || st.status);
                    const hint = /412/.test(em)
                        ? T('m412Hint')
                        : T('mHintCommon');
                    throw new Error(TF('mTaskFail', { err: em, hint: hint }));
                }
                if (st.status === 'active' || st.status === 'complete') break; /* 正在下载/已完成，无需继续轮询 */
            }
            return (st && st.status) ? gid + '|' + st.status : gid;
        },

        /* RPC 请求头：token 走 params，Basic Auth（用户名/密码）走 Authorization 头 */
        rpcHeaders() {
            const h = { 'Content-Type': 'application/json' };
            const u = String(Store.get('rpcUser') || '');
            const p = String(Store.get('rpcPass') || '');
            if (u || p) {
                try { h['Authorization'] = 'Basic ' + btoa(unescape(encodeURIComponent(u + ':' + p))); }
                catch (e) { /* 编码失败则不带认证 */ }
            }
            return h;
        },

        /* aria2 批量推送（借鉴 迅雷云盘直链）：一次 JSON-RPC 批量提交最多 50 个
           addUri 任务；返回 { ok, failed:[{name,file}] }，失败项由调用方逐个重试 */
        async ariaBatch(items) {
            const tp = this.rpcTokenParam();
            const payload = items.map((it, i) => ({
                jsonrpc: '2.0',
                id: String(i),
                method: 'aria2.addUri',
                params: tp ? [tp, [it.url], this.ariaOpt(it.name, it.sub)] : [[it.url], this.ariaOpt(it.name, it.sub)]
            }));
            const host = String(Store.get('rpcHost') || '').replace(/\/+$/, '');
            const port = String(Store.get('rpcPort') || '').trim();
            const path = String(Store.get('rpcPath') || '/jsonrpc');
            const base = /:\d+$/.test(host) || !port ? host : host + ':' + port;
            const url = base + path;
            const ok = [];
            const failed = [];
            for (let start = 0; start < payload.length; start += 50) {
                const batch = payload.slice(start, start + 50);
                const res = await Net.request({
                    method: 'POST', url,
                    headers: this.rpcHeaders(),
                    data: JSON.stringify(batch),
                    timeout: 30000
                });
                if (res.status === 404) {
                    throw new Error(TF('mRpc404', { url: url }));
                }
                const d = res.data;
                if (!Array.isArray(d)) {
                    throw new Error((d && d.error && d.error.message) || TF('mBatchInvalid', { n: res.status }));
                }
                batch.forEach((task) => {
                    const r = d.find(x => String(x && x.id) === task.id);
                    if (r && !r.error && typeof r.result === 'string') ok.push(task);
                    else failed.push(task);
                });
            }
            console.log('[CLM][RPC] 批量推送：成功 ' + ok.length + '，待重试 ' + failed.length);
            return { ok: ok.length, failed };
        },

        async rpcCall(method, params) {
            const host = String(Store.get('rpcHost') || '').replace(/\/+$/, '');
            const port = String(Store.get('rpcPort') || '').trim();
            const path = String(Store.get('rpcPath') || '/jsonrpc');
            const base = /:\d+$/.test(host) || !port ? host : host + ':' + port;
            const url = base + path;

            const payload = {
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params: method === 'aria2.getVersion'
                    ? (this.rpcTokenParam() ? [this.rpcTokenParam()] : [])
                    : params
            };

            const res = await Net.request({
                method: 'POST',
                url,
                headers: this.rpcHeaders(),
                data: JSON.stringify(payload),
                timeout: 8000,
                credentials: false
            });
            if (res.status === 404) {
                throw new Error(TF('mRpc404Full', { url: url }));
            }
            const d = (res.data && typeof res.data === 'object') ? res.data : {};
            if (d.error) {
                const m = String(d.error.message || 'RPC 返回错误');
                if (/unauthorized/i.test(m)) throw new Error(T('mRpcUnauthorized'));
                if (/method not found/i.test(m)) throw new Error(T('mRpcNoMethod'));
                throw new Error(m);
            }
            if (d.result === undefined) {
                console.error('[CLM][RPC] 响应异常：', res.status, String(res.raw || '').slice(0, 200));
                throw new Error(TF('mRpcNoResult', { n: res.status, raw: String(res.raw || '(空)').slice(0, 120) }));
            }
            return d.result;
        },

        async copyAll() {
            const sel = UI.state.files.filter(f => UI.state.selected.has(f.id) && !f.isDir);
            if (!sel.length) return UI.toast(T('mNoSel'), 'err');
            UI.setMsg(T('mBatchGetting'));
            const urls = [];
            for (let i = 0; i < sel.length; i++) {
                const f = sel[i];
                UI.setMsg(TF('mGetLinkN', { i: i + 1, n: sel.length }));
                try {
                    urls.push(await this.ensureLink(f));
                    this.record('copy', f, urls[urls.length - 1]);
                    this.markLinked(f);
                } catch (err) {
                    urls.push('# ' + f.name + ' 获取失败: ' + err.message);
                }
            }
            GM_setClipboard(urls.join('\n'), 'text');
            UI.setMsg('');
            UI.toast(TF('mCopiedN', { n: urls.filter(u => u[0] !== '#').length }), 'ok');
        },

        async rpcAll() {
            const sel = UI.state.files.filter(f => UI.state.selected.has(f.id) && !f.isDir);
            if (!sel.length) return UI.toast(T('mNoSel'), 'err');
            /* aria2 + 多文件：批量 JSON-RPC（一次 50 个），失败项再逐个重试（含夸克 412 自愈） */
            if (Store.get('rpcType') !== 'gopeed' && Store.get('rpcType') !== 'idm' && Store.get('rpcType') !== 'abdm' && sel.length >= 2) {
                return this.rpcAllBatch(sel);
            }
            return this.rpcAllLoop(sel);
        },

        /* 逐个推送（保留单文件级夸克 412 自愈；Gopeed/IDM 与批量失败回退走此通道） */
        async rpcAllLoop(sel) {
            let ok = 0, fail = 0;
            const errors = [];
            for (let i = 0; i < sel.length; i++) {
                const f = sel[i];
                UI.setMsg(TF('mPushN', { i: i + 1, n: sel.length }));
                try {
                    await this.pushRpc(f);
                    ok++;
                    this.markLinked(f);
                } catch (err) {
                    fail++;
                    const msg = (err && err.message) || String(err) || '未知';
                    console.error('[CLM][RPC] 推送失败「' + f.name + '」：', err);
                    if (errors.length < 3) errors.push(f.name.slice(0, 16) + '：' + msg.slice(0, 60));
                }
            }
            UI.setMsg('');
            const extra = fail ? '\n' + errors.join('\n') : '';
            UI.toast(TF('mPushDone', { ok: ok, fail: fail ? TF('mFailPart', { n: fail }) : '' }), fail ? 'err' : 'ok');
        },

        /* aria2 批量推送编排：先批量拿直链 + 一次 RPC 批量提交，失败项逐个 pushRpc 重试 */
        async rpcAllBatch(sel) {
            UI.setMsg(T('mBatchGet'));
            const items = [];
            const byIdx = [];
            for (let i = 0; i < sel.length; i++) {
                const f = sel[i];
                UI.setMsg(TF('mGetLinkN', { i: i + 1, n: sel.length }));
                try {
                    const url = await this.ensureLink(f);
                    items.push({ url, name: f.name, sub: f.path || '' });
                    byIdx.push(f);
                    this.markLinked(f);
                } catch (err) {
                    console.warn('[CLM][RPC] 直链获取失败：', f.name, err);
                }
            }
            if (!items.length) {
                UI.setMsg('');
                return UI.toast(T('mAllLinksFail'), 'err');
            }
            UI.setMsg(TF('mBatchPush', { n: items.length }));
            let batch = { ok: 0, failed: [] };
            try {
                batch = await this.ariaBatch(items);
            } catch (err) {
                console.warn('[CLM][RPC] 批量推送异常，回退逐个推送：', err && err.message);
                return this.rpcAllLoop(sel); /* 整批失败 → 回退逐个（保留 412 自愈） */
            }
            let ok = batch.ok, fail = 0;
            const errors = [];
            if (batch.failed.length) {
                UI.setMsg(T('mRetrying'));
                for (const it of batch.failed) {
                    const idx = items.indexOf(it);
                    const f = byIdx[idx >= 0 ? idx : 0];
                    if (!f) { fail++; continue; }
                    try {
                        await this.pushRpc(f);
                        ok++;
                    } catch (err) {
                        fail++;
                        if (errors.length < 3) errors.push(f.name.slice(0, 16) + '：' + String((err && err.message) || '').slice(0, 60));
                    }
                }
            }
            UI.setMsg('');
            const extra = fail ? '\n' + errors.join('\n') : '';
            UI.toast(TF('mBatchDone', { ok: ok, fail: fail ? TF('mFailPart', { n: fail }) : '' }), fail ? 'err' : 'ok');
        },

        async exportTxt() {
            const sel = UI.state.files.filter(f => UI.state.selected.has(f.id) && !f.isDir);
            if (!sel.length) return UI.toast(T('mNoSel'), 'err');
            UI.setMsg(T('mGenFile'));
            const lines = [];
            for (let i = 0; i < sel.length; i++) {
                const f = sel[i];
                UI.setMsg(TF('mExportN', { i: i + 1, n: sel.length }));
                try {
                    lines.push(f.name + '\t' + U.size(f.size) + '\t' + await this.ensureLink(f));
                } catch (err) {
                    lines.push(f.name + '\t' + U.size(f.size) + '\t获取失败: ' + err.message);
                }
            }
            UI.setMsg('');
            const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
            this.saveBlob(blob, '直链_' + this.ctx.provider.key + '_' + Date.now() + '.txt');
            UI.toast(TF('mExported', { n: lines.length }), 'ok');
        },

        /* ============================================================
         *  下载历史（借鉴 LinkSwift增强）：搜索 / 筛选 / 复制 / 再下载 / 删除 / 清空
         * ============================================================ */
        histWayName(way) {
            return ({ copy: T('wayCopy'), browser: T('wayBrowser'), enhance: T('wayEnhance'), page: T('wayPage'),
                aria: 'aria2c', curl: T('wayCurl'), bc: T('wayBc'), aria2: T('wayAria'), gopeed: 'Gopeed',
                idm: 'IDM', abdm: 'ABDM' })[way] || way || '-';
        },

        historyView() {
            UI.mount();
            UI.refs.panel.classList.remove('small');
            UI.refs.mask.classList.add('show');
            const hist = this;
            const render = () => {
                const kw = (body.querySelector('#hist-kw') || {}).value || '';
                const key = kw.trim().toLowerCase();
                const all = History.all();
                const list = all.map((h, i) => ({ h, i })).filter(x => !key || String(x.h.name || '').toLowerCase().indexOf(key) >= 0);
                const rows = list.length ? list.map(x => {
                    const h = x.h, gi = x.i;
                    const live = h.url && /^https?:/i.test(h.url);
                    return `<tr>
  <td class="col-htime">${U.date(h.t)}</td>
  <td><div class="name"><span class="txt" title="${U.esc(h.name || '')}">${U.esc(h.name || T('histUnknownFile'))}</span></div></td>
  <td class="col-hmeta" title="${U.esc(h.pan || '')}">${U.esc(h.pan || '-')}</td>
  <td class="col-hmeta">${U.esc(this.histWayName(h.way))}</td>
  <td class="col-size">${U.size(h.size)}</td>
  <td class="col-hops"><div class="acts">
    ${live ? `<button class="btn" data-act="h-copy" data-hi="${gi}">${T('bCopyLink')}</button>
    <button class="btn" data-act="h-dl" data-hi="${gi}">${T('bRedl')}</button>` : ''}
    <button class="btn ghost" data-act="h-del" data-hi="${gi}">${T('bDel')}</button>
  </div></td>
</tr>`;
                }).join('') : `<tr><td colspan="6"><div class="empty"><div class="big">🕘</div>${key ? T('histEmptyMatch') : T('histEmpty')}</div></td></tr>`;

                body.innerHTML = `<div class="hist-bar">
  <input type="text" id="hist-kw" placeholder="${T('histSearchPh')}" value="${U.esc(kw)}">
  <span class="stat">${key ? T('histMatched') + ' ' + list.length + (T('histOf') ? ' ' + T('histOf') : '') : (T('histTotal') ? T('histTotal') + ' ' : '') + all.length + T('histMax') + History.MAX + T('histCap')}</span>
  <div class="grow" style="flex:1"></div>
  <button class="btn ghost" data-act="h-clear">${T('histClear')}</button>
  <button class="btn" data-act="back-list">${T('histBack')}</button>
</div>
<table>
  <thead><tr><th class="col-htime">${T('hTime')}</th><th>${T('hName')}</th><th class="col-hmeta">${T('hPan')}</th>
    <th class="col-hmeta">${T('hMethod')}</th><th class="col-size">${T('hSize')}</th><th class="col-hops" style="text-align:right">${T('hAct')}</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

                const kwInput = body.querySelector('#hist-kw');
                if (kwInput) {
                    kwInput.addEventListener('input', () => render());
                    if (kw) { kwInput.focus(); kwInput.setSelectionRange(kw.length, kw.length); }
                }
            };
            const body = UI.refs.body;
            render();
        },

        histCopy(i) {
            const h = History.all()[Number(i)];
            if (!h || !h.url) return UI.toast(T('mHistNoLink'), 'err');
            GM_setClipboard(h.url, 'text');
            UI.toast(TF('mHistCopied', { name: String(h.name || '').slice(0, 20) }), 'ok');
        },

        histDl(i) {
            const h = History.all()[Number(i)];
            if (!h || !h.url) return UI.toast(T('mHistNoLink'), 'err');
            const a = document.createElement('a');
            a.href = h.url;
            a.download = String(h.name || 'file');
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 3000);
            UI.toast(T('mHistDlHint'), 'ok');
        },

        histDel(i) {
            History.remove(Number(i));
            this.historyView();
        },

        histClear() {
            /* 两击确认，避免误清 */
            if (!this._histArm) {
                this._histArm = true;
                UI.toast(T('mHistClearArm'), 'err');
                setTimeout(() => { this._histArm = false; }, 4000);
                return;
            }
            this._histArm = false;
            History.clear();
            UI.toast(T('mHistCleared'), 'ok');
            this.historyView();
        },

        /* ============================================================
         *  网页下载：把直链生成为一个本地网页（blob 页面继承网盘域名
         *  来源，Cookie 自动随行），在新标签页打开后逐个触发浏览器
         *  原生下载 —— 即 d.youxiaohou.com 的机制，但全程本地、零依赖。
         * ============================================================ */
        async pageDownload() {
            const sel = UI.state.files.filter(f => UI.state.selected.has(f.id) && !f.isDir);
            const targets = sel.length ? sel : UI.state.files.filter(f => !f.isDir && f.link);
            if (!targets.length) {
                return UI.toast(sel.length ? T('mPageNoDl') : T('mPageNoSel'), 'err');
            }

            UI.setMsg(T('mPageGen'));
            const items = [];
            for (let i = 0; i < targets.length; i++) {
                const f = targets[i];
                UI.setMsg(TF('mGetLinkN', { i: i + 1, n: targets.length }));
                try {
                    items.push({ n: this.outName(f), s: Number(f.size) || 0, u: await this.ensureLink(f) });
                    this.record('page', f, items[items.length - 1].u);
                    this.markLinked(f);
                } catch (err) {
                    items.push({ n: f.name, s: Number(f.size) || 0, u: '', e: (err && err.message) || String(err) });
                }
            }
            UI.setMsg('');
            const okCount = items.filter(x => x.u).length;
            if (!okCount) return UI.toast(T('mPageNoLink'), 'err');

            const html = this.buildDownloadPage(items, this.ctx ? this.ctx.provider.key : '');
            const w = window.open('', '_blank');
            if (!w) {
                /* 弹窗被拦截：退化为把下载页存为本地 html 文件，双击打开 */
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                this.saveBlob(blob, '网盘直链下载页_' + Date.now() + '.html');
                return UI.toast(T('mPageBlocked'), 'err');
            }
            try {
                w.document.open(); w.document.write(html); w.document.close();
            } catch (e) {
                const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                w.location.href = URL.createObjectURL(blob);
            }
            UI.toast(TF('mPageOpened', { n: okCount }), 'ok');
        },

        buildDownloadPage(items, providerKey) {
            const data = JSON.stringify(items).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
            const title = '网盘直链下载页' + (providerKey ? '（' + providerKey.toUpperCase() + '）' : '');
            return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  :root { --bg:#f4f6fb; --card:#ffffff; --line:#e3e8f0; --tx:#1f2430; --sub:#7a8399; --pri:#4a7dff; --ok:#18a058; --err:#e5484d; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif; background:var(--bg); color:var(--tx); padding:28px 16px; }
  .card { max-width:860px; margin:0 auto; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:24px; box-shadow:0 6px 24px rgba(30,40,70,.08); }
  h1 { font-size:20px; margin-bottom:6px; }
  .sub { color:var(--sub); font-size:13px; line-height:1.7; margin-bottom:18px; }
  .bar { display:flex; gap:10px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
  button { border:none; border-radius:8px; padding:9px 16px; font-size:13px; cursor:pointer; font-weight:600; }
  .pri { background:var(--pri); color:#fff; }
  .pri:disabled { background:#b9c6e8; cursor:not-allowed; }
  .ghost { background:transparent; border:1px solid var(--line); color:var(--tx); }
  .mini { padding:5px 12px; font-size:12px; font-weight:500; }
  table { width:100%; border-collapse:collapse; }
  td { padding:10px 8px; border-bottom:1px solid var(--line); font-size:13px; vertical-align:middle; }
  .nm { max-width:360px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .sz { color:var(--sub); white-space:nowrap; }
  .st { color:var(--sub); white-space:nowrap; min-width:76px; }
  .st.ok { color:var(--ok); font-weight:600; }
  .st.err { color:var(--err); font-weight:600; }
  .st.run { color:var(--pri); font-weight:600; }
  .note { margin-top:16px; color:var(--sub); font-size:12px; line-height:1.8; }
</style>
</head>
<body>
<div class="card">
  <h1>☁️ ${title}</h1>
  <div class="sub">由「CloudLink Master Pro」本地生成 · 浏览器直接保存文件，无需安装 Aria2 / Gopeed 等任何下载软件。<br>
  下载走网盘 CDN 直链（浏览器会自动带上你的登录 Cookie），文件较大时请留意浏览器下载栏进度。</div>
  <div class="bar">
    <button class="pri" id="all">⬇ 全部下载</button>
    <button class="ghost" id="retry">↻ 重试失败项</button>
    <button class="ghost" id="copy">复制全部直链</button>
    <span id="stat" class="sz"></span>
  </div>
  <table><tbody id="list"></tbody></table>
  <div class="note">
    · 点击「全部下载」后浏览器会逐个触发保存（间隔约 1.5 秒）；如浏览器弹出"是否允许下载多个文件"，请选择<b>允许</b>。<br>
    · 直链有有效期（约 8 小时），过期后回到网盘页面重新生成即可。<br>
    · 本页面完全在本地运行，不经过任何第三方服务器。
  </div>
</div>
<script>
var ITEMS = ${data};
var listEl = document.getElementById('list');
var statEl = document.getElementById('stat');
var allBtn = document.getElementById('all');
var idx = [], done = 0, fail = 0;

function fmt(n){ if(!n) return '-'; var u=['B','KB','MB','GB','TB'],i=0; while(n>=1024&&i<u.length-1){n/=1024;i++;} return n.toFixed(n>=100||i===0?0:1)+' '+u[i]; }
function row(it, i){
  var tr = document.createElement('tr');
  tr.innerHTML = '<td class="sz">'+(i+1)+'</td>'+
    '<td class="nm" title="'+it.n.replace(/"/g,'&quot;')+'">'+it.n+'</td>'+
    '<td class="sz">'+fmt(it.s)+'</td>'+
    '<td class="st" id="st'+i+'">待下载</td>'+
    '<td>'+(it.u ? '<button class="ghost mini" data-go="'+i+'">下载</button>' : '')+
    (it.u ? ' <button class="ghost mini" data-cp="'+i+'">复制直链</button>' : '')+'</td>';
  listEl.appendChild(tr);
}
ITEMS.forEach(row);
function refreshStat(){ statEl.textContent = '完成 '+done+' / 失败 '+fail+' / 共 '+ITEMS.filter(function(x){return x.u;}).length; }
refreshStat();

function go(i){
  var st = document.getElementById('st'+i);
  st.textContent = '下载中…'; st.className = 'st run';
  var a = document.createElement('a');
  a.href = ITEMS[i].u;
  a.download = ITEMS[i].n;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ a.remove(); }, 3000);
  /* 无法探测浏览器原生下载结果，2 秒后按"已触发"显示 */
  setTimeout(function(){
    if (st.textContent === '下载中…') { st.textContent = '已触发 ✓'; st.className = 'st ok'; done++; refreshStat(); }
  }, 2000);
}
function runAll(onlyRetry){
  var queue = [];
  ITEMS.forEach(function(it, i){
    if (!it.u) return;
    var st = document.getElementById('st'+i);
    if (onlyRetry && st.className.indexOf('err') < 0) return;
    if (!onlyRetry) { st.textContent = '待下载'; st.className = 'st'; }
    queue.push(i);
  });
  if (!queue.length) { statEl.textContent = onlyRetry ? '没有失败项' : statEl.textContent; return; }
  allBtn.disabled = true;
  done = 0; fail = 0;
  (function next(){
    if (!queue.length) { allBtn.disabled = false; refreshStat(); return; }
    var i = queue.shift();
    try { go(i); } catch (e) {
      var st = document.getElementById('st'+i);
      st.textContent = '失败'; st.className = 'st err'; fail++; refreshStat();
    }
    setTimeout(next, 1500);
  })();
}
allBtn.addEventListener('click', function(){ runAll(false); });
document.getElementById('retry').addEventListener('click', function(){ runAll(true); });
document.getElementById('copy').addEventListener('click', function(){
  var txt = ITEMS.filter(function(x){return x.u;}).map(function(x){ return x.n + '\\t' + x.u; }).join('\\n');
  navigator.clipboard.writeText(txt).then(function(){
    statEl.textContent = '已复制 '+ITEMS.filter(function(x){return x.u;}).length+' 条直链';
  }, function(){ alert('复制失败，请手动复制'); });
});
listEl.addEventListener('click', function(e){
  var t = e.target;
  if (t.getAttribute('data-go') !== null) go(+t.getAttribute('data-go'));
  if (t.getAttribute('data-cp') !== null) navigator.clipboard.writeText(ITEMS[+t.getAttribute('data-cp')].u);
});
/* 预解析失败项提示 */
ITEMS.forEach(function(it, i){
  if (!it.u) { var st = document.getElementById('st'+i); st.textContent = '解析失败'; st.title = it.e || ''; st.className = 'st err'; fail++; refreshStat(); }
});
</script>
</body>
</html>`;
        }
    };

    /* ============================================================
     *  8. 启动
     * ============================================================ */
    function boot() {
        if (!document.body) {
            setTimeout(boot, 300);
            return;
        }
        try {
            App.init();
        } catch (e) {
            console.error('[CLM] 初始化失败', e);
            showFatal('初始化失败：' + ((e && e.message) || e) + (e && e.stack ? '\n' + String(e.stack).split('\n').slice(0, 3).join('\n') : ''));
            try {
                UI.mount();
                UI.toast(TF('mInitFail', { msg: (e && e.message) || e }), 'err');
            } catch (e2) { /* 连 UI 都挂不上时只能看控制台 */ }
        }
    }

    /* 调试导出：控制台输入 __DLM 可访问内部对象（仅诊断/测试用途，无功能影响） */
    try { window.__DLM = { App: App, UI: UI, Settings: Settings, Store: Store, History: History, U: U, Net: Net, Captured: Captured,
        Baidu: Baidu, Ali: Ali, Quark: Quark, Uc: Uc, Cloud189: Cloud189, Xunlei: Xunlei, Mcloud: Mcloud, Pan123: Pan123 }; } catch (e) { /* 环境无 window 时忽略 */ }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
