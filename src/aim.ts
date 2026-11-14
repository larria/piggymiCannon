// Screen coordinates: x right, y down. slope is atan2(rightFootY-leftFootY,32),
// positive when the body descends right. The unrotated facing vector is
// (direction*cos(relative), -sin(relative)). Rotate this vector by body slope.
// Elevation measured above the facing horizontal is relative - direction*slope.
// This elevation is intentionally unbounded; only the RELATIVE input is clamped.
export function aimGeometry(relative:number,slope:number,direction:number){
 const a=relative*Math.PI/180,d=direction<0?-1:1,c=Math.cos(slope),s=Math.sin(slope);
 return {absolute:relative-d*slope*180/Math.PI,x:d*Math.cos(a)*c+Math.sin(a)*s,y:d*Math.cos(a)*s-Math.sin(a)*c};
}
// Invert the same body rotation for touch aiming. Facing is chosen in BODY space,
// not screen x: a right-facing vehicle may legitimately fire above 90° uphill.
export function relativeAimForVector(dx:number,dy:number,slope:number,currentDirection=1){
 const c=Math.cos(slope),s=Math.sin(slope),x=c*dx+s*dy,y=-s*dx+c*dy;
 return {direction:Math.abs(x)<1e-7?currentDirection:Math.sign(x),relative:Math.atan2(-y,Math.abs(x))*180/Math.PI};
}
