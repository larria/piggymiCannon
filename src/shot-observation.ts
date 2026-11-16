export type ObservationKind='ground'|'hit'|'fall'|'death';
export interface ShotObservation {target:number|null;point:{x:number;y:number}|null;kind:ObservationKind}
export const OBSERVATION_SECONDS:Record<ObservationKind,number>={ground:1.2,hit:1.8,fall:1.8,death:2.4};
export const OBSERVATION_PRIORITY:Record<ObservationKind,number>={ground:0,hit:1,fall:2,death:3};
