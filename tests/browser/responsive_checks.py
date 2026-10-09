import asyncio, re
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/tmp/browser/responsive-v12')
OUT.mkdir(parents=True, exist_ok=True)
WIDTHS = [390, 768, 1366, 1920, 2560, 3440]

async def no_overflow(page, label):
    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), label
    assert not re.search(r'\bNaN\b|\bInfinity\b', await page.locator('body').inner_text()), label

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 1800}, timezone_id='UTC')
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.clock.install(time=datetime(2026, 10, 8, 14, 2, tzinfo=timezone.utc)) # Oct 8, 2026, 14:02 UTC
        await page.goto('http://localhost:8080', wait_until='networkidle')
        await page.locator('#gain').fill('1')
        await page.get_by_label('Aktueller Gain Einheit', exact=True).select_option('Sx')
        await page.locator('#cur').fill('37.4')
        await page.get_by_label('Aktuelle Endurance Einheit', exact=True).select_option('Sx')
        await page.locator('#tgt').fill('100')
        await page.get_by_label('Ziel-Endurance Einheit', exact=True).select_option('Sx')
        for lang in ['de', 'en']:
            await page.get_by_role('button', name='Deutsch' if lang == 'de' else 'English', exact=True).click()
            assert await page.locator('#next').input_value() == ''
            assert await page.locator('#next').get_attribute('placeholder') is None
            assert await page.get_by_test_id('progress-amount').inner_text() == ('37,4 Sx / 100 Sx · 37,4%' if lang == 'de' else '37.4 Sx / 100 Sx · 37.4%')
            finish = await page.get_by_test_id('main-finish').inner_text()
            assert '·' in finish and not re.search(r'\d{2}:\d{2}:\d{2}', finish)
            assert ('Uhr' in finish) if lang == 'de' else bool(re.search(r'AM|PM', finish))
            for width in WIDTHS:
                await page.set_viewport_size({'width': width, 'height': 1800})
                await no_overflow(page, (lang, 'simple', width))
                shell = await page.locator('.planner-shell').bounding_box()
                assert shell['width'] <= 1664
                target = await page.locator('#tgt').bounding_box()
                quick = await page.get_by_test_id('quick-targets').bounding_box()
                assert 0 <= quick['y'] - target['y'] - target['height'] < 40
                hero = page.get_by_test_id('endurance-result')
                eta = await page.get_by_test_id('main-eta').bounding_box()
                heading = await hero.locator('h2').bounding_box()
                finish_box = await page.get_by_test_id('main-finish').bounding_box()
                progress = await page.get_by_test_id('progress-amount').bounding_box()
                assert heading['y'] < eta['y'] < finish_box['y'] < progress['y']
                inputs = await page.locator('[aria-labelledby="inputs-h"]').bounding_box()
                result = await hero.bounding_box()
                assert (result['x'] > inputs['x']) if width >= 1100 else (result['y'] > inputs['y'])
                if width >= 1440: assert 0.36 < inputs['width'] / (inputs['width'] + result['width']) < 0.38
                await page.screenshot(path=str(OUT / f'{lang}-simple-{width}.png'))
            await page.locator('#next').fill('2')
            await page.get_by_label(('Nächster Gain (optional) Einheit' if lang == 'de' else 'Next Gain (optional) unit'), exact=True).select_option('Sx')
            await page.get_by_role('button', name='Weitere Tools' if lang == 'de' else 'More Tools', exact=True).click()
            tools = page.get_by_test_id('advanced-tools')
            assert await tools.locator('details:not([open])').count() == 4
            for summary in await tools.locator('summary').all(): await summary.click()
            await page.locator('#dur').fill('2')
            await page.locator('#proj').fill('3')
            for width in WIDTHS:
                await page.set_viewport_size({'width': width, 'height': 1800})
                await no_overflow(page, (lang, 'advanced-expanded', width))
            await page.get_by_role('button', name='Muscle Training', exact=True).click()
            for width in WIDTHS:
                await page.set_viewport_size({'width': width, 'height': 1800})
                await no_overflow(page, (lang, 'progression', width))
            await page.get_by_role('button', name='Law Synthesis', exact=True).click()
            await page.get_by_role('tab', name='Plan', exact=True).click()
            await page.get_by_role('button', name='Alle Ziele auf 10' if lang == 'de' else 'Set all targets to 10', exact=True).click()
            for tab in ['plan', 'settings']:
                await page.get_by_role('tab', name='Plan' if tab == 'plan' else ('Einstellungen' if lang == 'de' else 'Settings'), exact=True).click()
                if tab == 'settings':
                    details = page.locator('details').filter(has=page.locator('summary').filter(has_text='Werte pro Material bearbeiten' if lang == 'de' else 'Edit per-material rates'))
                    if await details.get_attribute('open') is None: await details.locator('summary').click()
                for width in WIDTHS:
                    await page.set_viewport_size({'width': width, 'height': 1800})
                    await no_overflow(page, (lang, 'law', tab, width))
                    if width in [390, 1920]: await page.screenshot(path=str(OUT / f'{lang}-law-{tab}-{width}.png'))
            await page.get_by_role('button', name='Endurance Planner', exact=True).click()
            await page.get_by_role('button', name='Plan', exact=True).click()
            await page.locator('#next').fill('')
        await page.locator('#cur').fill('')
        assert await page.get_by_test_id('progress-amount').inner_text() == '0 / 100 Sx · 0%'
        assert not errors, errors
        print('PASS: DE/EN, six widths, capped shell, hero hierarchy, inline targets, zero progress, compact/expanded Increase, collapsible tools, Law Plan/Settings, no overflow or runtime errors.')
        await browser.close()

asyncio.run(main())