const { chromium } = require('playwright');

async function openTwitter() {
  console.log('🐦 Opening X/Twitter with Playwright...');
  
  // Launch browser with maximum visibility
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300, // Slow down for visibility
    args: ['--start-maximized'] // Start maximized
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Navigating to X/Twitter...');
    await page.goto('https://x.com', { waitUntil: 'networkidle' });
    
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'twitter-homepage.png', fullPage: true });
    
    console.log('📄 Getting page title...');
    const title = await page.title();
    console.log(`✅ Page loaded: ${title}`);
    
    // Check if we can see any Twitter-specific elements
    try {
      const loginButton = await page.waitForSelector('[data-testid="loginButton"], [href="/login"]', { timeout: 5000 });
      if (loginButton) {
        console.log('🔍 Found login button - X/Twitter loaded successfully!');
      }
    } catch {
      console.log('🔍 Page loaded (login button not immediately visible)');
    }
    
    console.log('🎯 X/Twitter is now open and ready!');
    console.log('📱 You should see the X/Twitter homepage in the browser window');
    console.log('📸 Screenshot saved as: twitter-homepage.png');
    console.log('');
    console.log('🔥 Browser will stay open for you to use!');
    console.log('⏳ Press Ctrl+C in terminal when you want to close it.');
    
    // Keep browser open indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error opening X/Twitter:', error.message);
    await browser.close();
  }
}

openTwitter();

