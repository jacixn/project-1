// Test script to verify ALL Bible versions are working
import completeBibleService from '../services/completeBibleService';

export async function testAllBibleVersions() {
  console.log('=' .repeat(60));
  console.log('🔍 COMPREHENSIVE BIBLE VERSION TEST');
  console.log('=' .repeat(60));
  
  const versions = ['kjv', 'niv', 'nkjv', 'esv', 'nlt', 'msg'];
  const testCases = [
    { book: 'genesis', chapter: 1, expectedVerses: 31, name: 'Genesis 1' },
    { book: 'psalms', chapter: 23, expectedVerses: 6, name: 'Psalm 23' },
    { book: 'john', chapter: 3, expectedVerses: 36, name: 'John 3' },
    { book: 'matthew', chapter: 5, expectedVerses: 48, name: 'Matthew 5' },
    { book: 'revelation', chapter: 22, expectedVerses: 21, name: 'Revelation 22' }
  ];
  
  const results = {
    passed: 0,
    failed: 0,
    details: {}
  };
  
  for (const version of versions) {
    console.log(`\n📖 Testing ${version.toUpperCase()} Version:`);
    console.log('-'.repeat(40));
    
    results.details[version] = {
      passed: 0,
      failed: 0,
      errors: []
    };
    
    for (const test of testCases) {
      const chapterId = `${test.book}_${test.chapter}`;
      
      try {
        const verses = await completeBibleService.getVerses(chapterId, version);
        
        if (!verses || verses.length === 0) {
          console.log(`  ❌ ${test.name}: NO VERSES RETURNED!`);
          results.details[version].failed++;
          results.details[version].errors.push(`${test.name}: No verses`);
          results.failed++;
        } else if (verses.length < test.expectedVerses * 0.8) {
          console.log(`  ⚠️  ${test.name}: Only ${verses.length}/${test.expectedVerses} verses (INCOMPLETE!)`);
          results.details[version].failed++;
          results.details[version].errors.push(`${test.name}: Only ${verses.length}/${test.expectedVerses} verses`);
          results.failed++;
        } else {
          console.log(`  ✅ ${test.name}: ${verses.length} verses loaded`);
          
          // Show first verse to prove it's different per version
          const firstVerse = verses[0].content;
          const preview = firstVerse.substring(0, 60);
          console.log(`     First verse: "${preview}..."`);
          
          // Check that it has "Verse" prefix
          if (verses[0].displayNumber && verses[0].displayNumber.includes('Verse')) {
            console.log(`     ✓ Has "Verse" prefix: ${verses[0].displayNumber}`);
          }
          
          results.details[version].passed++;
          results.passed++;
        }
      } catch (error) {
        console.log(`  ❌ ${test.name}: ERROR - ${error.message}`);
        results.details[version].failed++;
        results.details[version].errors.push(`${test.name}: ${error.message}`);
        results.failed++;
      }
    }
    
    // Version summary
    const versionResult = results.details[version];
    console.log(`\n  ${version.toUpperCase()} Summary: ${versionResult.passed} passed, ${versionResult.failed} failed`);
  }
  
  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests Run: ${results.passed + results.failed}`);
  console.log(`✅ PASSED: ${results.passed}`);
  console.log(`❌ FAILED: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  // Version comparison
  console.log('\n📖 VERSION BREAKDOWN:');
  for (const [version, details] of Object.entries(results.details)) {
    const status = details.failed === 0 ? '✅ WORKING' : '❌ BROKEN';
    console.log(`  ${version.toUpperCase()}: ${status} (${details.passed}/${details.passed + details.failed} tests passed)`);
    if (details.errors.length > 0) {
      console.log(`    Issues: ${details.errors.join(', ')}`);
    }
  }
  
  // Test verse differences between versions
  console.log('\n🔄 TESTING VERSION DIFFERENCES:');
  const testChapter = 'john_3';
  const versesByVersion = {};
  
  for (const version of versions) {
    try {
      const verses = await completeBibleService.getVerses(testChapter, version);
      if (verses && verses.length > 0) {
        versesByVersion[version] = verses[15]?.content || verses[0].content; // John 3:16 or first verse
      }
    } catch (error) {
      versesByVersion[version] = 'ERROR';
    }
  }
  
  console.log('\nJohn 3:16 in different versions:');
  for (const [version, text] of Object.entries(versesByVersion)) {
    if (text !== 'ERROR') {
      const preview = text.substring(0, 80);
      console.log(`  ${version.toUpperCase()}: "${preview}..."`);
    } else {
      console.log(`  ${version.toUpperCase()}: ❌ Failed to load`);
    }
  }
  
  // Check if versions are actually different
  const uniqueTexts = new Set(Object.values(versesByVersion).filter(t => t !== 'ERROR'));
  if (uniqueTexts.size === 1) {
    console.log('\n⚠️  WARNING: All versions showing SAME text! API not working properly!');
  } else {
    console.log(`\n✅ Confirmed: ${uniqueTexts.size} different version texts detected`);
  }
  
  return results;
}

// Run the test
testAllBibleVersions().then(results => {
  console.log('\n✅ Test complete!');
}).catch(error => {
  console.error('\n❌ Test failed:', error);
});
