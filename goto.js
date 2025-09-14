const { navigateWithPersistentBrowser } = require('./playwright-existing-browser');

async function goto(url) {
  if (!url) {
    console.log('❌ Please provide a URL');
    console.log('Usage: node goto.js <URL>');
    console.log('Example: node goto.js https://x.com');
    return;
  }
  
  // Add https:// if not present
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  console.log(`🚀 Going to: ${url}`);
  
  try {
    await navigateWithPersistentBrowser(url);
    console.log('✅ Navigation complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get URL from command line arguments
const url = process.argv[2];
goto(url);

