import './style.css';
import { Game, WORLD_W, clamp, type Config } from './engine';
import {TERRAIN_H} from './terrain';
import { Renderer } from './renderer';
import { AudioManager } from './audio';
import { DIFFICULTIES, ITEMS, MAPS, WEAPONS, weaponById, type ItemId, type WeaponId } from './catalog';
import { icon } from './icons';
import { chargePower } from './interaction';
import { registerSW } from 'virtual:pwa-register';
import { compareVersions } from './version';
import {VEHICLES,VEHICLE_WEAPONS,vehicleById,validChoice,type VehicleChoice} from './vehicles';
import {vehicleIcon,paintProjectilePreviews} from './vehicle-art';
import {WEAPON_REFERENCE,HISTORICAL_GUIDE} from './weapon-reference';
import {DashboardView} from './dashboard';
import {guideMarkup} from './guide';
import {installControlHints} from './control-hints';
import {paintMapOverview} from './map-preview';
const APP_VERSION=__APP_VERSION__;

const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const safeRead=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const save=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private browsing can disable storage. */}};
const saved=safeRead('piggy-settings');
let config:Config={mode:'ai',difficulty:'easy',map:'valley',timer:45,seed:Date.now(),vehicle0:'random',vehicle1:'random',...(saved?.config||{})};
if(!MAPS.some(m=>m.id===config.map)) config.map='valley';
if(saved?.balanceVersion!==2) config.difficulty='easy';
if(!DIFFICULTIES.some(d=>d.id===config.difficulty)) config.difficulty='easy';
if(!['ai','hotseat'].includes(config.mode)) config.mode='ai';
if(![0,30,45,60].includes(config.timer)) config.timer=45;
if(!validChoice(config.vehicle0)) config.vehicle0='random';
if(!validChoice(config.vehicle1)) config.vehicle1='random';
let game=new Game(config);
const audio=new AudioManager();
audio.setEnabled(saved?.sound??true);audio.setVolume(saved?.audioVersion===2?clamp(Number(saved.volume)||0,0,1):Math.max(0.65,clamp(Number(saved?.volume)||0.65,0,1)));
let stats:{games:number;wins:number;damage:number;shots:number}=safeRead('piggy-stats')||{games:0,wins:0,damage:0,shots:0};
let activeTab:'weapons'|'items'='items';
let dialogPaused=false;
let statsRecorded=false;
let toastTimer=0;
let moveHeld=0;
let charge:null|{pointer:number|null;startedAt:number;previousPower:number;tank:number}=null;
let aimPointer:number|null=null;
let immersive=false;
let drawerOpen=false;
let pendingUpdate=false;
let installPrompt:(Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>})|null=null;
let swRegistration:ServiceWorkerRegistration|undefined;
let checkingVersion=false;
const keys=new Set<string>();

