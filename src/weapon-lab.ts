import {VEHICLES} from './vehicles';
import {installWebSelects} from './web-select';
import {weaponById} from './catalog';
import {projectileSvg,warmProjectileVectors} from './projectile-vector';
import {projectileArt,projectileDrawScale} from './projectile-art';
import {vehicleIcon} from './vehicle-art';
import './weapon-lab.css';
import './web-select.css';

const root=document.querySelector<HTMLElement>('#weapon-lab')!;
let boosted=false,salvo=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
root.innerHTML=`<header><div><span class="lab-kicker">咪猪头的疯狂坦克</span><h1>炮弹绘图室</h1><p>13 台坦克，26 种武器。看看每一枚炮弹的轮廓、配色和推进动画。</p></div><a href="${import.meta.env.BASE_URL}">回到游戏 <span aria-hidden="true">↗</span></a></header><nav aria-label="绘图预览"><label>坦克 <select id="lab-tank"><option value="all">全部坦克</option>${VEHICLES.map(v=>`<option value="${v.id}">${v.name}</option>`).join('')}</select></label><button id="lab-salvo" aria-pressed="false">单枚细节</button><button id="lab-boost" aria-pressed="false">威力加强</button><button id="lab-pause" aria-pressed="${paused}">${paused?'播放动画':'暂停动画'}</button></nav><div class="lab-legend"><span><i></i>左：放大的 SVG 细节</span><span>右：游戏弹体实际绘制</span><span id="lab-summary">尾焰依参考帧绘制，星星仅在威力加强时出现。</span></div><section id="lab-gallery" aria-label="全部武器"></section><footer>自绘向量与游戏共用定义。齐射数量按现有武器机制展示，单枚参考图不会改变发射数量。</footer>`;
function render(){const filter=(document.querySelector('#lab-tank') as HTMLSelectElement).value;
 document.querySelector('#lab-gallery')!.innerHTML=VEHICLES.filter(v=>filter==='all'||v.id===filter).map(v=>`<article data-vehicle="${v.id}"><div class="lab-tank-name">${vehicleIcon(v)}<h2>${v.name}</h2><span>${v.era}</span></div><div class="lab-weapon-pair">${[v.normal,v.special].map((id,slot)=>{const w=weaponById(id),shots=salvo?w.shots??1:1;return `<section class="lab-weapon" data-weapon="${id}"><div class="lab-weapon-title"><span>${slot?'特殊':'普通'}</span><h3>${w.name}</h3><small>${w.shots??1} 枚${w.effect==='pierce'?' · 四节爆破':w.effect==='orbital'?' · 卫星定位':''}</small></div><div class="lab-visual"><div class="lab-svg-scene ${salvo?'salvo':''}">${Array.from({length:shots},(_,i)=>`<div class="lab-shell" style="--lane:${i};--count:${shots}">${projectileSvg(id,!paused,4,i*.03,boosted)}</div>`).join('')}</div><div class="lab-in-game"><canvas width="240" height="150" data-lab-shell="${id}" aria-label="${v.name}${w.name}游戏绘制"></canvas><span>游戏比例</span></div></div></section>`;}).join('')}</div></article>`).join('');
 document.querySelector('#lab-boost')!.setAttribute('aria-pressed',String(boosted));document.querySelector('#lab-salvo')!.setAttribute('aria-pressed',String(salvo));document.querySelector('#lab-salvo')!.textContent=salvo?'齐射展示':'单枚细节';document.querySelector('#lab-pause')!.setAttribute('aria-pressed',String(paused));document.querySelector('#lab-pause')!.textContent=paused?'播放动画':'暂停动画';
 if(paused)document.querySelectorAll<SVGSVGElement>('.lab-shell>svg').forEach(svg=>svg.pauseAnimations());
 paint();
}
installWebSelects(root);document.querySelector('#lab-tank')!.addEventListener('change',render);document.querySelector('#lab-boost')!.addEventListener('click',()=>{boosted=!boosted;render();});document.querySelector('#lab-salvo')!.addEventListener('click',()=>{salvo=!salvo;render();});document.querySelector('#lab-pause')!.addEventListener('click',()=>{paused=!paused;render();});
let time=0,last=0;
// One loop, only visible cards. The exact battlefield function is shown alongside SVG.
import {paintBoostStars} from './projectile-vector';
function paint(){document.querySelectorAll<HTMLCanvasElement>('[data-lab-shell]').forEach(canvas=>{const rect=canvas.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;const id=canvas.dataset.labShell!,c=canvas.getContext('2d')!;c.clearRect(0,0,240,150);c.save();c.translate(132,75);c.scale(2*projectileDrawScale(id),2*projectileDrawScale(id));projectileArt(c,id,weaponById(id as any).color,time);if(boosted)paintBoostStars(c,id,time);c.restore();});}
function frame(now:number){if(!paused&&!document.hidden){time+=Math.min(.05,(now-last)/1000);paint();}last=now;requestAnimationFrame(frame);}
warmProjectileVectors();render();requestAnimationFrame(frame);
// Avoid idle redraw work while this preview is in a background tab.
document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=performance.now();paint();}});
