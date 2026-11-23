import type {VehicleId} from './vehicles';

// Shared by the SVG catalogue and the two cached battlefield layers.
export const INK='#373e39';
export type Finish={top:number;bottom:number;colors:readonly string[]};
export type Part={d:string;fill:string|Finish;stroke:string;width:number};
export type BodyFit={scaleX:number;scaleY:number;lift:number};
export type TankArt={body:Part[];aim:Part[];rage?:Part[];bodyFit?:BodyFit};
export const sheen=(top:number,bottom:number,...colors:string[]):Finish=>({top,bottom,colors});
export const shape=(d:string,fill:Part['fill'],stroke=INK,width=1.7):Part=>({d,fill,stroke,width});
export const paint=(d:string,fill:Part['fill']):Part=>shape(d,fill,'none',0);
export const seam=(d:string,color:string,width=1.25):Part=>shape(d,'none',color,width);
const oval=(x:number,y:number,rx:number,ry:number)=>`M${x-rx} ${y}a${rx} ${ry} 0 1 0 ${rx*2} 0a${rx} ${ry} 0 1 0 ${-rx*2} 0Z`;
export const disc=(x:number,y:number,rx:number,ry:number,fill:Part['fill'],stroke=INK,width=1.25)=>shape(oval(x,y,rx,ry),fill,stroke,width);
export const studs=(points:readonly (readonly [number,number])[],light='#ebd9a8',dark='#514b42')=>[paint(points.map(([x,y])=>oval(x+.28,y+.45,1.05,1.05)).join(''),dark),paint(points.map(([x,y])=>oval(x,y,.77,.77)).join(''),light)];
export const steel=sheen(-9,9,'#c4d1ce','#818f8c','#455256');
export const brass=sheen(-10,10,'#f8d98f','#c89b4c','#80643d');
export const gunDark=sheen(-10,10,'#6c7771','#485455','#2d383b');
export function spokeWheel(x:number,y:number,r:number){
 return [disc(x,y,r,r,'#4d514b'),disc(x,y,r-2,r-2,sheen(y-r,y+r,'#f2c68b','#bb8756','#76513a'),'#67462f'),seam(`M${x-r+3} ${y}h${2*r-6}M${x} ${y-r+3}v${2*r-6}`,'#8e5e3c',1.5),disc(x,y,2.55,2.55,'#d4ad76','#67462f')];
}
export function tread(x:number,y:number,length:number,r:number,trim:string,hub:string){
 const n=Math.round(length/13),xs=Array.from({length:n},(_,i)=>x+r+2+i*(length-2*r-4)/(n-1));
 return [shape(`M${x+r} ${y}h${length-2*r}a${r} ${r} 0 0 1 0 ${2*r}h${2*r-length}a${r} ${r} 0 0 1 0 ${-2*r}Z`,sheen(y,y+2*r,'#535650','#333a3a','#252e30')),
   seam(`M${x+r} ${y+3}h${length-2*r}M${x+r} ${y+2*r-3}h${length-2*r}`,trim,1.05),
   ...xs.flatMap((at,i)=>[disc(at,y+r,r-2.8,r-2.6,i===0||i===n-1?trim:hub,INK,1),disc(at,y+r,1.6,1.5,'#e1ccb0','#394341',.7)]),
   seam(Array.from({length:Math.floor((length-12)/5)},(_,i)=>`M${x+7+5*i} ${y+2*r-.8}l1-2`).join(''),'#777970',.9)];
}


