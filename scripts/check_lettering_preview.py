"""Check font/icon trial: loaded fonts, live reminders, preserved drafts and layouts."""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'design/previews/gogo-lettering'
os.environ.update(PLAYWRIGHT_BROWSERS_PATH=str(ROOT/'.tools/browsers'),LD_LIBRARY_PATH=str(ROOT/'.tools/browser-libs/usr/lib/x86_64-linux-gnu'),TMPDIR=str(ROOT/'.tools/tmp'))
ADAPTER='window.__reviewControls={};window.Tweak=class{constructor(o){this.o=o}addSelect(s,k){window.__reviewControls[k]=v=>{s[k]=v;this.o.onChange()}}}'
checks=[];errors=[];layouts=[]
def passed(name):checks.append(name)
def act(name,**attrs):f.locator('[data-action="'+name+'"]'+''.join(f'[data-{k}="{v}"]' for k,v in attrs.items())).click()
def variant(i):
    f.locator('.proto-picker-item').nth(i).click()
    expect(f.locator('#gogo-lettering')).to_have_attribute('data-lettering',['hand','pen','baseline'][i])
    f.evaluate('document.fonts.ready')
def close():
    act('close');expect(f.locator('.overlay-host [role="dialog"]')).to_have_count(0)
def screen(name):f.locator('.app-shell').screenshot(path=str(OUT/(name+'.png')))

