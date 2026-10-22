# Historical v0.10 navigation; current checks: check_flat_tools.py.
"""v0.10: global pet context and camera-first memories. No real camera is claimed."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path('/data/zuoweimen/gogo')

async def main():
    results, layouts, errors=[], [], []
    async with async_playwright() as p:
        browser=await p.chromium.launch(args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':390,'height':1100},timezone_id='Asia/Shanghai')
        page.on('pageerror',lambda error:errors.append(str(error)))
        await page.goto((ROOT/'.tools/two-dog-themes-check.html').as_uri(),wait_until='domcontentloaded')
        f=page.frame_locator('iframe')
        await f.locator('[data-open-memories]').wait_for(timeout=30000)
        inner=page.frames[1]
        async def click(selector): await f.locator(selector).click()
        async def pet(value): await click(f'[data-pet="{value}"]')
        async def close(): await click('[data-sheet-close]')
        def passed(message): results.append(message);print('PASS:',message,flush=True)
        async def selected(): return await f.locator('[data-pet][aria-pressed="true"]').get_attribute('data-pet')
        async def count(kind): return int((await f.locator(f'[data-quick="{kind}"] .gg-count').text_content()).split()[1])
        async def theme(value):
            await click('[data-appearance]');await click(f'[data-theme-choice="{value}"]')
        async def layout(label):
            assert not await inner.evaluate('document.documentElement.scrollWidth>innerWidth+1'),label
            small=await f.locator('button:visible').evaluate_all('(bs)=>bs.filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent)')
            assert not small,(label,small)
            head=await f.locator('.gg-global-header').bounding_box();sheet=await f.locator('.gg-sheet').bounding_box()
            if sheet: assert head['y']+head['height']<=sheet['y']+1,(label,head,sheet)
            layouts.append(label)
        await inner.evaluate('document.fonts.ready')
        assert await f.locator('[data-pet]').count()==2
        assert await f.locator('.gg-global-header [data-pet]').count()==2
        assert await f.locator('[data-filter-pet], [data-filter-kind], [data-add-milestone]').count()==0
        await click('[data-open-memories]')
        assert await f.locator('[data-page="growth"] select').count()==0
        assert await f.locator('.gg-sheet').get_attribute('aria-modal')=='false'
        assert await f.locator('.gg-home-shell').get_attribute('inert') is not None
        assert await f.locator('.gg-global-header').get_attribute('inert') is None
        assert await f.locator('#gg-moment-camera').get_attribute('capture')=='environment'
        await pet('gelin')
        assert await f.locator('[data-page="growth"]').is_visible()
        assert '格林' in await f.locator('[data-timeline]').inner_text()
        assert '肉球' not in await f.locator('[data-timeline]').inner_text()
        # Header can be reached with keyboard without first closing the sheet.
        await f.locator('[data-sheet-close]').focus();await page.keyboard.press('Shift+Tab')
        assert await inner.evaluate('document.activeElement.dataset.pet==="gelin"')
        passed('Only the header switches pets; memory filters removed; global chrome remains interactive with keyboard access.')
        for width,height in [(320,900),(375,900),(390,900),(844,390)]:
            await page.set_viewport_size({'width':width,'height':height})
            for value in ['rouqiu','gelin']:
                await theme(value);await pet(value);await layout(f'memories {value} {width}x{height}')
        await page.set_viewport_size({'width':390,'height':1100})
        await f.locator('[data-add-story] svg').wait_for(timeout=30000)
        for value in ['rouqiu','gelin']:
            await theme(value);await pet(value)
            await f.locator('.gg-app').screenshot(path=str(ROOT/f'design/previews/{value}-memories.png'))
        await pet('rouqiu')
        fixture=str(ROOT/'design/assets/rouqiu-gelin-portraits-v1.jpg')
        # The file chooser is the desktop fallback for the capture input.
        before=await f.locator('[data-timeline] [data-record-id]').count()
        async with page.expect_file_chooser() as chooser:
            await click('[data-add-story]')
        await (await chooser.value).set_files(fixture)
        await inner.wait_for_function('(n)=>document.querySelectorAll("[data-timeline] [data-record-id]").length===n',arg=before+1)
        assert not await f.locator('[data-page="edit"]').is_visible()
        assert await f.locator('[data-timeline] .gg-album-photo').count()==1
        await pet('gelin');assert await f.locator('[data-timeline] .gg-album-photo').count()==0
        assert await f.locator('[data-feedback]').is_hidden()
        await pet('rouqiu');await click('[data-feedback-edit]')
        assert await f.locator('[data-compose-pet]').inner_text()=='肉球'
        await f.locator('#gg-diary').fill('照片之后再补一句。');await click('[data-save]')
        assert '照片之后再补一句。' in await f.locator('[data-timeline]').inner_text()
        await click('[data-undo]')
        assert '照片之后再补一句。' not in await f.locator('[data-timeline]').inner_text()
        passed('Camera action saves one photo memory directly; optional edit/undo retains owner; switching does not migrate photos.')
        before=await f.locator('[data-timeline] [data-record-id]').count()
        async with page.expect_file_chooser() as chooser: await click('[data-add-story]')
        await (await chooser.value).set_files([])
        await f.locator('#gg-moment-camera').dispatch_event('cancel')
        assert await f.locator('[data-timeline] [data-record-id]').count()==before
        async with page.expect_file_chooser() as chooser: await click('[data-add-story]')
        await (await chooser.value).set_files({'name':'broken.jpg','mimeType':'image/jpeg','buffer':b'not an image'})
        await inner.wait_for_function('document.querySelector("#gg-moment-status").textContent.includes("没能打开")')
        assert await f.locator('[data-timeline] [data-record-id]').count()==before
        passed('Cancel and corrupt camera results create no empty memories and preserve existing photos.')
        # Hold a reader callback, explicitly cancel on pet switch, then release it.
        await inner.evaluate('()=>{window.OriginalReader=FileReader;window.FileReader=class extends OriginalReader{readAsDataURL(file){window.releaseRead=()=>super.readAsDataURL(file)}};}')
        async with page.expect_file_chooser() as chooser: await click('[data-add-story]')
        await (await chooser.value).set_files(fixture)
        await pet('gelin');assert await selected()=='rouqiu'
        assert await f.locator('[data-simple-confirm]').is_visible()
        await click('[data-simple-keep]');assert await selected()=='rouqiu'
        await pet('gelin')
        await inner.evaluate('()=>{window.releaseRead();window.FileReader=window.OriginalReader;}')
        await page.wait_for_timeout(200)
        assert await f.locator('[data-timeline] [data-record-id]').count()==before
        await click('[data-simple-accept]');assert await selected()=='gelin'
        assert await f.locator('[data-timeline] .gg-album-photo').count()==0
        await pet('rouqiu');assert await f.locator('[data-timeline] [data-record-id]').count()==before
        await inner.evaluate('()=>{window.OriginalReader=FileReader;window.FileReader=class extends OriginalReader{readAsDataURL(file){window.releaseRead=()=>super.readAsDataURL(file)}};}')
        async with page.expect_file_chooser() as chooser: await click('[data-add-story]')
        await (await chooser.value).set_files(fixture)
        await pet('gelin');await inner.evaluate('()=>{window.releaseRead();window.FileReader=window.OriginalReader;}')
        await page.wait_for_timeout(200)
        assert await f.locator('[data-timeline] [data-record-id]').count()==before
        await click('[data-simple-keep]')
        await inner.wait_for_function('(n)=>document.querySelectorAll("[data-timeline] [data-record-id]").length===n',arg=before+1)
        assert await selected()=='rouqiu'
        await click('[data-undo]')
        passed('Capture waits for a pending switch decision even if decoding finishes; keep saves to the original dog, discard saves to neither.')
        await close();await click('[data-open-care]');await click('[data-compose]')
        await f.locator('#gg-diary').fill('只属于肉球的未保存内容')
        await pet('gelin');assert await selected()=='rouqiu'
        await click('[data-simple-keep]');assert await f.locator('#gg-diary').input_value()=='只属于肉球的未保存内容'
        await theme('gelin');assert await selected()=='rouqiu'
        assert await f.locator('#gg-diary').input_value()=='只属于肉球的未保存内容'
        await pet('rouqiu');assert await f.locator('[data-simple-confirm]').is_hidden()
        await pet('gelin');await click('[data-simple-accept]')
        assert await f.locator('[data-page="care"]').is_visible()
        assert '格林' in await f.locator('#gg-sheet-title').inner_text()
        await click('[data-compose]');assert await f.locator('#gg-diary').input_value()==''
        assert await f.locator('[data-compose-pet]').inner_text()=='格林'
        await click('[data-cancel]')
        for kind in ['feed','water','pee','poop','walk']:
            n=await count(kind);await click(f'[data-quick="{kind}"]');assert await count(kind)==n+1
        await pet('rouqiu');assert await count('walk')==0
        await pet('gelin');await click('[data-undo]');assert await count('walk')==0
        await click('[data-all]');assert await f.locator('[data-add-story]').is_hidden()
        assert '格林' in await f.locator('[data-timeline]').inner_text()
        await pet('rouqiu');assert '格林' not in await f.locator('[data-timeline]').inner_text()
        await close()
        passed('Draft keep/discard and theme independence; same-pet click is a no-op; quick records and history follow only the global pet.')
        await click('[data-open-tools]');await click('[data-health]');await click('[data-weight]')
        await f.locator('#gg-value').fill('12.5');await click('[data-save]')
        await pet('gelin');assert '12.5' not in await f.locator('[data-health-latest]').inner_text()
        await pet('rouqiu');assert '12.5' in await f.locator('[data-health-latest]').inner_text()
        await click('[data-health-reminders]');await click('[data-add-reminder]')
        await f.locator('#gg-reminder-title').fill('肉球的小提醒')
        await pet('gelin');await click('[data-simple-keep]');await click('[data-reminder-save]')
        await pet('gelin');assert '肉球的小提醒' not in await f.locator('[data-reminder-list]').inner_text()
        await pet('rouqiu');assert '肉球的小提醒' in await f.locator('[data-reminder-list]').inner_text()
        await close();await click('[data-open-tools]');await click('[data-open-profile]')
        assert await f.locator('[data-edit-profile]').count()==1
        await click('[data-edit-profile="rouqiu"]');await f.locator('#gg-pet-note').fill('肉球的新特点')
        await pet('gelin');await click('[data-simple-keep]');await click('[data-pet-save]')
        await pet('gelin');assert await f.locator('[data-edit-profile]').get_attribute('data-edit-profile')=='gelin'
        assert '肉球的新特点' not in await f.locator('[data-profile-cards]').inner_text()
        await pet('rouqiu');assert '肉球的新特点' in await f.locator('[data-profile-cards]').inner_text()
        await close()
        passed('Health, reminders and the single current-pet profile refresh in place; their edits retain the original owner.')
        await click('[data-open-gallery]');await f.locator('#gg-gallery-files').set_input_files(fixture)
        await f.locator('[data-gallery-list] article').wait_for();await pet('gelin')
        assert await f.locator('[data-page="gallery"]').is_visible()
        assert await f.locator('[data-gallery-list] article').count()==0
        assert await f.locator('[data-gallery-owner]').inner_text()=='格林'
        await pet('rouqiu');assert await f.locator('[data-gallery-list] article').count()==1
        await close();await click('[data-open-tools]');await click('[data-open-play]')
        await click('.gg-portrait');await pet('gelin')
        assert await f.locator('[data-page="play"]').is_visible()
        assert await f.locator('.gg-portrait').get_attribute('data-dog')=='gelin'
        assert await f.locator('.gg-hero').get_attribute('data-action')=='rest'
        await close()
        passed('Photo manager and animated dog follow the header in place; old action timers cannot paint the previous dog.')
        for value in ['rouqiu','gelin']:
            await theme(value);await pet(value);await click('[data-open-care]');await layout(f'care {value}')
            await click('[data-compose]');await layout(f'editor {value}');await close()
        await page.emulate_media(reduced_motion='reduce');await click('[data-open-memories]');await pet('rouqiu')
        assert await selected()=='rouqiu';await close()
        assert not errors,errors
        report={'version':'global pet context v0.10','checks':results,'layouts':layouts,'runtimeErrors':errors,'camera':'Desktop file chooser and capture attribute verified; physical iOS camera, permission denial, HEIC and persistent storage not verified.'}
        (ROOT/'design/previews/global-pet-browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps(report,ensure_ascii=False,indent=2));await browser.close()

asyncio.run(main())
