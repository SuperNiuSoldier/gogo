'use strict';
const { createRepository } = require('./core/repository');
const { createFiles } = require('./services/files');
const { createMedia } = require('./services/media');
const font = require('./assets/font');

App({
  onLaunch() {
    try {
      this.repository = createRepository({ get: key => wx.getStorageSync(key), set: (key, value) => wx.setStorageSync(key, value) });
      this.files = createFiles(wx.getFileSystemManager(), wx.env.USER_DATA_PATH);
      this.media = createMedia(wx, this.files, this.repository);
      // Finish orphan cleanup before exposing any controls that can import files.
      this.ready = this.files.sweep(this.repository.paths()).catch(() => { this.cleanupPending = true; });
    } catch (error) { this.startupError = error; this.ready = Promise.resolve(); }
    if (wx.loadFontFace) wx.loadFontFace({ global: true, family: 'GoDogHand', source: 'url("' + font.source + '")', fail() { /* System font remains readable. Device font rendering needs verification. */ } });
  }
});
