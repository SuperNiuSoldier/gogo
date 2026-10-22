# Historical v0.6 layout checks; current v0.9 entry points: check_photo_home.py.
"""Browser checks for the in-memory photo, profile and reminder prototype."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path('/data/zuoweimen/gogo')


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width':375, 'height':1000}, timezone_id='Asia/Shanghai')
        page.set_default_timeout(10000)
        errors, checks, layouts = [], [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto((ROOT/'.tools/two-dog-themes-check.html').as_uri())
        f = page.frame_locator('iframe')
        await f.locator('.gg-app').wait_for()
        inner = page.frames[1]
        await inner.evaluate('document.fonts.ready')

        async def click(selector):
            await f.locator(selector).click()

        async def theme(value):
            if not await f.locator('[data-theme-panel]').is_visible():
                await click('[data-appearance]')
            await click(f'[data-theme-choice="{value}"]')

        async def layout(label):
            overflow = await inner.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
            small = await f.locator('button:visible').evaluate_all('(bs)=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent)')
            assert not overflow, label
            assert not small, (label, small)
            layouts.append(label)

        async def responsive(label):
            for width, height in [(320,900),(375,900),(844,390)]:
                await page.set_viewport_size({'width':width,'height':height})
                for mode in ['rouqiu','gelin']:
                    await theme(mode)
                    await layout(f'{label} {mode} {width}x{height}')
            await page.set_viewport_size({'width':375,'height':1000})

        async def count(kind):
            return int((await f.locator(f'[data-quick="{kind}"] .gg-count').text_content()).split()[1])

        # A photo by itself is a diary; changing themes preserves its owner and image.
        await click('[data-compose]')
        await click('[data-save]')
        assert '照片' in await f.locator('#gg-error').inner_text()
        await f.locator('#gg-photo').set_input_files(str(ROOT/'design/assets/rouqiu-gelin-portraits-v1.jpg'))
        await f.locator('[data-photo-preview]').wait_for(state='visible')
        await theme('gelin')
        assert await f.locator('[data-compose-pet]').inner_text() == '肉球'
        assert await f.locator('[data-draft-photo]').evaluate('(img)=>img.naturalWidth>0')
        await responsive('photo editor')
        await click('[data-save]')
        await click('[data-nav="growth"]')
        photo = f.locator('[data-timeline] .gg-album-card').filter(has=f.locator('.gg-album-photo'))
        assert await photo.count() == 1
        photo_id = await photo.get_attribute('data-record-id')
        await click(f'[data-timeline] [data-record-id="{photo_id}"]')
        await click('[data-remove-photo]')
        await click('[data-save]')
        assert await f.locator('#gg-diary').get_attribute('aria-invalid') == 'true'
        await click('[data-cancel]')
        await click('[data-discard]')
        assert await f.locator('[data-timeline] .gg-album-photo').count() == 1
        await responsive('photo memories')
        # Switching the memory filter sets the owner of a new diary.
        await f.locator('[data-filter-pet]').select_option('gelin')
        await click('[data-add-story]')
        assert await f.locator('[data-compose-pet]').inner_text() == '格林'
        await f.locator('#gg-photo').set_input_files({'name':'bad.jpg','mimeType':'image/jpeg','buffer':b'not an image'})
        await f.locator('#gg-photo-status').filter(has_text='没能打开').wait_for()
        assert await f.locator('[data-save]').is_enabled()
        # A rejected second selection must cancel the first async upload without disabling Save.
        await inner.evaluate('()=>{window.ggOriginalRead=FileReader.prototype.readAsDataURL; FileReader.prototype.readAsDataURL=function(file){setTimeout(()=>window.ggOriginalRead.call(this,file),250)}}')
        await f.locator('#gg-photo').set_input_files(str(ROOT/'design/assets/rouqiu-gelin-portraits-v1.jpg'))
        await f.locator('#gg-photo').set_input_files({'name':'bad.txt','mimeType':'text/plain','buffer':b'no image'})
        await page.wait_for_timeout(400)
        assert await f.locator('[data-photo-preview]').is_hidden()
        assert await f.locator('[data-save]').is_enabled()
        await inner.evaluate('()=>{FileReader.prototype.readAsDataURL=window.ggOriginalRead}')
        await f.locator('#gg-photo').set_input_files({'name':'too-big.jpg','mimeType':'image/jpeg','buffer':b'x'*(5*1024*1024+1)})
        assert '5MB' in await f.locator('#gg-photo-status').inner_text()
        await f.locator('#gg-diary').fill('格林的相册，不会串到肉球。')
        await click('[data-save]')
        assert '格林的相册' in await f.locator('[data-timeline]').inner_text()
        checks.extend(['photo-only diary', 'photo removal validation and discard', 'photo and owner survive theme switch', 'invalid and oversized image rejected', 'stale asynchronous upload ignored', 'new diary belongs to filtered pet'])

        # Profile identity stays stable across renaming, validation and cancellation.
        await click('[data-nav="profile"]')
        await responsive('family')
        await click('[data-edit-profile="rouqiu"]')
        await f.locator('#gg-pet-name').fill('')
        await click('[data-pet-save]')
        assert await f.locator('#gg-pet-name').get_attribute('aria-invalid') == 'true'
        long_name = '软乎乎的肉球今天也开开心心呀'
        await f.locator('#gg-pet-name').fill(long_name)
        await f.locator('#gg-pet-birthday').fill('2999-01-01')
        await click('[data-pet-save]')
        assert '晚于今天' in await f.locator('#gg-pet-error').inner_text()
        await f.locator('#gg-pet-birthday').fill('2025-01-02')
        await f.locator('#gg-pet-home').fill('2025-01-01')
        await click('[data-pet-save]')
        assert '早于生日' in await f.locator('#gg-pet-error').inner_text()
        await f.locator('#gg-pet-home').fill('2025-01-03')
        await responsive('profile editor')
        await click('[data-pet-save]')
        assert long_name in await f.locator('[data-edit-profile="rouqiu"]').inner_text()
        await click('[data-edit-profile="rouqiu"]')
        await f.locator('#gg-pet-name').fill('不要保存')
        await click('[data-pet-cancel]')
        await click('[data-simple-keep]')
        assert await f.locator('#gg-pet-name').input_value() == '不要保存'
        await click('[data-pet-cancel]')
        await click('[data-simple-accept]')
        assert long_name in await f.locator('[data-edit-profile="rouqiu"]').inner_text()
        await click('[data-nav="today"]')
        await responsive('long pet name home')
        assert await f.locator('[data-pet-name]').inner_text() == long_name
        assert await count('diary') == 2
        assert '肉球' in await f.locator('[data-theme-choice="rouqiu"]').text_content()
        await click('[data-nav="profile"]')
        await click('[data-edit-profile="rouqiu"]')
        await f.locator('#gg-pet-name').fill('肉球')
        await click('[data-pet-save]')
        checks.extend(['profile empty name/future dates/date order validation', 'profile discard and keep', 'stable record identity after rename', 'theme names stay original', 'long pet names reflow'])

        # One-time and repeating reminders: records and undo are one atomic user action.
        await click('[data-profile-reminders]')
        await responsive('empty reminders')
        await click('[data-add-reminder]')
        await click('[data-reminder-save]')
        assert await f.locator('#gg-reminder-title').get_attribute('aria-invalid') == 'true'
        await f.locator('#gg-reminder-title').fill('午后一起散步')
        await f.locator('#gg-reminder-time').fill('2020-01-01T12:00')
        await click('[data-reminder-save]')
        assert '接下来' in await f.locator('#gg-reminder-error').inner_text()
        tomorrow = await inner.evaluate('(()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(18,0,0,0);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)})()')
        await f.locator('#gg-reminder-time').fill(tomorrow)
        await responsive('reminder editor')
        await click('[data-reminder-save]')
        await responsive('active reminders')
        first = await f.locator('[data-reminder-done]').get_attribute('data-reminder-done')
        await click('[data-reminders-back]')
        await click('[data-nav="today"]')
        assert '午后一起散步' in await f.locator('[data-home-reminder]').inner_text()
        baseline = await count('walk')
        await click('[data-home-reminder]')
        await click(f'[data-reminder-done="{first}"]')
        assert await count('walk') == baseline+1
        assert await f.locator('[data-reminder-done]').count() == 0
        await click('[data-undo]')
        assert await count('walk') == baseline
        assert await f.locator('[data-reminder-done]').count() == 1
        await click(f'[data-reminder-edit="{first}"]')
        await f.locator('#gg-reminder-repeat').select_option('daily')
        await click('[data-reminder-save]')
        await f.locator(f'[data-reminder-done="{first}"]').evaluate('(b)=>{b.click();b.click();document.querySelector(`[data-reminder-done="${b.dataset.reminderDone}"]`).click()}')
        assert await count('walk') == baseline+1
        await click(f'[data-reminder-edit="{first}"]')
        next_due = await f.locator('#gg-reminder-time').input_value()
        expected = await inner.evaluate('(value)=>{const d=new Date(value);d.setDate(d.getDate()+1);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}',tomorrow)
        assert next_due == expected
        await click('[data-reminder-cancel]')
        await click('[data-undo]')
        assert await count('walk') == baseline
        await click(f'[data-reminder-edit="{first}"]')
        await f.locator('#gg-reminder-repeat').select_option('weekly')
        await click('[data-reminder-save]')
        await click(f'[data-reminder-done="{first}"]')
        await click(f'[data-reminder-edit="{first}"]')
        expected = await inner.evaluate('(value)=>{const d=new Date(value);d.setDate(d.getDate()+7);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}',tomorrow)
        assert await f.locator('#gg-reminder-time').input_value() == expected
        await click('[data-reminder-delete]')
        await click('[data-simple-keep]')
        await click('[data-reminder-delete]')
        await click('[data-simple-accept]')
        assert await count('walk') == baseline+1
        assert await f.locator('[data-reminder-list] [data-reminder-id]').count() == 0
        assert await f.locator('[data-feedback]').is_hidden()
        checks.extend(['reminder title/future time validation', 'home reminder entry', 'one-time completion and atomic undo', 'daily/weekly calendar recurrence', 'recurring double completion guard', 'delete reminder preserves completed record and clears stale undo'])

        # Health completion requires actual details; cancel leaves the reminder active.
        await click('[data-add-reminder]')
        await f.locator('#gg-reminder-title').fill('驱虫的小约定')
        await f.locator('#gg-reminder-kind').select_option('deworm')
        await click('[data-reminder-cancel]')
        await click('[data-simple-keep]')
        await click('[data-reminder-save]')
        second = await f.locator('[data-reminder-done]').get_attribute('data-reminder-done')
        await click(f'[data-reminder-done="{second}"]')
        await click('[data-save]')
        assert await f.locator('#gg-diary').get_attribute('aria-invalid') == 'true'
        await click('[data-cancel]')
        assert await f.locator('[data-reminder-done]').count() == 1
        await page.wait_for_timeout(700)
        await click(f'[data-reminder-done="{second}"]')
        await f.locator('#gg-diary').fill('测试项目：实际名称由用户填写')
        await theme('gelin')
        assert await f.locator('[data-compose-pet]').inner_text() == '肉球'
        await click('[data-save]')
        assert await f.locator('[data-reminder-done]').count() == 0
        assert await f.locator('[data-health-records] [data-kind="deworm"]').count() == 1
        await click('[data-undo]')
        assert await f.locator('[data-reminder-done]').count() == 1
        assert await f.locator('[data-health-records] [data-kind="deworm"]').count() == 0
        await click('[data-reminders-back]')
        await click('[data-pet="gelin"]')
        await click('[data-nav="profile"]')
        await click('[data-profile-reminders]')
        assert await f.locator('[data-reminder-done]').count() == 0
        checks.extend(['health reminder requires details', 'cancel does not complete reminder', 'health completion/undo restores both states', 'reminders isolated by pet'])

        # Reload clears trial data; screenshots contain only clearly marked sample illustrations.
        await page.reload()
        await f.locator('.gg-app').wait_for()
        inner = page.frames[1]
        await inner.evaluate('document.fonts.ready')
        await click('[data-pet="rouqiu"]')
        await click('[data-nav="growth"]')
        assert await f.locator('.gg-album-photo').count() == 0
        for mode in ['rouqiu','gelin']:
            await theme(mode)
            await click('[data-nav="growth"]')
            await f.locator('.gg-app').screenshot(path=str(ROOT/f'design/previews/{mode}-memories.png'))
            await click('[data-nav="profile"]')
            await f.locator('.gg-app').screenshot(path=str(ROOT/f'design/previews/{mode}-family.png'))
        assert not errors, errors
        report={'version':'detail pages v0.6','checks':checks,'layouts':layouts,'javascriptErrors':errors,'nativeIOSVerified':False,'systemNotificationsImplemented':False,'persistentStorageImplemented':False}
        (ROOT/'design/previews/detail-browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(report,ensure_ascii=False))
        await browser.close()


asyncio.run(main())
