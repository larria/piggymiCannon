/** Selected, recolored FT2 frames. Originals stay outside the runtime bundle. */
export const BATTLE_SPRITES={
 blast:{file:'effects/ft2-blast.png',width:96,height:96,frames:18},
 energy:{file:'effects/ft2-energy.png',width:96,height:96,frames:10},
 water:{file:'effects/ft2-water.png',width:128,height:64,frames:9},
 flame:{file:'effects/ft2-flame.png',width:32,height:64,frames:18},
 gas:{file:'effects/ft2-gas.png',width:128,height:72,frames:6},
} as const;
export type BattleSprite=keyof typeof BATTLE_SPRITES;
const images=new Map<BattleSprite,HTMLImageElement>();
export const battleSpriteRevision=()=>images.size;
let loading:Promise<boolean[]>|undefined;
/** Decode once, independently of the match, never from a draw call. Failure keeps vector art. */
export function loadBattleSprites(fromCache=false,skipFiles:string[]=[]){
 if(typeof Image==='undefined')return Promise.resolve([]);
 return loading??=Promise.all((Object.keys(BATTLE_SPRITES) as BattleSprite[]).map(id=>new Promise<boolean>(resolve=>{
  if(images.has(id)){resolve(true);return;}if(skipFiles.includes(BATTLE_SPRITES[id].file)){resolve(false);return;}
  const image=new Image();image.decoding='async';let done=false,url:string|null=null;const controller=new AbortController();
  const finish=(ok:boolean)=>{if(done)return;done=true;clearTimeout(timer);controller.abort();image.onload=image.onerror=null;if(url)URL.revokeObjectURL(url);resolve(ok);};
  const timer=setTimeout(()=>finish(false),6000);
  image.onload=async()=>{try{await image.decode();if(!done){images.set(id,image);finish(true);}}catch{finish(false);}};
  image.onerror=()=>finish(false);const path=`${import.meta.env.BASE_URL}${BATTLE_SPRITES[id].file}`;
  if(fromCache)void fetch(path,{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Missing sprite');return r.blob();}).then(blob=>{if(!done){url=URL.createObjectURL(blob);image.src=url;}}).catch(()=>finish(false));
  else image.src=path;
 })));
}
export async function retryBattleSprites(skipFiles:string[]=[]){await loading;loading=undefined;return loadBattleSprites(true,skipFiles);}
/** Same simulation clock as the vector effects; no timers or per-frame decoding. */
export function spriteFrame(id:BattleSprite,progress:number,loop=false){
 const frames=BATTLE_SPRITES[id].frames,value=Number.isFinite(progress)?progress:0;
 return Math.min(frames-1,Math.floor((loop?((value%1)+1)%1:Math.max(0,Math.min(1,value)))*frames));
}
export function paintBattleSprite(c:CanvasRenderingContext2D,id:BattleSprite,progress:number,x:number,y:number,width:number,height:number,opacity=1,loop=false){
 const image=images.get(id);if(!image)return false;
 const spec=BATTLE_SPRITES[id],frame=spriteFrame(id,progress,loop);c.save();c.globalAlpha*=opacity;
 c.drawImage(image,frame*spec.width,0,spec.width,spec.height,x,y,width,height);c.restore();return true;
}
