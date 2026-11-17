import {test,expect} from '@playwright/test';import {boot} from './qa-app';
test.use({deviceScaleFactor:2});
async function ready(page:any){await boot(page);await page.evaluate(()=>{const q=(window as any).__qa;q.recorder.detach();q.game.wind=0;q.game.active.power=80;q.updateUI();});}
test('painted horizontal charge fill has real height and color and grows after preparation',async({page})=>{
 await ready(page);const state=await page.evaluate(async()=>{const button=document.querySelector('#power-meter')!,fill=document.querySelector<HTMLElement>('#charge-fill')!;button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:981,pointerType:'touch',buttons:1}));await new Promise(r=>setTimeout(r,300));const before=fill.getBoundingClientRect().width;await new Promise(r=>setTimeout(r,500));const box=fill.getBoundingClientRect(),css=getComputedStyle(fill);document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:981,pointerType:'touch'}));return {before,width:box.width,height:box.height,background:css.backgroundColor};});
 expect(state.height).toBeGreaterThan(4);expect(state.background).not.toBe('rgba(0, 0, 0, 0)');expect(state.width).toBeGreaterThan(state.before+50);
});
test('horizontal fill remains painted when a decorative sibling precedes it',async({page})=>{
 await ready(page);const state=await page.evaluate(()=>{const bar=document.querySelector('#power-meter')!,decoration=document.createElement('i');decoration.hidden=true;bar.prepend(decoration);const fill=document.querySelector('#charge-fill')!,css=getComputedStyle(fill);return {height:fill.getBoundingClientRect().height,background:css.backgroundColor};});expect(state.height).toBeGreaterThan(4);expect(state.background).not.toBe('rgba(0, 0, 0, 0)');
});
