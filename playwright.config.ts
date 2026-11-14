import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel:false,
  workers:1,
  timeout:40_000,
  use:{
    channel:'chrome',
    headless:true,
    baseURL:'http://localhost:4177/piggymiCannon/',
    viewport:{width:1024,height:768},
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
