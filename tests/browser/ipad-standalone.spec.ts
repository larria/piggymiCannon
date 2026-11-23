import {expect,test} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {boot} from './qa-app';

test.use({viewport:{width:1194,height:834},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'});

test('iPad standalone reserves the top status bar and uses the recovered bottom room for the battlefield',async({page,browserName})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true,configurable:true}));
 await boot(page,false);
 await expect(page.locator('html')).toHaveClass(/ios-standalone/);
 // Desktop WebKit has zero system insets. Simulate the reported status bar and
 // the legacy PWA layout that lost 48px below the dashboard.
 await page.addStyleTag({content:'.ios-standalone{--tablet-safe-top:31px}html.ipad-qa-before .combat-mode .main-shell{position:static;height:calc(100lvh - 48px);padding-bottom:0}html.ipad-qa-before .combat-mode .compact-dashboard{grid-template-columns:188px minmax(0,1fr) 156px}html.ipad-qa-before .combat-mode .angle-instrument{width:94px;height:94px}'});
 const top=await page.locator('.site-header').boundingBox();expect(top!.y).toBe(31);
 if(process.env.PIGGY_IPAD_CAPTURE)await page.screenshot({path:`QA/v5.1.5-ipad-home-${browserName}.png`,scale:'css'});
 await page.getByRole('button',{name:'进入战场',exact:true}).click();
 await page.locator('[data-choice="ion"]').click();await page.locator('input[name="map"][value="temple"]').locator('..').click();
 await page.getByRole('button',{name:'开始对局',exact:true}).click();
 const result=await page.evaluate(()=>{
  const q=(window as any).__qa,g=q.game,w=g.worldWidth;
  q.renderer.finishTour();g.update=()=>{};g.wind=0;
  const capX=Math.round(w/2),crown=g.ground(capX,g.worldHeight*.85);
  g.crater(capX,crown,90,28);Object.assign(g.active,{x:capX+28,y:g.support(capX+28,crown+9)-18,fallVelocity:0});
  q.renderer.focusAt(capX,g.worldHeight*.91);
  const box=(s:string)=>{const r=document.querySelector(s)!.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height,left:r.left,right:r.right};};
  const dims=()=>({header:box('.scoreboard'),battle:box('#battlefield'),deck:box('.compact-dashboard'),dial:box('#aim-pad'),nudge:box('#angle-up'),fire:box('#fire-button')});
  document.documentElement.classList.add('ipad-qa-before');const before=dims();document.documentElement.classList.remove('ipad-qa-before');
  q.renderer.resize();q.renderer.focusAt(capX,g.worldHeight*.91);q.updateUI();q.renderer.draw(0);
  const pixels=(document.querySelector('#minimap') as HTMLCanvasElement).getContext('2d')!.getImageData(0,0,300,168).data;
  const capHints=[143,525,960,1395,1778].map(x=>{const cx=Math.round(x/1920*300);let gold=0;for(let y=143;y<157;y++)for(let u=cx-3;u<=cx+3;u++){const i=(y*300+u)*4;if(pixels[i]-pixels[i+1]>28&&pixels[i+1]-pixels[i+2]>30)gold++;}return gold;});
  return {before,after:dims(),height:innerHeight,capHints};
 });
 expect(result.after.header.top).toBe(31);expect(result.after.deck.bottom).toBe(result.height);
 expect(result.after.deck.height).toBe(result.before.deck.height);
 expect(result.after.battle.height-result.before.battle.height).toBe(48);
 expect(result.after.dial.width).toBe(114);expect(result.after.dial.right).toBeLessThanOrEqual(result.after.nudge.left);
 expect(result.after.fire.bottom).toBeLessThan(result.height);
 expect(result.capHints.every(n=>n>0)).toBe(true);
 await page.locator('#angle-up').tap();await expect(page.locator('#aim-pad')).toBeInViewport();
 if(process.env.PIGGY_IPAD_CAPTURE){
  await page.waitForFunction(()=>{const {renderer:r,game:g}=(window as any).__qa;return r.offsetY>=g.worldHeight-r.viewHeight-1;});
  await page.screenshot({path:`QA/v5.1.5-ipad-battle-${browserName}.png`,scale:'css'});writeFileSync(`QA/v5.1.5-ipad-geometry-${browserName}.json`,JSON.stringify(result,null,2)+'\n');}
});

test('a short opposite movement press on a bare temple cap turns without stepping into the gap',async({page})=>{
 await boot(page,true,'temple');
 const before=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game,x=g.worldWidth/2,crown=g.ground(x,g.worldHeight*.85);g.crater(x,crown,95,38);Object.assign(g.active,{x:x+30,y:g.support(x+30,crown+14)-18,direction:-1,fallVelocity:0});q.updateUI();return {x:g.active.x,fuel:g.active.fuel};});
 await page.locator('#move-right').tap();
 const stage=()=>page.evaluate(()=>{const {active:t}=(window as any).__qa.game;return {x:t.x,dir:t.direction,fuel:t.fuel,fall:t.fallVelocity};});
 expect(await stage()).toEqual({...before,dir:1,fall:0});
 await page.keyboard.press('ArrowLeft');await page.waitForTimeout(120);
 expect(await stage()).toEqual({...before,dir:-1,fall:0});
 await page.keyboard.down('ArrowRight');
 await expect.poll(async()=>(await stage()).x).toBeGreaterThan(before.x);
 await page.keyboard.up('ArrowRight');
});

test('the drawn orbital beam brightens and thickens only on an actual boosted strike',async({page})=>{
 await boot(page,true,'temple','ion');
 const strokes=await page.evaluate(()=>{
  const q=(window as any).__qa,g=q.game,r=q.renderer,c=r.ctx,x=g.active.x;
  g.update=()=>{};g.phase='flying';r.focusAt(x,150);
  const read=(boosted:boolean)=>{
   const rows:{color:string;width:number}[]=[];
   g.projectiles=[{...g.launch(g.active,'ion-special'),x,y:180,sub:true,fireBoosted:boosted,boost:boosted?1.5:1}];
   const original=c.strokeStyle,colors=new Map(['#bf312770','#c0bdf595','#e44834','#ffe3b9'].map(color=>{c.strokeStyle=color;return [c.strokeStyle,color];}));c.strokeStyle=original;
   const stroke=c.stroke;c.stroke=function(...args:any[]){const color=colors.get(c.strokeStyle);if(color)rows.push({color,width:c.lineWidth});return stroke.apply(c,args);};
   try{r.draw(0);}finally{c.stroke=stroke;}
   return rows;
  };
  return {normal:read(false),boosted:read(true)};
 });
 expect(strokes.normal).toHaveLength(1);expect(strokes.boosted.map(s=>s.color)).toContain('#e44834');
 expect(strokes.boosted.find(s=>s.color==='#e44834')!.width).toBeCloseTo(strokes.normal[0].width*2);
});
