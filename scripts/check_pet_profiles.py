"""Verify pet lifecycle, data ownership and profile layouts in both previews.

Run check_video_import.py first to generate the synthetic photo/video fixtures.
"""
from pathlib import Path
import os,json
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'design/previews/gogo-lettering';FIX=ROOT/'.tools/tmp/video-import'
os.environ.update(PLAYWRIGHT_BROWSERS_PATH=str(ROOT/'.tools/browsers'),LD_LIBRARY_PATH=str(ROOT/'.tools/browser-libs/usr/lib/x86_64-linux-gnu'),TMPDIR=str(ROOT/'.tools/tmp'))
# This Linux runner has no system CJK font. Use the already licensed full source
# fonts as its system fallback, as Chinese-capable phones/desktops normally do.
fontconfig=ROOT/'.tools/profile-fontconfig.xml'
fontconfig.write_text(f'<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>{ROOT}/.tools/fonts</dir><cachedir>{ROOT}/.tools/font-cache</cachedir><alias><family>sans-serif</family><prefer><family>LXGW WenKai</family></prefer></alias></fontconfig>')
os.environ['FONTCONFIG_FILE']=str(fontconfig)
TRACK='''window.__mediaURLs=new Set();const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
URL.createObjectURL=o=>{const u=create(o);window.__mediaURLs.add(u);return u};
URL.revokeObjectURL=u=>{window.__mediaURLs.delete(u);return revoke(u)};'''
checks=[];errors=[];layouts=[]
def act(action,**attrs):
    f.locator('[data-action="'+action+'"]'+''.join(f'[data-{k}="{v}"]' for k,v in attrs.items())).click()
def close():
    act('close');expect(f.locator('.overlay-host [role="dialog"]')).to_have_count(0)
def add(name):
    f.locator('.pet-add').click();f.locator('[name="name"]').fill(name);act('save-editor')
    expect(f.locator('.overlay-host [role="dialog"]')).to_have_count(0)
    return f.locator('.pet-tab[aria-pressed="true"]').get_attribute('data-pet')
def profile():act('menu');act('pet-profile')
def remove():profile();act('pet-delete');act('pet-delete-confirm');expect(f.locator('.overlay-host [role="dialog"]')).to_have_count(0)
def fresh(surface='gogo-lettering',variant=0):
    global f
    page.goto((ROOT/('.tools/'+surface+'-check.html')).as_uri());f=page.frames[1]
    f.locator('.proto-picker-item').nth(variant).click()
    expect(f.locator('#'+surface)).to_have_attribute('data-lettering' if surface=='gogo-lettering' else 'data-direction',(['hand','pen','baseline'] if surface=='gogo-lettering' else ['cinema','journal','everyday'])[variant])
    act('tab',tab='prints');f.evaluate('document.fonts.ready')
def import_file(name,action='import'):
    with page.expect_file_chooser() as chooser:act(action)
    chooser.value.set_files([str(FIX/item) for item in name] if isinstance(name,list) else str(FIX/name))
def current_count():return f.locator('.pet-tab').count()

