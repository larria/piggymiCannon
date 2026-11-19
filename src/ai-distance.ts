import {battleViewWidth} from './world-layout';
import type {Game,Tank} from './engine';
export function adaptiveAI(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=6);}
export function finalAIRecovery(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=7);}
export function causalAIShotSafety(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=9);}
export function aiTargetDistance(g:Game,t:Tank,target?:number){const e=g.knownAITargets().find(e=>e.id===(target??g.enemy.id))??g.knownAITargets()[0];return e?Math.hypot(e.x-t.x,e.y-t.y)/battleViewWidth(g.worldWidth):Infinity;}
