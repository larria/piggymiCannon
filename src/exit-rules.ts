import type {Game} from './engine';import {precisionPolish} from './match-polish';
/** Two opposing sides, one wholly AI. Replays/hotseat never invent a loser. */
export function abandonmentWinner(g:Game):number|null{
 if(!precisionPolish(g.gameVersion)||g.roundNumber<2||g.phase==='lobby'||g.phase==='ended')return null;
 const teams=[...new Set(g.tanks.map(t=>t.team))];if(teams.length!==2)return null;
 return teams.find(team=>g.tanks.filter(t=>t.team===team).every(t=>t.controller==='ai')&&g.tanks.some(t=>t.team!==team&&t.controller==='human'))??null;
}
