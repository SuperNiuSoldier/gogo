"""Browser checks for the four-page visual prototype, not native iOS acceptance."""
from pathlib import Path
from datetime import date, timedelta
import os, json, base64, re
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'design/previews/gogo-life'
os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(ROOT/'.tools/browsers')
os.environ['LD_LIBRARY_PATH']=str(ROOT/'.tools/browser-libs/usr/lib/x86_64-linux-gnu')
os.environ['TMPDIR']=str(ROOT/'.tools/tmp')
results=[]
errors=[]

# The standalone renderer has no host Tweak panel. This adapter exercises the
# exact registered host control callbacks without changing prototype code.
TWEAK_ADAPTER='''window.__reviewControls = {};
window.Tweak = class {
 constructor(options){this.options=options;}
 addSelect(object,key,options){window.__reviewControls[key]=(value)=>{object[key]=value;this.options.onChange();};}
};'''

def passed(name, detail=''):
    results.append({'check':name,'passed':True,'detail':detail})

def click(action, **attrs):
    selector=f'[data-action="{action}"]'+''.join(f'[data-{k}="{v}"]' for k,v in attrs.items())
    frame.locator(selector).click()

def tab(name):
    frame.locator(f'.bottom-nav [data-tab="{name}"]').click()

def design(key, value):
    frame.evaluate('([k,v])=>window.__reviewControls[k](v)',[key,value])

def modal_close():
    frame.locator('.overlay-host [data-action="close"]').click()

def screenshot(name):
    expect(frame.locator('.toast')).to_be_hidden(timeout=7000)
    frame.locator('.app-shell').screenshot(path=str(OUT/(name+'.png')))

