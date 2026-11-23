import {KeyboardMove,isMoveKey} from './keyboard-move';
import {PowerAssistance} from './power-assistance';
import {defeatPerspective} from './combat-preferences';
import {UpdateProgress} from './update-progress';
import {progressMarkup,showProgress} from './loading-progress';
import {RELEASE_NOTES,readRelease,consumeUpdateReceipt,UPDATE_RECEIPT} from './release-notes';
import {installEdgePanning} from './edge-pan';
import {abandonmentWinner} from './exit-rules';
import {titleMarkup,equipAchievement} from './achievement-titles';
import {battleResultMarkup} from './battle-results';
import {matchPolish,powerDisplay} from './match-polish';
import {installPowerMarkers} from './power-markers';
import {readProgression,freshProgression,rankIndex,settleProgression,PROGRESSION_KEY,type Settlement,type Competition} from './progression';
import {medalSvg} from './medal-art';
import {progressionMarkup} from './progression-ui';
import {modernWeather} from './weather';
import {repairGameAssets,assetRepairDiagnostics,retryBrokenMaterialImages,retryMaterialFonts} from './asset-repair';
import {retryBattleSprites} from './battle-sprites';
import './style.css';
import './web-select.css';
import {ImpactProfiler} from './impact-profiler';
import {snapshotText} from './battle-trace';
import {legacyMapBgmFile} from './map-music';
import { Game, clamp, type Config,type Tank } from './engine';
import { Renderer } from './renderer';
import {installCrewPortraits,repairCrewPortraits,retryUnavailableCrewPortraits,portraitDiagnostics} from './crew-portraits';
import { AudioManager } from './audio';
import { DIFFICULTIES, ITEMS, MAPS, WEAPONS, weaponById,weaponDamage,weaponBlastRadius,excavation, type ItemId, type WeaponId } from './catalog';
import { icon,pigHeadSvg } from './icons';
import {MIN_POWER} from './ballistics';
import { heldChargePower,chargeDelayProgress,chargePreparationSeconds,CHARGE_DELAY_SECONDS } from './interaction';
import {installMobileGestureGuards} from './mobile-gestures';
import {installAngleNudges} from './angle-nudges';
import {chooseResultPosition} from './result-layout';
import { registerSW } from 'virtual:pwa-register';
import {applyWaitingUpdate} from './pwa-update';
import { compareVersions } from './version';
import {VEHICLES,VEHICLE_WEAPONS,vehicleById,validChoice,type VehicleChoice} from './vehicles';
import {vehicleIcon,paintProjectilePreviews} from './vehicle-art';
import {DashboardView} from './dashboard';
import {guideMarkup} from './guide';
import {isRedHealth,isRaging} from './health';
import {TURN_ITEMS} from './catalog';
import {CREW,crewAvatar,defaultSlots,normalizeSlots,teamFlag,flagIcon,nameMarkup} from './crew';
import {setupMarkup,mountSetup} from './setup';
import {relativeAimForVector} from './aim';
import {itemIcon} from './item-art';
import {weaponHint} from './weapon-hints';
import {installControlHints} from './control-hints';
import {paintMapOverview} from './map-preview';
import {freshMatchSeed} from './match-seed';
import {updateWindGauge} from './wind-gauge';
import {DEFAULT_TURN_TIMER,storedTurnTimer,TIMER_PREFERENCE_VERSION} from './turn-timer';
import {installMapGestures} from './map-gestures';
import {ReplayRecorder,ReplayPlayer,readReplays,saveReplay,deleteReplay,exportReplay,replayFilename,parseReplayFile,importReplay,MAX_REPLAY_FILE_BYTES,type BattleReplay} from './replay';
const APP_VERSION=__APP_VERSION__;
const angleLabel=(angle:number)=>{const half=Math.round(angle*2)/2;return Math.abs(angle-half)<1e-8?String(half):String(Math.round(angle));};

const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const safeRead=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const save=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private browsing can disable storage. */}};
let progression=(()=>{try{return readProgression(localStorage);}catch{return freshProgression();}})();
let rankSettlement:Settlement[]=[];
let progressionUnsaved=false;
function newCompetition():Competition{return {id:crypto.randomUUID(),titles:Object.fromEntries(Object.entries(progression.profiles).map(([id,p])=>[id,p.equippedAchievement])),points:Object.fromEntries(Object.entries(progression.profiles).map(([id,p])=>[id,p.points]))};}
const saved=safeRead('piggy-settings');
let config:Config={slots:defaultSlots(),map:'valley',timer:DEFAULT_TURN_TIMER,seed:Date.now(),...(saved?.config||{})};
config={slots:saved?.slotVersion===1?normalizeSlots(saved?.config?.slots,config.allowDragon):defaultSlots(),map:MAPS.some(m=>m.id===config.map)?config.map:'valley',mapChoice:config.mapChoice==='random'||MAPS.some(m=>m.id===config.mapChoice)?config.mapChoice:undefined,timer:storedTurnTimer(config.timer,saved?.timerPreferenceVersion),seed:Date.now(),snow:undefined,fog:undefined,fireLine:undefined,selfDamage:config.selfDamage,friendlyFire:config.friendlyFire,fallDamage:!!config.fallDamage,powerAssist:!!config.powerAssist,tankBlocking:!!config.tankBlocking,allowDragon:config.allowDragon};
if(config.slots.filter(s=>s.enabled).length<2||new Set(config.slots.filter(s=>s.enabled).map(s=>s.team)).size<2)config.slots=defaultSlots();
config.competition=newCompetition();
let game=new Game(config,APP_VERSION);config={...game.config};
let recorder:ReplayRecorder|null=null,playback:ReplayPlayer|null=null;
let impactProfiler:ImpactProfiler|null=null;
let replayReturn:{game:Game;config:Config;recorder:ReplayRecorder|null;statsRecorded:boolean;immersive:boolean}|null=null;
const canControlBattle=()=>game.humanTurn&&!playback;
let angleKeyOwner:number|null=null;const blockedAngleKeys=new Set<string>();
const canAdjustAngle=()=>!playback&&!$<HTMLDialogElement>('#dialog').open&&(canControlBattle()||!charge&&game.canPrepareAim);
const canMarkPower=()=>game.canMarkPower&&!playback&&!charge&&!$<HTMLDialogElement>('#dialog').open;
const audio=new AudioManager();
audio.setSoundEnabled(saved?.soundEnabled??saved?.sound??true);audio.setMusicEnabled(saved?.musicEnabled??saved?.sound??true);audio.setVolume(saved?.audioVersion===2?clamp(Number(saved.volume)||0,0,1):Math.max(0.65,clamp(Number(saved?.volume)||0.65,0,1)));
let stats:{games:number;wins:number;damage:number;shots:number}=safeRead('piggy-stats')||{games:0,wins:0,damage:0,shots:0};
let activeTab:'weapons'|'items'='items';
let dialogPaused=false,dialogKeepsMusic=false;
let statsRecorded=false;
let toastTimer=0;let snapshotStatusTimer=0;
let charge:null|{pointer:number|null;startedAt:number;previousPower:number;tank:number;touch:boolean;audible:boolean;pointerStartedAt?:number}=null;
let powerMarkGesture:ReturnType<typeof installPowerMarkers>|null=null;
let aimPointer:number|null=null;
let immersive=false;
let drawerOpen=false;
let pendingUpdate=false;let preparedRelease:{version:string;notes:string[]}|null=null;
let installPrompt:(Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>})|null=null;
let swRegistration:ServiceWorkerRegistration|undefined;
let checkingVersion=false;
const keys=new Set<string>();
const keyboardMove=new KeyboardMove();
let keyboardGame:Game|null=null,keyboardTurn=-1,keyboardTank=-1;
function syncKeyboardMove(){
  if(game!==keyboardGame||game.turn!==keyboardTurn||game.current!==keyboardTank){keyboardMove.reset();keyboardGame=game;keyboardTurn=game.turn;keyboardTank=game.current;}
}
const playedSeeds=new Set<number>();

