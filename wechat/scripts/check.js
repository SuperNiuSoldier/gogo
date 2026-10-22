'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), mini = path.join(root, 'miniprogram');
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
const all = files(mini);
all.filter(file => file.endsWith('.js')).forEach(file => new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file }));
all.filter(file => file.endsWith('.json')).forEach(file => JSON.parse(fs.readFileSync(file, 'utf8')));
const project = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json')));
assert.equal(project.miniprogramRoot, 'miniprogram/');
assert.match(project.appid, /^(?:touristappid|wx[0-9a-f]{16})$/, 'Expected a mini program AppID, not a secret');
const config = JSON.parse(fs.readFileSync(path.join(mini, 'app.json')));
config.pages.forEach(page => ['js', 'json', 'wxml', 'wxss'].forEach(ext => assert.ok(fs.existsSync(path.join(mini, page + '.' + ext)))));
let controller;
vm.runInNewContext(fs.readFileSync(path.join(mini, 'pages/home/index.js'), 'utf8'), {
  require: require('node:module').createRequire(path.join(mini, 'pages/home/index.js')), Page: value => { controller = value; }
});
const template = fs.readFileSync(path.join(mini, 'pages/home/index.wxml'), 'utf8');
const buttonTags = [...template.matchAll(/<button\b(?:[^>"']|"[^"]*"|'[^']*')*>/g)];
buttonTags.forEach(([tag]) => assert.match(tag, /class="[^"]*\bgogo-button\b/, 'Native buttons must opt into the scoped visual reset'));
// Validate raw bindings before any HTML parser can decode entities and hide WXML errors.
let expressionCount = 0;
for (const file of all.filter(file => file.endsWith('.wxml'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/{{([\s\S]*?)}}/g)) {
    const line = source.slice(0, match.index).split('\n').length;
    new vm.Script('(' + match[1] + ')', { filename: file + ':' + line });
    expressionCount += 1;
  }
}
for (const match of template.matchAll(/wx:(?:if|elif|for)="([^"]+)"/g)) assert.match(match[1], /^{{[\s\S]*}}$/, 'WXML expressions must be bound, not truthy literal strings');
const handlers = [...template.matchAll(/(?:bind|catch)[a-zA-Z]+="([a-zA-Z]+)"/g)].map(match => match[1]);
handlers.forEach(name => assert.equal(typeof controller[name], 'function', 'Missing handler ' + name));
assert.ok(!template.includes('<web-view'), 'Use native mini program components');
for (const name of ['image', 'footprints', 'bell', 'camera', 'paw', 'plus', 'scale', 'check', 'circle', 'food', 'water', 'video', 'notebook', 'pencil', 'moon', 'sun', 'ellipsis', 'arrow-up-right', 'chevron-left', 'chevron-right', 'chevron-down', 'play', 'pause']) {
  for (const theme of ['light', 'dark']) assert.ok(fs.existsSync(path.join(mini, 'assets/icons', theme, name + '.svg')), 'Missing icon ' + name);
}
const { KINDS } = require('../miniprogram/core/model');
for (const kind of KINDS) {
  for (const theme of ['light', 'dark']) assert.ok(fs.existsSync(path.join(mini, 'assets/icons', theme, kind.icon + '.svg')), 'Missing record-kind icon ' + kind.id);
}
const { CHARACTER_ICONS } = require('../miniprogram/features/appearance');
for (const name of CHARACTER_ICONS.concat(['logo', 'sleep', 'background'])) {
  assert.ok(fs.existsSync(path.join(mini, 'assets/rouqiu/photo', name + '.webp')), 'Missing generated Rouqiu asset ' + name);
}
assert.ok(fs.existsSync(path.join(mini, 'assets/Xiaolai-OFL.txt')));
assert.ok(fs.existsSync(path.join(mini, 'assets/Doodle-LICENSE.txt')));
const bytes = all.reduce((sum, file) => sum + fs.statSync(file).size, 0);
assert.ok(bytes < 2 * 1024 * 1024, 'Main package should remain below 2 MB');
console.log(JSON.stringify({ jsFiles: all.filter(f => f.endsWith('.js')).length, handlers: new Set(handlers).size, wxmlExpressions: expressionCount, sourcePackageBytes: bytes, checks: 'passed', wechatCompiler: 'not run by this static check; verify separately with WCC and the target Developer Tools' }, null, 2));
