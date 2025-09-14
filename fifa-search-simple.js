const { chromium } = require('playwright');

async function searchFifaSimple() {
  console.log('🏆 Starting FIFA search - you should see a browser window open!');
  
  // Launch browser with maximum visibility
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500, // Slow down for visibility
    args: ['--start-maximized'] // Start maximized
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Opening Google...');
    await page.goto('https://www.google.com');
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(2000);
    
    console.log('🔍 Looking for search box...');
    const searchBox = await page.waitForSelector('textarea[name="q"], input[name="q"]', { timeout: 10000 });
    
    console.log('⌨️ Typing "FIFA"...');
    await searchBox.type('FIFA', { delay: 200 });
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'fifa-typed.png', fullPage: true });
    
    console.log('🚀 Pressing Enter to search...');
    await page.keyboard.press('Enter');
    
    console.log('⏳ Waiting for results...');
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking results screenshot...');
    await page.screenshot({ path: 'fifa-results.png', fullPage: true });
    
    console.log('✅ FIFA search completed!');
    console.log('📱 Browser window should be showing FIFA results');
    console.log('📸 Screenshots saved: fifa-typed.png and fifa-results.png');
    console.log('');
    console.log('🔥 The browser will stay open so you can see the FIFA results!');
    console.log('⏳ Press Ctrl+C in terminal to close when done.');
    
    // Keep browser open indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
  }
}

searchFifaSimple();

