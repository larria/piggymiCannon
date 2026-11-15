"""Archive original CharacterDamage IL and attribute parameters, never replica code."""
from pathlib import Path
import argparse,json,hashlib
import dnfile
from dncil.cil.body import CilMethodBody
from dncil.cil.body.reader import CilMethodBodyReaderBytes
from dncil.clr.token import Token,StringToken
p=argparse.ArgumentParser();p.add_argument('--client',type=Path,default=Path.home()/'Downloads/ft2逆向');a=p.parse_args();root=Path(__file__).resolve().parents[1];assembly=a.client/'extracted/assets/Dlls/MyScripts.dll.bytes';character=a.client/'resources/config/decrypted/Character.txt';language=a.client/'resources/config/decrypted/Language.txt';pe=dnfile.dnPE(str(assembly));owners={};method=None
for td in pe.net.mdtables.TypeDef:
 owner=str(td.TypeNamespace)+'.'+str(td.TypeName)
 for field in td.FieldList:owners[id(field.row)]=owner
 for member in td.MethodList:
  owners[id(member.row)]=owner
  if str(td.TypeName)=='CBullet' and str(member.row.Name)=='CharacterDamage':method=member.row
assert method is not None
body=CilMethodBody(CilMethodBodyReaderBytes(pe.get_data(method.Rva,20000)));lines=[]
for i in body.instructions:
 op=i.operand
 if isinstance(op,StringToken):op=pe.net.user_strings.get(op.rid).value
 elif isinstance(op,Token):row=pe.net.mdtables.tables[op.table].rows[op.rid-1];op=owners.get(id(row),'')+'.'+str(getattr(row,'Name',getattr(row,'TypeName','?')))
 lines.append(f'{i.offset:04x} {i.opcode} {op if op is not None else ""}')
characters=json.loads(character.read_text())
result={'formatVersion':1,'sources':[{'file':str(f.relative_to(a.client)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in [assembly,character,language]],'method':'LuaFramework.Logic.CBullet.CharacterDamage','rva':hex(method.Rva),'methodBytesSha256':hashlib.sha256(body.raw_bytes).hexdigest(),'instructions':lines,'characters':[{'row':n,**{k:c[k] for k in ['Character','A1','A2','Defence']}} for n,c in enumerate(characters,1)],'scope':'Attribute bits in this extracted client. Not a direct five-era damage table; current game normalises RED qualitative dominance separately. No low-bit resistance or Defence imported.'}
(root/'research/ERA_DAMAGE_EVIDENCE.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result['rva'],len(characters))
