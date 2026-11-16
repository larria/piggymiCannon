#!/usr/bin/env python3
"""Rebuild selected compact collision grids, never copy the large original PNGs."""
from pathlib import Path
import json,struct,base64,hashlib
maps={'factory':4,'moon':7,'coast':8,'egypt':9,'temple':10};rows={}
for name,n in maps.items():
 p=Path(f'assets/ft2-mapdata/map/stageN_{n}f_bk');b=p.read_bytes();w,h=struct.unpack('<ii',b[:8])
 assert len(b)==8+(w*h+3)//4
 rows[name]={'gridWidth':w,'gridHeight':h,'number':n,'sha256':hashlib.sha256(b).hexdigest(),'packed':base64.b64encode(b[8:]).decode()}
Path('src/reference-map-data.ts').write_text('/** Derived collision grids from local client resources: row-major, bitmap Y down. Original PNGs stay ignored. Rebuild: python3 scripts/prepare-reference-maps.py */\nexport const REFERENCE_MAP_DATA='+json.dumps(rows,separators=(',',':'))+' as const;\n')
print('Rebuilt five selected grids')
