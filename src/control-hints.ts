/** Inspect icon controls without triggering them. Hold-to-move/fire keep their existing gestures. */
export function installControlHints(onShow:()=>void){
  const selector='.stage-button,.portrait-button,.quick-items button,.weapon-switcher button,#face-button,#skip-button,#exit-match,#minimap-toggle,#minimap-follow,#stage-version-button,[data-help-name]';
  const hint=document.createElement('div');hint.id='control-hint';hint.className='control-hint';hint.setAttribute('role','tooltip');hint.hidden=true;document.body.appendChild(hint);
  let timer=0,held:HTMLElement|null=null,pointer=-1,startX=0,startY=0,shown=false,keyboard=false;
  let suppressed:HTMLElement|null=null,suppressedPointer=-1,expires=0,previousDescription:string|null=null,described:HTMLElement|null=null;
  const hide=()=>{clearTimeout(timer);hint.hidden=true;if(described){if(previousDescription)described.setAttribute('aria-describedby',previousDescription);else described.removeAttribute('aria-describedby');}described=null;};
  const show=(el:HTMLElement)=>{
    if(!el.isConnected)return;
    hide();const name=el.dataset.helpName||el.getAttribute('aria-label')||el.title||el.textContent?.trim()||'';
    const description=el.dataset.helpDescription||el.title;
    const title=document.createElement('strong'),body=document.createElement('span');title.textContent=name;title.style.color=el.dataset.helpColor??'';body.textContent=description===name?'':description;
    hint.replaceChildren(title,body);hint.hidden=false;described=el;previousDescription=el.getAttribute('aria-describedby');el.setAttribute('aria-describedby',hint.id);
    const r=el.getBoundingClientRect(),h=hint.getBoundingClientRect();
    hint.style.left=`${Math.max(8,Math.min(innerWidth-h.width-8,r.left+r.width/2-h.width/2))}px`;
    hint.style.top=`${r.top>h.height+18?r.top-h.height-10:Math.min(innerHeight-h.height-8,r.bottom+10)}px`;
    onShow();
  };
  document.addEventListener('pointerdown',e=>{
    if(held&&e.pointerId!==pointer)return;
    keyboard=false;hide();shown=false;held=(e.target as HTMLElement).closest<HTMLElement>(selector);pointer=e.pointerId;startX=e.clientX;startY=e.clientY;
    if(held?.matches('[data-portrait]'))held=null;
    if(held){const target=held;timer=window.setTimeout(()=>{shown=true;show(target);},420);}
  },true);
  document.addEventListener('pointermove',e=>{if(e.pointerId===pointer&&Math.hypot(e.clientX-startX,e.clientY-startY)>10){if(shown&&held){suppressed=held;suppressedPointer=pointer;expires=Infinity;}hide();held=null;}},true);
  document.addEventListener('pointerup',e=>{if(e.pointerId===suppressedPointer&&expires===Infinity)expires=performance.now()+800;if(e.pointerId!==pointer)return;if(shown&&held){suppressed=held;suppressedPointer=pointer;expires=performance.now()+800;}held=null;hide();},true);
  document.addEventListener('pointercancel',e=>{if(e.pointerId===suppressedPointer)suppressed=null;if(e.pointerId===pointer){held=null;hide();}},true);
  document.addEventListener('click',e=>{if(suppressed&&performance.now()<expires&&suppressed.contains(e.target as Node)){e.preventDefault();e.stopImmediatePropagation();suppressed=null;}},true);
  document.addEventListener('contextmenu',e=>{if((e.target as HTMLElement).closest(selector))e.preventDefault();},true);
  document.addEventListener('keydown',e=>{keyboard=true;if(e.key==='Escape')hide();},true);
  document.addEventListener('focusin',e=>{const el=(e.target as HTMLElement).closest<HTMLElement>(selector);if(keyboard&&el)show(el);});
  document.addEventListener('focusout',e=>{if(described===e.target)hide();});window.addEventListener('resize',hide);window.addEventListener('blur',()=>{if(shown&&held){suppressed=held;suppressedPointer=pointer;expires=Infinity;}held=null;hide();});
}
