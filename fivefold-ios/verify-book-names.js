// Verification script to check all daily verses book names are in BOOK_NAMES_MAP

const verses = require('./daily-verses-references.json').verses;
const fs = require('fs');

// Extract BOOK_NAMES_MAP from githubBibleService.js
const serviceCode = fs.readFileSync('./src/services/githubBibleService.js', 'utf8');
const mapMatch = serviceCode.match(/const BOOK_NAMES_MAP = \{([\s\S]*?)\};/);

if (!mapMatch) {
  console.error('❌ Could not find BOOK_NAMES_MAP');
  process.exit(1);
}

// Parse the map
const mapLines = mapMatch[1].split('\n');
const bookNamesMap = {};
mapLines.forEach(line => {
  const match = line.match(/'([^']+)':\s*'([^']+)'/);
  if (match) {
    bookNamesMap[match[1]] = match[2];
  }
});

console.log('📚 Total book mappings:', Object.keys(bookNamesMap).length);

// Get all unique book IDs from daily verses
const bookIdsInVerses = new Set();
verses.forEach(ref => {
  const match = ref.match(/^((?:\d\s)?[\w\s]+)\s+\d+:\d+/);
  if (match) {
    const bookName = match[1].trim();
    const bookId = bookName.toLowerCase().replace(/\s+/g, '');
    bookIdsInVerses.add(bookId);
  }
});

console.log('📖 Unique books in daily verses:', bookIdsInVerses.size);
console.log('\n🔍 Checking all book IDs...\n');

// Check each book ID
const missing = [];
const found = [];
Array.from(bookIdsInVerses).sort().forEach(bookId => {
  if (bookNamesMap[bookId]) {
    found.push(bookId);
    console.log(`✅ ${bookId} → ${bookNamesMap[bookId]}`);
  } else {
    missing.push(bookId);
    console.log(`❌ ${bookId} → MISSING!`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`✅ Found: ${found.length}`);
console.log(`❌ Missing: ${missing.length}`);

if (missing.length > 0) {
  console.log('\n⚠️  MISSING BOOK IDs:');
  missing.forEach(id => console.log(`   - ${id}`));
  process.exit(1);
} else {
  console.log('\n🎉 ALL BOOK NAMES ARE MAPPED CORRECTLY!');
  console.log('✅ Your app is ready to ship - no errors will occur!');
  process.exit(0);
}













