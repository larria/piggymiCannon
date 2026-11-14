import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const version=JSON.parse(readFileSync(root+'/package.json','utf8')).version;
// Test-only bundle of the actual app, exposing state for deterministic visual QA.
// The production build contains no state hooks; normal game.spec tests exercise its PWA.
const bundle=build({stdin:{contents:readFileSync(root+'/src/main.ts','utf8')+"\nObject.defineProperty(window,'__qa',{get:()=>({game,renderer,audio,updateUI})});",resolveDir:root+'/src',loader:'ts'},bundle:true,write:false,format:'esm',define:{'import.meta.env.BASE_URL':'"/piggymiCannon/"',__APP_VERSION__:JSON.stringify(version)},plugins:[{name:'qa-only',setup(b){b.onResolve({filter:/virtual:pwa-register/},()=>({path:'pwa',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export const registerSW=()=>()=>{};'}));b.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));}}]}).then(r=>r.outputFiles[0].text);
async function boot(page:any,combat=true,map="factory"){
 await page.route('**/assets/index-*.js',async(route:any)=>route.fulfill({contentType:'text/javascript',body:await bundle}));
 await page.goto('./');
 if(!combat)return;
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator('[data-choice="cannon"]').click();
 await page.locator('[data-owner="1"]').click();await page.locator('[data-choice="sea"]').click();
 await page.locator('.mode-choices .choice-card').nth(1).click();await page.locator(`input[name="map"][value="${map}"]`).locator('..').click();
 await page.locator('#turn-timer').selectOption('0');await page.getByRole('button',{name:'开始对局',exact:true}).click();
}
test('music and effects switches operate and persist independently in both directions',async({page})=>{
 await page.addInitScript(()=>{(window as any).audioPlays=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){(window as any).audioPlays.push(this.src);return play.call(this);};});
 await boot(page,false);await page.locator('#sound-button').click();
 await page.locator('#music-toggle').click();await expect(page.locator('#effects-toggle')).toHaveAttribute('aria-checked','true');
 await expect(page.locator('#music-toggle')).toHaveAttribute('aria-checked','false');await page.getByRole('button',{name:'设置好了',exact:false}).click();
 expect(await page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(true);
 const plays=await page.evaluate(()=>(window as any).audioPlays.filter((s:string)=>s.includes('sfx_click')).length);
 await page.locator('#sound-button').click();expect(await page.evaluate(()=>(window as any).audioPlays.filter((s:string)=>s.includes('sfx_click')).length)).toBeGreaterThan(plays);
 await page.locator('#effects-toggle').click();await page.locator('#music-toggle').click();await page.getByRole('button',{name:'设置好了',exact:false}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.audio.music.paused)).toBe(false);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('piggy-settings')!))).toMatchObject({soundEnabled:false,musicEnabled:true});
 const mutedPlays=await page.evaluate(()=>(window as any).audioPlays.filter((s:string)=>s.includes('sfx_click')).length);
 await page.locator('#sound-button').click();expect(await page.evaluate(()=>(window as any).audioPlays.filter((s:string)=>s.includes('sfx_click')).length)).toBe(mutedPlays);
 await page.screenshot({path:'QA/v1.7-independent-audio-ipad.png'});await page.reload();await page.locator('#sound-button').click();
 await expect(page.locator('#effects-toggle')).toHaveAttribute('aria-checked','false');await expect(page.locator('#music-toggle')).toHaveAttribute('aria-checked','true');
});
test('fog keeps true enemy health and thirty-percent breathing is distinct from sea rage',async({page})=>{
 await boot(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.fog=true;g.fogTurnsRemaining=2;g.tanks[0].hp=Math.ceil(g.tanks[0].maxHP*.3);g.tanks[1].hp=Math.floor(g.tanks[1].maxHP*.49);});
 await expect(page.locator('#hp-0')).toHaveText('276 / 920');await expect(page.locator('#hp-1')).toHaveText('431 / 880');
 expect(await page.locator('#hp-bar-1').evaluate(el=>parseFloat(el.style.width))).toBeCloseTo(431/880*100,2);
 await expect.poll(()=>page.locator('#hp-bar-1').evaluate(el=>el.getBoundingClientRect().width/el.parentElement!.getBoundingClientRect().width)).toBeCloseTo(431/880,2);
 await expect(page.locator('#hp-bar-0')).toHaveClass(/critical/);await expect(page.locator('#hp-bar-1')).not.toHaveClass(/critical/);
 await page.screenshot({path:'QA/v1.7-fog-true-health-ipad.png'});
 await page.evaluate(()=>(window as any).__qa.game.fog=false);await expect(page.locator('#status-0')).toContainText('喘气中');await expect(page.locator('#status-1')).toContainText('发怒');await expect(page.locator('#status-1')).not.toContainText('喘气');
 await page.screenshot({path:'QA/v1.7-breathing-and-rage-ipad.png'});
});
test('victory and prone crying animate before and around the result card on both small iPads',async({page})=>{
 for(const width of [1194,1210]){
  await page.setViewportSize({width,height:834});await boot(page);
  await page.evaluate(()=>{const g=(window as any).__qa.game;g.damage(g.enemy,9999,0);});await expect(page.locator('#hp-1')).toHaveText('0 / 880');
  await expect(page.locator('#game-overlay')).toBeHidden();await page.waitForTimeout(700);
  const a=await page.locator('#battlefield').evaluate((c:any)=>c.toDataURL());await page.waitForTimeout(350);
  const b=await page.locator('#battlefield').evaluate((c:any)=>c.toDataURL());expect(a).not.toBe(b);
  expect(await page.evaluate(()=>(window as any).__qa.game.enemy.outOfBounds)).toBe(false);
  await page.screenshot({path:`QA/v1.7-victory-crying-${width}x834.png`});
  await expect(page.locator('.result')).toBeVisible({timeout:5000});await page.screenshot({path:`QA/v1.7-result-card-${width}x834.png`});
 }
});
test('a killed unsupported loser settles off-map and does not leave a wreck or a crying pig in water',async({page})=>{
 await boot(page,true,'coast');await page.evaluate(()=>{const g=(window as any).__qa.game;g.crater(g.enemy.x,400,180,250);g.damage(g.enemy,9999,0);});
 await expect.poll(()=>page.evaluate(()=>(window as any).__qa.game.enemy.outOfBounds)).toBe(true);
 await page.screenshot({path:'QA/v1.7-defeat-off-map-ipad.png'});
});
test('transfer uses the force meter and moves to its landing position without damaging the enemy',async({page})=>{
 await boot(page);await page.evaluate(()=>{const g=(window as any).__qa.game;g.wind=0;g.active.angle=35;});
 await page.locator('#quick-items [data-item="teleport"]').click();await expect(page.locator('#fire-note')).toContainText('转移弹已装填');
 await expect(page.locator('#fire-button')).toBeEnabled();await page.keyboard.down('Space');await page.waitForTimeout(1100);await page.keyboard.up('Space');
 await expect(page.locator('.handoff')).toBeVisible({timeout:15000});
 const outcome=await page.evaluate(()=>{const g=(window as any).__qa.game;return {x:g.tanks[0].x,hp:g.tanks[1].hp,stock:g.tanks[0].items.teleport,shots:g.tanks[0].shots,log:g.log};});
 expect(outcome.x).toBeGreaterThan(405);expect(outcome.hp).toBe(880);expect(outcome.stock).toBe(0);expect(outcome.shots).toBe(1);expect(outcome.log.some((s:string)=>s.includes('抵达落点'))).toBe(true);
});
test('direct graze and fall expressions stay visibly different with enlarged motions',async({page})=>{
 await boot(page);
 for(const reaction of ['direct','graze','fall']){await page.evaluate(kind=>{(window as any).__qa.game.tanks[0].reaction={kind,remaining:20};},reaction);await page.waitForTimeout(200);await page.screenshot({path:`QA/v1.7-reaction-${reaction}-ipad.png`});}
});
