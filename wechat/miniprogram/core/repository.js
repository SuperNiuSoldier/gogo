'use strict';
const M = require('./model');
const KEY = 'godog.state.v1';

function createRepository(storage, options = {}) {
  const id = options.id || M.uid, now = options.now || (() => new Date());
  const stored = storage.get(KEY);
  let state = stored === undefined || stored === '' ? M.emptyState() : M.validateState(M.clone(stored));
  const listeners = new Set();
  function commit(change) {
    const next = M.clone(state);
    const result = change(next);
    M.validateState(next);
    // The single synchronous write is the commit point. Never publish unpersisted state.
    try { storage.set(KEY, next); } catch (_) { throw new Error('没有保存成功，请检查微信存储空间后重试'); }
    state = next;
    listeners.forEach(fn => { try { fn(); } catch (_) { /* UI failures cannot undo a saved transaction. */ } });
    return result;
  }
  function requirePet(s, petId) {
    if (!s.pets.some(p => p.id === petId)) throw new Error('这只狗狗的档案已移除');
  }
  function clearDraft(s, draftId) { if (draftId && s.draft && s.draft.id === draftId) s.draft = null; }
  return {
    read: () => M.clone(state),
    paths: () => M.referencedPaths(state),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    preferences(patch) {
      return commit(s => {
        if (patch.petId !== undefined && patch.petId !== null) requirePet(s, patch.petId);
        if (patch.theme && !['light', 'dark'].includes(patch.theme)) throw new Error('无效主题');
        if (patch.tab && !['album', 'footprints', 'reminders'].includes(patch.tab)) throw new Error('无效页面');
        Object.assign(s.preferences, patch);
      });
    },
    savePet(input, draftId) {
      const fields = M.normalizePet(input, M.dateKey(now()));
      return commit(s => {
        if (input.id) requirePet(s, input.id);
        const pet = Object.assign({}, fields, { id: input.id || id() });
        const index = s.pets.findIndex(p => p.id === pet.id);
        if (index < 0) s.pets.push(pet); else s.pets[index] = pet;
        if (index < 0) { s.preferences.petId = pet.id; s.preferences.tab = 'album'; }
        clearDraft(s, draftId);
        return pet.id;
      });
    },
    deletePet(petId) {
      return commit(s => {
        requirePet(s, petId);
        s.pets = s.pets.filter(p => p.id !== petId);
        s.records = s.records.filter(r => r.petId !== petId);
        s.reminders = s.reminders.filter(r => r.petId !== petId);
        if (s.draft && (s.draft.petId === petId || s.draft.values.id === petId)) s.draft = null;
        if (s.preferences.petId === petId) s.preferences.petId = s.pets[0] ? s.pets[0].id : null;
      });
    },
    saveRecord(input, draftId) {
      const fields = M.normalizeRecord(input, M.dateKey(now()));
      return commit(s => {
        requirePet(s, input.petId);
        const existing = input.id && s.records.find(r => r.id === input.id);
        if (input.id && (!existing || existing.petId !== input.petId)) throw new Error('这条记录已变更，请重新打开');
        const record = Object.assign({}, existing, fields, { id: input.id || id(), petId: input.petId });
        if (existing) s.records[s.records.indexOf(existing)] = record; else s.records.push(record);
        clearDraft(s, draftId);
        return record.id;
      });
    },
    importMedia(petId, items, operationId) {
      return commit(s => {
        requirePet(s, petId);
        const existing = s.records.filter(r => r.operationId === operationId);
        if (existing.some(r => r.petId !== petId)) throw new Error('导入操作的宠物归属不一致');
        if (existing.length) return existing.map(r => r.id);
        if (!operationId || !items.length || items.length > 9) throw new Error('请选择 1–9 个文件');
        const ids = [];
        items.forEach(media => {
          const record = Object.assign(M.normalizeRecord({ kind: 'diary', date: M.dateKey(now()), time: M.timeKey(now()), text: '', media: [media] }, M.dateKey(now())), { id: id(), petId, operationId });
          s.records.push(record); ids.push(record.id);
        });
        return ids;
      });
    },
    deleteRecord(recordId, petId) {
      return commit(s => {
        const record = s.records.find(r => r.id === recordId && r.petId === petId);
        if (!record) throw new Error('记录不存在');
        s.records = s.records.filter(r => r.id !== recordId);
        if (s.draft && s.draft.kind === 'record' && s.draft.values.id === recordId) s.draft = null;
      });
    },
    saveReminder(input, draftId) {
      const fields = M.normalizeReminder(input);
      return commit(s => {
        requirePet(s, input.petId);
        const existing = input.id && s.reminders.find(r => r.id === input.id);
        if (input.id && (!existing || existing.petId !== input.petId)) throw new Error('提醒已变更，请重新打开');
        const reminder = Object.assign(fields, { id: input.id || id(), petId: input.petId });
        if (existing) s.reminders[s.reminders.indexOf(existing)] = reminder; else s.reminders.push(reminder);
        clearDraft(s, draftId); return reminder.id;
      });
    },
    toggleReminder(reminderId, petId) {
      return commit(s => {
        const reminder = s.reminders.find(r => r.id === reminderId && r.petId === petId);
        if (!reminder) throw new Error('提醒不存在');
        reminder.done = !reminder.done;
      });
    },
    deleteReminder(reminderId, petId) {
      return commit(s => { s.reminders = s.reminders.filter(r => r.id !== reminderId || r.petId !== petId); clearDraft(s, s.draft && s.draft.kind === 'reminder' && s.draft.values.id === reminderId ? s.draft.id : null); });
    },
    saveDraft(draft) { return commit(s => { if (draft && draft.kind !== 'pet') requirePet(s, draft.petId); s.draft = draft ? M.clone(draft) : null; }); },
    clearDraft(draftId) { return commit(s => clearDraft(s, draftId)); }
  };
}
module.exports = { KEY, createRepository };
