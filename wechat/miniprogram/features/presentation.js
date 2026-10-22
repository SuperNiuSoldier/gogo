'use strict';
const { KINDS, dateKey } = require('../core/model');
const { appearance } = require('./appearance');
function recordView(record) {
  const kind = KINDS.find(k => k.id === record.kind) || KINDS[7];
  const media = record.media || [], cover = media[0];
  return Object.assign({}, record, {
    label: kind.label, icon: kind.icon, dateLabel: record.date.replace(/-/g, '.'),
    dayLabel: record.date.slice(5).replace('-', ' / '),
    title: record.kind === 'weight' ? record.weight + ' kg' : record.text || kind.label,
    cover: cover ? cover.type === 'video' ? cover.poster : cover.path : '',
    video: !!cover && cover.type === 'video', mediaCount: media.length,
    durationLabel: cover && cover.duration ? Math.floor(cover.duration / 60) + ':' + String(Math.floor(cover.duration) % 60).padStart(2, '0') : ''
  });
}
function recordSummary(record) {
  const view = recordView(record);
  delete view.media;
  view.text = view.text.slice(0, 160);
  view.title = view.title.slice(0, 160);
  return view;
}
function calendar(day, reminders, expanded = false) {
  const [year, month, date] = day.split('-').map(Number);
  const current = new Date(year, month - 1, date, 12), start = new Date(year, month - 1, expanded ? 1 : date, 12);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(year, month, 0, 12);
  const count = expanded ? Math.ceil(((new Date(year, month - 1, 1, 12).getDay() + 6) % 7 + end.getDate()) / 7) * 7 : 7;
  const today = dateKey();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); const key = dateKey(d);
    return { date: key, label: d.getDate(), active: key === day, today: key === today,
      outside: d.getMonth() !== current.getMonth(), dot: reminders.some(r => r.date === key && !r.done) };
  });
}
function moveDay(day, amount) { const p = day.split('-').map(Number); const d = new Date(p[0], p[1] - 1, p[2] + amount, 12); return dateKey(d); }
function viewState(state, day, albumMode, expanded) {
  const pet = state.pets.find(p => p.id === state.preferences.petId) || state.pets[0] || null;
  const records = state.records.filter(r => pet && r.petId === pet.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).map(recordSummary);
  const reminders = state.reminders.filter(r => pet && r.petId === pet.id);
  return Object.assign({
    pets: state.pets.map(p => Object.assign({}, p, { initial: Array.from(p.name)[0] })), pet,
    album: records.filter(r => albumMode === 'all' || r.kind === 'diary'),
    records, calendar: calendar(day, reminders, expanded),
    reminders: reminders.filter(r => r.date === day).sort((a, b) => Number(a.done) - Number(b.done) || a.time.localeCompare(b.time)),
    draft: state.draft, theme: state.preferences.theme, tab: state.preferences.tab,
    reducedMotion: state.preferences.reducedMotion, day, monthLabel: day.slice(0, 4) + ' 年 ' + Number(day.slice(5, 7)) + ' 月'
  }, appearance(state.preferences));
}
module.exports = { recordView, recordSummary, viewState, calendar, moveDay };
