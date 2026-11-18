"""Read primary client IL, preserving the evidence for ground-only satellite strikes."""
import argparse, hashlib, json
from pathlib import Path
import dnfile
from dncil.cil.body import CilMethodBody
from dncil.cil.body.reader import CilMethodBodyReaderBytes
from dncil.clr.token import Token, StringToken

p = argparse.ArgumentParser()
p.add_argument('--client', type=Path, default=Path.home() / 'Downloads/ft2')
a = p.parse_args()
assembly = a.client / 'extracted/assets/Dlls/MyScripts.dll.bytes'
pe = dnfile.dnPE(str(assembly))
owners, methods = {}, {}
for td in pe.net.mdtables.TypeDef:
    owner = str(td.TypeNamespace) + '.' + str(td.TypeName)
    for f in td.FieldList:
        owners[id(f.row)] = owner
    for m in td.MethodList:
        owners[id(m.row)] = owner
        if str(td.TypeName) == 'CIonCannon' and str(m.row.Name) in ['ProcessElement', 'CheckDamage', 'CheckShield'] or str(td.TypeName) == 'CMap' and str(m.row.Name) == 'GetHeightX3':
            methods[owner + '.' + str(m.row.Name)] = m.row

def resolve(token):
    if isinstance(token, StringToken):
        return pe.net.user_strings.get(token.rid).value
    if isinstance(token, Token):
        row = pe.net.mdtables.tables[token.table].rows[token.rid - 1]
        return owners.get(id(row), '') + '.' + str(getattr(row, 'Name', getattr(row, 'TypeName', '?')))
    return token if token is not None else ''

rows = []
for name, method in methods.items():
    body = CilMethodBody(CilMethodBodyReaderBytes(pe.get_data(method.Rva, 60000)))
    rows.append({'method': name, 'rva': hex(method.Rva), 'sha256': hashlib.sha256(body.raw_bytes).hexdigest(), 'instructions': [f'{i.offset:04x} {i.opcode} {resolve(i.operand)}' for i in body.instructions]})
result = {'source': '本机 ft2 目录/原版分析', 'assemblySHA256': hashlib.sha256(assembly.read_bytes()).hexdigest(), 'methods': rows, 'scope': 'This client positions the satellite at terrain GetHeightX3 before CheckDamage and Bombing(A2Round). No replica rules used.'}
target = Path(__file__).resolve().parents[1] / 'research/FT2_ION_GROUND_EVIDENCE.json'
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'file': str(target), 'methods': [r['method'] for r in rows]}, ensure_ascii=False))
