const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));

  console.log('Navigating to catering...');
  try {
    await page.goto('https://pai-jeronimo.vercel.app/catering', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Loaded catering directly.');
    await page.waitForTimeout(2000);
  } catch(e) {
    console.error('Error navigating to catering:', e.message);
  }

  console.log('Navigating to cashflow...');
  try {
    await page.goto('https://pai-jeronimo.vercel.app/cashflow', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Loaded cashflow.');
    await page.waitForTimeout(2000);
  } catch(e) {
    console.error('Error navigating to cashflow:', e.message);
  }

  await browser.close();
})();
