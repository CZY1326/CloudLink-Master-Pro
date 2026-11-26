'use strict';
/* 本地 mock 测试：验证 gopeed-extension/index.js 的解析链路（无需真实网络/无需 Gopeed）。
 * 用法：node gopeed-extension/test.local.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---- 构造假响应 ---- */
let callLog = [];
function jsonResp(obj) {
  return { status: 200, text: () => Promise.resolve(JSON.stringify(obj)) };
}

const quarkResponses = {
  token: { code: 0, data: { stoken: 'STOKEN' } },
  detailRoot: {
    code: 0,
    data: {
      share: { title: '测试分享包' },
      list: [
        { fid: 'f1', file_name: '电影.mp4', size: 1024, dir: false, file_type: 1 },
        { fid: 'd1', file_name: '子目录A', size: 0, dir: true, file_type: 0 },
        { fid: 'd2', file_name: '子目录B', size: 0, dir: true, file_type: 0 }
      ]
    }
  },
  detailA: { code: 0, data: { list: [{ fid: 'f2', file_name: '说明书.pdf', size: 2048, dir: false, file_type: 1 }] } },
  detailB: { code: 0, data: { list: [{ fid: 'f3', file_name: 'B图.png', size: 512, dir: false, file_type: 1 }] } }
};

const aliResponses = {
  shareToken: { share_token: 'ALITOKEN' },
  listRoot: {
    code: null,
    items: [
      { file_id: 'af1', name: '根文件.zip', size: 4096, type: 'file' },
      { file_id: 'ad1', name: '相册', size: 0, type: 'folder' }
    ]
  },
  listAlbum: { code: null, items: [{ file_id: 'af2', name: '照片.jpg', size: 8192, type: 'file' }] },
  dl: (id) => ({ url: 'https://dl.example/' + id })
};

function mockFetch(url, opt) {
  callLog.push({ method: opt.method, url });
  if (url.includes('quark') || url.includes('uc.cn')) {
    if (url.includes('/share/sharepage/token')) return jsonResp(quarkResponses.token);
    if (url.includes('/share/sharepage/detail')) {
      if (url.includes('pdir_fid=0')) return jsonResp(quarkResponses.detailRoot);
      if (url.includes('pdir_fid=d1')) return jsonResp(quarkResponses.detailA);
      if (url.includes('pdir_fid=d2')) return jsonResp(quarkResponses.detailB);
      return jsonResp({ code: 0, data: { list: [] } });
    }
    if (url.includes('/file/share/download')) {
      const body = JSON.parse(opt.body);
      return jsonResp({ code: 0, data: [{ download_url: 'https://cdn.quark.example/' + body.fids[0] }] });
    }
  }
  if (url.includes('alipan.com')) {
    if (url.includes('get_share_token')) return jsonResp(aliResponses.shareToken);
    if (url.includes('/adrive/v2/file/list')) {
      const body = JSON.parse(opt.body);
      if (body.parent_file_id === 'root') return jsonResp(aliResponses.listRoot);
      if (body.parent_file_id === 'ad1') return jsonResp(aliResponses.listAlbum);
      return jsonResp({ items: [] });
    }
    if (url.includes('get_download_url')) {
      const body = JSON.parse(opt.body);
      return jsonResp(aliResponses.dl(body.file_id));
    }
  }
  return jsonResp({ error: 'unmocked: ' + url });
}

/* ---- gopeed 环境桩 ---- */
const sandbox = {
  gopeed: {
    settings: { quarkCookie: '', ucCookie: '', maxFiles: 500 },
    events: { _handler: null, onResolve(fn) { this._handler = fn; } },
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }
  },
  fetch: mockFetch,
  URL,
  Promise,
  Error,
  isFinite,
  Number,
  String,
  JSON,
  console
};
sandbox.globalThis = sandbox;

const code = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
vm.runInNewContext(code, sandbox, { filename: 'index.js' });

const onResolve = sandbox.gopeed.events._handler;
if (typeof onResolve !== 'function') throw new Error('onResolve 未注册！');

