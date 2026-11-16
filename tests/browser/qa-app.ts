import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const baselineRef=process.env.PIGGY_BASELINE_REF;
const source=(name:string)=>baselineRef?execFileSync('git',['show',`${baselineRef}:src/${name}`],{encoding:'utf8'}):readFileSync(root+'/src/'+name,'utf8');
const version=JSON.parse(readFileSync(root+'/package.json','utf8')).version;
// Test-only bundle of the actual app, exposing state for deterministic visual QA.
// The production build contains no state hooks; normal game.spec tests exercise its PWA.
const bundle=build({stdin:{contents:source('main.ts')+"\nimport {projectileArt,projectileDrawScale} from './projectile-art';\nObject.defineProperty(window,'__qa',{get:()=>({game,renderer,dashboard,audio,updateUI,projectileArt,projectileDrawScale,newMatch:(next,start)=>{if(next.mode||next.difficulty){next={...next,slots:next.slots.map((s,i)=>({...s,controller:next.mode?(next.mode==='hotseat'||i===0?'human':'ai'):s.controller,difficulty:next.difficulty??s.difficulty}))};}if(next.vehicle0!==undefined||next.vehicle1!==undefined){next={...next,slots:next.slots.map((s,i)=>({...s,vehicle:i===0?next.vehicle0??s.vehicle:i===1?next.vehicle1??s.vehicle:s.vehicle}))};}newMatch(next,start);renderer.finishTour?.();}})});",resolveDir:root+'/src',loader:'ts'},bundle:true,write:false,format:'esm',define:{'import.meta.env.BASE_URL':'"/piggymiCannon/"',__APP_VERSION__:JSON.stringify(version)},plugins:[{name:'qa-only',setup(b){if(baselineRef)b.onLoad({filter:/(renderer|vehicle-art|dashboard)\.ts$/},args=>({contents:source(args.path.split('/').at(-1)!),loader:'ts',resolveDir:root+'/src'}));b.onResolve({filter:/virtual:pwa-register/},()=>({path:'pwa',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export const registerSW=()=>()=>{};'}));b.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));}}]}).then(r=>r.outputFiles[0].text);
export async function boot(page:any,combat=true,map="factory",vehicle0="cannon",vehicle1="sea"){
 await page.route('**/assets/index-*.js',async(route:any)=>route.fulfill({contentType:'text/javascript',body:await bundle}));
 await page.goto('./');
 if(!combat)return;
 await page.getByRole('button',{name:'进入战场',exact:true}).click();await page.locator(`[data-choice="${vehicle0}"]`).click();
 await page.locator('[data-owner="1"]').click();await page.locator(`[data-choice="${vehicle1}"]`).click();
 await page.locator('[data-controller="1"]').selectOption('human');await page.locator(`input[name="map"][value="${map}"]`).locator('..').click();
 await page.locator('#turn-timer').selectOption('0');await page.getByRole('button',{name:'开始对局',exact:true}).click();await page.evaluate(()=>(window as any).__qa.renderer.finishTour());await page.waitForFunction(()=>!(window as any).__qa.renderer.touring);
}

export async function hold(page:any,locator:any){const r=await locator.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();}
