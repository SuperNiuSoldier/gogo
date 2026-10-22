"""v0.12 photo scrapbook layout, real weight data and reference-driven visuals."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path('/data/zuoweimen/gogo')

async def main():
    checks,layouts,errors=[],[],[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':390,'height':1000},timezone_id='Asia/Shanghai')
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto((ROOT/'.tools/two-dog-themes-check.html').as_uri(),wait_until='domcontentloaded')
        f=page.frame_locator('iframe');inner=page.frames[1]
        async def click(s):await f.locator(s).click()
        async def theme(value):await click('[data-appearance]');await click(f'[data-theme-choice="{value}"]')
        async def pet(value):await click(f'[data-pet="{value}"]')
        async def close():await click('[data-sheet-close]')
        async def back():await click('[data-sheet-back]')
        async def screenshot(name):
            await page.mouse.move(0,0);await f.locator('.gg-app').screenshot(path=str(ROOT/f'design/previews/{name}.png'))
        async def layout(label):
            assert not await inner.evaluate('document.documentElement.scrollWidth>innerWidth+1'),label
            small=await f.locator('button:visible,summary:visible').evaluate_all('(els)=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.9||r.height<43.9}).map(e=>e.textContent)')
            assert not small,(label,small)
            layouts.append(label)
        def passed(message):checks.append(message);print('PASS',message,flush=True)

        await f.locator('[data-open-tools] svg').wait_for();await inner.evaluate('document.fonts.ready')
        await inner.wait_for_function('()=>{const c=document.querySelector(".gg-cover-dog canvas");return c.getContext("2d").getImageData(160,160,1,1).data[3]>200}')
        for width,height in [(320,900),(375,900),(390,900),(844,390)]:
            await page.set_viewport_size({'width':width,'height':height})
            for value in ['rouqiu','gelin']:
                await theme(value);await pet(value);await layout(f'home {value} {width}x{height}')
                assert await f.locator('.gg-cover-dog canvas').get_attribute('data-rendered-dog')==value
                assert await f.locator('[data-gallery-label]').inner_text()=='演示插画'
                assert '月' in await f.locator('[data-cover-date]').inner_text()
                await click('[data-open-memories]');await layout(f'memories {value} {width}x{height}')
                card=f.locator('.gg-album-card').first
                assert await card.evaluate('e=>getComputedStyle(e).display')=='grid'
                assert await card.locator('canvas').get_attribute('data-rendered-dog')==value
                boxes=await card.evaluate('e=>{const a=e.querySelector(".gg-record-main").getBoundingClientRect(),b=e.querySelector(".gg-album-illustration").getBoundingClientRect();return {textRight:a.right,imageLeft:b.left}}')
                assert boxes['textRight']<=boxes['imageLeft'],boxes
                await close()
        await page.set_viewport_size({'width':390,'height':1000})
        for value in ['rouqiu','gelin']:
            await theme(value);await pet(value);await screenshot(f'{value}-paper-home')
            await click('[data-open-tools]');await screenshot(f'{value}-paper-tools');await close()
            await click('[data-open-memories]');await screenshot(f'{value}-paper-memories');await close()
            await click('[data-open-care]');await screenshot(f'{value}-paper-care');await close()
        passed('Both distinct dog cutouts render; paper home and side-by-side memory cards fit 320–844px without overlapping text or controls.')

        await pet('rouqiu');await click('[data-open-tools]');await click('[data-tool-kind="weight"]')
        assert await f.locator('[data-weight-plot]').is_hidden();assert '还没有体重' in await f.locator('[data-weight-summary]').inner_text()
        await f.locator('#gg-value').fill('22.4')
        assert await f.locator('[data-weight-plot]').is_hidden()
        await click('[data-edit-options] summary')
        past=await inner.evaluate('()=>{const d=new Date(Date.now()-2*86400000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}')
        await f.locator('#gg-time').fill(past);await click('[data-save]');await click('[data-tool-kind="weight"]')
        assert await f.locator('[data-weight-plot]').get_attribute('data-count')=='1'
        assert await f.locator('[data-weight-plot]').is_visible()
        assert await f.locator('[data-weight-plot] circle').count()==1
        assert await f.locator('[data-weight-plot] path').count()==0
        await f.locator('#gg-value').fill('22.8');await click('[data-save]');await click('[data-tool-kind="weight"]')
        assert await f.locator('[data-weight-plot]').get_attribute('data-count')=='2'
        assert '增加 0.4' in await f.locator('[data-weight-summary]').inner_text()
        assert await f.locator('[data-weight-plot] path').count()==1
        await f.locator('#gg-value').fill('22.6');await click('[data-save]');await click('[data-tool-kind="weight"]')
        assert '减少 0.2' in await f.locator('[data-weight-summary]').inner_text()
        assert await f.locator('.gg-weight-row').count()==3
        assert '22.6' in await f.locator('.gg-weight-row').first.inner_text()
        for value in ['rouqiu','gelin']:
            await theme(value);await page.set_viewport_size({'width':320,'height':1000});await layout(f'weight {value} 320')
            assert await f.locator('[data-weight-plot]').get_attribute('data-owner')=='rouqiu'
            assert await f.locator('[data-weight-plot]').is_visible()
            assert (await f.locator('[data-weight-plot]').bounding_box())['height']>=180
        await page.set_viewport_size({'width':390,'height':1000})
        await f.locator('[data-weight-context] h3').evaluate('e=>e.textContent="体重变化 · 示例"')
        await f.locator('[data-weight-context]').evaluate('e=>e.scrollIntoView({block:"end"})')
        await screenshot('paper-weight-test-data')
        await pet('gelin');await click('[data-tool-kind="weight"]')
        assert await f.locator('[data-weight-plot]').is_hidden()
        await back();await pet('rouqiu');await click('[data-tool-kind="weight"]')
        assert await f.locator('[data-weight-plot]').get_attribute('data-count')=='3'
        await back();await click('[data-undo]');await click('[data-tool-kind="weight"]')
        assert await f.locator('[data-weight-plot]').get_attribute('data-count')=='2'
        passed('Weight view uses saved values only: empty state, one point, ordered trend, exact differences, per-dog isolation and undo all pass.')

        await back();await click('[data-open-profile]');await f.locator('#gg-pet-name').fill('测试一下长名字的显示情况');await click('[data-pet-save]');await close()
        await page.set_viewport_size({'width':320,'height':900});await layout('long pet name 320')
        assert await f.locator('[data-gallery-name]').get_attribute('data-tooltip')=='测试一下长名字的显示情况'
        await click('[data-open-tools]');await click('[data-open-profile]');await f.locator('#gg-pet-name').fill('肉球');await click('[data-pet-save]');await close()
        passed('Long pet names retain their full text alternative and fit the cover at small widths.')

        await click('[data-open-gallery]');fixture=str(ROOT/'design/assets/rouqiu-gelin-portraits-v1.jpg')
        await f.locator('#gg-gallery-files').set_input_files([fixture,fixture])
        await inner.wait_for_function('document.querySelectorAll("[data-gallery-list] img").length===2')
        await close();assert await f.locator('[data-gallery-demo]').is_hidden()
        assert await f.locator('[data-gallery-image]').is_visible()
        await layout('selected photos 320');await click('[data-gallery-next]')
        assert await f.locator('[data-gallery-position]').inner_text()=='2 / 2'
        await pet('gelin');assert await f.locator('[data-gallery-demo]').is_visible();await pet('rouqiu')
        assert await f.locator('[data-gallery-position]').inner_text()=='2 / 2'
        await page.emulate_media(reduced_motion='reduce');await click('[data-gallery-prev]');assert await f.locator('[data-gallery-position]').inner_text()=='1 / 2'
        passed('User photo selection replaces only that dog’s illustration; manual flow, saved position and reduced-motion controls remain usable.')
        assert not errors,errors
        report={'version':'v0.12','checks':checks,'layouts':layouts,'runtimeErrors':errors,'weightScreenshot':'Synthetic browser inputs, visibly marked test data; not actual dog weights.'}
        (ROOT/'design/previews/paper-photo-browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        await browser.close()

asyncio.run(main())
