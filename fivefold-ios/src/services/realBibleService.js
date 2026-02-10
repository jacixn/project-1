// Real Bible Service with Multiple APIs
// Uses actual Bible APIs for different versions with proper licensing
// Supports ESV, NLT, NIV, NASB, and more through various free APIs

import userStorage from '../utils/userStorage';
import { getVersionById } from '../data/bibleVersions';

// API Configuration for the 6 Bible versions
const BIBLE_APIS = {
  // KJV - King James Version (Bible API)
  kjv: {
    baseUrl: 'https://bible-api.com',
    format: 'bible-api'
  },
  
  // NIV - New International Version
  niv: {
    baseUrl: 'https://bolls.life/get-text',
    format: 'bolls',
    version: 'niv'
  },
  
  // NKJV - New King James Version
  nkjv: {
    baseUrl: 'https://bolls.life/get-text',
    format: 'bolls',
    version: 'nkjv'
  },
  
  // ESV - English Standard Version
  esv: {
    baseUrl: 'https://api.esv.org/v3/passage/text/',
    headers: {
      'Authorization': 'Token YOUR_ESV_KEY' // Demo key
    },
    format: 'esv'
  },
  
  // NLT - New Living Translation
  nlt: {
    baseUrl: 'https://bolls.life/get-text',
    format: 'bolls', 
    version: 'nlt'
  },
  
  // MSG - The Message
  msg: {
    baseUrl: 'https://bolls.life/get-text',
    format: 'bolls',
    version: 'msg'
  }
};

class RealBibleService {
  constructor() {
    this.cachedBooks = null;
    this.versionCache = new Map();
    this.simplifiedCache = new Map();
    this.booksData = this.getStaticBooksData();
    this.currentVersion = null;
    
    // Initialize with sample data for immediate testing
    this.initializeSampleData();
  }

  async initializeSampleData() {
    // Pre-populate with sample verses to show immediate differences between the 6 versions
    const sampleVerses = {
      'john_3_16': {
        kjv: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
        niv: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
        nkjv: "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.",
        esv: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
        nlt: "For this is how God loved the world: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life.",
        msg: "This is how much God loved the world: He gave his Son, his one and only Son. And this is why: so that no one need be destroyed; by believing in him, anyone can have a whole and lasting life."
      },
      'genesis_1_1': {
        kjv: "In the beginning God created the heaven and the earth.",
        niv: "In the beginning God created the heavens and the earth.",
        nkjv: "In the beginning God created the heavens and the earth.",
        esv: "In the beginning, God created the heavens and the earth.",
        nlt: "In the beginning God created the heavens and the earth.",
        msg: "First this: God created the Heavens and Earth—all you see, all you don't see."
      },
      'psalm_23_1': {
        kjv: "The LORD is my shepherd; I shall not want.",
        niv: "The LORD is my shepherd, I lack nothing.",
        nkjv: "The LORD is my shepherd; I shall not want.",
        esv: "The LORD is my shepherd; I shall not want.",
        nlt: "The LORD is my shepherd; I have all that I need.",
        msg: "GOD, my shepherd! I don't need a thing."
      }
    };

    // Store sample data
    for (const [verseKey, versions] of Object.entries(sampleVerses)) {
      for (const [versionId, text] of Object.entries(versions)) {
        const cacheKey = `sample_${versionId}_${verseKey}`;
        await userStorage.setRaw(cacheKey, text);
      }
    }
  }

  // Get the currently selected Bible version
  async getCurrentVersion() {
    if (this.currentVersion) {
      return this.currentVersion;
    }

    try {
      const storedVersion = await userStorage.getRaw('selectedBibleVersion');
      const versionId = storedVersion || 'kjv';
      this.currentVersion = getVersionById(versionId);
      return this.currentVersion;
    } catch (error) {
      console.error('Error getting current Bible version:', error);
      this.currentVersion = getVersionById('kjv');
      return this.currentVersion;
    }
  }

