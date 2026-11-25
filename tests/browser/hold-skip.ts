import type {Page} from '@playwright/test';
export async function holdSkip(page:Page){
 const button=page.locator('#skip-button');
 await button.hover();
 await page.mouse.down();
 try{await page.waitForTimeout(1080);}finally{await page.mouse.up();}
}