const bowl:TankArt={body:[
 ...tread(-32,3,61,7,'#877d60','#69756e'),
 shape('M-30 4q-4-5 1-10l8-3H23l10 7-2 10H-28Z',sheen(-10,9,'#f6cf71','#d49b41','#986839')),
 shape('M-26 1c-13 0-17-7-14-23 2-11 7-17 17-16l5 13Z',sheen(-38,2,'#ffdc72','#d7a54c','#a4753c')),
 shape('M-28 1c-8-4-7-27 0-36q6-8 16-3l8 7-1 11-8 10-6 14Z',sheen(-40,3,'#a4c7d4','#6e9eb5','#436477')),
 shape('M-25-35q2-8-7-11 9-1 13 9M-19-38q1-9-6-12 9 0 11 10','#8fb1bd','#4b7585',1.15),
 paint('M-24-17q5-12 17-13l8 6-5 11-12 7-6 6-4-4Z','#f2e0a9'),
 shape('M-27-29q7-5 14 0l-2 4-9 1Z','#506b78'),
 shape('M-13 0q3-12 15-14l19 2 7 7-4 9H-6Z',sheen(-14,4,'#ffcd67','#d29b39','#9a6d3a')),
 shape('M5-14h13l5 4-4 3H5Z',steel,INK,1.25),seam('M8-11h10m-7 2h8','#586c70',1),
 seam('M-25 5h18m6-1h26','#fbe1a1'),
 ...studs([[-25,1],[-12,2],[25,2]])
 ],aim:[shape('M-18 0q8-3 17-3h25l4 3-4 3H-9Z',brass,INK,1.25),shape('M23-3q4-7 10-6 3 3 1 7l-4 5-7 1Z',sheen(-9,4,'#f4dea5','#b4824e','#805b42'),INK,1.3),seam('M24-2q5-1 7-5','#fcf1bd',1.1)]};

const crossbow:TankArt={body:[
 shape('M-32 1l5-9 54 2 8 8-8 8h-53Z',sheen(-9,11,'#e3ac66','#b17c48','#855831'),'#63492f'),
 ...spokeWheel(-21,10,8),...spokeWheel(23,10,8),
 shape('M-26 1l8-18 12-4 11 22 20 3v4H-25Z',sheen(-20,9,'#f1c98d','#bc864c','#91613d'),'#694a32'),
 shape('M-26 1l2-18 8-4 5 4v15Z',sheen(-21,1,'#8caa70','#5a7846','#45583b')),
 shape('M-27-3l-5-6 1-14 5-4 6 4-2 16Z','#a85236','#6e4931'),
 shape('M-30-19l-5-10 4-3 5 2-1 9Z','#ed9b46','#7f5431',1.2),
 shape('M-18-9l3-6 34 2 9 6-17 4Z',sheen(-16,-2,'#efd198','#c3935b','#a16d40'),'#654a33'),
 seam('M-18 1q4-3 9-2m-4 7h28m-29-10 8-2 8 2','#855533'),
 ...studs([[-27,1],[-15,-8],[13,2],[26,-2]])
 ],aim:[shape('M-16-4h36l5 4-5 4h-36Z',sheen(-5,5,'#e3b97a','#bb844c','#7c583b'),'#674930'),
 shape('M16-22q12 2 14 15 2 7 0 14-2 13-14 15l-3-4q9-4 9-15l1-3-1-3q0-11-9-15Z',sheen(-23,23,'#90aa61','#687f4c','#425b42'),'#435139',1.55),
 seam('M16-20 9 0l7 20','#f4deaa',1.15),seam('M-10 0h44','#b98152',2),
 shape('M34-4l7 4-7 4 2-4Z','#cbd2c2','#526263',1),paint('M-10 0-16-4h6l5 4-5 4h-6Z','#dc773d'),
 seam('M17-18q7 4 8 12m0 12q-1 8-8 12','#a8be83',1.2)
 ]};

