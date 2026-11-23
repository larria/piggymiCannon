import type {CrewId} from './crew';
import {ink,oval} from './crew-ink';

export const crewOutfit={
 mimi:{light:'#a2a56b',main:'#777e4e',shade:'#49543b',hem:'#494738',collar:'#d8c098',accent:'#c47a55'},
 dad:{light:'#a69878',main:'#847454',shade:'#645943',hem:'#564b3c',collar:'#ead7a8',accent:'#6f865a'},
 fox:{light:'#ae6a56',main:'#905141',shade:'#6e3f39',hem:'#653d37',collar:'#e3c799',accent:'#d99e5d'},
 fish:{light:'#90b7a4',main:'#659c92',shade:'#46736c',hem:'#396963',collar:'#d2edcd',accent:'#e6b75b'},
} satisfies Record<CrewId,{light:string;main:string;shade:string;hem:string;collar:string;accent:string}>;

/** Low shoulders and folded lapels in the hatch, behind the moving head. */
export function paintHatchClothes(c:CanvasRenderingContext2D,id:CrewId){
 const o=crewOutfit[id],wide=id==='dad'?1.16:1;
 c.save();c.scale(wide,1);
 ink(c,'M-19 20Q-18 15-10 14L-5 12H7l6 2q6 1 8 6l1 7q-10 3-22 3t-21-3Z',o.main,o.hem,1.35);
 ink(c,'M-20 22q9-5 16-4l13 1 10 5 2 3q-9 3-22 3t-20-3Z',o.shade);
 ink(c,'M-15 19q4-4 10-4l-1 3-9 5-4 1Z',o.light);
 ink(c,'M-9 12l5 1 5 7-6 3-8-7Zm14 1 5-1 6 4-8 6-5-2Z',o.collar,o.hem,1.05);
 ink(c,'M-4 19l5 1 6-2-2 6-5 3-4-3Z',o.accent,o.hem,.9);
 oval(c,2,27,1.05,1,o.collar,o.hem,.55);
 c.restore();
}
