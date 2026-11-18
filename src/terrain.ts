export const WORLD_W=1920;
export const WORLD_H=960;
export const BOTTOM_Y=960;
/** Legacy API alias; there is no water plane. */
export const WATER_Y=BOTTOM_Y;
export const TERRAIN_H=960;
export interface TerrainChange {from:number;to:number;top:number;bottom:number}

/** Pixel occupancy preserves caves, bridges and multiple platforms in a column. */
export class Terrain {
  readonly stride:number;readonly mask:Uint8Array;readonly protectedMask:Uint8Array;readonly surface:Float32Array;
  ceiling:number;
  constructor(readonly width=WORLD_W,readonly height=TERRAIN_H){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>2688||height>1344)throw Error('Invalid terrain size');
    this.stride=width+1;this.mask=new Uint8Array(this.stride*height);this.protectedMask=new Uint8Array(this.stride*height);this.surface=new Float32Array(this.stride).fill(height);this.ceiling=height;
  }
  revision=0;
  readonly changes:(TerrainChange&{revision:number})[]=[];
  changedSince(revision:number):TerrainChange|null {
    if(revision===this.revision)return null;
    if(revision<0||revision>this.revision||!this.changes.length||revision<this.changes[0].revision-1)return {from:0,to:this.width,top:0,bottom:this.height-1};
    const recent=this.changes.filter(c=>c.revision>revision);
    if(!recent.length)return {from:0,to:this.width,top:0,bottom:this.height-1};
    return {from:Math.min(...recent.map(c=>c.from)),to:Math.max(...recent.map(c=>c.to)),top:Math.min(...recent.map(c=>c.top)),bottom:Math.max(...recent.map(c=>c.bottom))};
  }
  solid(x:number,y:number) {
    const ix=Math.floor(x),iy=Math.floor(y);
    return ix>=0&&ix<=this.width&&iy>=0&&iy<this.height&&this.mask[iy*this.stride+ix]===1;
  }
  column(x:number,top:number,bottom:number,permanent=false) {
    x=Math.round(x);if(x<0||x>this.width)return;
    for(let y=Math.max(0,Math.ceil(top));y<Math.min(this.height,Math.ceil(bottom));y++){const index=y*this.stride+x;this.mask[index]=1;if(permanent)this.protectedMask[index]=1;}
  }
  rebuild(from=0,to=this.width,top=0,bottom=this.height-1) {
    from=Math.max(0,Math.floor(from));to=Math.min(this.width,Math.ceil(to));
    for(let x=Math.max(0,Math.floor(from));x<=Math.min(this.width,Math.ceil(to));x++) {
      let y=0;while(y<this.height&&!this.mask[y*this.stride+x]) y++;
      if(y!==this.surface[x]){top=Math.min(top,y,this.surface[x]);bottom=Math.max(bottom,y,this.surface[x]);}
      this.surface[x]=y;
    }
    this.ceiling=this.surface.reduce((a,b)=>Math.min(a,b),this.height);
    this.revision++;
    this.changes.push({revision:this.revision,from,to,top:Math.max(0,top),bottom:Math.min(this.height-1,bottom)});
    if(this.changes.length>64)this.changes.shift();
  }
  below(x:number,fromY=0) {
    const ix=Math.max(0,Math.min(this.width,Math.round(x))),start=Math.max(0,Math.floor(fromY));
    if(start<=this.surface[ix]) return this.surface[ix];
    let y=start;while(y<this.height&&!this.mask[y*this.stride+ix]) y++;
    return y;
  }
  bottom(x:number,fromY=0) {
    const ix=Math.max(0,Math.min(this.width,Math.round(x)));let y=this.below(ix,fromY);
    while(y<this.height&&this.mask[y*this.stride+ix]) y++;
    return y;
  }
  removeEllipse(cx:number,cy:number,rx:number,ry:number,tidyRemnants=true) {
    const from=Math.max(0,Math.floor(cx-rx)),to=Math.min(this.width,Math.ceil(cx+rx));let removed=0,top=this.height,bottom=-1;
    for(let x=from;x<=to;x++) {
      const dy=ry*Math.sqrt(Math.max(0,1-((x-cx)/rx)**2));
      for(let y=Math.max(0,Math.ceil(cy-dy));y<=Math.min(this.height-1,Math.floor(cy+dy));y++) {
        const index=y*this.stride+x;if(this.mask[index]&&!this.protectedMask[index]) {this.mask[index]=0;removed++;top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      if(!tidyRemnants)continue;
      // Paper-thin remnants cannot hold a tank up after their foundation is excavated.
      const lower=cy-dy-5,upper=cy+dy+5,scanFrom=Math.max(0,Math.ceil(lower)-5),scanTo=Math.min(this.height,Math.floor(upper)+6);
      // Only <=5px runs intersecting this window can be removed. A run
      // entering from above is necessarily too long if it reaches lower.
      let start=scanFrom>0&&this.mask[(scanFrom-1)*this.stride+x]?scanFrom-6:-1;
      for(let y=scanFrom;y<=scanTo;y++) {
        const solid=y<this.height&&this.mask[y*this.stride+x];
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
  removeScanlines(cx:number,cy:number,rows:readonly {y:number;left:number;width:number}[],scale=3){
    cx=Math.floor(cx/scale)*scale;cy=Math.floor(cy/scale)*scale;
    let removed=0,from=this.width,to=0,top=this.height,bottom=-1;
    for(const row of rows){const left=Math.max(0,cx+row.left*scale),right=Math.min(this.width,cx+(row.left+row.width)*scale-1);
      for(let y=Math.max(0,cy+row.y*scale);y<=Math.min(this.height-1,cy+row.y*scale+scale-1);y++)for(let x=left;x<=right;x++){const index=y*this.stride+x;if(this.mask[index]&&!this.protectedMask[index]){this.mask[index]=0;removed++;from=Math.min(from,x);to=Math.max(to,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}}
    if(removed)this.rebuild(from,to,top,bottom);return removed;
  }

}
