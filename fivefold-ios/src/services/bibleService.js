// Complete Bible Service with AI-powered Modern English Translation
// Provides access to all 66 books, 1,189 chapters, 31,000+ verses
// Uses API.Bible for complete verse data and AI for simple English translation

import userStorage from '../utils/userStorage';
import aiService from './aiService';
import { getVersionById } from '../data/bibleVersions';

class BibleService {
  constructor() {
    // DISABLED - bible-api.com causes rate limiting
    // Use githubBibleService instead
    console.warn('⚠️ bibleService is DEPRECATED - use githubBibleService');
    this.baseUrl = null; // DISABLED
    this.backupUrl = null; // DISABLED
    this.cachedBooks = null;
    this.cachedVerses = new Map();
    this.simplifiedCache = new Map();
    this.booksData = this.getStaticBooksData();
    this.currentVersion = null;
  }

  // Get the currently selected Bible version
  async getCurrentVersion() {
    if (this.currentVersion) {
      return this.currentVersion;
    }

    try {
      const storedVersion = await userStorage.getRaw('selectedBibleVersion');
      const versionId = storedVersion || 'kjv'; // Default to KJV
      this.currentVersion = getVersionById(versionId);
      return this.currentVersion;
    } catch (error) {
      console.error('Error getting current Bible version:', error);
      this.currentVersion = getVersionById('kjv'); // Fallback to KJV
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

  // Get all Bible books (Genesis to Revelation)
  async getBooks() {
    if (this.cachedBooks) {
      return this.cachedBooks;
    }

    try {
      // Use our static data for books
      this.cachedBooks = this.booksData;
      
      // Cache the books locally for offline access
      await userStorage.setRaw('fivefold_bible_books', JSON.stringify(this.cachedBooks));
      
      return this.cachedBooks;
    } catch (error) {
      console.error('Error getting Bible books:', error);
      
      // Fallback to static data
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

      // Generate chapter list
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

  // Get verses for a specific chapter
  async getVerses(chapterId) {
    // Check cache first
    if (this.cachedVerses.has(chapterId)) {
      return this.cachedVerses.get(chapterId);
    }

    try {
      // Parse chapter ID to get book and chapter
      const [bookId, chapterNum] = chapterId.split('_');
      const book = this.booksData.find(b => b.id === bookId);
      
      if (!book) {
        throw new Error(`Book ${bookId} not found`);
      }

      // Fetch from bible-api.com (free API)
      const response = await fetch(`${this.baseUrl}/${book.name} ${chapterNum}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch verses: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform data to our format - NO AUTO-SIMPLIFICATION (saves API costs)
      const verses = data.verses.map((verse) => {
        const reference = `${book.name} ${chapterNum}:${verse.verse}`;
        const originalText = verse.text.trim();
        
        return {
          id: `${chapterId}_${verse.verse}`,
          number: verse.verse.toString(),
          content: originalText, // Show original by default
          originalContent: originalText,
          reference: reference,
          isSimplified: false, // User must manually simplify
          simplifiedContent: null // Will be populated when user taps "Simplify"
        };
      });
      
      // Cache the verses
      this.cachedVerses.set(chapterId, verses);
      
      // Also save to local storage
      await userStorage.setRaw(`fivefold_verses_${chapterId}`, JSON.stringify(verses));
      
      return verses;
    } catch (error) {
      console.error('Error fetching verses:', error);
      
      // Try to load from cache if API fails
      try {
        const cached = await userStorage.getRaw(`fivefold_verses_${chapterId}`);
        if (cached) {
          const verses = JSON.parse(cached);
          this.cachedVerses.set(chapterId, verses);
          return verses;
        }
      } catch (cacheError) {
        console.error('Error loading cached verses:', cacheError);
      }
      
      throw error;
    }
  }

  // Get a specific verse with its content
  async getVerse(verseId) {
    try {
      // Parse verse ID to get chapter and verse
      const [bookId, chapterNum, verseNum] = verseId.split('_');
      const verses = await this.getVerses(`${bookId}_${chapterNum}`);
      return verses.find(v => v.number === verseNum);
    } catch (error) {
      console.error('Error fetching verse:', error);
      throw error;
    }
  }

  // 🧠 Smart Bible Translation using AI - NO SCORING
  async translateToSimpleEnglish(originalText, reference = '') {
    try {
      console.log('📖 Simplifying verse with AI:', reference);
      
      // Import production service for the simpleAIChat method
      const productionAiService = require('./productionAiService').default;
      
      // Use the simplifyBibleVerse method that doesn't score
      const simplifiedText = await productionAiService.simplifyBibleVerse(originalText, reference);
      
      if (simplifiedText && simplifiedText !== originalText) {
        // Cache it
        const cacheKey = `simplified_${reference.replace(/\s+/g, '_')}`;
        await userStorage.setRaw(cacheKey, simplifiedText);
        
        console.log('✅ Verse simplified successfully');
        return simplifiedText;
      }
      
      return originalText;
      
    } catch (error) {
      console.error('❌ Bible simplification error:', error);
      return originalText;
    }
  }

  // Get simplified text with smart caching and graceful fallback
  async getSimplifiedText(originalText, reference = '') {
    try {
      // Check memory cache first
      const memoryKey = reference.replace(/\s+/g, '_');
      if (this.simplifiedCache.has(memoryKey)) {
        console.log(`📚 Using cached simplification for ${reference}`);
        return this.simplifiedCache.get(memoryKey);
      }

      // Check AsyncStorage cache
      const cacheKey = `simplified_${memoryKey}`;
      const cached = await userStorage.getRaw(cacheKey);
      if (cached && cached.length > 0) {
        console.log(`💾 Using stored simplification for ${reference}`);
        this.simplifiedCache.set(memoryKey, cached);
        return cached;
      }

      // Use AI translation via proxy
      console.log(`🤖 Requesting AI simplification for ${reference}`);
      const simplifiedText = await this.translateToSimpleEnglish(originalText, reference);
      
      // Only cache if we got a real simplification
      if (simplifiedText && simplifiedText !== originalText) {
        this.simplifiedCache.set(memoryKey, simplifiedText);
        await userStorage.setRaw(cacheKey, simplifiedText);
      }
      
      return simplifiedText;
    } catch (error) {
      console.log(`⚠️ Simplification failed for ${reference}, using original`);
      return originalText; // Always fallback gracefully
    }
  }

  // Simplify a specific verse on demand (called when user taps "Simplify" button)
  async simplifyVerse(verseId) {
    try {
      // Parse verse ID to get chapter and verse
      const [bookId, chapterNum, verseNum] = verseId.split('_');
      const chapterId = `${bookId}_${chapterNum}`;
      
      // Get the verses from cache
      const verses = this.cachedVerses.get(chapterId);
      if (!verses) {
        throw new Error('Verses not found in cache');
      }

      // Find the specific verse
      const verse = verses.find(v => v.number === verseNum);
      if (!verse) {
        throw new Error('Verse not found');
      }

      // If already simplified, return cached version
      if (verse.isSimplified && verse.simplifiedContent) {
        return verse.simplifiedContent;
      }

      // Get simplified version
      const simplifiedText = await this.getSimplifiedText(verse.originalContent, verse.reference);
      
      // Update the verse in cache
      verse.simplifiedContent = simplifiedText;
      verse.isSimplified = true;
      verse.content = simplifiedText; // Switch to showing simplified version
      
      // Update the cache
      this.cachedVerses.set(chapterId, verses);
      
      // Also update local storage
      await userStorage.setRaw(`fivefold_verses_${chapterId}`, JSON.stringify(verses));
      
      return simplifiedText;
    } catch (error) {
      console.error('Error simplifying verse:', error);
      throw error;
    }
  }

  // Toggle between original and simplified version of a verse
  async toggleVerseVersion(verseId) {
    try {
      const [bookId, chapterNum, verseNum] = verseId.split('_');
      const chapterId = `${bookId}_${chapterNum}`;
      
      const verses = this.cachedVerses.get(chapterId);
      if (!verses) {
        throw new Error('Verses not found in cache');
      }

      const verse = verses.find(v => v.number === verseNum);
      if (!verse) {
        throw new Error('Verse not found');
      }

      // If showing simplified, switch to original
      if (verse.isSimplified && verse.content === verse.simplifiedContent) {
        verse.content = verse.originalContent;
        return { content: verse.originalContent, isSimplified: false };
      }
      
      // If showing original and we have simplified, switch to simplified
      if (verse.simplifiedContent) {
        verse.content = verse.simplifiedContent;
        return { content: verse.simplifiedContent, isSimplified: true };
      }
      
      // If no simplified version exists, create it
      const simplifiedText = await this.simplifyVerse(verseId);
      return { content: simplifiedText, isSimplified: true };
      
    } catch (error) {
      console.error('Error toggling verse version:', error);
      throw error;
    }
  }

  // Search verses across the entire Bible
  async searchVerses(query, limit = 20) {
    try {
      // Use bible-api.com search endpoint
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform to our format
      const results = data.verses ? data.verses.slice(0, limit).map(verse => ({
        reference: data.reference || `${verse.book_name} ${verse.chapter}:${verse.verse}`,
        content: verse.text.trim()
      })) : [];

      return results;
    } catch (error) {
      console.error('Error searching verses:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Get verse of the day (random popular verse)
  async getVerseOfTheDay() {
    try {
      // Get a random popular verse
      const popularVerses = [
        'John 3:16',
        'Romans 8:28',
        'Philippians 4:13',
        'Jeremiah 29:11',
        'Psalm 23:1',
        'Isaiah 40:31',
        'Matthew 11:28',
        'Proverbs 3:5-6',
        '1 Corinthians 13:4',
        'Ephesians 2:8-9'
      ];
      
      const randomVerse = popularVerses[Math.floor(Math.random() * popularVerses.length)];
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(randomVerse)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch verse of the day: ${response.status}`);
      }

      const data = await response.json();
      return {
        reference: data.reference,
        content: data.text
      };
    } catch (error) {
      console.error('Error fetching verse of the day:', error);
      // Return loading state instead of fallback verse
      return {
        reference: 'Loading...',
        content: 'Verse is loading...'
      };
    }
  }
}

// Create singleton instance
const bibleService = new BibleService();

export default bibleService;
