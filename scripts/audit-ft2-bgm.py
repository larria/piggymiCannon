"""Read original client IL and RVA data. Does not import the replica web project.
Requires dnfile/dncil in a separate Python environment, not game dependencies.
"""
import argparse, hashlib, json, struct, xml.etree.ElementTree as ET
from pathlib import Path
import dnfile
from dncil.cil.body import CilMethodBody
from dncil.cil.body.reader import CilMethodBodyReaderBytes
from dncil.clr.token import Token, StringToken
p=argparse.ArgumentParser();p.add_argument('--client',type=Path,default=Path.home()/'Downloads/ft2');args=p.parse_args()
root=Path(__file__).resolve().parents[1];client=args.client;assembly=client/'extracted/assets/Dlls/MyScripts.dll.bytes';language=client/'resources/config/decrypted/Language.txt';pe=dnfile.dnPE(str(assembly))
methods={};owners={}
for td in pe.net.mdtables.TypeDef:
 name=str(td.TypeNamespace)+'.'+str(td.TypeName)
 for mr in td.MethodList:methods[name+'.'+str(mr.row.Name)]=mr.row;owners[id(mr.row)]=name
 for fr in td.FieldList:owners[id(fr.row)]=name

def body(m):return CilMethodBody(CilMethodBodyReaderBytes(pe.get_data(m.Rva,20000)))
def resolve(t):
 if isinstance(t,StringToken):return pe.net.user_strings.get(t.rid).value
 if isinstance(t,Token):
  row=pe.net.mdtables.tables[t.table].rows[t.rid-1];name=str(getattr(row,'Name',getattr(row,'TypeName','?')));return owners.get(id(row),'')+'.'+name
 return t

def data_field(method,count):
 token=next(i.operand for i in body(method).instructions if str(i.opcode)=='ldtoken');field=pe.net.mdtables.tables[token.table].rows[token.rid-1]
 entry=next(r for r in pe.net.mdtables.FieldRva if r.Field.row is field);data=pe.get_data(entry.Rva,count*4)
 return {'field':str(field.Name),'rva':hex(entry.Rva),'sha256':hashlib.sha256(data).hexdigest(),'values':list(struct.unpack('<'+str(count)+'i',data))}
base='LuaFramework.Logic.MapUtil.';matrix=data_field(methods[base+'init'],104);counts=data_field(methods[base+'setNormalStage'],21)
rows={e.attrib['info']:e.attrib for e in ET.parse(language).getroot().iter('data')}
maps=[]
for n in range(26):
 tracks=matrix['values'][n*4:n*4+4];count=counts['values'][n] if n<21 else 1
 maps.append({'mapNumber':n,'name':rows['map_name_'+str(n)]['cn'],'rawBgmNumbers':tracks,'soundCount':count,'availableBgmNumbers':tracks[:max(1,count)]})
selected=[base+n for n in ['init','getStageBgm','setNormalStage']]+['LuaFramework.SoundManager.InitSound']
il={}
for name in selected:
 m=methods[name];b=body(m);lines=[]
 for i in b.instructions:
  # The first two loops are the GM / stage namespaces; exclude unrelated SFX table.
  if name.endswith('InitSound') and i.offset>=0x6a:break
  operand=resolve(i.operand) if i.operand is not None else ''
  if isinstance(operand,list):operand=[hex(x) for x in operand]
  if str(i.opcode).startswith(('br','blt','bge','beq','bne')) and isinstance(operand,int):operand=hex(operand)
  lines.append(f'{i.offset:04x} {i.opcode} {operand}')
 il[name]={'rva':hex(m.Rva),'codeBytesSha256':hashlib.sha256(b.raw_bytes).hexdigest(),'instructions':lines}
# Find the original music chooser call, including iterator MoveNext bodies.
callers=[]
for name,m in methods.items():
 if not m.Rva or not (name.startswith('LuaFramework') or 'IStartFight' in name):continue
 try:b=body(m)
 except Exception:continue
 for n,i in enumerate(b.instructions):
  if str(i.opcode) in ['call','callvirt'] and resolve(i.operand) in [base+'getStageBgm','LuaFramework.Logic.GameRoomInfo.get_StartStageBgm']:
   callers.append({'method':name,'rva':hex(m.Rva),'instructions':[f'{j.offset:04x} {j.opcode} {resolve(j.operand) if j.operand is not None else ""}' for j in b.instructions[max(0,n-8):n+8]]})
evidence={'formatVersion':1,'source':'原客户端 MyScripts.dll.bytes 的 IL / FieldRVA，原 Language.txt 与 APK 清单；不使用 supertank-web 规则','files':[{'path':str(f.relative_to(client)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in [assembly,language,client/'apk_filelist.txt']],'matrix':matrix,'soundCounts':counts,'maps':maps,'bgmNames':{str(n):rows['bgm_name_'+str(n)]['en'] for n in range(23)},'methods':il,'callers':callers,'scope':'此提取客户端允许列表，不宣称所有历史Fortress 2发行版只有一首固定配乐'}
(root/'research/FT2_MAP_BGM_EVIDENCE.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'maps':[m for m in maps if m['mapNumber'] in [4,7,8,9,10]],'callers':callers},ensure_ascii=False,indent=2))
