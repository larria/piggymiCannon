const movementKeys:Partial<Record<string,-1|1>>={a:-1,arrowleft:-1,d:1,arrowright:1};
export const KEYBOARD_TURN_MS=100;
export const isMoveKey=(key:string)=>Object.hasOwn(movementKeys,key);

/** Shared hold-to-move state. Whichever key or pointer was pressed last wins. */
export class KeyboardMove {
 private readonly held=new Map<string,-1|1>();
 private direction:-1|0|1=0;
 private readyAt=0;
 private turnReadyAt=0;
 get active(){return this.direction!==0;}
 reset(){this.held.clear();this.direction=0;this.readyAt=0;this.turnReadyAt=0;}
 press(key:string,now:number,facing:number,face:(direction:number)=>void){
  const direction=movementKeys[key];if(direction)this.pressDirection(key,direction,now,facing,face);
 }
 pressDirection(input:string,direction:-1|1,now:number,facing:number,face:(direction:number)=>void){
  if(this.held.has(input))return false;
  this.held.set(input,direction);this.select(direction,now,facing,face);
  return now>=this.readyAt;
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
  if(turning){this.turnReadyAt=now+KEYBOARD_TURN_MS;face(direction);}
  // Re-pressing quickly in the new direction must not cancel the current turn delay.
  this.readyAt=Math.max(now,this.turnReadyAt);
 }
}
