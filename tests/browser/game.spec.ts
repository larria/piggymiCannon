import {boot} from './qa-app';
import { test,expect } from '@playwright/test';
import {readFileSync} from 'node:fs';
import {Game} from '../legacy-fixture';import {makeRng} from '../../src/engine';
import {rollWeather} from '../../src/weather';
const APP_VERSION=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')).version;

async function start(page:any,hotseat=false,map='valley',seed=52,timer='0') {
  await page.addInitScript((value:number)=>{Date.now=()=>value;},seed);
  await page.goto('./');
  await page.getByRole('button',{name:'进入战场',exact:true}).click();
  await page.locator('[data-choice="bowl"]').click();
  await page.locator('[data-owner="1"]').click();await page.locator('[data-choice="bowl"]').click();
  if(hotseat)await page.locator('[data-controller="1"]').selectOption('human');
  if(map!=='valley') await page.locator(`input[name="map"][value="${map}"]`).locator('..').click();
  await page.locator('#turn-timer').selectOption(timer);
  await page.getByRole('button',{name:'开始对局',exact:true}).click();
  await expect(page.locator('body')).toHaveClass(/combat-mode/);
}

test('iPad landscape uses the full viewport and left movement turns toward the left',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);
  const bounds=await page.locator('#battlefield').boundingBox();
  expect(bounds!.width).toBeGreaterThan(1150);expect(bounds!.height).toBeGreaterThan(600);
  await expect(page.locator('#fire-button')).toBeEnabled();
  const button=await page.locator('#move-left').boundingBox();
  await page.mouse.move(button!.x+button!.width/2,button!.y+button!.height/2);
  await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();
  await expect.poll(async()=>Number(await page.locator('#fuel-value').textContent())).toBeLessThan(100);
  await expect(page.locator('#face-button span')).toHaveText('朝左');
  await page.screenshot({path:'QA/slots-regression-small-ipad-landscape.png'});
  expect(errors).toEqual([]);
});

test('dragging aims; hold-and-release fires exactly once and the AI returns the turn',async({page})=>{
  await start(page);
  const pad=await page.locator('#aim-pad').boundingBox();
  const x=pad!.x+pad!.width/2,y=pad!.y+pad!.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-30,y-65,{steps:6});await page.mouse.up();
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
  await expect(page.locator('#turn-text')).toHaveText('咪猪头，到你了');
  await page.locator('#log-button').click();
  await expect(page.locator('.battle-log')).toContainText('咪猪头发射了巨石');
  await expect(page.locator('.battle-log')).toContainText('大猪头爸爸发射了');
});