const cannon:TankArt={body:[
 // One broad lacquered wheel; the wooden trail supports the rear silhouette.
 shape('M-35 7l21-4 17-21 12 2 5 14 17 7v6l-8 1-24-10-17 7-23 3Z',sheen(-15,13,'#efd096','#c29554','#906638','#684627'),'#533e31'),
 shape('M2-16l13-3 10 8-4 18-11 1-4-12-7-4Z',sheen(-16,11,'#ffda94','#d6a465','#a47742'),'#604830',1.5),
 shape('M-34 8l11-3 7 1-9 4-9 1Z','#d5a865','#7b5839',.9),
 seam('M-25 8l16-3m20-11l6-4m0 13 12 4','#edc492',1.2),
 disc(2,6,19,12.7,sheen(-7,20,'#b98058','#ad5b36','#914321','#692f21'),'#51382b',2),
 disc(2,6,15.7,10.2,'none','#86401e',1.05),
 seam('M-15 4Q-9-5 4-5Q13-5 17-1','#d69a66',1.05),
 disc(2,6,4.2,3.45,'#593c30','#543326',1),disc(2,6,1.75,1.85,'#28323b','none'),
 ...studs([[12,-8],[17,-4],[-26,7],[31,8]],'#ffe1a0','#88623d')
 ],aim:[
 shape('M-24-9l6-3 9 2 4 2 24-2 9-3 5 2v22l-5 2-9-3-24-2-4 2-9 2-6-3Z',sheen(-13,13,'#8c979b','#e7ebdf','#adbaba','#5e6c73','#323f49'),'#34414a',1.9),
 shape('M-24-11l5-1 6 3v18l-6 4-5-2-3-4V-7Z',sheen(-12,13,'#becdc8','#77878b','#3d4b55'),'#303f4a',1.5),
 shape('M-3-10l3-4 9 1 3 4-4 4H1Z',sheen(-13,-5,'#e8c786','#b88d50','#8a633a'),'#62513e',1.25),
 shape('M21-11l7-3 5 2v24l-5 2-7-3Z',sheen(-14,14,'#9caeae','#edf0e3','#9caeb2','#54666f'),'#48575e',1.35),
 disc(32,0,3.8,12.4,'#84979b','#33434d',1.35),disc(32.6,0,2.25,8.4,'#283640','none'),
 seam('M-8-5l9 1 16-2m8 1 4-2m-44 3h2','#f7f7e8',1.35)
 ]};

const beetle:TankArt={body:[
 ...tread(-34,3,68,7.5,'#b3955d','#92744d'),
 shape('M-34 4l-2-14 11-12 13-3 14 3h17l14 8 5 14-10 8h-60Z',sheen(-27,8,'#ffda90','#de9e4f','#af6e3b','#80523a')),
 shape('M-33-9l10-11 9-1-8 11 1 15-10-1Z',sheen(-22,6,'#fdf0c7','#dfbf8c','#bf8b60'),'#a07144',1),
 shape('M-23-8l4-4 5 1 2 16-7 1Z',sheen(-13,7,'#fff0ce','#eed8aa','#c99865'),'#a07144',1),
 shape('M-14-24q2-9 12-10 9 0 15 8l-2 5-20 2Z',sheen(-35,-20,'#d99662','#ba6851','#814f46')),
 shape('M18-19q12 2 15 11l2 10-10 1-6-9Z',sheen(-19,5,'#ffdd8a','#d99c4d','#9b633d')),
 shape('M18-12l8-1 4 6-3 5-8-1-3-6Z','#80b9b4','#4d6c68',1.15),
 paint('M21-9h5v4h-5Z','#e3e9ce'),seam('M-10-19l7-3m15 5h4M-11 4h32','#fbe3ae',1.35),
 ...studs([[-28,-3],[-9,-10],[5,-20],[13,2],[31,2]],'#ffe5ad')
 ],aim:[shape('M-10-3q5-6 17-5l19 2 2-2h4v16h-4l-2-2L7 8q-11 0-17-5Z',sheen(-8,8,'#ffe1a1','#d49d50','#975c3c')),
 shape('M22-6h6l1 12h-7Z','#c9794a','#885438',1),disc(31.5,0,3.6,7.7,'#edb76c'),disc(31.8,0,1.9,4.8,'#6d4938','none'),seam('M-1-4l19 1','#fff0bd',1.15)]};

