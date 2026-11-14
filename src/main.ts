import './style.css';
import { Game, WORLD_W, WORLD_H, clamp, type Config } from './engine';
import { Renderer } from './renderer';
import { AudioManager } from './audio';
import { DIFFICULTIES, ITEMS, MAPS, WEAPONS, weaponById, type ItemId, type WeaponId } from './catalog';
import { icon } from './icons';
import { chargePower, dragAim } from './interaction';
import { registerSW } from 'virtual:pwa-register';

const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const safeRead=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const save=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private browsing can disable storage. */}};
const saved=safeRead('piggy-settings');
let config:Config={mode:'ai',difficulty:'normal',map:'valley',timer:45,seed:Date.now(),...(saved?.config||{})};
if(!MAPS.some(m=>m.id===config.map)) config.map='valley';
if(!DIFFICULTIES.some(d=>d.id===config.difficulty)) config.difficulty='normal';
if(!['ai','hotseat'].includes(config.mode)) config.mode='ai';
if(![0,30,45,60].includes(config.timer)) config.timer=45;
let game=new Game(config);
const audio=new AudioManager();
audio.setEnabled(Boolean(saved?.sound));audio.setVolume(clamp(Number(saved?.volume)||0.35,0,1));
let stats:{games:number;wins:number;damage:number;shots:number}=safeRead('piggy-stats')||{games:0,wins:0,damage:0,shots:0};
let activeTab:'weapons'|'items'='weapons';
let dialogPaused=false;
let statsRecorded=false;
let toastTimer=0;
let moveHeld=0;
let charge:null|{pointer:number|null;startedAt:number;startX:number;startY:number;angle:number;previousPower:number;tank:number}=null;
let aimPointer:number|null=null;
let immersive=false;
let drawerOpen=false;
let pendingUpdate=false;
let installPrompt:(Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>})|null=null;
const keys=new Set<string>();

function avatar(pink=true) {
  const c=pink?'#d48b74':'#849574',d=pink?'#a86552':'#53694c';
  return `<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="29" fill="${pink?'#f5e0d5':'#e5e9db'}"/><path d="m16 24-5-13 14 8m19 5 5-13-14 8" fill="#e6a691"/><ellipse cx="30" cy="34" rx="19" ry="17" fill="#eeb69e"/><path d="M10 25a20 18 0 0 1 40 0" fill="${d}"/><rect x="9" y="23" width="42" height="6" rx="3" fill="${c}"/><circle cx="30" cy="15" r="2.5" fill="#f4d7a1"/><circle cx="22" cy="34" r="2" fill="#414b3d"/><circle cx="38" cy="34" r="2" fill="#414b3d"/><ellipse cx="30" cy="42" rx="9" ry="6" fill="#e59d87"/><ellipse cx="27" cy="42" rx="1.4" ry="2" fill="#b57564"/><ellipse cx="33" cy="42" rx="1.4" ry="2" fill="#b57564"/></svg>`;
}

