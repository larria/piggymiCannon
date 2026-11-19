import {test,expect} from '@playwright/test';
import {boot} from './qa-app';
import {teamFlag} from '../../src/crew';

for(const device of [
 {name:'PC',width:1440,height:900,touch:false},
 {name:'iPad',width:1194,height:834,touch:true},
 {name:'phone portrait',width:390,height:844,touch:true},
 {name:'phone landscape',width:844,height:390,touch:true},
])test.describe(device.name,()=>{
 test.use({viewport:{width:device.width,height:device.height},isMobile:device.touch,hasTouch:device.touch});
 test('transparent overview keeps solid flags, grey corpses, outlined controls and an opaque wind meter',async({page})=>{
  await boot(page);const result=await page.evaluate(()=>{
   const before=(window as any).__qa;before.newMatch({...before.game.config,slots:before.game.config.slots.map((s:any,i:number)=>({...s,enabled:true,controller:'human',team:i}))},true);
   const q=(window as any).__qa,g=q.game;g.update=()=>{};g.fog=false;g.wind=4;
   g.tanks.forEach((t:any,i:number)=>Object.assign(t,{x:350+i*550,y:500,fallVelocity:0,outOfBounds:i===3,hp:i===1?0:t.maxHP}));q.updateUI();
   const draw=()=>q.dashboard.draw(g,g.active,0,630,0,1000);q.dashboard.invalidate();draw();
   const map=document.querySelector<HTMLCanvasElement>('#minimap')!,c=map.getContext('2d')!,pixel=(x:number,y:number)=>Array.from(c.getImageData(Math.floor(x),Math.floor(y),1,1).data);
   const dots=g.tanks.map((t:any)=>({team:t.team,dead:t.hp<=0,out:t.outOfBounds,pixel:pixel(t.x/g.worldWidth*300,t.y/g.worldHeight*168)}));
   const pixels=c.getImageData(0,0,300,168).data,color=dots[0].pixel;let left=300,right=0,top=168,bottom=0;
   for(let y=0;y<168;y++)for(let x=0;x<300;x++){const i=(y*300+x)*4;if(pixels[i]===color[0]&&pixels[i+1]===color[1]&&pixels[i+2]===color[2]&&pixels[i+3]===255){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
   const circle={w:(right-left+1)*map.clientWidth/300,h:(bottom-top+1)*map.clientHeight/168};
   const background=pixel(295,15),frames=q.dashboard.mapFrames;for(let i=0;i<50;i++)draw();
   g.tanks[1].x+=150;draw();const updated=q.dashboard.mapFrames;
   const box=(selector:string)=>{const e=document.querySelector(selector)!,r=e.getBoundingClientRect(),s=getComputedStyle(e),icon=e.querySelector('.icon');return {w:r.width,h:r.height,border:s.borderWidth,radius:s.borderRadius,background:s.backgroundColor,opacity:s.opacity,padding:s.padding,iconFilter:icon?getComputedStyle(icon).filter:null};};
   const toolbar=[...document.querySelectorAll<HTMLElement>('.stage-top .stage-button')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {id:e.id,h:r.height,w:r.width,bg:s.backgroundColor,border:s.borderWidth,filter:getComputedStyle(e.querySelector('.icon')!).filter};});
   return {dots,circle,background,frames,updated,toolbar,idleFrames:updated-frames-1,panel:box('#minimap-panel'),map:box('#minimap'),toggle:box('#minimap-toggle'),follow:box('#minimap-follow'),wind:box('#wind-gauge')};
  });
  expect(result.panel.border).toBe('0px');expect(result.panel.radius).toBe('0px');expect(result.panel.background).toBe('rgba(0, 0, 0, 0)');expect(result.map.radius).toBe('0px');
  expect(result.background[3]).toBeGreaterThan(100);expect(result.background[3]).toBeLessThan(180);
  expect(Math.abs(result.circle.w-result.circle.h)).toBeLessThan(1.5);
  for(const dot of result.dots){if(dot.out){expect(dot.pixel[3]).toBeLessThan(255);continue;}const color=dot.dead?'#8c9188':teamFlag(dot.team).color;expect(dot.pixel).toEqual([parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16),255]);}
  expect(result.idleFrames).toBe(0);expect(result.updated).toBe(result.frames+1);
  for(const button of [result.toggle,result.follow]){expect(button.h).toBe(24);expect(button.opacity).toBe('1');expect(button.background).toBe('rgba(0, 0, 0, 0)');expect(button.padding).toBe('0px');expect(button.iconFilter).toContain('drop-shadow');}
  expect(result.toolbar.length).toBeGreaterThanOrEqual(5);for(const button of result.toolbar){expect(button.h).toBeGreaterThanOrEqual(35);expect(button.w).toBeGreaterThanOrEqual(35);expect(button.bg).toBe('rgba(0, 0, 0, 0)');expect(button.border).toBe('0px');expect(button.filter).toContain('drop-shadow');}
  expect(result.wind.h).toBe(device.name.startsWith('phone')?6:9);expect(result.wind.opacity).toBe('1');expect(result.wind.background).toBe('rgb(255, 254, 249)');
  await page.locator('#minimap-toggle').click();await expect(page.locator('#minimap')).toBeHidden();await expect(page.locator('#wind-gauge')).toBeVisible();await page.locator('#minimap-follow').click();await page.locator('#minimap-toggle').click();
  const map=(await page.locator('#minimap').boundingBox())!;await page.mouse.click(map.x+map.width*.8,map.y+map.height*.8);expect(await page.evaluate(()=>(window as any).__qa.renderer.camera.manual)).not.toBeNull();await page.locator('#minimap-follow').click();expect(await page.evaluate(()=>(window as any).__qa.renderer.camera.manual)).toBeNull();
 });
});
