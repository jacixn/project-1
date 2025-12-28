const fs = require('fs');
const path = require('path');

// Fisher-Yates shuffle with a seed for reproducibility
function seededShuffle(array, seed) {
  const shuffled = [...array];
  let m = shuffled.length;
  
  // Simple seeded random
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  
  while (m) {
    const i = Math.floor(random() * m--);
    [shuffled[m], shuffled[i]] = [shuffled[i], shuffled[m]];
  }
  
  return shuffled;
}

const versesPath = path.join(__dirname, '../ios/BiblelyVerseWidget/widget-verses.json');
const verses = JSON.parse(fs.readFileSync(versesPath, 'utf8'));

console.log(`Shuffling ${verses.length} verses...`);

// Use a fixed seed so the shuffle is reproducible
const shuffled = seededShuffle(verses, 42);

fs.writeFileSync(versesPath, JSON.stringify(shuffled, null, 2));
console.log('Done! Verses shuffled.');
