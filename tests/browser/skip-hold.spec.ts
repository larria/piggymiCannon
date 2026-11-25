import {test,expect} from '@playwright/test';
import {boot} from './qa-app';

test('short press and pointer cancellation never skip; sustained press shows a ring and advances once',async({page,browserName})=>{
 await boot(page);
 const button=page.locator('#skip-button');
 const state=()=>page.evaluate(()=>{const q=(window as any).__qa;return {turn:q.game.turn,progress:q.renderer.skipProgress};});
 const start=(await state()).turn;

 await button.tap();
 expect(await state()).toEqual({turn:start,progress:null});
 await button.hover();await page.mouse.down();
 await expect.poll(async()=>(await state()).progress??0).toBeGreaterThan(.12);
 expect((await state()).turn).toBe(start);
 await page.mouse.move(5,20);await page.mouse.up();
 expect(await state()).toEqual({turn:start,progress:null});

 const b=(await button.boundingBox())!,x=Math.round(b.x+b.width/2),y=Math.round(b.y+b.height/2);
 if(browserName==='chromium'){
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await expect(button).toHaveClass(/holding/);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect(button).not.toHaveClass(/holding/);
  expect((await state()).turn).toBe(start);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await expect.poll(async()=>(await state()).turn).toBe(start+1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
 }else{
  await page.keyboard.press('F5');expect((await state()).turn).toBe(start);
  await page.keyboard.down('F5');
  await expect.poll(async()=>(await state()).progress??0).toBeGreaterThan(.12);
  await expect.poll(async()=>(await state()).turn).toBe(start+1);
  await page.keyboard.up('F5');
 }
 await page.waitForTimeout(300);
 expect(await state()).toEqual({turn:start+1,progress:null});
});

test('only the field ticket announces human item use, clearing the marker and long-press menu',async({page,browserName})=>{
 await boot(page);
 const ui=await page.evaluate(()=>{
  const e=document.querySelector('#skip-button')!;
  const event=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});
  e.dispatchEvent(event);
  return {menuBlocked:event.defaultPrevented,touchAction:getComputedStyle(e).touchAction};
 });
 expect(ui).toEqual({menuBlocked:true,touchAction:'none'});
 const boost=page.locator('#quick-items [data-item="boost"]');
 await boost.tap();
 await expect(page.locator('#quick-items [data-item="double"]')).toBeDisabled();
 await expect(page.locator('#toast')).not.toContainText('威力加强');
 await expect(page.locator('#battle-message')).not.toContainText('威力加强');
 const report=await page.evaluate(()=>{
  const q=(window as any).__qa,g=q.game,r=q.renderer,t=g.active;
  g.update=()=>{};g.itemCues[0].age=.22;
  r.focusAt(t.x,t.y-130*g.layoutScale);for(let i=0;i<10;i++)r.draw(.04);
  const c=r.ctx,original=c.roundRect,originalStroke=c.stroke,originalArc=c.arc;
  let ticketTop=Infinity,markerCount=0,ringCount=0;
  c.roundRect=function(x:number,y:number,w:number,h:number,...rest:any[]){
   if(w===88&&h===32){const m=this.getTransform();ticketTop=m.f+y*m.d;}
   return original.call(this,x,y,w,h,...rest);
  };
  c.stroke=function(...args:any[]){
   if(c.strokeStyle==='#d8b774'&&c.lineWidth===1.5)markerCount++;
   return originalStroke.apply(this,args);
  };
  c.arc=function(x:number,y:number,radius:number,...args:any[]){
   if(x===0&&y===0&&radius===14&&c.fillStyle==='#fff8e8')ringCount++;
   return originalArc.call(this,x,y,radius,...args);
  };
  const cues=g.itemCues,frame=(withTicket:boolean,progress:number|null)=>{
   g.itemCues=withTicket?cues:[];r.skipProgress=progress;ticketTop=Infinity;markerCount=0;ringCount=0;r.draw(0);
   const a=r.cueAnchors.find((v:any)=>v.tank.id===t.id);
   return {ticket:Number.isFinite(ticketTop),markerCount,ringCount,ringBottom:a?.ringY!=null?(a.ringY+14*g.layoutScale-r.offsetY)*r.ratio:null,ticketTop};
  };
  try{return {alone:frame(false,null),ticket:frame(true,null),ring:frame(false,.58),both:frame(true,.58)};}
  finally{c.roundRect=original;c.stroke=originalStroke;c.arc=originalArc;}
 });
 expect(report.alone.markerCount).toBe(1);
 expect(report.ticket.ticket).toBe(true);
 expect(report.ticket.markerCount).toBe(0);
 expect(report.ring.markerCount).toBe(0);
 expect(report.ring.ringCount).toBe(1);
 expect(report.both.markerCount).toBe(0);
 expect(report.both.ringBottom).not.toBeNull();
 expect(report.both.ticket).toBe(true);
 expect(report.both.ticketTop).toBeGreaterThan(report.both.ringBottom!);
 await page.screenshot({path:`.workbuddy/v5.1.10-skip-ticket-${browserName}.png`,scale:'css'});
});
