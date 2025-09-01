import AsyncStorage from '@react-native-async-storage/async-storage';

class VerseDataManager {
  static VERSE_DATA_KEY = 'verse_data';
  static READING_STREAKS_KEY = 'reading_streaks';
  static ACHIEVEMENTS_KEY = 'achievements';
  static DAILY_VERSE_KEY = 'daily_verse';

  // Get verse data (notes, highlights, bookmarks)
  static async getVerseData(verseId) {
    try {
      const allData = await this.getAllVerseData();
      return allData[verseId] || {
        id: verseId,
        notes: [],
        highlights: [],
        bookmarks: [],
        lastRead: null,
        readCount: 0
      };
    } catch (error) {
      console.error('Error getting verse data:', error);
      return {
        id: verseId,
        notes: [],
        highlights: [],
        bookmarks: [],
        lastRead: null,
        readCount: 0
      };
    }
  }

  // Get all verse data
  static async getAllVerseData() {
    try {
      const data = await AsyncStorage.getItem(this.VERSE_DATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting all verse data:', error);
      return {};
    }
  }

  // Save verse data
  static async saveVerseData(verseId, data) {
    try {
      const allData = await this.getAllVerseData();
      allData[verseId] = {
        ...allData[verseId],
        ...data,
        lastUpdated: new Date().toISOString()
      };
      await AsyncStorage.setItem(this.VERSE_DATA_KEY, JSON.stringify(allData));
      return allData[verseId];
    } catch (error) {
      console.error('Error saving verse data:', error);
      throw error;
    }
  }

  // Add personal note to verse
  static async addNote(verseId, noteText, verseReference) {
    try {
      const verseData = await this.getVerseData(verseId);
      const newNote = {
        id: Date.now().toString(),
        text: noteText,
        createdAt: new Date().toISOString(),
        verseReference: verseReference
      };
      
      verseData.notes = [...(verseData.notes || []), newNote];
      await this.saveVerseData(verseId, verseData);
      
      console.log(`📝 Note added to ${verseReference}:`, noteText.substring(0, 50) + '...');
      return newNote;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }

  // Update note
  static async updateNote(verseId, noteId, newText) {
    try {
      const verseData = await this.getVerseData(verseId);
      const noteIndex = verseData.notes.findIndex(note => note.id === noteId);
      
      if (noteIndex !== -1) {
        verseData.notes[noteIndex] = {
          ...verseData.notes[noteIndex],
          text: newText,
          updatedAt: new Date().toISOString()
        };
        await this.saveVerseData(verseId, verseData);
        return verseData.notes[noteIndex];
      }
      throw new Error('Note not found');
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  // Delete note
  static async deleteNote(verseId, noteId) {
    try {
      const verseData = await this.getVerseData(verseId);
      verseData.notes = verseData.notes.filter(note => note.id !== noteId);
      await this.saveVerseData(verseId, verseData);
      console.log(`🗑️ Note deleted from verse ${verseId}`);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  // Add highlight to verse
  static async addHighlight(verseId, color, verseReference) {
    try {
      const verseData = await this.getVerseData(verseId);
      const newHighlight = {
        id: Date.now().toString(),
        color: color,
        createdAt: new Date().toISOString(),
        verseReference: verseReference
      };
      
      // Remove existing highlight first (one highlight per verse)
      verseData.highlights = [newHighlight];
      await this.saveVerseData(verseId, verseData);
      
      console.log(`🎨 Highlight added to ${verseReference}:`, color);
      return newHighlight;
    } catch (error) {
      console.error('Error adding highlight:', error);
      throw error;
    }
  }

  // Remove highlight
  static async removeHighlight(verseId) {
    try {
      const verseData = await this.getVerseData(verseId);
      verseData.highlights = [];
      await this.saveVerseData(verseId, verseData);
      console.log(`🎨 Highlight removed from verse ${verseId}`);
    } catch (error) {
      console.error('Error removing highlight:', error);
      throw error;
    }
  }

  // Add bookmark with category
  static async addBookmark(verseId, category, verseReference, verseText) {
    try {
      const verseData = await this.getVerseData(verseId);
      const newBookmark = {
        id: Date.now().toString(),
        category: category,
        verseReference: verseReference,
        verseText: verseText,
        createdAt: new Date().toISOString()
      };
      
      // Check if already bookmarked in this category
      const existingIndex = verseData.bookmarks.findIndex(b => b.category === category);
      if (existingIndex !== -1) {
        verseData.bookmarks[existingIndex] = newBookmark;
      } else {
        verseData.bookmarks = [...(verseData.bookmarks || []), newBookmark];
      }
      
      await this.saveVerseData(verseId, verseData);
      console.log(`🔖 Bookmark added to ${verseReference}:`, category);
      return newBookmark;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }

  // Remove bookmark
  static async removeBookmark(verseId, category) {
    try {
      const verseData = await this.getVerseData(verseId);
      verseData.bookmarks = verseData.bookmarks.filter(b => b.category !== category);
      await this.saveVerseData(verseId, verseData);
      console.log(`🔖 Bookmark removed from verse ${verseId}:`, category);
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
  }

  // Track verse reading
  static async trackReading(verseId, verseReference) {
    try {
      const verseData = await this.getVerseData(verseId);
      verseData.readCount = (verseData.readCount || 0) + 1;
      verseData.lastRead = new Date().toISOString();
      await this.saveVerseData(verseId, verseData);
      
      // Update reading streak
      await this.updateReadingStreak();
      
      console.log(`📖 Reading tracked for ${verseReference}`);
    } catch (error) {
      console.error('Error tracking reading:', error);
    }
  }

  // Update reading streak
  static async updateReadingStreak() {
    try {
      const streakData = await AsyncStorage.getItem(this.READING_STREAKS_KEY);
      const streaks = streakData ? JSON.parse(streakData) : {
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null,
        totalDaysRead: 0
      };
      
      const today = new Date().toDateString();
      const lastRead = streaks.lastReadDate;
      
      if (!lastRead || lastRead !== today) {
        // Check if yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastRead === yesterday.toDateString()) {
          streaks.currentStreak += 1;
        } else if (!lastRead) {
          streaks.currentStreak = 1;
        } else {
          streaks.currentStreak = 1; // Reset streak
        }
        
        streaks.longestStreak = Math.max(streaks.longestStreak, streaks.currentStreak);
        streaks.lastReadDate = today;
        streaks.totalDaysRead += 1;
        
        await AsyncStorage.setItem(this.READING_STREAKS_KEY, JSON.stringify(streaks));
        
        // Check for achievements
        await this.checkReadingAchievements(streaks);
      }
      
      return streaks;
    } catch (error) {
      console.error('Error updating reading streak:', error);
    }
  }

  // Get reading streaks
  static async getReadingStreaks() {
    try {
      const data = await AsyncStorage.getItem(this.READING_STREAKS_KEY);
      return data ? JSON.parse(data) : {
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null,
        totalDaysRead: 0
      };
    } catch (error) {
      console.error('Error getting reading streaks:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null,
        totalDaysRead: 0
      };
    }
  }

  // Check and unlock achievements
  static async checkReadingAchievements(streaks) {
    try {
      const achievements = await this.getAchievements();
      const newAchievements = [];
      
      // Streak achievements
      if (streaks.currentStreak >= 7 && !achievements.includes('week_streak')) {
        newAchievements.push('week_streak');
      }
      if (streaks.currentStreak >= 30 && !achievements.includes('month_streak')) {
        newAchievements.push('month_streak');
      }
      if (streaks.longestStreak >= 100 && !achievements.includes('century_streak')) {
        newAchievements.push('century_streak');
      }
      
      // Total days achievements
      if (streaks.totalDaysRead >= 50 && !achievements.includes('fifty_days')) {
        newAchievements.push('fifty_days');
      }
      if (streaks.totalDaysRead >= 365 && !achievements.includes('year_reader')) {
        newAchievements.push('year_reader');
      }
      
      if (newAchievements.length > 0) {
        const updatedAchievements = [...achievements, ...newAchievements];
        await AsyncStorage.setItem(this.ACHIEVEMENTS_KEY, JSON.stringify(updatedAchievements));
        console.log('🏆 New achievements unlocked:', newAchievements);
        return newAchievements;
      }
      
      return [];
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  // Get achievements
  static async getAchievements() {
    try {
      const data = await AsyncStorage.getItem(this.ACHIEVEMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting achievements:', error);
      return [];
    }
  }

  // Get all bookmarked verses by category
  static async getBookmarksByCategory() {
    try {
      const allData = await this.getAllVerseData();
      const bookmarksByCategory = {};
      
      Object.values(allData).forEach(verseData => {
        if (verseData.bookmarks && verseData.bookmarks.length > 0) {
          verseData.bookmarks.forEach(bookmark => {
            if (!bookmarksByCategory[bookmark.category]) {
              bookmarksByCategory[bookmark.category] = [];
            }
            bookmarksByCategory[bookmark.category].push({
              ...bookmark,
              verseId: verseData.id
            });
          });
        }
      });
      
      return bookmarksByCategory;
    } catch (error) {
      console.error('Error getting bookmarks by category:', error);
      return {};
    }
  }

  // Get all notes
  static async getAllNotes() {
    try {
      const allData = await this.getAllVerseData();
      const allNotes = [];
      
      Object.values(allData).forEach(verseData => {
        if (verseData.notes && verseData.notes.length > 0) {
          verseData.notes.forEach(note => {
            allNotes.push({
              ...note,
              verseId: verseData.id
            });
          });
        }
      });
      
      // Sort by creation date (newest first)
      return allNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error getting all notes:', error);
      return [];
    }
  }

  // Search notes
  static async searchNotes(query) {
    try {
      const allNotes = await this.getAllNotes();
      const lowercaseQuery = query.toLowerCase();
      
      return allNotes.filter(note => 
        note.text.toLowerCase().includes(lowercaseQuery) ||
        note.verseReference.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  }

  // Generate daily verse
  static async getDailyVerse() {
    try {
      const today = new Date().toDateString();
      const storedData = await AsyncStorage.getItem(this.DAILY_VERSE_KEY);
      const dailyVerseData = storedData ? JSON.parse(storedData) : null;
      
      // Check if we need a new daily verse
      if (!dailyVerseData || dailyVerseData.date !== today) {
        // Generate new daily verse
        const verses = [
          { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.", reference: "Jeremiah 29:11" },
          { text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", reference: "Proverbs 3:5-6" },
          { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", reference: "Joshua 1:9" },
          { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
          { text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", reference: "Romans 8:28" }
        ];
        
        // Use date as seed for consistent daily verse
        const dateNum = new Date().getDate() + new Date().getMonth() * 31;
        const todaysVerse = verses[dateNum % verses.length];
        
        const newDailyVerse = {
          ...todaysVerse,
          date: today,
          id: `daily_${today}`,
          theme: this.getDailyTheme()
        };
        
        await AsyncStorage.setItem(this.DAILY_VERSE_KEY, JSON.stringify(newDailyVerse));
        return newDailyVerse;
      }
      
      return dailyVerseData;
    } catch (error) {
      console.error('Error getting daily verse:', error);
      return {
        text: "This is the day the Lord has made; we will rejoice and be glad in it.",
        reference: "Psalm 118:24",
        date: new Date().toDateString(),
        id: `daily_${new Date().toDateString()}`,
        theme: "joy"
      };
    }
  }

  // Get daily theme
  static getDailyTheme() {
    const themes = ['hope', 'love', 'strength', 'peace', 'joy', 'faith', 'wisdom'];
    const dayOfWeek = new Date().getDay();
    return themes[dayOfWeek];
  }

  // Additional methods for BibleReader compatibility
  static async getHighlights() {
    try {
      const allData = await this.getAllVerseData();
      const highlights = {};
      
      Object.entries(allData).forEach(([verseId, data]) => {
        if (data.highlights && data.highlights.length > 0) {
          // Get the most recent highlight
          const latestHighlight = data.highlights[data.highlights.length - 1];
          highlights[verseId] = {
            color: latestHighlight.color,
            timestamp: latestHighlight.timestamp
          };
        }
      });
      
      return highlights;
    } catch (error) {
      console.error('Error getting highlights:', error);
      return {};
    }
  }

  static async getBookmarks() {
    try {
      const allData = await this.getAllVerseData();
      const bookmarks = {};
      
      Object.entries(allData).forEach(([verseId, data]) => {
        if (data.bookmarks && data.bookmarks.length > 0) {
          // Get the most recent bookmark
          const latestBookmark = data.bookmarks[data.bookmarks.length - 1];
          bookmarks[verseId] = {
            category: latestBookmark.category,
            timestamp: latestBookmark.timestamp
          };
        }
      });
      
      return bookmarks;
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return {};
    }
  }

  static async saveNote(verseId, noteContent) {
    try {
      return await this.addNote(verseId, noteContent, '');
    } catch (error) {
      console.error('Error saving note:', error);
    }
  }

  static async getNote(verseId) {
    try {
      const verseData = await this.getVerseData(verseId);
      if (verseData.notes && verseData.notes.length > 0) {
        const latestNote = verseData.notes[verseData.notes.length - 1];
        return {
          content: latestNote.text,
          timestamp: latestNote.timestamp
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting note:', error);
      return null;
    }
  }

  static async deleteNoteCompat(verseId) {
    try {
      const allData = await this.getAllVerseData();
      if (allData[verseId] && allData[verseId].notes) {
        allData[verseId].notes = [];
        await this.saveVerseData(verseId, allData[verseId]);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }

  static async removeHighlightCompat(verseId) {
    try {
      const allData = await this.getAllVerseData();
      if (allData[verseId] && allData[verseId].highlights) {
        allData[verseId].highlights = [];
        await this.saveVerseData(verseId, allData[verseId]);
      }
    } catch (error) {
      console.error('Error removing highlight:', error);
    }
  }

  static async removeBookmarkCompat(verseId) {
    try {
      const allData = await this.getAllVerseData();
      if (allData[verseId] && allData[verseId].bookmarks) {
        allData[verseId].bookmarks = [];
        await this.saveVerseData(verseId, allData[verseId]);
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  }
}

export default VerseDataManager;