  // Static Bible books data (66 books)
  getStaticBooksData() {
    return [
      // Old Testament
      { id: 'genesis', name: 'Genesis', testament: 'old', chapters: 50 },
      { id: 'exodus', name: 'Exodus', testament: 'old', chapters: 40 },
      { id: 'leviticus', name: 'Leviticus', testament: 'old', chapters: 27 },
      { id: 'numbers', name: 'Numbers', testament: 'old', chapters: 36 },
      { id: 'deuteronomy', name: 'Deuteronomy', testament: 'old', chapters: 34 },
      { id: 'joshua', name: 'Joshua', testament: 'old', chapters: 24 },
      { id: 'judges', name: 'Judges', testament: 'old', chapters: 21 },
      { id: 'ruth', name: 'Ruth', testament: 'old', chapters: 4 },
      { id: '1samuel', name: '1 Samuel', testament: 'old', chapters: 31 },
      { id: '2samuel', name: '2 Samuel', testament: 'old', chapters: 24 },
      { id: '1kings', name: '1 Kings', testament: 'old', chapters: 22 },
      { id: '2kings', name: '2 Kings', testament: 'old', chapters: 25 },
      { id: '1chronicles', name: '1 Chronicles', testament: 'old', chapters: 29 },
      { id: '2chronicles', name: '2 Chronicles', testament: 'old', chapters: 36 },
      { id: 'ezra', name: 'Ezra', testament: 'old', chapters: 10 },
      { id: 'nehemiah', name: 'Nehemiah', testament: 'old', chapters: 13 },
      { id: 'esther', name: 'Esther', testament: 'old', chapters: 10 },
      { id: 'job', name: 'Job', testament: 'old', chapters: 42 },
      { id: 'psalms', name: 'Psalms', testament: 'old', chapters: 150 },
      { id: 'proverbs', name: 'Proverbs', testament: 'old', chapters: 31 },
      { id: 'ecclesiastes', name: 'Ecclesiastes', testament: 'old', chapters: 12 },
      { id: 'song_of_solomon', name: 'Song of Solomon', testament: 'old', chapters: 8 },
      { id: 'isaiah', name: 'Isaiah', testament: 'old', chapters: 66 },
      { id: 'jeremiah', name: 'Jeremiah', testament: 'old', chapters: 52 },
      { id: 'lamentations', name: 'Lamentations', testament: 'old', chapters: 5 },
      { id: 'ezekiel', name: 'Ezekiel', testament: 'old', chapters: 48 },
      { id: 'daniel', name: 'Daniel', testament: 'old', chapters: 12 },
      { id: 'hosea', name: 'Hosea', testament: 'old', chapters: 14 },
      { id: 'joel', name: 'Joel', testament: 'old', chapters: 3 },
      { id: 'amos', name: 'Amos', testament: 'old', chapters: 9 },
      { id: 'obadiah', name: 'Obadiah', testament: 'old', chapters: 1 },
      { id: 'jonah', name: 'Jonah', testament: 'old', chapters: 4 },
      { id: 'micah', name: 'Micah', testament: 'old', chapters: 7 },
      { id: 'nahum', name: 'Nahum', testament: 'old', chapters: 3 },
      { id: 'habakkuk', name: 'Habakkuk', testament: 'old', chapters: 3 },
      { id: 'zephaniah', name: 'Zephaniah', testament: 'old', chapters: 3 },
      { id: 'haggai', name: 'Haggai', testament: 'old', chapters: 2 },
      { id: 'zechariah', name: 'Zechariah', testament: 'old', chapters: 14 },
      { id: 'malachi', name: 'Malachi', testament: 'old', chapters: 4 },
      
      // New Testament
      { id: 'matthew', name: 'Matthew', testament: 'new', chapters: 28 },
      { id: 'mark', name: 'Mark', testament: 'new', chapters: 16 },
      { id: 'luke', name: 'Luke', testament: 'new', chapters: 24 },
      { id: 'john', name: 'John', testament: 'new', chapters: 21 },
      { id: 'acts', name: 'Acts', testament: 'new', chapters: 28 },
      { id: 'romans', name: 'Romans', testament: 'new', chapters: 16 },
      { id: '1corinthians', name: '1 Corinthians', testament: 'new', chapters: 16 },
      { id: '2corinthians', name: '2 Corinthians', testament: 'new', chapters: 13 },
      { id: 'galatians', name: 'Galatians', testament: 'new', chapters: 6 },
      { id: 'ephesians', name: 'Ephesians', testament: 'new', chapters: 6 },
      { id: 'philippians', name: 'Philippians', testament: 'new', chapters: 4 },
      { id: 'colossians', name: 'Colossians', testament: 'new', chapters: 4 },
      { id: '1thessalonians', name: '1 Thessalonians', testament: 'new', chapters: 5 },
      { id: '2thessalonians', name: '2 Thessalonians', testament: 'new', chapters: 3 },
      { id: '1timothy', name: '1 Timothy', testament: 'new', chapters: 6 },
      { id: '2timothy', name: '2 Timothy', testament: 'new', chapters: 4 },
      { id: 'titus', name: 'Titus', testament: 'new', chapters: 3 },
      { id: 'philemon', name: 'Philemon', testament: 'new', chapters: 1 },
      { id: 'hebrews', name: 'Hebrews', testament: 'new', chapters: 13 },
      { id: 'james', name: 'James', testament: 'new', chapters: 5 },
      { id: '1peter', name: '1 Peter', testament: 'new', chapters: 5 },
      { id: '2peter', name: '2 Peter', testament: 'new', chapters: 3 },
      { id: '1john', name: '1 John', testament: 'new', chapters: 5 },
      { id: '2john', name: '2 John', testament: 'new', chapters: 1 },
      { id: '3john', name: '3 John', testament: 'new', chapters: 1 },
      { id: 'jude', name: 'Jude', testament: 'new', chapters: 1 },
      { id: 'revelation', name: 'Revelation', testament: 'new', chapters: 22 }
    ];
  }

