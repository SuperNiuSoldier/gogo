# Historical v0.8 layout checks; current v0.9 entry points: check_photo_home.py.
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path('/data/zuoweimen/gogo')
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':736,'height':1100},timezone_id='Asia/Shanghai')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto((ROOT/'.tools/two-dog-themes-check.html').as_uri())
        frame=page.frame_locator('iframe')
        await frame.locator('.gg-app').wait_for()
        inner=page.frames[1]
        async def set_theme(theme):
            if not await frame.locator('[data-theme-panel]').is_visible():
                await frame.locator('[data-appearance]').click()
            await frame.locator(f'[data-theme-choice="{theme}"]').click()
        await inner.evaluate('document.fonts.ready')
        layouts=[]
        async def layout(label):
            assert not await inner.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1'),label
            small=await frame.locator('button:visible').evaluate_all('(bs)=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent)')
            assert not small,(label,small)
            layouts.append(label)
        for width,height in [(320,900),(375,900),(390,900),(768,1024),(844,390)]:
            await page.set_viewport_size({'width':width,'height':height})
            for theme in ['rouqiu','gelin']:
                await set_theme(theme)
                await layout(f'today {theme} {width}x{height}')
        await page.set_viewport_size({'width':320,'height':900})
        await frame.locator('[data-pet="rouqiu"]').click()
        async def count(kind):
            return int((await frame.locator(f'[data-quick="{kind}"] .gg-count').inner_text()).split()[1])
        baseline={k:await count(k) for k in ['feed','water','pee','poop','walk']}
        # Every care shortcut saves without an editor, and another pet's history remains isolated.
        for kind in baseline:
            await frame.locator(f'[data-quick="{kind}"]').click()
            assert await count(kind)==baseline[kind]+1
            assert await frame.locator('[data-page="today"]').is_visible()
        await layout('feedback small phone')
        await frame.locator('[data-pet="gelin"]').click()
        assert await count('walk')==0
        assert '肉球' in await frame.locator('[data-feedback-text]').inner_text()
        await frame.locator('[data-undo]').click()
        await frame.locator('[data-pet="rouqiu"]').click()
        assert await count('walk')==baseline['walk']
        # Same task double tap -> one event. A later real repeat -> another event.
        await frame.locator('[data-quick="walk"]').evaluate('(b)=>{b.click();b.click();}')
        assert await count('walk')==baseline['walk']+1
        await page.wait_for_timeout(700)
        await frame.locator('[data-quick="walk"]').click()
        assert await count('walk')==baseline['walk']+2
        # Supplement the latest record, backdate it, then undo the edit (not the entire record).
        await frame.locator('[data-feedback-edit]').click()
        await frame.locator('#gg-value').fill('20')
        yesterday=await inner.evaluate('(()=>{const d=new Date();d.setDate(d.getDate()-1);d.setHours(12,0,0,0);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)})()')
        await frame.locator('#gg-time').fill(yesterday)
        await frame.locator('[data-save]').click()
        assert await count('walk')==baseline['walk']+1
        await frame.locator('[data-undo]').click()
        assert await count('walk')==baseline['walk']+2
        # Draft validation, theme switch preservation, cancel/keep/save.
        await frame.locator('[data-compose]').click()
        await frame.locator('[data-save]').click()
        assert await frame.locator('#gg-diary').get_attribute('aria-invalid')=='true'
        await frame.locator('#gg-diary').fill('保留肉球的草稿。')
        await set_theme('gelin')
        assert await frame.locator('#gg-diary').input_value()=='保留肉球的草稿。'
        assert await frame.locator('[data-compose-pet]').inner_text()=='肉球'
        await layout('diary editor dark small phone')
        await frame.locator('[data-cancel]').click()
        assert await frame.locator('[data-confirm]').is_visible()
        await frame.locator('[data-keep]').click()
        await frame.locator('[data-save]').click()
        assert '保留肉球的草稿。' in await frame.locator('[data-story-text]').inner_text()
        await frame.locator('[data-compose]').click()
        await frame.locator('#gg-diary').fill('放弃的草稿')
        await frame.locator('[data-cancel]').click()
        await frame.locator('[data-discard]').click()
        assert await frame.locator('[data-page="today"]').is_visible()
        # Weight requires a positive value; cancel confirmation includes numeric edits.
        await frame.locator('[data-more]').click()
        await layout('more small phone')
        assert await frame.locator('[data-more-kind]').count()==10
        await frame.locator('[data-more-kind="weight"]').click()
        await frame.locator('[data-save]').click()
        assert await frame.locator('#gg-value').get_attribute('aria-invalid')=='true'
        await frame.locator('#gg-value').fill('0')
        await frame.locator('[data-save]').click()
        assert await frame.locator('#gg-value').get_attribute('aria-invalid')=='true'
        await frame.locator('#gg-value').fill('12.5')
        await frame.locator('[data-save]').click()
        await frame.locator('[data-more-kind="medication"]').click()
        await frame.locator('[data-save]').click()
        assert await frame.locator('#gg-diary').get_attribute('aria-invalid')=='true'
        await frame.locator('[data-cancel]').click()
        await frame.locator('[data-more-back]').click()
        await frame.locator('[data-nav="profile"]').click()
        await layout('family small phone')
        await frame.locator('[data-nav="today"]').click()
        await frame.locator('[data-health]').click()
        assert '12.5 千克' in await frame.locator('[data-health-latest]').inner_text()
        await layout('health corner small phone')
        await frame.locator('[data-health-records] [data-record-id]').first.click()
        await frame.locator('[data-delete]').click()
        assert await frame.locator('[data-confirm]').is_visible()
        await frame.locator('[data-keep]').click()
        await frame.locator('[data-delete]').click()
        await frame.locator('[data-discard]').click()
        assert '还没有记录' in await frame.locator('[data-health-records]').inner_text()
        await frame.locator('[data-nav="growth"]').click()
        assert await frame.locator('[data-filter-kind]').input_value()=='diary'
        assert '保留肉球的草稿。' in await frame.locator('[data-timeline]').inner_text()
        assert '喂食' not in await frame.locator('[data-timeline]').inner_text()
        await frame.locator('[data-filter-pet]').select_option('gelin')
        assert '保留肉球的草稿。' not in await frame.locator('[data-timeline]').inner_text()
        await frame.locator('[data-nav="today"]').click()
        await frame.locator('[data-all]').click()
        assert '喂食' in await frame.locator('[data-timeline]').inner_text()
        await page.emulate_media(reduced_motion='reduce')
        assert await frame.locator('.gg-app').evaluate('(a)=>getComputedStyle(a).transitionDuration')=='0s'
        # Clean screenshots, both themes, round font genuinely loaded.
        await page.reload()
        await page.set_viewport_size({'width':736,'height':1100})
        await frame.locator('.gg-app').wait_for()
        inner=page.frames[1]
        await inner.evaluate('document.fonts.ready')
        await frame.locator('[data-pet="rouqiu"]').click()
        for theme in ['rouqiu','gelin']:
            await set_theme(theme)
            await frame.locator(f'[data-pet="{theme}"]').click()
            assert await inner.evaluate('document.fonts.check(\'16px "GoDog Round Preview"\')')
            await frame.locator('.gg-app').screenshot(path=str(ROOT/f'design/previews/{theme}-home.png'))
        assert not errors,errors
        report={'version':'companion home v0.8','layouts':layouts,'checks':['five one-tap care actions','specific record undo after pet switch','650 ms accidental double tap guard','later repeated events allowed','backdating excludes today count','undo edit restores original','empty diary rejected','draft owner and text survive theme switch','discard and keep draft','positive weight validation','medication requires actual details','health corner and diary-first memories','pet isolation','delete confirmation and cancel','reduced motion','embedded rounded font'],'javascriptErrors':errors,'nativeIOSVerified':False,'persistentStorageVerified':False}
        (ROOT/'design/previews/browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(report,ensure_ascii=False))
        await browser.close()
asyncio.run(main())