const duke:TankArt={body:[
 ...tread(-32,2,65,8,'#83875b','#59664e'),
 shape('M-29 2v-12l6-9 12-4H12l18 10 6 10-7 9h-54Z',sheen(-23,7,'#aebe79','#738d51','#4b6944','#354b38')),
 shape('M-25-12q-8 3-8 13l-4 6 4 4 7-5 1-9 6-4Z',sheen(-13,11,'#fcf0cd','#d9dbbd','#849381'),'#556955',1.4),
 shape('M16-12q10 0 13 8l3 9 6 3-3 5-7-3-5-11-8-3Z',sheen(-13,13,'#fcf2ce','#d6dabc','#8e9e88'),'#556955',1.4),
 shape('M-17-7h32l5 5-4 3h-31Z','#4b6150'),
 seam('M-14-5h25m-24 2h28m-7-14 13 3','#becd93',1.1),
 ...studs([[-20,2],[16,2],[25,-5]],'#e5dc9d')
 ],aim:[shape('M-10-5l6-4 15 4 12-1 4-3h5v18h-5l-4-3-12-1-15 4-6-4Z',sheen(-9,9,'#b4c29b','#8d9b77','#4d624f')),
 disc(31,0,3.4,8,'#b8b79a'),disc(31.2,0,1.65,4.7,'#354c42','none'),seam('M-3-5l13 3h10','#e2dfb3',1.2)]};

const mineTeal=sheen(-39,-10,'#adc6b6','#7caa9f','#517d79','#385e60');
const mine:TankArt={body:[
 ...tread(-38,3,39,7.4,'#8f9e9a','#5c686d'),...tread(6,4,32,7.1,'#8f9e9a','#5c686d'),
 shape('M-35 1l7-9h56l10 7-7 7h-53l-7 3Z',sheen(-8,9,'#7a9c9c','#51797d','#395e65'),'#31565c'),
 shape('M-38-13l4-7 15-5 25-1 20 4 10 7-8 6-12 7-37 1-15-2-5-6Z',sheen(-26,-1,'#a1bfd1','#688fab','#4b708f','#334f6e'),'#34495e'),
 shape('M-35-16l-5 2 2 8 10 3 9-4 2-6-7-4Z',sheen(-18,-3,'#d9dbcd','#a3b5b6','#6e8996'),'#395768',1.3),
 shape('M-29-4q6-4 21-5h26l-4 4-11 3h-27Z','#6f96ab','#4a6c85',1),
 shape('M-27-24l9-12 9-4 15 2 14 8 14 9 3 6-8 3-13-3-17-4-16-1Z',mineTeal,'#36575c',1.8),
 shape('M-26-24l7-12 8-4 6 2-3 5-6 2-4 8Z',sheen(-40,-22,'#7ea99a','#597f70','#3f605d'),'#375853',1.1),
 seam('M-11-34l10-2 13 5m2 2 14 8M-9-11h17m-27 16h11m23 0h9','#bdd2c7',1.12),
 ...studs([[-33,-10],[-22,0],[11,-7],[24,-3]],'#d5d9c7','#4e707a')
 ],aim:[shape('M-10-4l7-4 11 3 16 1 9 1v6l-9 1-16 1-11 3-7-4Z',sheen(-8,8,'#b1c9c7','#789eaa','#4c7587'),'#344f62',1.55),
 shape('M26-4l8 1v6l-8 1 2-4Z','#78999c','#3a5159',1.05),disc(33,0,1.4,2.5,'#304c55','none'),seam('M-4-3l8 1 12-1','#d6e4d2',1)]};

