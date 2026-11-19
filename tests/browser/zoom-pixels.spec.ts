import {test,expect} from '@playwright/test';import {boot} from './qa-app';import {writeFileSync} from 'node:fs';
test.use({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
test('zoomed retained tiles agree with Canvas without vertical seams',async({page,browserName})=>{
 await boot(page);await expect.poll(()=>page.evaluate(()=>(window as any).__qa.renderer.backend)).toBe('pixi');
 const cases=await page.evaluate(()=>{const q=(window as any).__qa,g=q.game,r=q.renderer;g.paused=true;r.focusAt(1344,480);r.camera.center(1344,480,false);const results=[];
 for(const zoom of [1,1.1190722569127807,1.4,1.8,.7]){
  r.zoomBy(zoom/r.zoom);r.time=0;r.draw(0);const stage=r.stage,c=document.createElement('canvas');c.width=r.canvas.width;c.height=r.canvas.height;const ctx=c.getContext('2d')!;ctx.drawImage(stage.canvas,0,0);ctx.drawImage(r.canvas,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;
  r.stage=null;r.invalidate();r.draw(0);const b=r.ctx.getImageData(0,0,c.width,c.height).data;r.stage=stage;r.invalidate();r.draw(0);
  let sum=0,large=0;const columns=new Map<number,number>();for(let n=0;n<a.length;n++){const d=Math.abs(a[n]-b[n]);sum+=d;if(d>12){large++;const x=Math.floor(n/4)%c.width;columns.set(x,(columns.get(x)??0)+1);}}
  results.push({zoom,mean:sum/a.length,largeFraction:large/a.length,columns:[...columns].sort((a,b)=>b[1]-a[1]).slice(0,8)});
 }
 return results;});
 writeFileSync(`QA/v5.0.10-zoom-pixels-${browserName}.json`,JSON.stringify(cases,null,2));
 for(const c of cases){expect(c.mean,JSON.stringify(c)).toBeLessThan(.25);// Fractional DPR interpolates curved edges; a seam instead produces hundreds
  // of differing channel samples concentrated in one vertical column.
  expect(c.largeFraction,JSON.stringify(c)).toBeLessThan(.005);expect(c.columns[0]?.[1]??0,JSON.stringify(c)).toBeLessThan(100);}
});
