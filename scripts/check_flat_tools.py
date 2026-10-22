"""v0.11 flat feature menu and compact forms; browser prototype only."""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path('/data/zuoweimen/gogo')

async def main():
    checks, layouts, errors = [], [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width':390,'height':900}, timezone_id='Asia/Shanghai')
        page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto((ROOT/'.tools/two-dog-themes-check.html').as_uri(), wait_until='domcontentloaded')
        f=page.frame_locator('iframe');inner=page.frames[1]
        async def click(s):await f.locator(s).click()
        async def visible(name):assert await f.locator(f'[data-page="{name}"]').is_visible(),name
        async def back():await click('[data-sheet-back]')
        async def close():await click('[data-sheet-close]')
        async def theme(value):
            await click('[data-appearance]');await click(f'[data-theme-choice="{value}"]')
        async def selected():return await f.locator('[data-pet][aria-pressed="true"]').get_attribute('data-pet')
        def passed(message):checks.append(message);print('PASS',message,flush=True)
        async def layout(label):
            assert not await inner.evaluate('document.documentElement.scrollWidth>innerWidth+1'),label
            small=await f.locator('button:visible,summary:visible').evaluate_all('(els)=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44}).map(e=>e.textContent)')
            assert not small,(label,small)
            layouts.append(label)

        await click('[data-open-tools]')
        labels=await f.locator('.gg-tools-grid button').all_text_contents()
        assert [s.strip() for s in labels]==['体重','疫苗','驱虫','用药','就诊','洗护','训练','第一次','自定义','提醒','档案','陪玩']
        assert await f.locator('[data-page="health"],[data-page="profile"],[data-page="more"],[data-story],[data-health],[data-memories]').count()==0
        for width,height in [(320,900),(375,900),(390,900),(844,390)]:
            await page.set_viewport_size({'width':width,'height':height})
            for value in ['rouqiu','gelin']:
                await theme(value);await layout(f'tools {value} {width}x{height}')
                assert await f.locator('.gg-tools-grid button:visible').count()==12
                assert await f.locator('.gg-tools-grid').evaluate('e=>e.getBoundingClientRect().height<370')
        await page.set_viewport_size({'width':390,'height':900})
        await f.locator('[data-tool-kind="weight"] svg').wait_for();await inner.evaluate('document.fonts.ready')
        for value in ['rouqiu','gelin']:
            await theme(value);await click(f'[data-pet="{value}"]');await page.mouse.move(0,0)
            await f.locator('.gg-app').screenshot(path=str(ROOT/f'design/previews/{value}-tools.png'))
        passed('Twelve labeled features are visible together; duplicate overview pages and story entries removed; both themes fit small screens.')

        await click('[data-pet="rouqiu"]')
        for kind in ['weight','vaccine','deworm','medication','vet','bath','training','milestone','custom']:
            await click(f'[data-tool-kind="{kind}"]');await visible('edit')
            assert await f.locator('[data-page="edit"] select[data-pet]').count()==0
            assert not await f.locator('[data-edit-options]').evaluate('e=>e.open')
            assert await f.locator('#gg-time').is_hidden()
            if kind=='weight':
                assert await f.locator('#gg-diary').is_hidden()
                for value in ['rouqiu','gelin']:
                    await theme(value);await layout(f'weight {value}')
                await page.mouse.move(0,0);await f.locator('.gg-app').screenshot(path=str(ROOT/'design/previews/weight-simple.png'))
                await click('[data-save]');assert '实际体重' in await f.locator('#gg-error').inner_text()
                await f.locator('#gg-value').fill('9.8')
            elif kind=='bath':
                await f.locator('#gg-groom-kind').select_option('groom')
            else:
                if kind in ['vaccine','deworm','medication','vet','milestone','custom']:
                    await click('[data-save]');await visible('edit');assert await f.locator('#gg-error').inner_text()
                await f.locator('#gg-diary').fill('测试记录内容')
            await click('[data-save]');await visible('tools')
            assert await f.locator('[data-feedback]').is_visible()
        passed('All nine record entries open the form directly; required values validated, wash/groom share one entry, save returns to the menu.')

        await click('[data-tool-kind="weight"]');await f.locator('#gg-value').fill('10.5')
        await click('[data-edit-options] summary')
        future=await inner.evaluate("()=>{const d=new Date(Date.now()+86400000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}")
        await f.locator('#gg-time').fill(future);await click('[data-edit-options] summary');await click('[data-save]')
        assert await f.locator('[data-edit-options]').evaluate('e=>e.open')
        assert await inner.evaluate('document.activeElement.id==="gg-time"')
        await back();assert await f.locator('[data-confirm]').is_visible();await click('[data-keep]')
        assert await f.locator('#gg-value').input_value()=='10.5'
        await click('[data-pet="gelin"]');await click('[data-simple-keep]');assert await selected()=='rouqiu'
        await click('[data-pet="gelin"]');await click('[data-simple-accept]');await visible('tools');assert await selected()=='gelin'
        await click('[data-tool-kind="weight"]');assert await f.locator('#gg-value').input_value()=='';await back()
        passed('Hidden invalid fields expand and receive focus; back/keep/discard and global pet switching protect unfinished records.')

        await click('[data-open-profile]');await visible('pet-edit')
        assert await f.locator('#gg-pet-birthday').is_hidden()
        await f.locator('#gg-pet-name').fill('格林测试');await click('[data-pet-save]');await visible('tools')
        assert '格林测试' in await f.locator('[data-pet="gelin"]').inner_text()
        await click('[data-open-profile]');await click('[data-profile-options] summary');await f.locator('#gg-pet-birthday').fill('2099-01-01')
        await click('[data-profile-options] summary');await click('[data-pet-save]')
        assert await f.locator('[data-profile-options]').evaluate('e=>e.open')
        await back();await click('[data-simple-accept]');await visible('tools')
        await click('[data-pet="rouqiu"]');await click('[data-open-profile]');assert await f.locator('#gg-pet-name').input_value()=='肉球';await back()
        passed('Profile opens for direct editing, optional fields stay folded, validation reveals errors, and names remain attached to the correct dog.')

        await click('[data-open-reminders]');await click('[data-add-reminder]');await visible('reminder-edit')
        assert await f.locator('#gg-reminder-kind').is_hidden();assert await f.locator('#gg-reminder-repeat').is_hidden()
        for value in ['rouqiu','gelin']:
            await theme(value);await layout(f'reminder {value}')
        await f.locator('#gg-reminder-title').fill('买狗粮');await click('[data-reminder-save]');await visible('reminders')
        await click('[data-reminder-done]');await visible('reminders');assert await f.locator('[data-reminder-done]').count()==0
        await click('[data-undo]');assert await f.locator('[data-reminder-done]').count()==1
        await click('[data-reminder-edit]');await f.locator('#gg-reminder-kind').select_option('vaccine');await click('[data-reminder-save]')
        await click('[data-reminder-done]');await visible('edit');await click('[data-save]');await visible('edit')
        await f.locator('#gg-diary').fill('疫苗实际记录');await click('[data-save]');await visible('reminders')
        await click('[data-undo]');await back();await visible('tools')
        passed('Reminder creation shows two essential fields; general completion is immediate and reversible, while health completion still requires actual details.')

        await close();await click('[data-open-care]');await click('[data-quick="water"]')
        await click('[data-more]');await visible('tools');await back();await visible('care')
        await click('[data-all]');await visible('growth')
        assert await f.locator('[data-timeline] [data-kind="weight"]').count()==1
        assert await f.locator('[data-timeline] [data-kind="groom"]').count()==1
        assert await f.locator('[data-timeline] [data-kind="water"]').count()==1
        await click('[data-timeline] [data-kind="weight"]');await f.locator('#gg-value').fill('10');await click('[data-save]')
        assert await f.locator('[data-timeline] [data-kind="weight"]').count()==1
        await click('[data-undo]');assert '9.8' in await f.locator('[data-timeline] [data-kind="weight"]').inner_text()
        await click('[data-pet="gelin"]');assert await f.locator('[data-timeline] [data-kind="weight"]').count()==0
        passed('Quick recording, shared menu back navigation and complete history retain every category; editing/undo and dog ownership remain correct.')

        await close();await click('[data-open-memories]')
        assert await f.locator('[data-add-story]').inner_text()=='照相 · 留个瞬间'
        before=await f.locator('[data-timeline] [data-record-id]').count()
        async with page.expect_file_chooser() as chooser:await click('[data-add-story]')
        await (await chooser.value).set_files(str(ROOT/'design/assets/rouqiu-gelin-portraits-v1.jpg'))
        await inner.wait_for_function('(n)=>document.querySelectorAll("[data-timeline] [data-record-id]").length===n',arg=before+1)
        await close();await click('[data-open-tools]');await click('[data-open-play]');await visible('play')
        await page.emulate_media(reduced_motion='reduce');await click('[data-pet="rouqiu"]');await back();await visible('tools')
        passed('Photo memories and the separate animated dog remain reachable; reduced-motion switching and returning work.')
        assert not errors,errors
        report={'version':'v0.11','checks':checks,'layouts':layouts,'runtimeErrors':errors}
        (ROOT/'design/previews/flat-tools-browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        await browser.close()

asyncio.run(main())