const missile:TankArt={body:[
 ...tread(-34,1,68,8.5,'#788761','#596545'),
 shape('M-33 1q-1-9 4-18l10-8 18 2 20-5 10 8 6 15-6 8-15 4h-31Z',sheen(-26,9,'#b1bf65','#79964e','#506f40','#38583f')),
 shape('M-23-14l-9-6 2-8 7-2 11 12-5 4Z',sheen(-30,-15,'#cfce70','#9a9a53','#71734a')),
 shape('M-22-11l8-7 27-1 13 6-6 9-33 3Z',sheen(-20,-2,'#a9bb68','#7d9653','#5c7248')),
 shape('M-10-17l3-8 15-1 9 6-4 5Z','#657857','#45553e'),
 shape('M24-7l10 1 2 7-9 3-4-4Z','#c3aa5e','#596245',1.15),
 seam('M-27 0h15m6-5 22-2m-12 9 16-2m-8-12 8 1','#c3cb8b',1.25),
 ...studs([[-23,-4],[-11,-12],[12,-16],[23,-9]],'#e3d499')
 ],aim:[shape('M-25-2l9-7H8l6 3h10q8 1 12 6-4 5-12 6H14l-6 3h-24Z',sheen(-10,10,'#f0d584','#e3b158','#a97946')),
 shape('M12-6q17-1 24 6-7 7-24 6Z',sheen(-7,7,'#f4995b','#cd543c','#9e4132'),'#754833',1.45),
 shape('M-10-9h7V9h-7Z',sheen(-10,10,'#fff3cb','#efd8a3','#d4ad76'),'#a4865a',1.05),
 shape('M-16-6l-6-9h-7l5 11m8 10-7 9h-6l5-11',sheen(-15,15,'#e1ac61','#bf774b','#8e503e'),'#72543a',1.25),
 seam('M-5-5h13m9-1q7 0 10 2','#ffe9bc',1.4)]};

const multi:TankArt={body:[
 shape('M-34 4l5-10 17-3L-7-22H8L19-7l15 3 4 8-7 6h-58Z',sheen(-22,10,'#b6c9cd','#799daf','#597a90','#3d566f'),'#354558'),
 ...[-24,1,25].flatMap((x,i)=>[disc(x,9,9,9,sheen(0,19,'#73657e','#55465f','#3f364a'),'#393144'),disc(x,9,5.9,5.9,i===1?'#796480':'#6d5a75','#51445c'),disc(x,9,2.4,2.4,'#a28da2','#52465d')]),
 shape('M-31 1l8-6 47-1 9 3 3 5-11 4h-51Z',sheen(-7,6,'#b5cfdb','#8daec3','#64869f'),'#456179'),
 shape('M-14-5l2-10 8-3 11 3 4 10Z','#4f6c7d','#3e5368'),
 shape('M-27-11l3-7 7 1 3 10-10 2Z','#aab5ad','#5e7378'),shape('M16-5l7-9 8 1 1 9Z','#668d58','#4d6853'),
 seam('M-21 1H3l13-6h9','#e66f4f',1.65),seam('M-25 1h6m29 1 10-6h9','#a3c165',1.35),
 ...studs([[-22,2],[-8,-8],[6,-8],[24,0]],'#dde1d6','#596279')
 ],aim:[shape('M-18-12l6-6h36l8 6v24l-6 6h-37l-7-6Z',sheen(-18,18,'#cfc3aa','#ada492','#7e796e','#696a68'),'#46494a'),
 shape('M-18-12h38l5-6h-37Z','#beb39b','#7a7468',1),
 shape('M-18 12h38l6 6h-37Z','#797977','#5e5c60',1),
 ...[-8,0,8].flatMap(y=>[shape(`M-11 ${y-2.7}h37v5.4h-37Z`,gunDark,'#595653',.85),disc(27,y,4,3.55,'#d85647','#713c37',1),disc(28,y,2.15,1.9,'#653538','none'),seam(`M-7 ${y-1.65}h25`,'#a7a193',.75)]),
 seam('M-15-10v20m24-22v24','#ded3b9',1.1),...studs([[-14,-13],[-14,13],[17,14]],'#f2e2c1','#70665f')]};

