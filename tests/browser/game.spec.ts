import { test,expect } from '@playwright/test';

async function start(page:any,hotseat=false) {
  await page.goto('./');
  await page.getByRole('button',{name:'进入战场',exact:true}).click();
  if(hotseat) await page.locator('.mode-choices .choice-card').nth(1).click();
  await page.locator('#turn-timer').selectOption('0');
  await page.getByRole('button',{name:'开始对局',exact:true}).click();
  await expect(page.locator('body')).toHaveClass(/combat-mode/);
}

test('iPad landscape uses the full viewport and relative movement preserves aim',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);
  const bounds=await page.locator('#battlefield').boundingBox();
  expect(bounds!.width).toBeGreaterThan(980);expect(bounds!.height).toBeGreaterThan(480);
  await expect(page.locator('#fire-button')).toBeEnabled();
  const button=await page.locator('#move-left').boundingBox();
  await page.mouse.move(button!.x+button!.width/2,button!.y+button!.height/2);
  await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();
  await expect.poll(async()=>Number(await page.locator('#fuel-value').textContent())).toBeLessThan(100);
  await expect(page.locator('#face-button span')).toHaveText('朝右');
  await page.screenshot({path:'QA/ipad-pwa-landscape.png'});
  expect(errors).toEqual([]);
});

test('dragging aims; hold-and-release fires exactly once and the AI returns the turn',async({page})=>{
  await start(page);
  const pad=await page.locator('#aim-pad').boundingBox();
  const x=pad!.x+pad!.width/2,y=pad!.y+pad!.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-55,y-30,{steps:6});await page.mouse.up();
  await expect(page.locator('#face-button span')).toHaveText('朝左');
  await expect.poll(async()=>Number(await page.locator('#angle-value').textContent())).toBeGreaterThan(55);
  await page.locator('#face-button').click();
  const fire=await page.locator('#fire-button').boundingBox();
  await page.mouse.move(fire!.x+fire!.width/2,fire!.y+fire!.height/2);await page.mouse.down();
  await page.waitForTimeout(1500);
  await expect.poll(async()=>Number(await page.locator('#power-value').textContent())).toBeGreaterThan(58);
  await page.mouse.up();
  await expect(page.locator('#fire-button')).toBeDisabled();
  await expect(page.locator('#round-text')).toHaveText('第 02 轮',{timeout:25_000});
  await expect(page.locator('#turn-text')).toHaveText('轮到咪猪头了');
  await page.locator('#log-button').click();
  await expect(page.locator('.battle-log')).toContainText('咪猪头发射了标准榴弹');
  await expect(page.locator('.battle-log')).toContainText('大猪头爸爸发射了');
});

test('the army drawer selects weapons, and hotseat requires an explicit handoff',async({page})=>{
  await start(page,true);
  await page.locator('#inventory-toggle').click();
  await expect(page.locator('.arsenal')).toBeVisible();
  await page.getByRole('button',{name:'重磅炸弹，3 发',exact:true}).click();
  await page.locator('#arsenal-close').click();
  await expect(page.locator('#fire-note')).toContainText('重磅炸弹');
  const fire=await page.locator('#fire-button').boundingBox();
  await page.mouse.move(fire!.x+fire!.width/2,fire!.y+fire!.height/2);await page.mouse.down();
  await page.waitForTimeout(350);await page.mouse.up();
  await expect(page.locator('.handoff h2')).toHaveText('大猪头爸爸，到你了。',{timeout:20_000});
  await page.getByRole('button',{name:'我准备好了',exact:true}).click();
  await expect(page.locator('#turn-text')).toHaveText('轮到大猪头爸爸了');
});

test('PWA installs its worker and reloads with icons and audio while offline',async({page,context})=>{
  await page.goto('./');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),{timeout:20_000}).toBe(true);
  const manifest=await page.evaluate(async()=>{
    const url=document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href;
    return (await fetch(url)).json();
  });
  expect(manifest.name).toBe('咪猪头的疯狂坦克');expect(manifest.orientation).toBe('landscape');
  await context.setOffline(true);await page.reload();
  await expect(page.getByRole('button',{name:'进入战场',exact:true})).toBeVisible();
  const assets=await page.evaluate(async()=>Promise.all(['icons/icon-512.png','audio/bgm-sunny-30s.mp3'].map(async path=>(await fetch(path)).ok)));
  expect(assets).toEqual([true,true]);
  await context.setOffline(false);
});
