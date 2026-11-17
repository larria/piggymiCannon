export const WORLD_W=1920;
export const WORLD_H=960;
export const BOTTOM_Y=960;
/** Legacy API alias; there is no water plane. */
export const WATER_Y=BOTTOM_Y;
export const TERRAIN_H=960;
export interface TerrainChange {from:number;to:number;top:number;bottom:number}

/** Pixel occupancy preserves caves, bridges and multiple platforms in a column. */
export class Terrain {
  readonly stride=WORLD_W+1;
  readonly mask=new Uint8Array((WORLD_W+1)*TERRAIN_H);
  readonly protectedMask=new Uint8Array((WORLD_W+1)*TERRAIN_H);
  readonly surface=new Float32Array(WORLD_W+1).fill(TERRAIN_H);
  revision=0;
  readonly changes:(TerrainChange&{revision:number})[]=[];
  changedSince(revision:number):TerrainChange|null {
    if(revision===this.revision)return null;
    if(revision<0||revision>this.revision||!this.changes.length||revision<this.changes[0].revision-1)return {from:0,to:WORLD_W,top:0,bottom:TERRAIN_H-1};
    const recent=this.changes.filter(c=>c.revision>revision);
    if(!recent.length)return {from:0,to:WORLD_W,top:0,bottom:TERRAIN_H-1};
    return {from:Math.min(...recent.map(c=>c.from)),to:Math.max(...recent.map(c=>c.to)),top:Math.min(...recent.map(c=>c.top)),bottom:Math.max(...recent.map(c=>c.bottom))};
  }
  solid(x:number,y:number) {
    const ix=Math.floor(x),iy=Math.floor(y);
    return ix>=0&&ix<=WORLD_W&&iy>=0&&iy<TERRAIN_H&&this.mask[iy*this.stride+ix]===1;
  }
  column(x:number,top:number,bottom:number,permanent=false) {
    x=Math.round(x);
    for(let y=Math.max(0,Math.ceil(top));y<Math.min(TERRAIN_H,Math.ceil(bottom));y++){const index=y*this.stride+x;this.mask[index]=1;if(permanent)this.protectedMask[index]=1;}
  }
  rebuild(from=0,to=WORLD_W,top=0,bottom=TERRAIN_H-1) {
    from=Math.max(0,Math.floor(from));to=Math.min(WORLD_W,Math.ceil(to));
    for(let x=Math.max(0,Math.floor(from));x<=Math.min(WORLD_W,Math.ceil(to));x++) {
      let y=0;while(y<TERRAIN_H&&!this.mask[y*this.stride+x]) y++;
      if(y!==this.surface[x]){top=Math.min(top,y,this.surface[x]);bottom=Math.max(bottom,y,this.surface[x]);}
      this.surface[x]=y;
    }
    this.revision++;
    this.changes.push({revision:this.revision,from,to,top:Math.max(0,top),bottom:Math.min(TERRAIN_H-1,bottom)});
    if(this.changes.length>64)this.changes.shift();
  }
  below(x:number,fromY=0) {
    const ix=Math.max(0,Math.min(WORLD_W,Math.round(x))),start=Math.max(0,Math.floor(fromY));
    if(start<=this.surface[ix]) return this.surface[ix];
    let y=start;while(y<TERRAIN_H&&!this.mask[y*this.stride+ix]) y++;
    return y;
  }
  bottom(x:number,fromY=0) {
    const ix=Math.max(0,Math.min(WORLD_W,Math.round(x)));let y=this.below(ix,fromY);
    while(y<TERRAIN_H&&this.mask[y*this.stride+ix]) y++;
    return y;
  }
  removeEllipse(cx:number,cy:number,rx:number,ry:number,tidyRemnants=true) {
    const from=Math.max(0,Math.floor(cx-rx)),to=Math.min(WORLD_W,Math.ceil(cx+rx));let removed=0,top=TERRAIN_H,bottom=-1;
    for(let x=from;x<=to;x++) {
      const dy=ry*Math.sqrt(Math.max(0,1-((x-cx)/rx)**2));
      for(let y=Math.max(0,Math.ceil(cy-dy));y<=Math.min(TERRAIN_H-1,Math.floor(cy+dy));y++) {
        const index=y*this.stride+x;if(this.mask[index]&&!this.protectedMask[index]) {this.mask[index]=0;removed++;top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      if(!tidyRemnants)continue;
      // Paper-thin remnants cannot hold a tank up after their foundation is excavated.
      const lower=cy-dy-5,upper=cy+dy+5,scanFrom=Math.max(0,Math.ceil(lower)-5),scanTo=Math.min(TERRAIN_H,Math.floor(upper)+6);
      // Only <=5px runs intersecting this window can be removed. A run
      // entering from above is necessarily too long if it reaches lower.
      let start=scanFrom>0&&this.mask[(scanFrom-1)*this.stride+x]?scanFrom-6:-1;
      for(let y=scanFrom;y<=scanTo;y++) {
        const solid=y<TERRAIN_H&&this.mask[y*this.stride+x];
        if(solid&&start<0) start=y;
        if(!solid&&start>=0) {
          if(y-start<=5&&start<=cy+dy+5&&y>=cy-dy-5)for(let j=start;j<y;j++){const index=j*this.stride+x;if(!this.protectedMask[index]){this.mask[index]=0;removed++;top=Math.min(top,j);bottom=Math.max(bottom,j);}}
          start=-1;
        }
      }
    }
    if(removed) this.rebuild(from,to,top,bottom);
    return removed;
  }
}
