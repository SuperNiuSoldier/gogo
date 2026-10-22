"""Check actual control bounds with native-default/conflict CSS fixtures.

Run check_wechat_layout.py first. This remains a browser regression check,
not the WeChat SDK. Optional --before reproduces the reported v2 conflict.
"""
from pathlib import Path
import argparse
import json
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.tools/wechat-review'
OUT = ROOT / 'design/previews/wechat'
os.environ.update(PLAYWRIGHT_BROWSERS_PATH=str(ROOT / '.tools/browsers'),
                  LD_LIBRARY_PATH=str(ROOT / '.tools/browser-libs/usr/lib/x86_64-linux-gnu'),
                  TMPDIR=str(ROOT / '.tools/tmp'))
parser = argparse.ArgumentParser()
parser.add_argument('--before', type=Path, help='Optional previous miniprogram source snapshot')
args = parser.parse_args()
conflict = (ROOT / 'wechat/scripts/browser-v2-conflict.css').read_text()
baseline = (ROOT / 'wechat/scripts/browser-component-baseline.css').read_text()
source = (WORK / 'album-empty-light.html').read_text()
if args.before:
    start = source.index('<style>') + len('<style>')
    end = source.index('html,body{', start)
    previous_css = baseline + (args.before / 'app.wxss').read_text() + (args.before / 'pages/home/index.wxss').read_text() + conflict
    (WORK / 'controls-before.html').write_text(source[:start] + previous_css + source[end:])

MEASURE = r'''() => {
  const issues = [], sizes = {};
  const rect = el => el.getBoundingClientRect();
  const inside = (el,parent) => {
    const r=rect(el), p=rect(parent);
    return r.left>=p.left-1 && r.right<=p.right+1 && r.top>=p.top-1 && r.bottom<=p.bottom+1;
  };
  const title=document.querySelector('.page-title');
  if(title){
    const r=rect(title), style=getComputedStyle(title);
    sizes.title={width:r.width,height:r.height};
    if(r.height>parseFloat(style.lineHeight)+2)issues.push('heading-wrap');
    if(!inside(title,title.parentElement))issues.push('heading-outside');
    const actions=document.querySelector('.heading-actions');
    if(actions && rect(actions).left<r.right+3)issues.push('heading-actions-overlap');
  }
  const rail=document.querySelector('.pet-rail');
  if(rail){
    sizes.petRail=rect(rail).width;
    if(rect(rail).width<120)issues.push('pet-rail-collapsed');
    const first=rail.querySelector('.pet-chip');
    if(first && !inside(first,rail))issues.push('first-pet-clipped');
  }
  document.querySelectorAll('.pet-bar > .icon-button,.heading-actions > .icon-button,.album-actions > .icon-button').forEach((el,i)=>{
    const r=rect(el); sizes['icon-'+i]={width:r.width,height:r.height};
    if(Math.abs(r.width-44)>1 || Math.abs(r.height-44)>1)issues.push('icon-size-'+i);
    if(!inside(el,el.parentElement))issues.push('icon-outside-'+i);
  });
  document.querySelectorAll('.segmented button').forEach((el,i)=>{
    const r=rect(el);
    if(Math.abs(r.width-54)>1 || r.height<44)issues.push('segment-size-'+i);
  });
  document.querySelectorAll('.primary').forEach((el,i)=>{
    const r=rect(el); sizes['primary-'+i]={width:r.width,height:r.height};
    if(r.width<135 || r.height<47 || el.scrollWidth>el.clientWidth+1)issues.push('primary-clipped-'+i);
    if(!inside(el,el.parentElement))issues.push('primary-outside-'+i);
    const icon=el.querySelector('.button-icon');
    if(icon && rect(icon).width<20)issues.push('primary-icon-shrunk-'+i);
  });
  const nav=document.querySelector('.bottom-nav');
  if(nav){
    const items=[...nav.querySelectorAll('.nav-item')], widths=items.map(el=>rect(el).width);
    if(Math.max(...widths)-Math.min(...widths)>1 || items.some(el=>!inside(el,nav)))issues.push('navigation-sizing');
  }
  const app=document.querySelector('.app');
  if(app.scrollWidth>app.clientWidth+1)issues.push('horizontal-overflow');
  return {issues,sizes};
}'''

checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':375,'height':740})
    if args.before:
        page.goto((WORK / 'controls-before.html').as_uri())
        page.evaluate('document.fonts.ready')
        before = page.evaluate(MEASURE)
        assert before['issues'], 'Negative control should reproduce the layout failure'
        page.screenshot(path=str(OUT / 'controls-before.png'))
        checks.append({'case':'previous-source-with-v2-fixture',**before})
    for width in [320,375,430]:
        page.set_viewport_size({'width':width,'height':740})
        for screen in ['album-empty-light','album-empty-dark','album-light','reminders-dark','many-pets-light']:
            for scale in [1,1.25,1.5]:
                page.goto((WORK / (screen+'.html')).as_uri())
                page.evaluate('document.fonts.ready')
                # Stress the fix even if a higher-specificity v2 rule is injected last.
                page.add_style_tag(content=conflict)
                page.evaluate('scale=>{const a=document.querySelector(".app");a.style.setProperty("--text-scale",scale);a.classList.toggle("large-text",scale>1.2)}',scale)
                result=page.evaluate(MEASURE)
                checks.append({'case':'fixed-source-with-v2-conflict','width':width,'screen':screen,'textScale':scale,**result})
                assert not result['issues'], checks[-1]
                if screen.startswith('many-pets'):
                    rail=page.locator('.pet-rail')
                    moved=rail.evaluate('(el)=>{el.scrollLeft=el.scrollWidth;return el.scrollLeft>0}')
                    assert moved, 'Long pet list must scroll without moving header controls'
                if width==375 and scale==1 and screen=='album-empty-light':
                    page.screenshot(path=str(OUT/'controls-after.png'))
    browser.close()
report={'kind':'browser component-default/conflict fixture; not WeChat runtime','checks':checks}
(OUT/'control-layout-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'positiveChecks':sum(x['case'].startswith('fixed') for x in checks),
                  'negativeControlDetected':bool(args.before)},ensure_ascii=False))