with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':422,'height':1000})
    page.add_init_script(ADAPTER);page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((ROOT/'.tools/gogo-lettering-check.html').as_uri());f=page.frames[1]
    expect(f.locator('.page h1')).to_have_text('提醒')
    for i,name in enumerate(['hand','pen','baseline']):
        variant(i)
        assert f.evaluate('document.fonts.check("18px '+['GoDogHand','GoDogPen','GoDogNext'][i]+'")')
        expect(f.locator('.bottom-nav button')).to_have_count(3)
        expect(f.locator('.proto-picker-item[data-active]')).to_have_count(1)
        if name!='baseline':
            assert f.locator('.reminder-body .doodle-icon').count()>0
            expect(f.locator('.reminder-body [data-lucide]')).to_have_count(0)
        for theme in ['light','dark']:
            if f.locator('#gogo-lettering').get_attribute('data-theme')!=theme:act('theme')
            screen(name+'-'+theme)
            act('add-reminder');f.locator('.sheet').wait_for();page.wait_for_timeout(240);screen(name+'-'+theme+'-sheet');close()
        act('theme')
        act('add-reminder');act('save-editor')
        assert f.locator('[name="title"]').evaluate('e=>e.validity.valueMissing')
        expect(f.locator('.sheet')).to_be_visible()
        f.locator('[name="title"]').fill('出门散步 '+name)
        f.locator('[name="time"]').fill('19:30');act('save-editor')
        expect(f.locator('.reminder-row h3',has_text='出门散步 '+name)).to_have_count(1)
        row=f.locator('.reminder-row').filter(has=f.locator('h3',has_text='出门散步 '+name))
        row.locator('[data-action="reminder-detail"]').click();act('edit-reminder')
        f.locator('[name="title"]').fill('晚上散步 '+name);act('save-editor')
        row=f.locator('.reminder-row').filter(has=f.locator('h3',has_text='晚上散步 '+name))
        row.locator('[data-action="complete"]').click();expect(row).to_have_class('reminder-row done')
        row.locator('[data-action="complete"]').click();expect(row).to_have_class('reminder-row ')
        act('pet',pet='gelin');expect(f.locator('.reminder-row h3',has_text='晚上散步 '+name)).to_have_count(0)
        act('pet',pet='rouqiu');expect(f.locator('.reminder-row h3',has_text='晚上散步 '+name)).to_have_count(1)
        passed(name+': font loaded, both themes, create/edit/complete/undo, pet isolation')

    variant(0);act('calendar-expand');expect(f.locator('.calendar')).to_have_attribute('aria-label','月历')
    act('calendar-next');selected=f.locator('.day[aria-pressed="true"]').get_attribute('data-date')
    act('add-reminder');f.locator('[name="title"]').fill('洗澡草稿')
    # Picker controls sit outside the app dialog and are intentional exploration chrome.
    variant(1);expect(f.locator('[name="title"]')).to_have_value('洗澡草稿')
    expect(f.locator('[name="date"]')).to_have_value(selected)
    f.locator('[name="title"]').press('1');expect(f.locator('#gogo-lettering')).to_have_attribute('data-lettering','pen')
    act('save-editor');expect(f.locator('.calendar')).to_have_attribute('aria-label','月历')
    expect(f.locator('.day[aria-pressed="true"]')).to_have_attribute('data-date',selected)
    passed('Variant switching retains draft, selected date, month mode, saved data; typing ignores picker shortcuts')
    act('today');act('calendar-expand')
    for tab in ['prints','weight','reminders']:
        act('tab',tab=tab);expect(f.locator('.page h1')).to_have_text({'prints':'相册','weight':'脚印','reminders':'提醒'}[tab])
        if tab=='prints':expect(f.locator('.diary-cta [data-action="camera"]')).to_have_count(1)
        if tab=='weight':assert f.locator('.growth-moment').count()>0
    passed('Three-tab navigation, album capture action and connected mixed timeline retained')

    # Clean sample content for visual/layout comparisons.
    page.reload();f=page.frames[1];expect(f.locator('.reminder-row')).to_have_count(3)
    for width in [320,375,390]:
        page.set_viewport_size({'width':width+32,'height':1000})
        for i,name in enumerate(['hand','pen','baseline']):
            variant(i)
            for size in ['standard','large']:
                f.evaluate('v=>window.__reviewControls.textSize(v)',size)
                bounds=f.locator('#gogo-lettering').evaluate('''r=>{
                    const box=r.getBoundingClientRect();const body=r.querySelector('.page-body');const last=r.querySelector('.reminder-row:last-child');
                    return {width:box.width,overflow:r.scrollWidth>r.clientWidth+1,thirdFullyVisible:last.getBoundingClientRect().bottom<=body.getBoundingClientRect().bottom+1,
                      smallTargets:[...r.querySelectorAll('button')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().width<43.5).map(e=>e.className)};
                }''')
                assert not bounds['overflow'],(width,name,size,bounds)
                assert not bounds['smallTargets'],(width,name,size,bounds)
                if size=='standard' and name!='baseline':assert bounds['thirdFullyVisible'],(width,name,bounds)
                f.locator('.reminder-row:last-child').scroll_into_view_if_needed()
                assert f.locator('.reminder-row:last-child').evaluate('e=>{const b=e.closest(".page-body").getBoundingClientRect();const r=e.getBoundingClientRect();return r.bottom<=b.bottom+1&&r.top>=b.top-1}')
                act('add-reminder')
                assert f.locator('.sheet').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
                for field in ['title','date','time']:
                    b=f.locator('[name="'+field+'"]').bounding_box();assert b['width']>80
                close();layouts.append({'width':width,'variant':name,'fontScale':size,**bounds})
    passed('18 small-phone layout cases, enlarged text, editable fields and 44px-wide controls')
    page.set_viewport_size({'width':844,'height':390});variant(0);act('add-reminder');f.locator('[data-action="save-editor"]').scroll_into_view_if_needed();close()
    passed('Landscape host remains scrollable to the sheet actions')
    page.emulate_media(reduced_motion='reduce');act('add-reminder')
    assert f.locator('.sheet').evaluate('e=>e.getAnimations().length')==0
    close();passed('Reduced motion: sheet opens without positional animation')
    assert not errors,errors
    browser.close()

(OUT/'browser-checks.json').write_text(json.dumps({'checks':checks,'layouts':layouts,'errors':errors,'realDeviceVerified':False},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'layouts':len(layouts),'errors':errors},ensure_ascii=False))
