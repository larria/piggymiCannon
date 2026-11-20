import {WORLD_W,TERRAIN_H} from './terrain';
export const BATTLE_ZOOM=1;
export const BATTLE_VIEW_WIDTH=1280;
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
type Point={x:number;y:number;id?:number};
/** Presentation only: no game clock, RNG, terrain or aiming state. */
export class BattleCamera {
  x=0;y=0;width=1280;height=600;manual:Point|null=null;
  private tween:{from:Point;to:Point;time:number;duration:number}|null=null;
  private tour:{points:Point[];index:number;time:number;reduced:boolean;done:()=>void;from:Point}|null=null;
  private worldWidth=WORLD_W;private worldHeight=TERRAIN_H;
  configure(width:number,height:number,worldWidth=WORLD_W,worldHeight=TERRAIN_H){this.worldWidth=worldWidth;this.worldHeight=worldHeight;this.width=width;this.height=height;this.x=this.boundX(this.x);this.y=this.boundY(this.y);}
  /** Keep the world point under the gesture fixed, including an active tween.
   * Bounds may move that point only at the edge of the battlefield. */
  reframe(width:number,height:number,u=.5,v=.5){
    const dx=(this.width-width)*clamp(u,0,1),dy=(this.height-height)*clamp(v,0,1),x=this.x,y=this.y;
    this.configure(width,height,this.worldWidth,this.worldHeight);
    const shift=(p:Point)=>({...p,x:this.boundX(p.x+dx),y:this.boundY(p.y+dy)});
    const next=shift({x,y});this.x=next.x;this.y=next.y;
    if(this.manual)this.manual=shift(this.manual);
    if(this.tween){this.tween.from=shift(this.tween.from);this.tween.to=shift(this.tween.to);}
    if(this.tour)this.tour.from=shift(this.tour.from);
  }
  private boundX(x:number){return clamp(x,0,Math.max(0,this.worldWidth-this.width));}
  private boundY(y:number){return clamp(y,-Math.max(this.worldHeight,this.height),Math.max(0,this.worldHeight-this.height));}
  target(x:number,y:number){return {x:this.boundX(x-this.width*.5),y:this.boundY(y-this.height*.5)};}
  get touring(){return this.tour!==null;}
  get tourPlayer(){return this.tour?.points[this.tour.index]?.id??null;}
  get animating(){return !!this.tour||!!this.tween;}
  center(x:number,y:number,animate=true){this.manual=this.target(x,y);this.tween=animate?{from:{x:this.x,y:this.y},to:this.manual,time:0,duration:.3}:null;if(!animate){this.x=this.manual.x;this.y=this.manual.y;}}
  pan(dx:number,dy:number){this.tween=null;this.x=this.boundX(this.x+dx);this.y=this.boundY(this.y+dy);this.manual={x:this.x,y:this.y};}
  follow(){this.manual=null;this.tween=null;}
  startTour(points:Point[],done:()=>void,reduced=false){this.tween=null;this.manual=null;this.tour={points,index:0,time:0,reduced,done,from:{x:this.x,y:this.y}};if(!points.length)this.finishTour();}
  finishTour(){const done=this.tour?.done;this.tour=null;this.follow();done?.();}
  reset(){this.tour=null;this.tween=null;this.manual=null;}
  update(dt:number,auto:Point){
    const tour=this.tour;
    if(tour){
      tour.time+=Math.max(0,dt);const target=this.target(tour.points[tour.index].x,tour.points[tour.index].y),travel=tour.reduced?0:.4;
      const p=travel?clamp(tour.time/travel,0,1):1,e=p*p*(3-2*p);this.x=tour.from.x+(target.x-tour.from.x)*e;this.y=tour.from.y+(target.y-tour.from.y)*e;
      if(tour.time>=travel+.55){tour.index++;tour.time=0;tour.from={x:this.x,y:this.y};if(tour.index===tour.points.length)this.finishTour();}return;
    }
    if(this.tween){const t=this.tween;t.time+=Math.max(0,dt);const p=clamp(t.time/t.duration,0,1),e=p*p*(3-2*p);this.x=t.from.x+(t.to.x-t.from.x)*e;this.y=t.from.y+(t.to.y-t.from.y)*e;if(p===1)this.tween=null;return;}
    const target=this.manual??{x:this.boundX(auto.x),y:this.boundY(auto.y)},p=Math.min(1,Math.max(0,dt)*5);
    this.x+=(target.x-this.x)*p;this.y+=(target.y-this.y)*p;
  }
}

/** Screen-down Y: largest Y is the lowest flying live round. Delay entries
 * are not airborne; select without viewport filtering to avoid losing it. */
export function lowestProjectile<T extends {x:number;y:number;delay:number}>(rounds:readonly T[]):T|null{let lowest:T|null=null;for(const p of rounds)if(p.delay<=0&&(!lowest||p.y>lowest.y))lowest=p;return lowest;}

/** An impact is only a fallback during a gap before a delayed shot goes airborne. */
export function lowestFlightFocus<T extends {x:number;y:number;delay:number}>(rounds:readonly T[],landed:{x:number;y:number}|null){return lowestProjectile(rounds)??landed;}
