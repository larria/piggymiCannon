from PIL import Image
import numpy as np
from scipy import ndimage
from pathlib import Path
import json
p=next(Path('/Users/larkin_1/Downloads/piggymiCannonRefer').glob('*未正中*.png'))
im=Image.open(p);a=np.array(im).astype(float);mx=a.max(2);mn=a.min(2);sat=(mx-mn)/np.maximum(1,mx)
# The crater exposes low-saturation cliff behind the warm, saturated soil.
# Contour masked to the documented crop; no leaf/name samples enter the fit.
x0,y0,x1,y1=674,110,1014,225
sub=sat[y0:y1,x0:x1];rgb=a[y0:y1,x0:x1]
mask=(sub<.45)&(rgb[:,:,0]>75)&(rgb[:,:,2]>55)
mask=ndimage.binary_closing(mask,iterations=2)
labels,n=ndimage.label(mask);ident=labels[145-y0,842-x0];region=labels==ident
edge=[]
for x in range(695,977,5):
 col=region[:,x-x0];ys=np.flatnonzero(col)
 if len(ys):edge.append([x,int(ys[-1]+y0)])
print('edge',edge)
print('maxBottom',np.where(region)[0].max()+y0)
for x,y in [(676,115),(705,160),(745,190),(800,200),(840,209),(845,215),(885,200),(930,186),(965,170),(1008,128)]:print(x,y,a[y,x].astype(int).tolist(),sat[y,x])
Path('/tmp/piggy-crater-edge.json').write_text(json.dumps(edge))
Image.fromarray((region*255).astype('uint8')).save('/tmp/piggy-crater-mask.png')
