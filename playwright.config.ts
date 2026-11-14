import { defineConfig } from '@playwright/test';
const webkit=process.env.PIGGY_TEST_BROWSER==='webkit';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel:false,
  workers:1,
  timeout:40_000,
  use:{
    browserName:webkit?'webkit':'chromium',channel:webkit?undefined:'chrome',
    headless:true,
    baseURL:'http://localhost:4177/piggymiCannon/',
    viewport:{width:1194,height:834},
    isMobile:true,
    hasTouch:true,
    serviceWorkers:'allow',
    trace:'retain-on-failure',
  },
  webServer:{
    command:'npm run preview:pages',
    url:'http://localhost:4177/piggymiCannon/',
    reuseExistingServer:!process.env.CI,
  },
});