function avatar(pink=true) {
  const name=pink?'咪猪头':'大猪头爸爸';
  return `<button class="portrait-button" data-portrait="${pink?0:1}" aria-label="查看${name}的大头像" title="点我，看看${name}"><img src="${import.meta.env.BASE_URL}icons/${pink?'icon-192.png':'dad-avatar.png'}" alt="${name}"/><span class="portrait-peek">${icon('plus')}</span></button>`;
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
            <div id="minimap-panel" class="minimap-panel"><div class="minimap-header"><button id="minimap-toggle" aria-label="折叠小地图" aria-expanded="true"><span>小地图</span>${icon('chevron')}</button><button id="minimap-follow" aria-label="恢复战场镜头跟随">跟随</button></div><canvas id="minimap" aria-label="小地图，点击定位视野"></canvas></div><div class="stage-top"><span class="map-chip">${icon('mountain')}<span id="map-label">青苔峡谷</span><span class="map-code" id="map-code">01</span></span><div class="wind-chip">${icon('wind')}<span id="wind-label">微风待命</span></div><button id="inventory-toggle" class="stage-button stage-extra inventory-toggle" aria-label="展开军火库" aria-expanded="false">${icon('shell')}<span>军火库</span></button><button id="fullscreen-button" class="stage-button stage-extra" title="全屏作战" aria-label="全屏作战">${icon('fullscreen')}</button><button id="layout-button" class="stage-button stage-extra" title="切换标准布局" aria-label="切换标准布局">${icon('shrink')}</button><button id="pause-button" class="stage-button" title="暂停 · Esc" aria-label="暂停游戏">${icon('pause')}</button></div>
            <div id="turn-indicator" class="turn-indicator hidden"><span class="status-dot"></span><span id="turn-text">轮到你了</span><span class="turn-divider"></span><span id="round-text">第 01 回合</span></div>
            <div id="timer" class="timer hidden">${icon('clock')}<span>45</span><small>s</small></div>
            <div id="lobby-overlay" class="lobby-overlay"><div class="lobby-tag">FIELD NOTES / 01</div><h2>好风景。<br>也要好准头。</h2><p>调整角度，借一阵风。<br>让下一发，刚好落在对手身旁。</p><button id="start-button" class="button button-dark">进入战场 ${icon('arrow')}</button><span class="lobby-hint">单人挑战 AI / 双人热座对决</span></div>
<div id="game-overlay" class="game-overlay hidden"></div>
            <div class="stage-bottom"><span id="field-note">丘陵地形 · 可破坏环境</span><span>${icon('sun')}<span id="gravity-note">重力 1.0 g</span><button id="stage-version-button" class="version-button" aria-label="点击版本号检查更新">v${APP_VERSION} · 检查更新</button></span></div>
          </div>
          <div class="battle-caption"><div class="caption-main"><span class="caption-dot"></span><span id="battle-message">山谷已就位。准备好，就开一局。</span></div><button id="log-button" aria-label="查看战斗记录">战斗记录 ${icon('chevron')}</button></div>
        </div>
        <section class="control-deck dashboard" aria-label="经典坦克仪表盘">
          <div class="dash-angle"><button id="aim-pad" class="angle-instrument" aria-label="拖动角度仪表瞄准"><canvas id="angle-dial"></canvas><span class="angle-instrument-name" id="instrument-tank">老土</span></button><div class="angle-caption"><span id="angle-limits">25–45°</span><button id="face-button" title="切换炮口朝向">${icon('transfer')}<span>朝右</span></button></div><input id="angle" type="range" min="0" max="90" value="45" class="sr-only"/><span id="angle-value" class="sr-only">45</span></div>
          <div class="dash-center"><div class="dash-toolbar"><div id="weapon-switcher" class="weapon-switcher hidden" aria-label="直接切换坦克武器"><button id="weapon-normal" data-weapon="shell"></button><button id="weapon-special" data-weapon="heavy"></button><button id="weapon-bonus" data-weapon="homing" class="hidden"></button></div><div id="quick-items" class="quick-items"></div><div class="wait-readout"><span>等待</span><strong id="waiting-value">580</strong></div></div>
            <div class="meter-row energy-meter"><span class="meter-label">${icon('fuel')}能量</span><div class="meter-track"><span id="energy-fill"></span></div><span id="energy-value" class="meter-value">920 / 920</span></div>
            <div class="meter-row force-meter"><span class="meter-label">${icon('bolt')}力度</span><button id="power-meter" class="meter-track power-meter-button" aria-label="按住力度条蓄力，松开发射"><span id="charge-fill"></span><i id="previous-power" class="previous-power"></i><span class="meter-help">按住力度条 / SPACE · 松开发射</span></button><span class="meter-value"><b id="power-value">68</b>%</span><input id="power" class="sr-only" type="range" min="10" max="100" value="68"/></div>
            <div class="meter-row mobility-meter"><span class="meter-label">${icon('transfer')}移动力</span><div class="meter-track"><span id="mobility-fill"></span></div><span class="meter-value"><b id="fuel-value">100</b>%</span><div class="move-buttons"><button id="move-left" aria-label="后退">${icon('left')}<span>后退</span><kbd>A</kbd></button><button id="move-right" aria-label="前进"><kbd>D</kbd><span>前进</span>${icon('right')}</button></div></div><div class="dashboard-note"><span id="move-note">本回合可移动</span><span id="meter-hint">白线为上次力度 · ↑↓ 调角度</span></div>
          </div><div class="dash-actions fire-section"><button id="fire-button" class="fire-button" disabled aria-label="按住蓄力，松手发射">${icon('target')}<span id="fire-title">开火</span><small id="fire-subtitle">按住 / 松手</small></button><span id="fire-note">进入战场后开炮</span><div class="dash-utility"><button id="skip-button" title="跳过回合 · F5">跳过</button><button id="exit-match">退出</button></div></div>
        </section>
        <div class="keyboard-hints"><span><kbd>A</kbd><kbd>D</kbd> 移动</span><span><kbd>W</kbd><kbd>S</kbd> 角度</span><span><kbd>SPACE</kbd> 蓄力 · 松开发射</span><span class="touch-help">拖动角度盘瞄准 · 按住力度条 · 松手开火</span><span class="hint-last">每一发，都有一点可能。</span></div>
      </section>
      <button id="inventory-backdrop" class="inventory-backdrop" aria-label="关闭军火库" tabindex="-1"></button><aside class="arsenal" aria-label="武器和道具"><div class="arsenal-heading"><div><span class="eyebrow">有备而来</span><h2>战术背包<span id="tank-pack-label"></span></h2></div><span class="arsenal-symbol">${icon('shell')}</span><button id="arsenal-close" class="icon-button arsenal-close" aria-label="关闭军火库">${icon('close')}</button></div><div class="arsenal-tabs" role="tablist" aria-label="军火库类别"><button id="weapons-tab" class="selected" role="tab" aria-selected="true">坦克武器 <span>2</span></button><button id="items-tab" role="tab" aria-selected="false">道具 <span>7</span></button></div><div class="inventory-grid" id="inventory-grid" role="tabpanel" aria-label="武器清单"></div><div id="weapon-detail" class="weapon-detail"></div><div class="arsenal-bottom"><div class="supply-icon">${icon('plus')}</div><div><strong>路上有惊喜</strong><p>每 5 回合空投补给，移动可拾取</p></div></div></aside>
    </div>
    <footer class="page-footer"><span>手边的快乐，远方的炮火。</span><button id="version-button" class="version-button" aria-label="点击版本号检查更新">v${APP_VERSION} · 检查更新</button><span>MIMI’S CRAZY TANKS <span class="footer-star">✳</span> MADE FOR A GOOD SHOT</span></footer>
  </main>
  <div id="toast" class="toast" role="status"></div>
  <div id="pwa-update" class="pwa-update hidden"><span>新版本已就绪</span><button id="apply-update">更新游戏</button></div>
  <dialog id="dialog"><div class="dialog-shell"><button id="close-dialog" class="dialog-close icon-button" aria-label="关闭">${icon('close')}</button><div id="dialog-content"></div></div></dialog>
`;
// Keep the combat chrome on one row and give the action cluster its own compact grid.
$('.dash-actions').prepend($('.move-buttons'));
$('.dashboard').classList.add('compact-dashboard');
const logButton=$('#log-button');logButton.classList.add('stage-button');logButton.innerHTML=icon('book');logButton.title='战斗记录';$('#pause-button').before(logButton);
const message=$('.caption-main');message.classList.add('battle-live-message');$('.battle-stage').append(message);$('.battle-caption').remove();
$('#skip-button').innerHTML=icon('skip');$('#skip-button').setAttribute('aria-label','跳过回合');
$('#exit-match').innerHTML=icon('exit');$('#exit-match').setAttribute('aria-label','退出对局');
$('#exit-match').title='结束当前对局，回到演习场';
$('#inventory-toggle').dataset.helpDescription='查看当前坦克的武器、战术道具和炮弹图鉴';
$('#pause-button').dataset.helpDescription='轻点暂停或继续，暂停时也可重新部署';
$('#face-button').dataset.helpName='切换炮口朝向';$('#face-button').dataset.helpDescription='轻点切换左右朝向；移动时面向行驶方向，仰角保持不变';
$('#minimap-toggle').innerHTML=icon('mountain')+icon('chevron');$('#minimap-toggle').dataset.helpName='小地图';$('#minimap-toggle').dataset.helpDescription='轻点折叠或展开；点击地图查看地形';
$('#minimap-follow').innerHTML=icon('target');$('#minimap-follow').dataset.helpName='跟随镜头';$('#minimap-follow').dataset.helpDescription='恢复坦克、炮弹与空投的自动镜头跟随';
$('#stage-version-button').dataset.helpName='检查游戏更新';$('#stage-version-button').dataset.helpDescription='联网检查新版本，对局不会被强制中断';
$('#stage-version-button').textContent=`v${APP_VERSION}`;
$('.energy-meter .meter-label').innerHTML=icon('heart');$('.energy-meter .meter-label').dataset.helpName='生命能量';
$('.force-meter .meter-label').innerHTML=icon('bolt');$('.force-meter .meter-label').dataset.helpName='发射力度';
$('.mobility-meter .meter-label').innerHTML=icon('transfer');$('.mobility-meter .meter-label').dataset.helpName='移动力';
$('.wait-readout').dataset.helpName='行动等待';$('.wait-readout').dataset.helpDescription='特殊武器会增加等待；等待影响再次行动的先后';
installControlHints(()=>{if(!game.paused)audio.unlock();audio.play('aim');});
const renderer=new Renderer($('#battlefield'),game);
const dashboard=new DashboardView($('#angle-dial'),$('#minimap'));
function paintMapChoices(){
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-map-preview]').forEach(canvas=>{
    const map=canvas.dataset.mapPreview as Config['map'];canvas.width=160;canvas.height=64;
    const sample=new Game({map,seed:52,timer:0,fog:false,fireLine:false});paintMapOverview(canvas.getContext('2d')!,sample,160,64);
  });
}

function persistSettings() {save('piggy-settings',{config,sound:audio.enabled,volume:audio.volume,balanceVersion:2,audioVersion:2});}
function updateSound() {const b=$('#sound-button');b.innerHTML=icon(audio.enabled?'sound':'mute');b.setAttribute('aria-label',audio.enabled?'关闭声音':'开启声音');b.title=audio.enabled?'关闭声音':'开启声音';}
function toast(message:string) {const el=$('#toast');el.textContent=message;el.classList.add('visible');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el.classList.remove('visible'),2700);}
function displayTank(){return game.tanks[game.viewer];}
function renderInventory() {
  const tank=displayTank(),vehicle=tank.vehicleId?vehicleById(tank.vehicleId):null;
  const weapons=vehicle?[weaponById(vehicle.normal),weaponById(vehicle.special),...(tank.ammo.homing>0?[weaponById('homing')]:[])]:WEAPONS;
  $('#inventory-grid').innerHTML=activeTab==='weapons'?weapons.map(w=>`<button class="inventory-tile ${game.selected===w.id?'selected':''} ${tank.ammo[w.id]<=0?'depleted':''}" data-weapon="${w.id}" title="${w.name}：${w.description}" aria-label="${w.name}，${Number.isFinite(tank.ammo[w.id])?tank.ammo[w.id]+' 发':'无限弹药'}" aria-pressed="${game.selected===w.id}"><span class="weapon-icon" style="--weapon-color:${w.color}"><canvas data-shell="${w.id}" class="shell-swatch" aria-hidden="true"></canvas></span><span class="tile-name">${w.name}</span><span class="ammo-count">${Number.isFinite(tank.ammo[w.id])?tank.ammo[w.id]:'∞'}</span>${game.selected===w.id?`<span class="selection-tick">${icon('check')}</span>`:''}</button>`).join(''):
    ITEMS.map(i=>{
      const reason=game.itemUnavailable(i.id),waiting=tank.itemReadyTurn[i.id]-tank.turnsTaken;
      return `<button class="inventory-tile item-tile ${reason?'unavailable':''} ${i.id==='teleport'&&game.teleporting?'selected':''}" data-item="${i.id}" ${reason?'disabled':''} title="${i.name}：${reason||i.description}" aria-label="使用${i.name}，剩余 ${tank.items[i.id]} 件${reason?'，'+reason:''}"><span class="weapon-icon" style="--weapon-color:#85927a">${icon(i.icon)}</span><span class="tile-name">${i.name}</span><span class="ammo-count">${tank.items[i.id]}</span><span class="item-hint">${reason||`消耗 ${i.cost} 战术点`}</span><span class="item-cost">${waiting>0?'冷却中':`${i.cost} 点 · ${i.cooldown} 回合冷却`}</span></button>`;
    }).join('');
  $('#inventory-grid').classList.toggle('items-grid',activeTab==='items');
  $('#inventory-grid').setAttribute('aria-label',activeTab==='weapons'?'武器清单':'道具清单');
  $('#weapons-tab').classList.toggle('selected',activeTab==='weapons');$('#items-tab').classList.toggle('selected',activeTab==='items');
  $('#weapons-tab').setAttribute('aria-selected',String(activeTab==='weapons'));$('#items-tab').setAttribute('aria-selected',String(activeTab==='items'));
  paintProjectilePreviews($('#inventory-grid'));renderDetail();
}
function renderDetail(item?:ItemId) {
  const w=weaponById(game.humanTurn?game.selected:displayTank().selectedWeapon);
  if(activeTab==='weapons') {
    const reference=WEAPON_REFERENCE[w.id];
    $('#weapon-detail').innerHTML=`<div class="detail-title"><span>${w.name}</span><span class="weapon-tag">${w.tag}</span></div><p>${w.description}</p><div class="weapon-metrics"><span>单枚伤害 <strong>${w.damage}${w.shots&&w.shots>1?` ×${w.shots}`:''}</strong></span><span>爆炸半径 <strong>${w.radius}m</strong></span><span>挖地 <strong>${w.digRadius} × ${w.digDepth}m</strong></span></div><p class="reference-note">以上为本作参数，原客户端精确数值未确证。${reference?`<br>弹数／核心效果：${reference.sources}支持。${reference.uncertain}。`:''}</p><button class="shell-atlas-button" data-dialog="projectiles">认认炮弹 · 弹体图鉴 ${icon('arrow')}</button>`;
  }
  else {const i=ITEMS.find(i=>i.id===item);$('#weapon-detail').innerHTML=i?`<div class="detail-title"><span>${i.name}</span><span class="weapon-tag">战术道具</span></div><p>${i.description}</p>`:`<div class="detail-title"><span>战术点要用在刀刃上</span>${icon('shield')}</div><p>每回合限用一件，还需战术点、冷却和使用条件。初始 2 点，自己的回合恢复 1 点，上限 4 点。</p><div class="weapon-metrics"><span>战术点 ${displayTank().tactics} / 4 · 每回合 +1</span></div>`;}
}

let lastInventory='';let lastPhase='';
let lastWeapons='';
function updateUI() {
  const t=displayTank(),human=game.humanTurn,lobby=game.phase==='lobby';
  const v=t.vehicleId?vehicleById(t.vehicleId):null;
  const pair=[v?.normal??'shell',v?.special??'heavy','homing'] as WeaponId[];
  $('#weapon-switcher').classList.toggle('hidden',lobby||game.phase==='ended');
  const shownWeapon=human?game.selected:t.selectedWeapon;
  const weaponSignature=`${t.vehicleId}|${game.current}|${shownWeapon}|${t.ammo.homing}`;
  if(weaponSignature!==lastWeapons) {
    pair.forEach((id,i)=>{const w=weaponById(id),button=$<HTMLButtonElement>(['#weapon-normal','#weapon-special','#weapon-bonus'][i]);button.dataset.weapon=id;button.dataset.slot=String(i+1);button.dataset.helpDescription=w.description;button.innerHTML=`<span class="switch-icon" style="color:${w.color}"><canvas data-shell="${w.id}" class="shell-swatch" aria-hidden="true"></canvas></span><span><small>${i===0?'普通 · F3':i===1?'特殊 · F4':'空投 · 稀有'}</small><strong>${w.name}</strong></span>${i===1?`<em>等待 +${w.extraDelay??100}</em>`:''}`;button.classList.toggle('selected',shownWeapon===id);button.setAttribute('aria-pressed',String(shownWeapon===id));button.setAttribute('aria-label',`${i===0?'普通武器':i===1?'特殊武器':'空投武器'}：${w.name}`);});
    $('#weapon-bonus').classList.toggle('hidden',t.ammo.homing<=0);lastWeapons=weaponSignature;paintProjectilePreviews($('#weapon-switcher'));
  }
  ['#weapon-normal','#weapon-special','#weapon-bonus'].forEach((selector,i)=>{$<HTMLButtonElement>(selector).disabled=!human||(t.ammo[pair[i]]??0)<=0;});
  $('#tank-pack-label').textContent=v?' / '+v.name:'';
  $('#instrument-tank').textContent=v?.name??'炮术演习';$('#angle-limits').textContent=`${t.minAngle}–${t.maxAngle}°`;
  $('#energy-fill').style.width=`${t.hp/t.maxHP*100}%`;$('#energy-value').textContent=`${t.hp} / ${t.maxHP}`;$('#mobility-fill').style.width=`${t.fuel}%`;$('#waiting-value').textContent=config.mode==='hotseat'?String(game.delayFor(t,shownWeapon)):'—';$('#previous-power').style.left=`${t.lastPower}%`;
  const quick=['repair','shield','fuel','boost'] as ItemId[];const quickSignature=quick.map(id=>`${id}:${t.items[id]}:${game.itemUnavailable(id)}`).join('|');
  if($('#quick-items').dataset.signature!==quickSignature){$('#quick-items').dataset.signature=quickSignature;$('#quick-items').innerHTML=quick.map((id,i)=>{const item=ITEMS.find(x=>x.id===id)!,reason=game.itemUnavailable(id);return `<button data-item="${id}" ${reason?'disabled':''} data-help-name="${item.name}" data-help-description="${reason||item.description}" title="${item.name} · F${9+i}${reason?' · '+reason:''}" aria-label="快捷使用${item.name}">${icon(item.icon)}<span>${["维修","护盾","燃料","强化"][i]}</span><small>${t.items[id]}</small></button>`;}).join('');}
  $('.wait-readout').dataset.helpDescription=config.mode==='ai'?'AI 对局严格交替行动，DELAY 排序已关闭。':'普通 +100，特殊 +200，道具 +200，耗时每秒 +10，移动也累加。低等待可连续行动。';
  $('#pwa-update').classList.toggle('hidden',!pendingUpdate||(!lobby&&game.phase!=='ended'));
  $('.battle-stage').classList.toggle('started',!lobby);
  $('#move-left').setAttribute('aria-label','向左移动，长按持续行驶并转向左侧');
  $('#move-right').setAttribute('aria-label','向右移动，长按持续行驶并转向右侧');
  $('#move-left .icon').style.transform='';
  $('#move-right .icon').style.transform='';
  $('#mode-label').textContent=config.mode==='ai'?'单人演习':'双人热座';
  const difficulty=DIFFICULTIES.find(d=>d.id===config.difficulty)!;
  $('#difficulty-label').textContent=config.mode==='ai'?`${difficulty.name} AI`:'本地双人对决';
  $('#role-0').textContent=config.mode==='hotseat'?'玩家 1':'你';
  $('#role-1').textContent=config.mode==='hotseat'?'玩家 2':`${difficulty.name} AI`;
  game.tanks.forEach((tank,i)=>{
    $(`#hp-${i}`).innerHTML=`${tank.hp} <small>/ ${tank.maxHP}</small>`;
    $(`#hp-bar-${i}`).style.width=`${tank.hp/tank.maxHP*100}%`;
    $(`#hp-bar-${i}`).classList.toggle('critical',tank.hp<=tank.maxHP*(tank.vehicleId==='sea'?.5:.3));
    const statuses=[tank.reaction?.kind==='direct'?'哭泣中':tank.reaction?.kind==='graze'?'擦伤':tank.reaction?.kind==='fall'?'摔得晕乎乎':tank.hp>0&&tank.hp<tank.maxHP/3?'喘气中':'',tank.shield?`护盾 ${tank.shield}`:'',tank.frozen?`冻结 ${tank.frozen}`:'',tank.boost?'火力强化':'',tank.doubleShot?'双发装填':'',tank.poisoned?'中毒':'',tank.immobile?`冰冻 ${tank.immobile}`:''].filter(Boolean);
    $(`#status-${i}`).textContent=tank.hp<=0?'暂别战场':(tank.vehicleId?vehicleById(tank.vehicleId).name+' · ':'')+(statuses.join(' · ')||'状态良好');
    if(game.fog&&i!==game.viewer&&game.phase!=='ended') {$(`#hp-${i}`).innerHTML='? <small>/ ${tank.maxHP}</small>';$(`#hp-bar-${i}`).style.width='100%';$(`#hp-bar-${i}`).classList.remove('critical');$(`#status-${i}`).textContent='浓雾中 · 位置未知';}
    const portrait=$<HTMLButtonElement>(`.${i===0?'pink':'green'} .portrait-button`);portrait.dataset.helpName=tank.name;portrait.dataset.helpDescription=`${$(`#status-${i}`).textContent} · 生命 ${$(`#hp-${i}`).textContent}`;
  });
  $('#map-label').textContent=MAPS.find(m=>m.id===config.map)!.name+(game.fog?` · 浓雾 ${game.fogTurnsRemaining}`:'')+(game.snow?' · 飘雪':'');
  $('#map-code').textContent=String(MAPS.findIndex(m=>m.id===config.map)+1).padStart(2,'0');
  $('#wind-label').textContent=Math.abs(game.wind)<0.5?'风平浪静':`${game.wind>0?'→':'←'} ${(Math.abs(game.wind)/2).toFixed(1)} m/s`;
  $('#gravity-note').textContent=config.map==='moon'?'重力 0.63 g':'重力 1.0 g';
  $('#field-note').textContent=game.phase==='supply'?'空投受风影响 · 计时暂停':game.teleporting?'点击 230 米内的地面传送':game.selected==='airstrike'?'点击战场指定空袭落点':MAPS.find(m=>m.id===config.map)!.sub;
  if(game.fireLine) $('#field-note').textContent+=' · 火线穿越伤害 +50%';
  $('#minimap-toggle').dataset.helpDescription=`${MAPS.find(m=>m.id===config.map)!.description} ${$('#field-note').textContent} · ${$('#gravity-note').textContent}。轻点折叠或展开，点击地图定位视野。`;
  $('#lobby-overlay').classList.toggle('hidden',!lobby);
  $('#turn-indicator').classList.toggle('hidden',lobby||game.phase==='ended'||game.phase==='handoff');
  $('#timer').classList.toggle('hidden',lobby||game.phase==='ended'||game.phase==='handoff'||config.timer===0);
  $('#turn-text').textContent=game.phase==='supply'?'补给正在空降 · 计时暂停':game.phase==='flying'?'炮弹飞行中':game.phase==='resolving'?'观察战场…':config.mode==='ai'&&game.current===1?'大猪头爸爸正在瞄准…':game.current===0?'轮到咪猪头了':'轮到大猪头爸爸了';
  $('#turn-indicator').classList.toggle('opponent-turn',game.current===1);
  $('#round-text').textContent=game.round>=21?'决胜时刻':`第 ${String(game.round).padStart(2,'0')} 轮`;
  $('#timer span').textContent=String(Math.ceil(Math.max(0,game.clock))).padStart(2,'0');$('#timer').classList.toggle('urgent',game.clock<10);
  $('#angle-value').textContent=String(Math.round(t.angle));$('#power-value').textContent=String(Math.round(t.power));
  const angle=$<HTMLInputElement>('#angle'),power=$<HTMLInputElement>('#power');
  angle.min=String(t.minAngle);angle.max=String(t.maxAngle);angle.value=String(t.angle);power.value=String(t.power);
  angle.style.setProperty('--range-fill',`${(t.angle-t.minAngle)/(t.maxAngle-t.minAngle)*100}%`);power.style.setProperty('--range-fill',`${(t.power-10)/90*100}%`);
  angle.disabled=!human;power.disabled=!human;
  $('.control-deck').classList.toggle('inactive',!human);$<HTMLButtonElement>('#power-meter').disabled=!human||game.teleporting||t.fallVelocity>0;$<HTMLButtonElement>('#skip-button').disabled=!human;
  document.querySelectorAll<HTMLButtonElement>('.step-button, .move-buttons button, #face-button, #aim-pad').forEach(b=>b.disabled=!human);
  $('#face-button span').textContent=t.direction===1?'朝右':'朝左';
  $('#charge-fill').style.width=`${t.power}%`;
  $('#fire-button').classList.toggle('charging',Boolean(charge));
  $('#fire-button').style.setProperty('--charge',`${t.power}%`);
  $('#fire-title').textContent=charge?'蓄力中':'开火';
  $('#fire-subtitle').textContent=charge?'松手发射':'按住 / SPACE';
  $('#fuel-value').textContent=String(Math.floor(t.fuel));$('#move-note').textContent=t.immobile?'紫冻水 · 暂时不能移动':t.frozen?'冰冻中 · 移动耗油加倍':t.vehicleId?`本回合最多移动 ${Math.round(t.moveDistance)}m`:'长按移动 · 每回合补充 18';
  if(t.immobile>0){$<HTMLButtonElement>('#move-left').disabled=true;$<HTMLButtonElement>('#move-right').disabled=true;}
  $<HTMLButtonElement>('#fire-button').disabled=!human||game.teleporting||t.fallVelocity>0;
  $('#fire-note').textContent=game.phase==='supply'?'空投阶段不消耗回合时间':lobby?'先进入战场':game.phase==='flying'||game.phase==='resolving'?'欣赏这条抛物线':game.paused?'游戏已暂停':game.phase==='ended'?'下一局见':game.phase==='handoff'?'交给下一位队长':!human?'等待对手行动':game.teleporting?'先选择传送落点':t.doubleShot?'双发装填已就绪':t.boost?'强化炮弹已就绪':`${weaponById(game.selected).name}已就绪`;
  $<HTMLButtonElement>('#pause-button').disabled=lobby||game.phase==='ended'||game.phase==='handoff';
  $('#pause-button').innerHTML=icon(game.paused?'play':'pause');$('#pause-button').setAttribute('aria-label',game.paused?'继续游戏':'暂停游戏');
  const signature=`${activeTab}|${t.vehicleId}|${game.selected}|${game.current}|${game.teleporting}|${t.itemUsed}|${t.tactics}|${ITEMS.map(i=>game.itemUnavailable(i.id)).join(',')}|${JSON.stringify(t.ammo)}|${JSON.stringify(t.items)}`;
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
function begin() {audio.unlock();game.start();setImmersive(true);lastPhase='';updateUI();const lucky=game.tanks.filter(t=>t.vehicleId==='dragon');if(lucky.length)toast(`惊喜！${lucky.map(t=>t.name).join('、')}抽中了隐藏款暴龙。`);}
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
  dialog.classList.toggle('setup-dialog',type==='setup');dialog.classList.toggle('projectile-dialog',type==='projectiles');const content=$('#dialog-content');
  if(type.startsWith('portrait:')) {
    const id=Number(type.split(':')[1]),name=id===0?'咪猪头':'大猪头爸爸';
    const sayings=id===0?['今天也要可可爱爱地开炮！','摸摸猪头，准头 +1！','这发炮弹，带一点甜。','先听听风，再认真瞄准。']:['别怕，爸爸也会打歪。','装甲厚一点，心软一点。','哼哼，轮到爸爸了！','不着急，咱们慢慢瞄。'];
    content.innerHTML=`<div class="portrait-view"><span class="eyebrow">认识一下，你的炮手</span><h2>${name}</h2><button id="portrait-art" class="portrait-art" aria-label="戳戳${name}"><img src="${import.meta.env.BASE_URL}portraits/${id===0?'mimi':'dad'}.png" alt="${name}大头像"/><span class="portrait-touch-hint">轻轻戳一下</span></button><p id="portrait-saying" class="portrait-saying">${sayings[0]}</p><button class="button button-dark dialog-primary" data-action="close">带着好心情，回战场 ${icon('arrow')}</button></div>`;
    let taps=0;
    $('#portrait-art').addEventListener('click',()=>{
      $('#portrait-saying').textContent=sayings[++taps%sayings.length];
      const art=$('#portrait-art');art.classList.remove('boop');void art.offsetWidth;art.classList.add('boop');
      const heart=document.createElement('span');heart.className='portrait-heart';heart.innerHTML=icon('heart');heart.style.left=`${30+(taps*17)%45}%`;art.appendChild(heart);window.setTimeout(()=>heart.remove(),900);
    });
  } else if(type==='setup') {
    content.innerHTML=`<span class="eyebrow">选择你的经典战车</span><h2>今天，开哪一辆？</h2><p class="dialog-intro">每辆坦克自带普通与特殊武器，进入战场后直接切换。选择会记住，随机有 1/10 机会遇见暴龙。</p><form id="setup-form"><div class="setup-layout"><div class="setup-options"><label class="form-label">作战模式</label><div class="choice-row mode-choices"><label class="choice-card"><input type="radio" name="mode" value="ai" ${config.mode==='ai'?'checked':''}/><span>${icon('target')}<strong>挑战 AI</strong><small>与大猪头爸爸切磋</small></span></label><label class="choice-card"><input type="radio" name="mode" value="hotseat" ${config.mode==='hotseat'?'checked':''}/><span>${icon('pig')}<strong>双人热座</strong><small>一台电脑，两位队长</small></span></label></div><div id="difficulty-section"><label class="form-label" for="difficulty">AI 难度</label><select id="difficulty" name="difficulty">${DIFFICULTIES.map(d=>`<option value="${d.id}" ${config.difficulty===d.id?'selected':''}>${d.name} · ${d.sub}</option>`).join('')}</select></div><label class="form-label">选择战场</label><div class="choice-row map-choices">${MAPS.map((m,i)=>`<label class="choice-card map-choice"><input type="radio" name="map" value="${m.id}" ${config.map===m.id?'checked':''}/><span><canvas class="map-choice-art" data-map-preview="${m.id}" aria-label="${m.name}地形预览"></canvas><strong>${m.name}</strong><small>${m.sub.split(' · ')[0]}</small></span></label>`).join('')}</div><details class="map-notes"><summary>地图说明与依据</summary><p id="map-choice-note"></p></details><label class="weather-choice"><input type="checkbox" name="snow" ${config.snow?'checked':''}/><span>${icon('ice')} 飘雪天气 <small>灭火散毒 · 水鬼增强</small></span></label><label class="form-label" for="turn-timer">每回合时间</label><select id="turn-timer" name="timer">${[[30,'30 秒 · 快节奏'],[45,'45 秒 · 从容瞄准'],[60,'60 秒 · 细细思考'],[0,'不限时 · 慢慢来']].map(([v,n])=>`<option value="${v}" ${config.timer===v?'selected':''}>${n}</option>`).join('')}</select></div><div class="setup-vehicles"><div class="vehicle-owner-tabs"><button type="button" data-owner="0" class="selected">咪猪头的坦克</button><button type="button" data-owner="1">大猪头爸爸的坦克</button></div><input type="hidden" name="vehicle0" value="${config.vehicle0??'random'}"/><input type="hidden" name="vehicle1" value="${config.vehicle1??'random'}"/><div id="vehicle-gallery" class="vehicle-gallery"></div><div id="vehicle-preview" class="vehicle-preview"></div></div></div>${game.phase!=='lobby'&&game.phase!=='ended'?'<p class="replace-note">开始新对局将结束当前这场演习。</p>':''}<button class="button button-dark dialog-primary" type="submit">${game.phase==='lobby'?'开始对局':'开始新对局'} ${icon('arrow')}</button></form>`;
    let owner=0;
    const renderGallery=()=>{
      const choice=$<HTMLInputElement>(`input[name="vehicle${owner}"]`).value;
      $('#vehicle-gallery').innerHTML=`<button type="button" class="vehicle-card random ${choice==='random'?'selected':''}" data-choice="random">${icon('refresh')}<strong>随机上阵</strong><small>1/10 抽中暴龙</small></button>`+VEHICLES.map(v=>`<button type="button" class="vehicle-card ${choice===v.id?'selected':''} ${v.hidden?'hidden-model':''}" data-choice="${v.id}">${vehicleIcon(v)}<strong>${v.name}</strong><small>${v.hidden?'隐藏 · 随机获得':v.era}</small></button>`).join('');
      const v=VEHICLES.find(v=>v.id===choice);
      $('#vehicle-preview').innerHTML=v?`<div><strong>${v.name}</strong><span>${v.trait}</span></div><div class="vehicle-stats"><span>生命 <b>${v.hp}</b></span><span>仰角 <b>${v.minAngle}–${v.maxAngle}°</b></span><span>移动 <b>${v.movement*3}m</b></span><span>等待 <b>${v.waiting}</b></span><span>射程 <b>${v.range>=1.1?'远程':v.range>=1.05?'较远':'标准'}</b></span></div><p>普通：${weaponById(v.normal).name} / 特殊：${weaponById(v.special).name}</p>`:`<div><strong>让命运发车</strong><span>每次开局重新抽取；常规坦克机会均等。</span></div><p>12 款经典战车 + 10% 隐藏款暴龙。仍会记住「随机」的选择。</p>`;
      $('#vehicle-gallery').querySelectorAll<HTMLElement>('[data-choice]').forEach(button=>button.addEventListener('click',()=>{const selected=button.dataset.choice;if(selected==='dragon'){toast('暴龙只在随机抽取时出现，概率 1/10。');return;} $<HTMLInputElement>(`input[name="vehicle${owner}"]`).value=selected!;renderGallery();}));
    };
    document.querySelectorAll<HTMLElement>('[data-owner]').forEach(button=>button.addEventListener('click',()=>{owner=Number(button.dataset.owner);document.querySelectorAll('[data-owner]').forEach(el=>el.classList.toggle('selected',el===button));renderGallery();}));renderGallery();
    paintMapChoices();
    const updateMapNote=()=>{$('#map-choice-note').textContent=MAPS.find(m=>m.id===$<HTMLInputElement>('input[name="map"]:checked').value)!.description;};
    document.querySelectorAll('input[name="map"]').forEach(input=>input.addEventListener('change',updateMapNote));updateMapNote();
    const sync=()=>$('#difficulty-section').classList.toggle('hidden',$<HTMLInputElement>('input[name="mode"]:checked').value==='hotseat');
    document.querySelectorAll('input[name="mode"]').forEach(el=>el.addEventListener('change',sync));sync();
    $('#setup-form').addEventListener('submit',e=>{
      e.preventDefault();const data=new FormData(e.target as HTMLFormElement);
      const next={...config,mode:data.get('mode') as Config['mode'],difficulty:data.get('difficulty') as Config['difficulty'],map:data.get('map') as Config['map'],timer:Number(data.get('timer')),snow:data.get('snow')==='on',vehicle0:data.get('vehicle0') as VehicleChoice,vehicle1:data.get('vehicle1') as VehicleChoice};
      closeDialog();newMatch(next);
    });
  } else if(type==='exit') {content.innerHTML=`<span class="eyebrow">暂别这一场炮火</span><h2>回演习场歇一歇？</h2><p class="dialog-intro">当前对局会结束，坦克选择与设置会保留。</p><button class="button button-dark dialog-primary" data-action="leave-match">回到演习场</button><button class="text-button" data-action="close">继续这场对局</button>`;
  } else if(type==='install') {
    content.innerHTML=`<span class="eyebrow">把战场装进口袋</span><h2>安装到 iPad。</h2><p class="dialog-intro">首次打开并完成离线缓存后，就能从主屏幕直接进入游戏，离线也可以开战。</p><div class="install-art"><img src="${import.meta.env.BASE_URL}icons/icon-192.png" alt="咪猪头坦克图标"/><strong>咪猪头的疯狂坦克</strong></div><ol class="install-steps"><li>用 Safari 打开游戏。</li><li>点击分享按钮，选择「添加到主屏幕」。</li><li>点「添加」，再从主屏幕打开。横过 iPad，就可以开始了。</li></ol><button class="button button-dark dialog-primary" data-action="close">知道啦 ${icon('check')}</button>`;
  } else if(type==='projectiles') {
    const shells=[...VEHICLE_WEAPONS,weaponById('homing')];
    content.innerHTML=`<span class="eyebrow">小炮手的认弹手册</span><h2>看看这一发，长什么样</h2><p class="dialog-intro">26 种坦克炮弹 + 稀有空投弹。这里展示单枚，形状和颜色与战场一致。</p><div class="shell-gallery">${shells.map(w=>`<article><canvas class="shell-card-art" data-shell="${w.id}" aria-label="${w.name}弹体"></canvas><strong>${w.name}</strong><small>${VEHICLES.find(v=>v.normal===w.id||v.special===w.id)?.name??'稀有空投'} · ${w.shots??1} 枚${w.effect==='homing'?' · 追踪':''}</small></article>`).join('')}</div><div class="atlas-footer"><span>弹体为本作重新绘制，数值为 Web 版配置</span><a href="${HISTORICAL_GUIDE}" target="_blank" rel="noopener">查看旧版攻略</a></div><button class="button button-dark dialog-primary" data-action="close">认好了，去开炮 ${icon('arrow')}</button>`;
  } else if(type==='guide') {
    content.innerHTML=guideMarkup();
  } else if(type==='stats') {
    content.innerHTML=`<span class="eyebrow">每一发，都算数</span><h2>你的炮手履历。</h2><p class="dialog-intro">留在这台设备上的小小战绩，记录咪猪头完成的对局。</p><div class="stats-grid"><div><strong>${stats.games}</strong><span>完成对局</span></div><div><strong>${stats.wins}</strong><span>咪猪头获胜</span></div><div><strong>${stats.shots}</strong><span>发射次数</span></div><div><strong>${stats.damage}</strong><span>累计伤害</span></div></div><div class="stats-empty">${icon('trophy')}<p>${stats.games?'好准头都是练出来的。下一局，也许更漂亮。':'第一枚勋章，正等着你的第一场胜利。'}</p></div><button class="button button-dark dialog-primary" data-action="close">回到战场 ${icon('arrow')}</button>`;
  } else if(type==='log') {
    content.innerHTML=`<span class="eyebrow">战场里的那些瞬间</span><h2>作战记录。</h2><p class="dialog-intro">最近 24 条事件 · 当前第 ${game.round} 轮</p><ol class="battle-log">${game.log.length?game.log.map((line,i)=>`<li><span>${String(game.log.length-i).padStart(2,'0')}</span>${line}</li>`).join(''):'<li>战场很安静。第一发炮弹会写下故事。</li>'}</ol><button class="button button-dark dialog-primary" data-action="close">返回对局 ${icon('arrow')}</button>`;
  } else {
    content.innerHTML=`<span class="eyebrow">照你喜欢的来</span><h2>一点小设置。</h2><p class="dialog-intro">给战场加一点声音，或安静地享受瞄准。</p><div class="settings-row"><div><strong>音乐与音效</strong><p>轻快的背景音乐，发射与爆炸反馈</p></div><button id="audio-toggle" class="toggle ${audio.enabled?'on':''}" role="switch" aria-checked="${audio.enabled}" aria-label="音乐与音效"><span></span></button></div><label class="form-label" for="volume">音量 <span id="volume-percent">${Math.round(audio.volume*100)}%</span></label><input id="volume" type="range" min="0" max="100" value="${Math.round(audio.volume*100)}"/><div class="settings-note">${icon('music')}<p>背景音乐与部分音效来自你提供的 piggymicharacter3 素材；炮火声由音频合成生成。</p></div><button class="button button-dark dialog-primary" data-action="close">设置好了 ${icon('check')}</button>`;
    $('#audio-toggle').addEventListener('click',()=>{audio.unlock();audio.setEnabled(!audio.enabled);$('#audio-toggle').classList.toggle('on',audio.enabled);$('#audio-toggle').setAttribute('aria-checked',String(audio.enabled));updateSound();persistSettings();});
    $('#volume').addEventListener('input',e=>{audio.setVolume(Number((e.target as HTMLInputElement).value)/100);$('#volume-percent').textContent=`${Math.round(audio.volume*100)}%`;persistSettings();});
  }
  if(!dialog.open) dialog.showModal();paintProjectilePreviews(dialog);
}
function closeDialog() {const dialog=$<HTMLDialogElement>('#dialog');dialog.close();game.paused=dialogPaused;audio.pause(game.paused);updateOverlay();updateUI();}