$('#app').innerHTML=`
  <header class="site-header">
    <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="咪猪头的疯狂坦克首页"><span class="brand-mark"><img src="${import.meta.env.BASE_URL}icons/icon-192.png" alt=""/></span><span class="brand-type">咪猪头的疯狂坦克<small>MIMI’S CRAZY TANKS</small></span></a>
    <nav class="top-nav" aria-label="主导航"><button class="nav-link active">演习场<span></span></button><button class="nav-link" data-dialog="guide">作战指南</button><button class="nav-link" data-dialog="stats">我的战绩</button></nav>
    <div class="header-tools"><button id="install-button" class="button button-outline install-button hidden">安装游戏</button><span class="local-badge"><span class="status-dot"></span>本地作战 · 无需联网</span><button id="sound-button" class="icon-button" aria-label="开启声音" title="开启声音">${icon('mute')}</button><button class="icon-button" data-dialog="settings" aria-label="游戏设置" title="游戏设置">${icon('settings')}</button></div>
  </header>
  <main class="main-shell">
    <div class="page-heading"><div><div class="eyebrow"><span class="tiny-line"></span> 小小炮手，大大冒险</div><h1>风起，<span>开火。</span><span class="title-dot"></span></h1></div><div class="heading-actions"><div class="match-config"><span id="mode-label">自定义战场</span><span class="config-divider"></span><span id="difficulty-label">2 名炮手</span></div><button id="new-game" class="button button-outline">${icon('refresh')}新对局</button></div></div>
    <div class="game-layout">
      <section class="combat-column" aria-label="战场与操控">
        <div class="battle-card">
          <div class="scoreboard"></div>
          <div class="battle-stage">
            <canvas id="battlefield" width="1280" height="600" aria-label="可破坏的炮术战场；使用下方面板或键盘调整角度、力度和移动；滚轮、触摸板或双指缩放，拖动转移视野。"></canvas>
            <div id="minimap-panel" class="minimap-panel"><div class="minimap-header"><button id="minimap-toggle" aria-label="折叠小地图" aria-expanded="true"><span>小地图</span>${icon('chevron')}</button><button id="minimap-follow" aria-label="恢复战场镜头跟随">跟随</button></div><div class="minimap-field"><canvas id="minimap" aria-label="小地图，点击定位视野"></canvas><i class="minimap-turn-pulse" aria-hidden="true" hidden></i></div><div id="wind-gauge" class="wind-gauge" role="meter" aria-label="风向与风力" aria-valuemin="-11" aria-valuemax="11" aria-valuenow="0"><span class="wind-area" aria-hidden="true"></span><span class="wind-center" aria-hidden="true"></span><span class="wind-end" aria-hidden="true" hidden></span></div></div><div class="stage-top"><span class="map-chip">${icon('mountain')}<span id="map-label">青苔峡谷</span><span class="map-code" id="map-code">01</span></span><button id="inventory-toggle" class="stage-button stage-extra inventory-toggle" aria-label="展开军火库" aria-expanded="false">${icon('shell')}<span>军火库</span></button><button id="fullscreen-button" class="stage-button stage-extra" title="全屏作战" aria-label="全屏作战">${icon('fullscreen')}</button><button id="layout-button" class="stage-button stage-extra" title="切换标准布局" aria-label="切换标准布局">${icon('shrink')}</button><button id="pause-button" class="stage-button" title="暂停 · Esc" aria-label="暂停游戏">${icon('pause')}</button></div>
            <div id="turn-indicator" class="turn-indicator hidden"><span class="status-dot"></span><span id="turn-text">轮到你了</span><span class="turn-divider"></span><span id="round-text">第 01 回合</span></div>
            <div id="timer" class="timer hidden">${icon('clock')}<span>∞</span><small>s</small></div>
            <section id="lobby-overlay" class="lobby-welcome" aria-label="开局准备"><div class="lobby-copy"><h1>准备开战</h1><p>选择战场，安排炮手</p></div><div class="lobby-actions"><button id="start-button" class="button button-dark">进入战场 ${icon('arrow')}</button></div></section>
<div id="game-overlay" class="game-overlay hidden"></div>
            <div class="stage-bottom"><span id="field-note">丘陵地形 · 可破坏环境</span><span>${icon('sun')}<span id="gravity-note">重力 1.0 g</span><button id="stage-version-button" class="version-button" aria-label="点击版本号检查更新">v${APP_VERSION} · 检查更新</button></span></div>
          </div>
          <div class="battle-caption"><div class="caption-main"><span class="caption-dot"></span><span id="battle-message">山谷已就位。准备好，就开一局。</span></div><button id="log-button" aria-label="查看战斗记录">战斗记录 ${icon('chevron')}</button></div>
        </div>
        <section class="control-deck dashboard" aria-label="经典坦克仪表盘">
          <div class="dash-angle"><button id="aim-pad" class="angle-instrument" aria-label="拖动角度仪表瞄准"><canvas id="angle-dial"></canvas><span class="angle-instrument-name" id="instrument-tank">老土</span></button><div class="angle-caption"><span id="angle-limits">25–45°</span><button id="face-button" title="切换炮口朝向">${icon('transfer')}<span>朝右</span></button></div><input id="angle" type="range" min="0" max="90" value="45" class="sr-only"/><span id="angle-value" class="sr-only">45</span></div>
          <div class="dash-center"><div class="dash-toolbar"><div id="weapon-switcher" class="weapon-switcher hidden" aria-label="直接切换坦克武器"><button id="weapon-normal" data-weapon="shell"></button><button id="weapon-special" data-weapon="heavy"></button><button id="weapon-bonus" data-weapon="homing" class="hidden"></button></div><div id="quick-items" class="quick-items"></div><div class="wait-readout"><span>等待</span><strong id="waiting-value">580</strong></div></div>
            <div class="meter-row energy-meter"><span class="meter-label">${icon('fuel')}能量</span><div class="meter-track"><span id="energy-fill"></span></div><span id="energy-value" class="meter-value">920 / 920</span></div>
            <div class="meter-row force-meter"><span class="meter-label">${icon('bolt')}力度</span><button id="power-meter" class="meter-track power-meter-button" aria-label="轻点标记力度，按住200毫秒开始蓄力，松开发射"><canvas id="power-assistance" aria-hidden="true" hidden></canvas><span id="power-memory-fill" hidden></span><span id="charge-fill"></span><i id="previous-power" class="previous-power"></i><i id="power-marker" class="power-marker" hidden><svg viewBox="0 0 18 12" aria-hidden="true"><path d="M2 2h14l-7 9Z"/><path d="M9 4v3"/></svg></i><span class="meter-help">轻点记号 · 按住蓄力</span></button><span class="meter-value"><b id="power-value">68</b>%</span><input id="power" class="sr-only" type="range" min="1" max="100" value="68"/></div>
            <div class="meter-row mobility-meter"><span class="meter-label">${icon('transfer')}移动力</span><div class="meter-track"><span id="mobility-fill"></span></div><span class="meter-value"><b id="fuel-value">100</b>%</span><div class="move-buttons"><button id="move-left" aria-label="后退">${icon('move-left')}<span>后退</span><kbd>A</kbd></button><button id="move-right" aria-label="前进"><kbd>D</kbd><span>前进</span>${icon('move-right')}</button></div></div><div class="dashboard-note"><span id="move-note">本回合可移动</span><span id="meter-hint">白线为上次力度 · ↑↓ 调角度</span></div>
          </div><div class="dash-actions fire-section"><button id="fire-button" class="fire-button" disabled aria-label="短按最小力度发射，按住200毫秒准备，填满后横条蓄力，松手或蓄满发射">${icon('fire-control')}<span id="fire-title">开火</span><small id="fire-subtitle">按住 / 松手</small></button><span id="fire-note">进入战场后开炮</span><div class="dash-utility"><button id="skip-button" title="跳过回合 · F5">跳过</button><button id="exit-match">退出</button></div></div>
        </section>
        <div class="keyboard-hints"><span><kbd>A</kbd><kbd>D</kbd> 移动</span><span><kbd>W</kbd><kbd>S</kbd> 角度</span><span><kbd>SPACE</kbd> 蓄力 · 满力自动发射</span><span class="touch-help">拖动角度盘瞄准 · 长按力度条 · 蓄满自动开火</span><span class="hint-last">每一发，都有一点可能。</span></div>
      </section>
      <button id="inventory-backdrop" class="inventory-backdrop" aria-label="关闭军火库" tabindex="-1"></button><aside class="arsenal" aria-label="武器和道具"><div class="arsenal-heading"><div><span class="eyebrow">有备而来</span><h2>战术背包<span id="tank-pack-label"></span></h2></div><span class="arsenal-symbol">${icon('shell')}</span><button id="arsenal-close" class="icon-button arsenal-close" aria-label="关闭军火库">${icon('close')}</button></div><div class="arsenal-tabs" role="tablist" aria-label="军火库类别"><button id="weapons-tab" class="selected" role="tab" aria-selected="true">坦克武器 <span>2</span></button><button id="items-tab" role="tab" aria-selected="false">道具 <span>4</span></button></div><div class="inventory-grid" id="inventory-grid" role="tabpanel" aria-label="武器清单"></div><div id="weapon-detail" class="weapon-detail"></div><div class="arsenal-bottom"><div class="supply-icon">${icon('plus')}</div><div><strong>路上有惊喜</strong><p>每 5 次行动检查空投，移动可拾取</p></div></div></aside>
    </div>
    <footer class="page-footer"><span>手边的快乐，远方的炮火。</span><button id="version-button" class="version-button" aria-label="点击版本号检查更新">v${APP_VERSION} · 检查更新</button><span>MIMI’S CRAZY TANKS ${pigHeadSvg()} MADE FOR A GOOD SHOT</span></footer>
  </main>
  <div id="toast" class="toast" role="status"></div>
  <div id="pwa-update" class="pwa-update hidden"><span>新版本已就绪</span><button id="apply-update">更新游戏</button></div>
  <aside id="update-download" class="update-download" hidden aria-label="游戏更新进度"><button id="update-download-close" class="icon-button" aria-label="隐藏更新进度">${icon("close")}</button>${progressMarkup("update-download-meter","游戏更新")}</aside>
  <dialog id="dialog"><div class="dialog-shell"><button id="close-dialog" class="dialog-close icon-button" aria-label="关闭">${icon('close')}</button><div id="dialog-content"></div></div></dialog>
`;
// Keep the combat chrome on one row and give the action cluster its own compact grid.
$('.main-shell').prepend($('#lobby-overlay'));
$('.lobby-actions').insertAdjacentHTML('beforeend',`<button class="text-button replay-library-button" data-dialog="replays">${icon('play')}对局录像</button>`);
$('.dashboard').insertAdjacentHTML('beforebegin',`<div id="replay-controls" class="replay-controls hidden" aria-label="录像播放控制"><span id="replay-status" role="status">录像播放</span><span id="replay-time"></span><button id="replay-pause">暂停</button><button id="replay-speed">1×</button><button id="replay-restart">重播</button><button id="replay-exit">退出录像</button></div>`);
$('#lobby-overlay').className='lobby-welcome';
$('.dash-actions').prepend($('.move-buttons'));
$('.dash-angle').insertAdjacentHTML('beforeend',`<div class="angle-nudges" role="group" aria-label="射击角度微调"><button type="button" id="angle-up" class="angle-nudge" aria-label="抬高炮口 1 度，长按连续调整" title="抬高 · 1°">${icon('aim-up')}<small aria-hidden="true">1°</small></button><button type="button" id="angle-down" class="angle-nudge" aria-label="压低炮口 1 度，长按连续调整" title="压低 · 1°">${icon('aim-down')}<small aria-hidden="true">1°</small></button></div>`);
const updateProgress=new UpdateProgress($('#update-download'),$('#update-download-meter'),()=>swRegistration,new URL(import.meta.env.BASE_URL,location.href).href);
$('#update-download-close').addEventListener('click',()=>updateProgress.dismiss());
const angleNudges=installAngleNudges($('#angle-up'),$('#angle-down'),{enabled:canAdjustAngle,actor:()=>displayTank(),step:(direction,steps)=>{const t=displayTank(),target=clamp(t.angle+direction*steps,t.minAngle,t.maxAngle);if(target!==t.angle){adjustDisplayedAim(target);updateUI();}}});
$('#pause-button').insertAdjacentHTML('beforebegin',`<button class="stage-button" data-dialog="settings" aria-label="游戏设置" data-help-name="游戏设置" data-help-description="音效、音乐、自伤、友伤与直接选择暴龙">${icon('settings')}</button>`);
$('.dashboard').classList.add('compact-dashboard');
const logButton=$('#log-button');logButton.classList.add('stage-button');logButton.innerHTML=icon('book');logButton.title='战斗记录';$('#pause-button').before(logButton);
const message=$('.caption-main');message.classList.add('battle-live-message');$('.battle-stage').append(message);$('.battle-caption').remove();
$('#skip-button').innerHTML=icon('skip-control');$('#skip-button').setAttribute('aria-label','跳过回合');
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
installMobileGestureGuards($('#app'));
const renderer=new Renderer($('#battlefield'),game);
const displayTitle=(tank:Game['tanks'][number])=>tank.controller==='human'?(playback?game.config.competition?.titles?.[tank.crew]:progression.profiles[tank.crew].equippedAchievement):null;
const displayMedal=(tank:Game['tanks'][number])=>!playback&&game.phase==='ended'&&tank.controller==='human'?rankIndex(progression.profiles[tank.crew].points):game.medal(tank);
renderer.medalFor=displayMedal;
$('.dash-angle').insertAdjacentHTML('beforeend','<span class="angle-readout relative"><small>车身</small><b id="relative-angle">45°</b></span><span class="angle-readout absolute"><small>水平</small><b id="absolute-angle">45°</b></span>');
const dashboard=new DashboardView($('#angle-dial'),$('#minimap'));
function paintMapChoices(){
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-map-preview]').forEach(canvas=>{
    const map=canvas.dataset.mapPreview as Config['map'];canvas.width=160;canvas.height=64;
    const sample=new Game({map,seed:52,timer:0,fog:false,fireLine:false},APP_VERSION);paintMapOverview(canvas.getContext('2d')!,sample,160,64);
  });
}

function colorNames(message:string){let text=message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');for(const t of [...game.tanks].sort((a,b)=>b.name.length-a.name.length))text=text.replaceAll(t.name,nameMarkup(t.name,t.team));return text;}
function persistSettings() {save('piggy-settings',{config:replayReturn?.config??config,soundEnabled:audio.soundEnabled,musicEnabled:audio.musicEnabled,volume:audio.volume,balanceVersion:2,audioVersion:2,slotVersion:1,timerPreferenceVersion:TIMER_PREFERENCE_VERSION});}
function updateSound() {const b=$('#sound-button');b.innerHTML=icon(audio.soundEnabled||audio.musicEnabled?'sound':'mute');b.setAttribute('aria-label','声音设置');b.title='分别设置音效与背景音乐';}
function snapshotFeedback(message:string){
  toast(message);const status=document.querySelector<HTMLElement>('#snapshot-copy-status');
  if(status){status.textContent=message;status.classList.add('visible');window.clearTimeout(snapshotStatusTimer);snapshotStatusTimer=window.setTimeout(()=>status.classList.remove('visible'),2700);}
}
async function copyBattleSnapshot(){
  const profile=impactProfiler?.report(),snapshot=game.battleSnapshot();
  const playbackInfo=playback?{appVersion:APP_VERSION,recordingVersion:playback.recording.gameVersion,recordingSeed:playback.recording.initial.initial.config.seed,positionSeconds:playback.time,durationSeconds:playback.recording.duration,paused:playback.paused}:null;
  const portraits=portraitDiagnostics();
  const exported=Object.assign({},snapshot,{portraitResources:portraits,assetResources:assetRepairDiagnostics()},profile?{impactPerformance:profile}:{},playbackInfo?{playbackInfo}:{});
  let payload=snapshotText(exported);
  payload=payload.replace('以下 JSON 与上述摘要',`头像资源：${portraits.originals}/4 原图，${portraits.usable}/4 可用；加载与备用来源见 JSON 的 portraitResources。\n\n以下 JSON 与上述摘要`);
  if(playbackInfo)payload=payload.replace('以下 JSON 与上述摘要',`当前为录像回放：原局 v${playbackInfo.recordingVersion}，播放器 v${APP_VERSION}，已播放 ${playbackInfo.positionSeconds.toFixed(2)}/${playbackInfo.durationSeconds.toFixed(2)}秒，原局种子 ${playbackInfo.recordingSeed}。\n\n以下 JSON 与上述摘要`);
  if(profile){const max=Math.max(0,...profile.records.map(r=>r.ms.total));payload=payload.replace('以下 JSON 与上述摘要',`弹着性能（测试版）：${profile.records.length}帧，主线程峰值 ${max.toFixed(2)}ms；详细分段、像素与纹理字节见JSON的impactPerformance。\n\n以下 JSON 与上述摘要`);}
  try {if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(payload);snapshotFeedback('已复制对局快照');}
  catch {snapshotFeedback('剪贴板不可用或未获授权，请允许剪贴板访问后重试。');}
}
function toast(message:string) {const el=$('#toast');el.innerHTML=colorNames(message);el.classList.add('visible');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el.classList.remove('visible'),2700);}
function adjustDisplayedAim(angle:number,direction?:number){
 const t=displayTank();if(!canAdjustAngle()||!Number.isFinite(angle))return;angle=clamp(angle,t.minAngle,t.maxAngle);if(angle===t.angle&&(direction===undefined||direction===t.direction))return;
 if(canControlBattle()){if(direction!==undefined)game.face(direction);game.setAim(angle,t.power);}
 else if(direction===undefined)game.prepareAim(angle,t.id);else game.prepareAim(angle,t.id,direction);
}
function displayTank(){return game.dashboardTank;}
function useHumanItem(id:ItemId,slot:number){return game.useItem(id,false,slot);}
function pendingShotItem(tank:Tank,slot:number,id:ItemId|null):ItemId|null{
  if(playback||tank.controller!=='human'||tank.hp<=0||game.phase==='lobby'||game.phase==='ended')return null;
  if(id&&game.itemArmed(slot,tank))return id;
  const queued=tank.queuedShot;
  return queued?.boost===slot&&tank.boost?'boost':queued?.double===slot&&tank.doubleShot?'double':null;
}
const pendingChip=(id:ItemId)=>`<i class="queued-item-chip" aria-hidden="true">${itemIcon(id)}</i>`;

