// Bible Reference Parser Utility
// Parses Bible references like "Isaiah 14:12", "1 John 3:16", "Romans 8:28-30"

class BibleReferenceParser {
  constructor() {
    // Map of common book name variations to standard names
    this.bookNameMap = {
      // Old Testament
      'genesis': 'Genesis', 'gen': 'Genesis', 'ge': 'Genesis',
      'exodus': 'Exodus', 'exod': 'Exodus', 'ex': 'Exodus',
      'leviticus': 'Leviticus', 'lev': 'Leviticus', 'le': 'Leviticus',
      'numbers': 'Numbers', 'num': 'Numbers', 'nu': 'Numbers',
      'deuteronomy': 'Deuteronomy', 'deut': 'Deuteronomy', 'de': 'Deuteronomy',
      'joshua': 'Joshua', 'josh': 'Joshua', 'jos': 'Joshua',
      'judges': 'Judges', 'judg': 'Judges', 'jdg': 'Judges',
      'ruth': 'Ruth', 'ru': 'Ruth',
      '1 samuel': '1 Samuel', '1sam': '1 Samuel', '1sa': '1 Samuel', 'first samuel': '1 Samuel',
      '2 samuel': '2 Samuel', '2sam': '2 Samuel', '2sa': '2 Samuel', 'second samuel': '2 Samuel',
      '1 kings': '1 Kings', '1kgs': '1 Kings', '1ki': '1 Kings', 'first kings': '1 Kings',
      '2 kings': '2 Kings', '2kgs': '2 Kings', '2ki': '2 Kings', 'second kings': '2 Kings',
      '1 chronicles': '1 Chronicles', '1chron': '1 Chronicles', '1ch': '1 Chronicles', 'first chronicles': '1 Chronicles',
      '2 chronicles': '2 Chronicles', '2chron': '2 Chronicles', '2ch': '2 Chronicles', 'second chronicles': '2 Chronicles',
      'ezra': 'Ezra', 'ezr': 'Ezra',
      'nehemiah': 'Nehemiah', 'neh': 'Nehemiah', 'ne': 'Nehemiah',
      'esther': 'Esther', 'est': 'Esther', 'es': 'Esther',
      'job': 'Job', 'jb': 'Job',
      'psalms': 'Psalms', 'psalm': 'Psalms', 'ps': 'Psalms', 'psa': 'Psalms',
      'proverbs': 'Proverbs', 'prov': 'Proverbs', 'pr': 'Proverbs',
      'ecclesiastes': 'Ecclesiastes', 'eccl': 'Ecclesiastes', 'ec': 'Ecclesiastes',
      'song of solomon': 'Song of Solomon', 'song': 'Song of Solomon', 'ss': 'Song of Solomon',
      'isaiah': 'Isaiah', 'isa': 'Isaiah', 'is': 'Isaiah',
      'jeremiah': 'Jeremiah', 'jer': 'Jeremiah', 'je': 'Jeremiah',
      'lamentations': 'Lamentations', 'lam': 'Lamentations', 'la': 'Lamentations',
      'ezekiel': 'Ezekiel', 'ezek': 'Ezekiel', 'eze': 'Ezekiel',
      'daniel': 'Daniel', 'dan': 'Daniel', 'da': 'Daniel',
      'hosea': 'Hosea', 'hos': 'Hosea', 'ho': 'Hosea',
      'joel': 'Joel', 'joe': 'Joel',
      'amos': 'Amos', 'am': 'Amos',
      'obadiah': 'Obadiah', 'obad': 'Obadiah', 'ob': 'Obadiah',
      'jonah': 'Jonah', 'jon': 'Jonah',
      'micah': 'Micah', 'mic': 'Micah', 'mi': 'Micah',
      'nahum': 'Nahum', 'nah': 'Nahum', 'na': 'Nahum',
      'habakkuk': 'Habakkuk', 'hab': 'Habakkuk', 'hb': 'Habakkuk',
      'zephaniah': 'Zephaniah', 'zeph': 'Zephaniah', 'zep': 'Zephaniah',
      'haggai': 'Haggai', 'hag': 'Haggai', 'hg': 'Haggai',
      'zechariah': 'Zechariah', 'zech': 'Zechariah', 'zec': 'Zechariah',
      'malachi': 'Malachi', 'mal': 'Malachi', 'ml': 'Malachi',

      // New Testament
      'matthew': 'Matthew', 'matt': 'Matthew', 'mt': 'Matthew',
      'mark': 'Mark', 'mk': 'Mark',
      'luke': 'Luke', 'lk': 'Luke',
      'john': 'John', 'jn': 'John',
      'acts': 'Acts', 'ac': 'Acts',
      'romans': 'Romans', 'rom': 'Romans', 'ro': 'Romans',
      '1 corinthians': '1 Corinthians', '1cor': '1 Corinthians', '1co': '1 Corinthians', 'first corinthians': '1 Corinthians',
      '2 corinthians': '2 Corinthians', '2cor': '2 Corinthians', '2co': '2 Corinthians', 'second corinthians': '2 Corinthians',
      'galatians': 'Galatians', 'gal': 'Galatians', 'ga': 'Galatians',
      'ephesians': 'Ephesians', 'eph': 'Ephesians', 'ep': 'Ephesians',
      'philippians': 'Philippians', 'phil': 'Philippians', 'php': 'Philippians',
      'colossians': 'Colossians', 'col': 'Colossians',
      '1 thessalonians': '1 Thessalonians', '1thess': '1 Thessalonians', '1th': '1 Thessalonians', 'first thessalonians': '1 Thessalonians',
      '2 thessalonians': '2 Thessalonians', '2thess': '2 Thessalonians', '2th': '2 Thessalonians', 'second thessalonians': '2 Thessalonians',
      '1 timothy': '1 Timothy', '1tim': '1 Timothy', '1ti': '1 Timothy', 'first timothy': '1 Timothy',
      '2 timothy': '2 Timothy', '2tim': '2 Timothy', '2ti': '2 Timothy', 'second timothy': '2 Timothy',
      'titus': 'Titus', 'tit': 'Titus', 'ti': 'Titus',
      'philemon': 'Philemon', 'phlm': 'Philemon', 'phm': 'Philemon',
      'hebrews': 'Hebrews', 'heb': 'Hebrews', 'he': 'Hebrews',
      'james': 'James', 'jas': 'James', 'jm': 'James',
      '1 peter': '1 Peter', '1pet': '1 Peter', '1pe': '1 Peter', 'first peter': '1 Peter',
      '2 peter': '2 Peter', '2pet': '2 Peter', '2pe': '2 Peter', 'second peter': '2 Peter',
      '1 john': '1 John', '1jn': '1 John', 'first john': '1 John',
      '2 john': '2 John', '2jn': '2 John', 'second john': '2 John',
      '3 john': '3 John', '3jn': '3 John', 'third john': '3 John',
      'jude': 'Jude', 'jd': 'Jude',
      'revelation': 'Revelation', 'rev': 'Revelation', 're': 'Revelation'
    };
  }

