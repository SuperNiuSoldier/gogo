from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright,expect
r=Path('/data/zuoweimen/gogo');out=r/'design/previews/gogo-life'
os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(r/'.tools/browsers')
os.environ['LD_LIBRARY_PATH']=str(r/'.tools/browser-libs/usr/lib/x86_64-linux-gnu')
os.environ['TMPDIR']=str(r/'.tools/tmp')
with sync_playwright() as p:
 b=p.chromium.launch(args=['--no-sandbox'])
 page=b.new_page(viewport={'width':422,'height':920});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('window.__reviewControls={};window.Tweak=class{constructor(o){this.o=o}addSelect(s,k){window.__reviewControls[k]=v=>{s[k]=v;this.o.onChange()}}}')
 page.goto((r/'.tools/gogo-life-check.html').as_uri());f=page.frames[1]
 f.locator('[data-tab="prints"]').click();page.wait_for_timeout(500)
 s=f.locator('.diary-scroll');expect(f.locator('.diary-paper')).to_have_count(3);expect(f.locator('.diary-cta button')).to_have_count(1)
 f.locator('.app-shell').screenshot(path=str(out/'diary-frost-start.png'))
 print('initial',s.evaluate('(e)=>({h:e.clientHeight,scroll:e.scrollHeight,top:e.scrollTop,current:e.dataset.current})'))
 s.hover();page.mouse.wheel(0,340);page.wait_for_timeout(800)
 print('after wheel',s.evaluate('(e)=>({top:e.scrollTop,current:e.dataset.current})'))
 expect(s).to_have_attribute('data-current','1')
 # All cards stay front-facing. Only the centered paper is clear; real
 # neighbouring records remain visible above and below through the frost.
 sliding=f.locator('.diary-stage').evaluate('''stage=>({
  perspective:getComputedStyle(stage).perspective,
  cards:[...stage.querySelectorAll('.diary-paper')].map(card=>{
   const box=card.getBoundingClientRect(),matrix=new DOMMatrixReadOnly(getComputedStyle(card).transform);
   const blur=parseFloat(getComputedStyle(card.querySelector('.diary-content')).filter.match(/blur\\(([^)]+)px\\)/)[1]);
   return {centerY:(box.top+box.bottom)/2,width:box.width,tilt:matrix.m23,depth:matrix.m43,blur,visible:getComputedStyle(card).visibility};
  })
 })''')
 before,current,after=sliding['cards']
 assert sliding['perspective']=='none',sliding
 assert before['centerY']<current['centerY']<after['centerY'],sliding
 assert all(c['tilt']==0 and c['depth']==0 and c['width']==current['width'] for c in sliding['cards']),sliding
 assert before['blur']>=4 and after['blur']>=4 and current['blur']==0,sliding
 f.locator('.app-shell').screenshot(path=str(out/'diary-frost-middle.png'))
 s.hover();page.mouse.wheel(0,-340);page.wait_for_timeout(800);expect(s).to_have_attribute('data-current','0')
 assert f.locator('.diary-card .diary-content').evaluate('(e)=>getComputedStyle(e).filter')=='blur(0px)'
 s.hover();page.mouse.wheel(0,340);page.wait_for_timeout(800);expect(s).to_have_attribute('data-current','1')
 s.hover();page.mouse.wheel(0,340);page.wait_for_timeout(800);expect(s).to_have_attribute('data-current','2')
 f.locator('.diary-card').click();expect(f.locator('.detail-meta')).to_contain_text('2026.')
 f.locator('[data-action="close"]').click();expect(s).to_have_attribute('data-current','2')
 f.locator('.diary-card').focus();page.keyboard.press('Home');page.wait_for_timeout(700);expect(s).to_have_attribute('data-current','0')
 page.keyboard.press('ArrowDown');page.wait_for_timeout(250);expect(s).to_have_attribute('data-current','1')
 page.keyboard.press('ArrowDown');page.wait_for_timeout(250);expect(s).to_have_attribute('data-current','2')
 page.keyboard.press('ArrowUp');page.wait_for_timeout(250);expect(s).to_have_attribute('data-current','1')
 assert f.locator('.diary-card').evaluate('(e)=>e===document.activeElement')
 f.locator('[data-action="theme"]').click();page.wait_for_timeout(300);expect(s).to_have_attribute('data-current','1')
 f.locator('.app-shell').screenshot(path=str(out/'diary-frost-dark.png'))
 page.emulate_media(reduced_motion='reduce');f.locator('.diary-card').focus();page.keyboard.press('End');page.wait_for_timeout(200);expect(s).to_have_attribute('data-current','2')
 assert f.locator('.diary-paper').evaluate_all('(cards)=>cards.filter(c=>getComputedStyle(c).visibility==="visible").length')==1
 assert f.locator('.diary-card').evaluate('(e)=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(e).transform).m23)<.001')
 assert f.locator('.diary-card .diary-content').evaluate('(e)=>getComputedStyle(e).filter')=='blur(0px)'
 page.emulate_media(reduced_motion='no-preference')
 f.locator('[data-pet="gelin"]').click();expect(s).to_have_attribute('data-current','0')
 f.locator('[data-tab="album"]').click();f.locator('[data-tab="prints"]').click();expect(s).to_have_attribute('data-current','0')
 for width in [320,375,390]:
  page.set_viewport_size({'width':width+32,'height':920})
  f.evaluate('window.__reviewControls.textSize("large")');page.wait_for_timeout(200)
  bounds=f.locator('.diary-card').evaluate('(e)=>{let a=e.getBoundingClientRect(),b=e.closest(".diary-scroll").getBoundingClientRect();return {fits:a.top>=b.top-1&&a.bottom<=b.bottom+1,height:a.height,area:b.height}}')
  assert bounds['fits'],(width,bounds)
  f.locator('.app-shell').screenshot(path=str(out/f'diary-frost-large-{width}.png'))
 f.evaluate('window.__reviewControls.content("few")');page.wait_for_timeout(200);expect(f.locator('.diary-paper')).to_have_count(1)
 assert s.evaluate('(e)=>e.scrollHeight<=e.clientHeight+1')
 f.evaluate('window.__reviewControls.content("empty")');expect(f.locator('.diary-paper')).to_have_count(0)
 assert not errors,errors
 print('wheel, focus, keyboard, theme, pet, single/empty and sizes passed')
 (out/'diary-frost-scroll-checks.json').write_text(json.dumps({'desktopWheel':True,'flatSlidingFrost':sliding,'reverseRestoresClarity':True,'keyboard':True,'detailReturn':True,'themeRetainsPosition':True,'petResetsPosition':True,'reducedMotion':True,'largeTextWidths':[320,375,390],'singleEmpty':True,'errors':errors},indent=2)+'\n')
 b.close()
