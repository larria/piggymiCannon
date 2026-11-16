"""Archive original movement sound IL. Does not read replica code."""
from pathlib import Path
import json,hashlib
import dnfile
from dncil.cil.body import CilMethodBody
from dncil.cil.body.reader import CilMethodBodyReaderBytes
from dncil.clr.token import Token,StringToken
root=Path(__file__).resolve().parents[1];assembly=Path.home()/'Downloads/ft2逆向/extracted/assets/Dlls/MyScripts.dll.bytes'
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
for name in ['LuaFramework.SoundManager.InitSound','LuaFramework.Logic.CCharacter.ChangeAction']:
 m=methods[name];b=CilMethodBody(CilMethodBodyReaderBytes(pe.get_data(m.Rva,20000)))
 out.append({'method':name,'rva':hex(m.Rva),'methodSHA256':hashlib.sha256(b.raw_bytes).hexdigest(),'instructions':[f'{i.offset:04x} {i.opcode} {resolve(i.operand) if i.operand is not None else ""}' for i in b.instructions]})
evidence={'formatVersion':1,'source':'原客户端MyScripts.dll.bytes；不使用复刻web规则','assemblySHA256':hashlib.sha256(assembly.read_bytes()).hexdigest(),'methods':out,'conclusion':'ChangeAction(8)循环播放Character×100，对应moveN；ChangeAction(9)播放Character×100+1，对应UnmoveN，并停止moveN。Friend编号12/Enemy编号13只确认注册；本作道具无声以用户要求为依据。','gameChoice':'本作普通松手只停moveN；移动力耗尽时才采用UnmoveN。用户要求道具无声，改为提示动画；13组载具的分配保持本作现有顺序，未宣称所有历史原版客户端编号相同。'}
(root/'research/FT2_SFX_EVIDENCE.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
