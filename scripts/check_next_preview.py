"""Validate the isolated prototype picker and all three product directions."""
from pathlib import Path
import os,json,re
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'design/previews/gogo-next'
os.environ.update(PLAYWRIGHT_BROWSERS_PATH=str(ROOT/'.tools/browsers'),LD_LIBRARY_PATH=str(ROOT/'.tools/browser-libs/usr/lib/x86_64-linux-gnu'),TMPDIR=str(ROOT/'.tools/tmp'))
checks=[];errors=[];layouts=[]
ADAPTER='window.__reviewControls={};window.Tweak=class{constructor(o){this.o=o}addSelect(s,k){window.__reviewControls[k]=v=>{s[k]=v;this.o.onChange()}}}'
def passed(name):checks.append({'check':name,'passed':True})
def act(name,**attrs):
    f.locator('[data-action="'+name+'"]'+''.join(f'[data-{k}="{v}"]' for k,v in attrs.items())).click()
def tab(name):f.locator(f'.bottom-nav [data-tab="{name}"]').click()
def control(k,v):f.evaluate('([k,v])=>window.__reviewControls[k](v)',[k,v])
def close():
    f.locator('.overlay-host [data-action="close"]').click()
    expect(f.locator('.overlay-host [role="dialog"]')).to_have_count(0)
def shot(name):
    expect(f.locator('.toast')).to_be_hidden(timeout=8000)
    f.locator('.app-shell').screenshot(path=str(OUT/(name+'.png')))

