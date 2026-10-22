# Historical v0.9 layout checks; current navigation: check_global_pet_preview.py.
"""Exercise v0.9 photo gallery, contained sheets and their existing record editors.

Images used for uploads are generated-art test fixtures, not user photographs.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path('/data/zuoweimen/gogo')

class Checks(list):
    def append(self, item):
        super().append(item)
        print('PASS:', item, flush=True)

async def main():
    checks, layouts, errors = Checks(), [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 390, 'height': 1100}, timezone_id='Asia/Shanghai')
        page.on('pageerror', lambda error: errors.append(str(error)))
        await page.goto((ROOT/'.tools/two-dog-themes-check.html').as_uri(), wait_until='domcontentloaded')
        frame = page.frame_locator('iframe')
        await frame.locator('[data-gallery-name]').wait_for(timeout=30000)
        inner = page.frames[1]
        await inner.evaluate('document.fonts.ready')
        async def click(selector):
            await frame.locator(selector).click()
        async def close():
            await click('[data-sheet-close]')
        async def layout(label):
            assert not await inner.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1'), label
            small = await frame.locator('button:visible').evaluate_all('(bs)=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent)')
            assert not small, (label, small)
            layouts.append(label)
        async def count(kind):
            return int((await frame.locator(f'[data-quick="{kind}"] .gg-count').text_content()).split()[1])
        async def theme(value):
            await click('[data-appearance]')
            await click(f'[data-theme-choice="{value}"]')
        assert not await frame.locator('[data-quick="feed"]').is_visible()
        assert not await frame.locator('[data-health]').is_visible()
        assert not await frame.locator('[data-gallery-controls]').is_visible()
        assert await frame.locator('[data-gallery-label]').inner_text() == '演示插画'
        for width, height in [(320,900),(375,900),(390,900),(768,1024),(844,390)]:
            await page.set_viewport_size({'width':width,'height':height})
            for dog in ['rouqiu','gelin']:
                await theme(dog)
                await click(f'[data-pet="{dog}"]')
                await layout(f'home {dog} {width}x{height}')
        await page.set_viewport_size({'width':390,'height':1100})
        for dog in ['rouqiu','gelin']:
            await theme(dog)
            await click(f'[data-pet="{dog}"]')
            await frame.locator('.gg-app').screenshot(path=str(ROOT/f'design/previews/{dog}-home.png'))
        checks.append('Photo stage dominates home; functional cards hidden; both themes and dog identities independent.')
        await theme('rouqiu')
        await click('[data-pet="rouqiu"]')
        await click('[data-open-care]')
        assert await frame.locator('.gg-home-shell').get_attribute('inert') is not None
        assert await inner.evaluate('document.activeElement.hasAttribute("data-sheet-close")')
        await layout('care sheet')
        await frame.locator('.gg-app').screenshot(path=str(ROOT/'design/previews/care-sheet.png'))
        await click('[data-more]')
        await click('[data-more-back]')
        # Trap focus in both directions, restore original trigger on Escape.
        await click('[data-sheet-close]')
        assert await inner.evaluate('document.activeElement.hasAttribute("data-open-care")')
        await click('[data-open-care]')
        await frame.locator('[data-sheet-close]').focus()
        await page.keyboard.press('Shift+Tab')
        assert await inner.evaluate('document.activeElement.hasAttribute("data-all")')
        await page.keyboard.press('Tab')
        assert await inner.evaluate('document.activeElement.hasAttribute("data-sheet-close")')
        await page.keyboard.press('Escape')
        assert not await frame.locator('[data-modal]').is_visible()
        checks.append('Sheet closes by Escape; traps keyboard focus; restores opener; background inert.')
        await click('[data-open-care]')
        for kind in ['feed','water','pee','poop','walk']:
            before=await count(kind)
            await click(f'[data-quick="{kind}"]')
            assert await count(kind)==before+1
        await frame.locator('[data-quick="walk"]').evaluate('(b)=>{b.click();b.click();}')
        assert await count('walk')==1
        await close()
        await click('[data-pet="gelin"]')
        await click('[data-open-care]')
        assert await count('walk')==0
        assert '肉球' in await frame.locator('[data-feedback-text]').inner_text()
        await click('[data-undo]')
        await close()
        await click('[data-pet="rouqiu"]')
        await click('[data-open-care]')
        assert await count('walk')==0
        checks.append('Five quick records, double-tap guard and ID-based undo still work across dog changes.')
        await click('[data-compose]')
        await click('[data-save]')
        assert await frame.locator('#gg-diary').get_attribute('aria-invalid')=='true'
        await frame.locator('#gg-diary').fill('收起之前，要记得这一刻。')
        await close()
        assert await frame.locator('[data-confirm]').is_visible()
        await click('[data-keep]')
        await click('[data-save]')
        assert await frame.locator('[data-page="care"]').is_visible()
        await click('[data-compose]')
        await frame.locator('#gg-diary').fill('放弃的草稿')
        await frame.locator('[data-sheet-scrim]').click(position={'x':10,'y':10})
        assert await frame.locator('[data-confirm]').is_visible()
        await click('[data-discard]')
        assert not await frame.locator('[data-modal]').is_visible()
        checks.append('Diary validation, save, keep editing, scrim dismissal and explicit draft discard.')
        await click('[data-open-tools]')
        await click('[data-health]')
        await click('[data-weight]')
        await frame.locator('#gg-value').fill('0')
        await click('[data-save]')
        assert await frame.locator('#gg-value').get_attribute('aria-invalid')=='true'
        await frame.locator('#gg-value').fill('12.5')
        await click('[data-save]')
        assert '12.5 千克' in await frame.locator('[data-health-latest]').inner_text()
        await click('[data-health-reminders]')
        await click('[data-add-reminder]')
        await frame.locator('#gg-reminder-title').fill('一起散步')
        await close()
        assert await frame.locator('[data-simple-confirm]').is_visible()
        await click('[data-simple-keep]')
        await click('[data-reminder-save]')
        await frame.locator('[data-reminder-done]').click()
        assert await count('walk')==1
        await click('[data-undo]')
        assert await count('walk')==0
        await close()
        await click('[data-open-tools]')
        await click('[data-open-profile]')
        await click('[data-edit-profile="rouqiu"]')
        await frame.locator('#gg-pet-name').fill('肉球小朋友')
        await close()
        await click('[data-simple-keep]')
        await click('[data-pet-save]')
        await close()
        assert await frame.locator('[data-gallery-name]').inner_text()=='肉球小朋友'
        checks.append('Health numeric validation, reminders/atomic undo, profile dirty dismissal and rename stable ID.')
        await click('[data-open-tools]')
        await click('[data-open-play]')
        await click('.gg-portrait')
        await inner.wait_for_function('document.querySelector(".gg-hero").dataset.action==="greeting"')
        await close()
        assert await frame.locator('.gg-hero').get_attribute('data-action')=='rest'
        checks.append('Articulated character interaction preserved in play sheet; closing stops playback.')
        # Upload fixtures are different generated files. No real pet data is saved by this test.
        files=[str(ROOT/'design/assets/rouqiu-gelin-portraits-v1.jpg'),str(ROOT/'design/assets/characters/rouqiu-actions-preview.webp')]
        await click('[data-open-gallery]')
        await frame.locator('#gg-gallery-files').set_input_files(files)
        await frame.locator('[data-gallery-list] article').nth(1).wait_for()
        assert '已添加 2 张' in await frame.locator('#gg-gallery-status').inner_text()
        await close()
        await page.mouse.move(0,0)
        await inner.wait_for_function('document.querySelector("[data-gallery]").dataset.playback==="playing"')
        await inner.wait_for_function('document.querySelector("[data-gallery]").dataset.index==="1"',timeout=7000)
        await page.wait_for_timeout(800)
        assert await frame.locator('[data-gallery-outgoing]').is_hidden()
        checks.append('Multi-photo import, 5-second automatic transition and outgoing image cleanup.')
        await click('[data-gallery-toggle]')
        before=int(await frame.locator('[data-gallery]').get_attribute('data-index'))
        expected=str((before-1)%2)
        await click('[data-gallery-prev]')
        assert await frame.locator('[data-gallery]').get_attribute('data-index')==expected
        assert await frame.locator('[data-gallery]').get_attribute('data-playback')=='paused'
        await page.wait_for_timeout(5200)
        assert await frame.locator('[data-gallery]').get_attribute('data-index')==expected
        await click('[data-gallery-toggle]')
        await click('[data-open-tools]')
        assert await frame.locator('[data-gallery]').get_attribute('data-playback')=='suspended'
        await page.wait_for_timeout(5200)
        assert await frame.locator('[data-gallery]').get_attribute('data-index')==expected
        await close()
        checks.append('Manual navigation pauses autoplay; explicit play resumes; open sheets suspend timers.')
        await frame.locator('[data-gallery]').hover()
        assert await frame.locator('[data-gallery]').get_attribute('data-playback')=='suspended'
        await page.mouse.move(0,0)
        await inner.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))')
        assert await frame.locator('[data-gallery]').get_attribute('data-playback')=='suspended'
        await inner.evaluate('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))')
        await inner.evaluate('document.body.style.paddingBottom="1600px";window.scrollTo(0,1500)')
        await inner.wait_for_function('document.querySelector("[data-gallery]").dataset.playback==="suspended"')
        await inner.evaluate('document.body.style.paddingBottom="";window.scrollTo(0,0)')
        await inner.wait_for_function('document.querySelector("[data-gallery]").dataset.playback==="playing"')
        checks.append('Hover, simulated document background and real scroll out of viewport suspend autoplay.')
        await click('[data-pet="gelin"]')
        assert await frame.locator('[data-gallery-image]').is_hidden()
        assert await frame.locator('[data-gallery-label]').inner_text()=='演示插画'
        await theme('gelin')
        await click('[data-pet="rouqiu"]')
        assert not await frame.locator('[data-gallery-image]').is_hidden()
        assert await frame.locator('[data-gallery]').get_attribute('data-gallery-pet')=='rouqiu'
        await page.emulate_media(reduced_motion='reduce')
        assert await frame.locator('[data-gallery]').get_attribute('data-playback')=='reduced'
        await click('[data-gallery-next]')
        assert await frame.locator('[data-gallery-outgoing]').is_hidden()
        assert await frame.locator('[data-gallery-toggle]').is_disabled()
        checks.append('Separate pet photo collections; theme does not change photos; reduced motion permits instant manual changes.')
        await click('[data-open-gallery]')
        await frame.locator('#gg-gallery-files').set_input_files({'name':'broken.jpg','mimeType':'image/jpeg','buffer':b'not an image'})
        await inner.wait_for_function('document.querySelector("#gg-gallery-status").textContent.includes("无法读取")')
        assert await frame.locator('[data-gallery-list] article').count()==2
        await frame.locator('[data-gallery-remove]').first.click()
        await close()
        assert await frame.locator('[data-gallery-controls]').is_hidden()
        await click('[data-open-gallery]')
        await frame.locator('[data-gallery-remove]').click()
        await close()
        assert await frame.locator('[data-gallery-demo]').is_visible()
        checks.append('Corrupt import preserves existing photos; removal handles one and zero photos safely.')
        # A deliberately delayed import must not leak into the next dog's collection.
        await click('[data-open-gallery]')
        await inner.evaluate('()=>{window.OriginalReader=FileReader;window.FileReader=class extends OriginalReader{readAsDataURL(file){window.releaseGalleryRead=()=>super.readAsDataURL(file)}};}')
        await frame.locator('#gg-gallery-files').set_input_files(files[0])
        await close()
        await click('[data-pet="gelin"]')
        await inner.evaluate('()=>{window.releaseGalleryRead();window.FileReader=window.OriginalReader;}')
        await page.wait_for_timeout(300)
        await click('[data-open-gallery]')
        assert await frame.locator('[data-gallery-list] article').count()==0
        await close()
        await click('[data-pet="rouqiu"]')
        await click('[data-open-gallery]')
        assert await frame.locator('[data-gallery-list] article').count()==0
        await close()
        checks.append('Closing a pending import cancels old callbacks; neither dog receives those photos.')
        for width,height in [(320,900),(375,900),(844,390)]:
            await page.set_viewport_size({'width':width,'height':height})
            for value in ['rouqiu','gelin']:
                await theme(value)
                await click('[data-open-care]')
                await layout(f'care {value} {width}x{height}')
                await click('[data-compose]')
                await layout(f'editor {value} {width}x{height}')
                await close()
        assert not errors, errors
        result={'version':'photo-first home v0.9','checks':checks,'layouts':layouts,'runtimeErrors':errors,'limits':['Browser preview only; real dog source photos unavailable on server.','Fixture uploads test interactions, not authentic photo composition.','Native VoiceOver, Dynamic Type and iOS performance not verified.']}
        (ROOT/'design/previews/photo-home-browser-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(result,ensure_ascii=False,indent=2))
        await browser.close()

asyncio.run(main())
