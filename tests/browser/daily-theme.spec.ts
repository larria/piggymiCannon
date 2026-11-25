import {expect,test,type Page} from '@playwright/test';
import {boot} from './qa-app';
import {THEMES} from '../../src/daily-theme';

const chooseTheme=(page:Page,theme:typeof THEMES[number])=>page.locator('html').evaluate((e,theme)=>e.dataset.dailyTheme=theme,theme);
const white='rgb(255, 255, 255)';
const contrast=(a:string,b:string)=>{
 const l=(rgb:string)=>rgb.match(/\d+/g)!.slice(0,3).map(v=>Number(v)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const [hi,lo]=[l(a),l(b)].sort((x,y)=>y-x);return (hi+.05)/(lo+.05);
};

test('all seven themes color the home, guide, settings and setup while keeping their main surfaces white',async({page})=>{
 await boot(page,false);
 for(const theme of THEMES){
  await chooseTheme(page,theme);
  const colors=await page.evaluate(()=>{
   const css=getComputedStyle(document.documentElement),read=(key:string)=>{const e=document.createElement('span');e.style.color=css.getPropertyValue('--theme-'+key);document.body.append(e);const rgb=getComputedStyle(e).color;e.remove();return rgb;};
   return {wash:read('wash'),ink:read('ink'),action:read('action'),muted:read('muted')};
  });
  for(const surface of ['body','.lobby-welcome'])await expect(page.locator(surface)).toHaveCSS('background-color',white);
  for(const [a,b] of [[colors.ink,white],[colors.muted,white],[white,colors.action],[colors.muted,colors.wash]])expect(contrast(a,b),theme+' '+a+' on '+b).toBeGreaterThanOrEqual(4.5);

  await page.locator('.header-tools [data-dialog="settings"]').hover();
  await expect(page.locator('.header-tools [data-dialog="settings"]')).toHaveCSS('background-color',colors.wash);
  await page.locator('.header-tools [data-dialog="settings"]').click();
  await expect(page.locator('#dialog')).toHaveCSS('background-color',white);
  await expect(page.getByText('背景音乐',{exact:true})).toHaveCSS('color',colors.ink);
  const music=page.getByRole('switch',{name:'背景音乐'});
  if(await music.getAttribute('aria-checked')==='false')await music.click();
  await expect(music).toHaveCSS('background-color',colors.action);
  await page.locator('#close-dialog').click();

  await page.locator('[data-dialog="guide"]').first().click();
  await expect(page.locator('.guide-callout>.icon')).toHaveCSS('color',colors.action);
  await expect(page.locator('.guide-callout p')).toHaveCSS('color',colors.muted);
  await expect(page.locator('.guide-callout')).toHaveCSS('border-top-color',await page.locator('#dialog').evaluate(e=>getComputedStyle(e).borderTopColor));
  expect(await page.locator('.guide-callout').evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(white);
  await page.locator('#close-dialog').click();

  await page.getByRole('button',{name:'进入战场',exact:true}).click();
  await expect(page.locator('[data-choice="random"]>.icon')).toHaveCSS('color',colors.action);
  await expect(page.locator('.random-map-choice .icon')).toHaveCSS('color',colors.action);
  await expect(page.locator('.paper-select-trigger').first()).toHaveCSS('background-color',white);
  await page.locator('#close-dialog').click();
 }
});

test('the angle dial repaints on a theme change and team colors remain stable',async({page})=>{
 await boot(page);
 const color=()=>page.locator('#angle-dial').evaluate((e:HTMLCanvasElement)=>Array.from(e.getContext('2d')!.getImageData(130,130,1,1).data));
 const flag=await page.locator('.player-hud.acting').evaluate(e=>getComputedStyle(e).backgroundColor);
 await chooseTheme(page,'moss');await expect.poll(color).toEqual([65,94,56,255]);
 await chooseTheme(page,'rose');await expect.poll(color).toEqual([117,69,91,255]);
 await expect(page.locator('.player-hud.acting')).toHaveCSS('background-color',flag);
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
