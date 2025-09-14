const fs = require('fs');

// Read the KeyVersesComplete.js file to extract the original data
const content = fs.readFileSync('src/components/KeyVersesComplete.js', 'utf8');

// Extract categories array
const categoriesMatch = content.match(/const categories = (\[[\s\S]*?\]);/);
if (!categoriesMatch) {
  console.error('Could not find categories array');
  process.exit(1);
}

// Extract keyVerses array  
const versesMatch = content.match(/const keyVerses = (\[[\s\S]*?\]);(?=\s*const)/);
if (!versesMatch) {
  console.error('Could not find keyVerses array');
  process.exit(1);
}

// Parse the arrays
let categories, keyVerses;
try {
  categories = eval(categoriesMatch[1]);
  keyVerses = eval(versesMatch[1]);
} catch (error) {
  console.error('Error parsing arrays:', error.message);
  process.exit(1);
}

// Create the JSON structure
const versesData = {
  categories,
  keyVerses,
  metadata: {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    totalCategories: categories.length,
    totalVerses: keyVerses.length
  }
};

// Write to JSON file
fs.writeFileSync('verses.json', JSON.stringify(versesData, null, 2));
console.log(`Successfully created verses.json with ${categories.length} categories and ${keyVerses.length} verses`);
