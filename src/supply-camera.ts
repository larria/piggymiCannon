/** Fixed-scale framing. Supply presentation never changes trajectories or zoom. */
export const SUPPLY_APPROACH_SECONDS=.55;
export const SUPPLY_LANDING_SECONDS=.95;
export interface SupplyObservation {approach:number;crates:number[]}
type Point={x:number;y:number};
type Box=Point&{falling?:boolean};
export function modernSupplyTiming(version:string){
  const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  return !v||Number(v[1])>3||Number(v[1])===3&&(Number(v[2])>2||Number(v[2])===2&&Number(v[3])>=4);
}
export function supplyCameraTarget(boxes:Box[],actor:Point,width:number,height:number,time=0):Point {
  if(!boxes.length)return {x:actor.x-width/2,y:actor.y-height/2};
  const bounds=(list:Box[])=>({left:Math.min(...list.map(c=>c.x-44)),right:Math.max(...list.map(c=>c.x+44)),top:Math.min(...list.map(c=>c.y-(c.falling?76:24))),bottom:Math.max(...list.map(c=>c.y+25))});
  let shown=boxes,b=bounds(shown);
  // A fixed viewport cannot contain arbitrarily distant simultaneous drops.
  // Visit fitting groups instead of centering on empty space between them.
  if(b.right-b.left>width-96||b.bottom-b.top>height-128){
    const lead=boxes[Math.floor(time/1.4)%boxes.length];shown=[lead];
    for(const c of boxes)if(c!==lead){const next=bounds([...shown,c]);if(next.right-next.left<=width-96&&next.bottom-next.top<=height-128)shown.push(c);}
    b=bounds(shown);
  }
  const fit=(lo:number,hi:number,preferred:number,size:number,pad:number)=>Math.max(hi+pad-size,Math.min(lo-pad,preferred));
  let left=b.left,right=b.right,top=b.top,bottom=b.bottom;
  // Keep the actor too when space allows, but the parachutes take priority.
  if(Math.max(right,actor.x+32)-Math.min(left,actor.x-32)<=width-96){left=Math.min(left,actor.x-32);right=Math.max(right,actor.x+32);}
  if(Math.max(bottom,actor.y+24)-Math.min(top,actor.y-138)<=height-128){top=Math.min(top,actor.y-138);bottom=Math.max(bottom,actor.y+24);}
  return {x:fit(left,right,(b.left+b.right-width)/2,width,48),y:fit(top,bottom,(b.top+b.bottom)/2-height*.42,height,64)};
}
