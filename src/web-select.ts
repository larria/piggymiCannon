const chevron='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const check='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8 3 3 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export function selectMenuPlacement(rect:{left:number;right:number;top:number;bottom:number;width:number},viewport:{left:number;top:number;width:number;height:number},wantedHeight:number,wantedWidth:number){
 const gap=6,gutter=8,right=viewport.left+viewport.width,bottom=viewport.top+viewport.height;
 const width=Math.min(Math.max(rect.width,wantedWidth),Math.max(0,viewport.width-gutter*2));
 const below=Math.max(0,bottom-rect.bottom-gap-gutter),above=Math.max(0,rect.top-viewport.top-gap-gutter),up=below<Math.min(wantedHeight,180)&&above>below;
 const height=Math.min(wantedHeight,up?above:below),left=Math.max(viewport.left+gutter,Math.min(rect.left,right-gutter-width));
 return {left,top:up?rect.top-gap-height:rect.bottom+gap,width,height,up};
}
const controllers=new WeakMap<HTMLElement,WebSelects>();let sequence=0;
function labelOf(select:HTMLSelectElement){
 if(select.getAttribute('aria-label'))return select.getAttribute('aria-label')!;
 const label=select.labels?.[0]?.cloneNode(true) as HTMLElement|undefined;label?.querySelectorAll('select,.paper-select').forEach(e=>e.remove());
 return label?.textContent?.trim()||select.name||'选择';
}
function identity(select:HTMLSelectElement):Record<string,string>{return select.id?{id:select.id}:Object.fromEntries(['team','controller','difficulty'].filter(k=>select.dataset[k]!==undefined).map(k=>[k,select.dataset[k]!]));}
class PaperSelect {
 readonly wrapper=document.createElement('span');readonly trigger=document.createElement('button');readonly value=document.createElement('span');readonly menu=document.createElement('div');
 readonly key:Record<string,string>;active=0;signature='';rows:HTMLElement[]=[];private prefix='';private typedAt=0;private name:string;
 constructor(readonly native:HTMLSelectElement,readonly owner:WebSelects){
  this.key=identity(native);this.name=labelOf(native);const id=`paper-select-${++sequence}`;
  this.wrapper.className='paper-select';this.trigger.className='paper-select-trigger';this.trigger.type='button';this.trigger.id=id;
  this.trigger.setAttribute('role','combobox');this.trigger.setAttribute('aria-haspopup','listbox');this.trigger.setAttribute('aria-expanded','false');this.trigger.setAttribute('aria-controls',id+'-menu');this.trigger.setAttribute('aria-label',this.name);
  this.value.className='paper-select-value';this.trigger.append(this.value);this.trigger.insertAdjacentHTML('beforeend',chevron);
  this.menu.className='paper-select-menu';this.menu.id=id+'-menu';this.menu.hidden=true;this.menu.setAttribute('role','listbox');this.menu.setAttribute('aria-label',this.name);
  if(typeof this.menu.showPopover==='function')this.menu.setAttribute('popover','manual');
  native.before(this.wrapper);this.wrapper.append(native,this.trigger,this.menu);native.tabIndex=-1;native.setAttribute('aria-hidden','true');native.dataset.webSelect='true';
  this.trigger.addEventListener('click',e=>{e.preventDefault();this.owner.active===this?this.owner.close(true):this.open();});
  this.trigger.addEventListener('keydown',this.keydown);native.addEventListener('change',this.changed);native.addEventListener('focus',this.focus);
  this.menu.addEventListener('pointermove',e=>{const row=(e.target as HTMLElement).closest<HTMLElement>('[data-option-index]');if(row&&!this.disabled(Number(row.dataset.optionIndex)))this.highlight(Number(row.dataset.optionIndex),false);});
  this.menu.addEventListener('click',e=>{const row=(e.target as HTMLElement).closest<HTMLElement>('[data-option-index]');if(row){e.preventDefault();this.choose(Number(row.dataset.optionIndex));}});
  this.refresh();
 }
 private focus=()=>this.trigger.focus();private changed=()=>this.refresh();
 disabled(index:number){const option=this.native.options[index];return !option||option.disabled||(option.parentElement instanceof HTMLOptGroupElement&&option.parentElement.disabled);}
 refresh(){
  const option=this.native.selectedOptions[0],text=option?.textContent?.trim()??'',shown=option?.dataset.shortLabel??text;if(this.value.textContent!==shown)this.value.textContent=shown;
  if(this.trigger.disabled!==this.native.disabled)this.trigger.disabled=this.native.disabled;this.trigger.title=text;this.trigger.setAttribute('aria-description',`当前：${text}`);
  if(this.owner.active===this){if(this.native.disabled||!this.native.isConnected)this.owner.close(false);else this.build();}
 }
 build(){
  const signature=JSON.stringify([...this.native.options].map(o=>[o.value,o.textContent,o.disabled,o.parentElement instanceof HTMLOptGroupElement?[o.parentElement.label,o.parentElement.disabled]:'',o.selected,o.dataset.swatch]));
  if(signature===this.signature)return;this.signature=signature;this.menu.replaceChildren();this.rows=[];let group='';
  [...this.native.options].forEach((option,index)=>{
   const label=option.parentElement instanceof HTMLOptGroupElement?option.parentElement.label:'';
   if(label&&label!==group){const heading=document.createElement('div');heading.className='paper-select-group';heading.textContent=label;this.menu.append(heading);}group=label;
   const row=document.createElement('div');row.className='paper-select-option';row.id=this.menu.id+'-'+index;row.dataset.optionIndex=String(index);row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.selected));row.setAttribute('aria-disabled',String(this.disabled(index)));
   if(option.dataset.swatch){const dot=document.createElement('span');dot.className='paper-select-swatch';dot.style.backgroundColor=option.dataset.swatch;dot.setAttribute('aria-hidden','true');row.append(dot);}
   const text=document.createElement('span');text.textContent=option.textContent;row.append(text);row.insertAdjacentHTML('beforeend',check);this.menu.append(row);this.rows.push(row);
  });
 }
 open(){
  if(this.native.disabled)return;this.owner.close(false);this.owner.active=this;this.build();this.active=Math.max(0,this.native.selectedIndex);
  if(this.disabled(this.active))this.active=[...this.native.options].findIndex((_,i)=>!this.disabled(i));
  (this.native.closest('dialog')??this.owner.root).append(this.menu);this.menu.hidden=false;
  this.menu.style.setProperty('--select-accent',getComputedStyle(this.native).color);this.trigger.setAttribute('aria-expanded','true');
  this.position();try{if(this.menu.hasAttribute('popover'))this.menu.showPopover();}catch{this.menu.removeAttribute('popover');}
  this.highlight(this.active,true);this.trigger.focus({preventScroll:true});
 }
 position(){
  if(!this.native.isConnected){this.owner.close(false);return;}
  const rect=this.trigger.getBoundingClientRect(),v=visualViewport,viewport={left:v?.offsetLeft??0,top:v?.offsetTop??0,width:v?.width??innerWidth,height:v?.height??innerHeight};
  if(rect.bottom<viewport.top||rect.top>viewport.top+viewport.height){this.owner.close(false);return;}
  const groups=this.menu.querySelectorAll('.paper-select-group').length;
  const placement=selectMenuPlacement(rect,viewport,Math.min(336,this.native.options.length*44+14+groups*24),Math.max(148,...[...this.native.options].map(o=>(o.textContent?.length??0)*13+58)));
  Object.assign(this.menu.style,{left:`${placement.left}px`,top:`${placement.top}px`,width:`${placement.width}px`,maxHeight:`${placement.height}px`});this.menu.dataset.direction=placement.up?'up':'down';
 }
 highlight(index:number,scroll:boolean){
  if(index<0||this.disabled(index))return;this.active=index;this.rows.forEach((row,i)=>row.classList.toggle('active-option',i===index));this.trigger.setAttribute('aria-activedescendant',this.rows[index]?.id??'');
  if(scroll)this.rows[index]?.scrollIntoView({block:'nearest'});
 }
 choose(index:number){
  if(this.disabled(index))return;const changed=this.native.selectedIndex!==index;this.native.selectedIndex=index;this.owner.close(false);
  if(changed){this.native.dispatchEvent(new Event('input',{bubbles:true}));this.native.dispatchEvent(new Event('change',{bubbles:true}));}else this.refresh();
  queueMicrotask(()=>this.owner.restoreFocus(this.key));
 }
 private keydown=(event:KeyboardEvent)=>{
  if(event.isComposing)return;const open=this.owner.active===this;
  if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(event.key)){
   if(event.key==='Escape'&&!open)return;event.preventDefault();event.stopPropagation();
   if(event.key==='Escape'){this.owner.close(true);return;}
   if(event.key==='Enter'||event.key===' '){open?this.choose(this.active):this.open();return;}
   if(!open)this.open();const eligible=[...this.native.options].map((_,i)=>i).filter(i=>!this.disabled(i));
   let at=eligible.indexOf(this.active);at=event.key==='Home'?0:event.key==='End'?eligible.length-1:Math.max(0,Math.min(eligible.length-1,at+(event.key==='ArrowUp'?-1:1)));this.highlight(eligible[at],true);return;
  }
  if(event.key==='Tab'){if(open)this.owner.close(false);return;}
  if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   event.preventDefault();event.stopPropagation();const now=performance.now();this.prefix=now-this.typedAt<700?this.prefix+event.key:event.key;this.typedAt=now;
   if(!open)this.open();const term=this.prefix.toLocaleLowerCase(),index=[...this.native.options].findIndex((o,i)=>!this.disabled(i)&&(o.text.toLocaleLowerCase().startsWith(term)||o.value.toLocaleLowerCase().startsWith(term)));if(index>=0)this.highlight(index,true);
  }
 };
 destroy(){if(this.owner.active===this)this.owner.close(false);this.native.removeEventListener('change',this.changed);this.native.removeEventListener('focus',this.focus);this.menu.remove();}
}
class WebSelects {
 active:PaperSelect|null=null;private instances=new Map<HTMLSelectElement,PaperSelect>();private observer:MutationObserver;private frame=0;
 constructor(readonly root:HTMLElement){
  this.observer=new MutationObserver(()=>this.refresh());this.observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected','label','value']});
  document.addEventListener('pointerdown',e=>{if(this.active&&!this.active.wrapper.contains(e.target as Node)&&!this.active.menu.contains(e.target as Node))this.close(false);},true);
  document.addEventListener('keydown',e=>{if(this.active&&e.key==='Escape'){e.preventDefault();e.stopPropagation();this.close(true);}},true);
  document.addEventListener('scroll',e=>{if(this.active&&!this.active.menu.contains(e.target as Node))this.reposition();},true);
  root.closest('dialog')?.addEventListener('close',()=>this.close(false));window.addEventListener('resize',()=>this.reposition());visualViewport?.addEventListener('resize',()=>this.reposition());visualViewport?.addEventListener('scroll',()=>this.reposition());
  this.refresh();
 }
 refresh(){
  for(const [select,instance] of this.instances)if(!this.root.contains(select)){instance.destroy();this.instances.delete(select);}
  this.root.querySelectorAll<HTMLSelectElement>('select').forEach(select=>{
   if(select.multiple||select.size>1)return;let instance=this.instances.get(select);if(!instance){instance=new PaperSelect(select,this);this.instances.set(select,instance);}else instance.refresh();
  });
 }
 close(focus:boolean){
  const active=this.active;if(!active)return;this.active=null;try{if(active.menu.matches(':popover-open'))active.menu.hidePopover();}catch{/* Fixed-position fallback on older browsers. */}
  active.menu.hidden=true;active.wrapper.append(active.menu);active.trigger.setAttribute('aria-expanded','false');active.trigger.removeAttribute('aria-activedescendant');if(focus&&active.trigger.isConnected)active.trigger.focus({preventScroll:true});
 }
 restoreFocus(key:Record<string,string>){this.refresh();for(const [select,instance] of this.instances)if(Object.entries(key).length&&Object.entries(key).every(([k,v])=>k==='id'?select.id===v:select.dataset[k]===v)){instance.trigger.focus({preventScroll:true});return;}}
 private reposition(){if(!this.active||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=0;this.active?.position();});}
}
export function installWebSelects(root:HTMLElement){let controller=controllers.get(root);if(!controller){controller=new WebSelects(root);controllers.set(root,controller);}return controller;}
