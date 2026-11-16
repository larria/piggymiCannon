/** Paper-edged, folded pennant. Large silhouette, quiet motion, no glow. */
export function paintTurnMarker(c:CanvasRenderingContext2D,x:number,y:number,color:string,time:number,reduced=false){
 const bob=reduced?0:Math.sin(time*4)*1.5;c.save();c.translate(x,y+bob);c.lineJoin='round';
 c.fillStyle=color;c.strokeStyle='#fff8e8';c.lineWidth=3;
 c.beginPath();c.moveTo(-14,-10);c.quadraticCurveTo(-16,-10,-13,-6);c.lineTo(-3,9);c.quadraticCurveTo(0,14,3,9);c.lineTo(13,-6);c.quadraticCurveTo(16,-10,14,-10);c.closePath();c.fill();c.stroke();
 c.strokeStyle='#fff8e8';c.lineWidth=2;c.beginPath();c.moveTo(-7,-5);c.lineTo(0,4);c.lineTo(7,-5);c.stroke();
 c.strokeStyle='#d8b774';c.lineWidth=1.5;c.beginPath();c.moveTo(-8,-12);c.lineTo(8,-12);c.stroke();c.restore();
}
