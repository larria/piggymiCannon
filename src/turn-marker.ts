/** Paper-edged, folded pennant. Large silhouette, quiet motion, no glow. */
export function paintTurnMarker(c:CanvasRenderingContext2D,x:number,y:number,color:string,time:number,reduced=false){
 const bob=reduced?0:Math.sin(time*4)*1.5;c.save();c.translate(x,y+bob);c.lineJoin='round';
 c.fillStyle=color;c.strokeStyle='#fff8e8';c.lineWidth=3;
 c.beginPath();c.moveTo(-14,-10);c.quadraticCurveTo(-16,-10,-13,-6);c.lineTo(-3,9);c.quadraticCurveTo(0,14,3,9);c.lineTo(13,-6);c.quadraticCurveTo(16,-10,14,-10);c.closePath();c.fill();c.stroke();
 c.strokeStyle='#fff8e8';c.lineWidth=2;c.beginPath();c.moveTo(-7,-5);c.lineTo(0,4);c.lineTo(7,-5);c.stroke();
 c.strokeStyle='#d8b774';c.lineWidth=1.5;c.beginPath();c.moveTo(-8,-12);c.lineTo(8,-12);c.stroke();c.restore();
}

export const TURN_MARKER_Y=-126;
// Leave a slot for a tactical ticket between the ring and the portrait.
export const SKIP_RING_Y=-176;
export function paintSkipRing(c:CanvasRenderingContext2D,x:number,y:number,color:string,progress:number){
 const top=-Math.PI/2,tau=Math.PI*2;
 c.save();c.translate(x,y);c.lineCap='round';
 c.fillStyle='#fff8e8';c.strokeStyle='#77684d';c.lineWidth=1;c.beginPath();c.arc(0,0,14,0,tau);c.fill();c.stroke();
 c.strokeStyle='#d9ceb0';c.lineWidth=2.6;c.beginPath();c.arc(0,0,10,0,tau);c.stroke();
 c.strokeStyle=color;
 if(progress>0){c.beginPath();c.arc(0,0,10,top,top+tau*progress);c.stroke();}
 c.fillStyle='#655139';c.beginPath();c.moveTo(-4,-3.8);c.lineTo(1.6,0);c.lineTo(-4,3.8);c.closePath();c.fill();
 c.fillRect(2,-3.8,1.7,7.6);
 c.restore();
}
