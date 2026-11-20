const movementKeys:Partial<Record<string,-1|1>>={a:-1,arrowleft:-1,d:1,arrowright:1};
export const KEYBOARD_TURN_MS=50;
export const isMoveKey=(key:string)=>Object.hasOwn(movementKeys,key);

/** Tracks physical keys separately from touch movement. Last direction pressed wins. */
export class KeyboardMove {
 private readonly held=new Map<string,-1|1>();
 private direction:-1|0|1=0;
 private readyAt=0;
 get active(){return this.direction!==0;}
 reset(){this.held.clear();this.direction=0;}
 press(key:string,now:number,face:(direction:number)=>void){
  const direction=movementKeys[key];if(!direction||this.held.has(key))return;
  this.held.set(key,direction);this.face(direction,now,face);
 }
 release(key:string,now:number,face:(direction:number)=>void){
  if(!this.held.delete(key))return;
  let direction:-1|0|1=0;for(const value of this.held.values())direction=value;
  this.face(direction,now,face);
 }
 step(now:number,dt:number,move:(direction:number,dt:number)=>void){
  const seconds=Math.min(dt,(now-this.readyAt)/1000);
  if(this.direction&&seconds>0)move(this.direction,seconds);
 }
 private face(direction:-1|0|1,now:number,face:(direction:number)=>void){
  if(direction===this.direction)return;
  this.direction=direction;this.readyAt=now+KEYBOARD_TURN_MS;
  if(direction)face(direction);
 }
}
