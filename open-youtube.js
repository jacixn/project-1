const { chromium } = require('playwright');

async function openYouTube() {
  console.log('🎥 Opening YouTube with Playwright...');
  
  // Launch browser with maximum visibility
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300, // Slow down for visibility
    args: ['--start-maximized'] // Start maximized
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Navigating to YouTube...');
    await page.goto('https://www.youtube.com', { waitUntil: 'networkidle' });
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'youtube-homepage.png', fullPage: true });
    
    console.log('📄 Getting page title...');
    const title = await page.title();
    console.log(`✅ Page loaded: ${title}`);
    
    console.log('🎯 YouTube is now open and ready!');
    console.log('📱 You should see the YouTube homepage in the browser window');
    console.log('📸 Screenshot saved as: youtube-homepage.png');
    console.log('');
    console.log('🔥 Browser will stay open for you to use!');
    console.log('⏳ Press Ctrl+C in terminal when you want to close it.');
    
    // Keep browser open indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error opening YouTube:', error.message);
    await browser.close();
  }
}

openYouTube();

