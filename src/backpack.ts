import {TURN_ITEMS,type ItemId} from './catalog';

export const BACKPACK_SIZE=4,SUPPLY_INTERVAL_ACTIONS=5;
/** Keep the rules and state shape of previously saved replays. */
export function modernBackpack(version:string){
 const v=version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
 return !v||Number(v[1])>3||Number(v[1])===3&&(Number(v[2])>2||Number(v[2])===2&&Number(v[3])>=8);
}
interface Inventory {items:Record<ItemId,number>;itemSlots?:(ItemId|null)[]}
/** Counts remain available to AI and diagnostics; physical slots retain their positions.
 * Reconcile imported snapshots and deliberate test/lab stock changes, never stack a slot. */
export function backpackSlots(t:Inventory):(ItemId|null)[]{
 let slots=t.itemSlots;
 if(!slots||slots.length!==BACKPACK_SIZE){slots=t.itemSlots=slots?.slice(0,BACKPACK_SIZE)??[];while(slots.length<BACKPACK_SIZE)slots.push(null);}
 for(let i=0;i<slots.length;i++)if(slots[i]!==null&&!TURN_ITEMS.includes(slots[i]!))slots[i]=null;
 // Most calls come from the HUD. Avoid short-lived arrays on that per-frame path.
 let changed=false;for(const id of TURN_ITEMS){let count=0;for(const value of slots)if(value===id)count++;if(count!==Math.max(0,Math.floor(t.items[id])))changed=true;}
 if(!changed)return slots;
 for(const id of TURN_ITEMS){
  let excess=slots.filter(value=>value===id).length-Math.max(0,Math.floor(t.items[id]));
  for(let i=slots.length-1;i>=0&&excess>0;i--)if(slots[i]===id){slots[i]=null;excess--;}
 }
 for(const id of TURN_ITEMS){
  let missing=Math.max(0,Math.floor(t.items[id]))-slots.filter(value=>value===id).length;
  while(missing-->0){const at=slots.indexOf(null);if(at<0)break;slots[at]=id;}
  t.items[id]=slots.filter(value=>value===id).length;
 }
 return slots;
}
export function takeBackpackItem(t:Inventory,id:ItemId,slot?:number){
 const slots=backpackSlots(t),at=slot??slots.indexOf(id);
 if(slots[at]!==id)return false;
 slots[at]=null;t.items[id]--;return true;
}
export function putBackpackItem(t:Inventory,id:ItemId){
 const slots=backpackSlots(t),at=slots.indexOf(null);
 if(at<0)return -1;
 slots[at]=id;t.items[id]++;return at;
}
