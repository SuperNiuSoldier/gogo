'use strict';

const SCHEMA = 1;
const KINDS = [
  { id: 'food', label: '喂食', icon: 'food' },
  { id: 'water', label: '喝水', icon: 'water' },
  { id: 'pee', label: '尿尿', icon: 'pee' },
  { id: 'poop', label: '便便', icon: 'poop' },
  { id: 'walk', label: '遛狗', icon: 'footprints' },
  { id: 'diary', label: '日记', icon: 'notebook' },
  { id: 'weight', label: '体重', icon: 'scale' },
  { id: 'note', label: '小事', icon: 'pencil' }
];
function fail(message) { throw new Error(message); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function uid() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11); }
function dateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
function timeKey(date = new Date()) { return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0'); }
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parts = value.split('-').map(Number);
  return dateKey(new Date(parts[0], parts[1] - 1, parts[2], 12)) === value;
}
function characterCount(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(text)).length;
  return Array.from(text).filter(c => !/[\u0300-\u036f\uFE00-\uFE0F\u200D]/.test(c)).length;
}
function emptyState() {
  return { schema: SCHEMA, pets: [], records: [], reminders: [], draft: null,
    preferences: { petId: null, theme: 'light', skin: 'rouqiu', tab: 'album', reducedMotion: false } };
}
function normalizePet(input, today) {
  const name = String(input.name || '').trim();
  if (!name || characterCount(name) > 16) fail('名字填写 1–16 个字');
  const birthday = input.birthday || '', arrival = input.arrival || '';
  for (const date of [birthday, arrival]) if (date && (!validDate(date) || date > today)) fail('日期不能晚于今天');
  if (birthday && arrival && arrival < birthday) fail('到家日不能早于生日');
  const note = String(input.note || '').trim();
  if (note.length > 500) fail('小特点最多填写 500 字');
  return { name, birthday, arrival, note, avatar: input.avatar || '' };
}
function normalizeRecord(input, today) {
  if (!KINDS.some(k => k.id === input.kind)) fail('请选择记录类型');
  if (!validDate(input.date) || input.date > today) fail('记录日期不能晚于今天');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time || '')) fail('请选择正确时间');
  const text = String(input.text || '').trim(), media = input.media || [];
  if (text.length > 4000) fail('正文最多填写 4000 字');
  if (!Array.isArray(media) || media.length > 9) fail('每条记录最多 9 个附件');
  media.forEach(m => {
    if (!m.id || !m.path || !['image', 'video'].includes(m.type) || !Number.isFinite(m.size) || m.size < 0) fail('附件未保存，请重新选择');
  });
  if (['note', 'diary'].includes(input.kind) && !text && !media.length) fail('写点什么，或者选一张照片');
  const weight = input.kind === 'weight' ? Number(input.weight) : null;
  if (input.kind === 'weight' && (!Number.isFinite(weight) || weight <= 0 || weight > 500)) fail('体重填写 0–500 kg 之间的数值');
  return { kind: input.kind, date: input.date, time: input.time, text, media: clone(media), weight };
}
function normalizeReminder(input) {
  const title = String(input.title || '').trim();
  if (!title || title.length > 40) fail('提醒名称填写 1–40 字');
  if (!validDate(input.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time || '')) fail('请选择提醒日期和时间');
  return { title, date: input.date, time: input.time, done: !!input.done };
}
function referencedPaths(state) {
  const paths = new Set();
  const media = m => { if (m.path) paths.add(m.path); if (m.poster) paths.add(m.poster); };
  state.pets.forEach(p => { if (p.avatar) paths.add(p.avatar); });
  state.records.forEach(r => (r.media || []).forEach(media));
  if (state.draft) {
    const values = state.draft.values || {};
    if (values.avatar) paths.add(values.avatar);
    (values.media || []).forEach(media);
  }
  return Array.from(paths);
}
function validateState(state) {
  if (!state || state.schema !== SCHEMA) fail('数据版本暂不支持，请保留数据并更新小程序');
  if (!Array.isArray(state.pets) || !Array.isArray(state.records) || !Array.isArray(state.reminders) || !state.preferences) fail('本地数据读取失败，已保留原数据');
  const petIds = new Set(state.pets.map(p => p.id));
  if (petIds.size !== state.pets.length || state.pets.some(p => !p.id || typeof p.name !== 'string' || !p.name.trim())) fail('宠物档案数据不完整，已保留原数据');
  const prefs = state.preferences;
  // Optional fields keep v1 snapshots readable without resetting existing records.
  if (prefs.skin !== undefined && !['classic', 'rouqiu'].includes(prefs.skin)) fail('无效主题');
  if (!['light', 'dark'].includes(prefs.theme) || !['album', 'footprints', 'reminders'].includes(prefs.tab) || (prefs.petId !== null && !petIds.has(prefs.petId))) fail('本地设置读取失败，已保留原数据');
  for (const collection of [state.records, state.reminders]) {
    if (new Set(collection.map(r => r.id)).size !== collection.length) fail('记录数据不完整，已保留原数据');
    collection.forEach(r => { if (!r.id || !petIds.has(r.petId)) fail('记录归属不完整，已保留原数据'); });
  }
  state.records.forEach(r => normalizeRecord(r, '9999-12-31'));
  state.reminders.forEach(normalizeReminder);
  if (state.draft && (!state.draft.id || !['pet', 'record', 'reminder'].includes(state.draft.kind) || !state.draft.values || (state.draft.kind !== 'pet' && (!petIds.has(state.draft.petId) || state.draft.values.petId !== state.draft.petId)))) fail('草稿读取失败，已保留原数据');
  return state;
}
module.exports = { SCHEMA, KINDS, clone, uid, dateKey, timeKey, validDate, normalizePet, normalizeRecord, normalizeReminder, referencedPaths, emptyState, validateState };