let lastControlSound=0;
function controlSound(target:HTMLElement) {
  const control=target.closest<HTMLElement>('button,a,select,summary,.choice-card,.weather-choice')??target.closest<HTMLElement>('canvas');
  if(!control||control.matches(':disabled')) return;
  audio.unlock();audio.play('click');
}
document.addEventListener('pointerdown',e=>controlSound(e.target as HTMLElement),true);
document.addEventListener('click',e=>{if(e.detail===0) controlSound(e.target as HTMLElement);},true);
document.addEventListener('input',e=>{if((e.target as HTMLElement).matches('input[type="range"]')&&performance.now()-lastControlSound>70){audio.play('aim');lastControlSound=performance.now();}},true);
document.addEventListener('change',e=>{if((e.target as HTMLElement).matches('input,select'))audio.play('aim');},true);
document.addEventListener('click',e=>{
  const target=e.target as HTMLElement;
  const portrait=target.closest<HTMLElement>('[data-portrait]');if(portrait){showDialog(`portrait:${portrait.dataset.portrait}`);return;}
  const dialogButton=target.closest<HTMLElement>('[data-dialog]');if(dialogButton) {showDialog(dialogButton.dataset.dialog!);return;}
  const action=target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if(action==='close') closeDialog();
  if(action==='leave-match'){closeDialog();newMatch(config,false);}
  if(action==='resume') togglePause();
  if(action==='handoff') {game.acceptHandoff();audio.unlock();lastPhase='';updateUI();}
  if(action==='rematch') newMatch(config);
  const adjust=target.closest<HTMLElement>('[data-adjust]')?.dataset.adjust;
  if(adjust&&game.humanTurn) {const [key,step]=adjust.split(':');game.setAim(game.active.angle+(key==='angle'?Number(step):0),game.active.power+(key==='power'?Number(step):0));updateUI();}
  const weapon=target.closest<HTMLElement>('[data-weapon]')?.dataset.weapon as WeaponId|undefined;
  if(weapon) {
    if(game.phase==='lobby') {game.selected=weapon;lastInventory='';updateUI();return;}
    if(!game.humanTurn) {toast('等轮到你，再选择武器。');return;}
    if(game.selectWeapon(weapon)) {lastInventory='';updateUI();}else toast(weapon==='homing'?'猎星追踪弹只能从空投箱获得。':'这件武器的弹药用完了。');
  }
  const item=target.closest<HTMLElement>('[data-item]')?.dataset.item as ItemId|undefined;
  if(item) {
    renderDetail(item);
    if(!game.humanTurn) {toast('道具要在自己的回合使用。');return;}
    if(game.useItem(item)) {toast(item==='teleport'?'点击 230 米内的地面进行传送。':`${ITEMS.find(i=>i.id===item)!.name}已使用。`);lastInventory='';updateUI();}
    else toast(game.itemUnavailable(item)||'当前不能使用这件道具。');
  }
});
$('#start-button').addEventListener('click',()=>showDialog('setup'));
$('#new-game').addEventListener('click',()=>showDialog('setup'));
$('#sound-button').addEventListener('click',()=>{audio.unlock();audio.setEnabled(!audio.enabled);if(audio.enabled)audio.play('click');updateSound();persistSettings();toast(audio.enabled?'音乐与音效已开启。':'已切换为安静模式。');});
$('#pause-button').addEventListener('click',togglePause);
$('#skip-button').addEventListener('click',()=>{cancelCharge();game.skipTurn();updateUI();});
$('#exit-match').addEventListener('click',()=>showDialog('exit'));
function toggleMinimap(){const collapsed=$('#minimap-panel').classList.toggle('collapsed');$('#minimap-toggle').setAttribute('aria-expanded',String(!collapsed));$('#minimap-toggle').setAttribute('aria-label',collapsed?'展开小地图':'折叠小地图');}
$('#minimap-toggle').addEventListener('click',toggleMinimap);
$('#minimap-follow').addEventListener('click',()=>renderer.follow());
$('#minimap').addEventListener('pointerdown',e=>{const r=$('#minimap').getBoundingClientRect();renderer.focusAt((e.clientY-r.top)/r.height*TERRAIN_H);});
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
function startCharge(pointer:number|null) {
  if(!game.humanTurn||game.teleporting||game.active.fallVelocity>0||charge) return false;
  setDrawer(false);charge={pointer,startedAt:performance.now(),previousPower:game.active.power,tank:game.current};
  audio.unlock();audio.startCharge();game.setAim(game.active.angle,10);updateUI();return true;
}
function cancelCharge() {
  audio.stopCharge();
  if(charge) {game.tanks[charge.tank].power=charge.previousPower;charge=null;}
}
function finishCharge() {
  if(!charge) return;
  audio.stopCharge();
  const tank=charge.tank,power=chargePower((performance.now()-charge.startedAt)/1000);charge=null;
  if(game.humanTurn&&game.current===tank) game.setAim(game.active.angle,power);
  if(game.humanTurn&&game.current===tank) game.fire();updateUI();
}
const fireButton=$<HTMLButtonElement>('#fire-button');
fireButton.addEventListener('pointerdown',e=>{if(startCharge(e.pointerId)){e.preventDefault();fireButton.setPointerCapture(e.pointerId);}});