test('the army drawer selects weapons, and hotseat changes actor without blocking',async({page})=>{
  await start(page,true);
  await page.locator('#inventory-toggle').click();
  await expect(page.locator('.arsenal')).toBeVisible();
  await page.locator('#weapons-tab').click();
  await expect(page.getByRole('button',{name:'火石，无限弹药',exact:true})).toBeVisible();
  await page.locator('#arsenal-close').click();
  await page.locator('#weapon-special').click();await expect(page.locator('#fire-note')).toContainText('火石');
  const fire=await page.locator('#fire-button').boundingBox();
  await page.mouse.move(fire!.x+fire!.width/2,fire!.y+fire!.height/2);await page.mouse.down();
  await page.waitForTimeout(350);await page.mouse.up();
  await expect(page.locator('#turn-text')).toContainText('大猪头爸爸',{timeout:20_000});

  await expect(page.locator('#turn-text')).toHaveText('大猪头爸爸，到你了');
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
  const assets=await page.evaluate(async()=>Promise.all(['icons/icon-512.png','audio/bgm-valley.mp3','portraits/mimi.png','portraits/dad.png','icons/fox-avatar.svg','icons/fish-avatar.svg'].map(async path=>(await fetch(path)).ok)));
  expect(assets).toEqual([true,true,true,true,true,true]);
  await context.setOffline(false);
});
test('four starting item slots still enforce one item per own action',async({page})=>{
 await start(page);await page.locator('#inventory-toggle').click();await page.locator('#items-tab').click();
 await expect(page.locator('.arsenal [data-item]')).toHaveCount(4);await expect(page.locator('.arsenal [data-item="repair"]')).toBeDisabled();
 for(const id of ['double','teleport','boost'])await expect(page.locator(`.arsenal [data-item="${id}"]`)).toBeEnabled();
 await page.locator('.arsenal [data-item="double"]').click();await expect(page.locator('#status-0')).toContainText('双发');
 for(const id of ['double','teleport','boost','repair'])await expect(page.locator(`.arsenal [data-item="${id}"]`)).toBeDisabled();
 await expect(page.locator('.weapon-detail')).toContainText('每回合最多一件');
});
test('clickable version checks fetch the live version and keep the battle running',async({page})=>{
  await start(page);
  await page.route('**/version.json?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({version:APP_VERSION})}));
  await page.locator('#stage-version-button').click();
  await expect(page.locator('#toast')).toContainText(`当前已是最新版本 v${APP_VERSION}`);
  await expect(page.locator('#fire-button')).toBeEnabled();
  await page.unroute('**/version.json?*');
  await page.route('**/version.json?*',route=>route.fulfill({contentType:'application/json',body:'{"version":"9.9.9"}'}));
  await page.locator('#stage-version-button').click();
  await expect(page.locator('#toast')).toContainText('发现 v9.9.9');
  await expect(page.locator('#game-overlay')).toBeHidden();
});
test('new bridge and sky maps render their destructible platforms in full screen',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page,true,'coast');await expect(page.locator('#map-label')).toContainText('独木桥');
  await page.screenshot({path:'QA/slots-regression-bridge.png'});
  await page.goto('./');await start(page,true,'moon');await expect(page.locator('#map-label')).toContainText('天空之城');
  await page.screenshot({path:'QA/slots-regression-sky-city.png'});expect(errors).toEqual([]);
});
test('fog hides enemy information for two actions then clears and uses the supplied avatars',async({page})=>{
  const seed=Array.from({length:300},(_,i)=>i+1).find(value=>rollWeather(makeRng(value)).fog)!;
  await start(page,false,'valley',seed);
  await expect(page.locator('#map-label')).toContainText('浓雾');
  await expect(page.locator('#hp-1')).toHaveText('950 / 950');
  await expect(page.locator('[data-slot-id="0"] .avatar img')).toHaveAttribute('src',/portraits\/mimi\.png/);
  await expect(page.locator('[data-slot-id="1"] .avatar img')).toHaveAttribute('src',/portraits\/dad\.png/);
  await page.screenshot({path:'QA/slots-regression-fog.png'});
  await page.locator('#fire-button').click();
  await expect(page.locator('#turn-text')).toHaveText('大猪头爸爸正在瞄准…',{timeout:10_000});
  await expect(page.locator('#hp-1')).toHaveText('950 / 950');
  await expect(page.locator('#energy-value')).toHaveText('950 / 950');
  await expect(page.locator('#instrument-tank')).toHaveText('大腕');
  for(const id of ['repair','teleport','double','boost']) await expect(page.locator(`#quick-items [data-item="${id}"]`)).toBeDisabled();
  await expect(page.locator('#turn-text')).toHaveText('咪猪头，到你了',{timeout:20_000});
  await expect(page.locator('#map-label')).not.toContainText('浓雾');
  await expect(page.locator('#hp-1')).not.toContainText('?');
});
test('movement and charge create audio, and pausing cancels the charge without firing',async({page})=>{
  await page.addInitScript(()=>{
    (window as any).audioEvents=[];
    const original=AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator=function(){
      const oscillator=original.call(this),start=oscillator.start.bind(oscillator),stop=oscillator.stop.bind(oscillator);
      oscillator.start=(when?:number)=>{(window as any).audioEvents.push({event:'start',wave:oscillator.type,frequency:oscillator.frequency.value});start(when);};
      oscillator.stop=(when?:number)=>{(window as any).audioEvents.push({event:'stop'});stop(when);};return oscillator;
    };
  });
  await start(page);
  const move=await page.locator('#move-left').boundingBox();await page.mouse.move(move!.x+move!.width/2,move!.y+move!.height/2);await page.mouse.down();await page.waitForTimeout(250);await page.mouse.up();
  const fire=await page.locator('#fire-button').boundingBox();await page.mouse.move(fire!.x+fire!.width/2,fire!.y+fire!.height/2);await page.mouse.down();await page.waitForTimeout(500);
  await page.keyboard.press('Escape');await page.mouse.up();
  const events=await page.evaluate(()=>(window as any).audioEvents);
  expect(events.some((e:any)=>e.event==='start'&&e.wave==='sawtooth')).toBe(true);
  expect(events.some((e:any)=>e.event==='start'&&e.frequency===150)).toBe(true);
  expect(events.filter((e:any)=>e.event==='stop').length).toBeGreaterThanOrEqual(3);
  await expect(page.locator('#game-overlay')).toContainText('风也在等你');
  await page.getByRole('button',{name:'继续对局',exact:true}).click();await page.locator('#log-button').click();
  await expect(page.locator('.battle-log')).not.toContainText('发射了');
});
test('airdrop follows its own stage and preserves the full turn clock',async({page})=>{
  await page.addInitScript(()=>{Date.now=()=>52;});await boot(page,true,'coast','bowl','bowl');
  // Isolate supply timing from the deliberately changed minimum-shot range.
  // Destroying the near platform can legitimately leave no safe crate landing.
  await page.evaluate(()=>{const g=(window as any).__qa.game;g.config.timer=45;g.clock=45;g.fog=false;g.fireLine=null;g.fireLineTurnsRemaining=0;g.land.protectedMask.set(g.land.mask);});
  for(let i=0;i<5;i++) {
    await page.locator('#fire-button').click();
    if(i<4) {await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});}
  }
  await expect(page.locator('#turn-text')).toContainText('补给正在空降',{timeout:12_000});
  await expect(page.locator('#timer span')).toHaveText('45');await page.waitForTimeout(500);
  await expect(page.locator('#timer span')).toHaveText('45');await page.screenshot({path:'QA/slots-regression-airdrop.png'});
  await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});
  await expect(page.locator('#timer span')).toHaveText('45');
});
test('large avatars open playful portraits and pause the battle clock',async({page})=>{
  await start(page,true,'coast',52,'45');
  const bounds=await page.locator('[data-slot-id="0"] .avatar').boundingBox();expect(bounds!.width).toBeGreaterThanOrEqual(44);
  await page.locator('[data-slot-id="0"] .portrait-button').click();
  await expect(page.locator('#portrait-art img')).toHaveAttribute('src',/portraits\/mimi\.png/);
  const clock=await page.locator('#timer span').textContent();await page.waitForTimeout(450);
  await expect(page.locator('#timer span')).toHaveText(clock!);
  const saying=await page.locator('#portrait-saying').textContent();await page.locator('#portrait-art').click();
  await expect(page.locator('#portrait-saying')).not.toHaveText(saying!);await expect(page.locator('.portrait-heart')).toBeVisible();
  await page.screenshot({path:'QA/slots-regression-portrait-preview.png'});
  await page.locator('#close-dialog').click();await expect(page.locator('#fire-button')).toBeEnabled();
  await page.locator('[data-slot-id="1"] .portrait-button').click();
  await expect(page.locator('#portrait-art img')).toHaveAttribute('src',/portraits\/dad\.png/);
});
test('tank selection is remembered and two weapons switch directly without a dialog',async({page})=>{
 await start(page);
 await page.locator('#pause-button').click();await page.getByRole('button',{name:'重新部署',exact:true}).click();
 await page.locator('[data-owner="0"]').click();await page.locator('[data-choice="cannon"]').click();
 await expect(page.locator('#vehicle-preview')).toContainText('小红豆');
 await page.getByRole('button',{name:'开始对局',exact:true}).click();
 await expect(page.locator('#hp-0')).toContainText('920');await expect(page.locator('#angle')).toHaveAttribute('max','45');
 await page.locator('#weapon-special').click();await expect(page.locator('#fire-note')).toContainText('小红豆');
 await expect(page.locator('#dialog')).not.toBeVisible();await expect(page.locator('.arsenal')).not.toBeVisible();
 await page.locator('#weapon-normal').click();await expect(page.locator('#fire-note')).toContainText('大铅弹');
 await page.reload();await page.getByRole('button',{name:'进入战场',exact:true}).click();
 await expect(page.locator('[data-choice="cannon"]')).toHaveClass(/selected/);await expect(page.locator('#vehicle-preview')).toContainText('老土');
 await page.screenshot({path:'QA/slots-regression-tank-selection.png'});
});
test('enabled action controls all acknowledge clicks with sound',async({page})=>{
 await page.addInitScript(()=>{(window as any).clickSounds=0;const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if((this as HTMLAudioElement).src.includes('sfx-click'))(window as any).clickSounds++;return original.call(this);};});
 await start(page);
 let count=await page.evaluate(()=>(window as any).clickSounds);
 for(const selector of ['#weapon-special','#weapon-normal','#inventory-toggle','#weapons-tab','#items-tab','#arsenal-close','#face-button','#stage-version-button']){
   await page.locator(selector).click();const current=await page.evaluate(()=>(window as any).clickSounds);expect(current).toBeGreaterThan(count);count=current;
 }
});
test('追魂弹 produces its own lock sound and persists the tracking event in the battle log',async({page})=>{
 await page.addInitScript(()=>{(window as any).toneStarts=[];const original=AudioParam.prototype.setValueAtTime;AudioParam.prototype.setValueAtTime=function(value:number,time:number){(window as any).toneStarts.push(value);return original.call(this,value,time);};});
 await start(page,true);
 await page.locator('#pause-button').click();await page.getByRole('button',{name:'重新部署',exact:true}).click();
 await page.locator('[data-owner="0"]').click();await page.locator('[data-choice="missile"]').click();
 await page.getByRole('button',{name:'开始对局',exact:true}).click();await page.locator('#weapon-special').click();
 // Replan against the seeded random deployment instead of aiming at old fixed spawns.
 const plan=new Game({seed:52,timer:0,mode:'hotseat',map:'valley',vehicle0:'missile',vehicle1:'bowl'});plan.start();
 let aim={angle:45,power:50,score:Infinity};
 for(let angle=20;angle<=45;angle++)for(let power=20;power<=95;power++){const hit=plan.predict(angle,power,'missile-special'),score=Math.abs(hit.x-plan.enemy.x)+Math.abs(hit.y-plan.enemy.y)*.5;if(score<aim.score)aim={angle,power,score};}
 await page.locator('#angle').evaluate((el:any,angle)=>{el.value=String(angle);el.dispatchEvent(new Event('input',{bubbles:true}));},aim.angle);
 const fire=await page.locator('#fire-button').boundingBox();await page.mouse.move(fire!.x+fire!.width/2,fire!.y+fire!.height/2);await page.mouse.down();await page.waitForTimeout((aim.power-10)/36*1000);await page.mouse.up();
 await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});await page.locator('#log-button').click();
 await expect(page.locator('.battle-log')).toContainText('追魂弹锁定目标');
 const tones=await page.evaluate(()=>(window as any).toneStarts);expect(tones.some((value:number)=>Math.abs(value-776)<1)).toBe(true);
});

