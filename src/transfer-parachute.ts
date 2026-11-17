/** Upright warm-paper canopy; ropes pass around the portrait rather than across it. */
export function paintTransferParachute(ctx:CanvasRenderingContext2D,x:number,y:number,time:number,color:string){
 const sway=Math.sin(time*2.8)*2;
 ctx.save();ctx.translate(x+sway,y);ctx.lineJoin='round';ctx.lineCap='round';
 ctx.strokeStyle='#7c8573';ctx.lineWidth=1.3;
 for(const direction of [-1,1]){ctx.beginPath();ctx.moveTo(direction*45,-128);ctx.quadraticCurveTo(direction*42,-82,direction*28,-22);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(-47,-128);ctx.bezierCurveTo(-41,-172,41,-172,47,-128);ctx.quadraticCurveTo(30,-136,16,-128);ctx.quadraticCurveTo(0,-136,-16,-128);ctx.quadraticCurveTo(-32,-136,-47,-128);ctx.closePath();
 ctx.fillStyle='#f5edd7';ctx.fill();ctx.strokeStyle='#69765e';ctx.lineWidth=1.7;ctx.stroke();
 ctx.globalAlpha=.42;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-16,-128);ctx.quadraticCurveTo(-13,-164,0,-161);ctx.quadraticCurveTo(13,-164,16,-128);ctx.quadraticCurveTo(0,-136,-16,-128);ctx.fill();
 ctx.globalAlpha=1;ctx.strokeStyle='#aaa895';ctx.lineWidth=.8;
 for(const direction of [-1,1]){ctx.beginPath();ctx.moveTo(0,-161);ctx.quadraticCurveTo(direction*27,-151,direction*16,-128);ctx.stroke();}
 ctx.restore();
}
