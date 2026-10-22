'use strict';
const { call } = require('./wechat');
const { uid } = require('../core/model');
function mediaPaths(items) { return items.reduce((paths, m) => paths.concat([m.path, m.poster].filter(Boolean)), []); }
function createMedia(api, files, repository) {
  async function choose(source, count = 9, imageOnly = false) {
    if (typeof api.requirePrivacyAuthorize === 'function') await call(api, 'requirePrivacyAuthorize');
    const result = await call(api, 'chooseMedia', { count, mediaType: source === 'camera' || imageOnly ? ['image'] : ['mix'], sourceType: [source], sizeType: ['original'], camera: 'back' });
    return result.tempFiles || [];
  }
  async function persistBatch(items, alive = () => true) {
    const saved = [];
    try {
      for (const item of items) {
        if (!alive()) throw new Error('这次操作已结束，请重新选择');
        saved.push(await files.persist(item));
      }
      if (!alive()) throw new Error('这次操作已结束，请重新选择');
      return saved;
    } catch (error) { await files.remove(mediaPaths(saved)); throw error; }
  }
  return {
    choose, persistBatch,
    async importForPet(petId, source, alive = () => true) {
      const valid = () => alive() && repository.read().pets.some(p => p.id === petId);
      const selected = await choose(source, source === 'camera' ? 1 : 9);
      if (!selected.length) return 0;
      const saved = await persistBatch(selected, valid);
      try {
        if (!valid()) throw new Error('这只狗狗的档案已移除');
        repository.importMedia(petId, saved, uid());
        return saved.length;
      } catch (error) { await files.remove(mediaPaths(saved)); throw error; }
    },
    async releaseUnreferenced(candidates) {
      const keep = new Set(repository.paths());
      return files.remove(candidates.filter(path => !keep.has(path)));
    }
  };
}
module.exports = { createMedia, mediaPaths };
