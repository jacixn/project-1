const { chromium } = require('playwright');

async function quickScreenshot() {
  console.log('📸 Taking quick screenshot...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to YouTube
    console.log('🌐 Loading YouTube...');
    await page.goto('https://www.youtube.com');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    const timestamp = Date.now();
    const filename = `youtube-${timestamp}.png`;
    
    console.log(`📸 Taking screenshot: ${filename}`);
    await page.screenshot({ path: filename });
    
    console.log('✅ Screenshot saved!');
    console.log(`📁 File: ${filename}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 Done!');
  }
}

quickScreenshot();

