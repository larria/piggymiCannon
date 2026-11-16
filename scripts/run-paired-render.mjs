import {spawnSync} from 'node:child_process';
for(let round=1;round<=3;round++)for(const mode of ['reference','pixi']){
 const env={...process.env,PIGGY_RENDER_REPORT:`QA/v3.0.0-${process.env.PIGGY_TEST_BROWSER??'chromium'}-${mode}-run${round}.json`};
 if(mode==='reference')env.PIGGY_BASELINE_REF='pre-pixi-v3.0.0';else delete env.PIGGY_BASELINE_REF;
 const result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/render-baseline.ts'],{env,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status??1);
}