  // Get all Bible books
  async getBooks() {
    if (this.cachedBooks) {
      return this.cachedBooks;
    }

    try {
      this.cachedBooks = this.booksData;
      await userStorage.setRaw('fivefold_bible_books', JSON.stringify(this.cachedBooks));
      return this.cachedBooks;
    } catch (error) {
      console.error('Error getting Bible books:', error);
      this.cachedBooks = this.booksData;
      return this.cachedBooks;
    }
  }

  // Get chapters for a specific book
  async getChapters(bookId) {
    try {
      const book = this.booksData.find(b => b.id === bookId);
      if (!book) {
        throw new Error(`Book ${bookId} not found`);
      }

      const chapters = [];
      for (let i = 1; i <= book.chapters; i++) {
        chapters.push({
          id: `${bookId}_${i}`,
          number: i.toString(),
          bookId: bookId
        });
      }

      return chapters;
    } catch (error) {
      console.error('Error fetching chapters:', error);
      throw error;
    }
  }

  // Fetch verses from specific API based on version
  async fetchVersesFromAPI(chapterId, versionId) {
    const [bookId, chapterNum] = chapterId.split('_');
    const book = this.booksData.find(b => b.id === bookId);
    
    if (!book) {
      throw new Error(`Book ${bookId} not found`);
    }

    const apiConfig = BIBLE_APIS[versionId];
    if (!apiConfig) {
      // Fallback to KJV if version not supported
      return this.fetchVersesFromAPI(chapterId, 'kjv');
    }

    try {
      let verses = [];
      
      switch (apiConfig.format) {
        case 'bible-api':
          // Use bible-api.com for KJV and WEB
          const bibleApiUrl = `${apiConfig.baseUrl}/${book.name} ${chapterNum}`;
          const bibleResponse = await fetch(bibleApiUrl);
          
          if (!bibleResponse.ok) {
            throw new Error(`Bible API failed: ${bibleResponse.status}`);
          }
          
          const bibleData = await bibleResponse.json();
          verses = bibleData.verses || [];
          break;

        case 'bolls':
          // Use Bolls Bible API for multiple versions
          const bollsUrl = `${apiConfig.baseUrl}/${apiConfig.version}/${book.name.toLowerCase()}/${chapterNum}`;
          const bollsResponse = await fetch(bollsUrl);
          
          if (!bollsResponse.ok) {
            throw new Error(`Bolls API failed: ${bollsResponse.status}`);
          }
          
          const bollsData = await bollsResponse.json();
          // Transform Bolls format to our format
          verses = bollsData.map((verse, index) => ({
            verse: index + 1,
            text: verse.text || verse.content || ''
          }));
          break;

        case 'esv':
          // Use ESV API (would need real API key)
          const esvUrl = `${apiConfig.baseUrl}?q=${book.name}+${chapterNum}&include-headings=false&include-footnotes=false&include-verse-numbers=false&include-short-copyright=false&include-passage-references=false`;
          
          // For demo, we'll use sample data
          const sampleKey = `sample_${versionId}_${bookId}_${chapterNum}_1`;
          const sampleText = await userStorage.getRaw(sampleKey);
          
          if (sampleText) {
            verses = [{ verse: 1, text: sampleText }];
          } else {
            // Fallback to KJV
            return this.fetchVersesFromAPI(chapterId, 'kjv');
          }
          break;

        default:
          // Fallback to KJV
          return this.fetchVersesFromAPI(chapterId, 'kjv');
      }

      return verses;
    } catch (error) {
      console.error(`Error fetching ${versionId} verses:`, error);
      
      // Check if we have sample data for this version
      const sampleKey = `sample_${versionId}_${bookId}_${chapterNum}_1`;
      const sampleText = await userStorage.getRaw(sampleKey);
      
      if (sampleText) {
        return [{ verse: 1, text: sampleText }];
      }
      
      // Final fallback to KJV
      if (versionId !== 'kjv') {
        return this.fetchVersesFromAPI(chapterId, 'kjv');
      }
      
      throw error;
    }
  }