$('#app').innerHTML=`
  <header class="site-header">
    <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="咪猪头的疯狂坦克首页"><span class="brand-mark"><img src="${import.meta.env.BASE_URL}icons/icon-192.png" alt=""/></span><span class="brand-type">咪猪头的疯狂坦克<small>MIMI’S CRAZY TANKS</small></span></a>
    <nav class="top-nav" aria-label="主导航"><button class="nav-link active">演习场<span></span></button><button class="nav-link" data-dialog="guide">作战指南</button><button class="nav-link" data-dialog="stats">我的战绩</button></nav>
    <div class="header-tools"><button id="install-button" class="button button-outline install-button hidden">安装游戏</button><span class="local-badge"><span class="status-dot"></span>本地作战 · 无需联网</span><button id="sound-button" class="icon-button" aria-label="开启声音" title="开启声音">${icon('mute')}</button><button class="icon-button" data-dialog="settings" aria-label="游戏设置" title="游戏设置">${icon('settings')}</button></div>
  </header>
  <main class="main-shell">
    <div class="page-heading"><div><div class="eyebrow"><span class="tiny-line"></span> 小小炮手，大大冒险</div><h1>风起，<span>开火。</span><span class="title-dot"></span></h1></div><div class="heading-actions"><div class="match-config"><span id="mode-label">单人演习</span><span class="config-divider"></span><span id="difficulty-label">老兵 AI</span></div><button id="new-game" class="button button-outline">${icon('refresh')}新对局</button></div></div>
    <div class="game-layout">
      <section class="combat-column" aria-label="战场与操控">
        <div class="battle-card">
          <div class="scoreboard">
            <div class="player-hud pink"><span class="avatar">${avatar()}</span><div class="player-info"><div class="player-name">咪猪头 <span class="player-role" id="role-0">你</span></div><div class="health-line"><div class="health-track"><span id="hp-bar-0"></span></div><span class="hp-value" id="hp-0">150 <small>/ 150</small></span></div><div class="status-line" id="status-0">状态良好</div></div></div>
            <div class="versus"><span>VS</span><small>友谊第一，准头第二</small></div>
            <div class="player-hud green"><div class="player-info"><div class="player-name"><span class="player-role" id="role-1">老兵 AI</span> <span id="name-1">大猪头爸爸</span></div><div class="health-line"><span class="hp-value" id="hp-1">150 <small>/ 150</small></span><div class="health-track"><span id="hp-bar-1"></span></div></div><div class="status-line" id="status-1">状态良好</div></div><span class="avatar">${avatar(false)}</span></div>
          </div>
          <div class="battle-stage">
            <canvas id="battlefield" width="1280" height="600" aria-label="可破坏的炮术战场；使用下方面板或键盘调整角度、力度和移动。空袭与传送可点击战场选择位置。"></canvas>
            <div class="stage-top"><span class="map-chip">${icon('mountain')}<span id="map-label">青苔山谷</span><span class="map-code" id="map-code">01</span></span><div class="wind-chip">${icon('wind')}<span id="wind-label">微风待命</span></div><button id="inventory-toggle" class="stage-button stage-extra inventory-toggle" aria-label="展开军火库" aria-expanded="false">${icon('shell')}<span>军火库</span></button><button id="fullscreen-button" class="stage-button stage-extra" title="全屏作战" aria-label="全屏作战">${icon('fullscreen')}</button><button id="layout-button" class="stage-button stage-extra" title="切换标准布局" aria-label="切换标准布局">${icon('shrink')}</button><button id="pause-button" class="stage-button" title="暂停 · Esc" aria-label="暂停游戏">${icon('pause')}</button></div>
            <div id="turn-indicator" class="turn-indicator hidden"><span class="status-dot"></span><span id="turn-text">轮到你了</span><span class="turn-divider"></span><span id="round-text">第 01 回合</span></div>
            <div id="timer" class="timer hidden">${icon('clock')}<span>45</span><small>s</small></div>
            <div id="lobby-overlay" class="lobby-overlay"><div class="lobby-tag">FIELD NOTES / 01</div><h2>好风景。<br>也要好准头。</h2><p>调整角度，借一阵风。<br>让下一发，刚好落在对手身旁。</p><button id="start-button" class="button button-dark">进入战场 ${icon('arrow')}</button><span class="lobby-hint">单人挑战 AI / 双人热座对决</span></div>
            <div id="game-overlay" class="game-overlay hidden"></div>
            <div class="stage-bottom"><span id="field-note">丘陵地形 · 可破坏环境</span><span>${icon('sun')}<span id="gravity-note">重力 1.0 g</span></span></div>
          </div>
          <div class="battle-caption"><div class="caption-main"><span class="caption-dot"></span><span id="battle-message">山谷已就位。准备好，就开一局。</span></div><button id="log-button" aria-label="查看战斗记录">战斗记录 ${icon('chevron')}</button></div>
        </div>
        <section class="control-deck" aria-label="射击控制">
          <div class="control-section angle-section"><div class="control-label">${icon('angle')}<label for="angle">射击角度</label><span class="readout"><span id="angle-value">48</span><small>°</small></span></div><div class="slider-row"><button class="step-button" data-adjust="angle:-1" aria-label="减小角度">−</button><input id="angle" type="range" min="5" max="175" value="48" aria-label="射击角度"/><button class="step-button" data-adjust="angle:1" aria-label="增大角度">＋</button></div><button id="aim-pad" class="aim-pad" aria-label="长按拖动瞄准，上下调整角度，左右改变朝向">${icon('target')}<span>拖动瞄准</span>${icon('transfer')}</button><div class="control-foot"><span>低弹道</span><button id="face-button" title="切换炮口朝向">${icon('transfer')}<span>朝右</span></button><span>高弹道</span></div></div>
          <div class="control-section power-section"><div class="control-label">${icon('bolt')}<label for="power">发射力度</label><span class="readout"><span id="power-value">68</span><small>%</small></span></div><div class="slider-row"><button class="step-button" data-adjust="power:-1" aria-label="减小力度">−</button><input id="power" type="range" min="10" max="100" value="68" aria-label="发射力度"/><button class="step-button" data-adjust="power:1" aria-label="增大力度">＋</button></div><div class="power-gauge"><div><span id="charge-fill"></span><i class="power-mark m1"></i><i class="power-mark m2"></i><i class="power-mark m3"></i></div><span>按住发射键，蓄力到你想要的力度</span></div><div class="control-foot"><span>轻轻一发</span><span>全力出击</span></div></div>
          <div class="control-section move-section"><div class="control-label">${icon('fuel')}<span>战术移动</span><span class="fuel-readout"><span id="fuel-value">100</span><small>燃料</small></span></div><div class="move-buttons"><button id="move-left" aria-label="后退，长按持续移动">${icon('left')}<span>后退</span><kbd>A</kbd></button><button id="move-right" aria-label="前进，长按持续移动"><kbd>D</kbd><span>前进</span>${icon('right')}</button></div><div class="control-foot"><span id="move-note">长按移动 · 每回合补充 18</span></div></div>
          <div class="fire-section"><button id="fire-button" class="fire-button" disabled aria-label="按住蓄力，拖动调整角度，松手发射">${icon('target')}<span id="fire-title">按住蓄力</span><small id="fire-subtitle">松手发射 / SPACE</small></button><span id="fire-note">先进入战场</span></div>
        </section>
        <div class="keyboard-hints"><span><kbd>A</kbd><kbd>D</kbd> 移动</span><span><kbd>W</kbd><kbd>S</kbd> 角度</span><span><kbd>SPACE</kbd> 蓄力 · 松开发射</span><span class="touch-help">拖动战场瞄准 · 按住蓄力 · 松手开火</span><span class="hint-last">每一发，都有一点可能。</span></div>
      </section>
      <button id="inventory-backdrop" class="inventory-backdrop" aria-label="关闭军火库" tabindex="-1"></button><aside class="arsenal" aria-label="武器和道具"><div class="arsenal-heading"><div><span class="eyebrow">有备而来</span><h2>你的军火库<span> / 12</span></h2></div><span class="arsenal-symbol">${icon('shell')}</span><button id="arsenal-close" class="icon-button arsenal-close" aria-label="关闭军火库">${icon('close')}</button></div><div class="arsenal-tabs" role="tablist" aria-label="军火库类别"><button id="weapons-tab" class="selected" role="tab" aria-selected="true">武器 <span>12</span></button><button id="items-tab" role="tab" aria-selected="false">道具 <span>6</span></button></div><div class="inventory-grid" id="inventory-grid" role="tabpanel" aria-label="武器清单"></div><div id="weapon-detail" class="weapon-detail"></div><div class="arsenal-bottom"><div class="supply-icon">${icon('plus')}</div><div><strong>路上有惊喜</strong><p>每 5 回合空投补给，移动可拾取</p></div></div></aside>
    </div>
    <footer class="page-footer"><span>手边的快乐，远方的炮火。</span><span>MIMI’S CRAZY TANKS <span class="footer-star">✳</span> MADE FOR A GOOD SHOT</span></footer>
  </main>
  <div id="toast" class="toast" role="status"></div>
  <div id="pwa-update" class="pwa-update hidden"><span>新版本已就绪</span><button id="apply-update">更新游戏</button></div>
  <dialog id="dialog"><div class="dialog-shell"><button id="close-dialog" class="dialog-close icon-button" aria-label="关闭">${icon('close')}</button><div id="dialog-content"></div></div></dialog>
`;
const renderer=new Renderer($('#battlefield'),game);

