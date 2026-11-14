export function rollWeather(rng:()=>number) {return {fog:Math.floor(rng()*30)===0,fireLine:Math.floor(rng()*30)===0};}