function renderInventory() {
  const tank=displayTank(),vehicle=tank.vehicleId?vehicleById(tank.vehicleId):null;
  const selected=canControlBattle()?game.selected:tank.selectedWeapon;
  const weapons=vehicle?[weaponById(vehicle.normal),weaponById(vehicle.special),...(tank.ammo.homing>0?[weaponById('homing')]:[])]:WEAPONS;
  $('#inventory-grid').innerHTML=activeTab==='weapons'?weapons.map(w=>`<button class="inventory-tile ${selected===w.id?'selected':''} ${tank.ammo[w.id]<=0?'depleted':''}" data-weapon="${w.id}" data-help-name="${w.name}" data-help-description="${weaponHint(w.id)}" aria-label="${w.name}，${Number.isFinite(tank.ammo[w.id])?tank.ammo[w.id]+' 发':'无限弹药'}" aria-pressed="${selected===w.id}"><span class="weapon-icon" style="--weapon-color:${w.color}"><canvas data-shell="${w.id}" class="shell-swatch" aria-hidden="true"></canvas></span><span class="tile-name">${w.name}</span><span class="ammo-count">${Number.isFinite(tank.ammo[w.id])?tank.ammo[w.id]:'∞'}</span>${selected===w.id?`<span class="selection-tick">${icon('check')}</span>`:''}</button>`).join(''):
    game.backpack(tank).map((id,slot)=>{
      const pending=pendingShotItem(tank,slot,id),queued=pending?ITEMS.find(i=>i.id===pending)!:null,armed=!!pending&&game.itemArmed(slot,tank);
      if(!id&&queued)return `<button class="inventory-tile item-tile pending-shot-item" disabled aria-label="道具槽 ${slot+1}，${queued.name}待发"><span class="weapon-icon">${itemIcon(queued.id)}</span><span class="tile-name">${queued.name}</span><span class="item-hint">已使用 · 等待发射</span></button>`;
      if(!id)return `<button class="inventory-tile item-tile empty-item" disabled aria-label="道具槽 ${slot+1}，空槽"><span class="weapon-icon">${icon('plus')}</span><span class="tile-name">空槽</span><span class="item-hint">可拾取任意道具</span></button>`;
      const i=ITEMS.find(i=>i.id===id)!,reason=game.itemUnavailable(id,false,slot);
      return `<button class="inventory-tile item-tile ${reason?'unavailable':''} ${armed?'selected pending-shot-item':pending?'has-queued-shot':''}" data-item="${id}" data-item-slot="${slot}" ${reason?'disabled':''} title="${i.name}：${reason||i.description}" aria-label="道具槽 ${slot+1}，使用${i.name}${reason?'，'+reason:''}"><span class="weapon-icon" style="--weapon-color:#85927a">${itemIcon(id)}</span><span class="tile-name">${i.name}</span><span class="item-hint">${reason||'使用后留空 · 可拾取重复道具'}</span><span class="item-cost">${armed?'已装填 · 再点取消':'同回合可联动'}</span>${pending&&!armed?pendingChip(pending):''}</button>`;
    }).join('');
  $('#inventory-grid').classList.toggle('items-grid',activeTab==='items');
  $('#inventory-grid').setAttribute('aria-label',activeTab==='weapons'?'武器清单':'道具清单');
  $('#weapons-tab').classList.toggle('selected',activeTab==='weapons');$('#items-tab').classList.toggle('selected',activeTab==='items');
  $('#weapons-tab').setAttribute('aria-selected',String(activeTab==='weapons'));$('#items-tab').setAttribute('aria-selected',String(activeTab==='items'));
  paintProjectilePreviews($('#inventory-grid'));renderDetail();
}
function renderDetail(item?:ItemId) {
  const w=weaponById(canControlBattle()?game.selected:displayTank().selectedWeapon);
  if(activeTab==='weapons') {
    const dig=excavation(w.id,false,game.gameVersion);
    $('#weapon-detail').innerHTML=`<div class="detail-title"><span>${w.name}</span><span class="weapon-tag">${w.tag}</span></div><p>${w.description}</p><div class="weapon-metrics"><span>${w.effect==='pierce'?'首节伤害':'单枚伤害'} <strong>${weaponDamage(w.id,game.gameVersion)}${w.shots&&w.shots>1?` ×${w.shots}`:''}</strong></span><span>爆炸半径 <strong>${Math.round(weaponBlastRadius(w.id,game.gameVersion))}m</strong></span><span>挖地 <strong>${dig.radius} × ${dig.depth}m</strong></span></div><button class="shell-atlas-button" data-dialog="projectiles">认认炮弹 · 弹体图鉴 ${icon('arrow')}</button>`;
  }
  else {const i=ITEMS.find(i=>i.id===item);$('#weapon-detail').innerHTML=i?`<div class="detail-title"><span>${i.name}</span><span class="weapon-tag">战术道具</span></div><p>${i.description}</p>`:`<div class="detail-title"><span>四个槽位，灵活搭配</span>${icon('shield')}</div><p>开局各带一件，使用后原位留空；任意空槽可拾取道具，重复道具各占一格，满槽不拾取。可在同回合联动。</p><div class="weapon-metrics"><span>同回合可联动 · 用掉后留空</span></div>`;}
}

let lastInventory='';let lastPhase='';
let lastWeapons='';let lastHud='';let lastActor=-1;
function updateUI() {
  const t=displayTank(),human=canControlBattle(),lobby=game.phase==='lobby',instrumentActive=t.id===game.current;
  const instrumentSpecial=instrumentActive&&(game.teleporting||game.restoring);
  const v=t.vehicleId?vehicleById(t.vehicleId):null;
  const pair=[v?.normal??'shell',v?.special??'heavy','homing'] as WeaponId[];
  $('#weapon-switcher').classList.toggle('hidden',lobby||game.phase==='ended');
  const shownWeapon=human?game.selected:t.selectedWeapon;
  const weaponSignature=`${t.vehicleId}|${game.current}|${shownWeapon}|${t.ammo.homing}`;
  if(weaponSignature!==lastWeapons) {
    pair.forEach((id,i)=>{const w=weaponById(id),button=$<HTMLButtonElement>(['#weapon-normal','#weapon-special','#weapon-bonus'][i]);button.dataset.weapon=id;button.dataset.slot=String(i+1);button.dataset.helpDescription=weaponHint(id);button.innerHTML=`<span class="switch-icon" style="color:${w.color}"><canvas data-shell="${w.id}" class="shell-swatch" aria-hidden="true"></canvas></span><span><small>${i===0?'普通 · F3':i===1?'特殊 · F4':'空投 · 稀有'}</small><strong>${w.name}</strong></span>${i===1?`<em>等待 +${w.extraDelay??100}</em>`:''}`;button.classList.toggle('selected',shownWeapon===id);button.setAttribute('aria-pressed',String(shownWeapon===id));button.setAttribute('aria-label',`${i===0?'普通武器':i===1?'特殊武器':'空投武器'}：${w.name}`);});
    $('#weapon-bonus').classList.toggle('hidden',t.ammo.homing<=0);lastWeapons=weaponSignature;paintProjectilePreviews($('#weapon-switcher'));
  }
  ['#weapon-normal','#weapon-special','#weapon-bonus'].forEach((selector,i)=>{$<HTMLButtonElement>(selector).disabled=!human||(t.ammo[pair[i]]??0)<=0;});
  $('#tank-pack-label').textContent=v?' / '+v.name:'';
  $('#instrument-tank').textContent=v?.name??'炮术演习';$('#angle-limits').textContent=`${t.minAngle}–${t.maxAngle}°`;
  $('#energy-fill').style.width=`${t.hp/t.maxHP*100}%`;$('#energy-value').textContent=`${t.hp} / ${t.maxHP}`;$('#mobility-fill').style.width=`${t.fuel}%`;$('#waiting-value').textContent=game.delayEnabled?String(t.delayCommitted?t.lastDelay:game.delayFor(t,instrumentSpecial?undefined:shownWeapon)+(instrumentSpecial?200:0)):'—';
  $('#previous-power').hidden=t.lastPower===null||lobby||game.phase==='ended';$('#previous-power').style.left=t.lastPower===null?'0%':`${t.lastPower}%`;
  const marker=$('#power-marker');marker.hidden=t.powerMarker==null||lobby;marker.style.left=`${t.powerMarker??0}%`;marker.setAttribute('aria-label',`本局力度记号 ${t.powerMarker??0}%`);marker.dataset.power=String(t.powerMarker??'');
  const quick=game.backpack(t),pendingItems=quick.map((id,slot)=>pendingShotItem(t,slot,id));const quickSignature=quick.map((id,slot)=>`${id}:${id?game.itemUnavailable(id,false,slot):'empty'}`).join('|')+'|'+(instrumentActive&&game.teleporting)+'|'+(instrumentActive&&game.restoring)+'|'+pendingItems.join(',')+'|'+t.id;
  if($('#quick-items').dataset.signature!==quickSignature){$('#quick-items').dataset.signature=quickSignature;$('#quick-items').innerHTML=quick.map((id,slot)=>{
    const pending=pendingItems[slot],queued=pending?ITEMS.find(i=>i.id===pending)!:null;
    if(!id&&queued)return `<button class="pending-shot-item" data-item-slot="${slot}" disabled data-help-name="${queued.name}" data-help-description="已使用 · 等待发射" aria-label="道具槽 ${slot+1}，${queued.name}待发">${itemIcon(queued.id)}<span>待发</span></button>`;
    if(!id)return `<button class="empty-item" data-item-slot="${slot}" disabled data-help-name="空槽" data-help-description="可拾取任意道具，重复道具各占一个槽位" aria-label="道具槽 ${slot+1}，空槽">${icon('plus')}<span>空槽</span></button>`;
    const item=ITEMS.find(x=>x.id===id)!,reason=game.itemUnavailable(id,false,slot),armed=game.itemArmed(slot,t);
    return `<button data-item="${id}" data-item-slot="${slot}" class="${armed?'selected':''} ${armed&&pending===id?'pending-shot-item':pending?'has-queued-shot':''}" aria-pressed="${armed}" ${reason?'disabled':''} data-help-name="${item.name}" data-help-description="${reason||item.description}" title="${item.name} · F${9+slot}${reason?' · '+reason:''}" aria-label="道具槽 ${slot+1}，快捷使用${item.name}">${itemIcon(id)}<span>${item.name}</span>${pending&&!armed?pendingChip(pending):''}</button>`;
  }).join('');}
  $('.wait-readout').dataset.helpDescription=!(game.delayEnabled)?'含 AI 的对局按存活槽位轮转，DELAY 排序关闭。':'普通 +100，特殊 +200，道具 +200，耗时每秒 +10，移动也累加。低等待可连续行动。';
  $('#pwa-update').classList.toggle('hidden',!pendingUpdate||(!lobby&&game.phase!=='ended'));
  $('.battle-stage').classList.toggle('started',!lobby);
  $('#move-left').setAttribute('aria-label','向左移动，长按持续行驶并转向左侧');
  $('#move-right').setAttribute('aria-label','向右移动，长按持续行驶并转向右侧');
  $('#move-left .icon').style.transform='';
  $('#move-right .icon').style.transform='';
  $('#mode-label').textContent='自定义战场';
  $('#difficulty-label').textContent=`${game.tanks.length} 名炮手 · ${new Set(game.tanks.map(t=>t.team)).size} 面队旗`;
  const hudSignature=game.tanks.map(t=>`${t.id}:${t.crew}:${t.vehicleId}:${t.controller}:${t.difficulty}:${t.team}:${displayMedal(t)}:${displayTitle(t)}`).join('|');
  if(hudSignature!==lastHud){
    $('.scoreboard').innerHTML=game.tanks.map(tank=>`<div class="player-hud team-${tank.team}" data-hud="${tank.id}" data-slot-id="${tank.slot}" style="--flag-ink:${teamFlag(tank.team).color};--flag-paper:${teamFlag(tank.team).paper}"><span class="avatar"><button class="portrait-button" data-portrait="${tank.id}" aria-label="定位${tank.name}；长按查看大头像">${crewAvatar(tank.crew,import.meta.env.BASE_URL)}</button>${medalSvg(displayMedal(tank))}</span><div class="player-info"><div class="player-name">${flagIcon(tank.team)}<span class="player-name-text">${nameMarkup(tank.name,tank.team)}${titleMarkup(displayTitle(tank))}</span><span class="player-role" id="role-${tank.id}">${tank.controller==='human'?'人类':DIFFICULTIES.find(d=>d.id===tank.difficulty)!.name+' AI'}</span></div><div class="health-line"><div class="health-track"><span id="hp-bar-${tank.id}"></span></div><span class="hp-value" id="hp-${tank.id}"></span></div><div class="status-line" id="status-${tank.id}"></div></div><span class="hud-vehicle" title="${tank.vehicleId?vehicleById(tank.vehicleId).name:''}">${tank.vehicleId?vehicleIcon(vehicleById(tank.vehicleId)):''}</span></div>`).join('');lastHud=hudSignature;
  }
  game.tanks.forEach((tank,i)=>{
    $(`#hp-${i}`).innerHTML=`${tank.hp} <small>/ ${tank.maxHP}</small>`;
    $(`#hp-bar-${i}`).style.width=`${tank.hp/tank.maxHP*100}%`;$(`#hp-bar-${i}`).classList.toggle('critical',isRedHealth(tank));
    $(`[data-hud="${i}"]`).classList.toggle('acting',game.current===i&&game.phase!=='ended');$(`[data-hud="${i}"]`).classList.toggle('eliminated',tank.hp<=0);
    const status=[tank.poisoned?'中毒':isRaging(tank)?'发怒 +50%':isRedHealth(tank)?'喘气中':'',tank.immobile?'禁移动':'',tank.doubleShot?'双发装填':'',tank.boost?'威力加强':'',tank.frozen?'冻结':'',tank.shield?`护盾 ${tank.shield}`:'',tank.reaction?.kind==='direct'?'哭泣':tank.reaction?.kind==='graze'?'擦伤':tank.reaction?.kind==='fall'?'摔伤':'',tank.vehicleId?vehicleById(tank.vehicleId).name:''].filter(Boolean).join(' · ');
    $(`#status-${i}`).textContent=status;
    const portrait=$<HTMLButtonElement>(`[data-hud="${i}"] .portrait-button`);portrait.dataset.helpName=tank.name;portrait.dataset.helpColor=teamFlag(tank.team).color;portrait.dataset.helpDescription=`${status} · 生命 ${tank.hp}/${tank.maxHP}`;
  });
  $('.dashboard').style.setProperty('--actor-paper',teamFlag(t.team).paper);
  $('.dashboard').style.setProperty('--actor-color',teamFlag(t.team).color);
  if(lastActor!==t.id){lastActor=t.id;$('.dashboard').classList.remove('handoff-pulse');void $('.dashboard').offsetWidth;$('.dashboard').classList.add('handoff-pulse');}
  $('#map-label').textContent=MAPS.find(m=>m.id===game.config.map)!.name+(game.fog?` · 浓雾 ${game.fogTurnsRemaining} ${modernWeather(game.gameVersion)?'轮':'行动'}`:'')+(game.snow?' · 飘雪':'')+(game.fireLine?` · 火线 +50% ·${game.fireLineTurnsRemaining} ${modernWeather(game.gameVersion)?'轮':'行动'}`:'');
  $('#map-code').textContent=String(MAPS.findIndex(m=>m.id===game.config.map)+1).padStart(2,'0');
  updateWindGauge($('#wind-gauge'),game.wind);
  $('#gravity-note').textContent=`重力 ${game.gravity===230?'1.0':(game.gravity/230).toFixed(2)} g`;
  $('#field-note').textContent=game.phase==='supply'?'空投受风影响 · 计时暂停':game.restoring?'恢复弹 · 轻点原地治疗，也可投向队友':game.teleporting?'转移弹按弹道落点传送':game.selected==='airstrike'?'点击战场指定空袭落点':MAPS.find(m=>m.id===game.config.map)!.sub;
  if(game.fireLine) $('#field-note').textContent+=` · 火线 +50% · 剩 ${game.fireLineTurnsRemaining} ${modernWeather(game.gameVersion)?'完整轮次':'行动回合'}`;
  $('#minimap-toggle').dataset.helpDescription=`${MAPS.find(m=>m.id===game.config.map)!.sub} ${$('#field-note').textContent} · ${$('#gravity-note').textContent}。轻点折叠或展开，点击地图定位视野。`;
  $('#lobby-overlay').classList.toggle('hidden',!lobby);
  const lobbyChanged=document.body.classList.contains('lobby-mode')!==lobby;
  document.body.classList.toggle('lobby-mode',lobby);if(lobbyChanged)requestAnimationFrame(()=>renderer.resize());
  $('#turn-indicator').classList.toggle('hidden',lobby||game.phase==='ended'||game.phase==='handoff');
  $('#timer').classList.toggle('hidden',lobby||game.phase==='ended'||game.phase==='handoff'||config.timer===0);
  $('#turn-text').innerHTML=colorNames(game.phase==='supply'?'补给正在空降 · 计时暂停':game.phase==='flying'?'炮弹飞行中':game.phase==='resolving'?'观察战场…':game.active.controller==='ai'?`${game.active.name}正在瞄准…`:`${game.active.name}，到你了` );
  if(renderer.touring){$('#turn-text').innerHTML=colorNames(`开场巡游 · ${game.tanks[renderer.tourPlayer??0]?.name??''}`);}
  else if(playback&&game.phase==='aiming')$('#turn-text').innerHTML=colorNames(`录像 · ${game.active.name}瞄准`);
  $('#turn-indicator').style.setProperty('--flag-ink',teamFlag(game.active.team).color);$('#turn-indicator').style.setProperty('--flag-paper',teamFlag(game.active.team).paper);
  $('#round-text').textContent=game.turn>=40?'决胜时刻':`第 ${String(game.round).padStart(2,'0')} 轮`;
  $('#timer span').textContent=String(Math.ceil(Math.max(0,game.clock))).padStart(2,'0');$('#timer').classList.toggle('urgent',game.clock<10);
  const relativeLabel=angleLabel(t.angle);
  $('#angle-value').textContent=relativeLabel;$('#relative-angle').textContent=`${relativeLabel}°`;$('#absolute-angle').textContent=`${angleLabel(game.aim(t).absolute)}°`;$('#angle-limits').textContent=`车身 ${t.minAngle}–${t.maxAngle}° · 水平 ${Math.round(game.aim(t,t.minAngle).absolute)}–${Math.round(game.aim(t,t.maxAngle).absolute)}°`;
  const angle=$<HTMLInputElement>('#angle'),power=$<HTMLInputElement>('#power');
  angle.min=String(t.minAngle);angle.max=String(t.maxAngle);angle.value=String(t.angle);power.value=String(t.power);
  angle.style.setProperty('--range-fill',`${(t.angle-t.minAngle)/(t.maxAngle-t.minAngle)*100}%`);power.style.setProperty('--range-fill',`${(t.power-MIN_POWER)/(100-MIN_POWER)*100}%`);
  angle.disabled=!canAdjustAngle();power.disabled=!human;
  $('.control-deck').classList.toggle('inactive',!human);$('.control-deck').classList.toggle('can-prepare-aim',!human&&canAdjustAngle());$<HTMLButtonElement>('#power-meter').disabled=!game.canMarkPower||!!playback||$<HTMLDialogElement>('#dialog').open;
  $('#power-meter .meter-help').textContent=human?'轻点记号 · 按住蓄力':canAdjustAngle()?'可记力度 · 预设角度':'轻点记号 · 等待行动';$<HTMLButtonElement>('#skip-button').disabled=!human&&!renderer.touring;
  $('#skip-button').setAttribute('aria-label',renderer.touring?'跳过开场巡游':'跳过回合');
  document.querySelectorAll<HTMLButtonElement>('.step-button, .move-buttons button, .angle-nudge, #face-button, #aim-pad').forEach(b=>b.disabled=b.matches('.angle-nudge,#face-button,#aim-pad')||b.dataset.adjust?.startsWith('angle:')?!canAdjustAngle():!human);if(!canAdjustAngle())angleNudges.cancel();
  $('#face-button span').textContent=t.direction===1?'朝右':'朝左';
  updateChargeVisual(powerDisplay(t.power,t.lastPower,game.minimumShotPower,!!charge||!!playback?.waiting||!!playback?.charging,matchPolish(game.gameVersion)));
  updateChargePreparation(performance.now());
  document.querySelectorAll<HTMLButtonElement>('.quick-items [data-item]').forEach(button=>button.disabled=!!playback||!!game.itemUnavailable(button.dataset.item as ItemId,false,Number(button.dataset.itemSlot)));

  $('#fire-title').textContent=charge&&!charge.audible||playback?.waiting?'准备蓄力':charge||playback?.charging?'蓄力中':'开火';
  $('#fire-subtitle').textContent=charge?'松手或蓄满发射':'按住 / SPACE';
  $('#fuel-value').textContent=String(Math.floor(t.fuel));$('#move-note').textContent=t.immobile?'紫冻水 · 暂时不能移动':t.frozen?'冰冻中 · 移动耗油加倍':t.vehicleId?`本回合最多移动 ${Math.round(t.moveDistance)}m`:'长按移动 · 每回合补充 18';
  if(t.immobile>0){$<HTMLButtonElement>('#move-left').disabled=true;$<HTMLButtonElement>('#move-right').disabled=true;}
  $<HTMLButtonElement>('#fire-button').disabled=!human||t.fallVelocity>0;
  $('#fire-note').textContent=game.weatherObservation?'火线变化 · 正在展示战场':game.phase==='supply'?'空投阶段不消耗回合时间':lobby?'先进入战场':game.phase==='flying'||game.phase==='resolving'?'欣赏这条抛物线':game.introLocked?'开场巡游 · 正在展示炮手位置':game.paused?'游戏已暂停':game.phase==='ended'?'下一局见':game.phase==='handoff'?'交给下一位队长':!human?'等待对手行动':game.restoring?'恢复弹已装填 · 正中最高恢复60%':game.teleporting?'转移弹已装填 · 蓄力发射':t.doubleShot?'双发装填已就绪':t.boost?'强化炮弹已就绪':`${weaponById(game.selected).name}已就绪`;
  $<HTMLButtonElement>('#pause-button').disabled=lobby||game.phase==='ended'||game.phase==='handoff';
  $('#pause-button').innerHTML=icon(game.paused?'play':'pause');$('#pause-button').setAttribute('aria-label',game.paused?'继续游戏':'暂停游戏');
  const signature=`${activeTab}|${t.vehicleId}|${shownWeapon}|${t.id}|${game.teleporting}|${game.restoring}|${t.itemUsed}|${t.tactics}|${ITEMS.map(i=>game.itemUnavailable(i.id)).join(',')}|${JSON.stringify(t.ammo)}|${JSON.stringify(t.items)}|${quick.join(',')}|${pendingItems.join(',')}`;
  if(signature!==lastInventory) {renderInventory();lastInventory=signature;}
  const phaseKey=game.phase==='ended'?(game.resultAge<3?'ending-animation':'ending-result'):`${game.phase}:${game.introLocked}:${game.paused}`;
  $('#game-overlay').classList.toggle('result-overlay',game.phase==='ended');
  if(lastPhase!==phaseKey) {updateOverlay();lastPhase=phaseKey;}
  if(game.phase==='ended'&&game.resultAge>=3&&!playback)positionResult();
  refreshReplayControls();
}

