import type {VehicleId} from './vehicles';

// Shared by the SVG catalogue and the two cached battlefield layers.
export const INK='#373e39';
export type Finish={top:number;bottom:number;colors:readonly string[]};
export type Part={d:string;fill:string|Finish;stroke:string;width:number};
export type TankArt={body:Part[];aim:Part[];rage?:Part[]};
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
 shape('M-33 7l7-10 15-3 4-9H6l11 13 14 4 5 7-8 4h-51Z',sheen(-14,13,'#dca86e','#b5814a','#6b4933'),'#564637'),
 shape('M-22 4l12-16h9L12 4l-8 2-11-10-9 10Z',sheen(-13,5,'#e3c088','#9a6f4a','#714b37'),'#604d39'),
 shape('M-26 1l9-2 8 10h-13Z','#a77647','#634a35'),
 ...spokeWheel(-25,9,9),...spokeWheel(24,7.5,10.5),disc(24,7.5,3,3,'#edbd68','#704a35'),
 shape('M-9-6l1-10 8-3 8 3 2 10-9 2Z',sheen(-18,-4,'#92958a','#606860','#424944')),disc(0,-12,4.5,4.5,'#696e62','#3d4747'),
 seam('M-17 2l8-9m-7 13 26 1m3-7 6 2','#e3b67d',1.15),
 ...studs([[-16,1],[-5,-10],[5,-10],[12,6]],'#e8ce8e')
 ],aim:[
 shape('M-18-5q4-5 12-5l21 3 10-2 3-5h4v28h-4l-5-5-10-2-21 3q-7 0-10-5Z',sheen(-14,14,'#bac3b7','#747e78','#414c4c','#343e42')),
 shape('M22-8l5-5 4 1v24l-4 1-5-5Z',sheen(-13,13,'#adb8ae','#727d78','#465452')),
 disc(31.5,0,3.75,13,'#7d8b85','#3b4747',1.4),disc(32,0,2.1,9.4,'#2b383a','none'),
 seam('M-13-5q5-3 13-2l17 2m-24 11 20-2','#ccd3bf',1.2),
 seam('M6-6q-2 6 0 12','#535d57',1.4)
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
 shape('M-27-7c-13-10-15-30-6-36 8-5 20-3 26 2l3 10-8 3-8-7-6 3q-1 12 9 19Z',sheen(-47,-7,'#c4d687','#7e9b52','#4e7445','#345444')),
 shape('M-26-38q8-4 17 1l1 4-6 1-5-4-6 2Z','#9faf64','#526743',1.1),
 seam('M-34-33q-2 13 10 22m-5-29q6-3 12-2','#c3d38b',1.3),
 shape('M-25-12q-8 3-8 13l-4 6 4 4 7-5 1-9 6-4Z',sheen(-13,11,'#fcf0cd','#d9dbbd','#849381'),'#556955',1.4),
 shape('M16-12q10 0 13 8l3 9 6 3-3 5-7-3-5-11-8-3Z',sheen(-13,13,'#fcf2ce','#d6dabc','#8e9e88'),'#556955',1.4),
 shape('M-17-7h32l5 5-4 3h-31Z','#4b6150'),
 seam('M-14-5h25m-24 2h28m-7-14 13 3','#becd93',1.1),
 ...studs([[-20,2],[16,2],[25,-5]],'#e5dc9d')
 ],aim:[shape('M-10-5l6-4 15 4 12-1 4-3h5v18h-5l-4-3-12-1-15 4-6-4Z',sheen(-9,9,'#b4c29b','#8d9b77','#4d624f')),
 disc(31,0,3.4,8,'#b8b79a'),disc(31.2,0,1.65,4.7,'#354c42','none'),seam('M-3-5l13 3h10','#e2dfb3',1.2)]};

