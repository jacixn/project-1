// GitHub Bible Service
// Fetches Bible translations from https://github.com/arron-taylor/bible-versions
// 35 complete English translations, all free and open-source

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVersionById } from '../data/bibleVersions';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/arron-taylor/bible-versions/main/';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Book name mapping (App ID → GitHub name)
const BOOK_NAMES_MAP = {
  // Old Testament
  'genesis': 'Genesis',
  'gen': 'Genesis',
  'exodus': 'Exodus',
  'exo': 'Exodus',
  'leviticus': 'Leviticus',
  'lev': 'Leviticus',
  'numbers': 'Numbers',
  'num': 'Numbers',
  'deuteronomy': 'Deuteronomy',
  'deu': 'Deuteronomy',
  'joshua': 'Joshua',
  'jos': 'Joshua',
  'judges': 'Judges',
  'jdg': 'Judges',
  'ruth': 'Ruth',
  'rut': 'Ruth',
  '1samuel': '1 Samuel',
  '1sa': '1 Samuel',
  '2samuel': '2 Samuel',
  '2sa': '2 Samuel',
  '1kings': '1 Kings',
  '1ki': '1 Kings',
  '2kings': '2 Kings',
  '2ki': '2 Kings',
  '1chronicles': '1 Chronicles',
  '1ch': '1 Chronicles',
  '2chronicles': '2 Chronicles',
  '2ch': '2 Chronicles',
  'ezra': 'Ezra',
  'ezr': 'Ezra',
  'nehemiah': 'Nehemiah',
  'neh': 'Nehemiah',
  'esther': 'Esther',
  'est': 'Esther',
  'job': 'Job',
  'psalm': 'Psalms',
  'psalms': 'Psalms',
  'psa': 'Psalms',
  'proverbs': 'Proverbs',
  'pro': 'Proverbs',
  'ecclesiastes': 'Ecclesiastes',
  'ecc': 'Ecclesiastes',
  'songofsolomon': 'Song of Solomon',
  'song_of_solomon': 'Song of Solomon',
  'songofsongs': 'Song of Solomon',
  'song_of_songs': 'Song of Solomon',
  'sng': 'Song of Solomon',
  'isaiah': 'Isaiah',
  'isa': 'Isaiah',
  'jeremiah': 'Jeremiah',
  'jer': 'Jeremiah',
  'lamentations': 'Lamentations',
  'lam': 'Lamentations',
  'ezekiel': 'Ezekiel',
  'ezk': 'Ezekiel',
  'daniel': 'Daniel',
  'dan': 'Daniel',
  'hosea': 'Hosea',
  'hos': 'Hosea',
  'joel': 'Joel',
  'jol': 'Joel',
  'amos': 'Amos',
  'amo': 'Amos',
  'obadiah': 'Obadiah',
  'oba': 'Obadiah',
  'jonah': 'Jonah',
  'jon': 'Jonah',
  'micah': 'Micah',
  'mic': 'Micah',
  'nahum': 'Nahum',
  'nam': 'Nahum',
  'habakkuk': 'Habakkuk',
  'hab': 'Habakkuk',
  'zephaniah': 'Zephaniah',
  'zep': 'Zephaniah',
  'haggai': 'Haggai',
  'hag': 'Haggai',
  'zechariah': 'Zechariah',
  'zec': 'Zechariah',
  'malachi': 'Malachi',
  'mal': 'Malachi',
  // New Testament
  'matthew': 'Matthew',
  'mat': 'Matthew',
  'mark': 'Mark',
  'mrk': 'Mark',
  'luke': 'Luke',
  'luk': 'Luke',
  'john': 'John',
  'jhn': 'John',
  'acts': 'Acts',
  'act': 'Acts',
  'romans': 'Romans',
  'rom': 'Romans',
  '1corinthians': '1 Corinthians',
  '1co': '1 Corinthians',
  '2corinthians': '2 Corinthians',
  '2co': '2 Corinthians',
  'galatians': 'Galatians',
  'gal': 'Galatians',
  'ephesians': 'Ephesians',
  'eph': 'Ephesians',
  'philippians': 'Philippians',
  'php': 'Philippians',
  'colossians': 'Colossians',
  'col': 'Colossians',
  '1thessalonians': '1 Thessalonians',
  '1th': '1 Thessalonians',
  '2thessalonians': '2 Thessalonians',
  '2th': '2 Thessalonians',
  '1timothy': '1 Timothy',
  '1ti': '1 Timothy',
  '2timothy': '2 Timothy',
  '2ti': '2 Timothy',
  'titus': 'Titus',
  'tit': 'Titus',
  'philemon': 'Philemon',
  'phm': 'Philemon',
  'hebrews': 'Hebrews',
  'heb': 'Hebrews',
  'james': 'James',
  'jas': 'James',
  '1peter': '1 Peter',
  '1pe': '1 Peter',
  '2peter': '2 Peter',
  '2pe': '2 Peter',
  '1john': '1 John',
  '1jn': '1 John',
  '2john': '2 John',
  '2jn': '2 John',
  '3john': '3 John',
  '3jn': '3 John',
  'jude': 'Jude',
  'jud': 'Jude',
  'revelation': 'Revelation',
  'rev': 'Revelation'
};