function persistSettings() {save('piggy-settings',{config,sound:audio.enabled,volume:audio.volume});}
function updateSound() {const b=$('#sound-button');b.innerHTML=icon(audio.enabled?'sound':'mute');b.setAttribute('aria-label',audio.enabled?'关闭声音':'开启声音');b.title=audio.enabled?'关闭声音':'开启声音';}
function toast(message:string) {const el=$('#toast');el.textContent=message;el.classList.add('visible');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el.classList.remove('visible'),2700);}
function renderInventory() {
  const tank=game.active;
  $('#inventory-grid').innerHTML=activeTab==='weapons'?WEAPONS.map(w=>`<button class="inventory-tile ${game.selected===w.id?'selected':''} ${tank.ammo[w.id]<=0?'depleted':''}" data-weapon="${w.id}" title="${w.name}：${w.description}" aria-label="${w.name}，${Number.isFinite(tank.ammo[w.id])?tank.ammo[w.id]+' 发':'无限弹药'}" aria-pressed="${game.selected===w.id}"><span class="weapon-icon" style="--weapon-color:${w.color}">${icon(w.icon)}</span><span class="tile-name">${w.name}</span><span class="ammo-count">${Number.isFinite(tank.ammo[w.id])?tank.ammo[w.id]:'∞'}</span>${game.selected===w.id?`<span class="selection-tick">${icon('check')}</span>`:''}</button>`).join(''):
    ITEMS.map(i=>`<button class="inventory-tile item-tile ${tank.items[i.id]<=0?'depleted':''} ${tank.itemUsed?'used':''} ${i.id==='teleport'&&game.teleporting?'selected':''}" data-item="${i.id}" title="${i.name}：${i.description}" aria-label="使用${i.name}，剩余 ${tank.items[i.id]} 件"><span class="weapon-icon" style="--weapon-color:#85927a">${icon(i.icon)}</span><span class="tile-name">${i.name}</span><span class="ammo-count">${tank.items[i.id]}</span><span class="item-hint">${i.id==='repair'?'+35 生命':i.id==='shield'?'+40 护盾':i.id==='fuel'?'+55 燃料':i.id==='boost'?'+50% 伤害':i.id==='teleport'?'点击战场':'本回合无风'}</span></button>`).join('');
  $('#inventory-grid').classList.toggle('items-grid',activeTab==='items');
  $('#inventory-grid').setAttribute('aria-label',activeTab==='weapons'?'武器清单':'道具清单');
  $('#weapons-tab').classList.toggle('selected',activeTab==='weapons');$('#items-tab').classList.toggle('selected',activeTab==='items');
  $('#weapons-tab').setAttribute('aria-selected',String(activeTab==='weapons'));$('#items-tab').setAttribute('aria-selected',String(activeTab==='items'));
  renderDetail();
}
function renderDetail(item?:ItemId) {
  const w=weaponById(game.selected);
  if(activeTab==='weapons') $('#weapon-detail').innerHTML=`<div class="detail-title"><span>${w.name}</span><span class="weapon-tag">${w.tag}</span></div><p>${w.description}</p><div class="weapon-metrics"><span>伤害 <strong>${w.damage}${w.id==='triple'?' ×3':w.id==='cluster'?' ×5':w.id==='airstrike'?' ×3':''}</strong></span><span>爆炸半径 <strong>${w.radius}m</strong></span></div>`;
  else {const i=ITEMS.find(i=>i.id===item);$('#weapon-detail').innerHTML=i?`<div class="detail-title"><span>${i.name}</span><span class="weapon-tag">战术道具</span></div><p>${i.description}</p>`:`<div class="detail-title"><span>给自己一点优势</span>${icon('shield')}</div><p>每回合可使用一件道具，之后仍能移动和发射。把好东西用在恰好的时候。</p><div class="weapon-metrics"><span>${game.active.itemUsed?'本回合已使用道具':'本回合道具可用'}</span></div>`;}
}