const mine:TankArt={body:[
 ...tread(-34,1,69,8.5,'#899995','#667b79'),
 shape('M-31 3l-3-10 7-9h46l14 8L36 3l-9 5h-53Z',sheen(-16,9,'#a5b4b3','#687f85','#465d68')),
 shape('M-29-8q-6-9-2-19 8-12 23-13h14q17 4 20 18l-2 14-16 7-25-1Z',sheen(-41,-1,'#a2c0c5','#759ca9','#598297','#426772')),
 shape('M-20-32l4-13 5-4h16l7 9-2 10Z',sheen(-49,-30,'#d7d17e','#a4ab55','#777e46'),'#55604b'),
 shape('M-16-44l7-4H5l5 7-20 1Z','#c8c56e','#6f7949',1),seam('M-10-38h15m-22 3h24','#7c844d',1.15),
 shape('M-22-14l3-10 18-4 13 3 3 9-9 5h-22Z',sheen(-29,-10,'#bed1ce','#90a9ac','#566f78')),
 seam('M-15-21l14-2 9 2m-23 4 17-2','#5b737b',1.2),
 shape('M18-6v-8l9-1 4 4v6Z','#818f57','#546451',1.1),
 ...studs([[-29,-6],[-22,-28],[4,-33],[13,-20],[26,0]],'#dce5cb')
 ],aim:[shape('M-8-7q8-4 15-2l18 1 5 4v8l-5 4-17 2q-10 1-16-3Z',sheen(-10,10,'#b4c7c5','#809ba0','#52727c')),
 shape('M22-10h7l4 4V6l-4 4h-7Z',gunDark),disc(31,0,2.5,4,'#26393e','none'),seam('M-1-4 18-5m-15 9h13','#d8e0cc',1.1)]};

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
 shape('M-34 4l5-10 17-3L-7-22H8L19-7l15 3 4 8-7 6h-58Z',sheen(-22,10,'#b4b678','#7c8954','#4c6145')),
 ...[-24,1,25].flatMap((x,i)=>[disc(x,9,9,9,sheen(0,19,'#61675a','#3d4740','#333934')),disc(x,9,5.9,5.9,i===1?'#71865d':'#a18f69','#424e41'),disc(x,9,2.4,2.4,'#dbc68f','#535b45')]),
 shape('M-31 1l8-6 47-1 9 3 3 5-11 4h-51Z',sheen(-7,6,'#c1be7e','#8f965e','#6b774e')),
 shape('M-14-5l2-10 8-3 11 3 4 10Z','#636d50'),
 shape('M-27-11l3-7 7 1 3 10-10 2Z','#b78a4e'),shape('M16-5l7-9 8 1 1 9Z','#596f52'),
 seam('M-22 1H10m8 1h12','#d9cd92',1.3),...studs([[-22,2],[-8,-8],[6,-8],[24,0]])
 ],aim:[shape('M-18-12l6-6h36l8 6v24l-6 6h-37l-7-6Z',sheen(-18,18,'#e9c374','#c49a52','#7f673f')),
 shape('M-18-12h38l5-6h-37Z','#e7bd68','#8d7044',1),
 shape('M-18 12h38l6 6h-37Z','#9b7846','#6c613f',1),
 ...[-8,0,8].flatMap(y=>[shape(`M-11 ${y-2.7}h37v5.4h-37Z`,gunDark,'#665637',.85),disc(27,y,4,3.55,'#d17043','#764b36',1),disc(28,y,2.15,1.9,'#653f34','none'),seam(`M-7 ${y-1.65}h25`,'#a99a6e',.75)]),
 seam('M-15-10v20m24-22v24','#f6d89a',1.1),...studs([[-14,-13],[-14,13],[17,14]])]};

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
 shape('M-35 7q1-7 14-11h40l13 5 5 8-6 6q-27 8-60 1Z',sheen(-1,18,'#9eb6b9','#608ca3','#40637a','#354e60')),
 shape('M-34 5q1-11 11-17l9-8 17-5 17 6 11 7 6 15-7 6q-32 9-61 0Z',sheen(-26,13,'#c2cd83','#95a65c','#63854d','#3b694f')),
 shape('M-26 2q15-9 36-6l18 7-5 5q-22 4-47-1Z',sheen(-6,9,'#c7d78e','#82a26b','#638e69'),'#54725d',1.2),
 shape('M-19-11l2-14 6-7h6l3 5-8 8-1 9Z',sheen(-32,-10,'#bed8c1','#7fa99a','#567e73'),'#447267'),
 shape('M-7-16l3-10h14l9 7-3 6Z','#537b62'),
 seam('M-28 12q28 5 55-1m-44-16 9-3m15 0 10 4','#c2d9b6',1.25),
 ...studs([[-24,-4],[-9,2],[13,2],[28,4]],'#eef0bd','#4d795a')
 ],aim:[shape('M-12-4l7-6 9-1 8 4 11-1 8 2 3 6-3 6-8 2-11-1-8 4-9-1-7-6Z',sheen(-11,11,'#d6e4c1','#88ada0','#5d897e')),
 shape('M19-8h8l4 2V6l-4 2h-8Z','#92bcb2','#517c77',1.2),disc(32,0,2.7,6,'#b8d4c1','#477471'),disc(32.3,0,1.4,3.4,'#426d6d','none'),seam('M-4-5l9-1 8 3','#eef0c9',1.2)]};

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