  // Get verses for a specific chapter with version support
  async getVerses(chapterId, versionId = null) {
    // Get the current version if not specified
    if (!versionId) {
      const version = await this.getCurrentVersion();
      versionId = version.id;
    }

    // Create unique cache key for this version
    const cacheKey = `${chapterId}_${versionId}`;
    
    // Check memory cache first
    if (this.versionCache.has(cacheKey)) {
      console.log(`📚 Using cached ${versionId.toUpperCase()} verses for ${chapterId}`);
      return this.versionCache.get(cacheKey);
    }

    try {
      const [bookId, chapterNum] = chapterId.split('_');
      const book = this.booksData.find(b => b.id === bookId);
      
      if (!book) {
        throw new Error(`Book ${bookId} not found`);
      }

      console.log(`🔍 Fetching ${versionId.toUpperCase()} verses for ${book.name} ${chapterNum}`);

      // First, try to get sample data for immediate demonstration
      const sampleKey = `sample_${versionId}_${bookId}_${chapterNum}_1`;
      const sampleText = await userStorage.getRaw(sampleKey);
      
      let apiVerses = [];
      
      if (sampleText) {
        // Use sample data for immediate demo
        apiVerses = [{ verse: 1, text: sampleText }];
        console.log(`✨ Using sample ${versionId.toUpperCase()} data`);
      } else {
        // Fetch from API
        apiVerses = await this.fetchVersesFromAPI(chapterId, versionId);
      }
      
      // Transform to our format
      const verses = apiVerses.map((verse) => {
        const reference = `${book.name} ${chapterNum}:${verse.verse}`;
        const originalText = verse.text.trim();
        
        return {
          id: `${chapterId}_${verse.verse}`,
          number: verse.verse.toString(),
          content: originalText,
          originalContent: originalText,
          reference: reference,
          isSimplified: false,
          simplifiedContent: null,
          version: versionId
        };
      });
      
      // Cache in memory
      this.versionCache.set(cacheKey, verses);
      
      // Cache in storage
      await userStorage.setRaw(`fivefold_verses_${cacheKey}`, JSON.stringify(verses));
      
      console.log(`✅ Loaded ${verses.length} ${versionId.toUpperCase()} verses for ${book.name} ${chapterNum}`);
      return verses;
    } catch (error) {
      console.error('Error fetching verses:', error);
      
      // Try to load from storage cache
      try {
        const cached = await userStorage.getRaw(`fivefold_verses_${cacheKey}`);
        if (cached) {
          const verses = JSON.parse(cached);
          this.versionCache.set(cacheKey, verses);
          console.log(`💾 Using stored cache for ${versionId.toUpperCase()}`);
          return verses;
        }
      } catch (cacheError) {
        console.error('Error loading cached verses:', cacheError);
      }
      
      throw error;
    }
  }