let lastInventory='';let lastPhase='';
function updateUI() {
  const t=game.active,human=game.humanTurn,lobby=game.phase==='lobby';
  $('#pwa-update').classList.toggle('hidden',!pendingUpdate||(!lobby&&game.phase!=='ended'));
  $('.battle-stage').classList.toggle('started',!lobby);
  $('#move-left').setAttribute('aria-label',`后退，向${t.direction===1?'左':'右'}移动，长按持续移动`);
  $('#move-right').setAttribute('aria-label',`前进，向${t.direction===1?'右':'左'}移动，长按持续移动`);
  $('#move-left .icon').style.transform=t.direction===1?'':'rotate(180deg)';
  $('#move-right .icon').style.transform=t.direction===1?'':'rotate(180deg)';
  $('#mode-label').textContent=config.mode==='ai'?'单人演习':'双人热座';
  const difficulty=DIFFICULTIES.find(d=>d.id===config.difficulty)!;
  $('#difficulty-label').textContent=config.mode==='ai'?`${difficulty.name} AI`:'本地双人对决';
  $('#role-0').textContent=config.mode==='hotseat'?'玩家 1':'你';
  $('#role-1').textContent=config.mode==='hotseat'?'玩家 2':`${difficulty.name} AI`;
  game.tanks.forEach((tank,i)=>{
    $(`#hp-${i}`).innerHTML=`${tank.hp} <small>/ 150</small>`;
    $(`#hp-bar-${i}`).style.width=`${tank.hp/150*100}%`;
    $(`#hp-bar-${i}`).classList.toggle('critical',tank.hp<45);
    const statuses=[tank.shield?`护盾 ${tank.shield}`:'',tank.frozen?`冻结 ${tank.frozen}`:'',tank.boost?'火力强化':''].filter(Boolean);
    $(`#status-${i}`).textContent=tank.hp<=0?'暂别战场':statuses.join(' · ')||'状态良好';
  });
  $('#map-label').textContent=MAPS.find(m=>m.id===config.map)!.name;
  $('#map-code').textContent=String(MAPS.findIndex(m=>m.id===config.map)+1).padStart(2,'0');
  $('#wind-label').textContent=Math.abs(game.wind)<0.5?'风平浪静':`${game.wind>0?'→':'←'} ${(Math.abs(game.wind)/2).toFixed(1)} m/s`;
  $('#gravity-note').textContent=config.map==='moon'?'重力 0.63 g':'重力 1.0 g';
  $('#field-note').textContent=game.teleporting?'点击 230 米内的地面传送':game.selected==='airstrike'?'点击战场指定空袭落点':config.map==='coast'?'海岛地形 · 小心坠海':config.map==='moon'?'低重力 · 炮弹飞得更远':'丘陵地形 · 可破坏环境';
  $('#lobby-overlay').classList.toggle('hidden',!lobby);
  $('#turn-indicator').classList.toggle('hidden',lobby||game.phase==='ended'||game.phase==='handoff');
  $('#timer').classList.toggle('hidden',lobby||game.phase==='ended'||game.phase==='handoff'||config.timer===0);
  $('#turn-text').textContent=game.phase==='flying'?'炮弹飞行中':game.phase==='resolving'?'观察战场…':config.mode==='ai'&&game.current===1?'大猪头爸爸正在瞄准…':game.current===0?'轮到咪猪头了':'轮到大猪头爸爸了';
  $('#turn-indicator').classList.toggle('opponent-turn',game.current===1);
  $('#round-text').textContent=game.round>=21?'决胜时刻':`第 ${String(game.round).padStart(2,'0')} 轮`;
  $('#timer span').textContent=String(Math.ceil(Math.max(0,game.clock))).padStart(2,'0');$('#timer').classList.toggle('urgent',game.clock<10);
  $('#angle-value').textContent=String(Math.round(t.angle));$('#power-value').textContent=String(Math.round(t.power));
  const angle=$<HTMLInputElement>('#angle'),power=$<HTMLInputElement>('#power');
  angle.value=String(t.angle);power.value=String(t.power);
  angle.style.setProperty('--range-fill',`${(t.angle-5)/170*100}%`);power.style.setProperty('--range-fill',`${(t.power-10)/90*100}%`);
  angle.disabled=!human;power.disabled=!human;
  $('.control-deck').classList.toggle('inactive',!human);
  document.querySelectorAll<HTMLButtonElement>('.step-button, .move-buttons button, #face-button, #aim-pad').forEach(b=>b.disabled=!human);
  $('#face-button span').textContent=t.direction===1?'朝右':'朝左';
  $('#charge-fill').style.width=`${t.power}%`;
  $('#fire-button').classList.toggle('charging',Boolean(charge));
  $('#fire-button').style.setProperty('--charge',`${t.power}%`);
  $('#fire-title').textContent=charge?`${Math.round(t.power)}% · 蓄力中`:'按住蓄力';
  $('#fire-subtitle').textContent=charge?'拖动微调 · 松手发射':'松手发射 / SPACE';
  $('#fuel-value').textContent=String(Math.floor(t.fuel));$('#move-note').textContent=t.frozen?'冰冻中 · 移动耗油加倍':'长按移动 · 每回合补充 18';
  $<HTMLButtonElement>('#fire-button').disabled=!human||game.teleporting||t.fallVelocity>0;
  $('#fire-note').textContent=lobby?'先进入战场':game.phase==='flying'||game.phase==='resolving'?'欣赏这条抛物线':game.paused?'游戏已暂停':game.phase==='ended'?'下一局见':game.phase==='handoff'?'交给下一位队长':!human?'等待对手行动':game.teleporting?'先选择传送落点':t.boost?'强化炮弹已就绪':`${weaponById(game.selected).name}已就绪`;
  $<HTMLButtonElement>('#pause-button').disabled=lobby||game.phase==='ended'||game.phase==='handoff';
  $('#pause-button').innerHTML=icon(game.paused?'play':'pause');$('#pause-button').setAttribute('aria-label',game.paused?'继续游戏':'暂停游戏');
  const signature=`${activeTab}|${game.selected}|${game.current}|${game.teleporting}|${t.itemUsed}|${JSON.stringify(t.ammo)}|${JSON.stringify(t.items)}`;
  if(signature!==lastInventory) {renderInventory();lastInventory=signature;}
  if(lastPhase!==game.phase) {updateOverlay();lastPhase=game.phase;}
}

