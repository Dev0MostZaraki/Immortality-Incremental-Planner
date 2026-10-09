import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/static-mt')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':1280,'height':1800},permissions=['clipboard-read','clipboard-write'])
  page=await context.new_page(); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080',wait_until='networkidle')
  await page.locator('#gain').fill('2');await page.get_by_label('Aktueller Gain Einheit',exact=True).select_option('Sx')
  await page.locator('#tgt').fill('1000');await page.get_by_label('Ziel-Endurance Einheit',exact=True).select_option('Sx')
  await page.get_by_role('button',name='Muscle Training',exact=True).click()
  mt=page.get_by_test_id('mt-model')
  assert await mt.locator('input').count()==1
  assert await mt.get_by_role('switch').count()==0
  await page.locator('#mt-level').fill('60')
  assert 'Geschätzter Spielpreis' in await page.get_by_test_id('mt-cost-source').inner_text()
  preview=page.get_by_test_id('mt-preview')
  assert await preview.locator('input,select').count()==0
  assert await preview.get_by_role('button',name=re.compile('3|5|10')).count()==0
  assert await preview.locator('tbody tr[data-best]').count()==1
  await page.get_by_role('button',name='Angezeigten Spielpreis verwenden',exact=True).click()
  await page.locator('#mt-mtDisplayedCost').fill('21.54')
  await mt.get_by_label('Angezeigter Preis des nächsten Kaufs Einheit',exact=True).select_option('Sx')
  assert 'Angezeigte' in await page.get_by_test_id('mt-cost-source').inner_text()
  assert '21,54 Sx' in await preview.locator('tbody tr').nth(1).inner_text()
  await page.get_by_role('button',name='English',exact=True).click()
  assert 'Using displayed game cost' in await page.get_by_test_id('mt-cost-source').inner_text()
  assert 'Next Levels' in await preview.inner_text()
  for lang in ['en','de']:
   await page.get_by_role('button',name='English' if lang=='en' else 'Deutsch',exact=True).click()
   for width in [390,768,1366,1920,2560,3440]:
    await page.set_viewport_size({'width':width,'height':1800})
    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(lang,width)
    assert not re.search(r'\bNaN\b|\bInfinity\b',await page.locator('body').inner_text())
    if width in [390,1920]:await page.screenshot(path=str(OUT/f'{lang}-{width}.png'))
  await page.get_by_role('button',name='English',exact=True).click()
  await page.get_by_role('button',name='More Tools',exact=True).click()
  assert await page.get_by_test_id('generic-upgrade').get_attribute('open') is None
  assert not await page.get_by_test_id('generic-path').is_visible()
  await page.get_by_test_id('generic-upgrade').locator('summary').first.click()
  assert await page.locator('#p-upCost').is_visible()
  assert not await page.get_by_role('button',name=re.compile(r'^\+ Upgrade')).is_visible()
  await page.get_by_test_id('generic-path').locator('summary').first.click()
  await page.get_by_role('button',name=re.compile(r'^\+ Upgrade')).click()
  assert await page.get_by_label('Upgrade 1 cost',exact=True).is_visible()
  await page.get_by_role('button',name='Plan',exact=True).click()
  await page.locator('#gain').fill('2.19');await page.get_by_label('Current Gain unit',exact=True).select_option('Sx')
  await page.locator('#tgt').fill('21.9');await page.get_by_label('Target Endurance unit',exact=True).select_option('Oc')
  assert 'Lv 7' in await page.get_by_test_id('route-levels').inner_text() or '→ 7' in await page.get_by_test_id('route-levels').inner_text()
  assert await page.get_by_test_id('route-timeline').count()==1
  kinds=[await e.get_attribute('data-kind') for e in await page.get_by_test_id('timeline-event').all()]
  assert kinds[0]=='now' and kinds[-1]=='target' and 'mt' in kinds,kinds
  await page.get_by_role('button',name='Muscle Training',exact=True).click()
  best=await page.locator('tbody tr[data-best]').inner_text()
  assert int(re.search(r'Lv\. (\d+)',best).group(1))>70,best
  for w in [390,768,1366,1920,2560,3440]:
   await page.set_viewport_size({'width':w,'height':1800})
   for mode in ['Plan','Muscle Training']:
    await page.get_by_role('button',name=mode,exact=True).click()
    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(w,mode)
  await page.set_viewport_size({'width':390,'height':1800})
  assert await page.locator('[data-testid=mt-preview-row][data-best]').first.is_visible()
  await page.screenshot(path=str(OUT/'far-390.png'))
  body=await page.locator('body').inner_text()
  for bad in ['ommunity','bserv','creenshot','onfidence','Konfidenz','beobacht','×2.1','×1.4','1.15']: assert bad not in body,bad
  assert not errors,errors
  print('PASS static MT v2: guided optional input, read-only projections, anchors, estimate fallback, collapsed generic/path, DE/EN and six widths.')
  await browser.close()
asyncio.run(main())