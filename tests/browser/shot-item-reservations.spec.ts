import {expect,test} from '@playwright/test';
import {boot} from './qa-app';

test('quick controls and arsenal toggle the same reserved item, and firing picks up a nearby crate',async({page})=>{
 await boot(page);
 const slot=page.locator('#quick-items [data-item-slot="0"]');
 await page.evaluate(()=>{
  const g=(window as any).__qa.game,t=g.active;
  g.crates=[{x:t.x,y:t.y,type:'medical'}];
 });
 await slot.click();
 await expect(slot).toHaveAttribute('aria-pressed','true');
 await expect(slot).toBeEnabled();
 await page.locator('#inventory-toggle').click();
 await page.locator('#items-tab').click();
 const tile=page.locator('#inventory-grid [data-item-slot="0"]');
 await expect(tile).toHaveAttribute('aria-pressed','true');
 await tile.click();
 await expect(tile).toHaveAttribute('aria-pressed','false');
 await expect(slot).toHaveAttribute('aria-pressed','false');
 await page.locator('#arsenal-close').click();
 await page.keyboard.press('F9');
 await expect(slot).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>(window as any).__qa.game.crates.length)).toBe(1);
 await page.locator('#fire-button').press('Enter');
 await expect(slot).toHaveAttribute('data-item','repair');
 const result=await page.evaluate(()=>{const g=(window as any).__qa.game;return {crates:g.crates.length,stock:g.active.items.repair};});
 expect(result).toEqual({crates:0,stock:2});
});

test('ordinary and rejected button sounds are reduced independently of other effects and music',async({page})=>{
 await boot(page,false);
 const report=await page.evaluate(()=>{
  const audio=(window as any).__qa.audio;
  const clips:HTMLMediaElement[]=[];
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){clips.push(this);return Promise.resolve();};
  try{
   audio.unlocked=true;audio.setSoundEnabled(true);audio.setVolume(.8);
   for(const name of ['click','denied','win'])audio.play(name);
   const initial=clips.map(clip=>clip.volume);
   audio.setVolume(.4);
   return {initial,changed:clips.map(clip=>clip.volume),music:audio.music.volume};
  }finally{HTMLMediaElement.prototype.play=play;}
 });
 expect(report.initial[0]).toBeCloseTo(.42,6);
 expect(report.initial[1]).toBeCloseTo(.42,6);
 expect(report.initial[2]).toBeCloseTo(.6,6);
 expect(report.changed[0]).toBeCloseTo(.21,6);
 expect(report.changed[1]).toBeCloseTo(.21,6);
 expect(report.changed[2]).toBeCloseTo(.30,6);
 expect(report.music).toBeCloseTo(.22,6);
});
