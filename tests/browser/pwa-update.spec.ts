import {test,expect} from '@playwright/test';import {readFileSync,writeFileSync} from 'node:fs';
test('fresh and reopened clients each reload once after a user-requested waiting update',async({page,browserName})=>{
 await page.goto('./');await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const sw=readFileSync('dist/sw.js','utf8'),results=[];
 try{
  for(let n=1;n<=2;n++){
   const initial=await page.evaluate(()=>performance.timeOrigin);let reloads=0;const navigation=(frame:any)=>{if(frame===page.mainFrame())reloads++;};page.on('framenavigated',navigation);
   // Real server-side byte change: browser worker update fetches cannot be reliably routed.
   writeFileSync('dist/sw.js',sw+`\n// update regression ${n}\n`);await page.locator('#version-button').click();await expect(page.locator('#apply-update')).toBeVisible();
   await Promise.all([page.waitForEvent('load'),page.locator('#apply-update').click()]);expect(await page.evaluate(()=>performance.timeOrigin)).toBeGreaterThan(initial);await expect(page.locator('#version-button')).toContainText(JSON.parse(readFileSync('package.json','utf8')).version);await page.waitForTimeout(150);
   expect(reloads).toBe(1);page.off('framenavigated',navigation);await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.state)).toBe('activated');results.push({initiallyUncontrolled:n===1,userButton:true,reloads,activated:true});
  }
 }finally{writeFileSync('dist/sw.js',sw);}
 writeFileSync(`QA/v2.3.6-pwa-button-${browserName}.json`,JSON.stringify(results,null,2));
});
test('another client activating a prepared worker does not reload a running battle',async({page,browserName})=>{
 await page.goto('./');await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.reload();
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('[data-controller="1"]').selectOption('human');await page.locator('#turn-timer').selectOption('0');await page.getByRole('button',{name:'开始对局',exact:true}).click();
 const initial=await page.evaluate(()=>performance.timeOrigin),round=await page.locator('#round-text').textContent(),sw=readFileSync('dist/sw.js','utf8');
 try{writeFileSync('dist/sw.js',sw+'\n// other client update regression\n');await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration())!.update();});await expect.poll(()=>page.evaluate(async()=>{const w=(await navigator.serviceWorker.getRegistration())?.waiting;if(w)(window as any).__pendingWorker=w;return !!w;})).toBe(true);await expect(page.locator('#apply-update')).toBeHidden();
  await page.evaluate(async()=>{(window as any).__pendingWorker.postMessage({type:'SKIP_WAITING'});});await expect.poll(()=>page.evaluate(async()=>!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(true);await expect.poll(()=>page.evaluate(async()=>(await navigator.serviceWorker.getRegistration())?.active?.state)).toBe('activated');await page.waitForTimeout(300);expect(await page.evaluate(()=>performance.timeOrigin)).toBe(initial);await expect(page.locator('#round-text')).toHaveText(round!);await expect(page.locator('#battlefield')).toBeVisible();await expect(page.locator('.result')).toHaveCount(0);
  await page.locator('#exit-match').click();await page.getByRole('button',{name:'回到演习场',exact:true}).click();await expect(page.locator('#apply-update')).toBeVisible();await Promise.all([page.waitForEvent('load'),page.locator('#apply-update').click()]);expect(await page.evaluate(()=>performance.timeOrigin)).toBeGreaterThan(initial);
 }finally{writeFileSync('dist/sw.js',sw);}
 writeFileSync(`QA/v2.3.6-pwa-battle-${browserName}.json`,JSON.stringify({reloaded:false,roundPreserved:true,updateButtonHiddenDuringBattle:true,userReloadAfterLeavingBattle:true},null,2));
});