function positionResult(){
  const layer=$('#game-overlay'),card=layer.querySelector<HTMLElement>('.result');if(!card)return;
  const sx=layer.clientWidth/renderer.viewWidth,sy=layer.clientHeight/renderer.viewHeight;
  const actors=game.tanks.filter(t=>!t.outOfBounds).map(t=>({x:(t.x-renderer.offsetX-50)*sx,y:(t.y-(t.hp>0?124:28)-renderer.offsetY)*sy,width:100*sx,height:(t.hp>0?154:54)*sy}));
  const mapBox=$('#minimap-panel').getBoundingClientRect(),box=layer.getBoundingClientRect();
  const map={x:mapBox.x-box.x,y:mapBox.y-box.y,width:mapBox.width,height:mapBox.height};
  card.style.position='absolute';card.style.width='620px';
  let placement=chooseResultPosition(layer.clientWidth,layer.clientHeight,card.offsetWidth,card.offsetHeight,actors,map);
  if(placement.overlap>0){card.style.width='460px';const smaller=chooseResultPosition(layer.clientWidth,layer.clientHeight,card.offsetWidth,card.offsetHeight,actors,map);if(smaller.overlap<placement.overlap)placement=smaller;else card.style.width='620px';}
  card.style.left=`${placement.x}px`;card.style.top=`${placement.y}px`;
}

function updateOverlay() {
  const el=$('#game-overlay');
  if(playback){el.classList.add('hidden');el.innerHTML='';return;}
  if(game.introLocked){el.classList.add('hidden');el.innerHTML='';return;}
  if(game.paused&&!$<HTMLDialogElement>('#dialog').open) {
    el.classList.remove('hidden');el.innerHTML=`<div class="overlay-card"><span class="overlay-symbol">${icon('pause')}</span><div class="eyebrow">先歇一会儿</div><h2>风也在等你。</h2><p>战场已暂停，随时回来继续。</p><button class="button button-dark" data-action="resume">继续对局 ${icon('play')}</button><button class="text-button" data-dialog="settings">声音设置</button><button class="text-button" data-dialog="setup">重新部署</button></div>`;
  } else if(game.phase==='ended') {
    recordStats();
    if(game.resultAge<3){el.classList.add('hidden');el.innerHTML='';return;}
    el.classList.remove('hidden');el.innerHTML=battleResultMarkup(game,rankSettlement,import.meta.env.BASE_URL,Object.fromEntries(Object.entries(progression.profiles).map(([id,p])=>[id,p.equippedAchievement])));
  } else {el.classList.add('hidden');el.innerHTML='';}
}
function recordStats() {
  if(playback)return;
  if(statsRecorded) return;statsRecorded=true;
  if(game.progress){
    // Read once at settlement to avoid overwriting a different tab's completed match.
    let latest=progression;try{const stored=localStorage.getItem(PROGRESSION_KEY);if(stored&&!progressionUnsaved)latest=readProgression(localStorage);}catch{/* In-memory progress remains usable. */}
    const settled=settleProgression(latest,game.progress,game.winner,{ended:game.phase==='ended'});progression=settled.state;rankSettlement=settled.results;
    if(rankSettlement.length){try{localStorage.setItem(PROGRESSION_KEY,JSON.stringify(progression));progressionUnsaved=false;}catch{progressionUnsaved=true;toast('本机存储不可用，积分仅在本次打开期间保留。');}renderer.invalidate();lastHud='';}
  }
  if(!game.tanks.some(t=>t.controller==='human'))return;
  stats.games++;if(game.winner===game.tanks.find(t=>t.crew==='mimi'&&t.controller==='human')?.team) stats.wins++;stats.damage+=game.tanks.find(t=>t.crew==='mimi'&&t.controller==='human')?.damage??0;stats.shots+=game.tanks.find(t=>t.crew==='mimi'&&t.controller==='human')?.shots??0;save('piggy-stats',stats);
}
function setImmersive(value:boolean) {
  immersive=value;document.body.classList.toggle('combat-mode',value);setDrawer(false);
  $('#layout-button').innerHTML=icon(value?'shrink':'fullscreen');
  $('#layout-button').setAttribute('aria-label',value?'切换标准布局':'进入沉浸布局');
  requestAnimationFrame(()=>renderer.resize());
}
function setDrawer(value:boolean) {
  drawerOpen=value;document.body.classList.toggle('drawer-open',value);
  $('#inventory-toggle').setAttribute('aria-expanded',String(value));
  $('#inventory-toggle').setAttribute('aria-label',value?'关闭军火库':'展开军火库');
}
function begin() {
  audio.unlock();audio.pause(false);game.start();recorder?.detach();recorder=new ReplayRecorder(game);const openingGame=game;
  const lucky=game.tanks.filter(t=>t.vehicleId==='dragon'&&config.slots[t.slot].vehicle==='random');
  game.setIntroLocked(true);renderer.startTour(()=>{if(game===openingGame){game.setIntroLocked(false);renderer.follow();lastPhase='';updateUI();if(lucky.length)toast(`惊喜！${lucky.map(t=>t.name).join('、')}抽中了隐藏款暴龙。`);}});
  playedSeeds.add(game.config.seed>>>0);audio.setScene(game.config.map,game.matchBgm?.file??legacyMapBgmFile(game.config.map,game.gameVersion));void audio.preloadForMatch(game.tanks.map(t=>t.vehicleId));
  if(game.fog||game.snow)audio.play('wind');if(game.fireLine)audio.play('firewall');setImmersive(true);lastPhase='';updateUI();
}
function newMatch(next:Config,start=true) {
  const forfeited=!playback&&game.forfeitHumanSide();if(forfeited)recordStats();
  if(playback)leaveReplay();
  recorder?.detach();recorder=null;
  cancelCharge();
  audio.resetEffects();
  audio.setSelectionMusic(false);
  audio.pause(false);
  config={...next,snow:undefined,fog:undefined,fireLine:undefined,seed:freshMatchSeed(Date.now(),playedSeeds),competition:newCompetition()};rankSettlement=[];game=new Game(config,APP_VERSION);config={...game.config};renderer.setGame(game);refreshImpactProfiler();statsRecorded=false;lastPhase='';lastInventory='';keys.clear();keyboardMove.reset();persistSettings();
  $('#battle-message').textContent='新的风，新的可能。';if(start) begin();else {setImmersive(false);updateUI();}if(forfeited)toast('退出对局，己方判负。');
}
function togglePause() {
  if(playback){playback.paused=!playback.paused;setReplayAudioPaused(playback.paused);refreshReplayControls();return;}
  if(game.phase==='lobby'||game.phase==='ended'||game.phase==='handoff') return;
  if(renderer.touring)renderer.finishTour();
  cancelCharge();game.paused=!game.paused;keys.clear();keyboardMove.reset();audio.pause(game.paused);updateOverlay();updateUI();
}