test('small iPad Pro dashboard fits both 11-inch viewports with useful touch targets',async({page})=>{
  for(const width of [1194,1210]){
    await page.setViewportSize({width,height:834});await start(page,true);
    await page.waitForTimeout(2900);
    const deck=await page.locator('.dashboard').boundingBox(),field=await page.locator('#battlefield').boundingBox();
    expect(deck!.y+deck!.height).toBeLessThanOrEqual(834);expect(deck!.height).toBeLessThanOrEqual(142);
    expect(field!.width).toBeGreaterThan(width-30);expect(field!.height).toBeGreaterThan(600);
    const header=await page.locator('.scoreboard').boundingBox();expect(header!.height).toBeLessThanOrEqual(56);
    for(const id of ['#move-left','#move-right','#weapon-normal','#weapon-special','#quick-items [data-item="double"]','#skip-button','#exit-match']){
      const box=await page.locator(id).boundingBox();expect(box!.height,id).toBeGreaterThanOrEqual(44);
    }
    const overflowing=await page.locator('.dashboard').evaluate(el=>el.scrollWidth>el.clientWidth||el.scrollHeight>el.clientHeight);
    expect(overflowing).toBe(false);
    const minimap=await page.locator('#minimap-panel').boundingBox();expect(Math.abs(minimap!.x+minimap!.width/2-(field!.x+field!.width/2))).toBeLessThan(1);
    expect(minimap!.y).toBeGreaterThan(field!.y+field!.height*.8);expect(minimap!.y+minimap!.height).toBeLessThan(field!.y+field!.height);
    await page.screenshot({path:`QA/slots-regression-ipad-pro-11-${width}x834.png`});
  }
});

