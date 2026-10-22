from pathlib import Path
import os,json,time
from playwright.sync_api import sync_playwright,expect
r=Path('/data/zuoweimen/gogo');out=r/'design/previews/gogo-life'
os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(r/'.tools/browsers')
os.environ['LD_LIBRARY_PATH']=str(r/'.tools/browser-libs/usr/lib/x86_64-linux-gnu')
os.environ['TMPDIR']=str(r/'.tools/tmp')
with sync_playwright() as p:
 b=p.chromium.launch(args=['--no-sandbox'])
 page=b.new_page(viewport={'width':422,'height':920},has_touch=True,is_mobile=True)
 page.goto((r/'.tools/gogo-life-check.html').as_uri());f=page.frames[1]
 f.locator('[data-tab="prints"]').click();page.wait_for_timeout(300)
 cdp=page.context.new_cdp_session(page)
 box=f.locator('.diary-scroll').bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']*.78
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
 samples=[]
 for step in range(1,13):
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x,'y':y-step*24}]});page.wait_for_timeout(30)
  samples.append(f.locator('.diary-scroll').evaluate('''e=>({top:e.scrollTop,
   cards:[...e.querySelectorAll('.diary-paper')].map(c=>({
    y:c.getBoundingClientRect().y,tilt:new DOMMatrixReadOnly(getComputedStyle(c).transform).m23,
    blur:parseFloat(getComputedStyle(c.querySelector('.diary-content')).filter.match(/blur\\(([^)]+)px\\)/)[1])
   }))
  })'''))
  if step==7:f.locator('.app-shell').screenshot(path=str(out/'diary-frost-midgesture.png'))
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(1100)
 top=f.locator('.diary-scroll').evaluate('(e)=>({top:e.scrollTop,current:e.dataset.current})')
 assert top['top']>0,top
 # Blur follows the held gesture: outgoing content becomes blurred while
 # incoming content becomes clear. Papers move up without tilting.
 assert len({round(s['cards'][0]['blur'],2) for s in samples})>3,samples
 assert samples[-1]['cards'][0]['blur']>samples[0]['cards'][0]['blur'],samples
 assert samples[-1]['cards'][1]['blur']<samples[0]['cards'][1]['blur'],samples
 assert all(a['cards'][0]['y']>=b['cards'][0]['y'] for a,b in zip(samples,samples[1:])),samples
 assert all(c['tilt']==0 for s in samples for c in s['cards']),samples
 assert all(a['top']<=b['top'] for a,b in zip(samples,samples[1:])),samples
 expect(f.locator('.overlay-host [role="dialog"]')).to_have_count(0)
 active=f.locator('.diary-card');active.tap();expect(f.locator('.overlay-host [role="dialog"]')).to_have_count(1)
 f.locator('[data-action="close"]').tap()
 expect(f.locator('.diary-scroll')).to_have_attribute('data-current',top['current'])
 print('Chromium native touch scroll and tap verified',top)
 (out/'diary-frost-touch-checks.json').write_text(json.dumps({'chromiumTouchEmulation':True,'gestureScrolls':True,'blurTracksHeldGesture':True,'noRotation':True,'samples':samples,'gestureDoesNotOpenDetail':True,'tapOpensDetail':True,'returnsToPosition':True,'iOSDeviceVerified':False,'result':top},indent=2)+'\n')
 b.close()
