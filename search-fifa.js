const PlaywrightAutomation = require('./playwright-automation');

async function searchFifa() {
  const automation = new PlaywrightAutomation();
  
  try {
    console.log('🎭 Starting FIFA search with Playwright...');
    
    // Launch browser
    await automation.launch('chromium', false);
    
    // Navigate to Google
    await automation.navigate('https://www.google.com');
    
    // Wait for the search box to be ready
    await automation.waitForSelector('textarea[name="q"]');
    
    // Type "fifa" in the search box
    await automation.type('textarea[name="q"]', 'fifa', 150);
    
    // Take a screenshot before searching
    await automation.screenshot('fifa-search-before.png');
    
    // Press Enter to search (or click search button)
    await automation.evaluate(() => {
      document.querySelector('textarea[name="q"]').form.submit();
    });
    
    // Wait for results to load
    await automation.wait(3000);
    
    // Take a screenshot of results
    await automation.screenshot('fifa-search-results.png');
    
    // Get the page title
    const title = await automation.getTitle();
    
    // Get some search results
    const results = await automation.evaluate(() => {
      const resultElements = document.querySelectorAll('h3');
      const results = [];
      for (let i = 0; i < Math.min(5, resultElements.length); i++) {
        results.push(resultElements[i].textContent);
      }
      return results;
    });
    
    console.log('🏆 FIFA Search Results:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result}`);
    });
    
    console.log('📸 Screenshots saved:');
    console.log('  - fifa-search-before.png');
    console.log('  - fifa-search-results.png');
    
    console.log('✅ FIFA search completed! Browser will stay open.');
    console.log('⏳ Press Ctrl+C to close the browser.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error during FIFA search:', error.message);
    await automation.close();
  }
}

searchFifa();