  /**
   * Parse a Bible reference string into components
   * @param {string} reference - Bible reference like "Isaiah 14:12" or "1 John 3:16-17"
   * @returns {object|null} - Parsed reference object or null if invalid
   */
  parseReference(reference) {
    if (!reference || typeof reference !== 'string') {
      return null;
    }

    // Clean and normalize the reference
    const cleanRef = reference.trim().toLowerCase();
    
    // Regex to match Bible references
    // Supports: "Book Chapter:Verse", "Book Chapter:Verse-Verse", "1 Book Chapter:Verse"
    const regex = /^(\d?\s?[a-z]+(?:\s+[a-z]+)*)\s+(\d+):(\d+)(?:-(\d+))?$/i;
    const match = cleanRef.match(regex);
    
    if (!match) {
      console.log('❌ Failed to parse Bible reference:', reference);
      return null;
    }

    const [, bookName, chapter, startVerse, endVerse] = match;
    
    // Normalize book name
    const normalizedBookName = this.normalizeBookName(bookName.trim());
    if (!normalizedBookName) {
      console.log('❌ Unknown book name:', bookName);
      return null;
    }

    const parsedRef = {
      book: normalizedBookName,
      chapter: parseInt(chapter, 10),
      startVerse: parseInt(startVerse, 10),
      endVerse: endVerse ? parseInt(endVerse, 10) : parseInt(startVerse, 10),
      originalReference: reference.trim()
    };

    console.log('✅ Parsed Bible reference:', parsedRef);
    return parsedRef;
  }

  /**
   * Normalize book name to standard format
   * @param {string} bookName - Book name to normalize
   * @returns {string|null} - Normalized book name or null if not found
   */
  normalizeBookName(bookName) {
    const cleanName = bookName.toLowerCase().trim();
    
    // Direct match
    if (this.bookNameMap[cleanName]) {
      return this.bookNameMap[cleanName];
    }

    // Try partial matches for longer book names
    for (const [key, value] of Object.entries(this.bookNameMap)) {
      if (key.includes(cleanName) || cleanName.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Generate book ID for API calls (lowercase, no spaces)
   * @param {string} bookName - Standard book name
   * @returns {string} - Book ID for API
   */
  getBookId(bookName) {
    return bookName.toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Generate chapter ID for API calls
   * @param {string} bookName - Standard book name
   * @param {number} chapter - Chapter number
   * @returns {string} - Chapter ID for API
   */
  getChapterId(bookName, chapter) {
    const bookId = this.getBookId(bookName);
    return `${bookId}_${chapter}`;
  }

  /**
   * Validate if a reference is properly formatted
   * @param {string} reference - Bible reference to validate
   * @returns {boolean} - True if valid format
   */
  isValidReference(reference) {
    return this.parseReference(reference) !== null;
  }

  /**
   * Get all possible variations of a book name
   * @param {string} bookName - Standard book name
   * @returns {array} - Array of possible variations
   */
  getBookVariations(bookName) {
    const variations = [];
    for (const [key, value] of Object.entries(this.bookNameMap)) {
      if (value === bookName) {
        variations.push(key);
      }
    }
    return variations;
  }
}

// Create singleton instance
const bibleReferenceParser = new BibleReferenceParser();

export default bibleReferenceParser;

// Export the class for testing
export { BibleReferenceParser };

