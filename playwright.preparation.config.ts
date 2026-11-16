import {defineConfig} from '@playwright/test';
const webkit=process.env.PIGGY_TEST_BROWSER==='webkit';
export default defineConfig({testDir:'./tests/preparation',workers:1,timeout:120_000,use:{browserName:webkit?'webkit':'chromium',channel:webkit?undefined:'chrome',headless:true,viewport:{width:1194,height:834},deviceScaleFactor:2,isMobile:true,hasTouch:true,baseURL:'http://localhost:4180'},webServer:{command:'npx vite --host 127.0.0.1 --port 4180 --strictPort',url:'http://localhost:4180',reuseExistingServer:!process.env.CI}});