fireButton.addEventListener('pointerup',e=>{if(charge?.pointer===e.pointerId){e.preventDefault();finishCharge();}});
fireButton.addEventListener('pointercancel',()=>{cancelCharge();updateUI();});
fireButton.addEventListener('lostpointercapture',()=>{if(charge?.pointer!==null){cancelCharge();updateUI();}});
const forceBar=$<HTMLButtonElement>('#power-meter');
forceBar.addEventListener('pointerdown',e=>{if(startCharge(e.pointerId)){e.preventDefault();forceBar.setPointerCapture(e.pointerId);}});
forceBar.addEventListener('pointerup',e=>{if(charge?.pointer===e.pointerId){e.preventDefault();finishCharge();}});
forceBar.addEventListener('pointercancel',()=>{cancelCharge();updateUI();});
forceBar.addEventListener('lostpointercapture',()=>{if(charge?.pointer!==null){cancelCharge();updateUI();}});
forceBar.addEventListener('contextmenu',e=>e.preventDefault());
fireButton.addEventListener('contextmenu',e=>e.preventDefault());
fireButton.addEventListener('click',e=>{if(e.detail===0&&!charge&&game.humanTurn){audio.unlock();game.fire();updateUI();}});

let padDrag:number|null=null;
const aimPad=$<HTMLButtonElement>('#aim-pad');
function instrumentAim(e:PointerEvent){const r=aimPad.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=r.top+r.height/2-e.clientY;if(Math.hypot(dx,dy)<12)return;game.face(dx>=0?1:-1);game.setAim(Math.atan2(dy,Math.abs(dx))*180/Math.PI,game.active.power);updateUI();}
aimPad.addEventListener('pointerdown',e=>{if(!game.humanTurn) return;e.preventDefault();padDrag=e.pointerId;aimPad.setPointerCapture(e.pointerId);aimPad.classList.add('dragging');instrumentAim(e);});
aimPad.addEventListener('pointermove',e=>{if(padDrag===e.pointerId) instrumentAim(e);});
const endPad=()=>{padDrag=null;aimPad.classList.remove('dragging');};
aimPad.addEventListener('pointerup',endPad);aimPad.addEventListener('pointercancel',endPad);aimPad.addEventListener('lostpointercapture',endPad);
aimPad.addEventListener('contextmenu',e=>e.preventDefault());

