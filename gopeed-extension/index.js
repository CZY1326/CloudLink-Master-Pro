'use strict';

/* ============================================================
 * CloudLink Master · Gopeed 扩展
 * 把网盘分享链接解析为 Gopeed 下载任务。
 * 支持：夸克网盘 / UC 网盘 / 阿里云盘(Alipan) 分享链接，
 * 含提取码与子目录递归。逻辑移植自 CloudLink Master Pro 用户脚本。
 * ============================================================ */

var QUARK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch';
var PC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

var QUARK_BASE = 'https://drive-pc.quark.cn/1/clouddrive';
var UC_BASE = 'https://pc-api.uc.cn/1/clouddrive';
var ALI_API = 'https://api.alipan.com';

/* ---------------- 基础工具 ---------------- */

function cfg(name, dflt) {
  var v = gopeed.settings ? gopeed.settings[name] : undefined;
  if (v === undefined || v === null || v === '') return dflt;
  return v;
}

function maxFiles() {
  var n = Number(cfg('maxFiles', 500));
  return isFinite(n) && n > 0 ? n : 500;
}

async function httpJSON(method, url, body, headers) {
  var opt = { method: method, headers: headers || {} };
  if (body !== undefined) opt.body = JSON.stringify(body);
  var resp;
  try {
    resp = await fetch(url, opt);
  } catch (e) {
    throw new Error('网络请求失败：' + url + '（' + (e && e.message ? e.message : e) + '）');
  }
  var text = await resp.text();
  var data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    /* 非 JSON 响应，data 保持 null，用 text 报错 */
  }
  return { status: resp.status, data: data, text: text };
}