const sea:TankArt={body:[
 shape('M-26-1l-10 14 5 4h12l6-15m10-2-5 16L3 18 9 1m6-1 3 16 14 2 4-5-9-14',sheen(-4,18,'#d5a6ba','#ad83a4','#785e83'),'#4f5660'),
 shape('M-35 10l9 2 7-1v6l-4 2-12-1Zm26 3 14 1v5H-8Zm27-2 15 1 2 5-4 2-12-1Z',sheen(10,19,'#8faebb','#577e98','#46627c')),
 shape('M-24 2q8-8 25-8 17 0 27 9l-3 5-24-4-22 5Z',sheen(-6,9,'#edcc76','#b49c55','#806640')),
 shape('M-9 2l3-7 5-27 7-2 6 6-8 9L0 4Z',sheen(-33,4,'#adc3ce','#7195a9','#48758e')),
 shape('M-6-27l-10-7-4-7 7-7 14 1 10 6 13 1 3 7-8 7-16 1Z',sheen(-49,-25,'#fce09a','#d2a354','#a47943','#825a40')),
 shape('M-13-39l10-5 16 7-4 6-14-1Z',sheen(-45,-30,'#d0bb78','#a58b57','#736b50'),'#836a46',1),
 shape('M-11-1l-11-6-11-7-3-8-4 3 3 10 13 9 10 3Z',sheen(-20,3,'#a7bdc7','#749bad','#517990')),
 shape('M-41-20l-3-9 5-7 8 2 4 7-4 8-6 3Z',sheen(-36,-16,'#f0a466','#cc654b','#8c4840')),
 seam('M-38-30l4-1 3 3m-21 34 6 5m3-10 4 4m18-3 3 6m-7-21 9 1','#ebca9d',1.2),
 ...studs([[-23,4],[3,-21],[13,-33],[22,5]],'#f3dba2')
 ],aim:[shape('M-10-3l6-4 11 2 12-1 4 3v6l-4 3-12-1-11 2-6-4Z',sheen(-7,7,'#c2c77b','#809b60','#506d52')),
 shape('M21-8l6-4 5 5 2 7-2 7-5 5-6-4 5-4v-8Z',sheen(-12,12,'#ddd6dc','#b9adc8','#777b9c')),
 seam('M26-8l3 3 2 5-2 5-3 3','#fff0cb',1.4),seam('M-4-3l16 1','#dbe09e',1.15)
 ],rage:[seam('M-13-40l10-3 12 5m-8 14 2 3-3 8-1 6M-21 1l9-2 9 2h11l12 2','#f92a18',4.3),seam('M-13-40l10-3 12 5m-8 14 2 3-3 8-1 6M-21 1l9-2 9 2h11l12 2','#ffd680',1.7)]};

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
