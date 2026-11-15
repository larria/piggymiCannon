#!/usr/bin/env python3
"""Select decoded atlas frames; keep the 51 MiB sources local and ignored."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--metadata',type=Path,default=Path.home()/'Downloads/ft2逆向/supertank-web/public/assets/atlas');args=p.parse_args()
OUT=ROOT/'public/effects';OUT.mkdir(parents=True,exist_ok=True)
specs=[
 ('blast','effect','explos',None,(96,96),(192,156,100)),
 ('energy','effect','BLaser',None,(96,96),(154,190,187)),
 ('water','effect','BSWater',None,(128,64),(123,178,205)),
 ('flame','effect','fire',None,(32,64),(226,166,95)),
 ('gas','effect','chemi',None,(128,72),(162,181,119)),
 ('missile-grain','bullet','bullet07',[64,65,66,67],(64,16),(236,230,210)),
 ('multi-grain','bullet','bullet08',[64,65,66,67],(32,16),(236,230,210)),
]
records=[]
for key,kind,atlas,indices,cell,tint in specs:
 source=ROOT/'assets/ft2-bullets'/kind/(atlas+'.png')
 metadata=args.metadata/(kind+'.json');data=json.loads(metadata.read_text())[atlas]['sprites']
 frames=sorted(data,key=lambda f:int(f['name'].rsplit('_',1)[1]));frames=[frames[i] for i in indices] if indices else frames
 im=Image.open(source).convert('RGBA');maxw=max(f['width'] for f in frames);maxh=max(f['height'] for f in frames);scale=min((cell[0]-4)/maxw,(cell[1]-4)/maxh)
 sheet=Image.new('RGBA',(cell[0]*len(frames),cell[1]));rects=[]
 for i,f in enumerate(frames):
  rect=(f['x'],f['y'],f['x']+f['width'],f['y']+f['height']);crop=im.crop(rect)
  # Interior material only: discard the rear 60%, including baked exhaust.
  # This crop is subsequently clipped inside our existing vector body in the renderer.
  if kind=='bullet':crop=crop.crop((round(crop.width*.6),0,crop.width,crop.height))
  alpha=crop.getchannel('A');grey=ImageOps.grayscale(crop);colored=ImageOps.colorize(grey,tuple(round(c*.36) for c in tint),tint).convert('RGBA');colored.putalpha(alpha)
  if kind=='bullet':colored=colored.resize((cell[0]-4,cell[1]-4),Image.Resampling.LANCZOS)
  else:colored=colored.resize((max(1,round(crop.width*scale)),max(1,round(crop.height*scale))),Image.Resampling.LANCZOS)
  x=i*cell[0]+(cell[0]-colored.width)//2;y=(cell[1]-colored.height)//2;sheet.alpha_composite(colored,(x,y));rects.append({'name':f['name'],'rect':list(rect)})
 path=OUT/('ft2-'+key+'.png');sheet.save(path,optimize=True,compress_level=9)
 records.append({'id':key,'file':str(path.relative_to(ROOT/'public')),'cell':list(cell),'frames':len(frames),'source':str(source.relative_to(ROOT)),'sourceBytes':source.stat().st_size,'bytes':path.stat().st_size,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'metadataSha256':hashlib.sha256(metadata.read_bytes()).hexdigest(),'selected':rects})
manifest={'formatVersion':1,'source':'用户本机 ft2逆向/resources/ 逆向提取，仅本项目使用，未宣称官方授权','processing':'Pillow LANCZOS; atlas rect crop; shared frame scale; monochrome warm palette; lossless PNG optimize/compress_level=9; bullet rear 60% discarded; interior clipping at runtime','totalSourceBytes':sum(p.stat().st_size for p in (ROOT/'assets/ft2-bullets').rglob('*.png')),'runtimeBytes':sum(r['bytes'] for r in records),'assets':records}
(ROOT/'research/FT2_VISUAL_SOURCES.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:manifest[k] for k in ['totalSourceBytes','runtimeBytes']},indent=2));print([(r['id'],r['bytes'],r['frames']) for r in records])