function updateOverlay() {
  const el=$('#game-overlay');
  if(game.paused&&!$<HTMLDialogElement>('#dialog').open) {
    el.classList.remove('hidden');el.innerHTML=`<div class="overlay-card"><span class="overlay-symbol">${icon('pause')}</span><div class="eyebrow">先歇一会儿</div><h2>风也在等你。</h2><p>战场已暂停，随时回来继续。</p><button class="button button-dark" data-action="resume">继续对局 ${icon('play')}</button><button class="text-button" data-dialog="setup">重新部署</button></div>`;
  } else if(game.phase==='handoff') {
    el.classList.remove('hidden');el.innerHTML=`<div class="overlay-card handoff"><span class="overlay-avatar">${avatar(game.current===0)}</span><div class="eyebrow">把键盘交给下一位队长</div><h2>${game.current===0?'咪猪头':'大猪头爸爸'}，到你了。</h2><p>第 ${game.round} 轮 · 生命 ${game.active.hp} · 燃料 ${Math.floor(game.active.fuel)}</p><button class="button button-dark" data-action="handoff">我准备好了 ${icon('arrow')}</button></div>`;
  } else if(game.phase==='ended') {
    recordStats();
    el.classList.remove('hidden');const draw=game.winner===null,winner=draw?'两位队长':game.winner===0?'咪猪头':'大猪头爸爸';
    el.innerHTML=`<div class="overlay-card result"><span class="overlay-symbol">${icon('trophy')}</span><div class="eyebrow">一场漂亮的对决</div><h2>${draw?'握手言和。':`${winner}，好准头！`}</h2><p>${draw?'双双出局，平局也是一种默契。':`${winner}赢得了胜利。下一发，会更精彩。`}</p><div class="result-stats"><div><strong>${game.round}</strong><span>交战轮数</span></div><div><strong>${game.tanks[0].shots+game.tanks[1].shots}</strong><span>发射炮弹</span></div><div><strong>${game.tanks[0].damage}</strong><span>咪猪头伤害</span></div></div><button class="button button-dark" data-action="rematch">再来一局 ${icon('refresh')}</button><button class="text-button" data-dialog="setup">更换战场与模式</button></div>`;
  } else {el.classList.add('hidden');el.innerHTML='';}
}
function recordStats() {
  if(statsRecorded) return;statsRecorded=true;stats.games++;if(game.winner===0) stats.wins++;stats.damage+=game.tanks[0].damage;stats.shots+=game.tanks[0].shots;save('piggy-stats',stats);
}
function setImmersive(value:boolean) {
  immersive=value;document.body.classList.toggle('combat-mode',value);setDrawer(false);
  $('.versus small').textContent=value?'咪猪头的疯狂坦克':'友谊第一，准头第二';
  $('#layout-button').innerHTML=icon(value?'shrink':'fullscreen');
  $('#layout-button').setAttribute('aria-label',value?'切换标准布局':'进入沉浸布局');
  requestAnimationFrame(()=>renderer.resize());
}
function setDrawer(value:boolean) {
  drawerOpen=value;document.body.classList.toggle('drawer-open',value);
  $('#inventory-toggle').setAttribute('aria-expanded',String(value));
  $('#inventory-toggle').setAttribute('aria-label',value?'关闭军火库':'展开军火库');
}
function begin() {audio.unlock();game.start();setImmersive(true);audio.play('click');lastPhase='';updateUI();}
function newMatch(next:Config,start=true) {
  cancelCharge();
  config={...next,seed:Date.now()};game=new Game(config);renderer.setGame(game);statsRecorded=false;lastPhase='';lastInventory='';moveHeld=0;keys.clear();persistSettings();
  $('#battle-message').textContent='新的风，新的可能。';if(start) begin();else {setImmersive(false);updateUI();}
}
function togglePause() {
  if(game.phase==='lobby'||game.phase==='ended'||game.phase==='handoff') return;
  cancelCharge();game.paused=!game.paused;moveHeld=0;keys.clear();audio.pause(game.paused);updateOverlay();updateUI();
}

