export function compareVersions(left:string,right:string) {
  const parse=(value:string)=>value.replace(/^v/,'').split('.').map(n=>Number(n));
  const a=parse(left),b=parse(right);
  if(a.length!==3||b.length!==3||[...a,...b].some(n=>!Number.isInteger(n)||n<0)) throw new Error('Invalid version');
  for(let i=0;i<3;i++) if(a[i]!==b[i]) return Math.sign(a[i]-b[i]);
  return 0;
}