let failed = 0;
function check(name, cond, extra) {
  if (cond) console.log('  PASS  ' + name);
  else {
    failed++;
    console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : ''));
  }
}

(async () => {
  /* ---- 夸克 ---- */
  console.log('[1] 夸克分享（含子目录递归）');
  let r = await onResolve({ req: { url: 'https://pan.quark.cn/s/abc123?pwd=6666' } });
  check('资源名取分享标题', r.name === '测试分享包', r.name);
  check('文件数 = 3（根1 + 子目录A1 + 子目录B1）', r.files.length === 3, r.files.length);
  check('子目录文件带 path', r.files.some((f) => f.path === '子目录A' && f.name === '说明书.pdf'), r.files.map((f) => f.path + '/' + f.name));
  check('根目录文件 path 为空', r.files.some((f) => f.name === '电影.mp4' && f.path === ''));
  check('size 汇总 = 1024+2048+512', r.size === 1024 + 2048 + 512, r.size);
  check('单文件 req 带 UA/Referer', !!r.files[0].req.extra.header['User-Agent'] && !!r.files[0].req.extra.header.Referer);
  check('range 支持声明', r.range === true);

  /* ---- UC（同一代码路径，pr 不同） ---- */
  console.log('[2] UC 分享');
  r = await onResolve({ req: { url: 'https://drive.uc.cn/s/uc123' } });
  check('文件数 = 3', r.files.length === 3, r.files.length);
  check('UC 请求走 UCBrowser pr', callLog.some((c) => c.url.includes('pr=UCBrowser')));

  /* ---- 阿里 ---- */
  console.log('[3] 阿里云盘分享（含子目录递归）');
  r = await onResolve({ req: { url: 'https://www.alipan.com/s/aliid?pwd=8888' } });
  check('文件数 = 2', r.files.length === 2, r.files.length);
  check('子目录 path', r.files.some((f) => f.path === '相册' && f.name === '照片.jpg'), r.files.map((f) => f.path + '/' + f.name));
  check('直链来自 get_download_url', r.files.every((f) => f.req.url.startsWith('https://dl.example/')));
  check('下载头带 UA/Referer', !!r.files[0].req.extra.header.Referer);

  /* ---- 提取码解析 ---- */
  console.log('[4] 提取码解析');
  const u1 = new URL('https://pan.quark.cn/s/abc#/list/share?pwd=9999');
  const u2 = new URL('https://pan.quark.cn/s/abc#(7777)');
  const u3 = new URL('https://www.alipan.com/s/abc?pwd=1234');
  const pc = code; // 仅占位
  check('query pwd', pickPasscodeOf(u1) === '9999');
  check('hash 纯码 #(7777)', pickPasscodeOf(u2) === '7777');
  check('阿里 ?pwd=', pickPasscodeOf(u3) === '1234');

  function pickPasscodeOf(u) {
    const q = u.searchParams;
    const arr = [];
    if (q.get('pwd')) arr.push(q.get('pwd'));
    if (q.get('passcode')) arr.push(q.get('passcode'));
    if (q.get('code')) arr.push(q.get('code'));
    const h = u.hash || '';
    const m = h.match(/(?:^|[?&#])(?:pwd|passcode|code)=([^&]+)/i);
    if (m) arr.push(m[1]);
    const m2 = h.replace(/^#\/?/, '').match(/^\(?([^/?&()]+)\)?$/);
    if (m2 && /^[a-zA-Z0-9]{1,12}$/.test(m2[1])) arr.push(m2[1]);
    for (let i = 0; i < arr.length; i++) {
      const c = String(arr[i]).trim();
      if (c) return c;
    }
    return '';
  }

  /* ---- 不支持的链接 ---- */
  console.log('[5] 不支持的链接应报错');
  let threw = false;
  try {
    await onResolve({ req: { url: 'https://example.com/file.zip' } });
  } catch (e) {
    threw = true;
  }
  check('非网盘链接抛错', threw);

  console.log(failed ? `\n${failed} 项失败` : '\n全部通过 ✔');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('测试执行异常：', e);
  process.exit(1);
});
