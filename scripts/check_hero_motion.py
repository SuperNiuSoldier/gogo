"""Historical v0.7 checks; use its archived preview. Current: check_sprite_animation.py."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path('/data/zuoweimen/gogo')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width':736,'height':1100}, timezone_id='Asia/Shanghai')
        page.set_default_timeout(10000)
        errors, layouts = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto((ROOT/'.tools/two-dog-themes-check.html').as_uri())
        f = page.frame_locator('iframe')
        await f.locator('.gg-app').wait_for()
        inner = page.frames[1]
        await inner.evaluate('document.fonts.ready')

        async def click(selector):
            await f.locator(selector).click()

        async def theme(value):
            await click('[data-appearance]')
            await click(f'[data-theme-choice="{value}"]')

        async def running():
            await f.locator('.gg-hero[data-motion="running"]').wait_for()

        async def art_style(property):
            return await f.locator('.gg-dog-art').evaluate('(el,p)=>getComputedStyle(el)[p]',property)

        await running()
        counts = await f.locator('.gg-count').all_text_contents()
        for dog in ['rouqiu','gelin']:
            await click(f'[data-pet="{dog}"]')
            await running()
            assert dog in await art_style('animationName')
            first = await art_style('transform')
            await page.wait_for_timeout(450)
            assert first != await art_style('transform')
            await click('.gg-portrait')
            assert await f.locator('.gg-hero').get_attribute('data-petted') == 'true'
            response = await f.locator('[data-pet-response]').inner_text()
            assert response == ('再摸摸我嘛' if dog=='rouqiu' else '嘿嘿，我在呢')
            # Repeated taps keep one short response; only the portrait responds.
            await f.locator('.gg-portrait').evaluate('(b)=>{b.click();b.click()}')
            assert response == await f.locator('[data-pet-response]').inner_text()
            await click('[data-motion-toggle]')
            assert await f.locator('.gg-hero').get_attribute('data-petted') is None
            assert await art_style('animationPlayState') == 'paused'
            await page.wait_for_timeout(80)
            frozen = await art_style('transform')
            await page.wait_for_timeout(250)
            assert frozen == await art_style('transform')
            await click('.gg-portrait')
            assert response == await f.locator('[data-pet-response]').inner_text()
            assert await f.locator('.gg-hero').get_attribute('data-petted') is None
            await click('[data-motion-toggle]')
            await running()
        await click('[data-pet="rouqiu"]')
        assert counts == await f.locator('.gg-count').all_text_contents()
        await theme('gelin')
        assert await f.locator('.gg-portrait').get_attribute('data-dog') == 'rouqiu'
        assert (await art_style('backgroundPosition')).startswith('0%')
        await click('[data-pet="gelin"]')
        await theme('rouqiu')
        assert (await art_style('backgroundPosition')).startswith('100%')
        # Cancel the previous dog's response immediately when switching pets.
        await click('.gg-portrait')
        await click('[data-pet="rouqiu"]')
        assert await f.locator('[data-pet-response]').inner_text() == '点它，摸摸头'
        # Backgrounded or offscreen components do not keep running.
        await click('[data-nav="growth"]')
        assert await art_style('animationPlayState') == 'paused'
        await click('[data-nav="today"]')
        await running()
        await inner.evaluate('()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))}')
        assert await art_style('animationPlayState') == 'paused'
        await inner.evaluate('()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))}')
        await running()
        # Reduced-motion changes take effect without a reload; tapping remains meaningful.
        await page.emulate_media(reduced_motion='reduce')
        assert await art_style('animationName') == 'none'
        assert await f.locator('[data-motion-toggle]').is_disabled()
        await click('.gg-portrait')
        assert await f.locator('[data-pet-response]').inner_text() == '再摸摸我嘛'
        assert await f.locator('.gg-hero').get_attribute('data-petted') is None
        await page.emulate_media(reduced_motion='no-preference')
        await running()
        # Native button keyboard activation and persistence of pause preference.
        await f.locator('.gg-portrait').focus()
        await page.keyboard.press('Enter')
        assert await f.locator('.gg-hero').get_attribute('data-petted') == 'true'
        await click('[data-motion-toggle]')
        await theme('gelin')
        assert await art_style('animationPlayState') == 'paused'
        await page.reload()
        await f.locator('.gg-app').wait_for()
        inner = page.frames[1]
        assert await f.locator('[data-motion-toggle]').get_attribute('aria-label') == '播放狗狗动态'
        await click('[data-motion-toggle]')
        for width,height in [(320,900),(375,900),(390,900),(844,390)]:
            await page.set_viewport_size({'width':width,'height':height})
            for dog in ['rouqiu','gelin']:
                await theme(dog)
                await click(f'[data-pet="{dog}"]')
                assert not await inner.evaluate('document.documentElement.scrollWidth>innerWidth+1')
                bounds = await f.locator('.gg-hero button').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
                assert all(b['w']>=44 and b['h']>=44 for b in bounds)
                a,b = bounds
                assert a['x']+a['w']<=b['x']+1 or b['x']+b['w']<=a['x']+1 or a['y']+a['h']<=b['y']+1 or b['y']+b['h']<=a['y']+1, bounds
                layouts.append(f'{dog} {width}x{height}')
        await page.set_viewport_size({'width':736,'height':1100})
        for dog in ['rouqiu','gelin']:
            await theme(dog)
            await click(f'[data-pet="{dog}"]')
            await f.locator('.gg-app').screenshot(path=str(ROOT/f'design/previews/{dog}-home.png'))
        assert not errors, errors
        report={'version':'hero motion v0.7','checks':['two distinct idle motions','tap response and repeated taps','pause freezes motion and cancels reaction','paused interaction keeps text response','pet switch clears reaction','theme does not change pet artwork','petting creates no care records','off-page pause','document visibility pause (simulated)','live reduced-motion preference','keyboard activation','pause preference restored','non-overlapping 44px controls'],'layouts':layouts,'javascriptErrors':errors,'nativeIOSVerified':False,'characterRigImplemented':False}
        (ROOT/'design/previews/motion-browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(report,ensure_ascii=False))
        await browser.close()

asyncio.run(main())
