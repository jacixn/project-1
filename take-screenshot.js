const { chromium } = require('playwright');

async function takeScreenshot() {
  console.log('📸 Taking screenshot of current page...');
  
  try {
    // Connect to existing browser or launch new one
    const browser = await chromium.launch({ 
      headless: false,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Navigate to YouTube to get current state
    await page.goto('https://www.youtube.com', { waitUntil: 'networkidle' });
    
    // Wait a moment for everything to load
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `youtube-screenshot-${timestamp}.png`;
    
    console.log(`📸 Capturing screenshot as: ${filename}`);
    await page.screenshot({ 
      path: filename, 
      fullPage: true
    });
    
    // Also take a viewport screenshot
    const viewportFilename = `youtube-viewport-${timestamp}.png`;
    console.log(`📸 Capturing viewport screenshot as: ${viewportFilename}`);
    await page.screenshot({ 
      path: viewportFilename, 
      fullPage: false
    });
    
    console.log('✅ Screenshots taken successfully!');
    console.log(`📁 Full page: ${filename}`);
    console.log(`📁 Viewport: ${viewportFilename}`);
    
    // Get page info
    const title = await page.title();
    const url = page.url();
    console.log(`📄 Page: ${title}`);
    console.log(`🔗 URL: ${url}`);
    
    await browser.close();
    console.log('🔒 Browser closed.');
    
  } catch (error) {
    console.error('❌ Error taking screenshot:', error.message);
  }
}

takeScreenshot();
