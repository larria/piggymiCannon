// Default miniature coordinates remain available to test rigs; production maps have their own dimensions.
export const WORLD_W=1920,WORLD_H=960,BOTTOM_Y=960,WATER_Y=BOTTOM_Y,TERRAIN_H=960;
export class Terrain {
 readonly stride:number;readonly rows:number;readonly mask:Uint8Array;readonly protectedMask:Uint8Array;readonly surface:Float32Array;
 revision=0;changes:{revision:number;from:number;to:number}[]=[];
 constructor(readonly width=WORLD_W,readonly height=TERRAIN_H,readonly cellSize=1){this.stride=Math.ceil(width/cellSize)+1;this.rows=Math.ceil(height/cellSize);this.mask=new Uint8Array(this.stride*this.rows);this.protectedMask=new Uint8Array(this.mask.length);this.surface=new Float32Array(width+1).fill(height);}
 solid(x:number,y:number){const ix=Math.floor(x/this.cellSize),iy=Math.floor(y/this.cellSize);return x>=0&&x<=this.width&&y>=0&&y<this.height&&this.mask[iy*this.stride+ix]===1;}
 permanent(x:number,y:number){return x>=0&&x<=this.width&&y>=0&&y<this.height&&this.protectedMask[Math.floor(y/this.cellSize)*this.stride+Math.floor(x/this.cellSize)]===1;}
 column(x:number,top:number,bottom:number,permanent=false){if(x<0||x>this.width)return;const ix=Math.floor(x/this.cellSize);for(let y=Math.max(0,Math.ceil(top/this.cellSize));y<Math.min(this.rows,Math.ceil(bottom/this.cellSize));y++){const i=y*this.stride+ix;this.mask[i]=1;if(permanent)this.protectedMask[i]=1;}}
 rebuild(from=0,to=this.width){const a=Math.max(0,Math.floor(from/this.cellSize)),b=Math.min(this.stride-1,Math.floor(to/this.cellSize));for(let gx=a;gx<=b;gx++){let y=0;while(y<this.rows&&!this.mask[y*this.stride+gx])y++;const top=Math.min(this.height,y*this.cellSize);for(let x=gx*this.cellSize;x<=Math.min(this.width,(gx+1)*this.cellSize-1);x++)this.surface[x]=top;}this.revision++;this.changes.push({revision:this.revision,from:a*this.cellSize,to:Math.min(this.width,(b+1)*this.cellSize)});if(this.changes.length>64)this.changes.shift();}
 below(x:number,fromY=0){const at=Math.max(0,Math.min(this.width,Math.round(x))),ix=Math.floor(at/this.cellSize),start=Math.max(0,Math.floor(fromY/this.cellSize));if(fromY<=this.surface[at])return this.surface[at];let y=start;while(y<this.rows&&!this.mask[y*this.stride+ix])y++;return Math.min(this.height,y*this.cellSize);}
 bottom(x:number,fromY=0){const ix=Math.floor(Math.max(0,Math.min(this.width,Math.round(x)))/this.cellSize);let y=Math.floor(this.below(x,fromY)/this.cellSize);while(y<this.rows&&this.mask[y*this.stride+ix])y++;return Math.min(this.height,y*this.cellSize);}
 removeEllipse(cx:number,cy:number,rx:number,ry:number){const from=Math.max(0,Math.floor((cx-rx)/this.cellSize)),to=Math.min(this.stride-1,Math.floor((cx+rx)/this.cellSize));let removed=0;
  for(let gx=from;gx<=to;gx++){const x=gx*this.cellSize,dy=ry*Math.sqrt(Math.max(0,1-((x-cx)/rx)**2));if(!Number.isFinite(dy))continue;
   for(let gy=Math.max(0,Math.ceil((cy-dy)/this.cellSize));gy<=Math.min(this.rows-1,Math.floor((cy+dy)/this.cellSize));gy++){const i=gy*this.stride+gx;if(this.mask[i]&&!this.protectedMask[i]){this.mask[i]=0;removed+=this.cellSize*this.cellSize;}}
   let start=-1;for(let gy=0;gy<=this.rows;gy++){const solid=gy<this.rows&&this.mask[gy*this.stride+gx];if(solid&&start<0)start=gy;if(!solid&&start>=0){if((gy-start)*this.cellSize<=5&&start*this.cellSize<=cy+dy+5&&gy*this.cellSize>=cy-dy-5)for(let j=start;j<gy;j++){const i=j*this.stride+gx;if(!this.protectedMask[i]){this.mask[i]=0;removed+=this.cellSize*this.cellSize;}}start=-1;}}
  }if(removed)this.rebuild(from*this.cellSize,to*this.cellSize);return removed;
 }
}