def layout():
    return frame.evaluate('''()=>{
      const root=document.getElementById('gogo-life'), shell=root.querySelector('.app-shell'), bounds=shell.getBoundingClientRect();
      const horizontal=[...root.querySelectorAll('.app-base button,.app-base input')].filter(e=>e.getClientRects().length&&!e.closest('.chart-records')).filter(e=>{const r=e.getBoundingClientRect();return r.left<bounds.left-1||r.right>bounds.right+1;}).map(e=>e.getAttribute('aria-label')||e.innerText);
      const targets=[...root.querySelectorAll('.app-base button')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).map(e=>({label:e.getAttribute('aria-label')||e.innerText,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));
      return {horizontal,targets,rootWidth:root.offsetWidth,docWidth:document.documentElement.scrollWidth,viewport:innerWidth};
    }''')

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':460,'height':920},device_scale_factor=1)
        page.add_init_script(TWEAK_ADAPTER)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto((ROOT/'.tools/gogo-life-check.html').as_uri())
        frame=page.frames[1]
        frame.locator('.photo-print').first.wait_for()
        page.wait_for_timeout(900)
        expect(frame.locator('.bottom-nav button')).to_have_count(5)
        expect(frame.locator('.bottom-nav [data-tab="album"]')).to_have_attribute('aria-current','page')
        expect(frame.locator('.photo-print')).to_have_count(6)
        expect(frame.locator('select')).to_have_count(0)
        assert frame.evaluate('document.fonts.check("16px GoDogLife")')
        assert frame.locator('h1').evaluate('(e)=>getComputedStyle(e).fontFamily').startswith('GoDogLife')
        passed('Five entries, default album, one pet selector, embedded Chinese font')

        click('theme')
        expect(frame.locator('#gogo-life')).to_have_attribute('data-theme','dark')
        expect(frame.locator('[data-pet="rouqiu"]')).to_have_attribute('aria-pressed','true')
        click('pet',pet='gelin')
        for name in ['album','prints','weight','reminders']:
            tab(name)
            expect(frame.locator('.page')).to_have_attribute('aria-label',re.compile('格林'))
            assert '肉球' not in frame.locator('.app-view').inner_text()
            screenshot('dark-'+name)
        click('theme')
        expect(frame.locator('[data-pet="gelin"]')).to_have_attribute('aria-pressed','true')
        click('pet',pet='rouqiu')
        for name in ['album','prints','weight','reminders']:
            tab(name)
            screenshot('light-'+name)
        passed('Independent themes and global pet context on all four pages; eight screenshots')

        tab('prints')
        click('quick')
        expect(frame.locator('.quick-action')).to_have_count(6)
        click('quick-save',kind='water')
        expect(frame.locator('.record-row h3',has_text='喝水')).to_have_count(1)
        click('undo')
        expect(frame.locator('.record-row h3',has_text='喝水')).to_have_count(0)
        passed('Daily quick recording and undo change the history')

        click('quick');click('write')
        draft='今天去公园，跑了很久。\n回家后乖乖擦脚。'
        frame.locator('textarea').fill(draft)
        modal_close()
        expect(frame.locator('#gogo-sheet-title')).to_have_text('保留这次编辑？')
        click('continue-edit')
        expect(frame.locator('textarea')).to_have_value(draft)
        assert frame.locator('.app-base').evaluate('(e)=>e.inert')
        click('pick-photo')
        frame.locator('[data-action="choose-photo"]').first.click()
        frame.locator('button[data-action="save-editor"]').click()
        expect(frame.locator('.diary-card')).to_contain_text('今天去公园')
        expect(frame.locator('.diary-card .photo')).to_have_count(1)
        frame.locator('.diary-card').click()
        click('edit-entry',id=frame.locator('[data-action="edit-entry"]').get_attribute('data-id'))
        frame.locator('textarea').fill(draft+'\n睡得很香。')
        frame.locator('button[data-action="save-editor"]').click()
        expect(frame.locator('.diary-card')).to_contain_text('睡得很香')
        tab('album');expect(frame.locator('.photo-print')).to_have_count(6)
        passed('Diary add/edit, shared photo reference, dirty-sheet protection and input retention')

        tab('weight');click('add-weight')
        frame.locator('input[name="value"]').fill('25.1')
        click('pick-photo');frame.locator('[data-action="choose-photo"]').nth(1).click()
        frame.locator('button[data-action="save-editor"]').click()
        expect(frame.locator('.weight-node')).to_have_count(5)
        expect(frame.locator('.weight-node').first).to_contain_text('25.1')
        click('weight-mode')
        expect(frame.locator('.weight-chart-summary')).to_contain_text('25.1')
        expect(frame.locator('.weight-chart .point')).to_have_count(5)
        screenshot('weight-chart')
        click('pet',pet='gelin')
        expect(frame.locator('.weight-chart .point')).to_have_count(4)
        expect(frame.locator('.weight-chart-summary')).to_contain_text('8.6')
        click('pet',pet='rouqiu')
        frame.locator('.chart-record').last.click()
        click('delete-weight',id=frame.locator('[data-action="delete-weight"]').get_attribute('data-id'))
        expect(frame.locator('.weight-chart .point')).to_have_count(4)
        click('undo');expect(frame.locator('.weight-chart .point')).to_have_count(5)
        passed('Weight add, chart derived from measurements, pet isolation, delete and restore')

        tab('reminders');click('add-reminder')
        frame.locator('input[name="title"]').fill('给肉球梳毛')
        frame.locator('input[name="time"]').fill('21:00')
        frame.locator('button[data-action="save-editor"]').click()
        expect(frame.locator('.reminder-row')).to_have_count(4)
        frame.get_by_role('button',name='完成给肉球梳毛',exact=True).click()
        expect(frame.locator('.reminder-row.done',has_text='给肉球梳毛')).to_have_count(1)
        frame.get_by_role('button',name='撤销完成给肉球梳毛',exact=True).click()
        expect(frame.locator('.reminder-row.done',has_text='给肉球梳毛')).to_have_count(0)
        click('calendar-expand');assert frame.locator('.day').count()>=28
        screenshot('month-calendar')
        click('calendar-next');click('today')
        expect(frame.locator('.reminder-row')).to_have_count(4)
        click('pet',pet='gelin');expect(frame.locator('.reminder-row')).to_have_count(3)
        passed('Reminder add, complete/undo, month/week navigation and pet isolation')

        tab('album')
        frame.locator('.photo-print').first.click()
        before=frame.locator('.viewer-caption').inner_text()
        click('photo-next');assert frame.locator('.viewer-caption').inner_text()!=before
        click('toggle-play');expect(frame.get_by_role('button',name='暂停播放',exact=True)).to_be_visible()
        frame.get_by_role('button',name='关闭照片').focus()
        expect(frame.locator('.viewer').get_by_role('button',name='播放照片',exact=True)).to_be_visible()
        click('toggle-play');page.wait_for_timeout(4700)
        assert frame.locator('.viewer-caption').inner_text()!=before
        modal_close()
        page.emulate_media(reduced_motion='reduce')
        click('play')
        expect(frame.locator('.viewer').get_by_role('button',name='播放照片',exact=True)).to_be_visible()
        assert frame.locator('.viewer').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
        modal_close();page.emulate_media(reduced_motion='no-preference')
        passed('Photo browsing, playback, pause on focus and reduced-motion behavior')

        # Simulated file chooser only: no claim of mobile hardware capture.
        with page.expect_file_chooser() as capture:
            click('camera')
        capture.value.set_files(str(ROOT/'design/assets/album-samples/dog-life-contact-sheet-v1.webp'))
        expect(frame.locator('.viewer')).to_be_visible()
        expect(frame.locator('.viewer-image img')).to_have_count(1)
        modal_close()
        expect(frame.locator('.photo-print')).to_have_count(6)
        expect(frame.locator('.album-extra button')).to_have_count(1)
        tab('prints');click('prints-mode',mode='diary')
        expect(frame.locator('.diary-card img')).to_have_count(1)
        click('pet',pet='rouqiu');tab('album')
        expect(frame.locator('.album-extra button')).to_have_count(0)
        passed('File selection adds one image and one photo diary to the captured pet only')

        for mode in ['empty','few','full']:
            design('content',mode)
            for name in ['album','prints','weight','reminders']:
                tab(name)
                if name=='weight' and mode=='few':
                    expect(frame.locator('.weight-chart .point')).to_have_count(1)
                    expect(frame.locator('.weight-chart .trend')).to_have_count(0)
                if name=='prints' and mode=='few':expect(frame.locator('.diary-peek')).to_have_count(0)
                if name=='album' and mode=='empty':expect(frame.locator('.photo-print')).to_have_count(0)
                if mode=='empty':screenshot('empty-'+name)
        passed('Empty/one/many content states; no fake diary stacks or one-point trend')

        sizes=[(320,850),(375,850),(390,850),(844,390)]
        measurements=[]
        for width,height in sizes:
            # render.py reserves 16px outer padding per side; measure the
            # actual iframe content at the target width, not 32px narrower.
            page.set_viewport_size({'width':width+32,'height':height})
            for name in ['album','prints','weight','reminders']:
                tab(name)
                for size in ['standard','large']:
                    design('textSize',size)
                    status=layout();measurements.append({'width':width,'page':name,'text':size,**status})
                    assert not status['horizontal'],(width,name,size,status)
                    assert not status['targets'],(width,name,size,status)
                    assert status['docWidth']<=status['viewport']+1,status
        (OUT/'layout-checks.json').write_text(json.dumps(measurements,ensure_ascii=False,indent=2)+'\n')
        passed('320/375/390 px and landscape container; 125% text; all main-page touch targets ≥44px',f'{len(measurements)} combinations. This is not iOS Dynamic Type or safe-area validation.')

        page.set_viewport_size({'width':460,'height':920});design('textSize','standard')
        tab('album');click('menu');click('export-preview')
        expect(frame.locator('.export-cover')).to_contain_text('肉球的小日子')
        expect(frame.locator('.export-section')).to_have_count(4)
        screenshot('memory-book-preview')
        modal_close()
        tab('prints');click('quick');click('write')
        long_text='今天在公园走了一大圈，看见树叶就想追，回家后在门口等着擦脚。'*30
        frame.locator('textarea').fill(long_text)
        frame.locator('button[data-action="save-editor"]').click()
        frame.locator('.diary-card').click()
        expect(frame.locator('.detail-copy')).to_have_text(long_text)
        passed('Memory book preview uses current data; long diary retained in full detail')
        assert not errors,errors
        passed('No JavaScript runtime errors')
        browser.close()
except Exception as exc:
    results.append({'check':'run','passed':False,'detail':str(exc)})
    raise
finally:
    (OUT/'browser-checks.json').write_text(json.dumps({'scope':'four-page browser visual prototype','checks':results,'runtimeErrors':errors,'nativeChecks':'not executed'},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(results,ensure_ascii=False,indent=2))
