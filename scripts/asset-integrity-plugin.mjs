import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';import {createHash} from 'node:crypto';
export function assetIntegrityPlugin(version){return {name:'asset-integrity-manifest',writeBundle(options){
 const root=resolve(options.dir??'dist');const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):[resolve(dir,e.name)]);
 const files=walk(root).filter(p=>/\.(js|css|html|png|webp|svg|mp3|ttf|webmanifest)$/.test(p)||p.endsWith('/release-notes.json')).map(path=>{
  const url=relative(root,path).replaceAll('\\','/'),data=readFileSync(path);
  return {url,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),revision:url.startsWith('assets/')?null:createHash('md5').update(data).digest('hex')};
 }).sort((a,b)=>a.url.localeCompare(b.url));
 writeFileSync(resolve(root,'asset-integrity.json'),JSON.stringify({formatVersion:1,gameVersion:version,files}));
}};}
