const { chromium } = require('playwright');

async function connectToExistingBrowser() {
  console.log('🌐 Setting up Playwright to use your existing Chrome browser...');
  
  try {
    // Connect to existing Chrome browser (if running with remote debugging)
    // First, let's check if Chrome is running with debugging port
    console.log('🔍 Looking for existing Chrome browser...');
    
    let browser;
    try {
      // Try to connect to existing Chrome instance
      browser = await chromium.connectOverCDP('http://localhost:9222');
      console.log('✅ Connected to existing Chrome browser!');
    } catch (error) {
      console.log('⚠️ No existing Chrome found with remote debugging.');
      console.log('🚀 Starting Chrome with remote debugging enabled...');
      
      // Launch persistent Chrome browser
      const context = await chromium.launchPersistentContext('/tmp/playwright-chrome-profile', {
        headless: false,
        args: [
          '--remote-debugging-port=9222',
          '--no-first-run',
          '--no-default-browser-check'
        ]
      });
      browser = context.browser();
      console.log('✅ Chrome launched with remote debugging!');
    }
    
    // Get or create a page
    const contexts = browser.contexts();
    let context;
    
    if (contexts.length > 0) {
      context = contexts[0];
      console.log('📱 Using existing browser context');
    } else {
      context = await browser.newContext();
      console.log('📱 Created new browser context');
    }
    
    const pages = context.pages();
    let page;
    
    if (pages.length > 0) {
      page = pages[0];
      console.log('📄 Using existing browser tab');
    } else {
      page = await context.newPage();
      console.log('📄 Created new browser tab');
    }
    
    console.log('🎯 Browser is ready for automation!');
    console.log('💡 This browser will stay open and can be used normally');
    console.log('🔧 Playwright can now control this browser instance');
    
    return { browser, context, page };
    
  } catch (error) {
    console.error('❌ Error setting up browser connection:', error.message);
    throw error;
  }
}

// Function to navigate using the persistent browser
async function navigateWithPersistentBrowser(url) {
  console.log(`🌐 Navigating to: ${url}`);
  
  const { browser, context, page } = await connectToExistingBrowser();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const title = await page.title();
    console.log(`✅ Loaded: ${title}`);
    
    // Take screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.png`;
    await page.screenshot({ path: filename });
    console.log(`📸 Screenshot saved: ${filename}`);
    
    console.log('🔥 Browser remains open and ready for more commands!');
    console.log('💡 You can continue using this browser normally');
    
    return { browser, context, page };
    
  } catch (error) {
    console.error('❌ Navigation error:', error.message);
    throw error;
  }
}

// Export for use
module.exports = { connectToExistingBrowser, navigateWithPersistentBrowser };

// If run directly, demonstrate the connection
if (require.main === module) {
  console.log('🎭 Playwright Persistent Browser Setup');
  console.log('This will use your existing Chrome browser or start one that stays open');
  
  // Example usage
  navigateWithPersistentBrowser('https://www.google.com')
    .then(() => {
      console.log('✅ Setup complete! Browser is ready for automation.');
    })
    .catch(console.error);
}
