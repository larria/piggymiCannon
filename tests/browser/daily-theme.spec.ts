import {expect,test} from '@playwright/test';
import {boot} from './qa-app';
import {THEMES} from '../../src/daily-theme';

test('seven palettes keep the home, battle controls and dialog readable',async({page,browserName})=>{
 await boot(page,false);
 for(const theme of THEMES){
  await page.locator('html').evaluate((e,theme)=>e.dataset.dailyTheme=theme,theme);
  await expect(page.locator('html')).toHaveAttribute('data-daily-theme',theme);
  const pairs=await page.evaluate(()=>[...['.lobby-welcome h1','.lobby-welcome p','#start-button'].map(sel=>{
   const el=document.querySelector(sel)!,style=getComputedStyle(el);return [style.color,getComputedStyle(el.closest('.button,.lobby-welcome')!).backgroundColor];
  }),[getComputedStyle(document.querySelector('body')!).color,getComputedStyle(document.querySelector('body')!).backgroundColor]]);
  for(const [a,b] of pairs){
   const l=(rgb:string)=>rgb.match(/\d+/g)!.slice(0,3).map(v=>Number(v)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   const values=[l(a),l(b)].sort((x,y)=>y-x);expect((values[0]+.05)/(values[1]+.05),theme+' '+a+' on '+b).toBeGreaterThanOrEqual(4.5);
  }
 }
 await page.locator('html').evaluate(e=>e.dataset.dailyTheme='tide');
 await page.screenshot({path:`.workbuddy/v5.1.6/theme-${browserName}.png`,scale:'css'});
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.locator('#dialog')).toHaveCSS('background-color','rgb(243, 249, 249)');
});

test('local midnight and reload switch to the new palette without changing the same day twice',async({page})=>{
 await page.clock.install({time:new Date(2026,10,23,23,59,50)});
 await boot(page,false);
 const root=page.locator('html'),first=await root.getAttribute('data-daily-theme');
 await page.clock.fastForward(15_000);
 await expect(root).not.toHaveAttribute('data-daily-theme',first!);
 const next=await root.getAttribute('data-daily-theme');await page.reload();
 await expect(root).toHaveAttribute('data-daily-theme',next!);
});
