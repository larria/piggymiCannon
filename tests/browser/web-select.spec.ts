import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
const open=async(page:any)=>{await page.goto('./');await page.getByRole('button',{name:'进入战场',exact:true}).click();};
for(const [name,width,height] of [['pc',1512,982],['ipad',1194,834],['phone-portrait',390,844],['phone-landscape',844,390]] as const){
 test(`web selects ${name}: warm controls, viewport-contained menu, commit, focus and form value`,async({browser,browserName})=>{
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:name!=='pc',hasTouch:name!=='pc'}),page=await context.newPage();
  try{await open(page);
  await expect(page.getByRole('combobox')).toHaveCount(13);const timer=page.getByRole('combobox',{name:'每回合时间',exact:true});
  await timer.click();const menu=page.getByRole('listbox');await expect(menu).toBeVisible();
  const bounds=await menu.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(7);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width-7);expect(bounds!.y).toBeGreaterThanOrEqual(7);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(height-7);
  expect(await menu.locator('[role=option]').first().evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(43);
  await page.waitForTimeout(140);await page.screenshot({path:`QA/v${version}-select-${name}-${browserName}.png`,scale:'css'});
  await menu.getByRole('option',{name:'45 秒',exact:true}).click();await expect(page.locator('#turn-timer')).toHaveValue('45');await expect(timer).toBeFocused();
  await timer.click();await page.keyboard.press('Escape');await expect(page.getByRole('listbox')).toHaveCount(0);await expect(page.locator('#dialog')).toBeVisible();
  await timer.click();await page.locator('#dialog h2').click();await expect(page.getByRole('listbox')).toHaveCount(0);
  const controller=page.getByRole('combobox',{name:'咪猪头的操作者',exact:true});await controller.focus();await page.keyboard.press('ArrowDown');await expect(page.locator('[data-controller="0"]')).toHaveValue('human');await page.keyboard.press('Enter');await expect(page.locator('[data-controller="0"]')).toHaveValue('ai');await expect(controller).toBeFocused();
  await page.getByRole('combobox',{name:'咪猪头的 AI 难度',exact:true}).focus();await page.keyboard.press('h');await page.keyboard.press('Enter');await expect(page.locator('[data-difficulty="0"]')).toHaveValue('hard');
  await page.locator('[data-controller="0"]').selectOption('human');await expect(page.getByRole('combobox',{name:'咪猪头的 AI 难度',exact:true})).toBeDisabled();await expect(page.locator('.paper-select')).toHaveCount(13);
  expect(await page.locator('#setup-form').evaluate((form:HTMLFormElement)=>new FormData(form).get('timer'))).toBe('45');
  writeFileSync(`QA/v${version}-select-${name}-${browserName}.json`,JSON.stringify({version,width,height,bounds,selects:13,keyboard:true,focusAfterRosterRerender:true,formValue:'45',nativeCompatibility:true},null,2));
  }finally{await context.close();}
 });
}
test('web select popup stays above modal, cleans up on close/rebuild, and long lab list scrolls to keyboard selection',async({page})=>{
 await open(page);
 const team=page.getByRole('combobox',{name:'槽位 1 队旗',exact:true});await team.click();
 const center=await page.getByRole('listbox').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+20)?.closest('[role=listbox]')===e;});expect(center).toBe(true);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(page.locator('#dialog')).toBeHidden();await expect(page.getByRole('listbox')).toHaveCount(0);
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await expect(page.locator('.paper-select')).toHaveCount(13);
 await page.goto('./weapon-lab.html');await expect(page.getByRole('combobox')).toHaveCount(1);const filter=page.getByRole('combobox');await filter.click();await page.keyboard.press('End');
 await expect(page.getByRole('listbox').getByRole('option',{name:'暴龙',exact:true})).toBeInViewport();await page.keyboard.press('Enter');await expect(page.locator('#lab-tank')).toHaveValue('dragon');await expect(page.locator('[data-weapon]')).toHaveCount(2);await expect(filter).toBeFocused();
});
test('web select observes disabled option groups and does not submit the form on selection',async({page})=>{
 await open(page);const timer=page.getByRole('combobox',{name:'每回合时间',exact:true});
 await page.locator('#turn-timer').evaluate((select:HTMLSelectElement)=>{const group=document.createElement('optgroup');group.label='其它';group.innerHTML='<option value="999">测试不可选</option>';select.append(group);});
 await timer.click();await page.locator('#turn-timer optgroup').evaluate((group:HTMLOptGroupElement)=>group.disabled=true);
 await expect(page.getByRole('option',{name:'测试不可选',exact:true})).toHaveAttribute('aria-disabled','true');
 await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(page.locator('#turn-timer')).toHaveValue('0');await expect(page.locator('#setup-form')).toBeVisible();
});
