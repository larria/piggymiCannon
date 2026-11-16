import type {Game} from './engine';
export const TERRAIN_TILE_SIZE=512,TERRAIN_TILE_CACHE=24;
export interface TerrainTile{key:string;canvas:HTMLCanvasElement;x:number;y:number;width:number;height:number;revision:number;paintVersion:number;ratio:number}
type Palette={soil:string;soilLight:string;grassLight:string;ink:string};
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
/** Rasterise only visible world tiles. Cache survives idle frames and local craters. */
export class TerrainTiles {
 private cache=new Map<string,TerrainTile>();private owner:Game|null=null;generation=0;paints=0;
 reset(){this.cache.clear();this.owner=null;this.generation++;}
 all(){return [...this.cache.values()];}
 visible(g:Game,p:Palette,x:number,y:number,width:number,height:number,ratio:number){
  if(this.owner!==g){this.reset();this.owner=g;}
  const visible:TerrainTile[]=[],size=TERRAIN_TILE_SIZE;
  for(let ty=Math.max(0,Math.floor(y/size));ty<=Math.min(Math.ceil(g.worldHeight/size)-1,Math.floor((y+height)/size));ty++)for(let tx=Math.max(0,Math.floor(x/size));tx<=Math.min(Math.ceil(g.worldWidth/size)-1,Math.floor((x+width)/size));tx++){
   const key=`${this.generation}:${tx}:${ty}`;let tile=this.cache.get(key);
   if(!tile||tile.ratio!==ratio){tile={key,canvas:document.createElement('canvas'),x:tx*size,y:ty*size,width:Math.min(size,g.worldWidth-tx*size),height:Math.min(size,g.worldHeight-ty*size),revision:-1,paintVersion:0,ratio};this.cache.set(key,tile);}
   const history=g.land.changes,old=tile.revision<0||tile.revision<(history[0]?.revision??0)-1,changed=history.some(c=>c.revision>tile!.revision&&c.from<=tile!.x+tile!.width&&c.to>=tile!.x);
   if(old||changed)this.paint(g,p,tile);tile.revision=g.land.revision;this.cache.delete(key);this.cache.set(key,tile);visible.push(tile);
  }
  while(this.cache.size>TERRAIN_TILE_CACHE)this.cache.delete(this.cache.keys().next().value!);
  return visible;
 }
 private paint(g:Game,p:Palette,t:TerrainTile){
  const source=document.createElement('canvas');source.width=t.width;source.height=t.height;const c=source.getContext('2d')!,image=c.createImageData(t.width,t.height),soil=rgb(p.soil),light=rgb(p.soilLight),ink=rgb(p.ink),grass=rgb(p.grassLight);
  for(let sy=0;sy<t.height;sy++){const shade=Math.max(0,Math.min(1,(t.y+sy-g.worldHeight*.25)/(g.worldHeight*.6))),base=soil.map((v,i)=>light[i]*(1-shade)+v*shade);for(let sx=0;sx<t.width;sx++){
   const x=t.x+sx,y=t.y+sy;if(!g.land.solid(x,y))continue;const top=!g.land.solid(x,y-1),edge=!g.land.solid(x-1,y)||!g.land.solid(x+1,y)||!g.land.solid(x,y+1),grain=(x*13+y*7)%31===0?7:0;
   let color=g.land.permanent(x,y)?(g.config.map==='factory'?[135,157,157]:[200,177,106]):top?grass:edge?ink:g.config.map==='moon'&&!g.land.solid(x,y-9)?[241,247,239]:base;
   if(g.config.map==='moon'&&y>g.worldHeight*.5)color=top?[192,201,167]:[130,141,111];
   const at=(sy*t.width+sx)*4;image.data[at]=color[0]+grain;image.data[at+1]=color[1]+grain;image.data[at+2]=color[2]+grain;image.data[at+3]=255;
  }
  }c.putImageData(image,0,0);
  // Hand-drawn material details, clipped to surviving terrain, keep the existing paper palette.
  c.globalCompositeOperation='source-atop';c.lineCap='round';
  if(g.config.map==='factory'){
   c.fillStyle='#c9d5d3';for(let y=Math.ceil(t.y/48)*48;y<t.y+t.height;y+=48)for(let x=Math.ceil(t.x/56)*56;x<t.x+t.width;x+=56)if(g.land.solid(x,y)){c.beginPath();c.arc(x-t.x,y-t.y,2,0,7);c.fill();}
   c.strokeStyle='#d2c182';c.lineWidth=2;for(let x=t.x;x<t.x+t.width;x+=2)for(let y=t.y;y<t.y+t.height;y++)if(g.land.permanent(x,y)&&!g.land.permanent(x,y-1)){c.beginPath();c.moveTo(x-t.x,y-t.y+1);c.lineTo(x-t.x+2,y-t.y+1);c.stroke();break;}
  }else if(g.config.map==='coast'||g.config.map==='egypt'){
   c.strokeStyle=g.config.map==='coast'?'#69564775':'#efd4a3';c.lineWidth=1.2;for(let y=Math.ceil(t.y/24)*24;y<t.y+t.height;y+=24)for(let x=Math.ceil(t.x/34)*34;x<t.x+t.width;x+=34){c.beginPath();c.moveTo(x-t.x,y-t.y);c.lineTo(x-t.x+26,y-t.y+(g.config.map==='coast'?6:0));c.stroke();}
  }
  t.canvas.width=Math.round(t.width*t.ratio);t.canvas.height=Math.round(t.height*t.ratio);const target=t.canvas.getContext('2d')!;target.imageSmoothingEnabled=true;target.drawImage(source,0,0,t.canvas.width,t.canvas.height);t.paintVersion++;this.paints++;
 }
}
