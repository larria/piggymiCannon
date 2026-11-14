export interface Rect {x:number;y:number;width:number;height:number}
const overlap=(a:Rect,b:Rect)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
export function chooseResultPosition(width:number,height:number,cardWidth:number,cardHeight:number,actors:Rect[],map?:Rect){
  const clampX=(x:number)=>Math.max(16,Math.min(Math.max(16,width-cardWidth-16),x));
  const clampY=(y:number)=>Math.max(16,Math.min(Math.max(16,height-cardHeight-16),y));
  const xs=[16,(width-cardWidth)/2,width-cardWidth-16,...actors.flatMap(a=>[a.x+a.width+16,a.x-cardWidth-16])].map(clampX);
  const ys=[16,height-cardHeight-16,...actors.flatMap(a=>[a.y+a.height+16,a.y-cardHeight-16])].map(clampY);
  let best={x:16,y:16,overlap:Infinity,score:Infinity};
  for(const x of xs)for(const y of ys){const rect={x,y,width:cardWidth,height:cardHeight},covered=actors.reduce((sum,a)=>sum+overlap(rect,a),0);
    const score=covered*100+(map?overlap(rect,map)*.02:0)+Math.abs(x-(width-cardWidth)/2)*.001+y*.003;
    if(score<best.score)best={x,y,overlap:covered,score};
  }
  return best;
}
