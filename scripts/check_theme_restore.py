"""Preview theme recovery, independent pet selection and draft preservation."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path('/data/zuoweimen/gogo')

async def main():
    checks, errors = [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width':390, 'height':950})
        page.on('pageerror', lambda error: errors.append(str(error)))
        await page.goto((ROOT/'.tools/two-dog-themes-check.html').as_uri(), wait_until='domcontentloaded')
        f = page.frame_locator('iframe')
        await f.locator('[data-appearance]').wait_for()
        inner = page.frames[1]

        async def theme(value):
            await f.locator('[data-appearance]').click()
            await f.locator(f'[data-theme-choice="{value}"]').click()

        async def restore(state):
            await inner.evaluate("state=>window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:state}}}))", state)

        async def selected():
            return await f.locator('[data-pet][aria-pressed="true"]').get_attribute('data-pet')

        await inner.evaluate('window.openai.setWidgetState=async state=>{window.savedThemeState=state;}')
        await theme('gelin')
        assert await f.locator('.gg-app').get_attribute('data-theme') == 'gelin'
        assert await f.locator('.gg-app').evaluate('(e)=>getComputedStyle(e).backgroundColor') == 'rgb(23, 25, 27)'
        saved = await inner.evaluate('window.savedThemeState')
        assert saved['privateContent']['theme'] == 'gelin'
        checks.append('Dark theme button renders the dark palette and saves the selection.')

        await page.reload(wait_until='domcontentloaded')
        await f.locator('[data-appearance]').wait_for()
        inner = page.frames[1]
        await restore(saved)
        assert await f.locator('.gg-app').get_attribute('data-theme') == 'gelin'
        checks.append('Saved theme restores after reload.')

        await f.locator('[data-pet="gelin"]').click()
        for state in [{'privateContent':{'theme':'gelin'}}, {'theme':'格林'}, {'theme':'gelin'}, {'modelContent':{'theme':'格林'}}]:
            await theme('rouqiu')
            await restore(state)
            assert await f.locator('.gg-app').get_attribute('data-theme') == 'gelin', state
            assert await selected() == 'gelin', state
        checks.append('Private, flat and model theme states restore without resetting the selected dog.')

        for state in [None, {}, {'privateContent':{'galleryPaused':True}}, {'theme':'unknown'}, {'privateContent':{'theme':'unknown','pet':'unknown'}}]:
            await restore(state)
            assert await f.locator('.gg-app').get_attribute('data-theme') == 'gelin', state
            assert await selected() == 'gelin', state
        checks.append('Missing or invalid fields preserve the active theme and pet.')

        await f.locator('[data-open-care]').click()
        await f.locator('[data-compose]').click()
        await f.locator('#gg-diary').fill('格林的草稿')
        await restore({'privateContent':{'theme':'rouqiu','pet':'rouqiu'}})
        assert await f.locator('.gg-app').get_attribute('data-theme') == 'rouqiu'
        assert await selected() == 'gelin'
        assert await f.locator('#gg-diary').input_value() == '格林的草稿'
        await restore({'theme':'格林'})
        assert await f.locator('.gg-app').get_attribute('data-theme') == 'gelin'
        assert await f.locator('#gg-diary').input_value() == '格林的草稿'
        checks.append('Theme restoration leaves an open draft and its dog unchanged.')

        assert not errors, errors
        report = {'checks': checks, 'runtimeErrors': errors}
        (ROOT/'design/previews/theme-restore-browser-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
        print(json.dumps(report, ensure_ascii=False, indent=2))
        await browser.close()

asyncio.run(main())
