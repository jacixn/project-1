// Complete Bible Service - Now uses GitHub exclusively (no more bible-api.com)
// Wrapper around githubBibleService for backward compatibility

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVersionById } from '../data/bibleVersions';
import githubBibleService from './githubBibleService';
import bibleReferenceParser from '../utils/bibleReferenceParser';

class CompleteBibleService {
  constructor() {
    this.cachedBooks = null;
    this.currentVersion = null;
    this.currentLanguage = 'en';
  }

  // Set the current language
  async setLanguage(languageCode) {
    this.currentLanguage = languageCode || 'en';
    await AsyncStorage.setItem('bibleLanguage', this.currentLanguage);
  }

  // Get the current language
  async getCurrentLanguage() {
    if (this.currentLanguage) {
      return this.currentLanguage;
    }
    
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      this.currentLanguage = savedLanguage || 'en';
      return this.currentLanguage;
    } catch (error) {
      console.error('Error loading saved language:', error);
      return 'en';
    }
  }

  // Get the currently selected Bible version
  async getCurrentVersion() {
    if (this.currentVersion) {
      return this.currentVersion;
    }

    try {
      const storedVersion = await AsyncStorage.getItem('selectedBibleVersion');
      const versionId = storedVersion || 'kjv';
      this.currentVersion = getVersionById(versionId);
      return this.currentVersion;
    } catch (error) {
      console.error('Error getting current Bible version:', error);
      this.currentVersion = getVersionById('kjv');
      return this.currentVersion;
    }
  }

  // Get all Bible books (delegate to GitHub service)
  async getBooks() {
    return githubBibleService.getBooks();
  }

  // Get chapters for a specific book (delegate to GitHub service)
  async getChapters(bookId) {
    return githubBibleService.getChapters(bookId);
  }

  // Fetch verses for a specific chapter and version (delegate to GitHub service)
  async getVerses(chapterId, versionId) {
    console.log('📖 CompleteBibleService.getVerses - delegating to GitHub');
    return githubBibleService.getVerses(chapterId, versionId);
  }

  // Search for verses by reference (e.g., "Romans 8:11", "John 3:16", "Genesis 1:1-5")
  async searchVerses(query) {
    console.log('🔍 Searching for:', query);
    
    try {
      // Parse the query as a Bible reference
      const parsedRef = bibleReferenceParser.parseReference(query);
      
      if (!parsedRef) {
        console.log('❌ Could not parse reference:', query);
        return [];
      }

      console.log('✅ Parsed reference:', parsedRef);

      const { book, chapter, startVerse, endVerse } = parsedRef;
      
      // Get the book ID from the book name
      const bookId = bibleReferenceParser.getBookId(book);

      // Get the chapter verses
      const chapterId = `${bookId}_${chapter}`;
      const version = await this.getCurrentVersion();
      const verses = await githubBibleService.getVerses(chapterId, version.id || 'kjv');

      if (!verses || verses.length === 0) {
        console.log('❌ No verses found for chapter:', chapterId);
        return [];
      }

      // Filter verses based on verse range
      let results = verses;
      if (startVerse) {
        const start = parseInt(startVerse);
        const end = endVerse ? parseInt(endVerse) : start;
        
        results = verses.filter(v => {
          const verseNum = parseInt(v.number || v.verse);
          return verseNum >= start && verseNum <= end;
        });
      }

      // Format results to match expected structure
      const formattedResults = results.map(v => ({
        bookId: bookId,
        book: book,
        chapter: chapter,
        verse: v.number || v.verse,
        text: v.text || v.content,
        content: v.text || v.content,
        reference: `${book} ${chapter}:${v.number || v.verse}`
      }));

      console.log('✅ Found', formattedResults.length, 'verses');
      return formattedResults;

    } catch (error) {
      console.error('❌ Search error:', error);
      return [];
    }
  }

  // Clear all caches
  async clearCache() {
    return githubBibleService.clearCache();
  }
}

const completeBibleService = new CompleteBibleService();
export default completeBibleService;
