'use strict';
function call(api, name, params = {}) {
  return new Promise((resolve, reject) => {
    if (!api || typeof api[name] !== 'function') return reject(new Error('当前微信版本暂不支持，请更新微信后重试'));
    api[name](Object.assign({}, params, { success: resolve, fail: reject }));
  });
}
function cancelled(error) { return /cancel|取消/.test(error && (error.errMsg || error.message) || ''); }
function message(error) {
  const text = error && (error.errMsg || error.message) || '';
  if (error instanceof Error && /[\u4e00-\u9fff]/.test(text)) return text;
  if (/privacy|authorize|auth deny|permission|隐私|权限/i.test(text)) return '需要允许相机或照片访问，才能留下这个瞬间';
  if (/quota|space|limit|maximum|空间/i.test(text)) return '本地空间不足，请清理空间后重试';
  return '这次没能完成，请重试';
}
module.exports = { call, cancelled, message };
