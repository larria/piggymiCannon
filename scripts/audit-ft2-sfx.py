"""Archive primary sound registry, firing, movement, explosion and death IL. Does not read replica code."""
from pathlib import Path
import json,hashlib
import dnfile
from dncil.cil.body import CilMethodBody
from dncil.cil.body.reader import CilMethodBodyReaderBytes
from dncil.clr.token import Token,StringToken
root=Path(__file__).resolve().parents[1];assembly=Path.home()/'Downloads/ft2/extracted/assets/Dlls/MyScripts.dll.bytes'
pe=dnfile.dnPE(str(assembly));owners={};methods={}
for td in pe.net.mdtables.TypeDef:
 owner=str(td.TypeNamespace)+'.'+str(td.TypeName)
 for m in td.MethodList:owners[id(m.row)]=owner;methods[owner+'.'+str(m.row.Name)]=m.row
 for f in td.FieldList:owners[id(f.row)]=owner

def resolve(t):
 if isinstance(t,StringToken):return pe.net.user_strings.get(t.rid).value
 if isinstance(t,Token):
  row=pe.net.mdtables.tables[t.table].rows[t.rid-1];return owners.get(id(row),'')+'.'+str(getattr(row,'Name',getattr(row,'TypeName','?')))
 return t
out=[]
for name in ['LuaFramework.SoundManager.InitSound','LuaFramework.Logic.CCharacter.ChangeAction','LuaFramework.Logic.CCharacter.AnimationCallback','LuaFramework.Logic.CBullet.MoveBullet','LuaFramework.Logic.CFightManage.SetDeadPlayer']:
 if name not in methods:continue
 m=methods[name];b=CilMethodBody(CilMethodBodyReaderBytes(pe.get_data(m.Rva,20000)))
 out.append({'method':name,'rva':hex(m.Rva),'methodSHA256':hashlib.sha256(b.raw_bytes).hexdigest(),'instructions':[f'{i.offset:04x} {i.opcode} {resolve(i.operand) if i.operand is not None else ""}' for i in b.instructions]})
for name,m in methods.items():
 if not name.endswith('..ctor') or not m.Rva:continue
 b=CilMethodBody(CilMethodBodyReaderBytes(pe.get_data(m.Rva,100000)))
 lines=[f'{i.offset:04x} {i.opcode} {resolve(i.operand) if i.operand is not None else ""}' for i in b.instructions]
 if any('CBullet.Sound' in l for l in lines):out.append({'method':name,'rva':hex(m.Rva),'methodSHA256':hashlib.sha256(b.raw_bytes).hexdigest(),'instructions':lines})
evidence={'formatVersion':1,'source':'本机 ft2 目录/原版分析；不使用复刻web规则','assemblySHA256':hashlib.sha256(assembly.read_bytes()).hexdigest(),'methods':out,'conclusion':'AnimationCallback以Character×100+2/4播放普通/特殊Fire；弹种构造器设置CBullet.Sound并由MoveBullet命中时播放，对应角色组Bomb；SetDeadPlayer按MyPlayer队伍选择Friend12/Enemy13。ChangeAction(8)循环播放Character×100，对应moveN；ChangeAction(9)播放Character×100+1，对应UnmoveN，并停止moveN。本作道具无声以用户要求为依据。','gameChoice':'普通松手只停moveN；移动力耗尽才采用UnmoveN。道具无声按用户要求。5.0.4按已核实角色编号对齐音效组，不再按本作列表顺序分配。'}
(root/'research/FT2_SFX_EVIDENCE.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
