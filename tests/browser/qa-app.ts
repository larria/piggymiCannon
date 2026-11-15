import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const version=JSON.parse(readFileSync(root+'/package.json','utf8')).version;
// Test-only bundle of the actual app, exposing state for deterministic visual QA.
// The production build contains no state hooks; normal game.spec tests exercise its PWA.
const bundle=build({stdin:{contents:readFileSync(root+'/src/main.ts','utf8')+"\nimport {projectileArt,projectileDrawScale} from './projectile-art';\nObject.defineProperty(window,'__qa',{get:()=>({game,renderer,dashboard,audio,updateUI,projectileArt,projectileDrawScale,newMatch:(next,start)=>{if(next.mode||next.difficulty){next={...next,slots:next.slots.map((s,i)=>({...s,controller:next.mode?(next.mode==='hotseat'||i===0?'human':'ai'):s.controller,difficulty:next.difficulty??s.difficulty}))};}if(next.vehicle0!==undefined||next.vehicle1!==undefined){next={...next,slots:next.slots.map((s,i)=>({...s,vehicle:i===0?next.vehicle0??s.vehicle:i===1?next.vehicle1??s.vehicle:s.vehicle}))};}newMatch(next,start);}})});",resolveDir:root+'/src',loader:'ts'},bundle:true,write:false,format:'esm',define:{'import.meta.env.BASE_URL':'"/piggymiCannon/"',__APP_VERSION__:JSON.stringify(version)},plugins:[{name:'qa-only',setup(b){b.onResolve({filter:/virtual:pwa-register/},()=>({path:'pwa',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export const registerSW=()=>()=>{};'}));b.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));}}]}).then(r=>r.outputFiles[0].text);
export async function boot(page:any,combat=true,map="factory",vehicle0="cannon",vehicle1="sea"){
 await page.route('**/assets/index-*.js',async(route:any)=>route.fulfill({contentType:'text/javascript',body:await bundle}));
 await page.goto('./');
 if(!combat)return;
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator(`[data-choice="${vehicle0}"]`).click();
 await page.locator('[data-owner="1"]').click();await page.locator(`[data-choice="${vehicle1}"]`).click();
 await page.locator('[data-controller="1"]').selectOption('human');await page.locator(`input[name="map"][value="${map}"]`).locator('..').click();
 await page.locator('#turn-timer').selectOption('0');await page.getByRole('button',{name:'开始对局',exact:true}).click();
}
