// Test script to verify verses URL works
const testVersesUrl = async (username, repoName = 'fivefold-bible-verses') => {
  const url = `https://raw.githubusercontent.com/${username}/${repoName}/main/verses.json`;
  
  console.log('🔍 Testing verses URL:', url);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Success! Verses loaded successfully');
    console.log(`📊 Found ${data.metadata?.totalVerses || 'unknown'} verses`);
    console.log(`📂 Found ${data.metadata?.totalCategories || 'unknown'} categories`);
    console.log('🎯 URL is working correctly!');
    
    return true;
  } catch (error) {
    console.log('❌ Error loading verses:', error.message);
    console.log('🔧 Please check:');
    console.log('   - Repository is public');
    console.log('   - verses.json exists in repository root');
    console.log('   - Username and repository name are correct');
    
    return false;
  }
};

// Usage: node test-verses-url.js YOUR_GITHUB_USERNAME
const username = process.argv[2];
if (!username) {
  console.log('Usage: node test-verses-url.js YOUR_GITHUB_USERNAME');
  process.exit(1);
}

testVersesUrl(username);