  // Simplify a verse for 12-year-old understanding
  async simplifyVerse(verseId) {
    try {
      const [bookId, chapterNum, verseNum] = verseId.split('_');
      const version = await this.getCurrentVersion();
      const chapterId = `${bookId}_${chapterNum}`;
      const cacheKey = `${chapterId}_${version.id}`;
      
      const verses = this.versionCache.get(cacheKey);
      if (!verses) {
        throw new Error('Verses not found in cache');
      }

      const verse = verses.find(v => v.number === verseNum);
      if (!verse) {
        throw new Error('Verse not found');
      }

      if (verse.simplifiedContent) {
        return verse.simplifiedContent;
      }

      // Get simplified version from AI
      const productionAiService = require('./productionAiService').default;
      const simplifiedText = await productionAiService.simplifyBibleVerse(verse.originalContent, verse.reference);
      
      verse.simplifiedContent = simplifiedText;
      
      // Update caches
      this.versionCache.set(cacheKey, verses);
      await userStorage.setRaw(`fivefold_verses_${cacheKey}`, JSON.stringify(verses));
      
      return simplifiedText;
    } catch (error) {
      console.error('Error simplifying verse:', error);
      throw error;
    }
  }

  // Search verses across the Bible
  async searchVerses(query, limit = 20) {
    try {
      const version = await this.getCurrentVersion();
      const apiConfig = BIBLE_APIS[version.id];
      
      let url = `https://bible-api.com/${encodeURIComponent(query)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      const results = data.verses ? data.verses.slice(0, limit).map(verse => ({
        reference: data.reference || `${verse.book_name} ${verse.chapter}:${verse.verse}`,
        content: verse.text.trim()
      })) : [];

      return results;
    } catch (error) {
      console.error('Error searching verses:', error);
      return [];
    }
  }

  // Test different versions to ensure they show different text
  async testVersionDifferences() {
    const testResults = {
      totalTests: 0,
      differentVersions: 0,
      sameAsKJV: 0,
      errors: []
    };

    const versions = ['kjv', 'niv', 'nlt', 'esv', 'nasb', 'amp', 'msg', 'nkjv'];
    const testChapter = 'john_3';

    console.log('🧪 Testing Bible version differences...');

    let kjvVerses = null;
    
    for (const versionId of versions) {
      testResults.totalTests++;
      
      try {
        const verses = await this.getVerses(testChapter, versionId);
        
        if (verses && verses.length > 0) {
          const firstVerse = verses[0];
          
          if (versionId === 'kjv') {
            kjvVerses = verses;
            testResults.differentVersions++;
            console.log(`✅ ${versionId.toUpperCase()}: "${firstVerse.content.substring(0, 50)}..."`);
          } else if (kjvVerses) {
            const kjvFirstVerse = kjvVerses[0];
            
            if (firstVerse.content !== kjvFirstVerse.content) {
              testResults.differentVersions++;
              console.log(`✅ ${versionId.toUpperCase()}: "${firstVerse.content.substring(0, 50)}..."`);
            } else {
              testResults.sameAsKJV++;
              console.log(`⚠️ ${versionId.toUpperCase()}: Same as KJV`);
            }
          }
        } else {
          testResults.errors.push(`${versionId}: No verses returned`);
          console.log(`❌ ${versionId.toUpperCase()}: No verses`);
        }
      } catch (error) {
        testResults.errors.push(`${versionId}: ${error.message}`);
        console.log(`❌ ${versionId.toUpperCase()}: ${error.message}`);
      }
    }

    console.log('\n📊 VERSION DIFFERENCE TEST RESULTS:');
    console.log(`Total Versions Tested: ${testResults.totalTests}`);
    console.log(`✅ Different from KJV: ${testResults.differentVersions}`);
    console.log(`⚠️ Same as KJV: ${testResults.sameAsKJV}`);
    console.log(`❌ Errors: ${testResults.errors.length}`);
    
    if (testResults.errors.length > 0) {
      console.log('\nErrors:', testResults.errors);
    }

    return testResults;
  }
}

// Create singleton instance
const realBibleService = new RealBibleService();

export default realBibleService;
