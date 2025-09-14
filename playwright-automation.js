const { chromium, firefox, webkit } = require('playwright');

class PlaywrightAutomation {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch(browserType = 'chromium', headless = false) {
    console.log(`🚀 Launching ${browserType} browser...`);
    
    const browsers = { chromium, firefox, webkit };
    this.browser = await browsers[browserType].launch({ 
      headless,
      slowMo: 100 // Slow down actions for visibility
    });
    
    this.page = await this.browser.newPage();
    console.log('✅ Browser ready!');
    return this;
  }

  async navigate(url) {
    console.log(`📱 Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
    return this;
  }

  async screenshot(filename = 'screenshot.png') {
    console.log(`📸 Taking screenshot: ${filename}`);
    await this.page.screenshot({ path: filename, fullPage: true });
    return this;
  }

  async click(selector) {
    console.log(`👆 Clicking: ${selector}`);
    await this.page.click(selector);
    return this;
  }

  async fill(selector, text) {
    console.log(`✏️ Filling "${selector}" with: ${text}`);
    await this.page.fill(selector, text);
    return this;
  }

  async type(selector, text, delay = 100) {
    console.log(`⌨️ Typing in "${selector}": ${text}`);
    await this.page.type(selector, text, { delay });
    return this;
  }

  async waitForSelector(selector, timeout = 5000) {
    console.log(`⏳ Waiting for: ${selector}`);
    await this.page.waitForSelector(selector, { timeout });
    return this;
  }

  async getText(selector) {
    const text = await this.page.textContent(selector);
    console.log(`📄 Text from "${selector}": ${text}`);
    return text;
  }

  async getTitle() {
    const title = await this.page.title();
    console.log(`📄 Page title: ${title}`);
    return title;
  }

  async wait(milliseconds) {
    console.log(`⏱️ Waiting ${milliseconds}ms...`);
    await this.page.waitForTimeout(milliseconds);
    return this;
  }

  async evaluate(script) {
    console.log(`🔧 Executing JavaScript: ${script}`);
    const result = await this.page.evaluate(script);
    console.log(`📊 Result:`, result);
    return result;
  }

  async close() {
    console.log('🔒 Closing browser...');
    if (this.browser) {
      await this.browser.close();
    }
    console.log('✅ Browser closed!');
  }
}

// Export for use
module.exports = PlaywrightAutomation;

// If run directly, start interactive mode
if (require.main === module) {
  console.log('🎭 Playwright Automation Ready!');
  console.log('Usage examples:');
  console.log('const automation = new PlaywrightAutomation();');
  console.log('await automation.launch().navigate("https://google.com").screenshot();');
}
