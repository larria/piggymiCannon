"""Record primary-client charge and guidance IL; no replica project is read."""
import argparse, hashlib, json
from pathlib import Path
import dnfile
from dncil.cil.body import CilMethodBody
from dncil.cil.body.reader import CilMethodBodyReaderBytes
from dncil.clr.token import Token, StringToken

p=argparse.ArgumentParser()
p.add_argument('--client',type=Path,default=Path.home()/'Downloads/ft2')
p.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'research/FT2_CHARGE_HOMING_EVIDENCE.json')
a=p.parse_args(); assembly=a.client/'extracted/assets/Dlls/MyScripts.dll.bytes'
pe=dnfile.dnPE(str(assembly)); owners={}; selected=[]
targets={'CCharacter':{'InitData','AnimationCallback'},'CFightManage':{'Bullet'},'CHiddS':{'ProcessElement','CheckNearPlayer'},'CMissS':{'ProcessElement','CheckNearPlayer'},'CAmorN':{'.ctor'},'CAmorS':{'.ctor'}}
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
  r['instructionRanges']=['000c..0142 (initial velocity)','0726..0881 (character5 ordinary/special)']
  r['instructions']=[s for s in lines if int(s[:4],16)<=0x142 or 0x726<=int(s[:4],16)<=0x881]
 records.append(r)
result={'source':'本机 ft2 目录/原版分析','assemblySHA256':hashlib.sha256(assembly.read_bytes()).hexdigest(),'methods':records,'scope':'Primary client charge Range and character5 launch; predictive ten-tick homing and one-time velocity replacement. No replica code used. CFightManage.Bullet retains only named instruction ranges; method hash covers the complete body.'}
a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(a.output, len(records),'methods')
