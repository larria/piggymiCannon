import type {Game,GameEvent,Tank} from './engine';
/** Gate simulation changes so old recordings retain their movement rules. */
export function modernAssistance(version:string){const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);return !v||+v[1]>5||+v[1]===5&&(+v[2]>0||+v[2]===0&&+v[3]>=5);}
export function defeatPerspective(game:Game,event:GameEvent,defeated?:Tank){
 const observer=game.dashboardHuman!==null?game.tanks[game.dashboardHuman]:game.dashboardTank.controller==='human'?game.dashboardTank:game.tanks[game.viewer];
 return !!defeated&&defeated.team===(event.observerTeam??observer.team);
}