function showDialog(type:string) {
  const dialog=$<HTMLDialogElement>('#dialog');
  if(!dialog.open) {cancelCharge();dialogPaused=game.paused;game.paused=true;audio.pause(true);moveHeld=0;keys.clear();}
  const content=$('#dialog-content');
  if(type==='setup') {
    content.innerHTML=`<span class="eyebrow">下一场冒险</span><h2>部署你的对局。</h2><p class="dialog-intro">选一片风景，找一个对手。然后，尽情开火。</p><form id="setup-form"><label class="form-label">作战模式</label><div class="choice-row mode-choices"><label class="choice-card"><input type="radio" name="mode" value="ai" ${config.mode==='ai'?'checked':''}/><span>${icon('target')}<strong>挑战 AI</strong><small>与大猪头爸爸切磋炮术</small></span></label><label class="choice-card"><input type="radio" name="mode" value="hotseat" ${config.mode==='hotseat'?'checked':''}/><span>${icon('pig')}<strong>双人热座</strong><small>一台电脑，两位队长</small></span></label></div><div id="difficulty-section"><label class="form-label" for="difficulty">AI 难度</label><select id="difficulty" name="difficulty">${DIFFICULTIES.map(d=>`<option value="${d.id}" ${config.difficulty===d.id?'selected':''}>${d.name} · ${d.sub}</option>`).join('')}</select></div><label class="form-label">选择战场</label><div class="choice-row map-choices">${MAPS.map((m,i)=>`<label class="choice-card map-choice"><input type="radio" name="map" value="${m.id}" ${config.map===m.id?'checked':''}/><span><div class="map-mini ${m.id}"><span class="mini-sun"></span><span class="mini-hill h1"></span><span class="mini-hill h2"></span><span class="mini-hill h3"></span><b>0${i+1}</b></div><strong>${m.name}</strong><small>${m.sub.split(' · ')[0]}</small></span></label>`).join('')}</div><div class="form-bottom"><div><label class="form-label" for="turn-timer">每回合时间</label><select id="turn-timer" name="timer">${[[30,'30 秒 · 快节奏'],[45,'45 秒 · 从容瞄准'],[60,'60 秒 · 细细思考'],[0,'不限时 · 慢慢来']].map(([v,n])=>`<option value="${v}" ${config.timer===v?'selected':''}>${n}</option>`).join('')}</select></div><div class="setup-note">${icon('book')}双方各 150 点生命<br>12 种武器 · 6 种道具</div></div>${game.phase!=='lobby'&&game.phase!=='ended'?'<p class="replace-note">开始新对局将结束当前这场演习。</p>':''}<button class="button button-dark dialog-primary" type="submit">${game.phase==='lobby'?'开始对局':'开始新对局'} ${icon('arrow')}</button></form>`;
    const sync=()=>$('#difficulty-section').classList.toggle('hidden',$<HTMLInputElement>('input[name="mode"]:checked').value==='hotseat');
    document.querySelectorAll('input[name="mode"]').forEach(el=>el.addEventListener('change',sync));sync();
    $('#setup-form').addEventListener('submit',e=>{
      e.preventDefault();const data=new FormData(e.target as HTMLFormElement);
      const next={...config,mode:data.get('mode') as Config['mode'],difficulty:data.get('difficulty') as Config['difficulty'],map:data.get('map') as Config['map'],timer:Number(data.get('timer'))};
      closeDialog();newMatch(next);
    });
  } else if(type==='install') {
    content.innerHTML=`<span class="eyebrow">把战场装进口袋</span><h2>安装到 iPad。</h2><p class="dialog-intro">首次打开并完成离线缓存后，就能从主屏幕直接进入游戏，离线也可以开战。</p><div class="install-art"><img src="${import.meta.env.BASE_URL}icons/icon-192.png" alt="咪猪头坦克图标"/><strong>咪猪头的疯狂坦克</strong></div><ol class="install-steps"><li>用 Safari 打开游戏。</li><li>点击分享按钮，选择「添加到主屏幕」。</li><li>点「添加」，再从主屏幕打开。横过 iPad，就可以开始了。</li></ol><button class="button button-dark dialog-primary" data-action="close">知道啦 ${icon('check')}</button>`;
  } else if(type==='guide') {
    content.innerHTML=`<span class="eyebrow">炮手口袋手册</span><h2>把抛物线，变成好消息。</h2><p class="dialog-intro">摧毁对方的坦克就是胜利。两边都只有 150 点生命，每回合轮流行动。</p><div class="guide-grid"><article><span class="guide-number">01</span><h3>走一步，再瞄准</h3><p>长按 A / D 或移动按钮调整位置，每回合恢复 18 燃料。在战场上拖动瞄准，或长按「拖动瞄准」区域，上下调整角度、左右换向。</p></article><article><span class="guide-number">02</span><h3>按住蓄力，松手开火</h3><p>按住发射键或空格，从 10% 蓄力到 100%，松手发射。蓄力时上下拖动可微调角度，左右拖动可换向。手势取消与切换窗口不会误发射。</p></article><article><span class="guide-number">03</span><h3>借风，也带点花样</h3><p>风会推动炮弹，月光荒原重力更低。12 种武器中只有标准榴弹不限弹药。空袭先点击落点再发射；散花弹、钻地弹与跳跳弹各有专长。</p></article><article><span class="guide-number">04</span><h3>留心你的脚下</h3><p>弹坑永久改变地形，超过 48 米的坠落会受伤，落入底部水面立即出局。燃烧持续 3 轮，冰冻增加移动耗油。</p></article></div><div class="guide-callout">${icon('shield')}<div><strong>道具不会占用你的射击机会</strong><p>每回合限用一件：维修、护盾、燃料、强化、传送或定风。传送需要点击 230 米内的地面。护盾优先吸收伤害，电磁脉冲可以清空护盾。</p></div></div><div class="guide-small"><p>补给每 5 回合出现，移动靠近即可拾取。第 21 轮进入决胜时刻，风力变强，每回合当前坦克受到 12 点伤害。</p><p>桌面端可用 W / S 与滑杆调整角度。新兵显示完整弹道，老兵和精英显示部分弹道，王牌没有辅助。双人热座每回合都需下一位玩家确认接手。Esc 暂停游戏，打开面板也会暂停计时。</p></div><button class="button button-dark dialog-primary" data-action="close">明白了，去练练 ${icon('arrow')}</button>`;
  } else if(type==='stats') {
    content.innerHTML=`<span class="eyebrow">每一发，都算数</span><h2>你的炮手履历。</h2><p class="dialog-intro">留在这台设备上的小小战绩，记录咪猪头完成的对局。</p><div class="stats-grid"><div><strong>${stats.games}</strong><span>完成对局</span></div><div><strong>${stats.wins}</strong><span>咪猪头获胜</span></div><div><strong>${stats.shots}</strong><span>发射次数</span></div><div><strong>${stats.damage}</strong><span>累计伤害</span></div></div><div class="stats-empty">${icon('trophy')}<p>${stats.games?'好准头都是练出来的。下一局，也许更漂亮。':'第一枚勋章，正等着你的第一场胜利。'}</p></div><button class="button button-dark dialog-primary" data-action="close">回到战场 ${icon('arrow')}</button>`;
  } else if(type==='log') {
    content.innerHTML=`<span class="eyebrow">战场里的那些瞬间</span><h2>作战记录。</h2><p class="dialog-intro">最近 24 条事件 · 当前第 ${game.round} 轮</p><ol class="battle-log">${game.log.length?game.log.map((line,i)=>`<li><span>${String(game.log.length-i).padStart(2,'0')}</span>${line}</li>`).join(''):'<li>战场很安静。第一发炮弹会写下故事。</li>'}</ol><button class="button button-dark dialog-primary" data-action="close">返回对局 ${icon('arrow')}</button>`;
  } else {
    content.innerHTML=`<span class="eyebrow">照你喜欢的来</span><h2>一点小设置。</h2><p class="dialog-intro">给战场加一点声音，或安静地享受瞄准。</p><div class="settings-row"><div><strong>音乐与音效</strong><p>轻快的背景音乐，发射与爆炸反馈</p></div><button id="audio-toggle" class="toggle ${audio.enabled?'on':''}" role="switch" aria-checked="${audio.enabled}" aria-label="音乐与音效"><span></span></button></div><label class="form-label" for="volume">音量 <span id="volume-percent">${Math.round(audio.volume*100)}%</span></label><input id="volume" type="range" min="0" max="100" value="${Math.round(audio.volume*100)}"/><div class="settings-note">${icon('music')}<p>背景音乐与部分音效来自你提供的 piggymicharacter3 素材；炮火声由音频合成生成。</p></div><button class="button button-dark dialog-primary" data-action="close">设置好了 ${icon('check')}</button>`;
    $('#audio-toggle').addEventListener('click',()=>{audio.unlock();audio.setEnabled(!audio.enabled);$('#audio-toggle').classList.toggle('on',audio.enabled);$('#audio-toggle').setAttribute('aria-checked',String(audio.enabled));updateSound();persistSettings();});
    $('#volume').addEventListener('input',e=>{audio.setVolume(Number((e.target as HTMLInputElement).value)/100);$('#volume-percent').textContent=`${Math.round(audio.volume*100)}%`;persistSettings();});
  }
  if(!dialog.open) dialog.showModal();
}
function closeDialog() {const dialog=$<HTMLDialogElement>('#dialog');dialog.close();game.paused=dialogPaused;audio.pause(game.paused);updateOverlay();updateUI();}

