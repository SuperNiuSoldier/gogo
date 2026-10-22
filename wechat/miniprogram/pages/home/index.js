'use strict';
const M = require('../../core/model');
const { viewState, recordView, moveDay } = require('../../features/presentation');
const { call, cancelled, message } = require('../../services/wechat');
const { mediaPaths } = require('../../services/media');
const { appearance } = require('../../features/appearance');

Page({
  data: {
    loading: true, fatal: '', busy: false, theme: 'light', tab: 'album', pets: [], pet: null,
    ...appearance({ theme: 'light' }), backgroundFailed: false,
    album: [], records: [], reminders: [], calendar: [], albumMode: 'diary', albumIndex: 0,
    kinds: M.KINDS, weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    titles: { album: '相册', footprints: '脚印', reminders: '提醒' },
    day: M.dateKey(), today: M.dateKey(), expanded: false, sheet: '', form: {}, error: '', playing: false,
    detailsOpen: false, detail: null, privacyRequested: false, reducedMotion: false,
    safeBottom: 0, mediaError: '', draft: null, storageMB: '0', editorPetName: '', sheetHeight: 420, textScale: 1, windowStart: 0, listAnchor: ''
  },
  async onLoad() {
    this._alive = true; this._limit = 30; this._offset = 0;
    this.app = getApp();
    this._privacyHandler = resolve => {
      this._privacyResolve = resolve;
      this.setData({ privacyRequested: true });
    };
    if (wx.onNeedPrivacyAuthorization) wx.onNeedPrivacyAuthorization(this._privacyHandler);
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const appInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : info;
      this.setData({ safeBottom: info.safeArea ? Math.max(0, info.screenHeight - info.safeArea.bottom) : 0, textScale: Math.max(1, Math.min(1.5, (appInfo.fontSizeSetting || 16) / 16)) });
    } catch (_) { /* CSS env() provides a fallback. */ }
    await this.app.ready;
    if (!this._alive) return;
    if (this.app.startupError) { this.setData({ loading: false, fatal: this.app.startupError.message }); return; }
    this.repo = this.app.repository;
    this._unsubscribe = this.repo.subscribe(() => { if (this._alive) this.refresh(); });
    this.refresh(); this.setData({ loading: false });
  },
  onShow() { if (this.repo) { this.setData({ today: M.dateKey() }); this.refresh(); } },
  onHide() { this.flushDraft(); this.pauseVideos(); this.setData({ playing: false }); },
  onUnload() {
    this.flushDraft(); this.pauseVideos(); this._alive = false;
    clearTimeout(this._draftTimer);
    if (this._unsubscribe) this._unsubscribe();
    if (this._privacyResolve) this._privacyResolve({ event: 'disagree' });
    if (wx.offNeedPrivacyAuthorization) wx.offNeedPrivacyAuthorization(this._privacyHandler);
  },
  noop() {},
  present(patch) { this.setData(patch, () => this.measureSheet()); },
  measureSheet() {
    if (!this.data.sheet || !wx.createSelectorQuery) return;
    const measure = () => {
      if (!this._alive || !this.data.sheet) return;
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      wx.createSelectorQuery().in(this).select('.sheet-body').boundingClientRect(rect => {
        if (rect && this._alive) this.setData({ sheetHeight: Math.min(Math.ceil(rect.height) + 2, info.windowHeight * .65) });
      }).exec();
    };
    if (wx.nextTick) wx.nextTick(measure); else setTimeout(measure, 20);
  },
  refresh() {
    const next = viewState(this.repo.read(), this.data.day, this.data.albumMode, this.data.expanded);
    next.albumTotal = next.album.length;
    next.recordTotal = next.records.length;
    const petId = next.pet ? next.pet.id : null;
    const changed = this._viewPetId !== petId || this._viewTab !== next.tab;
    if (changed) { this._offset = 0; this._limit = 30; }
    this._viewPetId = petId; this._viewTab = next.tab;
    const total = next.tab === 'album' ? next.albumTotal : next.recordTotal;
    if (this._offset >= total) this._offset = 0;
    next.windowStart = this._offset;
    next.album = next.album.slice(this._offset, this._offset + this._limit);
    next.records = next.records.slice(this._offset, this._offset + this._limit);
    next.albumIndex = changed ? 0 : Math.min(this.data.albumIndex, Math.max(0, next.album.length - 1));
    if (next.themeBackground !== this.data.themeBackground) next.backgroundFailed = false;
    const colorKey = next.theme + next.skin;
    if (this._theme !== colorKey) {
      this._theme = colorKey;
      const backgroundColor = next.skin === 'rouqiu' ? (next.theme === 'dark' ? '#202821' : '#f6f1e7') : (next.theme === 'dark' ? '#171b1a' : '#f7f5ef');
      if (wx.setNavigationBarColor) wx.setNavigationBarColor({ frontColor: next.theme === 'dark' ? '#ffffff' : '#000000', backgroundColor });
      if (wx.setBackgroundColor) wx.setBackgroundColor({ backgroundColor });
    }
    this.setData(next);
  },
  async run(action) {
    if (this.data.busy || !this.repo) return;
    this.setData({ busy: true, error: '' });
    try { await action(); }
    catch (error) {
      if (!cancelled(error) && this._alive) {
        this.present({ error: message(error), detailsOpen: this.data.detailsOpen || (this.data.sheet === 'pet' && /日期|生日|到家/.test(message(error))) });
        wx.showToast({ title: message(error), icon: 'none', duration: 3000 });
      }
    } finally { if (this._alive) this.setData({ busy: false }); }
  },
  success(title) { if (this._alive) wx.showToast({ title, icon: 'success' }); },
  onTab(e) { this.run(() => { this._limit = 30; this._offset = 0; this.setData({ albumIndex: 0, playing: false, listAnchor: '' }); this.repo.preferences({ tab: e.currentTarget.dataset.tab }); }); },
  onPet(e) { this.run(() => { this._limit = 30; this._offset = 0; this.setData({ albumIndex: 0, playing: false, listAnchor: '' }); this.repo.preferences({ petId: e.currentTarget.dataset.id }); }); },
  toggleTheme() { this.run(() => this.repo.preferences({ theme: this.data.theme === 'light' ? 'dark' : 'light' })); },
  openAppearance() { if (!this.data.busy) this.present({ sheet: 'appearance', error: '', playing: false }); },
  chooseSkin(e) { this.run(() => { this.repo.preferences({ skin: e.currentTarget.dataset.skin }); this.measureSheet(); }); },
  backgroundError() { this.setData({ backgroundFailed: true }); },
  setAlbumMode(e) { this._offset = 0; this._limit = 30; this.setData({ albumMode: e.currentTarget.dataset.mode, albumIndex: 0, playing: false }); this.refresh(); },
  onAlbumChange(e) {
    const current = this.data.album[e.detail.current];
    this.setData({ albumIndex: e.detail.current, playing: this.data.playing && e.detail.source !== 'touch' && !!current && !current.video && e.detail.current < this.data.album.length - 1 });
    if (e.detail.current >= this.data.album.length - 3) this.loadMore();
  },
  loadMore(e) {
    const total = this.data.tab === 'album' ? this.data.albumTotal : this.data.recordTotal;
    if (this._offset + this._limit >= total) return;
    if (this._limit < 120) this._limit += 30;
    else if (e && e.currentTarget && e.currentTarget.dataset.manual) {
      this._offset += this._limit; this._limit = 30; this.setData({ albumIndex: 0, playing: false });
    } else return;
    this.refresh();
    if (e && e.currentTarget && e.currentTarget.dataset.manual && this.data.records.length) this.setData({ listAnchor: 'entry-' + this.data.records[0].id });
  },
  recentHistory() { this._offset = 0; this._limit = 30; this.setData({ albumIndex: 0, playing: false, listAnchor: '' }); this.refresh(); if (this.data.records.length) this.setData({ listAnchor: 'entry-' + this.data.records[0].id }); },
  toggleSlideshow() {
    if (this.data.busy || this.data.reducedMotion || this.data.album.length < 2) return;
    const current = this.data.album[this.data.albumIndex];
    if (current && current.video) { wx.showToast({ title: '视频请点开播放', icon: 'none' }); return; }
    this.setData({ playing: !this.data.playing, albumIndex: this.data.albumIndex >= this.data.album.length - 1 ? 0 : this.data.albumIndex });
  },
  async albumJump() {
    if (this.data.busy || !this.data.album.length) return;
    try {
      const result = await call(wx, 'showActionSheet', { itemList: ['上一张', '下一张'] });
      this.setData({ albumIndex: Math.max(0, Math.min(this.data.album.length - 1, this.data.albumIndex + (result.tapIndex ? 1 : -1))) });
      this.loadMore();
    } catch (_) { /* Cancel keeps the current card. */ }
  },
  takePhoto() { this.importMedia('camera'); },
  importAlbum() { this.importMedia('album'); },
  importMedia(source) {
    const petId = this.data.pet && this.data.pet.id;
    if (!petId) return;
    this.setData({ playing: false });
    this.run(async () => {
      const count = await this.app.media.importForPet(petId, source, () => this._alive);
      if (count) { this._offset = 0; this._limit = 30; this.setData({ albumMode: 'diary', albumIndex: 0 }); this.refresh(); this.success('已留下瞬间'); }
    });
  },
  menu() {
    this.setData({ playing: false });
    this.run(async () => {
      const result = await call(wx, 'showActionSheet', { itemList: ['当前狗档案', '本地存储', this.data.reducedMotion ? '开启动效' : '减少动效'] });
      if (result.tapIndex === 0) await this.openEditor('pet', this.data.pet);
      if (result.tapIndex === 1) {
        const bytes = await this.app.files.bytes();
        this.present({ sheet: 'storage', storageMB: (bytes / 1024 / 1024).toFixed(1) });
      }
      if (result.tapIndex === 2) this.repo.preferences({ reducedMotion: !this.data.reducedMotion });
    });
  },
  addPet() { this.run(() => this.openEditor('pet')); },
  openQuick() { if (!this.data.busy) this.present({ sheet: 'quick', error: '', playing: false }); },
  quickKind(e) {
    this.run(async () => {
      const kind = e.currentTarget.dataset.kind;
      if (['food', 'water', 'pee', 'poop', 'walk'].includes(kind)) {
        this.repo.saveRecord({ petId: this.data.pet.id, kind, date: M.dateKey(), time: M.timeKey(), media: [], text: '' });
        this.recentHistory();
        this.setData({ sheet: '' }); this.success('记下了');
      } else await this.openEditor('record', { kind });
    });
  },
  addReminder() { this.run(() => this.openEditor('reminder')); },
  async openEditor(kind, input) {
    const draft = this.repo.read().draft;
    if (draft) {
      const response = await call(wx, 'showModal', { title: '还有一份草稿', content: '继续上次没有写完的内容？', confirmText: '继续编辑', cancelText: '先保留' });
      if (response.confirm) this.restoreDraft();
      return;
    }
    const petId = this.data.pet && this.data.pet.id;
    let values;
    if (kind === 'pet') values = { name: '', avatar: '', birthday: '', arrival: '', note: '' };
    if (kind === 'record') values = { petId, kind: 'note', date: M.dateKey(), time: M.timeKey(), text: '', weight: '', media: [] };
    if (kind === 'reminder') values = { petId, title: '', date: this.data.day, time: '09:00', done: false };
    values = Object.assign(values, input || {});
    this._editor = { id: M.uid(), kind, petId: kind === 'pet' ? values.id || null : petId, values };
    this._original = JSON.stringify(values);
    const owner = this.repo.read().pets.find(p => p.id === values.petId);
    this.present({ sheet: kind, form: M.clone(values), error: '', detailsOpen: false, editorPetName: owner ? owner.name : '', playing: false });
  },
  restoreDraft() {
    if (!this.repo) return;
    const draft = this.repo.read().draft;
    if (!draft) return;
    // The modal names its immutable owner; the global selection is left untouched.
    this._editor = M.clone(draft); this._original = '';
    const pet = this.repo.read().pets.find(p => p.id === draft.petId);
    this.present({ sheet: draft.kind, form: M.clone(draft.values), error: '', detailsOpen: false, editorPetName: pet ? pet.name : '', playing: false });
  },
  onField(e) {
    const key = e.currentTarget.dataset.field;
    if (!this._editor || !['name', 'note', 'birthday', 'arrival', 'text', 'weight', 'date', 'time', 'title'].includes(key)) return;
    this._editor.values[key] = e.detail.value;
    this.setData({ ['form.' + key]: e.detail.value, error: '' });
    clearTimeout(this._draftTimer); this._draftTimer = setTimeout(() => this.flushDraft(), 350);
  },
  flushDraft() {
    clearTimeout(this._draftTimer);
    if (!this.repo || !this._editor || JSON.stringify(this._editor.values) === this._original) return true;
    try { this.repo.saveDraft(this._editor); return true; }
    catch (error) { if (this._alive) this.setData({ error: message(error) }); return false; }
  },
  toggleDetails() { this.present({ detailsOpen: !this.data.detailsOpen }); },
  clearDate(e) {
    if (!this._editor || this.data.busy) return;
    const key = e.currentTarget.dataset.field;
    if (!['birthday', 'arrival'].includes(key)) return;
    this._editor.values[key] = ''; this.setData({ ['form.' + key]: '' }); this.flushDraft();
  },
  setKind(e) {
    if (!this._editor || this.data.busy) return;
    this._editor.values.kind = e.currentTarget.dataset.kind;
    this.setData({ 'form.kind': this._editor.values.kind }); this.flushDraft();
  },
  async applyEditor(values) {
    const draft = Object.assign({}, this._editor, { values });
    this.repo.saveDraft(draft);
    this._editor = draft; this.present({ form: M.clone(values) });
  },
  chooseAvatar() {
    this.run(async () => {
      const editor = this._editor;
      if (!editor) return;
      const selected = await this.app.media.choose('album', 1, true);
      const saved = await this.app.media.persistBatch(selected, () => this._alive && this._editor && this._editor.id === editor.id);
      if (!saved.length) return;
      const old = editor.values.avatar;
      try { await this.applyEditor(Object.assign({}, editor.values, { avatar: saved[0].path })); }
      catch (error) { await this.app.files.remove(mediaPaths(saved)); throw error; }
      if (old) await this.app.media.releaseUnreferenced([old]);
    });
  },
  clearAvatar() { this.run(async () => { const old = this._editor.values.avatar; await this.applyEditor(Object.assign({}, this._editor.values, { avatar: '' })); if (old) await this.app.media.releaseUnreferenced([old]); }); },
  addAttachment() {
    this.run(async () => {
      const editor = this._editor, count = 9 - editor.values.media.length;
      if (count < 1) throw new Error('每条记录最多 9 个附件');
      const selected = await this.app.media.choose('album', count);
      const saved = await this.app.media.persistBatch(selected, () => this._alive && this._editor && this._editor.id === editor.id);
      try { await this.applyEditor(Object.assign({}, editor.values, { media: editor.values.media.concat(saved) })); }
      catch (error) { await this.app.files.remove(mediaPaths(saved)); throw error; }
    });
  },
  removeAttachment(e) {
    this.run(async () => {
      const index = Number(e.currentTarget.dataset.index), values = this._editor.values;
      const removed = values.media[index];
      await this.applyEditor(Object.assign({}, values, { media: values.media.filter((_, i) => i !== index) }));
      await this.app.media.releaseUnreferenced(mediaPaths([removed]));
    });
  },
  saveEditor() {
    this.run(async () => {
      if (!this._editor) return;
      clearTimeout(this._draftTimer);
      const before = this.repo.paths(), draft = this._editor;
      if (draft.kind === 'pet') this.repo.savePet(draft.values, draft.id);
      if (draft.kind === 'record') this.repo.saveRecord(draft.values, draft.id);
      if (draft.kind === 'reminder') this.repo.saveReminder(draft.values, draft.id);
      this._offset = 0; this._limit = 30; this.refresh();
      this._editor = null; this.setData({ sheet: '', form: {}, error: '', albumIndex: 0 });
      await this.app.media.releaseUnreferenced(before);
      this.success('保存好了');
    });
  },
  closeSheet() {
    this.run(async () => {
      if (this._editor && JSON.stringify(this._editor.values) !== this._original) {
        const result = await call(wx, 'showActionSheet', { itemList: ['保存草稿并离开', '放弃修改', '继续编辑'] });
        if (result.tapIndex === 2) return;
        if (result.tapIndex === 0 && !this.flushDraft()) throw new Error('草稿未保存，请重试或选择放弃修改');
        if (result.tapIndex === 1) {
          clearTimeout(this._draftTimer);
          const paths = this.repo.paths();
          this.repo.clearDraft(this._editor.id);
          await this.app.media.releaseUnreferenced(paths);
        }
      }
      this.pauseVideos(); this._editor = null; this.setData({ sheet: '', form: {}, error: '', detail: null, mediaError: '' });
    });
  },
  openRecord(e) {
    if (this.data.busy) return;
    const record = this.repo.read().records.find(r => r.id === e.currentTarget.dataset.id && r.petId === this.data.pet.id);
    if (record) this.present({ sheet: 'detail', detail: recordView(record), mediaError: '', error: '', playing: false });
  },
  editRecord() {
    this.run(async () => {
      const record = this.repo.read().records.find(r => r.id === this.data.detail.id);
      this.pauseVideos(); await this.openEditor('record', record);
    });
  },
  editReminder(e) { this.run(() => this.openEditor('reminder', this.repo.read().reminders.find(r => r.id === e.currentTarget.dataset.id))); },
  toggleReminder(e) { this.run(() => this.repo.toggleReminder(e.currentTarget.dataset.id, this.data.pet.id)); },
  deletePet() {
    this.run(async () => {
      const id = this._editor.values.id, state = this.repo.read(), pet = state.pets.find(p => p.id === id);
      const records = state.records.filter(r => r.petId === id), media = records.reduce((sum, r) => sum + r.media.length, 0);
      const reminders = state.reminders.filter(r => r.petId === id).length;
      const response = await call(wx, 'showModal', { title: '删除「' + pet.name + '」？', content: records.length + ' 条记录、' + media + ' 个照片／视频和 ' + reminders + ' 个提醒会一并移除，无法撤销。', confirmText: '确认删除', confirmColor: '#9c332d', cancelText: '保留宠物' });
      if (!response.confirm) return;
      clearTimeout(this._draftTimer);
      const paths = this.repo.paths(); this.repo.deletePet(id);
      this._editor = null; this.setData({ sheet: '', form: {} });
      await this.app.media.releaseUnreferenced(paths); this.success('已移除');
    });
  },
  deleteRecord() {
    this.run(async () => {
      const record = this.data.detail;
      const response = await call(wx, 'showModal', { title: '删除这条记录？', content: '关联的照片和视频也会移除，无法撤销。', confirmText: '删除', confirmColor: '#9c332d' });
      if (!response.confirm) return;
      const paths = this.repo.paths(); this.repo.deleteRecord(record.id, record.petId);
      this.pauseVideos(); this.setData({ sheet: '', detail: null }); await this.app.media.releaseUnreferenced(paths); this.success('已删除');
    });
  },
  deleteReminder() {
    this.run(async () => {
      const item = this._editor.values;
      const response = await call(wx, 'showModal', { title: '删除这个提醒？', confirmText: '删除', confirmColor: '#9c332d' });
      if (!response.confirm) return;
      clearTimeout(this._draftTimer); this.repo.deleteReminder(item.id, item.petId);
      this._editor = null; this.setData({ sheet: '', form: {} });
    });
  },
  previewImage(e) {
    const path = e.currentTarget.dataset.path;
    const urls = this.data.detail.media.filter(m => m.type === 'image').map(m => m.path);
    this.run(async () => { if (!await this.app.files.exists(path)) throw new Error('这张照片的本地文件已丢失'); await call(wx, 'previewImage', { current: path, urls }); });
  },
  imageError() { this.setData({ mediaError: '这个附件暂时无法显示，请检查本地文件' }); },
  videoError() { this.setData({ mediaError: '这段视频暂时无法播放，请检查文件或更换格式' }); },
  pauseVideos() { if (this.data.detail) this.data.detail.media.forEach((m, i) => { if (m.type === 'video' && wx.createVideoContext) wx.createVideoContext('video-' + i, this).pause(); }); },
  pickDay(e) { this.setData({ day: e.currentTarget.dataset.day }); this.refresh(); },
  changeDate(e) { this.setData({ day: e.detail.value }); this.refresh(); },
  changeWeek(e) { this.setData({ day: moveDay(this.data.day, Number(e.currentTarget.dataset.shift) * 7) }); this.refresh(); },
  goToday() { this.setData({ day: M.dateKey() }); this.refresh(); },
  expandCalendar() { this.setData({ expanded: !this.data.expanded }); this.refresh(); },
  agreePrivacy() { if (this._privacyResolve) this._privacyResolve({ buttonId: 'privacy-agree', event: 'agree' }); this._privacyResolve = null; this.setData({ privacyRequested: false }); },
  declinePrivacy() { if (this._privacyResolve) this._privacyResolve({ event: 'disagree' }); this._privacyResolve = null; this.setData({ privacyRequested: false }); },
  openPrivacy() { call(wx, 'openPrivacyContract').catch(() => wx.showToast({ title: '请先在微信后台配置隐私保护指引', icon: 'none' })); }
});
