# Historical v0.8 layout checks; current v0.9 entry points: check_photo_home.py.
"""Verify articulated pose playback and stable UI, rather than image transforms."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path('/data/zuoweimen/gogo')

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':736,'height':1100},timezone_id='Asia/Shanghai')
        page.set_default_timeout(12000)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto((ROOT/'.tools/two-dog-themes-check.html').as_uri(),wait_until='domcontentloaded',timeout=30000)
        f=page.frame_locator('iframe')
        await f.locator('.gg-hero[data-motion="running"]').wait_for(timeout=30000)
        inner=page.frames[1]
        await inner.evaluate('document.fonts.ready')

        async def click(selector):
            await f.locator(selector).click()

        async def theme(dog):
            await click('[data-appearance]')
            await click(f'[data-theme-choice="{dog}"]')

        async def pose(index):
            await inner.wait_for_function('(index)=>document.querySelector(".gg-hero").dataset.frame===String(index)',arg=index,polling=10)

        async def still():
            await f.locator('.gg-hero[data-action="rest"][data-frame="0"]').wait_for()

        async def pixels():
            return await f.locator('.gg-dog-canvas').evaluate('(c)=>c.toDataURL()')

        # Waiting produces an actual closed-eye frame, then restores the neutral pose.
        neutral=await pixels()
        await inner.wait_for_function('()=>{const h=document.querySelector(".gg-hero");return h.dataset.action==="blink"&&h.dataset.frame==="2"}',polling=10)
        assert neutral!=await pixels()
        await still()
        assert neutral==await pixels()
        await click('[data-motion-toggle]')
        for dog in ['rouqiu','gelin']:
            await click(f'[data-pet="{dog}"]')
            await f.locator(f'.gg-dog-canvas[data-dog="{dog}"]').wait_for()
            baseline=await f.locator('.gg-count').all_text_contents()
            neutral=await pixels()
            bounds=await f.locator('.gg-portrait').bounding_box()
            await f.locator('.gg-hero').screenshot(path=str(ROOT/f'design/previews/{dog}-character-rest.png'))
            # Pausing the idle blink still permits a deliberate click action.
            await click('.gg-portrait')
            await f.locator('.gg-hero[data-action="greeting"]').wait_for()
            await f.locator('.gg-portrait').evaluate('(b)=>{b.click();b.click();b.click()}')
            await pose(7)
            assert neutral!=await pixels()
            assert await f.locator('.gg-portrait').bounding_box()==bounds
            assert await f.locator('.gg-dog-canvas').evaluate('(el)=>getComputedStyle(el).transform')=='none'
            assert await f.locator('.gg-portrait').evaluate('(el)=>getComputedStyle(el).transform')=='none'
            await f.locator('.gg-hero').screenshot(path=str(ROOT/f'design/previews/{dog}-character-wave.png'))
            await still()
            assert neutral==await pixels()
            assert baseline==await f.locator('.gg-count').all_text_contents()
            # Frames are source poses, not CSS keyframe movement of one raster.
            assert await f.locator('.gg-dog-canvas').evaluate('(c)=>c.getAnimations().length')==0
            await click('.gg-portrait')
            await pose(5)
            await theme('gelin' if dog=='rouqiu' else 'rouqiu')
            assert await f.locator('.gg-dog-canvas').get_attribute('data-dog')==dog
            await still()

        # A new pet cancels both the old frames and their delayed completion callbacks.
        await click('[data-pet="rouqiu"]')
        await click('.gg-portrait')
        await pose(5)
        await click('[data-pet="gelin"]')
        await still()
        gelin_neutral=await pixels()
        await page.wait_for_timeout(2200)
        assert gelin_neutral==await pixels()
        # Navigation and actual viewport visibility cancel playback cleanly.
        await click('.gg-portrait')
        await pose(5)
        await click('[data-nav="growth"]')
        assert await f.locator('.gg-hero').get_attribute('data-motion')=='suspended'
        assert await f.locator('.gg-hero').get_attribute('data-frame')=='0'
        await click('[data-nav="today"]')
        await click('[data-motion-toggle]')
        await page.set_viewport_size({'width':375,'height':300})
        await f.locator('[data-nav="profile"]').scroll_into_view_if_needed()
        await f.locator('.gg-hero[data-motion="suspended"]').wait_for()
        await f.locator('.gg-hero').scroll_into_view_if_needed()
        await f.locator('.gg-hero[data-motion="running"]').wait_for()
        await page.set_viewport_size({'width':736,'height':1100})
        await click('.gg-portrait')
        await pose(5)
        await inner.evaluate('()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))}')
        await f.locator('.gg-hero[data-motion="suspended"]').wait_for()
        assert await f.locator('.gg-hero').get_attribute('data-action')=='rest'
        await inner.evaluate('()=>{delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))}')
        # A live accessibility preference change cancels frames, including during a greeting.
        await click('.gg-portrait')
        await pose(5)
        await page.emulate_media(reduced_motion='reduce')
        await f.locator('.gg-hero[data-motion="reduced"]').wait_for()
        await still()
        await click('.gg-portrait')
        assert await f.locator('.gg-hero').get_attribute('data-frame')=='0'
        assert await f.locator('[data-pet-response]').inner_text()=='你好呀，我在呢'
        await page.emulate_media(reduced_motion='no-preference')
        await f.locator('.gg-portrait').focus()
        await page.keyboard.press('Enter')
        await f.locator('.gg-hero[data-action="greeting"]').wait_for()
        await still()
        await click('[data-motion-toggle]')
        await page.reload(wait_until='domcontentloaded',timeout=30000)
        await f.locator('.gg-hero[data-motion="paused"]').wait_for(timeout=30000)
        inner=page.frames[1]
        await inner.evaluate('document.fonts.ready')
        assert await f.locator('[data-motion-toggle]').get_attribute('aria-label')=='播放待机动作'
        layouts=[]
        for width,height in [(320,900),(375,900),(390,900),(844,390)]:
            await page.set_viewport_size({'width':width,'height':height})
            for dog in ['rouqiu','gelin']:
                await theme(dog)
                await click(f'[data-pet="{dog}"]')
                assert not await inner.evaluate('document.documentElement.scrollWidth>innerWidth+1')
                small=await f.locator('button:visible').evaluate_all('(bs)=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent)')
                assert not small,small
                # No control overlaps the moving character's fixed hit area.
                a,b=await f.locator('.gg-hero button').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
                assert a['x']+a['w']<=b['x']+1 or a['y']+a['h']<=b['y']+1
                layouts.append(f'{dog} {width}x{height}')
        assert not errors,errors
        report={'version':'articulated sprites v0.8','checks':['idle blink changes pixels and restores neutral','click plays articulated paw poses','no whole-image CSS transforms','card and hitbox stay fixed','repeat taps do not queue greetings','paused idle still permits clicked action','theme does not swap character','pet switch cancels old callbacks','petting creates no records','off-page cancellation','real offscreen pause','background pause (simulated)','live reduced motion','keyboard activation','idle pause preference restored'],'layouts':layouts,'javascriptErrors':errors,'nativeIOSVerified':False,'sourceFramesVisuallyReviewed':True}
        (ROOT/'design/previews/sprite-browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(report,ensure_ascii=False))
        await browser.close()

asyncio.run(main())
