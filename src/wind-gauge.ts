import {NATURAL_WIND_LIMIT} from './wind-cycle';
export const WIND_GAUGE_LIMIT=NATURAL_WIND_LIMIT;
/** Center is calm; signed area grows towards the corresponding edge. */
export function windGaugeGeometry(wind:number){
 const value=Number.isFinite(wind)?Math.max(-WIND_GAUGE_LIMIT,Math.min(WIND_GAUGE_LIMIT,wind)):0;
 const end=50+value/WIND_GAUGE_LIMIT*50;
 return {value,start:Math.min(50,end),width:Math.abs(end-50),end};
}
/** The same magnitude has the same ink density in both directions. */
export function windGaugeColor(wind:number){const p=Math.abs(windGaugeGeometry(wind).value)/WIND_GAUGE_LIMIT;return `rgb(${Math.round(248-37*p)}, ${Math.round(229-65*p)}, ${Math.round(175-114*p)})`;}
export function updateWindGauge(element:HTMLElement,wind:number){
 const g=windGaugeGeometry(wind);element.style.setProperty('--wind-start',g.start+'%');element.style.setProperty('--wind-width',g.width+'%');element.style.setProperty('--wind-end',g.end+'%');
 element.style.setProperty('--wind-color',windGaugeColor(g.value));
 element.setAttribute('aria-valuenow',String(g.value));element.setAttribute('aria-valuetext',g.value===0?'无风':`向${g.value>0?'右':'左'}，风力${Math.abs(g.value/2).toFixed(1)}米每秒`);
 element.querySelector<HTMLElement>('.wind-end')!.hidden=g.value===0;
}