test('force meter charges without drag aiming, saves the shot power and minimap can fold',async({page})=>{
  await start(page,true);
  await page.locator('#minimap-toggle').click();await expect(page.locator('#minimap')).toBeHidden();
  await expect(page.locator('#minimap-toggle')).toHaveAttribute('aria-expanded','false');
  await page.keyboard.press('Tab');await expect(page.locator('#minimap')).toBeVisible();
  await page.locator('#minimap').click({position:{x:60,y:15}});await page.locator('#minimap-follow').click();
  const bar=await page.locator('#power-meter').boundingBox(),angle=await page.locator('#angle-value').textContent();
  await page.mouse.move(bar!.x+30,bar!.y+bar!.height/2);await page.mouse.down();await page.waitForTimeout(700);
  await expect.poll(async()=>Number(await page.locator('#power-value').textContent())).toBeGreaterThan(30);
  await page.mouse.move(bar!.x+200,bar!.y-80,{steps:5});await expect(page.locator('#angle-value')).toHaveText(angle!);
  await page.mouse.up();
  const marker=await page.locator('#previous-power').evaluate(el=>parseFloat(el.style.left));expect(marker).toBeGreaterThan(30);expect(marker).toBeLessThan(70);
  await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});
});

test('two touch pointers can aim on the dial while holding the force meter',async({page,context})=>{
  await start(page);
  const dial=await page.locator('#aim-pad').boundingBox(),bar=await page.locator('#power-meter').boundingBox();
  const session=await context.newCDPSession(page);
  const power={id:1,x:bar!.x+100,y:bar!.y+bar!.height/2},aim={id:2,x:dial!.x+dial!.width/2+15,y:dial!.y+12};
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[power]});await page.waitForTimeout(400);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[power,aim]});
  await expect.poll(async()=>Number(await page.locator('#angle-value').textContent())).toBeGreaterThan(50);
  await expect(page.locator('#fire-title')).toHaveText('蓄力中');
  await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect(page.locator('#fire-title')).toHaveText('开火');await expect(page.locator('#fire-button')).toBeEnabled();
  await page.locator('#log-button').click();await expect(page.locator('.battle-log')).not.toContainText('发射了');
});

