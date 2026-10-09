import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/tmp/browser/public-tool')
OUT.mkdir(parents=True, exist_ok=True)

async def main():
 async with async_playwright() as p:
  browser = await p.chromium.launch(headless=True)
  context = await browser.new_context(viewport={'width': 1280, 'height': 1800}, permissions=['clipboard-read', 'clipboard-write'])
  page = await context.new_page()
  errors = []
  page.on('pageerror', lambda e: errors.append(str(e)))
  await page.goto('http://localhost:8080', wait_until='networkidle')
  for field in ['gain', 'cur', 'tgt', 'next']: assert await page.locator('#'+field).input_value() == ''
  assert await page.locator('#strength-reset').count() == 0
  body = await page.locator('body').inner_text()
  assert 'Aktueller Stand Beispiel' not in body and '316,13' not in body and 'Screenshot-Kontext' not in body
  assert 'v3.0.0' in body and 'Law-Daten: Okt. 2026' in body
  await page.get_by_role('button', name='Mehr Aktionen', exact=True).click()
  assert await page.get_by_role('menuitem', name='GitHub', exact=True).get_attribute('href') == 'https://github.com/Dev0MostZaraki/Immortality-Incremental-Planner'
  issues = page.get_by_role('menuitem', name='Fehler melden')
  assert await issues.get_attribute('href') == 'https://github.com/Dev0MostZaraki/Immortality-Incremental-Planner/issues'
  assert await issues.get_attribute('target') == '_blank' and await issues.get_attribute('rel') == 'noopener noreferrer'
  await page.keyboard.press('Escape')
  await page.screenshot(path=str(OUT/'fresh-de.png'))
  await page.locator('#gain').fill('454'); await page.locator('#cur').fill('475'); await page.locator('#tgt').fill('500')
  assert await page.get_by_test_id('main-eta').inner_text() == '55,07 Sekunden'
  await page.get_by_role('button', name='Muscle Training', exact=True).click()
  assert await page.locator('#mt-level').input_value() == '' and await page.locator('#p-upCost').count() == 0
  assert await page.locator('#p-strength').count() == 0 and await page.locator('#p-persev').count() == 0
  assert await page.get_by_role('button', name='Beispiele', exact=True).count() == 0
  await page.get_by_role('button', name='English', exact=True).click()
  await page.get_by_role('button', name='More Tools', exact=True).click()
  await page.locator('summary').filter(has_text=re.compile(r'^Increase$')).click()
  assert 'Next Gain' in await page.get_by_test_id('tool-increase').inner_text()
  await page.get_by_test_id('generic-upgrade').locator('summary').first.click()
  await page.locator('#p-upCost').fill('1'); await page.locator('#p-upGain').fill('10000')
  assert 'Time saved / lost' in await page.get_by_test_id('generic-upgrade').inner_text()
  await page.screenshot(path=str(OUT/'progression-en.png'))
  await page.get_by_role('button', name='Law Synthesis', exact=True).click()
  assert await page.get_by_role('tab', name='Plan', exact=True).get_attribute('aria-selected') == 'true'
  assert await page.locator('#ls-core').count() == 0
  await page.get_by_role('button', name='Set all targets to 10', exact=True).click()
  assert await page.get_by_test_id('ls-cores').inner_text() == '28.88 M'
  assert await page.get_by_test_id('ls-total').inner_text() == 'Total ETA unavailable — Core rate missing.'
  assert await page.get_by_text('Materials done around', exact=True).count() == 2
  assert await page.get_by_text('Total finish time', exact=True).count() == 0
  for amount in [1, 10, 100]: await page.get_by_role('button', name=f'Add {amount} Lucent', exact=True).click()
  assert await page.locator('#inv-r-Lucent').input_value() == '111'
  assert await page.locator('#inv-Lucent').input_value() == '111'
  card = page.get_by_test_id('law-perception')
  await card.get_by_label('Current Level', exact=True).select_option('5')
  await card.get_by_role('button', name='Clear target', exact=True).click()
  assert await card.get_by_label('Current Level', exact=True).input_value() == '5'
  assert await card.get_by_label('Target Level', exact=True).input_value() == '5'
  await card.get_by_label('Target Level', exact=True).select_option('9')
  await page.get_by_role('button', name='Clear targets', exact=True).click()
  assert await card.get_by_label('Current Level', exact=True).input_value() == '5'
  assert await card.get_by_label('Target Level', exact=True).input_value() == '5'
  await page.get_by_role('button', name='Set all targets to 10', exact=True).click()
  await page.get_by_role('tab', name='Settings', exact=True).click()
  assert await page.locator('#ls-note').input_value() == ''
  assert await page.get_by_test_id('law-perception').count() == 0
  await page.reload(wait_until='networkidle')
  assert await page.get_by_role('tab', name='Settings', exact=True).get_attribute('aria-selected') == 'true'
  await page.locator('#ls-core').fill('1000')
  for name in ['First Reincarnation', 'Mark of Ash Secret Maxed', 'Beast Stage 300', 'World 5 Secret Upgrade', 'Divinity Board 3']:
   await page.get_by_role('checkbox', name=name+' ×2', exact=True).check()
  await page.get_by_role('tab', name='Plan', exact=True).click()
  assert await page.get_by_test_id('ls-mult').inner_text() == '×32'
  assert await page.get_by_text('Total finish time', exact=True).count() == 2
  assert 'unavailable' not in await page.get_by_test_id('ls-total').inner_text()
  await page.get_by_role('button', name='Copy summary', exact=True).click()
  summary = await page.evaluate('navigator.clipboard.readText()')
  assert 'Miasma Mark' in summary and 'including Cores' in summary
  await page.screenshot(path=str(OUT/'law-plan-en.png'))
  await page.get_by_role('tab', name='Settings', exact=True).click()
  await page.get_by_role('button', name='Reset all law data', exact=True).click()
  await page.get_by_role('button', name='Cancel', exact=True).click()
  assert await page.locator('#ls-core').input_value() == '1000'
  # Portable JSON export/import restores both tools and the Law subtab.
  await page.get_by_role('button', name='More actions', exact=True).click()
  await page.get_by_role('menuitem', name='Data', exact=True).click()
  async with page.expect_download() as download_info:
   await page.get_by_role('button', name='Export JSON', exact=True).click()
  download = await download_info.value
  backup_path = OUT/'backup.json'; await download.save_as(backup_path)
  backup = json.loads(backup_path.read_text())
  assert backup['version'] == '3.0.0' and backup['law']['inv']['Lucent'] == '111'
  await page.keyboard.press('Escape')
  await page.get_by_role('button', name='Reset all law data', exact=True).click()
  await page.get_by_role('button', name='Confirm', exact=True).click()
  assert await page.locator('#ls-core').input_value() == ''
  saved = json.loads(await page.evaluate("localStorage.getItem('ii-lawsynth-v1')"))
  assert saved['levels']['perception'] == {'cur': 0, 'tgt': 0} and saved['inv']['Lucent'] == '' and saved['check'] == {}
  bad_path = OUT/'bad.json'; bad_path.write_text('{"version":"99","endurance":"unsafe"}')
  await page.get_by_role('button', name='More actions', exact=True).click()
  await page.get_by_role('menuitem', name='Data', exact=True).click()
  await page.set_input_files('input[type=file]', str(bad_path))
  await page.get_by_role('status').filter(has_text='Invalid backup').wait_for()
  assert await page.locator('#ls-core').input_value() == ''
  await page.set_input_files('input[type=file]', str(backup_path))
  await page.get_by_role('button', name='Import', exact=True).click()
  await page.wait_for_timeout(1500)
  await page.get_by_role('tab', name='Settings', exact=True).wait_for()
  assert await page.locator('#ls-core').input_value() == '1000'
  saved = json.loads(await page.evaluate("localStorage.getItem('ii-lawsynth-v1')"))
  assert saved['inv']['Lucent'] == '111' and saved['levels']['perception'] == {'cur': 5, 'tgt': 10}
  await page.get_by_role('button', name='Endurance Planner', exact=True).click()
  await page.get_by_role('button', name='Plan', exact=True).click()
  assert await page.locator('#gain').input_value() == '454'
  # Check both languages, every tool/mode/subtab and desktop/mobile framing.
  for language in ['en', 'de']:
   await page.get_by_role('button', name='English' if language == 'en' else 'Deutsch', exact=True).click()
   for tool in ['Endurance Planner', 'Law Synthesis']:
    await page.get_by_role('button', name=tool, exact=True).click()
    modes = (['Plan', 'Muscle Training', 'More Tools'] if language == 'en' else ['Plan', 'Muscle Training', 'Weitere Tools']) if tool == 'Endurance Planner' else (['Plan', 'Settings'] if language == 'en' else ['Plan', 'Einstellungen'])
    for mode in modes:
     await page.get_by_role('button' if tool == 'Endurance Planner' else 'tab', name=mode, exact=True).click()
     for width in [390, 768, 1366, 1920, 2560, 3440]:
      await page.set_viewport_size({'width': width, 'height': 1800})
      await page.screenshot(path=str(OUT/f'{language}-{tool.split()[0]}-{mode}-{width}.png'))
      assert await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), (language, tool, mode, width)
      text = await page.locator('body').inner_text()
      assert not re.search(r'\bNaN\b|\bInfinity\b', text)
      if language == 'en': assert not re.search(r'benötigt|fehlt|Nächster|Empfehlung|Quell|Zurück|Stufen|Zeitraum|Keine|Sekunden|Für dein|löschen|eingerechnet|Daten:', text), text
  # Destructive local deletion requires confirmation and returns to clean German defaults.
  await page.get_by_role('button', name='Mehr Aktionen', exact=True).click()
  await page.get_by_role('menuitem', name='Daten', exact=True).click()
  await page.get_by_role('button', name='Alle lokalen Daten löschen', exact=True).click()
  await page.get_by_role('button', name='Abbrechen', exact=True).click()
  assert json.loads(await page.evaluate("localStorage.getItem('ii-endurance-calc-v1')"))['gain']['v'] == '454'
  await page.get_by_role('button', name='Alle lokalen Daten löschen', exact=True).click()
  await page.get_by_role('button', name='Bestätigen', exact=True).click()
  await page.wait_for_timeout(1500)
  assert await page.locator('html').get_attribute('lang') == 'de'
  assert await page.locator('#gain').input_value() == ''
  assert not errors, errors
  print('PASS: clean defaults, calm decisions, generic targets, Law ETA labels, safe resets, persisted tabs, inventory +1/+10/+100, JSON backup round-trip and rejection, localized footer, all views at 390px, no runtime errors.')
  await browser.close()

asyncio.run(main())