function profileClick(event:Event){const equip=(event.target as HTMLElement).closest<HTMLElement>('[data-equip-achievement]');if(equip){const crew=equip.dataset.profileCrew as keyof typeof CREW;if(!CREW[crew])return;const id=equip.dataset.equipAchievement!;try{progression=equipAchievement(progression,crew,progression.profiles[crew].equippedAchievement===id?null:id);try{localStorage.setItem(PROGRESSION_KEY,JSON.stringify(progression));progressionUnsaved=false;}catch{progressionUnsaved=true;toast('本机存储不可用，称号仅在本次打开期间保留。');}$('#dialog-content').innerHTML=progressionMarkup(progression,crew,import.meta.env.BASE_URL);lastHud='';renderer.invalidate();updateUI();}catch(error){toast((error as Error).message);}return;}const button=(event.target as HTMLElement).closest<HTMLElement>('[data-profile]');if(!button)return;const crew=button.dataset.profile as keyof typeof CREW;if(!CREW[crew])return;$('#dialog-content').innerHTML=progressionMarkup(progression,crew,import.meta.env.BASE_URL);}
function showDialog(type:string) {
  if(playback&&type==='setup'){toast('请先退出录像，再调整对局。');return;}
  if(renderer.touring)renderer.finishTour();
  const dialog=$<HTMLDialogElement>('#dialog');
  if(!dialog.open) {cancelCharge();dialogPaused=game.paused;game.paused=true;keys.clear();keyboardMove.reset();}
  dialogKeepsMusic=!(playback?.paused??dialogPaused);audio.pause(true,dialogKeepsMusic);
  dialog.classList.toggle('setup-dialog',type==='setup');dialog.classList.toggle('projectile-dialog',type==='projectiles'||type==='vehicles');const content=$('#dialog-content');content.removeEventListener('click',profileClick);
  dialog.classList.toggle('settings-dialog',type==='settings');
  if(type.startsWith('portrait:')) {
    const id=Number(type.split(':')[1]),crew=game.tanks[id].crew,name=game.tanks[id].name,team=game.tanks[id].team;
    const sayings=crew==='fox'?['尾巴翘翘，准头好好！','摸摸狐狸耳朵，听听风。','阿狸把星星装进炮弹了。']:crew==='fish'?['咕噜咕噜，轮到小黄鱼！','摆摆尾巴，借一阵风。','泡泡飞过的地方，也藏着好准头。']:crew==='mimi'?['今天也要可可爱爱地开炮！','摸摸猪头，准头 +1！','这发炮弹，带一点甜。','先听听风，再认真瞄准。']:['别怕，大猪头也会打歪。','装甲厚一点，心软一点。','哼哼，轮到大猪头了！','不着急，咱们慢慢瞄。'];
    content.innerHTML=`<div class="portrait-view"><span class="eyebrow">认识一下，你的炮手</span><h2>${nameMarkup(name,team)}</h2>${titleMarkup(displayTitle(game.tanks[id]),'equipped-title portrait-title')}<button id="portrait-art" class="portrait-art" aria-label="戳戳${name}">${crewAvatar(crew,import.meta.env.BASE_URL)}${medalSvg(displayMedal(game.tanks[id]))}<span class="portrait-touch-hint">轻轻戳一下</span></button><p id="portrait-saying" class="portrait-saying">${colorNames(sayings[0])}</p><button class="button button-dark dialog-primary" data-action="close">带着好心情，回战场 ${icon('arrow')}</button></div>`;
    let taps=0;
    $('#portrait-art').addEventListener('click',()=>{
      $('#portrait-saying').innerHTML=colorNames(sayings[++taps%sayings.length]);
      const art=$('#portrait-art');art.classList.remove('boop');void art.offsetWidth;art.classList.add('boop');
      const heart=document.createElement('span');heart.className='portrait-heart';heart.innerHTML=icon('heart');heart.style.left=`${30+(taps*17)%45}%`;art.appendChild(heart);window.setTimeout(()=>heart.remove(),900);
    });
  } else if(type==='replays') {
    renderReplayList(content);
  } else if(type==='setup') {
    audio.setSelectionMusic(true);
    content.innerHTML=setupMarkup(config,import.meta.env.BASE_URL);
    mountSetup(content,{...config,competition:newCompetition()},import.meta.env.BASE_URL,toast,next=>{closeDialog();newMatch(next);},{soundEnabled:audio.soundEnabled,musicEnabled:audio.musicEnabled,change:(key,value)=>{if(key==='soundEnabled')audio.setSoundEnabled(value);else if(key==='musicEnabled')audio.setMusicEnabled(value);else{config[key]=value;game.setBattleRule(key,value);}updateSound();persistSettings();}});paintMapChoices();
  } else if(type==='update'){
    const release=preparedRelease,notes=release?.notes.length?release.notes:release?.version===APP_VERSION?RELEASE_NOTES:['更新文件已准备好。'];
    content.innerHTML=`<span class="eyebrow">新的炮火已就绪</span><h2>更新游戏${release?` · v${replayEscape(release.version)}`:''}</h2><ul class="update-notes">${notes.map(note=>`<li>${replayEscape(note)}</li>`).join('')}</ul><button id="confirm-game-update" class="button button-dark dialog-primary" data-action="confirm-game-update">安装更新 ${icon('refresh')}</button><button class="text-button" data-action="close">稍后再更新</button>`;
  } else if(type==='exit') {content.innerHTML=`<span class="eyebrow">暂别这一场炮火</span><h2>回演习场歇一歇？</h2><p class="dialog-intro">${!playback&&abandonmentWinner(game)!==null?'已进入第二完整回合，对方为AI队伍；退出将按己方败局结算积分。':'当前对局会结束，坦克选择与设置会保留。'}</p><button class="button button-dark dialog-primary" data-action="leave-match">回到演习场</button><button class="text-button" data-action="close">继续这场对局</button>`;
  } else if(type==='install') {
    content.innerHTML=`<span class="eyebrow">把战场装进口袋</span><h2>安装到 iPad。</h2><p class="dialog-intro">首次打开并完成离线缓存后，就能从主屏幕直接进入游戏，离线也可以开战。</p><div class="install-art"><img src="${import.meta.env.BASE_URL}icons/icon-192.png" alt="咪猪头坦克图标"/><strong>咪猪头的疯狂坦克</strong></div><ol class="install-steps"><li>用 Safari 打开游戏。</li><li>点击分享按钮，选择「添加到主屏幕」。</li><li>点「添加」，再从主屏幕打开。横过 iPad，就可以开始了。</li></ol><button class="button button-dark dialog-primary" data-action="close">知道啦 ${icon('check')}</button>`;
  } else if(type==='vehicles') {
    content.innerHTML=`<span class="eyebrow">战车形象手册</span><h2>十三台，各有自己的模样</h2><div class="vehicle-atlas">${VEHICLES.map(v=>`<article>${vehicleIcon(v)}<strong>${v.name}</strong><small>${v.era}</small><p>${v.trait}</p></article>`).join('')}</div><button class="button button-dark dialog-primary" data-action="close">认好了，回战场 ${icon('arrow')}</button>`;
  } else if(type==='projectiles') {
    const shells=[...VEHICLE_WEAPONS,weaponById('homing')];
    content.innerHTML=`<span class="eyebrow">小炮手的认弹手册</span><h2>看看这一发，长什么样</h2><p class="dialog-intro">26 种坦克炮弹 + 稀有空投弹。这里展示单枚，形状和颜色与战场一致。强化炮弹临时带星星尾迹；威力加强与火线共用一次 +50%，不可叠加。火线与雾气互斥，随机持续 1–2 个完整轮次。</p><div class="shell-gallery">${shells.map(w=>`<article><canvas class="shell-card-art" data-shell="${w.id}" aria-label="${w.name}弹体"></canvas><strong>${w.name}</strong><small>${VEHICLES.find(v=>v.normal===w.id||v.special===w.id)?.name??'稀有空投'} · ${w.shots??1} 枚${w.effect==='homing'?' · 追踪':''}</small></article>`).join('')}</div><button class="button button-dark dialog-primary" data-action="close">认好了，去开炮 ${icon('arrow')}</button>`;
  } else if(type==='guide') {
    content.innerHTML=guideMarkup(config.allowDragon);
  } else if(type==='stats') {
    content.innerHTML=progressionMarkup(progression,'mimi',import.meta.env.BASE_URL);
    content.addEventListener('click',profileClick);
  } else if(type==='log') {
    content.innerHTML=`<span class="eyebrow">战场里的那些瞬间</span><h2>作战记录。</h2><p class="dialog-intro">最近 24 条事件 · 当前第 ${game.round} 轮</p><ol class="battle-log">${game.log.length?game.log.map((line,i)=>`<li><span>${String(game.log.length-i).padStart(2,'0')}</span>${colorNames(line)}</li>`).join(''):'<li>战场很安静。第一发炮弹会写下故事。</li>'}</ol><button class="button button-dark dialog-primary" data-action="close">返回对局 ${icon('arrow')}</button>`;
  } else {
    dialog.classList.add('settings-dialog');
    content.innerHTML=`<span class="eyebrow">照你喜欢的来</span><h2>一点小设置。</h2><p class="dialog-intro">音乐陪着玩，音效帮着瞄。两种声音可以分别开关。</p><div class="settings-row"><div><strong>游戏音效</strong><p>点击、履带、蓄力、炮火与爆炸</p></div><button id="effects-toggle" class="toggle ${audio.soundEnabled?'on':''}" role="switch" aria-checked="${audio.soundEnabled}" aria-label="游戏音效"><span></span></button></div><div class="settings-row"><div><strong>背景音乐</strong><p>随实际地图切换，大厅与结算各有配乐</p></div><button id="music-toggle" class="toggle ${audio.musicEnabled?'on':''}" role="switch" aria-checked="${audio.musicEnabled}" aria-label="背景音乐"><span></span></button></div><div class="combat-settings">${[['selfDamage','自伤','允许自己的爆炸波及自身（友伤开启时也可自伤）'],['friendlyFire','友方伤害','开启后可伤到自己与队友，恢复弹也能治疗敌方'],['fallDamage','坠落伤害','关闭时落地不扣血；掉穿底边仍出局'],['powerAssist','显示蓄力辅助','停稳30毫秒后显示可命中敌方的力度范围，颜色越深越接近正中'],['tankBlocking','坦克相互阻挡','开启后坦克不能互相穿过；不影响炮弹命中'],['allowDragon','允许直接选择暴龙','不改变随机上阵的 1/10 概率']].map(([key,name,sub])=>`<div class="settings-row"><div><strong>${name}</strong><p>${sub}</p></div><button data-setting="${key}" class="toggle ${config[key as keyof Config]?'on':''}" role="switch" aria-checked="${!!config[key as keyof Config]}" aria-label="${name}"><span></span></button></div>`).join('')}</div><label class="form-label" for="volume">音量 <span id="volume-percent">${Math.round(audio.volume*100)}%</span></label><input id="volume" type="range" min="0" max="100" value="${Math.round(audio.volume*100)}"/><div class="snapshot-controls"><span id="snapshot-copy-status" class="snapshot-copy-status" role="status"></span><button type="button" id="repair-assets" class="snapshot-copy">修复素材</button><button type="button" id="copy-battle-snapshot" class="snapshot-copy">复制本局快照</button></div>${progressMarkup("repair-progress","素材修复")}<button class="button button-dark dialog-primary" data-action="close">设置好了 ${icon('check')}</button>`;
    $('#copy-battle-snapshot').addEventListener('click',copyBattleSnapshot);
    $('#repair-assets').addEventListener('click',async()=>{
      const button=$<HTMLButtonElement>('#repair-assets');button.disabled=true;button.textContent='修复中…';const progress=$('#repair-progress');showProgress(progress,null,'正在检查素材');
      try{const result=await repairGameAssets(APP_VERSION,(_checked,_total,detail)=>{if(progress.isConnected&&detail)showProgress(progress,Math.min(.98,detail.completedBytes/detail.totalBytes),'正在检查与修复素材',detail.failed?'部分素材暂不可用，其余仍在继续检查。':'');});showProgress(progress,.99,'正在恢复画面与声音');const missing=result.failed.map(f=>f.url);await Promise.all([repairCrewPortraits(missing),retryBattleSprites(missing),retryBrokenMaterialImages(missing),retryMaterialFonts(result.restored,missing),audio.retryAssets(game.tanks.map(t=>t.vehicleId),result.restored,missing)]);renderer.invalidate();dashboard.invalidate();updateUI();showProgress(progress,1,result.failed.length?'素材检查已完成':'素材已准备好',result.failed.length?'部分素材暂不可用，请联网后再次修复。':'画面与声音已重新加载。');toast(result.failed.length?`已修复 ${result.repaired} 项；${result.failed.length} 项暂不可用，请联网后重试。`:result.repaired?`已修复 ${result.repaired} 项素材。`:'素材完整，已重新加载可用资源。');}
      catch(error){showProgress(progress,null,'素材修复暂未完成','请联网后重试，已保存的对局不会丢失。');progress.querySelector('.material-progress-track')!.classList.remove('indeterminate');toast((error as Error).message);}
      finally{button.disabled=false;button.textContent='修复素材';}
    });
    $('#effects-toggle').addEventListener('click',()=>{audio.unlock();audio.setSoundEnabled(!audio.soundEnabled);$('#effects-toggle').classList.toggle('on',audio.soundEnabled);$('#effects-toggle').setAttribute('aria-checked',String(audio.soundEnabled));updateSound();persistSettings();});
    $('#music-toggle').addEventListener('click',()=>{audio.unlock();audio.setMusicEnabled(!audio.musicEnabled);$('#music-toggle').classList.toggle('on',audio.musicEnabled);$('#music-toggle').setAttribute('aria-checked',String(audio.musicEnabled));updateSound();persistSettings();});
    content.querySelectorAll<HTMLButtonElement>('[data-setting]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.setting as 'selfDamage'|'friendlyFire'|'allowDragon'|'fallDamage'|'powerAssist'|'tankBlocking';config[key]=!config[key];game.setBattleRule(key,!!config[key]);b.classList.toggle('on',!!config[key]);b.setAttribute('aria-checked',String(!!config[key]));persistSettings();}));
    $('#volume').addEventListener('input',e=>{audio.setVolume(Number((e.target as HTMLInputElement).value)/100);$('#volume-percent').textContent=`${Math.round(audio.volume*100)}%`;persistSettings();});
  }
  if(!dialog.open) dialog.showModal();paintProjectilePreviews(dialog);
  if(type==='log'||type==='settings'){
    const controls=content.querySelector('.snapshot-controls')??content.querySelector('.dialog-primary');
    const button=document.createElement('button');button.type='button';button.className='snapshot-copy';button.textContent='保存本局录像';button.dataset.action='save-replay';button.disabled=!recorder||!!playback;
    if(controls?.classList.contains('snapshot-controls'))controls.append(button);else controls?.before(button);
  }
  if(playback)content.querySelectorAll<HTMLButtonElement>('[data-setting]').forEach(button=>button.disabled=true);
}
function closeDialog() {const dialog=$<HTMLDialogElement>('#dialog');dialog.close();dialogKeepsMusic=false;audio.setSelectionMusic(false);game.paused=dialogPaused;setReplayAudioPaused(playback?.paused??game.paused);updateOverlay();updateUI();}
function setReplayAudioPaused(paused:boolean){audio.pause(paused,dialogKeepsMusic&&$<HTMLDialogElement>('#dialog').open);if(!paused&&playback?.charging){audio.startCharge();audio.updateCharge(game.active.power);}}
const replayTime=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const replayEscape=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function saveCurrentReplay(){
  if(!recorder||playback){toast('先开一局，才能保存本局录像。');return;}
  try{saveReplay(localStorage,recorder.export());toast('已保存本局录像，可在主界面播放。');}catch(error){toast((error as Error).message);}
}
function renderReplayList(content:HTMLElement){
  let clips:BattleReplay[]=[];let error='';try{clips=readReplays(localStorage);}catch(e){error=(e as Error).message;}
  content.innerHTML=`<span class="eyebrow">把这一局，再看一遍</span><h2>对局录像。</h2><p class="dialog-intro">保存或导入录像，可离线播放。最多6局；导出文件可在另一台设备继续观看。</p><div class="replay-tools"><button class="button button-outline" id="import-replay">${icon('plus')} 导入录像</button><input id="replay-file" type="file" accept=".json,application/json" hidden><small>JSON 文件 · 最多8MB</small></div><div class="replay-list">${error?`<p role="alert">${replayEscape(error)}</p>`:clips.length?clips.map(clip=>`<article class="replay-entry"><div><strong>${replayEscape(clip.initial.initial.mapName)}</strong><small>${replayEscape(new Date(clip.createdAt).toLocaleString('zh-CN'))} · ${replayTime(clip.duration)} · v${replayEscape(clip.gameVersion)}</small><span>${replayEscape(clip.initial.initial.slots.filter((s:any)=>s.enabled).map((s:any)=>s.name).join(' · '))}</span></div><button class="button button-outline" data-play-replay="${replayEscape(clip.id)}">播放</button><button class="button button-outline" data-export-replay="${replayEscape(clip.id)}">导出</button><button class="text-button" data-delete-replay="${replayEscape(clip.id)}" aria-label="删除这局录像">删除</button></article>`).join(''):'<p class="replay-empty">还没有录像。对局中或结算后，在设置或战斗记录里选择「保存本局录像」。</p>'}</div><button class="button button-dark dialog-primary" data-action="close">返回 ${icon('arrow')}</button>`;
  content.querySelectorAll<HTMLButtonElement>('[data-play-replay]').forEach(button=>button.addEventListener('click',()=>{try{const recording=readReplays(localStorage).find(r=>r.id===button.dataset.playReplay);if(!recording)throw Error('这局录像已不存在。');const player=new ReplayPlayer(recording);closeDialog();startReplay(player);}catch(e){toast((e as Error).message);}}));
  content.querySelectorAll<HTMLButtonElement>('[data-export-replay]').forEach(button=>button.addEventListener('click',()=>{try{const clip=readReplays(localStorage).find(r=>r.id===button.dataset.exportReplay);if(!clip)throw Error('这局录像已不存在。');const url=URL.createObjectURL(new Blob([exportReplay(clip)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=replayFilename(clip);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('录像已导出。');}catch(e){toast((e as Error).message);}}));
  const picker=content.querySelector<HTMLInputElement>('#replay-file')!;
  content.querySelector('#import-replay')!.addEventListener('click',()=>picker.click());
  picker.addEventListener('change',async()=>{const file=picker.files?.[0];picker.value='';if(!file)return;const button=content.querySelector<HTMLButtonElement>('#import-replay')!;button.disabled=true;try{if(file.size>MAX_REPLAY_FILE_BYTES)throw Error('录像文件超过8MB，无法导入。');const clip=parseReplayFile(await file.text(),APP_VERSION);try{importReplay(localStorage,clip);renderReplayList(content);toast('录像已导入，可以播放。');}catch(e){const player=new ReplayPlayer(clip);closeDialog();startReplay(player);toast(`已打开录像，未保存：${(e as Error).message}`);}}catch(e){toast((e as Error).message);}finally{button.disabled=false;}});
  content.querySelectorAll<HTMLButtonElement>('[data-delete-replay]').forEach(button=>button.addEventListener('click',()=>{try{deleteReplay(localStorage,button.dataset.deleteReplay!);renderReplayList(content);toast('录像已删除。');}catch(e){toast((e as Error).message);}}));
}
function startReplay(player:ReplayPlayer){
  if(playback)leaveReplay();
  cancelCharge();keys.clear();keyboardMove.reset();audio.resetEffects();audio.unlock();
  replayReturn={game,config,recorder,statsRecorded,immersive};playback=player;game=player.game;config={...game.config};recorder=null;
  renderer.setGame(game);refreshImpactProfiler();startReplayTour();setImmersive(true);lastPhase='';lastInventory='';audio.pause(false);void audio.preloadForMatch(game.tanks.map(t=>t.vehicleId));refreshReplayControls();updateUI();
  if(player.recording.gameVersion!==APP_VERSION)toast(`录像来自 v${player.recording.gameVersion}，播放结束时会校验结果。`);
}
function startReplayTour(){
  const touringGame=game,locked=game.introLocked;game.setIntroLocked(true);
  renderer.startTour(()=>{if(game===touringGame){game.setIntroLocked(locked);renderer.follow();}});
}
function leaveReplay(){
  if(!replayReturn)return;
  const previousMatch=replayReturn;playback=null;replayReturn=null;game=previousMatch.game;config=previousMatch.config;recorder=previousMatch.recorder;statsRecorded=previousMatch.statsRecorded;
  renderer.setGame(game);refreshImpactProfiler();keys.clear();keyboardMove.reset();audio.resetEffects();audio.pause(game.paused);setImmersive(previousMatch.immersive);lastPhase='';lastInventory='';refreshReplayControls();updateUI();
}
function refreshReplayControls(){
  const panel=$('#replay-controls');panel.classList.toggle('hidden',!playback);if(!playback)return;
  $('#replay-status').textContent=playback.done?(playback.verified?'播放完毕 · 已校验':'播放完毕 · 状态校验不一致'):playback.paused?'录像已暂停':'录像播放';
  $('#replay-time').textContent=`${replayTime(playback.time)} / ${replayTime(playback.recording.duration)}`;
  $('#replay-pause').textContent=playback.paused?'继续':'暂停';$<HTMLButtonElement>('#replay-pause').disabled=playback.done;$('#replay-speed').textContent=`${playback.speed}×`;
  for(const selector of ['#pause-button','#skip-button','#face-button'])$<HTMLButtonElement>(selector).disabled=true;
  $('#fire-note').textContent=playback.done?'录像已播完，可重播或退出':'录像播放中 · 可拖拽查看战场';
}
$('#replay-pause').addEventListener('click',()=>{if(playback){playback.paused=!playback.paused;setReplayAudioPaused(playback.paused);refreshReplayControls();}});
$('#replay-speed').addEventListener('click',()=>{if(playback){playback.speed=playback.speed===1?2:1;refreshReplayControls();}});
$('#replay-restart').addEventListener('click',()=>{if(playback){const clip=playback.recording;playback=new ReplayPlayer(clip);game=playback.game;config={...game.config};renderer.setGame(game);refreshImpactProfiler();startReplayTour();audio.resetEffects();audio.pause(false);lastPhase='';lastInventory='';refreshReplayControls();updateUI();}});
$('#replay-exit').addEventListener('click',leaveReplay);

let lastControlSound=0,lastDeniedControl=-Infinity;
function controlSound(target:HTMLElement) {
  const control=target.closest<HTMLElement>('button,a,select,summary,.choice-card,.weather-choice')??target.closest<HTMLElement>('canvas');
  if(!control)return;
  if(control.matches(':disabled,[aria-disabled="true"]')){const now=performance.now();if(now-lastDeniedControl>=180){lastDeniedControl=now;audio.unlock();audio.play('denied');}return;}
  audio.unlock();if(!control.closest('[data-item]'))audio.play('click');
}
document.addEventListener('pointerdown',e=>controlSound(e.target as HTMLElement),true);
document.addEventListener('click',e=>{if(e.detail===0) controlSound(e.target as HTMLElement);},true);
document.addEventListener('input',e=>{if((e.target as HTMLElement).matches('input[type="range"]')&&performance.now()-lastControlSound>70){audio.play('aim');lastControlSound=performance.now();}},true);
document.addEventListener('change',e=>{if((e.target as HTMLElement).matches('input,select'))audio.play('aim');},true);
document.addEventListener('click',e=>{
  const target=e.target as HTMLElement;
  const portrait=target.closest<HTMLElement>('[data-portrait]');if(portrait){if(suppressPortraitClick&&e.detail!==0){suppressPortraitClick=false;return;}focusPlayer(Number(portrait.dataset.portrait));return;}
  const dialogButton=target.closest<HTMLElement>('[data-dialog]');if(dialogButton) {showDialog(dialogButton.dataset.dialog!);return;}
  const action=target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if(action==='close') closeDialog();
  if(action==='leave-match'){closeDialog();if(playback)leaveReplay();else newMatch(config,false);}
  if(action==='confirm-game-update'){void installPreparedUpdate();return;}
  if(action==='save-replay')saveCurrentReplay();
  if(action==='resume') togglePause();
  if(action==='handoff') {game.acceptHandoff();audio.unlock();lastPhase='';updateUI();}
  if(action==='rematch') newMatch(config);
  const adjust=target.closest<HTMLElement>('[data-adjust]')?.dataset.adjust;
  if(adjust) {const [key,step]=adjust.split(':');if(key==='angle')adjustDisplayedAim(displayTank().angle+Number(step));else if(canControlBattle())game.setAim(game.active.angle,game.active.power+Number(step));updateUI();}
  const weapon=target.closest<HTMLElement>('[data-weapon]')?.dataset.weapon as WeaponId|undefined;
  if(weapon) {
    if(game.phase==='lobby') {game.selected=weapon;lastInventory='';updateUI();return;}
    if(!canControlBattle()) {toast('等轮到你，再选择武器。');return;}
    if(game.selectWeapon(weapon)) {lastInventory='';updateUI();}else toast(weapon==='homing'?'猎星追踪弹只能从空投箱获得。':'这件武器的弹药用完了。');
  }
  const item=target.closest<HTMLElement>('[data-item]')?.dataset.item as ItemId|undefined;
  if(item) {
    renderDetail(item);
    if(!canControlBattle()) {toast('道具要在自己的回合使用。');return;}
    if(useHumanItem(item,Number(target.closest<HTMLElement>('[data-item]')!.dataset.itemSlot))) {toast(item==='repair'?(game.restoring?'恢复弹已装填；轻点原地治疗，蓄力可投向队友。':'已取消恢复弹装填。'):item==='teleport'?(game.teleporting?'转移弹已装填，调整角度后蓄力发射。':'已取消转移弹装填。'):`${ITEMS.find(i=>i.id===item)!.name}已使用。`);lastInventory='';updateUI();}
    else toast(game.itemUnavailable(item,false,Number(target.closest<HTMLElement>('[data-item]')!.dataset.itemSlot))||'当前不能使用这件道具。');
  }
});
$('#start-button').addEventListener('click',()=>showDialog('setup'));
$('#new-game').addEventListener('click',()=>showDialog('setup'));
$('#sound-button').addEventListener('click',()=>showDialog('settings'));
$('#pause-button').addEventListener('click',togglePause);
$('#skip-button').addEventListener('click',()=>{cancelCharge();if(renderer.touring)renderer.finishTour();else game.skipTurn();updateUI();});
$('#exit-match').addEventListener('click',()=>showDialog('exit'));
function toggleMinimap(){const collapsed=$('#minimap-panel').classList.toggle('collapsed');$('#minimap-toggle').setAttribute('aria-expanded',String(!collapsed));$('#minimap-toggle').setAttribute('aria-label',collapsed?'展开小地图':'折叠小地图');}
$('#minimap-toggle').addEventListener('click',toggleMinimap);
$('#minimap-follow').addEventListener('click',()=>renderer.follow());
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
$('#angle').addEventListener('input',e=>{adjustDisplayedAim(Number((e.target as HTMLInputElement).value));updateUI();});
$('#power').addEventListener('input',e=>{game.setAim(game.active.angle,Number((e.target as HTMLInputElement).value));updateUI();});
$('#face-button').addEventListener('click',()=>{const t=displayTank();adjustDisplayedAim(t.angle,-t.direction);updateUI();});
function startCharge(pointer:number|null,event?:PointerEvent,startedAt=performance.now()) {
  if(!canControlBattle()||game.active.fallVelocity>0||charge) return false;
  setDrawer(false);charge={pointer,startedAt,previousPower:game.active.power,tank:game.current,touch:event?.pointerType==='touch',audible:false,pointerStartedAt:event?.timeStamp};
  audio.unlock();recorder?.cue('charge-wait');game.setAim(game.active.angle,MIN_POWER);updateUI();updateChargePreparation(performance.now());return true;
}
function cancelCharge() {
  powerMarkGesture?.reset();
  audio.stopCharge();
  if(charge) {recorder?.cue('charge-stop');game.tanks[charge.tank].power=charge.previousPower;charge=null;}
  updateChargePreparation(performance.now());
}
function finishCharge(maximum=false,event?:PointerEvent) {
  if(!charge) return;
  recorder?.cue('charge-stop');
  audio.stopCharge();
  const seconds=event&&charge.touch&&charge.pointerStartedAt!==undefined?Math.max(0,event.timeStamp-charge.pointerStartedAt)/1000:(performance.now()-charge.startedAt)/1000;
  const tank=charge.tank,power=maximum?100:heldChargePower(seconds);charge=null;updateChargePreparation(performance.now());
  if(canControlBattle()&&game.current===tank) game.setAim(game.active.angle,power);
  if(canControlBattle()&&game.current===tank) game.fire();updateUI();
}
const fireButton=$<HTMLButtonElement>('#fire-button');
const forceBar=$<HTMLButtonElement>('#power-meter');
const ownsChargePointer=(e:PointerEvent)=>charge?.pointer===e.pointerId&&(charge.pointerStartedAt===undefined||e.timeStamp>=charge.pointerStartedAt);
const releaseChargePointer=(e:PointerEvent)=>{if(powerMarkGesture?.owns(e.pointerId))return;if(ownsChargePointer(e)){e.preventDefault();finishCharge(false,e);}};
const cancelChargePointer=(e:PointerEvent)=>{if(powerMarkGesture?.owns(e.pointerId))return;if(ownsChargePointer(e)){cancelCharge();updateUI();}};
for(const control of [fireButton]){
  control.addEventListener('pointerdown',e=>{if(startCharge(e.pointerId,e)){e.preventDefault();try{control.setPointerCapture(e.pointerId);}catch{/* Document release also handles unavailable/lost capture. */}}});
  control.addEventListener('pointerup',releaseChargePointer);
  control.addEventListener('pointercancel',cancelChargePointer);
  // Capture loss alone is not cancellation. A document-level release below
  // completes the same action if the finger lifts outside its original button.
}
document.addEventListener('pointerup',releaseChargePointer,true);
document.addEventListener('pointercancel',cancelChargePointer,true);
powerMarkGesture=installPowerMarkers(forceBar,{allowed:canMarkPower,canCharge:()=>canControlBattle()&&game.active.fallVelocity===0,owner:()=>displayTank().id,mark:(power,owner)=>{game.setPowerMarker(power,owner);updateUI();},start:(e,at)=>startCharge(e.pointerId,e,at),finish:e=>finishCharge(false,e),cancel:()=>{cancelCharge();updateUI();},pending:()=>updateChargePreparation(performance.now())});
forceBar.addEventListener('contextmenu',e=>e.preventDefault());
fireButton.addEventListener('contextmenu',e=>e.preventDefault());
fireButton.addEventListener('click',e=>{if(e.detail===0&&(e as PointerEvent).pointerType!=='touch'&&!charge&&canControlBattle()){audio.unlock();game.fire();updateUI();}});

let angleRangePointer:number|null=null;
$<HTMLInputElement>('#angle').addEventListener('pointerdown',e=>{if(canAdjustAngle())angleRangePointer=e.pointerId;});
const releaseAngleRange=(e:PointerEvent)=>{if(angleRangePointer===e.pointerId)angleRangePointer=null;};
document.addEventListener('pointerup',releaseAngleRange,true);document.addEventListener('pointercancel',releaseAngleRange,true);window.addEventListener('blur',()=>angleRangePointer=null);
let padDrag:number|null=null,padOwner:number|null=null,padGame:Game|null=null;
const aimPad=$<HTMLButtonElement>('#aim-pad');
function instrumentAim(e:PointerEvent){const r=aimPad.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;if(Math.hypot(dx,dy)<12)return;const t=displayTank();if(!canAdjustAngle()||padGame!==game||padOwner!==t.id){endPad();return;}const aim=relativeAimForVector(dx,dy,game.tankSlope(t),t.direction);adjustDisplayedAim(aim.relative,aim.direction);updateUI();}
aimPad.addEventListener('pointerdown',e=>{if(!canAdjustAngle()) return;e.preventDefault();padDrag=e.pointerId;padOwner=displayTank().id;padGame=game;aimPad.setPointerCapture(e.pointerId);aimPad.classList.add('dragging');instrumentAim(e);});
aimPad.addEventListener('pointermove',e=>{if(padDrag===e.pointerId) instrumentAim(e);});
const endPad=()=>{padDrag=null;padOwner=null;padGame=null;aimPad.classList.remove('dragging');};
aimPad.addEventListener('pointerup',endPad);aimPad.addEventListener('pointercancel',endPad);aimPad.addEventListener('lostpointercapture',endPad);
aimPad.addEventListener('contextmenu',e=>e.preventDefault());

function bindMove(id:string,direction:-1|1) {
  const button=$<HTMLButtonElement>(id);
  button.addEventListener('pointerdown',e=>{
    if(e.button!==0||!canControlBattle()||game.active.fallVelocity>0)return;
    e.preventDefault();syncKeyboardMove();button.setPointerCapture(e.pointerId);
    if(keyboardMove.pressDirection(`pointer:${e.pointerId}`,direction,performance.now(),game.active.direction,d=>game.face(d)))game.move(direction,1/30);
  });
  const release=(e:PointerEvent)=>releaseMove(`pointer:${e.pointerId}`);
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
bindMove('#move-left',-1);bindMove('#move-right',1);
function releaseMove(input:string){
  syncKeyboardMove();
  if(canControlBattle()&&game.active.fallVelocity<=0&&!$<HTMLDialogElement>('#dialog').open)keyboardMove.release(input,performance.now(),game.active.direction,d=>game.face(d));
  else keyboardMove.reset();
}
function aimOnField(e:Pick<PointerEvent,'clientX'|'clientY'>) {
  if(!canControlBattle()) return;
  const rect=$('#battlefield').getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*renderer.viewWidth+renderer.offsetX,y=(e.clientY-rect.top)/rect.height*renderer.viewHeight+renderer.offsetY;
  if(!game.teleporting&&game.selected==='airstrike') game.targetX=clamp(x,20,game.worldWidth-20);
  else {
    const t=game.active,slope=game.tankSlope(t),dx=x-t.x-Math.sin(slope)*13,dy=y-t.y+Math.cos(slope)*13;
    const aim=relativeAimForVector(dx,dy,slope,t.direction);game.face(aim.direction);game.setAim(aim.relative,t.power);
  }
  updateUI();
}
installCrewPortraits();
const battlefield=$<HTMLCanvasElement>('#battlefield');
let fieldMultiTouch=false;
const edgePan=installEdgePanning(battlefield,()=>!fieldMultiTouch&&game.phase!=='lobby'&&!game.paused&&!playback?.paused&&!renderer.touring&&!game.weatherObservation&&game.phase!=='supply'&&!charge&&padDrag===null&&!$<HTMLDialogElement>('#dialog').open);
const fieldTouchIds=new Set<number>();
battlefield.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){fieldTouchIds.add(e.pointerId);fieldMultiTouch=fieldTouchIds.size>=2;if(fieldMultiTouch)edgePan.reset();}},true);
const endFieldTouch=(e:PointerEvent)=>{fieldTouchIds.delete(e.pointerId);fieldMultiTouch=fieldTouchIds.size>=2;};
for(const name of ['pointerup','pointercancel'])document.addEventListener(name,endFieldTouch as EventListener,true);
const resetFieldTouches=()=>{fieldTouchIds.clear();fieldMultiTouch=false;};
window.addEventListener('blur',resetFieldTouches);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetFieldTouches();});
function focusPlayer(id:number){const t=game.tanks[id];if(!t||!game.visible(t))return;if(renderer.touring)renderer.finishTour(false);renderer.focusAt(t.defeat?.x??t.x,t.defeat?.y??t.y);updateUI();}
function fieldPoint(p:{x:number;y:number}){const rect=battlefield.getBoundingClientRect();return {x:(p.x-rect.left)/rect.width*renderer.viewWidth+renderer.offsetX,y:(p.y-rect.top)/rect.height*renderer.viewHeight+renderer.offsetY};}
let fieldPortrait:number|null=null;
installMapGestures(battlefield,{
  blocked:e=>edgePan.owns(e.pointerId),
  press:p=>{const w=fieldPoint(p);fieldPortrait=renderer.portraitAt(w.x,w.y);},
  start:()=>{if(renderer.touring)renderer.finishTour(false);},
  pan:(dx,dy)=>{const rect=battlefield.getBoundingClientRect();renderer.panBy(dx/rect.width*renderer.viewWidth,dy/rect.height*renderer.viewHeight);},
  tap:p=>{if(fieldPortrait!==null)focusPlayer(fieldPortrait);else aimOnField({clientX:p.x,clientY:p.y});},
  hold:()=>{if(fieldPortrait!==null&&game.tanks[fieldPortrait]){focusPlayer(fieldPortrait);showDialog(`portrait:${fieldPortrait}`);}},
  zoomAllowed:()=>game.phase!=='lobby'&&!charge&&padDrag===null&&!$<HTMLDialogElement>('#dialog').open,
  zoom:(factor,p)=>{edgePan.reset();const rect=battlefield.getBoundingClientRect();renderer.zoomBy(factor,(p.x-rect.left)/rect.width,(p.y-rect.top)/rect.height);}
});
const mini=$<HTMLCanvasElement>('#minimap');
const locateMini=(p:{x:number;y:number})=>{if(renderer.touring)renderer.finishTour(false);const rect=mini.getBoundingClientRect();renderer.focusAt((p.x-rect.left)/rect.width*game.worldWidth,(p.y-rect.top)/rect.height*game.worldHeight);};
installMapGestures(mini,{start:()=>{},pan:()=>{},tap:locateMini,hold:()=>{},locate:locateMini});
let portraitTimer=0,portraitPointer=-1,portraitStart={x:0,y:0},suppressPortraitClick=false;
document.addEventListener('pointerdown',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-portrait]');if(!button)return;clearTimeout(portraitTimer);portraitPointer=e.pointerId;portraitStart={x:e.clientX,y:e.clientY};suppressPortraitClick=false;const id=Number(button.dataset.portrait);portraitTimer=window.setTimeout(()=>{suppressPortraitClick=true;if(game.tanks[id]){focusPlayer(id);showDialog(`portrait:${id}`);}},600);},true);
document.addEventListener('pointermove',e=>{if(e.pointerId===portraitPointer&&Math.hypot(e.clientX-portraitStart.x,e.clientY-portraitStart.y)>7){clearTimeout(portraitTimer);suppressPortraitClick=true;}},true);
for(const event of ['pointerup','pointercancel'])document.addEventListener(event,()=>clearTimeout(portraitTimer),true);
window.addEventListener('blur',()=>clearTimeout(portraitTimer));document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(portraitTimer);});
battlefield.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  if(e.key.toLowerCase()==='l'&&(e.ctrlKey||e.metaKey)&&e.shiftKey&&!(e.target as HTMLElement).matches('input,select,textarea')){e.preventDefault();if(!e.repeat)void copyBattleSnapshot();return;}
  if($<HTMLDialogElement>('#dialog').open) return;
  const target=e.target as HTMLElement;
  if(target.matches('input,select,textarea')) return;
  const key=e.key.toLowerCase();if(blockedAngleKeys.has(key)){if(e.repeat){e.preventDefault();return;}blockedAngleKeys.delete(key);}
  if(key==='escape') {togglePause();return;}
  if(key==='tab'&&game.phase!=='lobby'){e.preventDefault();toggleMinimap();audio.play('click');return;}
  if(key==='c'&&e.ctrlKey){e.preventDefault();renderer.follow();return;}
  if(key==='f5'&&renderer.touring){e.preventDefault();renderer.finishTour();updateUI();return;}
  if(!canControlBattle()){if(canAdjustAngle()&&['w','s','arrowup','arrowdown'].includes(key)){e.preventDefault();angleKeyOwner=displayTank().id;keys.add(key);}return;}
  if(isMoveKey(key)){e.preventDefault();syncKeyboardMove();if(!e.repeat&&game.active.fallVelocity<=0)keyboardMove.press(key,performance.now(),game.active.direction,direction=>game.face(direction));return;}
  if(['w','s','arrowup','arrowdown'].includes(key))angleKeyOwner=displayTank().id;
  if((key==='f3'||key==='f4')&&game.active.vehicleId){e.preventDefault();const v=vehicleById(game.active.vehicleId);if(game.selectWeapon(key==='f3'?v.normal:v.special)) {audio.play('click');updateUI();}return;}
  if(key==='f5'){e.preventDefault();cancelCharge();if(renderer.touring)renderer.finishTour();else game.skipTurn();updateUI();return;}
  if(['f9','f10','f11','f12'].includes(key)){e.preventDefault();const slot=Number(key.slice(1))-9,id=game.backpack()[slot];if(id&&useHumanItem(id,slot))updateUI();else toast(id?game.itemUnavailable(id,false,slot)??'当前不能使用':'这个道具槽是空的');return;}
  if(['arrowup','arrowdown'].includes(key)){e.preventDefault();keys.add(key);}
  if(['w','s','q','e',' '].includes(key)) {e.preventDefault();keys.add(key);}
  if(key===' '&&!e.repeat) startCharge(null);
});
document.addEventListener('keyup',e=>{
  const key=e.key.toLowerCase();blockedAngleKeys.delete(key);keys.delete(key);
  if(isMoveKey(key))releaseMove(key);
  if(e.key===' '&&charge?.pointer===null){e.preventDefault();finishCharge();}
});
window.addEventListener('blur',()=>{keys.clear();keyboardMove.reset();cancelCharge();});
let backgroundGame:Game|null=null,backgroundWasPaused=false;
document.addEventListener('visibilitychange',()=>{
  if(playback){audio.setPageHidden(document.hidden);if(!document.hidden){setReplayAudioPaused(playback.paused);renderer.invalidate();updateUI();}previous=performance.now();return;}
  if(document.hidden){keys.clear();keyboardMove.reset();cancelCharge();if(backgroundGame!==game){backgroundGame=game;backgroundWasPaused=game.paused;}game.paused=true;audio.setPageHidden(true);}
  else {if(backgroundGame===game)game.paused=backgroundWasPaused;backgroundGame=null;previous=performance.now();audio.setPageHidden(false);audio.pause(game.paused,dialogKeepsMusic&&$<HTMLDialogElement>('#dialog').open);renderer.invalidate();updateUI();}
});
window.addEventListener('resize',()=>renderer.resize());