function bindMove(id:string,direction:number) {
  const button=$<HTMLButtonElement>(id);
  button.addEventListener('pointerdown',e=>{if(!game.humanTurn) return;e.preventDefault();moveHeld=direction;button.setPointerCapture(e.pointerId);game.move(direction,1/30);});
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
    game.setAim(angle,game.active.power);
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
  if(key==='tab'&&game.phase!=='lobby'){e.preventDefault();toggleMinimap();audio.play('click');return;}
  if(key==='c'&&e.ctrlKey){e.preventDefault();renderer.follow();return;}
  if(!game.humanTurn) return;
  if((key==='f3'||key==='f4')&&game.active.vehicleId){e.preventDefault();const v=vehicleById(game.active.vehicleId);if(game.selectWeapon(key==='f3'?v.normal:v.special)) {audio.play('click');updateUI();}return;}
  if(key==='f5'){e.preventDefault();cancelCharge();game.skipTurn();updateUI();return;}
  if(['f9','f10','f11','f12'].includes(key)){e.preventDefault();const id=(['repair','shield','fuel','boost'] as ItemId[])[Number(key.slice(1))-9];if(game.useItem(id))updateUI();else toast(game.itemUnavailable(id)??'当前不能使用');return;}
  if(['arrowleft','arrowright','arrowup','arrowdown'].includes(key)){e.preventDefault();keys.add(key);}
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
    if(charge&&charge.tank===game.current) {game.setAim(game.active.angle,chargePower((now-charge.startedAt)/1000));audio.updateCharge(game.active.power);}
    const direction=moveHeld||(keys.has('a')||keys.has('arrowleft')?-1:keys.has('d')||keys.has('arrowright')?1:0);if(direction) game.move(direction,dt);
    const angle=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),power=(keys.has('e')?1:0)-(keys.has('q')?1:0);
    if(angle||power) game.setAim(game.active.angle+angle*35*dt,game.active.power+power*28*dt);
  }
  game.update(dt);renderer.draw(dt);dashboard.draw(game,config.mode==='ai'?game.tanks[0]:game.active,renderer.offsetY,renderer.viewHeight);
  const moving=game.movingUntil.findIndex(until=>until>game.elapsed);
  audio.updateMovement(moving>=0&&game.phase==='aiming'&&!game.paused,game.tanks[Math.max(0,moving)].x,game.tanks[game.viewer].x);
  const tracking=game.projectiles.find(p=>p.homing);audio.updateTracking(Boolean(tracking)&&!game.paused&&game.phase==='flying',tracking?.weapon,tracking?.x??0,game.tanks[game.viewer].x);
  if(charge&&(!game.humanTurn||charge.tank!==game.current)) cancelCharge();
  for(const event of game.drainEvents()) {
    if(event.type!=='explosion') $('#battle-message').textContent=event.message;
    if(event.type==='shot') audio.play('shot',event.x,game.tanks[game.viewer].x,event.weapon);
    if(event.type==='explosion') audio.play('explosion',event.x,game.tanks[game.viewer].x,event.weapon);
    if(event.type==='weather')toast(event.message);
    if(event.type==='win') audio.play('win');
    if(event.type==='crate') audio.play('item',event.x,game.tanks[game.viewer].x);
    if(event.type==='item') audio.play('item',event.x,game.tanks[game.viewer].x);
    if(event.type==='lock') audio.play('lock',event.x,game.tanks[game.viewer].x,event.weapon);
    if(event.type==='crate-land') audio.play('crate-land',event.x,game.tanks[game.viewer].x);
  }
  if(now-lastUI>80) {updateUI();lastUI=now;}
  requestAnimationFrame(frame);
}
setImmersive(false);renderInventory();updateSound();updateUI();requestAnimationFrame(frame);
const updateSW=registerSW({
  immediate:true,
  onNeedRefresh(){pendingUpdate=true;updateUI();toast(game.phase==='lobby'||game.phase==='ended'?'新版本已准备好，点击「更新游戏」即可安装。':'新版本已准备好，本局结束后可更新。');},
  onRegisteredSW(_url,registration){swRegistration=registration;},
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
async function checkForUpdate() {
  if(checkingVersion) return;checkingVersion=true;
  const buttons=['#version-button','#stage-version-button'].map(selector=>$<HTMLButtonElement>(selector));
  buttons.forEach(b=>{b.disabled=true;b.textContent='检查中…';});
  try {
    const response=await fetch(`${import.meta.env.BASE_URL}version.json?check=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw new Error('Version check failed');
    const latest=await response.json();const newer=compareVersions(latest.version,APP_VERSION)>0;
    if(swRegistration) await swRegistration.update();
    if(swRegistration?.waiting) {pendingUpdate=true;updateUI();}
    if(pendingUpdate) toast(game.phase==='lobby'||game.phase==='ended'?'更新已就绪，点击「更新游戏」。':'更新已就绪，本局结束后可安装。');
    else if(newer) toast(`发现 v${latest.version}，正在准备更新；准备好后会提示。`);
    else toast(`当前已是最新版本 v${APP_VERSION}。`);
  } catch {toast(navigator.onLine?'暂时无法检查更新，请稍后再试。':`当前离线，正在使用 v${APP_VERSION}，联网后可检查更新。`);}
  finally {checkingVersion=false;buttons.forEach(b=>{b.disabled=false;b.textContent=b.id==='stage-version-button'?`v${APP_VERSION}`:`v${APP_VERSION} · 检查更新`;});}
}
$('#version-button').addEventListener('click',checkForUpdate);
$('#stage-version-button').addEventListener('click',checkForUpdate);
