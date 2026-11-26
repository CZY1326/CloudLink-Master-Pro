'use strict';
/* 真实网络联调：用 gopeed-extension/index.js 的原代码解析真实分享链接。
 * 用法：node gopeed-extension/test.live.js <链接> [提取码]
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const url = process.argv[2];
if (!url) {
  console.error('用法：node test.live.js <分享链接> [提取码]');
  process.exit(1);
}

const sandbox = {
  gopeed: {
    settings: { quarkCookie: '', ucCookie: '', maxFiles: 50 },
    events: { _handler: null, onResolve(fn) { this._handler = fn; } },
    logger: {
      debug: (...a) => console.log('[debug]', ...a),
      info: (...a) => console.log('[info]', ...a),
      warn: (...a) => console.log('[warn]', ...a),
      error: (...a) => console.log('[error]', ...a)
    }
  },
  fetch: (u, o) => fetch(u, o),
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

(async () => {
  try {
    const r = await onResolve({ req: { url } });
    console.log('\n=== 解析成功 ===');
    console.log('资源名：', r.name);
    console.log('总大小：', r.size, 'bytes');
    console.log('文件数：', r.files.length);
    r.files.slice(0, 10).forEach((f, i) => {
      console.log(`  [${i + 1}] ${f.path ? f.path + '/' : ''}${f.name}  (${f.size} B)`);
      console.log('      url:', String(f.req.url).slice(0, 100) + '...');
      console.log('      UA :', (f.req.extra.header['User-Agent'] || '').slice(0, 50) + '...');
    });
    if (r.files.length > 10) console.log(`  ...共 ${r.files.length} 个文件`);
  } catch (e) {
    console.error('\n=== 解析失败 ===');
    console.error(e && e.message ? e.message : e);
    process.exit(1);
  }
})();