// Only the narrow transform / colour-fill changes at display cadence.
const chargeFill=$('#charge-fill'),chargeFire=$('#fire-button'),chargeReadout=$('#power-value');
let lastPreparationFill=-1;
function updateChargePreparation(now:number){
  const pendingAt=powerMarkGesture?.pendingStart??null;
  const elapsed=pendingAt!==null?(now-pendingAt)/1000:charge?(now-charge.startedAt)/1000:playback?.waiting?playback.time-playback.waitingStartedAt:CHARGE_DELAY_SECONDS;
  const duration=charge?CHARGE_DELAY_SECONDS:playback?chargePreparationSeconds(playback.recording.gameVersion):CHARGE_DELAY_SECONDS;
  const active=Boolean(pendingAt!==null||charge||playback?.waiting||playback?.charging);
  const preparing=Boolean(pendingAt!==null|| (charge?elapsed<duration:playback?.waiting));
  const memory=$('#power-memory-fill'),last=displayTank().lastPower;memory.hidden=!active||last===null||game.phase==='lobby'||game.phase==='ended';memory.style.transform=`scaleX(${(last??0)/100})`;
  chargeFire.classList.toggle('charging',active);chargeFire.classList.toggle('charge-preparing',preparing);
  // The button visualizes only preparation; actual shot power belongs to the horizontal meter.
  const fill=preparing?chargeDelayProgress(elapsed,duration)*100:active?100:0;
  if(fill!==lastPreparationFill){lastPreparationFill=fill;chargeFire.style.setProperty('--charge',`${fill}%`);}
}
let chargeVisualPower=-1;
function updateChargeVisual(power:number){
  if(power===chargeVisualPower)return;chargeVisualPower=power;
  // Constants are created before the initial updateUI call at the foot of this file.
  chargeFill.style.transform=`scaleX(${power/100})`;
  const label=String(Math.round(power));if(chargeReadout.textContent!==label)chargeReadout.textContent=label;
}
const powerAssistance=new PowerAssistance($<HTMLCanvasElement>('#power-assistance'));
let victorySound:{game:Game;at:number}|null=null,lastDefeatSound=-Infinity;
let previous=performance.now(),lastUI=0;
function refreshImpactProfiler(){impactProfiler?.detach();impactProfiler=import.meta.env.DEV&&new URLSearchParams(location.search).get('impact-profile')==='1'?new ImpactProfiler(game,renderer,audio):null;}
function frame(now:number) {
  const dt=Math.max(0,Math.min((now-previous)/1000,0.05));previous=now;
  if(document.hidden||document.getElementById('opening-loading')){powerAssistance.clear();requestAnimationFrame(frame);return;}
  impactProfiler?.beginFrame(now);angleNudges.update(now);
  if(angleKeyOwner!==null&&angleKeyOwner!==displayTank().id){for(const key of ['w','s','arrowup','arrowdown'])if(keys.has(key))blockedAngleKeys.add(key);keys.clear();keyboardMove.reset();angleKeyOwner=null;}if(padDrag!==null&&(padGame!==game||padOwner!==displayTank().id))endPad();
  syncKeyboardMove();
  if(!canControlBattle()||game.active.fallVelocity>0||$<HTMLDialogElement>('#dialog').open)keyboardMove.reset();
  if(canControlBattle()&&!$<HTMLDialogElement>('#dialog').open) {
    if(charge&&charge.tank===game.current) {const seconds=(now-charge.startedAt)/1000;if(seconds>=CHARGE_DELAY_SECONDS&&!charge.audible){charge.audible=true;audio.startCharge();recorder?.cue('charge-start');}game.setAim(game.active.angle,heldChargePower(seconds));if(charge.audible)audio.updateCharge(game.active.power);if(game.active.power>=100)finishCharge(true);}
    if(canControlBattle()&&game.active.fallVelocity<=0)keyboardMove.step(now,dt,(direction,seconds)=>game.move(direction,seconds));else keyboardMove.reset();
    const angle=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),power=(keys.has('e')?1:0)-(keys.has('q')?1:0);
    if(angle||power) game.setAim(game.active.angle+angle*35*dt,game.active.power+power*28*dt);
  }else if(canAdjustAngle()&&angleKeyOwner===displayTank().id){const angle=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);if(angle)adjustDisplayedAim(displayTank().angle+angle*35*dt);}
  if(!renderer.touring){if(playback){if(!$<HTMLDialogElement>('#dialog').open){try{playback.advance(dt);}catch(error){playback.paused=true;toast(`录像播放失败：${(error as Error).message}`);}}}else if(impactProfiler)impactProfiler.measure('simulation',()=>game.update(dt));else game.update(dt);}
  const edge=edgePan.tick(dt);if(edge.x||edge.y)renderer.panBy(edge.x*game.motionScale,edge.y*game.motionScale);
  if(impactProfiler)impactProfiler.measure('scene',()=>renderer.draw(playback?.paused?0:dt*(playback?.speed??1)));else renderer.draw(playback?.paused?0:dt*(playback?.speed??1));dashboard.draw(game,displayTank(),renderer.offsetY,renderer.viewHeight,renderer.offsetX,renderer.viewWidth);
  const moving=game.movingUntil.findIndex(until=>until>game.elapsed);
  audio.setScene(game.phase==='lobby'?'lobby':game.phase==='ended'?'result':game.config.map,game.phase==='lobby'||game.phase==='ended'?undefined:game.matchBgm?.file??legacyMapBgmFile(game.config.map,game.gameVersion));
  audio.updateMovement(moving>=0&&game.phase==='aiming'&&!game.paused&&!playback?.paused,game.tanks[Math.max(0,moving)].x,game.tanks[game.viewer].x,game.tanks[Math.max(0,moving)].vehicleId,game.active.fuel<=0);
  const tracking=game.projectiles.find(p=>p.homing);audio.updateTracking(Boolean(tracking)&&!game.paused&&game.phase==='flying',tracking?.weapon,tracking?.x??0,game.tanks[game.viewer].x);
  if(charge&&(!canControlBattle()||charge.tank!==game.current)) cancelCharge();
  for(const event of game.drainEvents()) {
    if((event.type==='turn'||event.type==='shot')&&!renderer.touring)renderer.follow(event.type==='turn');
    if(event.type!=='explosion') $('#battle-message').innerHTML=colorNames(event.message);
    if(event.type==='shot') audio.play(event.transfer?'transfer':'shot',event.x,game.tanks[game.viewer].x,event.weapon);
    if(event.type==='explosion') audio.play('explosion',event.x,game.tanks[game.viewer].x,event.weapon);
    if(event.type==='weather'){if(!playback)toast(event.message);if(event.message.includes('火线'))audio.play('firewall');}
    if(event.type==='turn')audio.play('turn');
    if(event.type==='wind')audio.play('wind');
    if(event.type==='timeout')audio.play('warning');
    if(event.type==='win')victorySound={game,at:Math.max(performance.now(),lastDefeatSound+1000)};
    if(event.type==='defeat'){const defeated=event.value===undefined?game.tanks.find(t=>event.message===`${t.name}出局了。`):game.tanks[event.value],observer=displayTank().controller==='human'?displayTank():game.tanks[game.viewer];audio.play('death',event.x,observer.x,undefined,defeatPerspective(game,event,defeated));lastDefeatSound=performance.now();if(victorySound?.game===game)victorySound.at=Math.max(victorySound.at,lastDefeatSound+1000);}
    if(event.type==='crate') audio.play(event.message.includes('空降')?'supply':'crate-land',event.x,game.tanks[game.viewer].x);
    if(event.type==='lock') audio.play('lock',event.x,game.tanks[game.viewer].x,event.weapon);
    if(event.type==='crate-land') audio.play('crate-land',event.x,game.tanks[game.viewer].x);
  }
  if(playback)for(const cue of playback.drainCues()){if(cue.kind==='charge-start')audio.startCharge();if(cue.kind==='charge-stop')audio.stopCharge();if(cue.kind==='charge-power')audio.updateCharge(cue.power!);}
  if(victorySound){if(victorySound.game!==game)victorySound=null;else if(now>=victorySound.at&&!game.paused&&!playback?.paused){audio.play('win');victorySound=null;}}
  powerAssistance.update(game,displayTank(),!playback&&!$<HTMLDialogElement>('#dialog').open&&canControlBattle()&&!renderer.touring,padDrag!==null||angleRangePointer!==null||angleNudges.holding||keyboardMove.active||['w','s','arrowup','arrowdown'].some(k=>keys.has(k)),now,!!charge);
  updateChargePreparation(now);
  if(charge||playback?.charging)updateChargeVisual(game.active.power);
  if(now-lastUI>80&&(!game.paused||renderer.touring||playback)) {updateUI();lastUI=now;}
  impactProfiler?.finishFrame();
  requestAnimationFrame(frame);
}
setImmersive(false);renderInventory();updateSound();updateUI();refreshImpactProfiler();requestAnimationFrame(frame);
let applyingUpdate=false,updateReloadRequested=false;
let pageWorker=navigator.serviceWorker?.controller??null;
if('serviceWorker' in navigator){
  void navigator.serviceWorker.ready.then(reg=>{pageWorker??=reg.active;});
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    void retryUnavailableCrewPortraits();
    const current=navigator.serviceWorker.controller;
    if(!pageWorker){pageWorker=current;return;}
    if(current&&current!==pageWorker&&!applyingUpdate){pendingUpdate=true;updateUI();}
  });
}
const reloadUpdatedClient=()=>{if(applyingUpdate&&!updateReloadRequested){
  updateReloadRequested=true;const target=preparedRelease?.version??APP_VERSION;
  try{sessionStorage.setItem(UPDATE_RECEIPT,target);}catch{history.replaceState({...history.state,piggyUpdatedTo:target},'');}
  location.reload();
}};
async function loadPreparedRelease(){try{const response=await fetch(`${import.meta.env.BASE_URL}version.json?notes=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(response.ok)preparedRelease=readRelease(await response.json());}catch{/* A prepared worker can still be installed offline. */}}
const updateSW=registerSW({
  immediate:true,
  // The requested worker's activated state below owns reload, even on a fresh page.
  onNeedReload:()=>{},
  onNeedRefresh(){updateProgress.complete();pendingUpdate=true;updateUI();toast(game.phase==='lobby'||game.phase==='ended'?'新版本已准备好，点击「更新游戏」即可安装。':'新版本已准备好，本局结束后可更新。');},
  onRegisteredSW(_url,registration){swRegistration=registration;},
  onOfflineReady(){void retryUnavailableCrewPortraits();toast('离线缓存已就绪，断网也可以开战。');},
  onRegisterError(error){window.dispatchEvent(new Event('piggy:cache-unavailable'));console.warn('Offline cache registration failed',error);},
});
async function installPreparedUpdate(){
  if(applyingUpdate||(game.phase!=='lobby'&&game.phase!=='ended'))return;
  applyingUpdate=true;const button=$<HTMLButtonElement>('#confirm-game-update');if(button)button.disabled=true;
  try {
    if(!await applyWaitingUpdate(swRegistration,()=>updateSW(true),reloadUpdatedClient)){
      if(pageWorker&&swRegistration?.active?.state==='activated'&&swRegistration.active!==pageWorker)reloadUpdatedClient();
      else toast('更新文件还在准备，请稍后再试。');
    }
  }
  catch {toast('更新暂未完成，请稍后再试。');}
  finally {applyingUpdate=false;if(button)button.disabled=false;}
}
$('#apply-update').addEventListener('click',async()=>{if(applyingUpdate||(game.phase!=='lobby'&&game.phase!=='ended'))return;await loadPreparedRelease();showDialog('update');});
let updateCompleted=false;try{updateCompleted=consumeUpdateReceipt(sessionStorage,APP_VERSION);}catch{/* Optional session storage. */}
if(history.state?.piggyUpdatedTo){updateCompleted||=history.state.piggyUpdatedTo===APP_VERSION;const {piggyUpdatedTo,...state}=history.state;history.replaceState(state,'');}
const seenVersion=safeRead('piggy-last-version');
const reloaded=performance.getEntriesByType('navigation').some(entry=>(entry as PerformanceNavigationTiming).type==='reload');
if(reloaded&&saved&&(!seenVersion||typeof seenVersion==='string'&&compareVersions(APP_VERSION,seenVersion)>0))updateCompleted=true;
save('piggy-last-version',APP_VERSION);
if(updateCompleted)window.setTimeout(()=>toast(`游戏已更新至 v${APP_VERSION}。`),900);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e as typeof installPrompt;$('#install-button').classList.remove('hidden');});
window.addEventListener('appinstalled',()=>{$('#install-button').classList.add('hidden');installPrompt=null;toast('安装好了，从主屏幕就能进入游戏。');});
$('#install-button').addEventListener('click',async()=>{
  if(installPrompt){const prompt=installPrompt;await prompt.prompt();await prompt.userChoice;installPrompt=null;$('#install-button').classList.add('hidden');}
  else showDialog('install');
});
const standalone=window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || (navigator as Navigator&{standalone?:boolean}).standalone;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
if(standalone&&ios)document.documentElement.classList.add('ios-standalone');
if(!standalone&&ios) $('#install-button').classList.remove('hidden');
async function checkForUpdate() {
  if(checkingVersion) return;checkingVersion=true;updateProgress.checking();
  const buttons=['#version-button','#stage-version-button'].map(selector=>$<HTMLButtonElement>(selector));
  buttons.forEach(b=>{b.disabled=true;b.textContent='检查中…';});
  try {
    const response=await fetch(`${import.meta.env.BASE_URL}version.json?check=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw new Error('Version check failed');
    const latest=await response.json();preparedRelease=readRelease(latest);const newer=compareVersions(latest.version,APP_VERSION)>0;
    if(newer)void updateProgress.start(latest.version);
    if(swRegistration) await swRegistration.update();
    if(!newer&&swRegistration?.installing)void updateProgress.start(APP_VERSION);
    else if(!newer&&!swRegistration?.waiting)updateProgress.hide();
    if(swRegistration?.waiting) {updateProgress.complete();pendingUpdate=true;updateUI();}
    if(pendingUpdate) toast(game.phase==='lobby'||game.phase==='ended'?'更新已就绪，点击「更新游戏」。':'更新已就绪，本局结束后可安装。');
    else if(newer) toast(`发现 v${latest.version}，正在准备更新；准备好后会提示。`);
    else toast(`当前已是最新版本 v${APP_VERSION}。`);
  } catch {updateProgress.fail();toast(navigator.onLine?'暂时无法检查更新，请稍后再试。':`当前离线，正在使用 v${APP_VERSION}，联网后可检查更新。`);}
  finally {checkingVersion=false;buttons.forEach(b=>{b.disabled=false;b.textContent=b.id==='stage-version-button'?`v${APP_VERSION}`:`v${APP_VERSION} · 检查更新`;});}
}
$('#version-button').addEventListener('click',checkForUpdate);
$('#stage-version-button').addEventListener('click',checkForUpdate);

/** Opening waits for usable renderer/fonts/portrait fallbacks, never for audio autoplay. */
export const homeReady=Promise.allSettled([renderer.ready,document.fonts.ready,retryUnavailableCrewPortraits()]).then(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())));