class GitHubBibleService {
  constructor() {
    this.versionCache = new Map(); // Cache entire Bible versions
  }

  async getVerses(chapterId, versionId) {
    try {
      console.log('📖 GitHubBibleService.getVerses called');
      console.log('   chapterId:', chapterId);
      console.log('   versionId:', versionId);

      // If Simplify version, return empty (will be handled by AI service)
      if (versionId === 'simplify') {
        console.log('⚠️ Simplify version requested, returning empty for AI processing');
        return [];
      }

      // Parse chapter ID (e.g., "gen_1" → book: "gen", chapter: "1")
      // Handle books with underscores in their ID (e.g., "song_of_solomon_8")
      const lastUnderscoreIndex = chapterId.lastIndexOf('_');
      const bookId = chapterId.substring(0, lastUnderscoreIndex);
      const chapterNum = chapterId.substring(lastUnderscoreIndex + 1);
      console.log('   Parsed → bookId:', bookId, 'chapterNum:', chapterNum);

      // Get version info
      const version = getVersionById(versionId);
      if (!version || !version.githubFile) {
        console.error('❌ Version not found or no GitHub file:', versionId);
        return [];
      }

      console.log('   Version:', version.name, 'File:', version.githubFile);

      // Get book name for GitHub (e.g., "gen" → "Genesis")
      const bookName = BOOK_NAMES_MAP[bookId];
      if (!bookName) {
        console.error('❌ Book name not found for:', bookId);
        return [];
      }

      console.log('   Book name:', bookName);

      // Fetch entire Bible version (with caching)
      const bibleData = await this.fetchBibleVersion(version.githubFile, versionId);
      
      // Extract chapter verses
      const bookData = bibleData[bookName];
      if (!bookData) {
        console.error('❌ Book not found in Bible data:', bookName);
        console.log('   Available books:', Object.keys(bibleData).slice(0, 5).join(', '));
        return [];
      }

      const chapterData = bookData[chapterNum];
      if (!chapterData) {
        console.error('❌ Chapter not found:', chapterNum);
        console.log('   Available chapters:', Object.keys(bookData).slice(0, 10).join(', '));
        return [];
      }

      // Convert to app format
      const verses = Object.entries(chapterData).map(([verseNum, text]) => ({
        id: `${bookId}.${chapterNum}.${verseNum}`,
        number: verseNum,
        verse: verseNum,
        displayNumber: verseNum,
        text: text,
        content: text,
        book: bookId,
        chapter: chapterNum
      }));

      console.log('✅ Loaded', verses.length, 'verses from GitHub');
      return verses;

    } catch (error) {
      console.error('❌ Error in getVerses:', error);
      return [];
    }
  }

  async fetchBibleVersion(githubFile, versionId) {
    try {
      // Check memory cache first
      if (this.versionCache.has(versionId)) {
        console.log('💾 Using memory cache for:', versionId);
        return this.versionCache.get(versionId);
      }

      // Check AsyncStorage cache
      const cacheKey = `bible_version_${versionId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < CACHE_DURATION) {
          console.log('💾 Using AsyncStorage cache for:', versionId, '(age:', Math.round(age / (1000 * 60 * 60 * 24)), 'days)');
          this.versionCache.set(versionId, data);
          return data;
        } else {
          console.log('⏰ Cache expired for:', versionId);
        }
      }

      // Fetch from GitHub
      const url = GITHUB_BASE_URL + encodeURIComponent(githubFile);
      console.log('📡 Fetching from GitHub:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`GitHub fetch failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Fetched', Object.keys(data).length, 'books from GitHub');

      // Cache it
      this.versionCache.set(versionId, data);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      return data;

    } catch (error) {
      console.error('❌ Error fetching Bible version from GitHub:', error);
      throw error;
    }
  }

  // Get all Bible books (static data)
  async getBooks() {
    return [
      // Old Testament (39 books)
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
      
      // New Testament (27 books)
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

  // Get chapters for a specific book
  async getChapters(bookId) {
    const books = await this.getBooks();
    const book = books.find(b => b.id === bookId);
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
  }

  // Clear all caches
  async clearCache() {
    this.versionCache.clear();
    const keys = await AsyncStorage.getAllKeys();
    const bibleKeys = keys.filter(key => key.startsWith('bible_version_'));
    await AsyncStorage.multiRemove(bibleKeys);
    console.log('🧹 Cleared all Bible caches');
  }
}

export default new GitHubBibleService();