document.addEventListener('click',e=>{
  const target=e.target as HTMLElement;
  const dialogButton=target.closest<HTMLElement>('[data-dialog]');if(dialogButton) {audio.play('click');showDialog(dialogButton.dataset.dialog!);return;}
  const action=target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if(action==='close') closeDialog();
  if(action==='resume') togglePause();
  if(action==='handoff') {game.acceptHandoff();audio.unlock();lastPhase='';updateUI();}
  if(action==='rematch') newMatch(config);
  const adjust=target.closest<HTMLElement>('[data-adjust]')?.dataset.adjust;
  if(adjust&&game.humanTurn) {const [key,step]=adjust.split(':');game.setAim(game.active.angle+(key==='angle'?Number(step):0),game.active.power+(key==='power'?Number(step):0));updateUI();}
  const weapon=target.closest<HTMLElement>('[data-weapon]')?.dataset.weapon as WeaponId|undefined;
  if(weapon) {
    if(game.phase==='lobby') {game.selected=weapon;lastInventory='';updateUI();return;}
    if(!game.humanTurn) {toast('等轮到你，再选择武器。');return;}
    if(game.selectWeapon(weapon)) {audio.play('click');lastInventory='';updateUI();}else toast('这件武器的弹药用完了。');
  }
  const item=target.closest<HTMLElement>('[data-item]')?.dataset.item as ItemId|undefined;
  if(item) {
    renderDetail(item);
    if(!game.humanTurn) {toast('道具要在自己的回合使用。');return;}
    if(game.useItem(item)) {audio.play('item');toast(item==='teleport'?'点击 230 米内的地面进行传送。':`${ITEMS.find(i=>i.id===item)!.name}已使用。`);lastInventory='';updateUI();}
    else toast(game.active.itemUsed?'每回合只能使用一件道具。':game.active.items[item]<=0?'这件道具已用完。':'当前无需使用这件道具。');
  }
});
$('#start-button').addEventListener('click',()=>showDialog('setup'));
$('#new-game').addEventListener('click',()=>showDialog('setup'));
$('#sound-button').addEventListener('click',()=>{audio.unlock();audio.setEnabled(!audio.enabled);updateSound();persistSettings();toast(audio.enabled?'音乐与音效已开启。':'已切换为安静模式。');});
$('#pause-button').addEventListener('click',togglePause);
$('#inventory-toggle').addEventListener('click',()=>{if(immersive) setDrawer(!drawerOpen);else {setImmersive(true);setDrawer(true);}});
$('#arsenal-close').addEventListener('click',()=>setDrawer(false));
$('#inventory-backdrop').addEventListener('click',()=>setDrawer(false));
$('#layout-button').addEventListener('click',()=>{setImmersive(!immersive);if(!immersive&&document.fullscreenElement) void document.exitFullscreen().catch(()=>{});});
$('#fullscreen-button').addEventListener('click',()=>{setImmersive(true);if(!document.fullscreenElement&&document.documentElement.requestFullscreen) void document.documentElement.requestFullscreen().catch(()=>toast('已进入沉浸布局。'));else if(document.fullscreenElement) void document.exitFullscreen().catch(()=>{});});
document.addEventListener('fullscreenchange',()=>requestAnimationFrame(()=>renderer.resize()));
$('#log-button').addEventListener('click',()=>showDialog('log'));
$('#close-dialog').addEventListener('click',closeDialog);
$('#dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
$('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')) closeDialog();});
$('#weapons-tab').addEventListener('click',()=>{activeTab='weapons';lastInventory='';updateUI();});
$('#items-tab').addEventListener('click',()=>{activeTab='items';lastInventory='';updateUI();});
$('#angle').addEventListener('input',e=>{game.setAim(Number((e.target as HTMLInputElement).value),game.active.power);updateUI();});
$('#power').addEventListener('input',e=>{game.setAim(game.active.angle,Number((e.target as HTMLInputElement).value));updateUI();});
$('#face-button').addEventListener('click',()=>{game.face(-game.active.direction);updateUI();});
function startCharge(pointer:number|null,x=0,y=0) {
  if(!game.humanTurn||game.teleporting||game.active.fallVelocity>0||charge) return false;
  setDrawer(false);charge={pointer,startedAt:performance.now(),startX:x,startY:y,angle:game.active.angle,previousPower:game.active.power,tank:game.current};
  audio.unlock();game.setAim(game.active.angle,10);updateUI();return true;
}
function cancelCharge() {
  if(charge) {game.tanks[charge.tank].power=charge.previousPower;charge=null;}
}
function finishCharge() {
  if(!charge) return;
  const tank=charge.tank,power=chargePower((performance.now()-charge.startedAt)/1000);charge=null;
  if(game.humanTurn&&game.current===tank) game.setAim(game.active.angle,power);
  if(game.humanTurn&&game.current===tank) game.fire();updateUI();
}
function gestureAim(x:number,y:number,startX:number,startY:number,initialAngle:number) {
  if(!game.humanTurn) return;
  const result=dragAim(initialAngle,game.active.direction,x-startX,y-startY);
  game.face(result.direction);game.setAim(result.angle,game.active.power);
}
const fireButton=$<HTMLButtonElement>('#fire-button');
fireButton.addEventListener('pointerdown',e=>{if(startCharge(e.pointerId,e.clientX,e.clientY)){e.preventDefault();fireButton.setPointerCapture(e.pointerId);}});
fireButton.addEventListener('pointermove',e=>{if(charge?.pointer===e.pointerId) gestureAim(e.clientX,e.clientY,charge.startX,charge.startY,charge.angle);});
fireButton.addEventListener('pointerup',e=>{if(charge?.pointer===e.pointerId){e.preventDefault();finishCharge();}});
fireButton.addEventListener('pointercancel',()=>{cancelCharge();updateUI();});
fireButton.addEventListener('lostpointercapture',()=>{if(charge?.pointer!==null){cancelCharge();updateUI();}});
fireButton.addEventListener('contextmenu',e=>e.preventDefault());
fireButton.addEventListener('click',e=>{if(e.detail===0&&!charge&&game.humanTurn){audio.unlock();game.fire();updateUI();}});

