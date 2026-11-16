#!/usr/bin/env python3
"""Audit local grids against original foreground alpha; sources remain ignored.
Requires Python numpy and Pillow. No replica-game data is read.
"""
from pathlib import Path
import struct,json,hashlib
import numpy as np
from PIL import Image
root=Path('assets/ft2-mapdata/map');rows=[]
for p in sorted(root.glob('*bk')):
 b=p.read_bytes()
 if len(b)<8:continue
 w,h=struct.unpack('<ii',b[:8])
 if not(0<w<10000 and 0<h<10000) or len(b)!=8+(w*h+3)//4:continue
 body=np.frombuffer(b[8:],dtype=np.uint8);idx=np.arange(w*h)
 values=((body[idx//4]>>((idx%4)*2))&3).reshape(h,w)
 samples=[]
 for f in [.1,.25,.5,.75,.9]:
  x=int(w*f);runs=[];start=0;previous=0
  for y in range(h+1):
   v=int(values[y,x]) if y<h else 0
   if v!=previous:
    if previous:runs.append({'yDown':[start,y],'material':previous})
    start=y;previous=v
  samples.append({'x':x,'runs':runs})
 row={'file':p.name,'sha256':hashlib.sha256(b).hexdigest(),'gridWidth':w,'gridHeight':h,'logicalWidth':w*3,'logicalHeight':h*3,'bytes':len(b),'materialCounts':np.bincount(values.reshape(-1),minlength=4).tolist(),'sampleColumns':samples}
 image=next(iter(root.glob(p.name[:-3]+'_*.png')),None)
 if image:
  im=Image.open(image).convert('RGBA');alpha=np.asarray(im.getchannel('A').resize((w,h),Image.Resampling.NEAREST))>0;mask=values>0
  def iou(a):return float((a&alpha).sum()/max(1,(a|alpha).sum()))
  row['foregroundComparison']={'file':image.name,'sha256':hashlib.sha256(image.read_bytes()).hexdigest(),'width':im.width,'height':im.height,'rowMajorYDownIoU':iou(mask),'xMajorYUpIoU':iou(values.reshape(-1).reshape(w,h).T[::-1]>0)}
 rows.append(row)
result={'formatVersion':2,'source':'用户本机 ~/Downloads/ft2 原客户端资源，镜像在忽略的 assets/ft2-mapdata/；不读取复刻项目，未宣称官方授权','codec':'LE i32 width/height; idx=y*width+x; 2 bits per cell; bitmap Y down; logical grid scale=3','decodedFiles':len(rows),'numbering':'CMap.InitMap/MapUtil.setNormalStage 的 stageN 编号与 Language map_name 文案交叉，BGM使用另行确证矩阵','materialNote':'CMap.Memset IL 0x59..0x72: only Get(x,y)==1 is Set(x,y,0). Values 3 survive excavation; factory floor and temple nodes use 3. Value 2 absent in these resources.','adoption':'五张经典图选用派生占用轮廓与原逻辑宽，纸色绘图不变；关键薄层、永久节点和Z折点保留本作单位尺寸，并按真实炮击校验，不宣称全原公式/逐像素复刻。','maps':rows}
Path('research/FT2_MAP_GEOMETRY_EVIDENCE.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'Audited {len(rows)} local grids; hashes/metrics only')