test('the shell atlas renders twenty-seven genuinely distinct projectiles on the small iPad Pro',async({page})=>{
  await start(page,true,'valley',52,'45');await page.locator('#inventory-toggle').click();await page.locator('#weapons-tab').click();
  await expect(page.locator('#weapon-detail')).toContainText('以上为本作参数');
  await page.locator('.shell-atlas-button').click();await expect(page.locator('.shell-gallery article')).toHaveCount(27);
  const pixels=await page.locator('.shell-card-art').evaluateAll((canvases:any[])=>canvases.map(canvas=>{
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const rgb=canvas.dataset.color.match(/\w\w/g).map((x:string)=>parseInt(x,16));let body=0;
    for(let i=0;i<data.length;i+=4)if(data[i]===rgb[0]&&data[i+1]===rgb[1]&&data[i+2]===rgb[2]&&data[i+3]>200)body++;
    return {color:canvas.dataset.color,image:canvas.toDataURL(),body};
  }));
  expect(new Set(pixels.map(p=>p.color)).size).toBe(27);expect(new Set(pixels.map(p=>p.image)).size).toBe(27);expect(pixels.every(p=>p.body>12)).toBe(true);
  const close=await page.locator('.projectile-dialog .dialog-primary').boundingBox();expect(close!.y+close!.height).toBeLessThanOrEqual(814);
  const timer=await page.locator('#timer span').textContent();await page.waitForTimeout(400);await expect(page.locator('#timer span')).toHaveText(timer!);
  await page.screenshot({path:'QA/slots-regression-projectile-atlas-ipad-pro-11.png'});
  await page.locator('#close-dialog').click();await expect(page.locator('#fire-button')).toBeEnabled();
});

