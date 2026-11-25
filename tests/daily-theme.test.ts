import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {THEMES,localThemeDay,themeForDay} from '../src/daily-theme';

test('daily palettes are stable, cover all seven each cycle and never repeat on adjacent local dates',()=>{
 for(const seed of [0,42,0xffffffff])for(let day=-14;day<730;day++){
  const palette=themeForDay(day,seed);assert.equal(themeForDay(day,seed),palette);assert.notEqual(palette,themeForDay(day-1,seed));
  if(day%7===0)assert.deepEqual(new Set(Array.from({length:7},(_,i)=>themeForDay(day+i,seed))),new Set(THEMES));
 }
 assert.equal(localThemeDay(new Date(2026,2,8,23,59)),localThemeDay(new Date(2026,2,8,0,1)));
 assert.equal(localThemeDay(new Date(2026,2,9,0,1))-localThemeDay(new Date(2026,2,8,23,59)),1);
});

test('all palette inks maintain WCAG AA contrast on paper, raised surfaces and controls',()=>{
 const css=readFileSync('src/daily-theme.css','utf8');
 const luminance=(hex:string)=>hex.slice(1).match(/../g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
 const check=(theme:string,fg:string,bg:string)=>{const l=[luminance(fg),luminance(bg)].sort((a,b)=>b-a);assert.ok((l[0]+.05)/(l[1]+.05)>=4.5,`${theme}: ${fg} on ${bg}`);};
 for(const theme of THEMES){
  const row=css.match(new RegExp(`\\[data-daily-theme=${theme}\\]\\{([^}]+)`))![1];
  const tokens=Object.fromEntries([...row.matchAll(/--theme-(\w+):(#[0-9a-f]{6})/g)].map(([,k,v])=>[k,v]));
  for(const text of [tokens.ink,tokens.muted])for(const surface of ['#ffffff',tokens.wash])check(theme,text,surface);
  for(const fill of [tokens.action,tokens.hover])check(theme,'#ffffff',fill);
 }
});