let padDrag:null|{pointer:number;x:number;y:number;angle:number}=null;
const aimPad=$<HTMLButtonElement>('#aim-pad');
aimPad.addEventListener('pointerdown',e=>{if(!game.humanTurn) return;e.preventDefault();padDrag={pointer:e.pointerId,x:e.clientX,y:e.clientY,angle:game.active.angle};aimPad.setPointerCapture(e.pointerId);aimPad.classList.add('dragging');});
aimPad.addEventListener('pointermove',e=>{if(padDrag?.pointer===e.pointerId) gestureAim(e.clientX,e.clientY,padDrag.x,padDrag.y,padDrag.angle);});
const endPad=()=>{padDrag=null;aimPad.classList.remove('dragging');};
aimPad.addEventListener('pointerup',endPad);aimPad.addEventListener('pointercancel',endPad);aimPad.addEventListener('lostpointercapture',endPad);
aimPad.addEventListener('contextmenu',e=>e.preventDefault());

function bindMove(id:string,direction:number) {
  const button=$<HTMLButtonElement>(id);
  button.addEventListener('pointerdown',e=>{if(!game.humanTurn) return;e.preventDefault();moveHeld=direction;button.setPointerCapture(e.pointerId);game.move(direction*game.active.direction,1/30);});
  const release=()=>moveHeld=0;
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
bindMove('#move-left',-1);bindMove('#move-right',1);
function aimOnField(e:PointerEvent,release=false) {
  if(!game.humanTurn) return;
  const rect=$('#battlefield').getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*WORLD_W,y=(e.clientY-rect.top)/rect.height*renderer.viewHeight+renderer.offsetY;
  if(game.teleporting) {if(release&&!game.teleport(x)) toast('传送落点要在 230 米内，且远离敌人与水面。');}
  else if(game.selected==='airstrike') game.targetX=clamp(x,20,WORLD_W-20);
  else {
    const dx=x-game.active.x;game.face(dx>=0?1:-1);
    const angle=Math.atan2(game.active.y-13-y,Math.abs(dx))*180/Math.PI;
    game.setAim(clamp(angle,5,85),game.active.power);
  }
  updateUI();
}
const battlefield=$<HTMLCanvasElement>('#battlefield');
battlefield.addEventListener('pointerdown',e=>{if(!game.humanTurn) return;e.preventDefault();aimPointer=e.pointerId;battlefield.setPointerCapture(e.pointerId);aimOnField(e);});
battlefield.addEventListener('pointermove',e=>{if(aimPointer===e.pointerId) aimOnField(e);});
battlefield.addEventListener('pointerup',e=>{if(aimPointer===e.pointerId){aimOnField(e,true);aimPointer=null;}});
battlefield.addEventListener('pointercancel',()=>aimPointer=null);
battlefield.addEventListener('lostpointercapture',()=>aimPointer=null);
battlefield.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  if($<HTMLDialogElement>('#dialog').open) return;
  const target=e.target as HTMLElement;
  if(target.matches('input,select,textarea')) return;
  const key=e.key.toLowerCase();
  if(key==='escape') {togglePause();return;}
  if(!game.humanTurn) return;
  if(['a','d','w','s','q','e',' '].includes(key)) {e.preventDefault();keys.add(key);}
  if(key===' '&&!e.repeat) startCharge(null);
});
document.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(e.key===' '&&charge?.pointer===null){e.preventDefault();finishCharge();}});
window.addEventListener('blur',()=>{keys.clear();moveHeld=0;cancelCharge();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();moveHeld=0;cancelCharge();}});
window.addEventListener('resize',()=>renderer.resize());

let previous=performance.now(),lastUI=0;
function frame(now:number) {
  const dt=Math.min((now-previous)/1000,0.05);previous=now;
  if(game.humanTurn&&!$<HTMLDialogElement>('#dialog').open) {
    if(charge&&charge.tank===game.current) game.setAim(game.active.angle,chargePower((now-charge.startedAt)/1000));
    const direction=moveHeld||(keys.has('a')?-1:keys.has('d')?1:0);if(direction) game.move(direction*game.active.direction,dt);
    const angle=(keys.has('w')?1:0)-(keys.has('s')?1:0),power=(keys.has('e')?1:0)-(keys.has('q')?1:0);
    if(angle||power) game.setAim(game.active.angle+angle*35*dt,game.active.power+power*28*dt);
  }
  game.update(dt);renderer.draw(dt);
  if(charge&&(!game.humanTurn||charge.tank!==game.current)) cancelCharge();
  for(const event of game.drainEvents()) {
    if(event.type!=='explosion') $('#battle-message').textContent=event.message;
    if(event.type==='shot') audio.play('shot');
    if(event.type==='explosion') audio.play('explosion');
    if(event.type==='win') audio.play('win');
    if(event.type==='crate') audio.play('item');
  }
  if(now-lastUI>80) {updateUI();lastUI=now;}
  requestAnimationFrame(frame);
}
setImmersive(false);renderInventory();updateSound();updateUI();requestAnimationFrame(frame);
const updateSW=registerSW({
  immediate:true,
  onNeedRefresh(){pendingUpdate=true;updateUI();},
  onOfflineReady(){toast('离线缓存已就绪，断网也可以开战。');},
  onRegisterError(error){console.warn('Offline cache registration failed',error);},
});
$('#apply-update').addEventListener('click',()=>{if(game.phase==='lobby'||game.phase==='ended') void updateSW(true);});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e as typeof installPrompt;$('#install-button').classList.remove('hidden');});
window.addEventListener('appinstalled',()=>{$('#install-button').classList.add('hidden');installPrompt=null;toast('安装好了，从主屏幕就能进入游戏。');});
$('#install-button').addEventListener('click',async()=>{
  if(installPrompt){const prompt=installPrompt;await prompt.prompt();await prompt.userChoice;installPrompt=null;$('#install-button').classList.add('hidden');}
  else showDialog('install');
});
const standalone=window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || (navigator as Navigator&{standalone?:boolean}).standalone;
if(!standalone&&(/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)) $('#install-button').classList.remove('hidden');