const laser:TankArt={body:[
 shape('M-37 3l10-13 39 3 18-1 9 8 1 10-10 7h-54Z',sheen(-10,17,'#9ab9c7','#618da4','#3f667c','#3d566e')),
 shape('M-35 2l8-11 37 1 19 2 5 5-12 6h-45Z',sheen(-10,7,'#ed9771','#ce623f','#8c453e')),
 shape('M-24 11l20 2 35-1-5 5h-49Z','#637f99','#4a5b65',1),
 shape('M-12-7l5-4 1-18h8l3 19 6 5Z',sheen(-29,-5,'#d2a66c','#9b7454','#5f554a')),
 shape('M-11-22l-15-11-12-5 5 12 13 9-13-4 1 6 20 6Z',sheen(-39,-9,'#c5d9dc','#8cb1c1','#52798c')),
 seam('M-30-29l13 9m-12-2 11 7M-24 8h22m7-1h15','#d6dbcd',1.2),
 shape('M-9-16v-10l5-6h6l6 7v10Z',sheen(-33,-15,'#f0a371','#cf6a4d','#8f4945')),
 ...studs([[-27,0],[-17,10],[7,11],[27,8],[34,7]],'#f9d393')
 ],aim:[shape('M-11-5l7-6h10l12 5 10-1 5 3v8l-5 3-10-1-12 5H-4l-7-6Z',sheen(-11,11,'#f7a16b','#d16b4b','#9f4741')),
 shape('M20-7h8l4 2v10l-4 2h-8Z',brass),disc(31.5,0,3.1,6.3,'#789e98'),disc(31.9,0,1.55,3.8,'#b3e2ce','none'),seam('M-5-5l12-2 10 4','#ffe1b0',1.1)]};

const water:TankArt={body:[
 // Level hover skirt; the slanted upper panel keeps the vehicle's forward pitch.
 shape('M-38 1q5-7 13-7h46l12 5 5 7-5 9q-4 3-12 3h-44q-12 0-15-7Z',sheen(-9,19,'#aec6d0','#6d92b2','#476785','#2b4562'),'#263d55'),
 shape('M-39-2q4-8 14-11 12-2 23 5l17-1 6-5 10 6 6 12-8 6-13-4-13 2h-22l-14-3Z',sheen(-18,11,'#9dbdbb','#71999b','#52767f','#345967'),'#254550'),
 shape('M-33-3q9-5 19-2l15 5h13l-4 3-22 1q-14 0-21-7Z',sheen(-10,6,'#bdd3c5','#8eafaa','#618b89'),'#587d83',.9),
 shape('M-27-12l2-7 8-3 10 4 1 7-5 3-15-1Z',sheen(-26,-12,'#dbe2d0','#9aada8','#668b91'),'#304d5a',1.25),
 seam('M-23-19l6-2 5 2m-20 24q4 5 15 6h40','#b4c7d3',1.1),
 shape('M3-9l-1-8 9-3 9 6-2 7Z',sheen(-20,-6,'#708d85','#4a6a67','#334f54'),'#37575d',1.25),
 ...studs([[-31,-4],[-12,1],[13,1],[26,1]],'#cbddd1','#476c75')
 ],aim:[shape('M-12-5l8-5 11 3 18-1 7 5V4l-7 4-18-2-11 3-8-5Z',sheen(-10,9,'#90ad66','#567d39','#365c31','#254d32'),'#263e33',1.65),
 shape('M-14-5l5-5 8 2v13l-7 3-6-4Z',sheen(-10,8,'#88a399','#5d7e77','#3c5e58'),'#314e4d',1.25),
 shape('M22-7l8 1 4 3v6l-4 3-8 1 3-5v-4Z',sheen(-8,8,'#7d9a4c','#537539','#2e5633'),'#2b4c35',1.1),
 disc(32.3,0,1.55,3.1,'#243d38','none'),seam('M0-5l8 2 14-1','#c3cb79',1.1)]};

