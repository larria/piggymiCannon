/** Suppress browser gestures without stopping the game's Pointer Events. */
export function installMobileGestureGuards(root:HTMLElement){
  const inside=(event:Event)=>event.target instanceof Node&&(root.contains(event.target)||(document.body.classList.contains('combat-mode')&&[document,document.body,document.documentElement].includes(event.target as any)));
  const prevent=(event:Event)=>{if(inside(event)&&event.cancelable)event.preventDefault();};
  for(const type of ['gesturestart','gesturechange','gestureend','contextmenu','dblclick','dragstart'])document.addEventListener(type,prevent,{passive:false});
  document.addEventListener('selectstart',event=>{if(!(event.target instanceof Element)||!event.target.closest('input,select,textarea'))prevent(event);});
  document.addEventListener('touchmove',event=>{if(event.touches.length>1)prevent(event);},{passive:false});
}
