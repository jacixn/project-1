/**
 * Generate Widget Verses JSON
 * 
 * This script fetches verse text from Aaron Taylor's Bible GitHub repo
 * and creates a JSON file with all 2,306 verses for the widget.
 * 
 * Run with: node scripts/generateWidgetVerses.js
 */

const fs = require('fs');
const path = require('path');

const BIBLE_URL = 'https://raw.githubusercontent.com/arron-taylor/bible-versions/main/versions/en/NEW%20LIVING%20TRANSLATION.json';

// Book name mapping (reference name → GitHub JSON key)
const BOOK_NAME_MAP = {
  'Genesis': 'Genesis',
  'Exodus': 'Exodus',
  'Leviticus': 'Leviticus',
  'Numbers': 'Numbers',
  'Deuteronomy': 'Deuteronomy',
  'Joshua': 'Joshua',
  'Judges': 'Judges',
  'Ruth': 'Ruth',
  '1 Samuel': '1 Samuel',
  '2 Samuel': '2 Samuel',
  '1 Kings': '1 Kings',
  '2 Kings': '2 Kings',
  '1 Chronicles': '1 Chronicles',
  '2 Chronicles': '2 Chronicles',
  'Ezra': 'Ezra',
  'Nehemiah': 'Nehemiah',
  'Esther': 'Esther',
  'Job': 'Job',
  'Psalm': 'Psalms',
  'Psalms': 'Psalms',
  'Proverbs': 'Proverbs',
  'Ecclesiastes': 'Ecclesiastes',
  'Song of Solomon': 'Song of Solomon',
  'Song of Songs': 'Song of Solomon',
  'Isaiah': 'Isaiah',
  'Jeremiah': 'Jeremiah',
  'Lamentations': 'Lamentations',
  'Ezekiel': 'Ezekiel',
  'Daniel': 'Daniel',
  'Hosea': 'Hosea',
  'Joel': 'Joel',
  'Amos': 'Amos',
  'Obadiah': 'Obadiah',
  'Jonah': 'Jonah',
  'Micah': 'Micah',
  'Nahum': 'Nahum',
  'Habakkuk': 'Habakkuk',
  'Zephaniah': 'Zephaniah',
  'Haggai': 'Haggai',
  'Zechariah': 'Zechariah',
  'Malachi': 'Malachi',
  'Matthew': 'Matthew',
  'Mark': 'Mark',
  'Luke': 'Luke',
  'John': 'John',
  'Acts': 'Acts',
  'Romans': 'Romans',
  '1 Corinthians': '1 Corinthians',
  '2 Corinthians': '2 Corinthians',
  'Galatians': 'Galatians',
  'Ephesians': 'Ephesians',
  'Philippians': 'Philippians',
  'Colossians': 'Colossians',
  '1 Thessalonians': '1 Thessalonians',
  '2 Thessalonians': '2 Thessalonians',
  '1 Timothy': '1 Timothy',
  '2 Timothy': '2 Timothy',
  'Titus': 'Titus',
  'Philemon': 'Philemon',
  'Hebrews': 'Hebrews',
  'James': 'James',
  '1 Peter': '1 Peter',
  '2 Peter': '2 Peter',
  '1 John': '1 John',
  '2 John': '2 John',
  '3 John': '3 John',
  'Jude': 'Jude',
  'Revelation': 'Revelation'
};

// Parse a reference like "Genesis 1:1" or "Numbers 6:24-26"
function parseReference(ref) {
  // Match patterns like "1 John 3:16" or "Genesis 1:1-3"
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) {
    console.warn(`Could not parse reference: ${ref}`);
    return null;
  }
  
  const [, book, chapter, startVerse, endVerse] = match;
  return {
    book: book.trim(),
    chapter: parseInt(chapter),
    startVerse: parseInt(startVerse),
    endVerse: endVerse ? parseInt(endVerse) : parseInt(startVerse)
  };
}

// Get verse text from Bible data
function getVerseText(bibleData, parsed) {
  const bookKey = BOOK_NAME_MAP[parsed.book];
  if (!bookKey) {
    console.warn(`Book not found in map: ${parsed.book}`);
    return null;
  }
  
  const bookData = bibleData[bookKey];
  if (!bookData) {
    console.warn(`Book not found in Bible data: ${bookKey}`);
    return null;
  }
  
  const chapterData = bookData[parsed.chapter.toString()];
  if (!chapterData) {
    console.warn(`Chapter not found: ${bookKey} ${parsed.chapter}`);
    return null;
  }
  
  // Collect verses - try both 0-indexed and 1-indexed
  const verses = [];
  for (let v = parsed.startVerse; v <= parsed.endVerse; v++) {
    // Try direct index first (if array is keyed by verse number)
    let verseText = chapterData[v];
    // Fallback to 0-indexed
    if (!verseText && chapterData[v - 1]) {
      verseText = chapterData[v - 1];
    }
    if (verseText) {
      verses.push(verseText);
    } else {
      console.warn(`Verse not found: ${bookKey} ${parsed.chapter}:${v}`);
    }
  }
  
  return verses.join(' ');
}

async function main() {
  console.log('🔄 Fetching NLT Bible from GitHub...');
  
  // Fetch Bible data
  const response = await fetch(BIBLE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Bible: ${response.status}`);
  }
  const bibleData = await response.json();
  console.log('✅ Bible fetched successfully');
  
  // Read references
  const referencesPath = path.join(__dirname, '..', 'daily-verses-references.json');
  const referencesData = JSON.parse(fs.readFileSync(referencesPath, 'utf8'));
  const references = referencesData.verses;
  console.log(`📖 Found ${references.length} verse references`);
  
  // Extract verse texts
  const widgetVerses = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const ref of references) {
    const parsed = parseReference(ref);
    if (!parsed) {
      failCount++;
      continue;
    }
    
    const text = getVerseText(bibleData, parsed);
    if (text) {
      widgetVerses.push({
        reference: ref,
        text: text.trim()
      });
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`✅ Successfully extracted ${successCount} verses`);
  if (failCount > 0) {
    console.log(`⚠️ Failed to extract ${failCount} verses`);
  }
  
  // Write output
  const outputPath = path.join(__dirname, '..', 'ios', 'BiblelyVerseWidget', 'widget-verses.json');
  fs.writeFileSync(outputPath, JSON.stringify(widgetVerses, null, 2));
  
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`\n📁 Output written to: ${outputPath}`);
  console.log(`📊 File size: ${fileSizeKB} KB`);
  console.log(`📊 Total verses: ${widgetVerses.length}`);
  console.log(`\n🎉 Done! Now update the widget to use this JSON file.`);
}

main().catch(console.error);

