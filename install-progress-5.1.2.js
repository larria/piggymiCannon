/* Measure precache streams while preserving native Response metadata. Browser
   SRI withholds the Response until the whole file arrives, so this installer
   verifies the same SHA256 itself BEFORE returning it to Workbox's cache writer.
   Four full-body tasks bound parallel downloads and verification memory. */
(() => {
 const nativeFetch=self.fetch.bind(self),scope=self.registration.scope,files=new Map(),queue=[];
 let installing=false,active=0,lastSent=0,pending;
 const snapshot=()=>({type:'PIGGY_PRECACHE_PROGRESS',files:[...files].map(([url,received])=>({url,received}))});
 const publish=()=>{clearTimeout(pending);const delay=Math.max(0,200-(Date.now()-lastSent));pending=setTimeout(async()=>{lastSent=Date.now();const data=snapshot();try{for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))if(client.url.startsWith(scope))client.postMessage(data);}catch{/* A closed client must not affect the installer. */}},delay);};
 const acquire=()=>active<4?(active++,Promise.resolve()):new Promise(resolve=>queue.push(resolve));
 const release=()=>{const next=queue.shift();if(next)next();else active--;};
 self.addEventListener('install',()=>{installing=true;});
 self.addEventListener('activate',()=>{installing=false;files.clear();clearTimeout(pending);});
 self.addEventListener('message',event=>{if(event.data?.type==='PIGGY_PRECACHE_PROGRESS_QUERY'&&event.source?.url?.startsWith(scope))event.source.postMessage(snapshot());});
 self.fetch=async(input,options)=>{
  const request=new Request(input,options),url=new URL(request.url);
  if(!installing||request.method!=='GET'||!url.href.startsWith(scope)||request.headers.has('range'))return nativeFetch(input,options);
  const integrity=request.integrity.match(/^sha256-([A-Za-z0-9+/]{43}=)$/);
  // Unsupported integrity syntax keeps the browser's original verification.
  const observed=integrity?new Request(request,{integrity:''}):request;
  await acquire();let reader;
  try{
   const response=await nativeFetch(observed);if(!response.ok)return response;
   reader=response.clone().body?.getReader();files.set(request.url,0);publish();let received=0;const parts=[];
   while(reader){const part=await reader.read();if(part.done)break;received+=part.value.byteLength;if(integrity)parts.push(part.value);files.set(request.url,received);publish();}
   if(integrity){const bytes=new Uint8Array(received);let at=0;for(const part of parts){bytes.set(part,at);at+=part.byteLength;}parts.length=0;
    const hash=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))));if(hash!==integrity[1])throw new TypeError('Precache integrity mismatch');
   }
   return response;
  }finally{reader?.releaseLock();release();publish();}
 };
})();
