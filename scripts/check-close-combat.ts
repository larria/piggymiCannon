import {Game} from '../src/engine';import {Terrain} from '../src/terrain';import {VEHICLES} from '../src/vehicles';import {defaultSlots} from '../src/crew';import {readFileSync,writeFileSync} from 'node:fs';
const version=JSON.parse(readFileSync('package.json','utf8')).version,rows=[];
for(const v of VEHICLES)for(const difficulty of ['easy','expert'] as const)for(const thickness of [4,280])for(const distance of [30,90]){
 const g=new Game({map:'coast',seed:52,timer:0,fallDamage:false,slots:defaultSlots().map((s,i)=>({...s,enabled:true,vehicle:i===0?v.id:'cannon',controller:i===0?'ai':'human',difficulty,team:i%2}))},version);g.start();g.land=new Terrain(g.worldWidth,g.worldHeight);g.terrain=g.land.surface;
 for(let x=0;x<=g.worldWidth;x++)g.land.column(x,500,500+thickness);g.land.rebuild();g.tanks.forEach((t,i)=>Object.assign(t,{x:[1000,1000+distance,940,1800][i],y:482,fallVelocity:0,angle:(t.minAngle+t.maxAngle)/2,tactics:0}));g.wind=0;
 g.planAI();g.aiTime=.8;for(let n=0;n<3000&&g.current===0&&g.phase!=='ended';n++)g.update(1/120);
 const snapshot=g.battleSnapshot(),shot=snapshot.events.find(e=>e.type==='fire-action'),row={vehicle:v.id,difficulty,thickness,distance,shots:g.tanks[0].shots,power:shot?.data.power??null,weapon:shot?.data.weapon??null,skip:snapshot.events.some(e=>e.type==='ai-safe-skip'),selfHP:g.tanks[0].hp,allyHP:g.tanks[2].hp};rows.push(row);
 if(row.shots!==1||row.skip||row.selfHP<=0||row.allyHP<=0)throw Error('Close shot refused or caused fatal friendly excavation: '+JSON.stringify(row));
}
writeFileSync(`QA/v${version}-close-combat.json`,JSON.stringify({version,protocol:'104 completed first AI actions: all13 vehicles, easy/expert, enemy30/90px, ally60px behind, destructible4/280px supports, damage/fall switches off, no items. All samples retained; regression, not population accuracy guarantee.',rows},null,2)+'\n');console.log('All104 close-range actions fired, no fatal own/ally dig.');
