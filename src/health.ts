interface Health {hp:number;maxHP:number;vehicleId?:string|null}
export const redHealthLimit=(tank:Health)=>Math.ceil(tank.maxHP*.3);
export const isRedHealth=(tank:Health)=>tank.hp>0&&tank.hp<=redHealthLimit(tank);
export const isRaging=(tank:Health)=>tank.vehicleId==='sea'&&tank.hp>0&&tank.hp<tank.maxHP*.5;
