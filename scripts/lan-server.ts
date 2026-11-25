import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {createReadStream,existsSync,readFileSync,statSync} from 'node:fs';
import {networkInterfaces} from 'node:os';
import {extname,resolve,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {WebSocketServer,WebSocket} from 'ws';
import QRCode from 'qrcode';
import {LanAuthority,makeNonce} from './lan-room';
import {LAN_PROTOCOL,lanEncode,type LanMessage} from '../src/lan-protocol';

const root=resolve(process.env.PIGGY_LAN_DIST||'dist');
const port=Number(process.env.PIGGY_LAN_PORT||4178);
if(!existsSync(resolve(root,'index.html')))throw Error('找不到游戏产物，请先执行 npm run build。');
const version=JSON.parse(readFileSync(resolve(root,'version.json'),'utf8')).version as string;
const base=readFileSync(resolve(root,'index.html'),'utf8').includes('/piggymiCannon/assets/')?'/piggymiCannon/':'/';
const network=Object.entries(networkInterfaces());
const ips=network.flatMap(([,list])=>(list??[]).filter(a=>a.family==='IPv4'&&!a.internal).map(a=>a.address));
const preferred=network.filter(([name])=>/^(en|eth|wl)/.test(name)).flatMap(([,list])=>(list??[]).filter(a=>a.family==='IPv4'&&!a.internal).map(a=>a.address));
const lanIP=process.env.PIGGY_LAN_IP||[...preferred,...ips].find(ip=>/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip))||'127.0.0.1';
const interfaceHosts=new Set(['localhost','127.0.0.1',...ips,lanIP].map(ip=>ip+':'+port));
const hostKey=makeNonce(24),authority=new LanAuthority(version,hostKey,'http://'+lanIP+':'+port+base);
const api=base+'lan/';
const page=readFileSync(resolve(root,'index.html'),'utf8').replace('<html lang=','<html data-lan-server lang=');
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.ttf':'font/ttf','.woff2':'font/woff2','.ico':'image/x-icon'};
const send=(res:ServerResponse,status:number,body:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(lanEncode(body));};
let qr:{url:string;svg:string}|null=null;
const mimeSafety={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const server=createServer(async(req,res)=>{
 for(const [name,value] of Object.entries(mimeSafety))res.setHeader(name,value);
 if(!interfaceHosts.has(req.headers.host??'')||!['GET','HEAD'].includes(req.method??'')){res.writeHead(403).end();return;}
 let url:URL,pathname:string;
 try{url=new URL(req.url??'/','http://'+req.headers.host);pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
 if(pathname===api+'info.json'){send(res,200,{protocol:LAN_PROTOCOL,version,canHost:!!req.socket.remoteAddress&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)});return;}
 if(pathname===api+'invite.svg'){
  const invite=authority.invite;
  if(!invite||url.searchParams.get('room')!==authority.room?.code){res.writeHead(404).end();return;}
  try{
   if(qr?.url!==invite){
    const svg=await QRCode.toString(invite,{type:'svg',width:246,margin:4,errorCorrectionLevel:'H',color:{dark:'#292b31',light:'#ffffff'}});
    qr={url:invite,svg};
   }
   res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store'}).end(qr.svg);
  }catch{res.writeHead(500).end();}
  return;
 }
 if(pathname===api+'snapshot'||pathname===api+'replay'){
  try{
   const doc=authority.document(req.headers.authorization?.slice(7)??'',pathname.endsWith('replay')?'replay':'snapshot');
   send(res,doc?200:404,doc??{message:'该对局已经结束或录像不可用。'});
  }catch(error){send(res,409,{message:error instanceof Error?error.message:'无法读取本局资料。'});}
  return;
 }
 // These endpoints are online-only. A service worker on the static edition must
 // never intercept them or delay the LAN boot while downloading the offline pack.
 if(pathname.startsWith(api)||pathname===base+'sw.js'){res.writeHead(404).end();return;}
 if(pathname==='/'&&base!=='/'){res.writeHead(302,{Location:base}).end();return;}
 if(!pathname.startsWith(base)){res.writeHead(404).end();return;}
 const relative=pathname.slice(base.length)||'index.html',file=resolve(root,relative);
 if(relative==='index.html'){res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:page);return;}
 if(!file.startsWith(root+sep)||relative.includes('\\')||relative.split('/').some(p=>p.startsWith('.'))||!types[extname(file)]){res.writeHead(404).end();return;}
 let size:number;try{const stat=statSync(file);if(!stat.isFile())throw Error();size=stat.size;}catch{res.writeHead(404).end();return;}
 let start=0,end=size-1,status=200;
 const headers:Record<string,string|number>={'Content-Type':types[extname(file)],'Accept-Ranges':'bytes','Cache-Control':relative.startsWith('assets/')?'public, max-age=31536000, immutable':'no-cache'};
 if(req.headers.range){
  const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if(range&&range[1]){start=Number(range[1]);if(range[2])end=Math.min(end,Number(range[2]));}
  else if(range?.[2])start=Math.max(0,size-Number(range[2]));
  else start=size;
  if(start>=size||end<start){res.writeHead(416,{'Content-Range':'bytes */'+size}).end();return;}
  headers['Content-Range']=`bytes ${start}-${end}/${size}`;status=206;
 }
 res.writeHead(status,{...headers,'Content-Length':end-start+1});
 if(req.method==='HEAD'||!size){res.end();return;}
 const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
});

