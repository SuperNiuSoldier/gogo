"""Native source layout review through a browser surrogate, never a WeChat runtime test."""
from pathlib import Path
from html.parser import HTMLParser
import json
import os
import subprocess
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.tools/wechat-review'
OUT = ROOT / 'design/previews/wechat'
WORK.mkdir(exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
os.environ.update(PLAYWRIGHT_BROWSERS_PATH=str(ROOT / '.tools/browsers'), LD_LIBRARY_PATH=str(ROOT / '.tools/browser-libs/usr/lib/x86_64-linux-gnu'), TMPDIR=str(ROOT / '.tools/tmp'))
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {'children': []}
        self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'children': []}
        self.stack[-1]['children'].append(node)
        self.stack.append(node)
    def handle_startendtag(self, tag, attrs):
        self.stack[-1]['children'].append({'tag': tag, 'attrs': dict(attrs), 'children': []})
    def handle_endtag(self, tag):
        assert len(self.stack) > 1 and self.stack[-1]['tag'] == tag, (tag, self.stack[-1].get('tag'))
        self.stack.pop()
    def handle_data(self, data):
        if data.strip():
            self.stack[-1]['children'].append({'text': data})

parser = Parser()
parser.feed((ROOT / 'wechat/miniprogram/pages/home/index.wxml').read_text())
assert len(parser.stack) == 1
(WORK / 'template.json').write_text(json.dumps(parser.root['children'], ensure_ascii=False))
node = ROOT / '.tools/ui-preview/lib/python3.10/site-packages/playwright/driver/node'
subprocess.run([str(node), str(ROOT / 'wechat/scripts/review-render.js')], check=True, cwd=ROOT)
screens = json.loads((WORK / 'screens.json').read_text())
checks, errors = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 390, 'height': 740})
    page.on('pageerror', lambda e: errors.append(str(e)))
    for width in [320, 375, 430]:
        page.set_viewport_size({'width': width, 'height': 740})
        for screen in screens:
            page.goto((WORK / (screen + '.html')).as_uri())
            page.evaluate('document.fonts.ready')
            page.evaluate('''() => { const body=document.querySelector('.sheet-body'), scroll=document.querySelector('.sheet-scroll'); if(body&&scroll)scroll.style.height=Math.min(body.getBoundingClientRect().height+2,innerHeight*.65)+'px'; }''')
            page.wait_for_timeout(300)
            result = page.evaluate('''() => {
              const app=document.querySelector('.app');
              const sheet=document.querySelector('.sheet');
              const rect=sheet?.getBoundingClientRect();
              const nav=document.querySelector('.bottom-nav');
              const missing=[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src.slice(0,80));
              const touches=[...document.querySelectorAll('button')].filter(b=>{
                if(b.disabled||!b.getClientRects().length)return false;
                const r=b.getBoundingClientRect();
                return r.width<43.5||r.height<43.5;
              }).map(b=>b.className);
              return {overflow:app.scrollWidth>app.clientWidth+1,sheetFits:!rect||(rect.left>=-1&&rect.right<=innerWidth+1&&rect.top>=-1),navFits:!nav||nav.getBoundingClientRect().bottom<=innerHeight+1,missing,touches};
            }''')
            assert not result['overflow'], (width, screen, result)
            assert result['sheetFits'] and result['navFits'], (width, screen, result)
            assert not result['missing'], (width, screen, result)
            assert not result['touches'], (width, screen, result)
            checks.append({'width': width, 'screen': screen, **result})
            if width == 375:
                page.screenshot(path=str(OUT / (screen + '.png')))
            if screen.split('-')[0] in ['album', 'reminders', 'month', 'record', 'pet']:
                page.evaluate('''() => {
                  const app=document.querySelector('.app'); app.style.setProperty('--text-scale','1.25'); app.classList.add('large-text');
                  const body=document.querySelector('.sheet-body'), scroll=document.querySelector('.sheet-scroll');
                  if(body&&scroll)scroll.style.height=Math.min(body.getBoundingClientRect().height+2,innerHeight*.65)+'px';
                }''')
                large=page.evaluate('''() => {
                  const app=document.querySelector('.app'), nav=document.querySelector('.bottom-nav'), sheet=document.querySelector('.sheet');
                  return {overflow:app.scrollWidth>app.clientWidth+1,navFits:!nav||nav.getBoundingClientRect().bottom<=innerHeight+1,sheetFits:!sheet||sheet.getBoundingClientRect().top>=-1};
                }''')
                assert not large['overflow'] and large['navFits'] and large['sheetFits'], (width,screen,'125%',large)
                checks.append({'width':width,'screen':screen,'textScale':1.25,**large,'touches':[]})
    browser.close()
report = {'kind': 'browser layout surrogate from WXML/WXSS; not a WeChat runtime', 'checks': checks, 'browserErrors': errors}
(OUT / 'layout-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps({'layouts': len(checks), 'errors': errors, 'smallTargets': sorted(set(t for c in checks for t in c['touches']))}, ensure_ascii=False))
