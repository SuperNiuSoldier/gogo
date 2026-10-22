'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { setup } = require('./helpers');
const { createRepository } = require('../miniprogram/core/repository');
const { createMedia } = require('../miniprogram/services/media');
const { clone, dateKey } = require('../miniprogram/core/model');
const filename = path.resolve(__dirname, '../miniprogram/pages/home/index.js');

async function harness(existing) {
  const t = existing || setup(); t.repo = createRepository(t.disk);
  const actions = [], modals = [], toasts = [], selections = [];
  const wx = {
    onNeedPrivacyAuthorization(fn) { this.privacyHandler = fn; }, offNeedPrivacyAuthorization() {},
    getWindowInfo: () => ({ screenHeight: 844, safeArea: { bottom: 810 } }),
    setNavigationBarColor() {}, setBackgroundColor() {},
    showToast(value) { toasts.push(value); },
    showModal(params) { modals.push(params); params.success({ confirm: actions.length ? actions.shift() : true }); },
    showActionSheet(params) { params.success({ tapIndex: actions.length ? actions.shift() : 0 }); },
    chooseMedia(params) { selections.push(params); params.success({ tempFiles: [t.image] }); },
    createVideoContext: () => ({ pause() {} })
  };
  const app = { repository: t.repo, files: t.files, media: createMedia(wx, t.files, t.repo), ready: t.files.sweep(t.repo.paths()) };
  let definition;
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { Page(value) { definition = value; }, getApp: () => app, wx, require: createRequire(filename), setTimeout, clearTimeout });
  const page = Object.assign({}, definition, {
    data: clone(definition.data),
    setData(patch) {
      Object.entries(patch).forEach(([key, value]) => {
        const segments = key.split('.'); let target = this.data;
        while (segments.length > 1) { const p = segments.shift(); target = target[p] || (target[p] = {}); }
        target[segments[0]] = clone(value);
      });
    }
  });
  await page.onLoad();
  async function invoke(name, dataset = {}, value) {
    const result = page[name]({ currentTarget: { dataset }, detail: { value } });
    if (result && result.then) await result;
    for (let i = 0; page.data.busy && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 1));
    assert.equal(page.data.busy, false, name + ' did not finish');
  }
  return { t, wx, page, actions, modals, toasts, selections, invoke, close: () => page.onUnload() };
}

