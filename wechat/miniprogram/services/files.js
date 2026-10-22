'use strict';
const { call } = require('./wechat');
const { uid } = require('../core/model');
const MAX_TOTAL = 150 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;
const MAX_IMAGE = 20 * 1024 * 1024;

function createFiles(fs, userPath, options = {}) {
  const base = userPath + '/godog-media';
  const nextId = options.id || uid;
  let tail = Promise.resolve();
  // Serialize file copies so concurrent selections cannot exceed the local budget.
  function exclusive(fn) { const job = tail.then(fn); tail = job.catch(() => {}); return job; }
  function owned(path) {
    return typeof path === 'string' && path.startsWith(base + '/') && /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(path.slice(base.length + 1));
  }
  function init() {
    try { fs.accessSync(base); } catch (_) { fs.mkdirSync(base, true); }
  }
  async function list() { init(); return (await call(fs, 'readdir', { dirPath: base })).files.map(name => base + '/' + name).filter(owned); }
  async function bytes() {
    let total = 0;
    for (const path of await list()) total += (await call(fs, 'stat', { path })).stats.size;
    return total;
  }
  async function remove(paths) {
    const failed = [];
    for (const path of new Set(paths)) {
      if (!owned(path)) continue;
      try { await call(fs, 'unlink', { filePath: path }); } catch (_) { failed.push(path); }
    }
    return failed;
  }
  async function copy(source, type) {
    init();
    const size = (await call(fs, 'stat', { path: source })).stats.size;
    if (!size || size > (type === 'video' ? MAX_VIDEO : MAX_IMAGE)) throw new Error(type === 'video' ? '本地版每段视频最多 60 MB，请选择短一些的视频' : '每张照片最多 20 MB');
    if ((await bytes()) + size > MAX_TOTAL) throw new Error('本地媒体已接近 150 MB，请先移除不需要的内容');
    const match = source.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    const allowed = type === 'video' ? ['mp4', 'mov', 'm4v', 'webm'] : ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'];
    const ext = match && allowed.includes(match[1].toLowerCase()) ? match[1].toLowerCase() : type === 'video' ? 'mp4' : 'jpg';
    const path = base + '/' + nextId() + '.' + ext;
    try { await call(fs, 'copyFile', { srcPath: source, destPath: path }); }
    catch (error) { await remove([path]); throw error; }
    return { path, size };
  }
  return {
    owned, base, bytes,
    persist(item) {
      return exclusive(async () => {
        if (!['image', 'video'].includes(item.fileType) || !item.tempFilePath) throw new Error('无法识别所选文件，请重新选择');
        const staged = [];
        try {
          const original = await copy(item.tempFilePath, item.fileType); staged.push(original.path);
          let poster = '';
          if (item.fileType === 'video' && item.thumbTempFilePath) {
            const thumbnail = await copy(item.thumbTempFilePath, 'image'); poster = thumbnail.path; staged.push(poster);
          }
          return { id: nextId(), type: item.fileType, path: original.path, poster, size: original.size,
            duration: Number(item.duration) || 0, width: Number(item.width) || 0, height: Number(item.height) || 0 };
        } catch (error) { await remove(staged); throw error; }
      });
    },
    remove,
    async sweep(references) {
      const keep = new Set(references);
      return exclusive(async () => remove((await list()).filter(path => !keep.has(path))));
    },
    async exists(path) { try { await call(fs, 'access', { path }); return true; } catch (_) { return false; } }
  };
}
module.exports = { createFiles, MAX_TOTAL, MAX_VIDEO, MAX_IMAGE };
