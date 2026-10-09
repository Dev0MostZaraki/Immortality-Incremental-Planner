import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/prof');OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);ctx=await b.new_context(viewport={'width':1280,'height':1800})
  page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.goto('http://localhost:8080',wait_until='networkidle')
  await page.locator('#gain').fill('2');await page.get_by_label('Aktueller Gain Einheit',exact=True).select_option('')
  await page.locator('#tgt').fill('400');await page.get_by_label('Ziel-Endurance Einheit',exact=True).select_option('')
  static=await page.get_by_test_id('main-eta').inner_text()
  assert await page.get_by_test_id('dynamic-projection').count()==0
  await page.get_by_test_id('prof-section').locator('summary').click()
  for k,v in [('profBaseLevel','42'),('profBonusLevel','7'),('profXP','0'),('profRequirement','100')]: await page.locator('#'+k).fill(v)
  assert 'Proficiency einbezogen' in await page.get_by_test_id('prof-status').inner_text()
  dyn=await page.get_by_test_id('main-eta').inner_text(); assert dyn!=static,(dyn,static)
  assert await page.get_by_test_id('prof-levels').inner_text()=='1'
  body=await page.locator('body').inner_text()
  for bad in ['1,15','1.15','observed','beobachtet','Community','Screenshot']: assert bad not in body,bad
  await page.get_by_role('button',name='English',exact=True).click()
  assert 'Proficiency included' in await page.get_by_test_id('prof-status').inner_text()
  assert 'Dynamic projection' in await page.get_by_test_id('dynamic-projection').inner_text()
  await page.reload(wait_until='networkidle')
  assert await page.locator('#profXP').input_value()=='0' and await page.locator('#profRequirement').input_value()=='100'
  assert await page.get_by_test_id('main-eta').inner_text()!=''
  await page.get_by_role('button',name='Muscle Training',exact=True).click()
  mt=page.get_by_test_id('mt-model'); await page.locator('#mt-level').fill('0')
  assert await mt.locator('#profXP,#profRequirement').count()==0
  assert await page.get_by_test_id('mt-prof-summary').count()==1
  t=await mt.inner_text()
  for bad in ['observed','Community','1.15','×']: assert bad not in t,bad
  for w in [390,768,1366,1920,2560,3440]:
   await page.set_viewport_size({'width':w,'height':1800})
   for mode in ['Plan','Muscle Training']:
    await page.get_by_role('button',name=mode,exact=True).click()
    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(w,mode)
    assert not re.search(r'\bNaN\b',await page.locator('body').inner_text())
   if w in (390,1366): await page.screenshot(path=str(OUT/f'{w}.png'))
  assert not errors,errors
  print('PASS proficiency');await b.close()
asyncio.run(main())