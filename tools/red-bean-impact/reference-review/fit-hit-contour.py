from PIL import Image
from scipy import ndimage
from scipy.optimize import least_squares
import numpy as np,json
from pathlib import Path
p=next(Path('/Users/larkin_1/Downloads/piggymiCannonRefer').glob('*正中*.png'));a=np.array(Image.open(p)).astype(float)
x0,y0,x1,y1=130,0,418,88;rgb=a[y0:y1,x0:x1]
mask=(rgb[:,:,0]/np.maximum(1,rgb[:,:,1])<1.19)&(rgb[:,:,2]/np.maximum(1,rgb[:,:,0])>.46)&(rgb[:,:,0]<165)
mask[:,230-x0:330-x0]=False
mask=ndimage.binary_closing(mask,iterations=1)
l,n=ndimage.label(mask);left=l==l[30,200-x0];right=l==l[30,350-x0];region=left|right;edge=[]
for x in list(range(150,228,5))+list(range(333,410,5)):
 ys=np.flatnonzero(region[:,x-x0]);
 if len(ys):edge.append([x,int(ys[-1])])
print('edge',edge)
profile=np.array(json.load(open('/tmp/piggy-source-crater-bottom.json')));pts=np.array(edge)
for mode in ['fixed','free']:
 def f(v):
  x,y=v[:2];sx,sy=(.95,.675) if mode=='fixed' else v[2:];return y+np.interp((pts[:,0]-x)/sx,profile[:,0],profile[:,1])*sy-pts[:,1]
 start=[273,-5] if mode=='fixed' else [273,-5,.95,.675];bounds=([250,-30],[300,30]) if mode=='fixed' else ([250,-30,.88,.6],[300,30,1.05,.8]);r=least_squares(f,start,bounds=bounds,loss='soft_l1');print(mode,r.x,'median',np.median(abs(f(r.x))))
Path('/tmp/piggy-hit-crater-edge.json').write_text(json.dumps(edge))