const ion:TankArt={body:[
 shape('M-29 3q1-12 11-21l10-7 15-1 17 6 10 11-4 14-12 10-25 2-16-6Z',sheen(-27,17,'#ffde89','#ddb150','#b37b3e','#78573a')),
 shape('M-23-13q9-14 22-16l12 2 9 9-7 9h-22Z',sheen(-30,-9,'#b8d6d8','#729eb1','#486c85')),
 shape('M-11-21l7-4 13 2 4 5-10 2Z','#a9c9ca','#5c8b9e',1),
 shape('M-15-5l-13-1-12 7 3 6 18-4ZM14-7l9-3 15 3 1 5-15 4Z',sheen(-10,7,'#fcf5dc','#dce5d4','#9cb4ac')),
 disc(-5,6,12,10,sheen(-3,18,'#eac677','#bd9349','#8a683a')),disc(-4,6,8.3,7.2,'#c1833c','#866039'),disc(-3.5,6,4.6,4.3,'#f6cf68','#ae7939',1),
 shape('M15-18l2-10h9l4 6-1 8-7 3Z',sheen(-28,-10,'#f2cb78','#c68b52','#855742')),
 seam('M7 13l15-5 6-6M-22-7l7 3m27-18 8 4','#f8e3a7',1.3),...studs([[-22,1],[12,6],[19,-14]])
 ],aim:[shape('M-9-4l8-5 17 1 7 6v4l-7 6-17 1-8-5Z',brass),
 shape('M19-10l7-3 6 6v14l-6 6-7-3 6-5V-5Z',sheen(-13,13,'#ffe5a0','#d3a854','#916b40')),
 seam('M28-14q10 14 0 28','#b19556',2.25),disc(31,0,3.5,4.5,'#b9ded1','#676d58',1.2),seam('M-3-4h13','#ffdfa0',1.1)]};

const seaFar=sheen(-6,15,'#9083b9','#625988','#42476e');
const seaNear=sheen(-6,19,'#ceafe9','#9473c7','#674e99','#4f487a');
const seaSole=sheen(8,19,'#a0a4cc','#6275a1','#445a7d');
// Match the hover tanks’ footprint without shifting the cannon pivot.
const sea:TankArt={bodyFit:{scaleX:.87,scaleY:.85,lift:1.2},body:[
 // Four shadowed arms behind the shell; the four lighter, bent arms read in front.
 shape('M-23-6q-16 0-21 12l2 8 7-2q4-10 15-12Z',seaFar,'#3e405d',1.5),
 shape('M-9-9q-10 0-12 13l2 11 7-2 3-12 6-5Z',seaFar,'#3e405d',1.5),
 shape('M5-9q11 0 16 10l-2 13-8 1-2-8-7-7Z',seaFar,'#3e405d',1.5),
 shape('M22-7q16-2 23 11l-2 9-9-1-5-8-12-4Z',seaFar,'#3e405d',1.5),
 shape('M-25-9q-14 4-17 18l2 7 9 2 6-6 3-9 9-5-4-7Z',seaNear,'#42375e'),
 shape('M-10-9q-8 5-10 13l-1 12 6 3 10-1 3-5-1-10 4-7Z',seaNear,'#42375e'),
 shape('M4-9 0-3l5 8 1 10 5 4 9-2 3-6-3-12-10-9Z',seaNear,'#42375e'),
 shape('M17-8q14 0 22 10l3 10-4 6-9-1-5-7-6-7-7-5Z',seaNear,'#42375e'),
 shape('M-41 11q5 3 12 2l-2 5-9 1-3-4Zm20 2q9 2 18-1l-2 6-10 2-6-3Zm27 0q11 2 19-3l1 6-6 4-9-1Zm22-2 12-2 2 4-3 6-8-1Z',seaSole,'#495472',1.1),
 seam('M-35 9q3-7 8-9m11 9 3-10m24 0 5 10m10-9 8 8','#d8b9eb',1.1),
 shape('M-38-13q0-9 15-12l13-2h20l15 2q16 3 16 12l-4 8-13 5h-47l-13-5Z',sheen(-28,-1,'#e4c889','#bca061','#907342','#645639'),'#4a483d'),
 shape('M-35-13l-8-6 8-5 15 5 2 7-7 4Z',sheen(-24,-7,'#c6d4cc','#8ca7b2','#576c85'),'#4b5d71',1.3),
 shape('M-22-23l5-5 9-1 9 3 4 6-8 5-14-1-6-4Z',sheen(-29,-15,'#dbe0c9','#9baab0','#5e7982'),'#405665',1.25),
 shape('M-14-10h36q8 0 13 5l-10 4h-35Z',sheen(-14,-3,'#bcab75','#9c814d','#766146'),'#5f664e',1),
 seam('M-18-24l6-3 8 1M-21-13l10 3m22-9 11 2m-21 9 17-1','#ede0a9',1.1),
 ...studs([[-29,-12],[-18,-7],[12,-7],[25,-8]],'#ebd6a2','#6d5f50')
 ],aim:[shape('M-11-4l7-4 13 2 13-2 10 4v8l-10 4-13-2-13 2-7-4Z',sheen(-9,9,'#e3ca91','#a88f59','#75805b','#5a6656'),'#424b45',1.5),
 shape('M22-8l7-2 5 5v10l-5 5-7-2 3-4v-8Z',sheen(-10,10,'#cbd2c4','#97a7ad','#60788b'),'#475a66',1.15),
 disc(33,0,1.45,3.7,'#3d5056','none'),seam('M-4-4l10 1 14-2','#efe1b0',1.1)
 ]};

