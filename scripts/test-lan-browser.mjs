import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {join} from 'node:path';
import {chromium,webkit,expect} from '@playwright/test';

const port=await new Promise((resolve,reject)=>{
 const probe=createServer().once('error',reject).listen(0,'127.0.0.1',()=>{const {port}=probe.address();probe.close(()=>resolve(port));});
});
const server=spawn(process.execPath,['--import=tsx','scripts/lan-server.ts'],{env:{...process.env,PIGGY_LAN_PORT:String(port)},stdio:['ignore','pipe','inherit']});
let browser;
try{
 const url=await new Promise((resolve,reject)=>{
  let output='';const timeout=setTimeout(()=>reject(Error('局域网测试服务未启动')),10_000);
  server.once('error',e=>{clearTimeout(timeout);reject(e);});server.once('exit',()=>{clearTimeout(timeout);reject(Error('局域网测试服务已退出'));});
  server.stdout.on('data',bytes=>{output+=bytes;const address=output.match(/http:\/\/127\.0\.0\.1:\d+\/[^\n]*#host=[\w-]{32}/)?.[0];if(address){clearTimeout(timeout);resolve(address);}});
 });
 const engine=process.env.PIGGY_TEST_BROWSER==='webkit'?'webkit':'chromium';
 browser=await (engine==='webkit'?webkit:chromium).launch();
 const home=await browser.newContext({viewport:{width:1512,height:982},...(engine==='webkit'?{isMobile:true,hasTouch:true}:{})});
 const visitor=await browser.newContext({viewport:{width:1194,height:834},isMobile:true,hasTouch:true});
 if(engine==='chromium')await home.grantPermissions(['clipboard-read','clipboard-write']);
 await visitor.addInitScript(()=>{
  const Native=window.WebSocket;
  window.WebSocket=class extends Native{constructor(...args){super(...args);window.__lanTestSocket=this;}};
 });
 const host=await home.newPage(),guest=await visitor.newPage(),errors=[];
 const track=page=>page.on('pageerror',e=>errors.push(e.message));
 track(host);track(guest);
 await host.goto(url);
 await host.locator('#start-button').click();
 await host.locator('[data-match-mode=lan]').click();
 await expect(host.locator('#deploy-slots')).toBeDisabled();
 await expect(host.locator('#lan-invite-url')).toBeVisible();
 const sizes=engine==='webkit'?[['ipad',1194,834]]:[['desktop',1512,982],['phone-portrait',390,844],['narrow-phone',320,568],['phone-landscape',844,390]];
 for(const [name,width,height] of sizes){
  await host.setViewportSize({width,height});
  const header=host.locator('.setup-header');
  const row=header.locator('h2,.setup-modes,#close-dialog');await expect(row).toHaveCount(3);
  const points=await row.evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {left:b.left,right:b.right,middle:b.top+b.height/2};}));
  for(const [i,p] of points.entries()){
   expect(Math.abs(p.middle-points[0].middle)).toBeLessThan(2);
   if(i)expect(p.left).toBeGreaterThanOrEqual(points[i-1].right-1);
   expect(p.right).toBeLessThanOrEqual(width);
  }
  if(process.env.PIGGY_LAN_SCREENSHOTS)await host.locator('dialog').screenshot({path:join(process.env.PIGGY_LAN_SCREENSHOTS,name+'.png'),scale:'css'});
 }
 await host.setViewportSize({width:1512,height:982});
 const invite=await host.locator('#lan-invite-url').inputValue();
 await expect(host.locator('.lan-qr-avatar img')).toHaveAttribute('data-crew-portrait','mimi');
 await expect.poll(()=>host.locator('.lan-qr-code').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await host.locator('[data-copy-invite]').click();
 if(engine==='chromium'){
  await expect(host.locator('[data-copy-invite]')).toContainText('已复制');
  expect(await host.evaluate(()=>navigator.clipboard.readText())).toBe(invite);
 }
 await guest.goto(invite);
 await guest.locator('[data-join-room]').click();
 await expect(guest.locator('.lan-room-title')).toContainText('已加入房间');
 await expect(host.locator('[data-seat="1"]')).toContainText('已加入');
 await host.locator('[data-choice=cannon]').click();
 await host.locator('[data-owner="1"]').click();await host.locator('[data-choice=cannon]').click();
 await host.locator('input[name=map][value=coast]').locator('..').click();
 await host.locator('#deploy-slots').click();
 for(const page of [host,guest]){
  await expect(page.locator('body')).toHaveClass(/lan-battle/);
  await expect(page.locator('#map-label')).toContainText('独木桥');
 }
 await expect.poll(async()=>await host.locator('#fire-button').isEnabled()||await guest.locator('#fire-button').isEnabled(),{timeout:13_000}).toBe(true);
 const active=await host.locator('#fire-button').isEnabled()?host:guest;
 await expect((active===host?guest:host).locator('#fire-button')).toBeDisabled();
 const snapshot=()=>guest.evaluate(async()=>{
  const key=Object.keys(sessionStorage).find(k=>k.startsWith('piggy-lan-seat:'));
  return (await fetch(new URL('lan/snapshot',location.href),{headers:{Authorization:'Bearer '+sessionStorage.getItem(key)}})).json();
 });
 const revision=(await snapshot()).current.terrain.revision;
 await active.locator('#weapon-special').click();
 await active.keyboard.down(' ');await active.waitForTimeout(500);await active.keyboard.up(' ');
 for(const page of [host,guest])await expect(page.locator('#turn-text')).toHaveText(/炮弹飞行中|观察战场/);
 await expect.poll(async()=>(await snapshot()).current.terrain.revision,{timeout:15_000}).toBeGreaterThan(revision);
 const impacted=(await snapshot()).current.terrain.revision;
 // Force an actual disconnect; WebKit's offline emulation leaves open sockets intact.
 await guest.evaluate(()=>window.__lanTestSocket.close());
 await expect(host.locator('#lan-link-status')).toContainText('重连',{timeout:5000});
 await guest.reload();
 await expect(guest.locator('body')).toHaveClass(/lan-battle/);
 await expect(host.locator('#lan-link-status')).toBeHidden();
 expect((await snapshot()).current.terrain.revision).toBe(impacted);
 await guest.locator('#log-button').click();
 await guest.getByRole('button',{name:'保存本局录像'}).click();
 await expect.poll(()=>guest.evaluate(()=>JSON.parse(localStorage.getItem('piggy-replays-v1')||'[]').length)).toBe(1);
 expect(errors).toEqual([]);
 console.log(`${engine}: 房间入席、轮流控制、开火挖土、刷新重连、保存录像均通过。`);
}finally{
 await browser?.close();
 server.kill('SIGINT');
}
