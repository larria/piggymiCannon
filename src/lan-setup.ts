import {crewAvatar,CREW,CREW_ORDER} from './crew';
import {icon} from './icons';
import {lanPath,type LanClient} from './lan-client';
import {parseLanInvite,type LanSeat} from './lan-protocol';

export const modeMarkup=()=>`<div class="setup-modes" role="group" aria-label="对局方式">
 <button type="button" data-match-mode="local" aria-pressed="true">${icon('gamepad')}<span>单机 / 热座</span></button>
 <button type="button" data-match-mode="lan" aria-pressed="false">${icon('link')}<span>局域网</span></button>
 </div>`;

const inviteForm=()=>`<form class="lan-join-form" data-lan-join-form>
 <label for="lan-manual-url">有邀请链接？</label><div class="lan-link"><input id="lan-manual-url" name="invite" type="url" inputmode="url" placeholder="粘贴房主的邀请链接" autocomplete="off" autocapitalize="off" spellcheck="false" required>
 <button class="button button-outline" type="submit">加入房间 ${icon('arrow')}</button></div>
 <p class="lan-form-error" role="alert" hidden></p></form>`;

export function qrBadge(base:string,code:string){
 const src=lanPath('invite.svg');src.searchParams.set('room',code);
 return `<div class="lan-qr" aria-label="邀请二维码"><img class="lan-qr-code" src="${src.pathname+src.search}" alt="扫描二维码加入本局对战" width="246" height="246"><span class="lan-qr-avatar" aria-hidden="true">${crewAvatar('mimi',base)}</span></div>`;
}

const roster=(base:string,lan:LanClient,seats:LanSeat[])=>`<ul class="lan-seats" aria-label="房间席位">${CREW_ORDER.map((id,i)=>{
 const seat=seats.find(s=>s.slot===i),name=CREW[id].name;
 const status=seat?(seat.online?(i===lan.slot?'本机':i===0?'房主':'已加入'):'重连中'):'等候加入';
 return `<li data-seat="${i}" data-online="${seat?.online??false}">${crewAvatar(id,base)}<span><strong>${name}</strong><small>${status}</small></span></li>`;
 }).join('')}</ul>`;

export function renderLanSetup(panel:HTMLElement,base:string,lan:LanClient|null,options:{host:boolean;guest:boolean;join:()=>void;copy:()=>void;reopen:()=>void;leave:()=>void}){
 const room=lan?.room;
 if(room){
  const existing=panel.querySelector<HTMLElement>('[data-room-code]');
  if(existing?.dataset.roomCode===room.code){
   const seats=panel.querySelector('.lan-room-roster')!;
   const markup=roster(base,lan!,room.seats);
   if(seats.getAttribute('data-status')!==JSON.stringify(room.seats)){seats.innerHTML=markup;seats.setAttribute('data-status',JSON.stringify(room.seats));}
   const p=panel.querySelector('.lan-room-detail')!;
   const note=roomDetail(lan!);if(p.textContent!==note)p.textContent=note;
   return;
  }
  panel.innerHTML=`<div class="lan-room-grid ${options.host?'with-invite':''}" data-room-code="${room.code}">
   <div class="lan-room-copy"><div class="lan-room-title"><span class="lan-room-symbol">${icon('link')}</span><h3>${options.host?'邀请朋友':'已加入房间'}</h3>${options.host?'<button type="button" class="text-button lan-leave" data-leave-room>关闭房间</button>':''}</div>
   <p class="lan-room-detail" role="status"></p>
   <div class="lan-room-roster" data-status=""></div>
   ${options.host?`<div class="lan-link"><input id="lan-invite-url" readonly aria-label="房间邀请链接" spellcheck="false"><button type="button" class="button button-outline" data-copy-invite>${icon('copy')}<span>复制链接</span></button></div>`:`<button type="button" class="text-button lan-leave" data-leave-room>离开房间</button>`}
   </div>${options.host?qrBadge(base,room.code):''}</div>`;
  panel.querySelector<HTMLInputElement>('#lan-invite-url')?.setAttribute('value',lan!.invite??'');
  panel.querySelector('[data-copy-invite]')?.addEventListener('click',options.copy);
  panel.querySelector('[data-leave-room]')?.addEventListener('click',options.leave);
  renderLanSetup(panel,base,lan,options);return;
 }
 if(options.guest){
  const connecting=lan?.status==='connecting'||lan?.status==='reconnecting';
  panel.innerHTML=`<div class="lan-room-grid"><div><div class="lan-room-title"><span class="lan-room-symbol">${icon('link')}</span><h3>加入好友的战场</h3></div>
   <p class="lan-room-detail" role="status"></p>
   <button type="button" class="button button-dark" data-join-room ${connecting?'disabled':''}>${connecting?'正在连接…':'加入房间'} ${icon('arrow')}</button>
   </div></div>`;
  panel.querySelector('.lan-room-detail')!.textContent=lan?.error||(connecting?'正在联系房主，请保持在同一个 Wi‑Fi。':'加入后会分配一个炮手席位，等房主开始对局。');
  panel.querySelector('[data-join-room]')!.addEventListener('click',options.join);return;
 }
 if(options.host){
  const connecting=lan?.status==='connecting'||lan?.status==='reconnecting';
  panel.innerHTML=`<div class="lan-room-grid"><div><div class="lan-room-title"><span class="lan-room-symbol">${icon('link')}</span><h3>开启局域网房间</h3></div><p class="lan-room-detail" role="status"></p>${connecting?'':'<button type="button" class="button button-outline" data-reopen-room>创建房间</button>'}</div></div>`;
  panel.querySelector('.lan-room-detail')!.textContent=lan?.error||(connecting?'正在连接本机房主服务…':'房间创建后，即可邀请同一 Wi‑Fi 下的朋友。');
  panel.querySelector('[data-reopen-room]')?.addEventListener('click',options.reopen);return;
 }
 if(panel.querySelector('[data-lan-join-form]'))return;
 panel.innerHTML=`<div class="lan-room-grid"><div><div class="lan-room-title"><span class="lan-room-symbol">${icon('link')}</span><h3>同一 Wi‑Fi，一起开炮</h3></div>
 <p class="lan-room-detail">房主在电脑上启动局域网服务。其他设备扫描房主的二维码，或直接打开邀请链接。</p>
 <div class="lan-room-help">在游戏目录运行 <code>npm run lan</code>，然后打开终端显示的房主链接。</div>
 ${inviteForm()}</div></div>`;
 panel.querySelector<HTMLFormElement>('[data-lan-join-form]')!.addEventListener('submit',event=>{
  event.preventDefault();const field=panel.querySelector<HTMLInputElement>('#lan-manual-url')!,error=panel.querySelector<HTMLElement>('.lan-form-error')!,url=parseLanInvite(field.value);
  if(!url){error.textContent='请粘贴房主提供的完整局域网邀请链接。';error.hidden=false;field.focus();return;}
  location.assign(url.href);
 });
}
function roomDetail(lan:LanClient){
 const room=lan.room!;
 return lan.error||(lan.status!=='ready'?'连接中断，正在重新连接。':room.notice||(lan.slot===0?'请朋友扫码或打开链接。至少一位朋友加入后即可开战。':`你是${CREW[CREW_ORDER[lan.slot]].name}。正在等房主选择战场并开始对局。`));
}
export async function copyInvite(input:HTMLInputElement){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(input.value);return true;}catch{/* Try document copy inside the existing dialog. */}}
 input.focus();input.select();input.setSelectionRange(0,input.value.length);
 try{return document.execCommand('copy');}catch{return false;}
}
