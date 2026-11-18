"""Record primary-client charge and guidance IL; no replica project is read."""
import argparse, hashlib, json
from pathlib import Path
import dnfile
from dncil.cil.body import CilMethodBody
from dncil.cil.body.reader import CilMethodBodyReaderBytes
from dncil.clr.token import Token, StringToken

p=argparse.ArgumentParser()
p.add_argument('--client',type=Path,default=Path.home()/'Downloads/ft2')
p.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'research/FT2_ALL_RANGE_EVIDENCE.json')
a=p.parse_args(); assembly=a.client/'extracted/assets/Dlls/MyScripts.dll.bytes'
pe=dnfile.dnPE(str(assembly)); owners={}; selected=[]
targets={'CCharacter':{'InitData','AnimationCallback'},'CFightManage':{'Bullet'},'CBullet':{'InitBullet','ProcessElement','MoveBullet','.ctor'}}
for td in pe.net.mdtables.TypeDef:
 owner=str(td.TypeNamespace)+'.'+str(td.TypeName)
 for f in td.FieldList:owners[id(f.row)]=owner
 for m in td.MethodList:
  owners[id(m.row)]=owner
  if str(m.row.Name) in targets.get(str(td.TypeName),set()):selected.append((owner+'.'+str(m.row.Name),m.row))
def resolve(token):
 if isinstance(token,StringToken):return pe.net.user_strings.get(token.rid).value
 if isinstance(token,Token):
  row=pe.net.mdtables.tables[token.table].rows[token.rid-1]
  return owners.get(id(row),'')+'.'+str(getattr(row,'Name',getattr(row,'TypeName','?')))
 return token if token is not None else ''
records=[]
for name,m in selected:
 b=CilMethodBody(CilMethodBodyReaderBytes(pe.get_data(m.Rva,100000)))
 lines=[f'{i.offset:04x} {i.opcode} {resolve(i.operand)}' for i in b.instructions]
 r={'method':name,'rva':hex(m.Rva),'sha256':hashlib.sha256(b.raw_bytes).hexdigest(),'instructions':lines}
 if name.endswith('CFightManage.Bullet'):
  keep=set(range(min(75,len(lines))))
  for n,line in enumerate(lines):
   if any(k in line for k in ['stfld LuaFramework.Logic.CBullet.m_pPospp','stfld LuaFramework.Logic.CBullet.m_pPosp']):keep.update(range(max(0,n-8),n+1))
  r['instructions']=[line for n,line in enumerate(lines) if n in keep]
  r['scope']='Initial vector and all28 carrier velocity/acceleration assignments; hash covers the full method.'
 records.append(r)
result={'source':'本机 ft2 目录/原版分析','assemblySHA256':hashlib.sha256(assembly.read_bytes()).hexdigest(),'methods':records,'scope':'Primary client charge Range and character5 launch; predictive ten-tick homing and one-time velocity replacement. No replica code used. CFightManage.Bullet retains only named instruction ranges; method hash covers the complete body.'}
config=a.client/'resources/config/decrypted/Character.txt'
result['configSHA256']=hashlib.sha256(config.read_bytes()).hexdigest()
result['characterRanges']=[{'index':i+1,'range':c['Range']} for i,c in enumerate(json.loads(config.read_text()))]
result['scope']='Primary launch and movement; all carrier gravity assignments and14 configured ranges. No replica code used.'
a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(a.output, len(records),'methods')
