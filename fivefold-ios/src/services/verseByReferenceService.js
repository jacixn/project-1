import completeBibleService from './completeBibleService';
import githubBibleService from './githubBibleService';
import userStorage from '../utils/userStorage';

/**
 * Service to fetch verse text by reference (e.g., "John 3:16", "Proverbs 3:5-6")
 * from the user's preferred Bible version
 */

// Helper to determine which Bible service to use
const getBibleService = (versionId) => {
  // Always use githubBibleService now since it has all versions including KJV
  // This avoids rate limiting from bible-api.com
  return githubBibleService;
};

// Get user's preferred Bible version
// NOTE: "simplify" is only available in the Holy Bible reader, not in other sections
export const getPreferredVersion = async () => {
  try {
    const version = await userStorage.getRaw('selectedBibleVersion');
    // If user has "simplify" selected, use NIV instead (simplify only works in Bible Reader)
    // If no version selected, default to NIV
    if (!version || version === 'simplify') {
      return 'niv';
    }
    return version;
  } catch (error) {
    console.error('Error loading preferred Bible version:', error);
    return 'niv'; // Default to NIV
  }
};

// Parse verse reference (e.g., "John 3:16" or "Proverbs 3:5-6")
const parseVerseReference = (reference) => {
  try {
    // Match patterns like "Genesis 1:1", "John 3:16", "Proverbs 3:5-6"
    const match = reference.match(/^([\d\s\w]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
    
    if (!match) {
      throw new Error(`Invalid verse reference format: ${reference}`);
    }
    
    const bookName = match[1].trim();
    const chapterNum = match[2];
    const startVerse = parseInt(match[3]);
    const endVerse = match[4] ? parseInt(match[4]) : startVerse;
    
    return { bookName, chapterNum, startVerse, endVerse };
  } catch (error) {
    console.error('Error parsing verse reference:', error);
    throw error;
  }
};

// Normalize book name (handle variations like "1 John", "I John", etc.)
const normalizeBookName = (bookName) => {
  const normalized = bookName.toLowerCase().trim();
  
  const bookMap = {
    // Old Testament
    'genesis': 'genesis', 'gen': 'genesis',
    'exodus': 'exodus', 'ex': 'exodus', 'exo': 'exodus',
    'leviticus': 'leviticus', 'lev': 'leviticus',
    'numbers': 'numbers', 'num': 'numbers',
    'deuteronomy': 'deuteronomy', 'deut': 'deuteronomy', 'deu': 'deuteronomy',
    'joshua': 'joshua', 'josh': 'joshua', 'jos': 'joshua',
    'judges': 'judges', 'judg': 'judges', 'jdg': 'judges',
    'ruth': 'ruth',
    '1 samuel': '1samuel', 'i samuel': '1samuel', '1sam': '1samuel', '1 sam': '1samuel',
    '2 samuel': '2samuel', 'ii samuel': '2samuel', '2sam': '2samuel', '2 sam': '2samuel',
    '1 kings': '1kings', 'i kings': '1kings', '1kin': '1kings', '1 kin': '1kings',
    '2 kings': '2kings', 'ii kings': '2kings', '2kin': '2kings', '2 kin': '2kings',
    '1 chronicles': '1chronicles', 'i chronicles': '1chronicles', '1chr': '1chronicles', '1 chr': '1chronicles',
    '2 chronicles': '2chronicles', 'ii chronicles': '2chronicles', '2chr': '2chronicles', '2 chr': '2chronicles',
    'ezra': 'ezra', 'ezr': 'ezra',
    'nehemiah': 'nehemiah', 'neh': 'nehemiah',
    'esther': 'esther', 'est': 'esther',
    'job': 'job',
    'psalm': 'psalms', 'psalms': 'psalms', 'psa': 'psalms', 'ps': 'psalms',
    'proverbs': 'proverbs', 'prov': 'proverbs', 'pro': 'proverbs',
    'ecclesiastes': 'ecclesiastes', 'eccl': 'ecclesiastes', 'ecc': 'ecclesiastes',
    'song of solomon': 'song_of_solomon', 'song of songs': 'song_of_solomon', 'song': 'song_of_solomon', 'sos': 'song_of_solomon',
    'isaiah': 'isaiah', 'isa': 'isaiah',
    'jeremiah': 'jeremiah', 'jer': 'jeremiah',
    'lamentations': 'lamentations', 'lam': 'lamentations',
    'ezekiel': 'ezekiel', 'ezek': 'ezekiel', 'eze': 'ezekiel',
    'daniel': 'daniel', 'dan': 'daniel',
    'hosea': 'hosea', 'hos': 'hosea',
    'joel': 'joel',
    'amos': 'amos',
    'obadiah': 'obadiah', 'obad': 'obadiah',
    'jonah': 'jonah',
    'micah': 'micah', 'mic': 'micah',
    'nahum': 'nahum', 'nah': 'nahum',
    'habakkuk': 'habakkuk', 'hab': 'habakkuk',
    'zephaniah': 'zephaniah', 'zeph': 'zephaniah', 'zep': 'zephaniah',
    'haggai': 'haggai', 'hag': 'haggai',
    'zechariah': 'zechariah', 'zech': 'zechariah', 'zec': 'zechariah',
    'malachi': 'malachi', 'mal': 'malachi',
    
    // New Testament
    'matthew': 'matthew', 'matt': 'matthew', 'mat': 'matthew', 'mt': 'matthew',
    'mark': 'mark', 'mar': 'mark', 'mk': 'mark',
    'luke': 'luke', 'luk': 'luke', 'lk': 'luke',
    'john': 'john', 'joh': 'john', 'jn': 'john',
    'acts': 'acts', 'act': 'acts',
    'romans': 'romans', 'rom': 'romans',
    '1 corinthians': '1corinthians', 'i corinthians': '1corinthians', '1cor': '1corinthians', '1 cor': '1corinthians',
    '2 corinthians': '2corinthians', 'ii corinthians': '2corinthians', '2cor': '2corinthians', '2 cor': '2corinthians',
    'galatians': 'galatians', 'gal': 'galatians',
    'ephesians': 'ephesians', 'eph': 'ephesians',
    'philippians': 'philippians', 'phil': 'philippians', 'php': 'philippians',
    'colossians': 'colossians', 'col': 'colossians',
    '1 thessalonians': '1thessalonians', 'i thessalonians': '1thessalonians', '1thess': '1thessalonians', '1 thess': '1thessalonians',
    '2 thessalonians': '2thessalonians', 'ii thessalonians': '2thessalonians', '2thess': '2thessalonians', '2 thess': '2thessalonians',
    '1 timothy': '1timothy', 'i timothy': '1timothy', '1tim': '1timothy', '1 tim': '1timothy',
    '2 timothy': '2timothy', 'ii timothy': '2timothy', '2tim': '2timothy', '2 tim': '2timothy',
    'titus': 'titus', 'tit': 'titus',
    'philemon': 'philemon', 'phlm': 'philemon', 'phm': 'philemon',
    'hebrews': 'hebrews', 'heb': 'hebrews',
    'james': 'james', 'jas': 'james', 'jam': 'james',
    '1 peter': '1peter', 'i peter': '1peter', '1pet': '1peter', '1 pet': '1peter',
    '2 peter': '2peter', 'ii peter': '2peter', '2pet': '2peter', '2 pet': '2peter',
    '1 john': '1john', 'i john': '1john', '1jn': '1john', '1 jn': '1john',
    '2 john': '2john', 'ii john': '2john', '2jn': '2john', '2 jn': '2john',
    '3 john': '3john', 'iii john': '3john', '3jn': '3john', '3 jn': '3john',
    'jude': 'jude',
    'revelation': 'revelation', 'rev': 'revelation',
  };
  
  return bookMap[normalized] || normalized;
};

/**
 * Fetch verse text by reference
 * @param {string} reference - Verse reference (e.g., "John 3:16", "Proverbs 3:5-6")
 * @param {string} versionId - Bible version ID (e.g., "niv", "kjv", "esv"). If not provided, uses user's preferred version
 * @returns {Promise<{text: string, version: string, reference: string}>}
 */
export const getVerseByReference = async (reference, versionId = null) => {
  try {
    console.log('📖 Fetching verse:', reference);
    
    // Get version (use provided or user's preferred)
    const version = versionId || await getPreferredVersion();
    console.log('📖 Using version:', version);
    
    // Parse the reference
    const { bookName, chapterNum, startVerse, endVerse } = parseVerseReference(reference);
    const normalizedBookName = normalizeBookName(bookName);
    console.log('📖 Parsed:', { bookName, normalizedBookName, chapterNum, startVerse, endVerse });
    
    // Get the appropriate Bible service
    const service = getBibleService(version);
    
    // Get all books to find the correct book ID
    const books = await service.getBooks();
    const book = books.find(b => b.id.toLowerCase() === normalizedBookName);
    
    if (!book) {
      throw new Error(`Book not found: ${bookName}`);
    }
    
    console.log('📖 Found book:', book.name, 'ID:', book.id);
    
    // Get chapters for this book
    const chapters = await service.getChapters(book.id);
    const chapter = chapters.find(c => c.number === chapterNum || c.number === parseInt(chapterNum));
    
    if (!chapter) {
      throw new Error(`Chapter not found: ${bookName} ${chapterNum}`);
    }
    
    console.log('📖 Found chapter:', chapter.number, 'ID:', chapter.id);
    
    // Get verses for this chapter
    const verses = await service.getVerses(chapter.id, version);
    
    console.log('📊 Total verses loaded:', verses.length);
    console.log('📊 Looking for verses', startVerse, 'to', endVerse);
    console.log('📊 First verse:', verses[0]?.number, '(type:', typeof verses[0]?.number, ')');
    console.log('📊 Last verse:', verses[verses.length - 1]?.number, '(type:', typeof verses[verses.length - 1]?.number, ')');
    console.log('📊 Sample verses:', verses.slice(0, 3).map(v => ({ num: v.number, text: v.text?.substring(0, 30) })));
    
    // Extract the requested verses
    const requestedVerses = verses.filter(v => {
      // Try to extract verse number from verse object and convert to integer
      const verseNumRaw = v.number || v.verse || v.id?.split('.').pop();
      const verseNum = parseInt(verseNumRaw, 10);
      
      // Skip if NaN
      if (isNaN(verseNum)) {
        console.log('⚠️ Skipping invalid verse number:', verseNumRaw, v);
        return false;
      }
      
      const inRange = verseNum >= startVerse && verseNum <= endVerse;
      if (verseNum === startVerse || verseNum === endVerse) {
        console.log('✓ Found target verse:', verseNum);
      }
      
      return inRange;
    });
    
    console.log('📊 Requested verses found:', requestedVerses.length);
    
    if (requestedVerses.length === 0) {
      console.warn('⚠️ Verse not found in', version.toUpperCase());
      console.warn('   Reference:', reference);
      console.warn('   This chapter has', verses.length, 'verses (requested verse', startVerse, ')');
      console.warn('   Will fall back to hardcoded text from original data');
      
      // Throw error so fallback mechanism can use hardcoded text
      throw new Error(`Verse ${reference} not available in ${version.toUpperCase()} (chapter has ${verses.length} verses)`);
    }
    
    // Combine verse texts
    const verseText = requestedVerses
      .map(v => (v.content || v.text || '').replace(/\s+/g, ' ').trim())
      .join(' ')
      .trim();
    
    console.log('✅ Fetched verse:', verseText.substring(0, 50) + '...');
    
    return {
      text: verseText,
      version: version.toUpperCase(),
      reference: reference
    };
    
  } catch (error) {
    console.error('❌ Error fetching verse:', error);
    throw error;
  }
};

/**
 * Fetch multiple verses by reference
 * @param {Array<string>} references - Array of verse references
 * @param {string} versionId - Bible version ID (optional)
 * @returns {Promise<Array<{text: string, version: string, reference: string}>>}
 */
export const getVersesByReferences = async (references, versionId = null) => {
  try {
    const version = versionId || await getPreferredVersion();
    const promises = references.map(ref => getVerseByReference(ref, version));
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error fetching multiple verses:', error);
    throw error;
  }
};

export default {
  getVerseByReference,
  getVersesByReferences,
  getPreferredVersion,
};

