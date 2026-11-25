/** Suppress browser gestures without stopping the game's Pointer Events. */
export function installMobileGestureGuards(root:HTMLElement){
  const inside=(event:Event)=>event.target instanceof Node&&(root.contains(event.target)||(document.body.classList.contains('combat-mode')&&[document,document.body,document.documentElement].includes(event.target as any)));
  const touchDevice=matchMedia('(any-pointer: coarse)');
  const prevent=(event:Event)=>{if(inside(event)&&event.cancelable)event.preventDefault();};
  document.addEventListener('contextmenu',event=>{if(touchDevice.matches&&event.cancelable)event.preventDefault();else prevent(event);},{capture:true,passive:false});
  for(const type of ['gesturestart','gesturechange','gestureend','dblclick','dragstart'])document.addEventListener(type,prevent,{passive:false});
  document.addEventListener('selectstart',event=>{
    if(event.target instanceof Element&&event.target.closest('input,select,textarea,[contenteditable="true"]'))return;
    if(touchDevice.matches&&event.cancelable)event.preventDefault();else prevent(event);
  },true);
  document.addEventListener('touchmove',event=>{if(event.touches.length>1)prevent(event);},{passive:false});
}