const dragon:TankArt={body:[
 ...tread(-39,-.5,78,9.25,'#a5a0ac','#786e84'),
 shape('M-41 4l6-11 14-3 43-1 14 6L42 6l-6 4-11-6h-46l-7 5-11-1Z',sheen(-11,11,'#a4c5dd','#6299c0','#49749a','#394f70')),
 shape('M-36-10l-5-12 7-14 10-8 19-4 12 7 7 19-6 17-19 6-21-4Z',sheen(-48,-4,'#b0c7dc','#6a9bc1','#426b99','#3e557e')),
 shape('M-32-35l7-8 18-2 8 5-4 15-26 2-6-4Z',sheen(-46,-22,'#d0d4db','#a2a6c2','#655f82')),
 shape('M-29-35l5-5 15-2 6 2-4 12-19 2-4-3Z',sheen(-42,-26,'#e8c2db','#be87ba','#856591'),'#565271',1.3),
 seam('M-29-33l23-3m-22 8 20-2','#765778',1.55),
 shape('M-15-7q-2-13 7-20l15-7 12 3 17 7 6 8-9 11-20 5-24-1Z',sheen(-34,2,'#a4d1c2','#63aa9a','#408679','#416a66')),
 shape('M5-25l10-3 16 6 5 6-10 6-20-1-7-7Z',sheen(-29,-10,'#b5d4bd','#82b7a6','#5c9b91'),'#4e8278',1.1),
 seam('M-32-16l7 3m-8 2 7 4m13 5 18 1m12-6 13-3m-5 12 12 2','#b7cbc5',1.25),
 ...studs([[-29,-10],[-14,-17],[2,-26],[20,-16],[32,1]],'#d4e2d5')
 ],aim:[shape('M-13-7l7-4h27l10 5 3 6-3 6-10 5H-6l-7-4Z',sheen(-11,11,'#dddfe1','#a7b1bc','#667787','#556173')),
 shape('M21-9l8 3 4 6-4 6-8 3 3-5v-8Z','#566275','#424957',1.15),disc(30.5,0,2.5,3,'#cf8452','#634f48',.95),
 seam('M-5-6h22m-20 13h18','#e4e6dc',1.1),...studs([[-7,-4],[-7,4]],'#d8ded6')]};

export const TANK_ART={bowl,crossbow,cannon,beetle,duke,mine,missile,multi,laser,water,ion,sea,dragon} satisfies Record<VehicleId,TankArt>;