test('real snowfall is selectable at setup and remains visible in the battlefield UI',async({page})=>{
  await start(page);await page.locator('#pause-button').click();await page.getByRole('button',{name:'重新部署',exact:true}).click();
  await page.locator('[data-owner="0"]').click();await page.locator('[data-choice="water"]').click();
  await page.locator('input[name="snow"]').locator('..').click();await expect(page.locator('input[name="snow"]')).toBeChecked();
  await page.screenshot({path:'QA/slots-regression-snow-setup-ipad-pro-11.png'});
  await page.getByRole('button',{name:'开始对局',exact:true}).click();await expect(page.locator('#map-label')).toContainText('飘雪');
  await expect(page.locator('#status-0')).toContainText('水鬼');await expect(page.locator('#fire-button')).toBeEnabled();
});

test('holding icon controls explains them without switching or using an item',async({page})=>{
 await start(page);await page.locator('#weapon-special').click();
 const hold=async(selector:string)=>{const r=await page.locator(selector).boundingBox();await page.mouse.move(r!.x+r!.width/2,r!.y+r!.height/2);await page.mouse.down();await page.waitForTimeout(500);await expect(page.locator('#control-hint')).toBeVisible();};
 await hold('#quick-items [data-item="repair"]');await expect(page.locator('#control-hint')).toContainText('生命已满');await page.mouse.up();
 await hold('#weapon-normal');await expect(page.locator('#control-hint')).toContainText('巨石');await page.mouse.up();await expect(page.locator('#weapon-special')).toHaveAttribute('aria-pressed','true');
 await hold('#quick-items [data-item="double"]');await expect(page.locator('#control-hint')).toContainText('双发');await page.screenshot({path:'QA/slots-regression-control-hint-ipad-pro-11.png'});
 const button=await page.locator('#quick-items [data-item="double"]').boundingBox();await page.mouse.move(button!.x+button!.width/2+12,button!.y+button!.height/2);await page.mouse.up();
 await expect(page.locator('#status-0')).not.toContainText('双发');await page.locator('#quick-items [data-item="double"]').click();await expect(page.locator('#status-0')).toContainText('双发');
});
test('holding exit and pause icons does not accidentally interrupt the match',async({page})=>{
 await start(page);
 for(const selector of ['#exit-match','#pause-button']){const r=await page.locator(selector).boundingBox();await page.mouse.move(r!.x+r!.width/2,r!.y+r!.height/2);await page.mouse.down();await page.waitForTimeout(500);await expect(page.locator('#control-hint')).toBeVisible();await page.mouse.up();await expect(page.locator('#dialog')).not.toBeVisible();await expect(page.locator('#game-overlay')).toBeHidden();await expect(page.locator('#fire-button')).toBeEnabled();}
 await page.locator('#exit-match').click();await expect(page.locator('#dialog')).toBeVisible();
});