try:
 with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':422,'height':1020})
    page.add_init_script(ADAPTER);page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'.tools/gogo-next-check.html').as_uri());f=page.frames[1]
    expect(f.locator('#gogo-next')).to_have_attribute('data-direction','cinema')
    expect(f.locator('[data-tab="album"]')).to_have_attribute('aria-current','page')
    expect(f.locator('.proto-picker-item[data-active]')).to_have_count(1)
    assert f.evaluate('document.fonts.check("16px GoDogNext")')
    passed('Isolated picker loads with the album, embedded rounded font and three choices')

    for index,name in enumerate(['cinema','journal','everyday']):
        f.locator('.proto-picker-item').nth(index).click()
        expect(f.locator('#gogo-next')).to_have_attribute('data-direction',name)
        expect(f.locator('.bottom-nav button')).to_have_count(5)
        # Same dog in every page; theme changes do not change the pet.
        for theme,pet in [('light','rouqiu'),('dark','gelin')]:
            if f.locator('#gogo-next').get_attribute('data-theme')!=theme:act('theme')
            act('pet',pet=pet)
            for section in ['album','prints','weight','reminders']:
                tab(section)
                expect(f.locator('.page')).to_have_attribute('aria-label',re.compile('肉球' if pet=='rouqiu' else '格林'))
                shot(f'{name}-{theme}-{section}')
            expect(f.locator(f'[data-pet="{pet}"]')).to_have_attribute('aria-pressed','true')
        passed(name+': all four pages in both themes, top-level pet context')

        tab('prints');act('quick');expect(f.locator('.quick-action')).to_have_count(6)
        act('quick-save',kind='water');expect(f.locator('.record-row h3',has_text='喝水')).to_have_count(1)
        act('undo');expect(f.locator('.record-row h3',has_text='喝水')).to_have_count(0)
        act('quick');act('write');f.locator('textarea').fill('一起去散步。今天也很开心。')
        # Numeric/arrow keys inside text input must not switch the picker.
        f.locator('textarea').press('1');expect(f.locator('#gogo-next')).to_have_attribute('data-direction',name)
        f.locator('textarea').fill('一起去散步。今天也很开心。')
        act('pick-photo');f.locator('[data-action="choose-photo"]').first.click()
        act('save-editor');expect(f.locator('.diary-card')).to_contain_text('一起去散步')
        f.locator('.diary-card').click();expect(f.locator('.detail-copy')).to_have_text('一起去散步。今天也很开心。')
        close()
        # Vertical scroll and frost remain real interactions in every direction.
        scroll=f.locator('.diary-scroll');scroll.hover();page.mouse.wheel(0,310);page.wait_for_timeout(900)
        assert int(scroll.get_attribute('data-current'))>=1
        frost=f.locator('.diary-paper').evaluate_all('''cards=>cards.map(c=>({active:c.classList.contains('diary-card'),filter:getComputedStyle(c.querySelector('.diary-content')).filter,tilt:new DOMMatrixReadOnly(getComputedStyle(c).transform).m23}))''')
        assert all(c['tilt']==0 for c in frost)
        assert any(c['active'] and c['filter']=='blur(0px)' for c in frost),frost
        assert any(not c['active'] and c['filter']!='blur(0px)' for c in frost),frost
        f.locator('.diary-card').focus();page.keyboard.press('Home');expect(scroll).to_have_attribute('data-current','0')

        tab('weight');act('add-weight');f.locator('input[name="value"]').fill('9.2');act('save-editor')
        expect(f.locator('.weight-body')).to_contain_text('9.2')
        act('weight-mode');expect(f.locator('.weight-body')).to_contain_text('9.2')
        tab('reminders');act('add-reminder');f.locator('input[name="title"]').fill('擦擦小爪子');act('save-editor')
        expect(f.locator('.reminder-row',has_text='擦擦小爪子')).to_have_count(1)
        f.get_by_role('button',name='完成擦擦小爪子',exact=True).click()
        expect(f.locator('.reminder-row.done',has_text='擦擦小爪子')).to_have_count(1)
        f.get_by_role('button',name='撤销完成擦擦小爪子',exact=True).click()
        act('calendar-expand');assert f.locator('.day').count()>=28
        act('calendar-expand')
        tab('album');f.locator('[data-action="photo"]').first.click();expect(f.locator('.viewer')).to_be_visible()
        act('photo-next');act('toggle-play');expect(f.get_by_role('button',name='暂停播放',exact=True)).to_be_visible()
        f.get_by_role('button',name='关闭照片').focus();expect(f.locator('.viewer').get_by_role('button',name='播放照片',exact=True)).to_be_visible()
        close()
        passed(name+': quick record/undo, diary and frost scroll, weight, reminder, photo viewer and playback')
        # Reset only synthetic test content between variants.
        control('content','empty');control('content','full')

    # A typed draft and saved data survive the comparison remount.
    tab('prints');act('quick');act('write');f.locator('textarea').fill('切换方案时保留的草稿')
    f.locator('.proto-picker-item').first.click();expect(f.locator('textarea')).to_have_value('切换方案时保留的草稿')
    act('save-editor');expect(f.locator('.diary-card')).to_contain_text('切换方案时保留的草稿')
    f.locator('.proto-picker-item').nth(1).click();expect(f.locator('.diary-card')).to_contain_text('切换方案时保留的草稿')
    tab('album');f.locator('.proto-picker-item').first.focus();page.keyboard.press('3')
    expect(f.locator('#gogo-next')).to_have_attribute('data-direction','everyday')
    page.keyboard.press('ArrowLeft');expect(f.locator('#gogo-next')).to_have_attribute('data-direction','journal')
    page.keyboard.press('r');expect(f.locator('#gogo-next')).to_have_attribute('data-direction','journal')
    passed('Picker keyboard shortcuts, input exclusion, remount cleanup and draft/data continuity')

    # Existing device photo selection flow still updates both album and diary.
    with page.expect_file_chooser() as chooser:act('camera')
    chooser.value.set_files(str(ROOT/'design/assets/album-samples/dog-life-contact-sheet-v1.webp'))
    expect(f.locator('.viewer-image img')).to_have_count(1);close()
    tab('prints');expect(f.locator('.diary-card img')).to_have_count(1)
    passed('File chooser result enters the current pet album and photo diary')
    control('content','empty');control('content','full')

    for index,name in enumerate(['cinema','journal','everyday']):
        f.locator('.proto-picker-item').nth(index).click()
        for content in ['empty','few','full']:
            control('content',content)
            for section in ['album','prints','weight','reminders']:
                tab(section)
                if section=='prints' and content=='few':expect(f.locator('.diary-paper')).to_have_count(1)
                if section=='album' and content=='empty':expect(f.locator('[data-action="photo"]')).to_have_count(0)
        for width in [320,375,390]:
            page.set_viewport_size({'width':width+32,'height':1020})
            for text in ['standard','large']:
                control('textSize',text)
                for section in ['album','prints','weight','reminders']:
                    tab(section)
                    bounds=f.evaluate('''()=>{
                      const shell=document.querySelector('.app-shell').getBoundingClientRect();
                      const buttons=[...document.querySelectorAll('#gogo-next .app-base button')].filter(e=>getComputedStyle(e).visibility!=='hidden'&&!e.closest('.album-rail,.filmstrip,.weight-film'));
                      const horizontal=buttons.filter(e=>{const r=e.getBoundingClientRect();return r.left<shell.left-1||r.right>shell.right+1}).map(e=>e.getAttribute('aria-label')||e.innerText);
                      const targets=buttons.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.5||r.height<43.5}).map(e=>({label:e.getAttribute('aria-label')||e.innerText,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));
                      const diary=document.querySelector('.diary-card');let cardFits=true;
                      if(diary){const a=diary.getBoundingClientRect(),s=diary.closest('.diary-scroll').getBoundingClientRect();cardFits=a.top>=s.top-1&&a.bottom<=s.bottom+1;}
                      return {horizontal,targets,cardFits,docWidth:document.documentElement.scrollWidth,viewport:innerWidth};
                    }''')
                    layouts.append({'variant':name,'width':width,'text':text,'page':section,**bounds})
                    assert not bounds['horizontal'],layouts[-1]
                    assert not bounds['targets'],layouts[-1]
                    assert bounds['cardFits'],layouts[-1]
                    assert bounds['docWidth']<=bounds['viewport']+1,layouts[-1]
        passed(name+': empty/single/many states and 320/375/390px × standard/125% text')

    page.emulate_media(reduced_motion='reduce');tab('album');act('play')
    expect(f.locator('.viewer').get_by_role('button',name='播放照片',exact=True)).to_be_visible();close()
    tab('prints');f.locator('.diary-card').focus();page.keyboard.press('End')
    assert f.locator('.diary-card .diary-content').evaluate('(e)=>getComputedStyle(e).filter')=='blur(0px)'
    assert f.locator('.diary-paper').evaluate_all('(els)=>els.filter(e=>getComputedStyle(e).visibility==="visible").length')==1
    passed('Reduced motion retains navigation, disables autoplay and keeps the active diary clear')
    assert not errors,errors
    passed('No JavaScript errors')
    browser.close()
except Exception as exc:
    checks.append({'check':'run','passed':False,'detail':str(exc)});raise
finally:
    (OUT/'browser-checks.json').write_text(json.dumps({'scope':'three-direction browser prototype','checks':checks,'errors':errors,'iOSDeviceVerified':False},ensure_ascii=False,indent=2)+'\n')
    (OUT/'layout-checks.json').write_text(json.dumps(layouts,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(checks,ensure_ascii=False,indent=2))
