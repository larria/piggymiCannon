import {readdirSync,lstatSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),build=resolve(args[0]&&!args[0].startsWith('--')?args.shift():resolve(project,'dist'));
const reportAt=args.indexOf('--report'),reportFile=reportAt>=0?resolve(args[reportAt+1]):null;
const limit=90_000_000; // Strict decimal MB, not the larger 90 MiB allowance.
let allocatedDistBytes=0;
function files(dir){allocatedDistBytes+=lstatSync(dir).blocks*512;return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const path=resolve(dir,e.name),s=lstatSync(path);if(s.isSymbolicLink())throw new Error(`构建中不能包含未计量的链接：${relative(build,path)}`);
 if(s.isFile())allocatedDistBytes+=s.blocks*512;
 return s.isDirectory()?files(path):s.isFile()?[{path,bytes:s.size}]:[];
});}
function precache(source){
 const call=source.indexOf('precacheAndRoute(');if(call<0)throw new Error('未找到PWA预缓存清单');
 const start=source.indexOf('[',call);let depth=0,quote='',escaped=false,end=-1;
 for(let n=start;n<source.length;n++){
  const c=source[n];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';continue;}
  if(c==='"'){quote=c;continue;}if(c==='[')depth++;else if(c===']'&&--depth===0){end=n+1;break;}
 }
 if(end<0)throw new Error('PWA清单格式不完整');
 // Parse only the generated data literal, never execute the worker.
 return JSON.parse(source.slice(start,end).replace(/([{,]\s*)(url|revision)\s*:/g,'$1"$2":'));
}
try{
 const contents=files(build),distBytes=contents.reduce((n,f)=>n+f.bytes,0),byPath=new Map(contents.map(f=>[f.path,f.bytes]));
 const entries=precache(readFileSync(resolve(build,'sw.js'),'utf8')),seen=new Map();let precacheBytes=0,uniquePrecacheBytes=0,duplicateExactEntries=0;
 for(const e of entries){
  if(typeof e.url!=='string'||/^[a-z]+:/i.test(e.url)||e.url.startsWith('//'))throw new Error('预缓存存在无法本地计量的URL');
  const name=decodeURIComponent(e.url.split(/[?#]/)[0]),path=resolve(build,name);
  if(!path.startsWith(build+sep)||!byPath.has(path))throw new Error(`预缓存文件不存在或越界：${e.url}`);
  precacheBytes+=byPath.get(path);
  if(seen.has(e.url)){if(seen.get(e.url)!==e.revision)throw new Error(`预缓存同URL版本冲突：${e.url}`);duplicateExactEntries++;continue;}
  seen.set(e.url,e.revision);uniquePrecacheBytes+=byPath.get(path);
 }
 const forbidden=contents.filter(f=>/(^|\/)(\.workbuddy|ft2-audio|ft2-bullets|ft2-extra)(\/|$)/.test(relative(build,f.path).split(sep).join('/')));
 if(forbidden.length)throw new Error('来源目录或私有目录混入构建产物');
 const version=existsSync(resolve(build,'version.json'))?JSON.parse(readFileSync(resolve(build,'version.json'),'utf8')).version:'fixture';
 const result={formatVersion:1,version,limitBytes:limit,limitUnit:'MB (1,000,000 bytes)',distBytes,allocatedDistBytes,precacheBytes:uniquePrecacheBytes,manifestBytesIncludingDuplicates:precacheBytes,distFiles:contents.length,precacheEntries:entries.length,uniquePrecacheEntries:seen.size,uniquePrecacheBytes,duplicateExactEntries,sourceDirectoriesIncluded:false,passed:distBytes<=limit&&allocatedDistBytes<=limit&&precacheBytes<=limit};
 if(reportFile)writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');
 console.log(`dist ${(distBytes/1e6).toFixed(2)} MB；PWA预缓存 ${(uniquePrecacheBytes/1e6).toFixed(2)} MB（${entries.length}项）；上限90 MB`);
 if(!result.passed)throw new Error('发布产物／PWA预缓存超过90 MB上限');
}catch(error){console.error(error.message);process.exitCode=1;}
