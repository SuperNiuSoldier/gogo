// Browser layout surrogate only: renders the actual WXML/WXSS with synthetic data.
// This is not a mini program emulator and cannot validate WeChat APIs or components.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..'), mini = path.join(root, 'wechat/miniprogram'), output = path.join(root, '.tools/wechat-review');
const { createRepository } = require('../miniprogram/core/repository');
const { viewState, recordView } = require('../miniprogram/features/presentation');
const { appearance } = require('../miniprogram/features/appearance');
const { dateKey, timeKey } = require('../miniprogram/core/model');
const font = require('../miniprogram/assets/font');
const ast = JSON.parse(fs.readFileSync(path.join(output, 'template.json')));
let definition;
vm.runInNewContext(fs.readFileSync(path.join(mini, 'pages/home/index.js'), 'utf8'), { Page(v) { definition = v; }, require: require('node:module').createRequire(path.join(mini, 'pages/home/index.js')) });
const repo = createRepository({ get: () => undefined, set() {} });
const pet = repo.savePet({ name: '肉球' }); repo.savePet({ name: '格林' }); repo.preferences({ petId: pet });
const today = dateKey();
const fakeMedia = [{ id: 'photo-test', type: 'image', path: 'fixture:rouqiu', size: 1024 }];
const recId = repo.saveRecord({ petId: pet, kind: 'diary', date: today, time: '15:32', text: '在草地上坐了好久。\n风一吹，毛都蓬起来了。', media: fakeMedia });
repo.saveRecord({ petId: pet, kind: 'diary', date: today, time: '10:06', text: '散步回来，认真等着擦脚。', media: fakeMedia });
repo.saveRecord({ petId: pet, kind: 'food', date: today, time: '08:00', text: '', media: [] });
repo.saveRecord({ petId: pet, kind: 'weight', date: today, time: '07:30', weight: 24.6, text: '乖乖站好了', media: fakeMedia });
for (const [title, time] of [['洗澡', '18:30'], ['剪指甲', '20:00'], ['晨间散步', '07:30']]) repo.saveReminder({ petId: pet, title, date: today, time, done: time === '07:30' });
function evalExpr(expression, data) { return Function('s', 'with(s){return (' + expression + ')}')(data); }
function value(raw, data) {
  if (raw === null) return true;
  const exact = raw.match(/^{{([^{}]*)}}$/);
  if (exact) return evalExpr(exact[1], data);
  return raw.replace(/{{([\s\S]*?)}}/g, (_, expression) => { const v = evalExpr(expression, data); return v == null ? '' : v; });
}
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
function children(nodes, data) {
  let branch = false;
  return nodes.map(node => {
    if (node.text !== undefined) return esc(value(node.text, data));
    const attrs = node.attrs;
    if ('wx:if' in attrs) { branch = !!value(attrs['wx:if'], data); if (!branch) return ''; }
    else if ('wx:elif' in attrs) { if (branch) return ''; branch = !!value(attrs['wx:elif'], data); if (!branch) return ''; }
    else if ('wx:else' in attrs) { if (branch) return ''; branch = true; }
    else branch = false;
    if ('wx:for' in attrs) {
      return (value(attrs['wx:for'], data) || []).map((item, index) => render(node, Object.assign({}, data, { [attrs['wx:for-item'] || 'item']: item, [attrs['wx:for-index'] || 'index']: index }))).join('');
    }
    return render(node, data);
  }).join('');
}
function render(node, data) {
  if (node.tag === 'block') return children(node.children, data);
  const tags = { view:'div', text:'span', 'scroll-view':'wx-scroll', swiper:'wx-swiper', 'swiper-item':'wx-slide', image:'img', picker:'div' };
  const tag = tags[node.tag] || node.tag;
  let attributes = '', fixture = false;
  for (const [key, raw] of Object.entries(node.attrs)) {
    if (key.startsWith('wx:') || key.startsWith('bind') || key.startsWith('catch')) continue;
    let v = value(raw, data);
    if (key === 'src' && String(v).startsWith('/assets/')) {
      const bytes = fs.readFileSync(path.join(mini, v));
      const mime = { '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg' }[path.extname(v)];
      if (!mime) throw new Error('Unknown asset type: ' + v);
      v = 'data:' + mime + ';base64,' + bytes.toString('base64');
    }
    if (key === 'src' && String(v).startsWith('fixture:')) { fixture = true; continue; }
    if (key === 'disabled') { if (v) attributes += ' disabled'; continue; }
    if (key === 'value' && node.tag === 'textarea') continue;
    if (v === false || v === undefined || v === null) continue;
    attributes += ' ' + key + '="' + esc(v === true ? '' : v) + '"';
  }
  if (node.tag === 'swiper-item') attributes += ' style="transform:translateY(' + (data.index - data.albumIndex) * 100 + '%)"';
  if (fixture) return '<span' + attributes + ' data-fixture="true"></span>';
  if (tag === 'img' || tag === 'input') return '<' + tag + attributes + '>';
  const content = node.tag === 'textarea' ? esc(value(node.attrs.value || '', data)) : children(node.children, data);
  return '<' + tag + attributes + '>' + content + '</' + tag + '>';
}
const nativeBaseline = fs.readFileSync(path.join(__dirname, 'browser-component-baseline.css'), 'utf8');
const v2Conflict = fs.readFileSync(path.join(__dirname, 'browser-v2-conflict.css'), 'utf8');
const appConfig = JSON.parse(fs.readFileSync(path.join(mini, 'app.json')));
const css = nativeBaseline + fs.readFileSync(path.join(mini, 'app.wxss'), 'utf8') + fs.readFileSync(path.join(mini, 'pages/home/index.wxss'), 'utf8');
// Map native tag selectors as well as markup; do not quietly drop their styles.
function browserSelectors(source) {
  const tags = { page:'body', view:'div', text:'span', image:'img', 'scroll-view':'wx-scroll', swiper:'wx-swiper', 'swiper-item':'wx-slide' };
  return source.replace(/(^|})([^{}]+)\{/g, (_, lead, selectors) => lead + selectors.replace(/(^|[\s>+~,])(page|view|text|image|scroll-view|swiper|swiper-item)(?=[\s.#:[>+~,]|$)/g, (match, prefix, tag) => prefix + tags[tag]) + '{');
}
const sheetImage = fs.readFileSync(path.join(root, 'design/assets/album-samples/dog-life-contact-sheet-v1.webp')).toString('base64');
const fixes = `html,body{margin:0;height:100%;overflow:hidden}*{box-sizing:border-box}button{cursor:pointer}wx-scroll{display:block;overflow:auto}wx-swiper{display:block;position:relative;overflow:hidden}wx-slide{display:block;position:absolute;inset:24px 0 40px}.field textarea{height:96px}.detail-media img{height:240px;object-fit:cover}.cover[data-fixture]{display:block}[data-fixture]{background-image:url(data:image/webp;base64,${sheetImage});background-size:300% 400%;background-position:0 0;width:100%;height:100%;display:block}.profile-avatar[data-fixture]{width:72px;height:72px}.avatar[data-fixture]{width:30px;height:30px}@font-face{font-family:GoDogHand;src:url('${font.source}')} .app{--text-scale:1}`;
const base = Object.assign({}, definition.data, { loading: false, safeBottom: 20 }, viewState(repo.read(), today, 'diary', false), { skin:'classic' });
base.albumTotal = base.album.length; base.recordTotal = base.records.length;
base.pets = base.pets.map(p => Object.assign({}, p, { avatar: p.id === pet ? 'fixture:rouqiu' : '' }));
const screens = [];
for (const theme of ['light', 'dark']) {
  for (const tab of ['album', 'footprints', 'reminders']) screens.push({ name: tab + '-' + theme, data: Object.assign({}, base, { tab, theme }) });
  screens.push({ name: 'month-' + theme, data: Object.assign({}, base, viewState(repo.read(), '2026-03-01', 'diary', true), { theme, tab:'reminders', expanded:true }) });
  for (const sheet of ['pet', 'record', 'reminder', 'quick', 'detail', 'storage']) {
    const form = sheet === 'pet' ? { id: pet, name:'肉球', avatar:'fixture:rouqiu', birthday:'',arrival:'',note:'' } : sheet === 'reminder' ? { petId:pet,title:'洗澡',date:today,time:'18:30' } : { kind:'note',text:'今天一起走了很远。',media:fakeMedia,date:today,time:timeKey(),weight:'' };
    screens.push({ name: sheet + '-' + theme, data: Object.assign({}, base, { tab:'reminders',theme,sheet,form,editorPetName:'肉球',detail:recordView(repo.read().records.find(r => r.id === recId)) }) });
  }
  screens.push({ name:'empty-'+theme,data:Object.assign({},base,{theme,pet:null,pets:[],draft:null}) });
  const singlePet = Object.assign({}, base.pet, {name:'格林',initial:'格'});
  screens.push({ name:'album-empty-'+theme,data:Object.assign({},base,{theme,tab:'album',pet:singlePet,pets:[singlePet],album:[],albumTotal:0,records:[],recordTotal:0}) });
  const manyPets = Array.from({length:8}, (_, i) => ({...base.pets[0],id:'fixture-pet-'+i,name:'第'+(i+1)+'只名字很长的小狗',avatar:''}));
  screens.push({ name:'many-pets-'+theme,data:Object.assign({},base,{theme,pets:manyPets,pet:manyPets[0],album:[],albumTotal:0,tab:'album'}) });
}
for (const theme of ['light', 'dark']) {
  for (const tab of ['album', 'footprints', 'reminders']) screens.push({ name:'rouqiu-'+tab+'-'+theme, data:{...base, skin:'rouqiu', theme, tab} });
  for (const sheet of ['quick', 'appearance']) screens.push({ name:'rouqiu-'+sheet+'-'+theme, data:{...base, skin:'rouqiu', theme, tab:'footprints', sheet} });
  screens.push({ name:'rouqiu-empty-'+theme, data:{...base, skin:'rouqiu', theme, tab:'album', album:[], albumTotal:0} });
}
for (const screen of screens) {
  Object.assign(screen.data, appearance({ theme:screen.data.theme, skin:screen.data.skin }));
  // Consistent synthetic avatar for the themed review only; runtime pet data is untouched.
  if (screen.data.skin === 'rouqiu') screen.data.pets = screen.data.pets.map(p => ({...p, avatar:p.id === pet ? '/assets/rouqiu/photo/logo.webp' : p.avatar}));
  const html = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>' + browserSelectors(css + (appConfig.style === 'v2' ? v2Conflict : '')) + fixes + '</style><body>' + children(ast, screen.data) + '</body></html>';
  fs.writeFileSync(path.join(output, screen.name + '.html'), html);
}
fs.writeFileSync(path.join(output, 'screens.json'), JSON.stringify(screens.map(s => s.name)));
console.log('Rendered ' + screens.length + ' WXML/WXSS browser layout surrogates; no WeChat runtime claimed.');