test('six map previews fit the small iPad and disclose sourced facts versus Web redraws',async({page})=>{
 for(const width of [1194,1210]){
  await page.setViewportSize({width,height:834});await page.goto('./');await page.getByRole('button',{name:'进入战场',exact:true}).click();
  await expect(page.locator('canvas[data-map-preview]')).toHaveCount(6);
  const previews=await page.locator('canvas[data-map-preview]').evaluateAll((canvases:any[])=>canvases.map(c=>c.toDataURL()));
  expect(new Set(previews).size).toBe(6);
  const close=await page.getByRole('button',{name:'开始对局',exact:true}).boundingBox();expect(close!.y+close!.height).toBeLessThanOrEqual(814);
  await page.screenshot({path:`QA/slots-regression-map-selection-${width}x834.png`});
  await page.locator('input[name="map"][value="temple"]').locator('..').click();await page.locator('.map-notes summary').click();
  await expect(page.locator('#map-choice-note')).toContainText('用户确认');await expect(page.locator('#map-choice-note')).toContainText('本作重绘');
  await page.locator('input[name="map"][value="egypt"]').locator('..').click();await expect(page.locator('#map-choice-note')).toContainText('未取得原版地形细节');
  await page.screenshot({path:`QA/slots-regression-map-evidence-${width}x834.png`});
 }
});

test('classic factory temple and Egypt render with compact HUD and centered minimap',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1194,1210])for(const [id,name] of [['factory','钢铁工厂'],['temple','神圣殿堂'],['egypt','古老埃及']]){
  await page.setViewportSize({width,height:834});await start(page,true,id);await page.waitForTimeout(2900);
  await expect(page.locator('#map-label')).toContainText(name);await expect(page.locator('#fire-button')).toBeEnabled();
  const field=await page.locator('#battlefield').boundingBox(),mini=await page.locator('#minimap-panel').boundingBox();
  expect(field!.height).toBeGreaterThan(600);expect(Math.abs(mini!.x+mini!.width/2-width/2)).toBeLessThan(1);
  await page.screenshot({path:`QA/slots-regression-${id}-${width}x834.png`});
 }
 expect(errors).toEqual([]);
});

test('weapon choice survives AI alternation and seamless hotseat handoff',async({page})=>{
 await start(page);await expect(page.locator('#waiting-value')).toHaveText('—');
 await page.locator('#weapon-special').click();await page.locator('#skip-button').click();
 await expect(page.locator('#turn-text')).toHaveText('咪猪头，到你了',{timeout:25_000});
 await expect(page.locator('#weapon-special')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#fire-note')).toContainText('火石');
 await start(page,true);await page.locator('#weapon-special').click();await page.locator('#skip-button').click();
 await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});
 for(let action=0;action<4;action++){
  await page.locator('#skip-button').click();await expect(page.locator('#fire-button')).toBeEnabled({timeout:20000});
  const handedToHuman=(await page.locator('#turn-text').textContent())!.includes('咪猪头');
  if(handedToHuman)break;
 }
 await expect(page.locator('#turn-text')).toHaveText('咪猪头，到你了');
 await expect(page.locator('#weapon-special')).toHaveAttribute('aria-pressed','true');
});
