import type {ItemId} from './catalog';
type Layer={d:string;fill?:'paper'|'brass'|'ink';part?:'left'|'right'|'shell'|'lid'|'star'};
/** Shared vector geometry for the HUD, backpack and silent field feedback. */
export const ITEM_GLYPHS:Record<ItemId,Layer[]>={
 double:[
  {d:'M7 25V11Q7 4 11 3Q15 4 15 11V25Z',fill:'paper',part:'left'},
  {d:'M7 20H15V25H7Z',fill:'brass',part:'left'},
  {d:'M18 25V11Q18 4 22 3Q26 4 26 11V25Z',fill:'paper',part:'right'},
  {d:'M18 20H26V25H18Z',fill:'brass',part:'right'},
  {d:'M9 10H13M20 10H24M8 28H25'}],
 teleport:[
  {d:'M7 11C1 11 1 29 7 29C13 29 13 11 7 11Z',fill:'paper'},
  {d:'M26 3C20 3 20 21 26 21C32 21 32 3 26 3Z',fill:'paper'},
  {d:'M7 19C11 5 22 7 26 11M22 9L26 11L25 6'},
  {d:'M10 19L15 14Q19 10 22 10Q22 14 18 18L13 23Z',fill:'brass',part:'shell'}],
 boost:[
  {d:'M8 27H24L22 23H10Z',fill:'brass'},
  {d:'M16 3L19.5 10L27 11L21.5 17L23 25L16 21L9 25L10.5 17L5 11L12.5 10Z',fill:'brass',part:'star'},
  {d:'M16 10L18 14L16 18L14 14Z',fill:'paper',part:'star'}],
 repair:[
  {d:'M5 12H27V28H5Z',fill:'paper'},
  {d:'M3 8H29V13H3ZM12 8V4H20V8',fill:'brass',part:'lid'},
  {d:'M13 16H19V20H23V24H19V28H13V24H9V20H13Z',fill:'ink'}],
 shield:[{d:'M16 3L28 8V16Q27 25 16 30Q5 25 4 16V8Z',fill:'paper'},{d:'M10 16L14 20L23 11'}],
 fuel:[{d:'M8 10H25V29H7V11L11 6H19L23 10M14 6V3H22V6',fill:'paper'},{d:'M13 17L16 13L20 18Q22 25 16 25Q10 25 13 17Z',fill:'brass'}],
 wind:[{d:'M3 11H21Q30 11 27 5Q23 1 21 6M3 17H25Q32 17 29 24Q24 29 23 23M3 23H15Q21 23 19 29'}],
};
export const ITEM_CUE_LABELS:Record<ItemId,string>={double:'双发就绪',teleport:'转移装填',boost:'威力加强',repair:'生命补给',shield:'护盾就绪',fuel:'燃料补给',wind:'风力归零'};
const colors={paper:'#fff8e8',brass:'#d7b66d',ink:'#61754c'};
export function itemIcon(id:ItemId){return `<svg class="icon item-icon" data-item-glyph="${id}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ITEM_GLYPHS[id].map(p=>`<path d="${p.d}" fill="${p.fill?colors[p.fill]:'none'}"/>`).join('')}</svg>`;}
const paths=new Map<string,Path2D>();
/** Compiled paths are shared, not rasterized or allocated on every animation frame. */
export function paintItemGlyph(c:CanvasRenderingContext2D,id:ItemId,size=24,age?:number){
 c.save();c.scale(size/32,size/32);c.translate(-16,-16);c.lineWidth=1.6;c.strokeStyle=colors.ink;c.lineCap='round';c.lineJoin='round';
 const progress=age===undefined?0:1-Math.pow(1-Math.min(1,age/.36),3);
 for(const layer of ITEM_GLYPHS[id]){
  c.save();
  if(age!==undefined){
   if(layer.part==='left')c.translate(-progress*1.2,0);
   if(layer.part==='right')c.translate(progress*1.2,0);
   if(layer.part==='shell')c.translate(progress*3,-progress*2);
   if(layer.part==='lid')c.translate(0,-progress*2.5);
   if(layer.part==='star'){c.translate(16,16);c.rotate((1-progress)*-.12);c.translate(-16,-16);}
  }
  let path=paths.get(layer.d);if(!path){path=new Path2D(layer.d);paths.set(layer.d,path);}
  if(layer.fill){c.fillStyle=colors[layer.fill];c.fill(path);}c.stroke(path);c.restore();
 }
 c.restore();
}