with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':422,'height':1000});page.add_init_script(TRACK)
    page.on('pageerror',lambda e:errors.append(str(e)))
    for surface in ['gogo-next','gogo-lettering']:
        for variant in range(3):
            fresh(surface,variant)
            f.locator('.pet-add').click();act('save-editor')
            assert f.locator('[name="name"]').evaluate('e=>e.validity.valueMissing')
            f.locator('[name="name"]').fill('   ');act('save-editor');expect(f.locator('.error')).to_be_visible()
            f.locator('[name="name"]').fill('小豆');act('save-editor')
            expect(f.locator('.pet-tab')).to_have_count(3)
            pet_id=f.locator('.pet-tab[aria-pressed="true"]').get_attribute('data-pet')
            expect(f.locator('.diary-paper')).to_have_count(0)
            expect(f.locator('.pet-tab[aria-pressed="true"] .sample-photo')).to_have_count(0)
            act('theme');expect(f.locator('.pet-tab[aria-pressed="true"]')).to_have_attribute('data-pet',pet_id)
            act('tab',tab='weight');expect(f.locator('.growth-moment')).to_have_count(0)
            act('notebook-add');act('quick-save',kind='food');expect(f.locator('.growth-moment')).to_have_count(1)
            act('notebook-add');act('add-weight');f.locator('[name="value"]').fill('3.2');act('save-editor')
            expect(f.locator('.growth-moment')).to_have_count(2)
            profile();expect(f.locator('[name="name"]')).to_have_value('小豆');close()
            act('tab',tab='reminders');expect(f.locator('.reminder-row')).to_have_count(0)
            act('add-reminder');f.locator('[name="title"]').fill('洗澡');act('save-editor')
            profile();f.locator('[name="name"]').fill('豆豆');act('save-editor')
            expect(f.locator('.pet-tab[aria-pressed="true"]')).to_have_attribute('data-pet',pet_id)
            expect(f.locator('.pet-tab[aria-pressed="true"]')).to_contain_text('豆豆')
            expect(f.locator('.reminder-row')).to_have_count(1)
            profile();act('pet-delete')
            expect(f.locator('.delete-pet-summary')).to_contain_text('2 条记录 · 1 个提醒')
            act('pet-keep');expect(f.locator('[name="name"]')).to_have_value('豆豆')
            act('pet-delete');f.locator('[data-action="pet-keep"]').press('Escape')
            expect(f.locator('[name="name"]')).to_have_value('豆豆')
            act('pet-delete');act('pet-delete-confirm');expect(f.locator('.pet-tab')).to_have_count(2)
            expect(f.locator('.reminder-row')).to_have_count(3)
            act('tab',tab='prints');act('prints-mode',mode='diary');expect(f.locator('.diary-paper')).to_have_count(3)
            act('tab',tab='weight');expect(f.locator('.growth-moment')).to_have_count(9)
            next_variant=(variant+1)%3;f.locator('.proto-picker-item').nth(next_variant).click()
            expect(f.locator('.pet-tab')).to_have_count(2)
            expect(f.locator(f'[data-pet="{pet_id}"]')).to_have_count(0)
            checks.append(f'{surface} variant {variant+1}: required/blank name, empty new pet, theme isolation, record/weight/reminder ownership, stable rename, delete counts/cancel/Escape/confirm, other pet unchanged, no resurrection on remount')

    fresh();profile();f.locator('[name="name"]').fill('未保存名字');close_button=f.locator('[data-action="close"]');close_button.click()
    expect(f.locator('[data-action="continue-edit"]')).to_have_count(1)
    act('continue-edit');expect(f.locator('[name="name"]')).to_have_value('未保存名字')
    act('close');act('discard');expect(f.locator('.pet-tab[aria-pressed="true"]')).to_contain_text('肉球')
    profile();f.locator('[name="name"]').fill('一'*17);act('save-editor');expect(f.locator('.error')).to_contain_text('1–16')
    f.locator('[name="name"]').fill('豆豆🐶');f.locator('summary').click()
    f.locator('[name="birthday"]').fill('2024-01-02');f.locator('[name="arrival"]').fill('2024-01-01')
    act('save-editor');expect(f.locator('.error')).to_contain_text('到家日不能早于生日')
    f.locator('[name="arrival"]').fill('2024-02-01');f.locator('[name="note"]').fill('喜欢草地')
    import_file('test-photo.png','avatar-pick');expect(f.locator('.profile-avatar-button img')).to_have_count(1)
    act('save-editor');expect(f.locator('.pet-tab[aria-pressed="true"] img')).to_have_count(1)
    expect(f.locator('.diary-paper')).to_have_count(3)
    f.locator('.proto-picker-item').nth(1).click();profile()
    expect(f.locator('[name="name"]')).to_have_value('豆豆🐶')
    expect(f.locator('[name="birthday"]')).to_have_value('2024-01-02')
    expect(f.locator('[name="note"]')).to_have_value('喜欢草地')
    act('avatar-clear');act('save-editor');expect(f.locator('.pet-tab[aria-pressed="true"] .avatar-placeholder')).to_have_count(1)
    profile();f.locator('[name="name"]').fill('<b>豆&豆</b>');act('save-editor')
    expect(f.locator('.pet-tab[aria-pressed="true"]')).to_contain_text('<b>豆&豆</b>')
    expect(f.locator('.pet-tab b')).to_have_count(0)
    checks.append('Dirty profile cancel/continue/discard; name/date validation; uploaded avatar stays separate from album, removable and retained across variants; HTML-like names escaped')

    fresh();import_file('test-video.webm');expect(f.locator('.viewer video')).to_have_count(1);close()
    assert f.evaluate('window.__mediaURLs.size')==1
    profile();act('pet-delete');expect(f.locator('.delete-pet-summary')).to_contain_text('6 张照片 · 1 段视频')
    act('pet-delete-confirm');expect(f.locator('.pet-tab')).to_have_count(1)
    assert f.evaluate('window.__mediaURLs.size')==0
    expect(f.locator('.diary-paper')).to_have_count(3)
    remove();expect(f.locator('.pet-tab')).to_have_count(0)
    expect(f.locator('.bottom-nav')).to_be_hidden();expect(f.locator('.pet-onboarding')).to_be_visible()
    act('theme');f.locator('.proto-picker-item').nth(2).click();expect(f.locator('.pet-onboarding')).to_be_visible()
    new_id=add('新朋友');expect(f.locator('.pet-tab')).to_have_count(1)
    expect(f.locator('.diary-paper')).to_have_count(0);expect(f.locator('.bottom-nav')).to_be_visible()
    import_file('test-photo.png');expect(f.locator('.viewer')).to_have_count(1);close();expect(f.locator('.diary-paper')).to_have_count(1)
    expect(f.locator('.pet-tab[aria-pressed="true"]')).to_have_attribute('data-pet',new_id)
    checks.append('Delete releases video URL, preserves other pet; delete last pet, empty onboarding survives remount, new pet can import')

    fresh()
    f.evaluate('''()=>{const decode=Image.prototype.decode;Image.prototype.decode=async function(){await new Promise(r=>window.__releaseImport=r);return decode.call(this)}}''')
    import_file(['test-video.webm','test-photo.png']);f.wait_for_function('!!window.__releaseImport')
    assert f.evaluate('window.__mediaURLs.size')==1
    remove();f.evaluate('window.__releaseImport()');page.wait_for_timeout(300)
    expect(f.locator('.pet-tab')).to_have_count(1);expect(f.locator('.diary-paper')).to_have_count(3)
    assert f.evaluate('window.__mediaURLs.size')==0
    remove();expect(f.locator('.pet-onboarding')).to_be_visible()
    checks.append('Pending mixed video/photo import cannot recreate records after initiating pet is deleted; temporary video URL released')

    fresh();f.locator('.pet-add').click();f.locator('[name="name"]').fill('草稿狗')
    f.locator('.proto-picker-item').nth(1).click();expect(f.locator('[name="name"]')).to_have_value('草稿狗')
    act('save-editor');expect(f.locator('.pet-tab')).to_have_count(3)
    expect(f.locator('.diary-paper')).to_have_count(0)
    checks.append('Unsaved new-pet draft survives variant switch and creates only one profile')

    fresh();add('很长很长很长很长很长很长很长名字');add('小雨');last_pet=add('小雪')
    for variant in [1,2,0]:
        f.locator('.proto-picker-item').nth(variant).click()
        expect(f.locator('#gogo-lettering')).to_have_attribute('data-lettering',['hand','pen','baseline'][variant])
        f.evaluate('document.fonts.ready')
        expect(f.locator('.pet-tab[aria-pressed="true"]')).to_have_attribute('data-pet',last_pet)
        assert f.locator('.pet-switch').evaluate('e=>{const r=e.getBoundingClientRect(),s=e.querySelector("[aria-pressed=true]").getBoundingClientRect();return s.left>=r.left-1&&s.right<=r.right+1}')
    for width in [320,375,390]:
        page.set_viewport_size({'width':width+32,'height':1000})
        for scale in ['1','1.25']:
            f.locator('#gogo-lettering').evaluate('(e,s)=>e.style.setProperty("--size",s)',scale)
            for dark in [False,True]:
                if (f.locator('#gogo-lettering').get_attribute('data-theme')=='dark')!=dark:act('theme')
                assert f.locator('#gogo-lettering').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
                assert f.locator('.pet-switch').evaluate('e=>e.scrollWidth>e.clientWidth')
                b=f.locator('.pet-add').bounding_box();assert b['width']>=44 and b['height']>=44
                profile();f.locator('summary').click()
                assert f.locator('.sheet').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
                f.locator('[name="arrival"]').scroll_into_view_if_needed()
                act('pet-delete');assert f.locator('.sheet').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
                act('pet-keep');close();layouts.append({'width':width,'scale':scale,'dark':dark})
    page.set_viewport_size({'width':422,'height':1000})
    f.locator('#gogo-lettering').evaluate('e=>e.style.setProperty("--size","1")')
    if f.locator('#gogo-lettering').get_attribute('data-theme')=='dark':act('theme')
    expect(f.locator('.toast')).to_be_hidden(timeout=8000)
    f.locator('.app-shell').screenshot(path=str(OUT/'pet-list-light.png'))
    profile();page.wait_for_timeout(250);f.locator('.app-shell').screenshot(path=str(OUT/'pet-profile-light.png'))
    act('pet-delete');page.wait_for_timeout(250);f.locator('.app-shell').screenshot(path=str(OUT/'pet-delete-light.png'))
    act('pet-keep');close();act('theme');profile();page.wait_for_timeout(250)
    f.locator('.app-shell').screenshot(path=str(OUT/'pet-profile-dark.png'))
    close();page.emulate_media(reduced_motion='reduce');f.locator('.pet-add').click()
    assert f.locator('.sheet').evaluate('e=>e.getAnimations().length')==0
    checks.append('12 small-phone layouts: multi-pet horizontal rail, visible add button, 125% type, profile and deletion sheets in both themes; reduced motion respected')
    assert not errors,errors
    browser.close()

report={'checks':checks,'layouts':layouts,'errors':errors,'realDeviceVerified':False,'persistedAfterReload':False}
for surface in ['gogo-next','gogo-lettering']:
    (ROOT/'design/previews'/surface/'pet-profile-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'layouts':len(layouts),'errors':errors},ensure_ascii=False))
