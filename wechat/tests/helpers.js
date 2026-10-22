'use strict';
const M = require('../miniprogram/core/model');
const { createRepository } = require('../miniprogram/core/repository');
const { createFiles } = require('../miniprogram/services/files');
function storage() {
  const data = new Map();
  return { data, fail: false, get(key) { return data.has(key) ? M.clone(data.get(key)) : undefined; }, set(key, value) { if (this.fail) throw new Error('quota'); data.set(key, M.clone(value)); } };
}
function memoryFS() {
  const entries = new Map(); const directories = new Set(); let copies = 0;
  const fs = {
    entries, directories, failCopyAt: 0, failUnlink: false, beforeCopy: null,
    accessSync(path) { if (!directories.has(path) && !entries.has(path)) throw new Error('ENOENT'); },
    mkdirSync(path) { directories.add(path); },
    readdir({ dirPath, success }) { success({ files: Array.from(entries.keys()).filter(p => p.startsWith(dirPath + '/')).map(p => p.slice(dirPath.length + 1)) }); },
    stat({ path, success, fail }) { entries.has(path) ? success({ stats: { size: entries.get(path) } }) : fail({ errMsg: 'ENOENT' }); },
    access({ path, success, fail }) { entries.has(path) ? success({}) : fail({ errMsg: 'ENOENT' }); },
    async copyFile({ srcPath, destPath, success, fail }) {
      copies++;
      if (fs.beforeCopy) await fs.beforeCopy();
      if (copies === fs.failCopyAt || !entries.has(srcPath)) { entries.set(destPath, 1); fail({ errMsg: 'copyFile:fail' }); }
      else { entries.set(destPath, entries.get(srcPath)); success({}); }
    },
    unlink({ filePath, success, fail }) { if (fs.failUnlink) fail({ errMsg: 'unlink:fail' }); else { entries.delete(filePath); success({}); } }
  };
  return fs;
}
function setup() {
  let i = 0; const next = () => 'test-' + (++i);
  const disk = storage(); const fs = memoryFS();
  const options = { id: next, now: () => new Date(2026, 9, 13, 15, 30) };
  const repo = createRepository(disk, options);
  const files = createFiles(fs, '/user', { id: next });
  const image = { tempFilePath: '/tmp/image.jpg', fileType: 'image', size: 1024 };
  const video = { tempFilePath: '/tmp/video.mov', fileType: 'video', thumbTempFilePath: '/tmp/poster.jpg', duration: 12, size: 4096 };
  fs.entries.set(image.tempFilePath, image.size); fs.entries.set(video.tempFilePath, video.size); fs.entries.set(video.thumbTempFilePath, 128);
  return { disk, fs, options, repo, files, image, video, reopen: () => createRepository(disk, options) };
}
const record = (petId, patch = {}) => Object.assign({ petId, kind: 'food', date: '2026-10-13', time: '10:00', text: '', media: [] }, patch);
module.exports = { storage, memoryFS, setup, record };