const sockets=new WebSocketServer({noServer:true,maxPayload:12_000,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
 const host=req.headers.host??'';
 if(req.url!==api+'socket'||!interfaceHosts.has(host)||req.headers.origin!=='http://'+host||sockets.clients.size>=12){socket.destroy();return;}
 sockets.handleUpgrade(req,socket,head,ws=>sockets.emit('connection',ws,req));
});
sockets.on('connection',(ws:WebSocket,req:IncomingMessage)=>{
 let alive=true;
 const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'');
 const conn={
  send:(message:LanMessage)=>{
   if(ws.readyState!==WebSocket.OPEN)return;
   if(ws.bufferedAmount>2_000_000){ws.terminate();return;}
   ws.send(lanEncode(message));
   if(message.type==='error'&&message.fatal)ws.close(1008);
  },
  close:()=>ws.close(1000),
 };
 const ping=setInterval(()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();},4000);
 ws.on('pong',()=>alive=true);
 ws.on('message',(bytes,isBinary)=>{
  if(isBinary)return;
  try{
   const raw=JSON.parse(bytes.toString());
   if(!local&&raw?.type==='hello')delete raw.host;
   authority.handle(conn,raw);
  }catch{/* Ignore malformed client input. */}
 });
 ws.on('error',()=>ws.terminate());
 ws.on('close',()=>{clearInterval(ping);authority.disconnect(conn);});
});
let last=performance.now(),acc=0;
const tick=setInterval(()=>{
 const now=performance.now();acc+=Math.min(100,now-last);last=now;
 while(acc>=1000/60){authority.step();acc-=1000/60;}
},8);
server.once('error',(error:NodeJS.ErrnoException)=>{
 console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用。可用 PIGGY_LAN_PORT=4188 npm run lan:serve 更换端口。`:error.message);
 clearInterval(tick);process.exitCode=1;
});
server.listen(port,'0.0.0.0',()=>{
 const url=`http://127.0.0.1:${port}${base}#host=${hostKey}`;
 console.log(`咪猪头的疯狂坦克 v${version} · 局域网房主\n${url}\n请在房主电脑打开上面的链接，再进入「开始对局 → 局域网」。\n按 Ctrl+C 关闭服务。`);
 if(lanIP==='127.0.0.1')console.log('没有检测到可邀请其他设备的 IPv4 地址。请连接 Wi-Fi 或用 PIGGY_LAN_IP 指定局域网地址。');
 if(process.argv.includes('--open')&&process.platform==='darwin')spawn('open',[url],{stdio:'ignore'}).on('error',()=>{});
});
process.once('SIGINT',()=>{clearInterval(tick);for(const ws of sockets.clients)ws.terminate();sockets.close();server.close();});