test('controller: first pet → photo import → restart → edit → last pet deletion', async () => {
  const h = await harness(); assert.equal(h.page.data.pet, null);
  await h.invoke('addPet'); await h.invoke('onField', { field: 'name' }, '肉球'); await h.invoke('saveEditor');
  const petId = h.page.data.pet.id;
  await h.invoke('takePhoto'); assert.equal(h.selections[0].sourceType[0], 'camera'); assert.equal(h.selections[0].mediaType[0], 'image');
  assert.equal(h.page.data.album.length, 1); assert.equal(h.page.data.error, '');
  const recordId = h.page.data.album[0].id; h.close();
  const next = await harness(h.t); assert.equal(next.page.data.pet.id, petId); assert.equal(next.page.data.album[0].id, recordId);
  await next.invoke('openRecord', { id: recordId }); await next.invoke('editRecord');
  await next.invoke('onField', { field: 'text' }, '今天一起散步了'); await next.invoke('saveEditor');
  assert.equal(next.t.repo.read().records[0].text, '今天一起散步了');
  await next.invoke('menu'); assert.equal(next.page.data.sheet, 'pet');
  next.actions.push(false); await next.invoke('deletePet'); assert.equal(next.t.repo.read().pets.length, 1);
  next.actions.push(true); await next.invoke('deletePet'); assert.equal(next.page.data.pet, null);
  assert.match(next.modals.at(-1).content, /1 条记录、1 个照片/);
  assert.equal(Array.from(next.t.fs.entries.keys()).filter(next.t.files.owned).length, 0); next.close();
});
test('controller: all three pages follow only the top pet selection and keep independent theme', async () => {
  const h = await harness();
  const a = h.t.repo.savePet({ name: '肉球' }), b = h.t.repo.savePet({ name: '格林' });
  await h.invoke('onPet', { id: a }); await h.invoke('onTab', { tab: 'footprints' });
  await h.invoke('openQuick'); await h.invoke('quickKind', { kind: 'food' });
  assert.equal(h.page.data.records.length, 1); assert.equal(h.page.data.records[0].petId, a);
  await h.invoke('toggleTheme'); await h.invoke('onPet', { id: b }); assert.equal(h.page.data.theme, 'dark'); assert.equal(h.page.data.records.length, 0);
  await h.invoke('onTab', { tab: 'reminders' }); await h.invoke('addReminder');
  await h.invoke('onField', { field: 'title' }, '剪指甲'); await h.invoke('saveEditor');
  assert.equal(h.page.data.reminders.length, 1);
  const reminderId = h.page.data.reminders[0].id;
  await h.invoke('toggleReminder', { id: reminderId }); assert.equal(h.page.data.reminders[0].done, true);
  await h.invoke('onPet', { id: a }); assert.equal(h.page.data.reminders.length, 0); h.close();
});
test('controller: unfinished draft keeps the original pet on resume and never publishes early', async () => {
  const h = await harness(), a = h.t.repo.savePet({ name: '肉球' }), b = h.t.repo.savePet({ name: '格林' });
  await h.invoke('onPet', { id: a }); await h.invoke('openQuick'); await h.invoke('quickKind', { kind: 'note' });
  await h.invoke('onField', { field: 'text' }, '先写一半'); h.page.onHide();
  assert.equal(h.t.repo.read().records.length, 0); assert.equal(h.t.repo.read().draft.petId, a);
  h.actions.push(0); await h.invoke('closeSheet'); await h.invoke('onPet', { id: b });
  await h.invoke('restoreDraft'); assert.equal(h.page.data.editorPetName, '肉球');
  await h.invoke('saveEditor'); assert.equal(h.t.repo.read().records[0].petId, a); assert.equal(h.page.data.pet.id, b); h.close();
});
test('controller: failed save retains input and does not show a success toast', async () => {
  const h = await harness(); h.t.repo.savePet({ name: '格林' });
  await h.invoke('openQuick'); await h.invoke('quickKind', { kind: 'note' });
  await h.invoke('onField', { field: 'text' }, '这句不能丢'); h.page.flushDraft();
  h.t.disk.fail = true; await h.invoke('saveEditor');
  assert.equal(h.page.data.sheet, 'record'); assert.equal(h.page.data.form.text, '这句不能丢');
  assert.match(h.page.data.error, /保存成功/); assert.equal(h.toasts.some(t => t.icon === 'success'), false);
  h.t.disk.fail = false; await h.invoke('saveEditor'); assert.equal(h.t.repo.read().records[0].text, '这句不能丢'); h.close();
});
test('controller: discarded attachment draft cleans staged files while keeping published media', async () => {
  const h = await harness(); h.t.repo.savePet({ name: '肉球' }); await h.invoke('takePhoto');
  const original = h.t.repo.paths()[0];
  await h.invoke('openRecord', { id: h.page.data.album[0].id }); await h.invoke('editRecord'); await h.invoke('addAttachment');
  assert.equal(h.t.repo.paths().length, 2); h.actions.push(1); await h.invoke('closeSheet');
  assert.equal(h.t.repo.read().draft, null); assert.equal(h.t.repo.paths().length, 1);
  assert.equal(await h.t.files.exists(original), true); assert.equal(Array.from(h.t.fs.entries.keys()).filter(h.t.files.owned).length, 1); h.close();
});
test('controller: camera cancellation is silent; duplicate clicks are locked during import', async () => {
  const h = await harness(); h.t.repo.savePet({ name: '肉球' });
  h.wx.chooseMedia = ({ fail }) => fail({ errMsg: 'chooseMedia:fail cancel' }); await h.invoke('takePhoto');
  assert.equal(h.toasts.length, 0); assert.equal(h.t.repo.read().records.length, 0);
  let finish; let calls = 0;
  h.wx.chooseMedia = ({ success }) => { calls++; finish = () => success({ tempFiles: [h.t.image] }); };
  h.page.takePhoto(); h.page.takePhoto(); assert.equal(calls, 1); assert.equal(h.page.data.busy, true);
  finish(); for (let i = 0; h.page.data.busy && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal(h.t.repo.read().records.length, 1); h.close();
});
test('controller: privacy agreement resolves correctly; rejection does not create media', async () => {
  const h = await harness(); const events = [];
  h.wx.privacyHandler(event => events.push(event)); assert.equal(h.page.data.privacyRequested, true);
  h.page.agreePrivacy(); assert.equal(events[0].buttonId, 'privacy-agree'); assert.equal(events[0].event, 'agree');
  h.wx.privacyHandler(event => events.push(event)); h.page.declinePrivacy(); assert.equal(events[1].event, 'disagree');
  assert.equal(h.t.repo.read().records.length, 0); h.close();
});
test('controller: photo flow never automatically plays a video, and stops on hide', async () => {
  const h = await harness(), petId = h.t.repo.savePet({ name: '格林' });
  const a = await h.t.files.persist(h.t.image), b = await h.t.files.persist(h.t.video), c = await h.t.files.persist(h.t.image);
  h.t.repo.importMedia(petId, [a, b, c], 'flow');
  h.page.toggleSlideshow(); assert.equal(h.page.data.playing, true);
  h.page.onAlbumChange({ detail: { current: 1, source: 'autoplay' } }); assert.equal(h.page.data.playing, false);
  h.page.setData({ albumIndex: 0 }); h.page.toggleSlideshow(); h.page.onHide(); assert.equal(h.page.data.playing, false); h.close();
});
test('controller: avatar is a profile file, not an album record, and removal survives restart', async () => {
  const h = await harness(); await h.invoke('addPet'); await h.invoke('onField', { field: 'name' }, '小雪');
  await h.invoke('chooseAvatar'); assert.ok(h.page.data.form.avatar); assert.equal(h.t.repo.read().records.length, 0);
  const avatar = h.page.data.form.avatar; await h.invoke('saveEditor'); h.close();
  const next = await harness(h.t); assert.equal(next.page.data.pet.avatar, avatar); assert.equal(await next.t.files.exists(avatar), true);
  await next.invoke('menu'); await next.invoke('clearAvatar'); await next.invoke('saveEditor');
  assert.equal(next.t.repo.read().pets[0].avatar, ''); assert.equal(await next.t.files.exists(avatar), false); next.close();
});
test('controller: long histories use bounded summaries; older pages and full detail remain accessible', async () => {
  const h = await harness(), petId = h.t.repo.savePet({ name: '肉球' });
  for (let i = 0; i < 145; i++) h.t.repo.saveRecord({ petId, kind: 'diary', date: dateKey(), time: '10:00', text: '小'.repeat(4000), media: [] });
  await h.invoke('onTab', { tab: 'footprints' });
  assert.equal(h.page.data.records.length, 30);
  for (let i = 0; i < 8; i++) await h.invoke('loadMore');
  assert.equal(h.page.data.records.length, 120);
  assert.equal(h.page.data.records[0].text.length, 160);
  assert.ok(Buffer.byteLength(JSON.stringify(h.page.data)) < 1024 * 1024);
  await h.invoke('loadMore', { manual: true });
  assert.equal(h.page.data.windowStart, 120); assert.equal(h.page.data.records.length, 25);
  await h.invoke('openRecord', { id: h.page.data.records[0].id }); assert.equal(h.page.data.detail.text.length, 4000);
  await h.invoke('closeSheet'); await h.invoke('recentHistory'); assert.equal(h.page.data.windowStart, 0); h.close();
});

test('controller: Rouqiu skin switches independently of brightness and pet, and survives restart', async () => {
  const h = await harness();
  const a = h.t.repo.savePet({ name: '肉球' }), b = h.t.repo.savePet({ name: '格林' });
  await h.invoke('onPet', { id:a });
  await h.invoke('openQuick'); await h.invoke('quickKind', { kind:'food' });
  const records = h.t.repo.read().records;
  await h.invoke('openAppearance'); assert.equal(h.page.data.sheet, 'appearance');
  assert.equal(h.page.data.skin, 'rouqiu');
  assert.match(h.page.data.icons.food, /rouqiu\/photo\/food\.webp/);
  await h.invoke('toggleTheme'); assert.match(h.page.data.icons.food, /rouqiu\/photo\/food\.webp/);
  assert.equal(h.page.data.theme, 'dark'); assert.match(h.page.data.icons.plus, /icons\/dark\/plus/);
  await h.invoke('chooseSkin', { skin:'classic' });
  assert.equal(h.page.data.theme, 'dark'); assert.match(h.page.data.icons.food, /icons\/dark\/food/);
  await h.invoke('closeSheet'); await h.invoke('onPet', { id:b });
  assert.deepEqual(h.t.repo.read().records, records);
  assert.equal(h.page.data.records.length, 0); h.close();
  const next = await harness(h.t);
  assert.equal(next.page.data.skin, 'classic'); assert.equal(next.page.data.theme, 'dark');
  assert.equal(next.page.data.pet.id, b);
  await next.invoke('openAppearance'); await next.invoke('chooseSkin', { skin:'rouqiu' });
  assert.equal(next.page.data.theme, 'dark'); assert.equal(next.page.data.pet.id, b);
  assert.deepEqual(next.t.repo.read().records, records); next.close();
});

test('controller: pre-skin v1 data opens without losing photos, records, or its dark preference', async () => {
  const t = setup(), pet = t.repo.savePet({ name:'肉球' });
  const photo = await t.files.persist(t.image); t.repo.importMedia(pet, [photo], 'before-skins');
  t.repo.preferences({ theme:'dark' });
  const key = 'godog.state.v1', old = t.disk.get(key); delete old.preferences.skin; t.disk.set(key, old);
  const h = await harness(t);
  assert.equal(h.page.data.skin, 'rouqiu'); assert.equal(h.page.data.theme, 'dark');
  assert.equal(h.page.data.album[0].cover, photo.path); assert.ok(await t.files.exists(photo.path));
  h.t.disk.fail = true; await h.invoke('chooseSkin', { skin:'classic' });
  assert.equal(h.page.data.skin, 'rouqiu'); assert.equal(h.t.repo.read().preferences.skin, undefined);
  h.t.disk.fail = false; await h.invoke('chooseSkin', { skin:'classic' });
  assert.deepEqual(h.t.repo.read().records, old.records); h.close();
});
