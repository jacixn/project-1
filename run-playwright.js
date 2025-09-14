const PlaywrightAutomation = require('./playwright-automation');

async function main() {
  const automation = new PlaywrightAutomation();
  
  try {
    // Launch browser (change 'chromium' to 'firefox' or 'webkit' if desired)
    await automation.launch('chromium', false); // false = visible browser
    
    // Example automation - you can modify this:
    await automation
      .navigate('https://www.google.com')
      .wait(1000)
      .screenshot('google-homepage.png');
    
    console.log('🎉 Automation complete! Browser will stay open.');
    console.log('📸 Screenshot saved as: google-homepage.png');
    console.log('');
    console.log('🔧 The browser is ready for your commands!');
    console.log('💡 Modify run-playwright.js to add your automation steps.');
    
    // Keep browser open - remove this line if you want it to close automatically
    console.log('⏳ Browser will stay open. Press Ctrl+C to close.');
    await new Promise(() => {}); // Keep running
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await automation.close();
  }
}

main();

