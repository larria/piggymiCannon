from PIL import Image
import numpy as np,json
from scipy.signal import fftconvolve
from pathlib import Path
atlas=Image.open('/Users/larkin_1/Downloads/ft2/resources/tank/char03.png').convert('RGBA')
boxes=json.load(open('/tmp/piggy-tank-candidate-boxes.json'))
files=list(Path('/Users/larkin_1/Downloads/piggymiCannonRefer').glob('*.png'))
def match(patch,sprite):
 a=np.array(sprite)/255.;rgb=a[:,:,:3];w=(a[:,:,3]>.6).astype(float)
 if w.sum()<400:return None
 target=np.array(patch)/255.
 h,wi=w.shape
 if h>target.shape[0] or wi>target.shape[1]:return None
 score=fftconvolve(np.sum(target*target,axis=2),w[::-1,::-1],mode='valid')
 for k in range(3):score-=2*fftconvolve(target[:,:,k],(rgb[:,:,k]*w)[::-1,::-1],mode='valid')
 score+=np.sum(rgb*rgb*w[:,:,None]);score/=w.sum()*3
 y,x=np.unravel_index(np.argmin(score),score.shape)
 return float(score[y,x]),int(x),int(y)
results=[]
for p in files:
 im=Image.open(p).convert('RGB');origin=(210,0) if '未正中' not in p.name else (530,25)
 patch=im.crop((origin[0],origin[1],origin[0]+140,origin[1]+110))
 ranked=[]
 for i,b in enumerate(boxes):
  source=atlas.crop((b[0],b[1],b[0]+b[2],b[1]+b[3]))
  for flip in [False,True]:
   sp=source.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else source
   candidate=sp.resize((round(sp.width*.9),round(sp.height*.75)),Image.Resampling.BILINEAR)
   value=match(patch,candidate)
   if value:ranked.append((value[0],i,flip))
 ranked.sort();best=[]
 for _,i,flip in ranked[:8]:
  b=boxes[i];source=atlas.crop((b[0],b[1],b[0]+b[2],b[1]+b[3]));source=source.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else source
  for sx in np.arange(.7,1.151,.025):
   for sy in np.arange(.5,1.001,.025):
    resized=source.resize((round(source.width*sx),round(source.height*sy)),Image.Resampling.BILINEAR)
    for angle in [-8,-4,0,4,8]:
     candidate=resized.rotate(angle,Image.Resampling.BICUBIC,expand=True);value=match(patch,candidate)
     if value:best.append((value[0],i,flip,float(sx),float(sy),angle,value[1]+origin[0],value[2]+origin[1],candidate.width,candidate.height))
 best.sort();print(p.name,best[:4],flush=True)
 row={'file':str(p),'cropOrigin':origin,'best':best[:15],'atlasBox':boxes[best[0][1]]};results.append(row)
 b=boxes[best[0][1]];atlas.crop((b[0],b[1],b[0]+b[2],b[1]+b[3])).save('/tmp/piggy-best-frame-'+('miss' if '未正中' in p.name else 'hit')+'.png')
Path('/tmp/piggy-tank-match-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
