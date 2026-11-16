export const WORLD_W=1920;
export const WORLD_H=960;
export const BOTTOM_Y=960;
/** Legacy API alias; there is no water plane. */
export const WATER_Y=BOTTOM_Y;
export const TERRAIN_H=960;

/** Pixel occupancy preserves caves, bridges and multiple platforms in a column. */
export class Terrain {
  readonly stride=WORLD_W+1;
  readonly mask=new Uint8Array((WORLD_W+1)*TERRAIN_H);
  readonly protectedMask=new Uint8Array((WORLD_W+1)*TERRAIN_H);
  readonly surface=new Float32Array(WORLD_W+1).fill(TERRAIN_H);
  revision=0;
  solid(x:number,y:number) {
    const ix=Math.floor(x),iy=Math.floor(y);
    return ix>=0&&ix<=WORLD_W&&iy>=0&&iy<TERRAIN_H&&this.mask[iy*this.stride+ix]===1;
  }
  column(x:number,top:number,bottom:number,permanent=false) {
    x=Math.round(x);
    for(let y=Math.max(0,Math.ceil(top));y<Math.min(TERRAIN_H,Math.ceil(bottom));y++){const index=y*this.stride+x;this.mask[index]=1;if(permanent)this.protectedMask[index]=1;}
  }
  rebuild(from=0,to=WORLD_W) {
    for(let x=Math.max(0,Math.floor(from));x<=Math.min(WORLD_W,Math.ceil(to));x++) {
      let y=0;while(y<TERRAIN_H&&!this.mask[y*this.stride+x]) y++;
      this.surface[x]=y;
    }
    this.revision++;
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
  removeEllipse(cx:number,cy:number,rx:number,ry:number) {
    const from=Math.max(0,Math.floor(cx-rx)),to=Math.min(WORLD_W,Math.ceil(cx+rx));let removed=0;
    for(let x=from;x<=to;x++) {
      const dy=ry*Math.sqrt(Math.max(0,1-((x-cx)/rx)**2));
      for(let y=Math.max(0,Math.ceil(cy-dy));y<=Math.min(TERRAIN_H-1,Math.floor(cy+dy));y++) {
        const index=y*this.stride+x;if(this.mask[index]&&!this.protectedMask[index]) {this.mask[index]=0;removed++;}
      }
      // Paper-thin remnants cannot hold a tank up after their foundation is excavated.
      let start=-1;
      for(let y=0;y<=TERRAIN_H;y++) {
        const solid=y<TERRAIN_H&&this.mask[y*this.stride+x];
        if(solid&&start<0) start=y;
        if(!solid&&start>=0) {
          if(y-start<=5&&start<=cy+dy+5&&y>=cy-dy-5)for(let j=start;j<y;j++){const index=j*this.stride+x;if(!this.protectedMask[index]){this.mask[index]=0;removed++;}}
          start=-1;
        }
      }
    }
    if(removed) this.rebuild(from,to);
    return removed;
  }
}
