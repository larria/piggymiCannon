const movementKeys:Partial<Record<string,-1|1>>={a:-1,arrowleft:-1,d:1,arrowright:1};
export const KEYBOARD_TURN_MS=200;
export const isMoveKey=(key:string)=>Object.hasOwn(movementKeys,key);

/** Tracks physical keys separately from touch movement. Last direction pressed wins. */
export class KeyboardMove {
 private readonly held=new Map<string,-1|1>();
 private direction:-1|0|1=0;
 private readyAt=0;
 get active(){return this.direction!==0;}
 reset(){this.held.clear();this.direction=0;}
 press(key:string,now:number,facing:number,face:(direction:number)=>void){
  const direction=movementKeys[key];if(!direction||this.held.has(key))return;
  this.held.set(key,direction);this.select(direction,now,facing,face);
 }
 release(key:string,now:number,facing:number,face:(direction:number)=>void){
  if(!this.held.delete(key))return;
  let direction:-1|0|1=0;for(const value of this.held.values())direction=value;
  this.select(direction,now,facing,face);
 }
 step(now:number,dt:number,move:(direction:number,dt:number)=>void){
  const seconds=Math.min(dt,(now-this.readyAt)/1000);
  if(this.direction&&seconds>0)move(this.direction,seconds);
 }
 private select(direction:-1|0|1,now:number,facing:number,face:(direction:number)=>void){
  if(direction===this.direction)return;
  this.direction=direction;
  const turning=direction!==0&&direction!==facing;
  this.readyAt=now+(turning?KEYBOARD_TURN_MS:0);
  if(turning)face(direction);
 }
}
