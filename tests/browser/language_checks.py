import asyncio,json,re
from pathlib import Path
from playwright.async_api import async_playwright
# Screenshots and logs stay outside the checkout. Requires the local dev server and Python Playwright.
OUT=Path('/tmp/browser/language')
OUT.mkdir(parents=True, exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  ctx=await browser.new_context(viewport={'width':1280,'height':1800},permissions=['clipboard-read','clipboard-write'])
  page=await ctx.new_page(); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080',wait_until='networkidle')
  assert await page.locator('html').get_attribute('lang')=='de'
  for field in ['gain','cur','tgt','next']: assert await page.locator('#'+field).input_value()==''
  await page.locator('#gain').fill('454'); await page.locator('#cur').fill('475'); await page.locator('#tgt').fill('500')
  assert await page.get_by_test_id('main-eta').inner_text()=='55,07 Sekunden'
  await page.locator('#next').fill('371.73')
  await page.get_by_role('button',name='English',exact=True).click()
  await page.wait_for_function("document.documentElement.lang === 'en'")
  assert await page.get_by_test_id('main-eta').inner_text()=='55.07 seconds'
  assert await page.get_by_test_id('recommendation').inner_text()=='Do not Increase'
  before=await page.evaluate("localStorage.getItem('ii-endurance-calc-v1')")
  await page.get_by_role('button',name='Copy result',exact=True).click()
  summary=await page.evaluate('navigator.clipboard.readText()')
  assert 'Current: 475 Qa' in summary and 'Time remaining:' in summary and 'Do not Increase' in summary
  await page.screenshot(path=str(OUT/'desktop-en.png'))
  await page.get_by_role('button',name='Deutsch',exact=True).click()
  assert await page.get_by_test_id('recommendation').inner_text()=='Nicht drücken'
  assert before==await page.evaluate("localStorage.getItem('ii-endurance-calc-v1')")
  await page.get_by_role('button',name='English',exact=True).click();await page.reload(wait_until='networkidle')
  assert await page.locator('html').get_attribute('lang')=='en'
  assert await page.locator('#next').input_value()=='371.73'
  await page.get_by_role('button',name='Progression',exact=True).click()
  assert await page.get_by_test_id('prog-increase').inner_text()=='Do not Increase'
  await page.locator('#p-upCost').fill('1');await page.locator('[data-testid=mt-model] > summary').click(); await page.locator('[data-testid=mt-model] [role=switch]').click(); await page.locator('#p-upGain').fill('10000')
  assert await page.get_by_test_id('upgrade-rec').inner_text()=='Buy as soon as affordable'
  await page.get_by_role('button',name='Copy progression summary',exact=True).click()
  assert 'Best next step:' in await page.evaluate('navigator.clipboard.readText()')
  await page.get_by_role('button',name=re.compile(r'^\+ Upgrade')).click()
  await page.get_by_label('Upgrade 1 cost',exact=True).fill('1')
  await page.get_by_label('Upgrade 1 resulting Gain',exact=True).fill('10000')
  assert 'worthwhile' in await page.get_by_test_id('path-advice').inner_text()
  await page.screenshot(path=str(OUT/'desktop-progression.png'))
  await page.get_by_role('button',name='Law Synthesis',exact=True).click()
  await page.get_by_role('button',name='Set all targets to 10',exact=True).click()
  assert await page.get_by_test_id('ls-cores').inner_text()=='28.88 M'
  assert await page.get_by_test_id('ls-total').inner_text()=='Total ETA unavailable — Core rate missing.'
  await page.locator('#inv-Morrow').fill('1000')
  await page.get_by_role('button',name='Copy summary',exact=True).click()
  copy=await page.evaluate('navigator.clipboard.readText()')
  assert 'Miasma Mark' in copy and 'Expected material farming time' in copy and 'Total ETA unavailable' in copy
  before=await page.evaluate("localStorage.getItem('ii-lawsynth-v1')")
  await page.get_by_role('button',name='Deutsch',exact=True).click()
  assert before==await page.evaluate("localStorage.getItem('ii-lawsynth-v1')")
  await page.get_by_role('button',name='English',exact=True).click()
  await page.reload(wait_until='networkidle')
  assert await page.locator('#inv-Morrow').input_value()=='1000'
  await page.screenshot(path=str(OUT/'desktop-law.png'))
  for lang in ['en','de']:
   await page.get_by_role('button',name='English' if lang=='en' else 'Deutsch',exact=True).click()
   for tool in ['Law Synthesis','Endurance Planner']:
    await page.get_by_role('button',name=tool,exact=True).click()
    if tool=='Endurance Planner':
     modes=['Simple','Progression','Advanced'] if lang=='en' else ['Einfach','Progression','Erweitert']
    else:modes=[None]
    for mode in modes:
     if mode:await page.get_by_role('button',name=mode,exact=True).click()
     for width in [390,768,1366,1920,2560,3440]:
      await page.set_viewport_size({'width':width,'height':1800})
      await page.screenshot(path=str(OUT/f'{lang}-{tool.split()[0]}-{mode}-{width}.png'))
      assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),(lang,tool,mode,width)
      text=await page.locator('body').inner_text()
      assert not re.search(r'\bNaN\b|\bInfinity\b',text,re.I),(lang,tool,mode,re.findall(r'.{0,30}(?:NaN|Infinity).{0,30}',text,re.I))
      if lang=='en':
       assert not re.search(r'benötigt|fehlt|Nächster|Empfehlung|Quell|Zurück|Stufen|Zeitraum|Keine|Sekunden|Für dein',text),text
  assert not errors,errors
  assert await page.title()=='Immortality Incremental Planner'
  assert await page.locator('link[rel=icon]').get_attribute('href')=='/favicon.svg'
  print('PASS: default DE, EN/DE switching, preserved inputs, reload persistence, recommendations, localized copy and Marks, all modes desktop/390px, neutral identity, no runtime errors.')
  await browser.close()
asyncio.run(main())