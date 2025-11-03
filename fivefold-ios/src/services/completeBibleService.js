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

  // Progressive live search - finds all matching verses as user types
  async liveSearchVerses(query, maxResults = 100) {
    console.log('🔍 Live searching for:', query);
    
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    try {
      const cleanQuery = query.trim().toLowerCase();
      const results = [];
      
      // Try to parse partial reference with colon (e.g., "John 3:")
      const partialWithColon = cleanQuery.match(/^([a-z0-9\s]+)\s+(\d+):$/i);
      if (partialWithColon) {
        console.log('📖 Detected partial reference with colon:', partialWithColon);
        const [, bookPart, chapterNum] = partialWithColon;
        const normalizedBook = bibleReferenceParser.normalizeBookName(bookPart.trim());
        
        console.log('📖 Book part:', bookPart.trim(), '→ Normalized:', normalizedBook);
        
        if (normalizedBook) {
          const bookId = bibleReferenceParser.getBookId(normalizedBook);
          const chapterId = `${bookId}_${chapterNum}`;
          
          console.log('📖 Fetching chapterId:', chapterId);
          
          const version = await this.getCurrentVersion();
          const verses = await githubBibleService.getVerses(chapterId, version.id || 'kjv');
          
          if (verses && verses.length > 0) {
            console.log('✅ Found', verses.length, 'verses for', chapterId);
            return verses.slice(0, maxResults).map(v => ({
              bookId: bookId,
              book: normalizedBook,
              chapter: chapterNum,
              verse: v.number || v.verse,
              text: v.text || v.content,
              content: v.text || v.content,
              reference: `${normalizedBook} ${chapterNum}:${v.number || v.verse}`
            }));
          } else {
            console.log('❌ No verses found for', chapterId);
          }
        } else {
          console.log('❌ Could not normalize book name:', bookPart);
        }
      }
      
      // Try to parse partial reference without colon (e.g., "John 3")
      const partialMatch = cleanQuery.match(/^([a-z0-9\s]+)\s+(\d+)$/i);
      if (partialMatch) {
        console.log('📖 Detected partial reference pattern:', partialMatch);
        const [, bookPart, chapterNum] = partialMatch;
        const normalizedBook = bibleReferenceParser.normalizeBookName(bookPart.trim());
        
        console.log('📖 Book part:', bookPart.trim(), '→ Normalized:', normalizedBook);
        
        if (normalizedBook) {
          const bookId = bibleReferenceParser.getBookId(normalizedBook);
          const chapterId = `${bookId}_${chapterNum}`;
          
          console.log('📖 Fetching chapterId:', chapterId);
          
          const version = await this.getCurrentVersion();
          const verses = await githubBibleService.getVerses(chapterId, version.id || 'kjv');
          
          if (verses && verses.length > 0) {
            console.log('✅ Found', verses.length, 'verses for', chapterId);
            return verses.slice(0, maxResults).map(v => ({
              bookId: bookId,
              book: normalizedBook,
              chapter: chapterNum,
              verse: v.number || v.verse,
              text: v.text || v.content,
              content: v.text || v.content,
              reference: `${normalizedBook} ${chapterNum}:${v.number || v.verse}`
            }));
          } else {
            console.log('❌ No verses found for', chapterId);
          }
        } else {
          console.log('❌ Could not normalize book name:', bookPart);
        }
      }
      
      // Try to parse as a full reference (e.g., "John 3:16")
      const parsedRef = bibleReferenceParser.parseReference(query);
      
      if (parsedRef) {
        console.log('📖 Parsed full reference:', parsedRef);
        // Full reference parsed (e.g., "John 3:16")
        const { book, chapter, startVerse, endVerse } = parsedRef;
        const bookId = bibleReferenceParser.getBookId(book);
        const chapterId = `${bookId}_${chapter}`;
        const version = await this.getCurrentVersion();
        const verses = await githubBibleService.getVerses(chapterId, version.id || 'kjv');
        
        if (verses && verses.length > 0) {
          let filteredVerses = verses;
          if (startVerse) {
            const start = parseInt(startVerse);
            const end = endVerse ? parseInt(endVerse) : start;
            filteredVerses = verses.filter(v => {
              const verseNum = parseInt(v.number || v.verse);
              return verseNum >= start && verseNum <= end;
            });
          }
          
          console.log('✅ Found', filteredVerses.length, 'verses for full reference');
          return filteredVerses.slice(0, maxResults).map(v => ({
            bookId: bookId,
            book: book,
            chapter: chapter,
            verse: v.number || v.verse,
            text: v.text || v.content,
            content: v.text || v.content,
            reference: `${book} ${chapter}:${v.number || v.verse}`
          }));
        }
      }
      
      // Get all books
      const books = await githubBibleService.getBooks();
      
      // Filter books that match the query
      const matchingBooks = books.filter(book => {
        const bookName = book.name.toLowerCase();
        const bookId = book.id.toLowerCase();
        return bookName.startsWith(cleanQuery) || bookId.startsWith(cleanQuery);
      });
      
      console.log('📖 Matching books:', matchingBooks.map(b => b.name).join(', '));
      
      if (matchingBooks.length === 0) {
        console.log('❌ No matching books found for:', cleanQuery);
        return [];
      }
      
      // Just book name (e.g., "John") - show all verses from all chapters (limited)
      const version = await this.getCurrentVersion();
      for (const matchedBook of matchingBooks) {
        if (results.length >= maxResults) break;
        
        const chapters = await githubBibleService.getChapters(matchedBook.id);
        
        for (const chapter of chapters) {
          if (results.length >= maxResults) break;
          
          const verses = await githubBibleService.getVerses(chapter.id, version.id || 'kjv');
          
          if (verses && verses.length > 0) {
            for (const v of verses) {
              if (results.length >= maxResults) break;
              
              results.push({
                bookId: matchedBook.id,
                book: matchedBook.name,
                chapter: chapter.number,
                verse: v.number || v.verse,
                text: v.text || v.content,
                content: v.text || v.content,
                reference: `${matchedBook.name} ${chapter.number}:${v.number || v.verse}`
              });
            }
          }
        }
      }
      
      console.log('✅ Found', results.length, 'verses (limited to', maxResults, ')');
      return results;
      
    } catch (error) {
      console.error('❌ Live search error:', error);
      return [];
    }
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