/* 从 URL 提取提取码：query 的 pwd/passcode/code，以及 hash（夸克链接常为 #/xxx?pwd=yyy） */
function pickPasscode(u) {
  var codes = [];
  try {
    var q = u.searchParams;
    if (q.get('pwd')) codes.push(q.get('pwd'));
    if (q.get('passcode')) codes.push(q.get('passcode'));
    if (q.get('code')) codes.push(q.get('code'));
    var h = u.hash || '';
    var m = h.match(/(?:^|[?&#])(?:pwd|passcode|code)=([^&]+)/i);
    if (m) codes.push(m[1]);
    /* 夸克样式：#/提取码（hash 是纯码或括号包裹） */
    var m2 = h.replace(/^#\/?/, '').match(/^\(?([^/?&()]+)\)?$/);
    if (m2 && /^[a-zA-Z0-9]{1,12}$/.test(m2[1])) codes.push(m2[1]);
  } catch (e) {
    /* 忽略解析失败 */
  }
  for (var i = 0; i < codes.length; i++) {
    var c = String(codes[i]).trim();
    if (c && c.toLowerCase() !== 'null' && c.toLowerCase() !== 'undefined') return c;
  }
  return '';
}

function limitError(panName) {
  return new Error(panName + '：文件数超过上限 ' + maxFiles() + '（可在扩展设置里调大），已停止解析');
}

/* ---------------- 夸克 / UC（同源 API，仅 pr 与域名不同） ---------------- */

function quarkUcResolve(ctx, kind) {
  var isQuark = kind === 'quark';
  var base = isQuark ? QUARK_BASE : UC_BASE;
  var pr = isQuark ? 'ucpro' : 'UCBrowser';
  var referer = isQuark ? 'https://pan.quark.cn/' : 'https://drive.uc.cn/';
  var ua = isQuark ? QUARK_UA : PC_UA;
  var panName = isQuark ? '夸克网盘' : 'UC网盘';
  var cookie = String(cfg(isQuark ? 'quarkCookie' : 'ucCookie', '')).trim();

  var u = new URL(ctx.req.url);
  var m = u.pathname.match(/\/s\/([a-zA-Z0-9]+)/);
  if (!m) throw new Error(panName + '：未识别到分享 ID，请确认是分享链接（…/s/xxxx）');
  var pwdId = m[1];
  var passcode = pickPasscode(u);

  var apiHeaders = {
    'Content-Type': 'application/json;charset=UTF-8',
    'User-Agent': ua,
    Referer: referer
  };
  if (cookie) apiHeaders.Cookie = cookie;
  var dlHeaders = { 'User-Agent': ua, Referer: referer };
  if (cookie) dlHeaders.Cookie = cookie;

  var stoken = null;
  var shareTitle = '';
  var out = []; /* { name, path, size, fid } */

  return httpJSON('POST', base + '/share/sharepage/token?pr=' + pr + '&fr=pc',
    { pwd_id: pwdId, passcode: passcode }, apiHeaders
  ).then(function (r) {
    var d = r.data || {};
    if (d.code === 41004) throw new Error(panName + '：提取码错误或缺少提取码（可在链接后加 ?pwd=xxx）');
    if (d.code !== 0 || !d.data || !d.data.stoken) {
      throw new Error(panName + '：获取分享令牌失败（code=' + (d.code || r.status) + '）' + (d.message ? '：' + d.message : ''));
    }
    stoken = d.data.stoken;
    return walkDir({ fid: '0', path: '' });
  }).then(function () {
    if (!out.length) throw new Error(panName + '：分享里没有可下载的文件（可能只有文件夹或文件已被和谐）');
    /* 逐个换取下载直链（串行，避免限流） */
    var chain = Promise.resolve();
    out.forEach(function (f) {
      chain = chain.then(function () {
        return httpJSON('POST', base + '/file/share/download?pr=' + pr + '&fr=pc',
          { fids: [f.fid], pwd_id: pwdId, stoken: stoken }, apiHeaders
        ).then(function (r) {
          var d = r.data || {};
          if (d.code !== 0) {
            var msg = panName + '：获取「' + f.name + '」直链失败（code=' + (d.code || r.status) + '）' +
              (d.message ? '：' + d.message : '');
            if (d.code === 31001 || /require login/i.test(d.message || '')) {
              msg = panName + '：该分享需要登录后才能下载（未登录访客仅放行单张图片预览）。' +
                '请在扩展设置里填写已登录 ' + panName + ' 网页版的 Cookie，然后重新解析';
            } else if (d.code === 429 || /频繁/.test(d.message || '')) {
              msg += '，接口限流，请稍后重试或减少单次解析数量';
            }
            throw new Error(msg);
          }
          var item = (d.data || [])[0];
          if (!item || !item.download_url) {
            throw new Error(panName + '：接口未返回「' + f.name + '」的直链');
          }
          f.url = item.download_url;
        });
      });
    });
    return chain;
  }).then(function () {
    return buildRes(out, shareTitle || panName + ' 分享 ' + pwdId, dlHeaders);
  });

  function listOnce(node, page) {
    var url =
      base +
      '/share/sharepage/detail?pr=' + pr + '&fr=pc' +
      '&pwd_id=' + encodeURIComponent(pwdId) +
      '&stoken=' + encodeURIComponent(stoken) +
      '&pdir_fid=' + encodeURIComponent(node.fid) +
      '&force=0&_page=' + page + '&_size=200' +
      '&_fetch_banner=0&_fetch_share=1&_fetch_total=1' +
      '&_sort=file_type:asc,file_name:asc';
    return httpJSON('GET', url, undefined, apiHeaders).then(function (r) {
      var d = r.data || {};
      if (d.code !== 0) {
        throw new Error(panName + '：获取文件列表失败（code=' + (d.code || r.status) + '）' + (d.message ? '：' + d.message : ''));
      }
      var dd = d.data || {};
      if (!shareTitle && dd.share && dd.share.title) shareTitle = dd.share.title;
      return dd.list || [];
    });
  }

  /* 递归遍历目录：本层全部分页取完后，依次深入子目录 */
  function walkDir(node) {
    var subDirs = [];
    var page = 1;

    function nextPage() {
      if (out.length >= maxFiles()) return Promise.reject(limitError(panName));
      return listOnce(node, page).then(function (list) {
        for (var i = 0; i < list.length; i++) {
          var it = list[i];
          if (it.dir === true || it.file_type === 0) {
            subDirs.push({ fid: it.fid, path: node.path ? node.path + '/' + it.file_name : it.file_name });
          } else {
            out.push({ name: it.file_name, path: node.path, size: Number(it.size) || 0, fid: it.fid });
          }
        }
        if (list.length >= 200 && page < 20) {
          page++;
          return nextPage();
        }
      });
    }

    return nextPage().then(function () {
      var chain = Promise.resolve();
      subDirs.forEach(function (sd) {
        chain = chain.then(function () {
          return walkDir(sd);
        });
      });
      return chain;
    });
  }
}

/* ---------------- 阿里云盘 / Alipan ---------------- */

function aliResolve(ctx) {
  var referer = 'https://www.alipan.com/';
  var u = new URL(ctx.req.url);
  var m = u.pathname.match(/\/s\/([a-zA-Z0-9]+)/);
  if (!m) throw new Error('阿里云盘：未识别到分享 ID，请确认是分享链接（…/s/xxxx）');
  var shareId = m[1];
  var pwd = pickPasscode(u);

  var listHeaders = {
    'Content-Type': 'application/json;charset=UTF-8',
    'x-canary': 'client=windows,app=adrive,version=v6.0.0',
    Referer: referer
  };
  var dlHeaders = { 'User-Agent': PC_UA, Referer: referer };
  var shareToken = null;
  var out = []; /* { name, path, size, url } */

  return httpJSON('POST', ALI_API + '/adrive/v2/share_link/get_share_token',
    { share_id: shareId, share_pwd: pwd }, listHeaders
  ).then(function (r) {
    var d = r.data || {};
    if (!d.share_token) {
      throw new Error(
        '阿里云盘：获取分享令牌失败' +
        (d.code ? '（' + d.code + '）' : '') + (d.message ? '：' + d.message : '') +
        '。若分享带提取码，请把链接写成 https://www.alipan.com/s/xxxx?pwd=提取码'
      );
    }
    shareToken = d.share_token;
    listHeaders['x-share-token'] = shareToken;
    return walkDir({ fid: 'root', path: '' });
  }).then(function () {
    if (!out.length) throw new Error('阿里云盘：分享里没有可下载的文件');
    return buildRes(out, '阿里云盘 分享 ' + shareId, dlHeaders);
  });

  function listOnce(fid) {
    return httpJSON('POST', ALI_API + '/adrive/v2/file/list',
      { limit: 200, order_by: 'name', order_direction: 'ASC', parent_file_id: fid, share_id: shareId, share_token: shareToken, fields: '*' },
      listHeaders
    ).then(function (r) {
      var d = r.data || {};
      if (d.code) {
        throw new Error('阿里云盘：获取文件列表失败（' + (d.code || r.status) + '）' + (d.message ? '：' + d.message : ''));
      }
      return d.items || [];
    });
  }

  function fetchLink(f) {
    if (out.length >= maxFiles()) return Promise.reject(limitError('阿里云盘'));
    return httpJSON('POST', ALI_API + '/adrive/v2/file/get_download_url',
      { file_id: f.fileId, share_id: shareId, expire_sec: 900 }, listHeaders
    ).then(function (r) {
      var d = r.data || {};
      if (d.code === 'AccessTokenInvalid') {
        throw new Error('阿里云盘：分享令牌已过期，请重新创建任务');
      }
      if (!d.url) {
        throw new Error('阿里云盘：接口未返回「' + f.name + '」的直链' + (d.message ? '：' + d.message : ''));
      }
      out.push({ name: f.name, path: f.path, size: f.size, url: d.url });
    });
  }

  function walkDir(node) {
    return listOnce(node.fid).then(function (items) {
      var subDirs = [];
      var pending = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.type === 'folder') {
          subDirs.push({ fid: it.file_id, path: node.path ? node.path + '/' + it.name : it.name });
        } else {
          pending.push({ name: it.name, path: node.path, size: Number(it.size) || 0, fileId: it.file_id });
        }
      }

      var chain = Promise.resolve();
      pending.forEach(function (f) {
        chain = chain.then(function () {
          return fetchLink(f);
        });
      });
      subDirs.forEach(function (sd) {
        chain = chain.then(function () {
          return walkDir(sd);
        });
      });
      return chain;
    });
  }
}

/* ---------------- 组装 Gopeed 资源 ---------------- */

function buildRes(files, resName, dlHeaders) {
  var total = 0;
  var list = [];
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!f || !f.url) continue;
    total += Number(f.size) || 0;
    list.push({
      name: f.name,
      path: f.path || '',
      size: Number(f.size) || 0,
      req: {
        url: f.url,
        extra: { header: dlHeaders }
      }
    });
  }
  /* 单文件：按 Gopeed 约定 name 留空表示非文件夹资源 */
  return {
    name: list.length === 1 ? '' : resName,
    size: total,
    range: true,
    files: list
  };
}

/* ---------------- 事件入口 ---------------- */

gopeed.events.onResolve(async function (ctx) {
  var url = ctx.req.url || '';
  if (/pan\.quark\.cn/i.test(url)) return quarkUcResolve(ctx, 'quark');
  if (/drive\.uc\.cn/i.test(url)) return quarkUcResolve(ctx, 'uc');
  if (/(alipan|aliyundrive)\.com/i.test(url)) return aliResolve(ctx);
  throw new Error('CloudLink Master：不支持的链接。目前支持夸克 / UC / 阿里云盘(alipan) 的分享链接');
});
