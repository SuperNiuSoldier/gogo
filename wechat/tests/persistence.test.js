'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, record, storage } = require('./helpers');
const { KEY, createRepository } = require('../miniprogram/core/repository');
const { createMedia, mediaPaths } = require('../miniprogram/services/media');
const { dateKey, validDate } = require('../miniprogram/core/model');
const { viewState, calendar } = require('../miniprogram/features/presentation');

test('fresh library has no invented pets or records; preferences persist', () => {
  const t = setup(); assert.equal(t.repo.read().pets.length, 0);
  const id = t.repo.savePet({ name: ' 肉球 ' });
  t.repo.preferences({ theme: 'dark', tab: 'footprints' });
  const reopened = t.reopen().read();
  assert.equal(reopened.pets[0].name, '肉球'); assert.equal(reopened.preferences.petId, id);
  assert.equal(reopened.preferences.theme, 'dark'); assert.equal(reopened.preferences.tab, 'footprints');
});
test('pet editing keeps stable ownership; records and reminders stay separate', () => {
  const t = setup(), a = t.repo.savePet({ name: '肉球' }), b = t.repo.savePet({ name: '格林' });
  const r = t.repo.saveRecord(record(a));
  t.repo.saveReminder({ petId: a, title: '洗澡', date: '2026-10-15', time: '18:30' });
  t.repo.savePet({ id: a, name: '肉球同学', birthday: '2020-01-01' });
  assert.equal(t.reopen().read().records[0].petId, a);
  assert.throws(() => t.repo.saveRecord(record(b, { id: r })), /变更/);
  t.repo.preferences({ petId: b });
  assert.equal(viewState(t.repo.read(), '2026-10-15', 'all', false).records.length, 0);
});
test('name and real calendar dates validate without changing persisted state', () => {
  const t = setup();
  for (const pet of [{ name: ' ' }, { name: '狗'.repeat(17) }, { name: '狗', birthday: '2026-02-30' }, { name: '狗', arrival: '2026-10-14' }, { name: '狗', birthday: '2026-01-02', arrival: '2026-01-01' }]) assert.throws(() => t.repo.savePet(pet));
  assert.equal(t.repo.read().pets.length, 0);
  assert.equal(validDate('2024-02-29'), true); assert.equal(validDate('2025-02-29'), false);
});
test('storage failure never publishes a change and leaves old records intact', () => {
  const t = setup(), petId = t.repo.savePet({ name: '肉球' }); let calls = 0;
  const before = t.repo.read(); t.repo.subscribe(() => calls++); t.disk.fail = true;
  assert.throws(() => t.repo.saveRecord(record(petId)), /没有保存成功/);
  assert.deepEqual(t.repo.read(), before); assert.deepEqual(t.reopen().read(), before); assert.equal(calls, 0);
  t.disk.fail = false; t.repo.saveRecord(record(petId)); assert.equal(calls, 1);
});
test('damaged and newer data are rejected and never reset silently', () => {
  for (const value of [null, {}, { schema: 999 }, { schema: 1, pets: [], records: [], reminders: [] }]) {
    const disk = storage(); disk.data.set(KEY, value);
    assert.throws(() => createRepository(disk)); assert.deepEqual(disk.data.get(KEY), value);
  }
});
test('draft survives restart, clears atomically on save, and is not a published record', () => {
  const t = setup(), petId = t.repo.savePet({ name: '格林' });
  const draft = { id: 'draft', kind: 'record', petId, values: record(petId, { kind: 'note', text: '今天走了很远' }) };
  t.repo.saveDraft(draft); assert.equal(t.reopen().read().records.length, 0);
  assert.equal(t.reopen().read().draft.values.text, draft.values.text);
  t.disk.fail = true; assert.throws(() => t.repo.saveRecord(draft.values, draft.id)); assert.ok(t.repo.read().draft);
  t.disk.fail = false; t.repo.saveRecord(draft.values, draft.id);
  assert.equal(t.reopen().read().draft, null); assert.equal(t.reopen().read().records.length, 1);
});
test('photo and video imports retain copied originals and poster after restart', async () => {
  const t = setup(), petId = t.repo.savePet({ name: '肉球' });
  const items = await Promise.all([t.files.persist(t.image), t.files.persist(t.video)]);
  t.repo.importMedia(petId, items, 'batch-1');
  t.fs.entries.delete(t.image.tempFilePath); t.fs.entries.delete(t.video.tempFilePath); t.fs.entries.delete(t.video.thumbTempFilePath);
  const reopened = t.reopen(); assert.equal(reopened.read().records.length, 2);
  for (const path of reopened.paths()) assert.equal(await t.files.exists(path), true);
  assert.equal(reopened.read().records[1].media[0].type, 'video');
  assert.equal(reopened.read().records[1].media[0].duration, 12);
  assert.equal(t.repo.importMedia(petId, items, 'batch-1').length, 2); assert.equal(t.repo.read().records.length, 2);
});
test('failed batch removes partial copies and leaves no phantom records', async () => {
  const t = setup(), petId = t.repo.savePet({ name: '肉球' }); t.fs.failCopyAt = 2;
  const api = { chooseMedia({ success }) { success({ tempFiles: [t.image, t.video] }); } };
  const media = createMedia(api, t.files, t.repo);
  await assert.rejects(media.importForPet(petId, 'album'));
  assert.equal(t.repo.read().records.length, 0);
  assert.equal(Array.from(t.fs.entries.keys()).filter(t.files.owned).length, 0);
  assert.equal(t.fs.entries.has(t.image.tempFilePath), true);
});
test('metadata failure after copying media rolls back only staged copies', async () => {
  const t = setup(), petId = t.repo.savePet({ name: '格林' });
  const original = await t.files.persist(t.image); t.repo.importMedia(petId, [original], 'existing');
  const api = { chooseMedia({ success }) { success({ tempFiles: [t.video] }); } };
  t.disk.fail = true;
  await assert.rejects(createMedia(api, t.files, t.repo).importForPet(petId, 'album'), /没有保存成功/);
  assert.equal(t.repo.read().records.length, 1);
  assert.deepEqual(Array.from(t.fs.entries.keys()).filter(t.files.owned), [original.path]);
});
test('pet switches during import never reassign the captured owner', async () => {
  const t = setup(), a = t.repo.savePet({ name: '肉球' }), b = t.repo.savePet({ name: '格林' });
  const api = { chooseMedia({ success }) { t.repo.preferences({ petId: b }); success({ tempFiles: [t.image] }); } };
  await createMedia(api, t.files, t.repo).importForPet(a, 'album');
  assert.equal(t.reopen().read().records[0].petId, a); assert.equal(t.repo.read().preferences.petId, b);
});
test('pet deletion during asynchronous import cancels the batch and releases files', async () => {
  const t = setup(), a = t.repo.savePet({ name: '肉球' });
  t.fs.beforeCopy = () => { t.fs.beforeCopy = null; t.repo.deletePet(a); };
  const api = { chooseMedia({ success }) { success({ tempFiles: [t.image, t.video] }); } };
  await assert.rejects(createMedia(api, t.files, t.repo).importForPet(a, 'album'));
  assert.equal(t.reopen().read().records.length, 0); assert.equal(t.repo.read().pets.length, 0);
  assert.equal(Array.from(t.fs.entries.keys()).filter(t.files.owned).length, 0);
});
test('video poster failure also removes the already copied original', async () => {
  const t = setup(); t.fs.failCopyAt = 2;
  await assert.rejects(t.files.persist(t.video));
  assert.equal(Array.from(t.fs.entries.keys()).filter(t.files.owned).length, 0);
});
test('file budget uses real file size and serializes concurrent imports', async () => {
  const t = setup(); t.fs.directories.add(t.files.base); t.fs.entries.set(t.files.base + '/existing.mp4', 100 * 1024 * 1024);
  t.fs.entries.set(t.video.tempFilePath, 30 * 1024 * 1024);
  const results = await Promise.allSettled([t.files.persist(t.video), t.files.persist(t.video)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(results.find(r => r.status === 'rejected').reason.message, /150 MB/);
  assert.ok(await t.files.bytes() <= 150 * 1024 * 1024);
  t.fs.entries.set(t.video.tempFilePath, 61 * 1024 * 1024);
  await assert.rejects(t.files.persist(t.video), /60 MB/);
});
test('deleting one pet preserves shared files, the other pet, and its reminders', async () => {
  const t = setup(), a = t.repo.savePet({ name: '肉球' }), b = t.repo.savePet({ name: '格林' });
  const shared = await t.files.persist(t.image);
  t.repo.importMedia(a, [shared], 'a'); t.repo.importMedia(b, [shared], 'b');
  t.repo.saveReminder({ petId: b, title: '洗澡', date: '2026-10-16', time: '18:00' });
  const media = createMedia({}, t.files, t.repo), before = t.repo.paths();
  t.repo.deletePet(a); await media.releaseUnreferenced(before);
  assert.equal(await t.files.exists(shared.path), true);
  assert.equal(t.reopen().read().records[0].petId, b); assert.equal(t.repo.read().reminders.length, 1);
  t.repo.deletePet(b); await media.releaseUnreferenced(before);
  assert.equal(t.reopen().read().preferences.petId, null); assert.equal(t.repo.read().pets.length, 0);
  assert.equal(await t.files.exists(shared.path), false);
});
test('garbage collection preserves drafts and ignores paths outside owned directory', async () => {
  const t = setup(), petId = t.repo.savePet({ name: '肉球' });
  const saved = await t.files.persist(t.image), orphan = await t.files.persist(t.image);
  t.repo.saveDraft({ id: 'draft', kind: 'record', petId, values: record(petId, { media: [saved] }) });
  await t.files.sweep(t.reopen().paths());
  assert.equal(await t.files.exists(saved.path), true); assert.equal(await t.files.exists(orphan.path), false);
  await t.files.remove(['/tmp/image.jpg', t.files.base + '/../image.jpg']);
  assert.equal(t.fs.entries.has('/tmp/image.jpg'), true);
});
test('failed unlink is retried by next launch sweep without reviving deleted data', async () => {
  const t = setup(), petId = t.repo.savePet({ name: '格林' });
  const m = await t.files.persist(t.image); t.repo.importMedia(petId, [m], 'batch');
  t.repo.deletePet(petId); t.fs.failUnlink = true; assert.equal((await t.files.sweep(t.repo.paths())).length, 1);
  t.fs.failUnlink = false; await t.files.sweep(t.reopen().paths());
  assert.equal(await t.files.exists(m.path), false); assert.equal(t.reopen().read().pets.length, 0);
});
test('record validations reject empty prose, invalid times, future dates and invalid weights', () => {
  const t = setup(), petId = t.repo.savePet({ name: '肉球' });
  for (const patch of [{ kind: 'weight', weight: 0 }, { kind: 'weight', weight: 'no' }, { kind: 'weight', weight: 501 }, { kind: 'note' }, { time: '25:00' }, { date: '2026-10-14' }]) assert.throws(() => t.repo.saveRecord(record(petId, patch)));
  const id = t.repo.saveRecord(record(petId, { kind: 'weight', weight: '24.6' }));
  t.repo.saveRecord(record(petId, { id, kind: 'weight', weight: 24.8 }));
  assert.equal(t.reopen().read().records.length, 1); assert.equal(t.repo.read().records[0].weight, 24.8);
});
test('in-app reminders complete and revert without inventing notifications or records', () => {
  const t = setup(), petId = t.repo.savePet({ name: '格林' });
  const id = t.repo.saveReminder({ petId, title: '洗澡', date: '2026-10-13', time: '18:00' });
  t.repo.toggleReminder(id, petId); assert.equal(t.reopen().read().reminders[0].done, true);
  t.repo.toggleReminder(id, petId); assert.equal(t.repo.read().reminders[0].done, false);
  assert.equal(t.repo.read().records.length, 0); assert.equal(t.repo.read().reminders[0].notificationScheduled, undefined);
});
test('calendar handles leap day, month boundaries, selected date and per-pet dots', () => {
  const days = calendar('2024-02-29', [{ date: '2024-02-29', done: false }], true);
  assert.equal(days.length % 7, 0); assert.equal(days.find(d => d.active).date, '2024-02-29');
  assert.equal(days.filter(d => d.dot).length, 1);
  const weekly = calendar('2026-01-01', [], false); assert.equal(weekly[0].date, '2025-12-29'); assert.equal(weekly[6].date, '2026-01-04');
  assert.equal(dateKey(new Date(2026, 0, 1, 0, 1)), '2026-01-01');
});
