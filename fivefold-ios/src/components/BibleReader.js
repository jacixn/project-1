import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Share,
  SafeAreaView,
  Dimensions,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import completeBibleService from '../services/completeBibleService';
import { hapticFeedback } from '../utils/haptics';

import { CircleStrokeSpin, CirclePulseMultiple } from './ProgressHUDAnimations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bibleVersions, getVersionById } from '../data/bibleVersions';
import VerseDataManager from '../utils/verseDataManager';
import VerseJournalingModal from './VerseJournalingModal';
// Removed InteractiveSwipeBack import

const BibleReader = ({ visible, onClose, onNavigateToAI }) => {
  
  const { theme, isDark } = useTheme();
  const { language, t } = useLanguage();
  const [books, setBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('books'); // 'books', 'chapters', 'verses', 'search'
  const [translatingVerse, setTranslatingVerse] = useState(null);
  const [showOriginal, setShowOriginal] = useState(new Set()); // Track which verses show original
  const [simplifiedVerses, setSimplifiedVerses] = useState(new Map()); // For compatibility

  const [selectedBibleVersion, setSelectedBibleVersion] = useState('kjv');
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [savedVerses, setSavedVerses] = useState(new Set());
  
  // Interactive features state
  const [showJournalingModal, setShowJournalingModal] = useState(false);
  const [selectedVerseForJournal, setSelectedVerseForJournal] = useState(null);
  const [verseNotes, setVerseNotes] = useState({});
  const [verseHighlights, setVerseHighlights] = useState({});
  const [verseBookmarks, setVerseBookmarks] = useState({});
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showBookmarkPicker, setShowBookmarkPicker] = useState(false);
  const [selectedVerseForAction, setSelectedVerseForAction] = useState(null);

  // Debug state changes
  useEffect(() => {
    console.log('🔍 showJournalingModal changed to:', showJournalingModal);
  }, [showJournalingModal]);

  useEffect(() => {
    console.log('🔍 showHighlightPicker changed to:', showHighlightPicker);
  }, [showHighlightPicker]);

  useEffect(() => {
    console.log('🔍 showBookmarkPicker changed to:', showBookmarkPicker);
  }, [showBookmarkPicker]);

  // Load saved verses on mount
  useEffect(() => {
    loadSavedVerses();
    loadInteractiveData();
  }, []);

  // Reload interactive data when verses change
  useEffect(() => {
    if (verses && verses.length > 0) {
      loadInteractiveData();
    }
  }, [verses]);

  // Load interactive data (notes, highlights, bookmarks)
  const loadInteractiveData = async () => {
    try {
      const highlights = await VerseDataManager.getHighlights();
      const bookmarks = await VerseDataManager.getBookmarks();
      setVerseHighlights(highlights);
      setVerseBookmarks(bookmarks);
      
      // Load notes for currently displayed verses
      if (verses && verses.length > 0) {
        const notes = {};
        for (const verse of verses) {
          const verseId = verse.id || `${currentBook?.id}_${currentChapter?.number}_${verse.number}`;
          const note = await VerseDataManager.getNote(verseId);
          if (note) {
            notes[verseId] = note;
          }
        }
        setVerseNotes(notes);
      }
    } catch (error) {
      console.error('Error loading interactive data:', error);
    }
  };

  // Sync Bible service with language changes
  useEffect(() => {
    const syncLanguage = async () => {
      await completeBibleService.setLanguage(language);
      // Reload current chapter if viewing verses
      if (view === 'verses' && currentChapter) {
        loadVerses(currentChapter);
      }
    };
    syncLanguage();
  }, [language]);

  const loadSavedVerses = async () => {
    try {
      const savedVersesData = await AsyncStorage.getItem('savedBibleVerses');
      if (savedVersesData) {
        const versesArray = JSON.parse(savedVersesData);
        setSavedVerses(new Set(versesArray.map(v => v.id)));
      }
    } catch (error) {
      console.error('Error loading saved verses:', error);
    }
  };

  const handleSaveVerse = async (verse) => {
    try {
      hapticFeedback.success();
      
      // Get current saved verses
      const savedVersesData = await AsyncStorage.getItem('savedBibleVerses');
      let versesArray = savedVersesData ? JSON.parse(savedVersesData) : [];
      
      const verseId = verse.id || `${currentBook?.id}_${currentChapter?.number}_${verse.number}`;
      const bookName = currentBook?.name || 'Book';
      const chapterNum = currentChapter?.number || currentChapter?.id?.split('_').pop() || '';
      const verseNum = verse.number || verse.verse || '';
      
      if (savedVerses.has(verseId)) {
        // Remove from saved
        versesArray = versesArray.filter(v => v.id !== verseId);
        const newSet = new Set(savedVerses);
        newSet.delete(verseId);
        setSavedVerses(newSet);
      } else {
        // Add to saved
        const verseToSave = {
          id: verseId,
          reference: `${bookName} ${chapterNum}:${verseNum}`,
          content: verse.content || verse.text,
          version: selectedBibleVersion,
          savedAt: new Date().toISOString()
        };
        versesArray.push(verseToSave);
        const newSet = new Set(savedVerses);
        newSet.add(verseId);
        setSavedVerses(newSet);
      }
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('savedBibleVerses', JSON.stringify(versesArray));
      
      // Update user stats
      const stats = await AsyncStorage.getItem('userStats');
      const userStats = stats ? JSON.parse(stats) : {};
      userStats.savedVerses = versesArray.length;
      await AsyncStorage.setItem('userStats', JSON.stringify(userStats));
      
    } catch (error) {
      console.error('Error saving verse:', error);
      Alert.alert('Error', 'Failed to save verse');
    }
  };

  // Handle smart back navigation based on current view
  const handleBackNavigation = () => {
    switch (view) {
      case 'verses':
        // From verses, go back to chapters
        setView('chapters');
        setVerses([]);
        setCurrentChapter(null);
        break;
      case 'chapters':
        // From chapters, go back to book selection (old/new testament or books)
        setView('books');
        setChapters([]);
        setCurrentBook(null);
        break;
      case 'old-testament':
      case 'new-testament':
        // From testament view, go back to main books view
        setView('books');
        break;
      case 'search':
        // From search, go back to books
        setView('books');
        setSearchQuery('');
        setSearchResults([]);
        break;
      case 'books':
      default:
        // From main books view, close the entire modal
        onClose();
        break;
    }
  };

  // Removed previous page preview function

  useEffect(() => {
    if (visible) {
      loadBooks();
      loadSelectedVersion();
    }
  }, [visible]);

  const loadSelectedVersion = async () => {
    try {
      const storedVersion = await AsyncStorage.getItem('selectedBibleVersion');
      if (storedVersion) {
        setSelectedBibleVersion(storedVersion);
      }
    } catch (error) {
      console.error('Failed to load Bible version:', error);
    }
  };

  const handleVersionChange = async (versionId) => {
    try {
      setSelectedBibleVersion(versionId);
      await AsyncStorage.setItem('selectedBibleVersion', versionId);
      setShowVersionPicker(false);
      hapticFeedback.success();
      
      // Reload current verses if viewing them
      if (view === 'verses' && currentChapter) {
        loadVerses(currentChapter);
      }
    } catch (error) {
      console.error('Failed to change Bible version:', error);
    }
  };

  const loadBooks = async () => {
    setLoading(true);
    try {
      const booksData = await completeBibleService.getBooks();
      setBooks(booksData);
    } catch (error) {
      Alert.alert('📚 Error', 'Failed to load Bible books. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async (book) => {
    setLoading(true);
    try {
      const chaptersData = await completeBibleService.getChapters(book.id);
      setChapters(chaptersData);
      setCurrentBook(book);
      setView('chapters');
    } catch (error) {
      Alert.alert('📖 Error', 'Failed to load chapters.');
    } finally {
      setLoading(false);
    }
  };

  const loadVerses = async (chapter) => {
    setLoading(true);
    try {
      const versesData = await completeBibleService.getVerses(chapter.id, selectedBibleVersion);
      setVerses(versesData);
      setCurrentChapter(chapter);
      setView('verses');
    } catch (error) {
      Alert.alert('📜 Error', 'Failed to load verses.');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to previous chapter
  const goToPreviousChapter = async () => {
    if (!currentChapter || !currentBook) return;
    
    hapticFeedback.light();
    const currentChapterNum = parseInt(currentChapter.number);
    
    if (currentChapterNum > 1) {
      // Go to previous chapter in same book
      const prevChapter = {
        id: `${currentBook.id}_${currentChapterNum - 1}`,
        number: (currentChapterNum - 1).toString(),
        bookId: currentBook.id
      };
      loadVerses(prevChapter);
    } else {
      // Go to last chapter of previous book
      const currentBookIndex = books.findIndex(b => b.id === currentBook.id);
      if (currentBookIndex > 0) {
        const prevBook = books[currentBookIndex - 1];
        const lastChapter = {
          id: `${prevBook.id}_${prevBook.chapters}`,
          number: prevBook.chapters.toString(),
          bookId: prevBook.id
        };
        setCurrentBook(prevBook);
        loadVerses(lastChapter);
      }
    }
  };

  // Navigate to next chapter
  const goToNextChapter = async () => {
    if (!currentChapter || !currentBook) return;
    
    hapticFeedback.light();
    const currentChapterNum = parseInt(currentChapter.number);
    
    if (currentChapterNum < currentBook.chapters) {
      // Go to next chapter in same book
      const nextChapter = {
        id: `${currentBook.id}_${currentChapterNum + 1}`,
        number: (currentChapterNum + 1).toString(),
        bookId: currentBook.id
      };
      loadVerses(nextChapter);
    } else {
      // Go to first chapter of next book
      const currentBookIndex = books.findIndex(b => b.id === currentBook.id);
      if (currentBookIndex < books.length - 1) {
        const nextBook = books[currentBookIndex + 1];
        const firstChapter = {
          id: `${nextBook.id}_1`,
          number: '1',
          bookId: nextBook.id
        };
        setCurrentBook(nextBook);
        loadVerses(firstChapter);
      }
    }
  };

  const searchBible = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results = await completeBibleService.searchVerses(searchQuery);
      setSearchResults(results);
      setView('search');
    } catch (error) {
      Alert.alert('🔍 Search Error', 'Failed to search Bible. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimplifyToggle = async (verse) => {
    hapticFeedback.light();
    
    // If already simplified, toggle back to original
    if (verse.isSimplified) {
      const updatedVerses = verses.map(v => {
        if (v.id === verse.id) {
          return {
            ...v,
            content: v.originalContent,
            isSimplified: false
          };
        }
        return v;
      });
      setVerses(updatedVerses);
      return;
    }
    
    // Need to simplify - either from cache or API
    setTranslatingVerse(verse.id);
    try {
      let simplifiedText = verse.simplifiedContent;
      
      // If not cached, get from API
      if (!simplifiedText) {
        const productionAiService = require('../services/productionAiService').default;
        simplifiedText = await productionAiService.simplifyBibleVerse(
          verse.originalContent || verse.content, 
          verse.reference
        );
      }
      
      const updatedVerses = verses.map(v => {
        if (v.id === verse.id) {
          return {
            ...v,
            content: simplifiedText,
            simplifiedContent: simplifiedText,
            isSimplified: true
          };
        }
        return v;
      });
      setVerses(updatedVerses);
      hapticFeedback.success();
    } catch (error) {
      console.error('Failed to simplify verse:', error);
      Alert.alert('Error', 'Failed to simplify verse. Please try again.');
    } finally {
      setTranslatingVerse(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (view === 'books') {
      await loadBooks();
    } else if (view === 'chapters' && currentBook) {
      await loadChapters(currentBook);
    } else if (view === 'verses' && currentChapter) {
      await loadVerses(currentChapter);
    }
    setRefreshing(false);
  };

  const goBack = () => {
    if (view === 'search') {
      setView('books');
    } else if (view === 'verses') {
      setView('chapters');
    } else if (view === 'chapters') {
      // Go back to the appropriate testament view or books
      if (currentBook?.testament === 'old') {
        setView('old-testament');
      } else if (currentBook?.testament === 'new') {
        setView('new-testament');
      } else {
        setView('books');
      }
    } else if (view === 'old-testament' || view === 'new-testament') {
      setView('books');
    }
  };

  // Interactive Features Handlers
  const handleJournalVerse = (verse) => {
    console.log('📝 Journal button tapped!', verse);
    const verseId = verse.id || `${currentBook?.id}_${currentChapter?.number}_${verse.number}`;
    const bookName = currentBook?.name || 'Book';
    const chapterNum = currentChapter?.number || currentChapter?.id?.split('_').pop() || '';
    const verseNum = verse.number || verse.verse || '';
    const reference = `${bookName} ${chapterNum}:${verseNum}`;
    
    console.log('📝 Generated verseId:', verseId);
    console.log('📝 Reference:', reference);
    
    setSelectedVerseForJournal({
      id: verseId,
      text: verse.content || verse.text || '',
      reference: reference,
      note: verseNotes[verseId]?.content || ''
    });
    setShowJournalingModal(true);
    hapticFeedback.light();
    console.log('📝 Journal modal should open now');
    console.log('📝 showJournalingModal state:', showJournalingModal);
    console.log('📝 selectedVerseForJournal:', selectedVerseForJournal);
  };

  const handleSaveNote = async (verseId, noteContent) => {
    try {
      await VerseDataManager.saveNote(verseId, noteContent);
      setVerseNotes(prev => ({
        ...prev,
        [verseId]: { content: noteContent, timestamp: new Date().toISOString() }
      }));
      console.log(`Note saved for verse ${verseId}`);
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleHighlightVerse = async (verse, color) => {
    const verseId = verse.id || `${currentBook?.id}_${currentChapter?.number}_${verse.number}`;
    const bookName = currentBook?.name || 'Book';
    const chapterNum = currentChapter?.number || currentChapter?.id?.split('_').pop() || '';
    const verseNum = verse.number || verse.verse || '';
    const reference = `${bookName} ${chapterNum}:${verseNum}`;
    
    try {
      if (color === null) {
        // Remove highlight
        await VerseDataManager.removeHighlight(verseId);
        setVerseHighlights(prev => {
          const newHighlights = { ...prev };
          delete newHighlights[verseId];
          return newHighlights;
        });
        console.log(`🚫 Removed highlight from verse ${verseId}`);
      } else {
        // Add/update highlight
        await VerseDataManager.addHighlight(verseId, color, reference);
        setVerseHighlights(prev => ({
          ...prev,
          [verseId]: { color, timestamp: new Date().toISOString() }
        }));
        console.log(`✨ Highlighted verse ${verseId} with color ${color}`);
      }
      hapticFeedback.success();
      setShowHighlightPicker(false);
      setSelectedVerseForAction(null);
    } catch (error) {
      console.error('Error highlighting verse:', error);
      hapticFeedback.error();
    }
  };

  const handleSimplifyVerse = async (verse) => {
    const verseId = verse.id || `${currentBook?.id}_${currentChapter?.number}_${verse.number}`;
    
    try {
      if (verse.isSimplified) {
        // Toggle back to original
        setVerses(prevVerses => 
          prevVerses.map(v => 
            v.id === verseId ? { ...v, isSimplified: false } : v
          )
        );
        hapticFeedback.light();
      } else {
        // Simplify the verse
        hapticFeedback.light();
        
        // Use AI service to simplify the verse
        const { productionAiService } = await import('../services/productionAiService');
        const simplifiedText = await productionAiService.simplifyVerse(verse.content || verse.text);
        
        setVerses(prevVerses => 
          prevVerses.map(v => 
            v.id === verseId ? { 
              ...v, 
              isSimplified: true, 
              simplifiedContent: simplifiedText 
            } : v
          )
        );
        
        console.log(`🧒 Simplified verse ${verseId}`);
      }
    } catch (error) {
      console.error('Error simplifying verse:', error);
      hapticFeedback.error();
    }
  };

  const handleBookmarkVerse = async (verse, category) => {
    const verseId = verse.id || `${currentBook?.id}_${currentChapter?.number}_${verse.number}`;
    const bookName = currentBook?.name || 'Book';
    const chapterNum = currentChapter?.number || currentChapter?.id?.split('_').pop() || '';
    const verseNum = verse.number || verse.verse || '';
    const reference = `${bookName} ${chapterNum}:${verseNum}`;
    const verseText = verse.content || verse.text || '';
    
    try {
      await VerseDataManager.addBookmark(verseId, category, reference, verseText);
      setVerseBookmarks(prev => ({
        ...prev,
        [verseId]: { category, timestamp: new Date().toISOString() }
      }));
      hapticFeedback.success();
      setShowBookmarkPicker(false);
      setSelectedVerseForAction(null);
      console.log(`🔖 Bookmarked verse ${verseId} in category ${category}`);
    } catch (error) {
      console.error('Error bookmarking verse:', error);
      hapticFeedback.error();
    }
  };

  const handleShareVerse = async (verse) => {
    const bookName = currentBook?.name || 'Book';
    const chapterNum = currentChapter?.number || currentChapter?.id?.split('_').pop() || '';
    const verseNum = verse.number || verse.verse || '';
    const reference = `${bookName} ${chapterNum}:${verseNum}`;
    const verseText = verse.content || verse.text || '';
    
    const shareContent = `"${verseText}"\n\n- ${reference}\n\nShared from FiveFold Bible App`;
    
    try {
      await Share.share({
        message: shareContent,
        title: reference
      });
      hapticFeedback.success();
    } catch (error) {
      console.error('Error sharing verse:', error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity 
          onPress={() => {
            hapticFeedback.light(); // Light feedback when closing Bible
            onClose();
          }} 
          style={styles.closeButton}
        >
          <MaterialIcons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>📖 Holy Bible</Text>
          <TouchableOpacity 
            style={[styles.versionButton, { backgroundColor: theme.surface }]}
            onPress={() => {
              hapticFeedback.light();
              setShowVersionPicker(true);
            }}
          >
            <Text style={[styles.versionButtonText, { color: theme.primary }]}>
              {getVersionById(selectedBibleVersion).abbreviation}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          onPress={() => {
            hapticFeedback.light(); // Light feedback when opening search
            setView('search');
          }} 
          style={styles.searchButton}
        >
          <MaterialIcons name="search" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      {view !== 'books' && view !== 'search' && (
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>
            {view === 'chapters' ? 'All Books' : currentBook?.name}
          </Text>
        </TouchableOpacity>
      )}

      {view === 'search' && (
        <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search Bible verses..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchBible}
          />
          <TouchableOpacity onPress={searchBible} style={styles.searchSubmit}>
            <MaterialIcons name="search" size={20} color="#667eea" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBooks = () => (
    <ScrollView 
      style={[styles.content, { backgroundColor: 'transparent' }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Beautiful Header with Gradient */}
      <LinearGradient
        colors={[`${theme.primary}15`, 'transparent']}
        style={styles.headerGradient}
      >
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.headerBlur}>
          <Text style={[styles.beautifulTitle, { color: theme.text }]}>📚 Books of the Bible</Text>
          <Text style={[styles.beautifulSubtitle, { color: theme.textSecondary }]}>
            Explore the sacred texts with modern clarity
          </Text>
        </BlurView>
      </LinearGradient>
      
      {/* Testament Navigation Cards with Blur Effects */}
      <View style={styles.testamentsContainer}>
      <TouchableOpacity
          style={styles.modernTestamentCard}
          onPress={() => {
            hapticFeedback.buttonPress();
            setView('old-testament');
          }}
        >
          <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={styles.testamentBlurCard}>
            <LinearGradient
              colors={[`${theme.primary}30`, `${theme.primaryLight}15`]}
              style={styles.testamentGradient}
            >
              <View style={styles.modernTestamentIcon}>
                <Text style={styles.modernTestamentEmoji}>📜</Text>
        </View>
              <View style={styles.modernTestamentInfo}>
                <Text style={[styles.modernTestamentTitle, { color: theme.text }]}>Old Testament</Text>
                <Text style={[styles.modernTestamentSubtitle, { color: theme.textSecondary }]}>
                  {books.filter(book => book.testament === 'old').length} books • Ancient Wisdom
          </Text>
                <View style={styles.testamentStats}>
                  <View style={[styles.statBadge, { backgroundColor: `${theme.primary}20` }]}>
                    <Text style={[styles.statText, { color: theme.primary }]}>Genesis to Malachi</Text>
        </View>
                </View>
              </View>
              <View style={styles.modernChevron}>
                <MaterialIcons name="chevron-right" size={28} color={theme.primary} />
              </View>
            </LinearGradient>
          </BlurView>
      </TouchableOpacity>

      <TouchableOpacity
          style={styles.modernTestamentCard}
          onPress={() => {
            hapticFeedback.buttonPress();
            setView('new-testament');
          }}
        >
          <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={styles.testamentBlurCard}>
            <LinearGradient
              colors={[`${theme.primary}30`, `${theme.primaryLight}15`]}
              style={styles.testamentGradient}
            >
              <View style={styles.modernTestamentIcon}>
                <Text style={styles.modernTestamentEmoji}>✝️</Text>
        </View>
              <View style={styles.modernTestamentInfo}>
                <Text style={[styles.modernTestamentTitle, { color: theme.text }]}>New Testament</Text>
                <Text style={[styles.modernTestamentSubtitle, { color: theme.textSecondary }]}>
                  {books.filter(book => book.testament === 'new').length} books • Gospel & Letters
          </Text>
                <View style={styles.testamentStats}>
                  <View style={[styles.statBadge, { backgroundColor: `${theme.primary}20` }]}>
                    <Text style={[styles.statText, { color: theme.primary }]}>Matthew to Revelation</Text>
        </View>
                </View>
              </View>
              <View style={styles.modernChevron}>
                <MaterialIcons name="chevron-right" size={28} color={theme.primary} />
              </View>
            </LinearGradient>
          </BlurView>
      </TouchableOpacity>
      </View>

      {/* Quick Access Section */}
      <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.quickAccessSection}>
        <Text style={[styles.quickAccessTitle, { color: theme.text }]}>✨ Quick Access</Text>
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity style={styles.quickAccessItem} onPress={() => {
            hapticFeedback.buttonPress();
            // Navigate to Psalms
            const psalms = books.find(book => book.name === 'Psalms');
            if (psalms) loadChapters(psalms);
          }}>
            <Text style={styles.quickAccessEmoji}>🎵</Text>
            <Text style={[styles.quickAccessText, { color: theme.text }]}>Psalms</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAccessItem} onPress={() => {
            hapticFeedback.buttonPress();
            // Navigate to Proverbs
            const proverbs = books.find(book => book.name === 'Proverbs');
            if (proverbs) loadChapters(proverbs);
          }}>
            <Text style={styles.quickAccessEmoji}>💎</Text>
            <Text style={[styles.quickAccessText, { color: theme.text }]}>Proverbs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAccessItem} onPress={() => {
            hapticFeedback.buttonPress();
            // Navigate to John
            const john = books.find(book => book.name === 'John');
            if (john) loadChapters(john);
          }}>
            <Text style={styles.quickAccessEmoji}>❤️</Text>
            <Text style={[styles.quickAccessText, { color: theme.text }]}>John</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAccessItem} onPress={() => {
            hapticFeedback.buttonPress();
            // Navigate to Romans
            const romans = books.find(book => book.name === 'Romans');
            if (romans) loadChapters(romans);
          }}>
            <Text style={styles.quickAccessEmoji}>⚡</Text>
            <Text style={[styles.quickAccessText, { color: theme.text }]}>Romans</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </ScrollView>
  );

  const renderChapters = () => (
    <ScrollView 
      style={[styles.content, { backgroundColor: 'transparent' }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Beautiful Header */}
      <LinearGradient
        colors={[`${theme.primary}15`, 'transparent']}
        style={styles.headerGradient}
      >
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.headerBlur}>
          <Text style={[styles.beautifulTitle, { color: theme.text }]}>📖 {currentBook?.name}</Text>
          <Text style={[styles.beautifulSubtitle, { color: theme.textSecondary }]}>
            Choose a chapter to begin reading
          </Text>
        </BlurView>
      </LinearGradient>
      
      <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.chaptersContainer}>
        <View style={styles.modernChaptersGrid}>
          {chapters.map((chapter, index) => (
          <TouchableOpacity
            key={chapter.id}
              style={styles.modernChapterItem}
              onPress={() => {
                hapticFeedback.buttonPress();
                loadVerses(chapter);
              }}
            >
              <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={styles.chapterBlurCard}>
                <LinearGradient
                  colors={[
                    `${theme.primary}${Math.round(15 + (index % 4) * 8).toString(16)}`,
                    `${theme.primaryLight}${Math.round(8 + (index % 4) * 4).toString(16)}`
                  ]}
                  style={styles.chapterGradient}
                >
                  <Text style={[styles.modernChapterNumber, { color: theme.text }]}>
                    {chapter.number}
                  </Text>
                  <View style={styles.chapterIndicator}>
                    <MaterialIcons name="play-arrow" size={16} color={theme.primary} />
                  </View>
                </LinearGradient>
              </BlurView>
          </TouchableOpacity>
        ))}
      </View>
      </BlurView>
    </ScrollView>
  );

  const renderVerses = () => (
    <ScrollView 
      style={[styles.content, { backgroundColor: 'transparent' }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Beautiful Chapter Header */}
      <LinearGradient
        colors={[`${theme.primary}15`, 'transparent']}
        style={styles.versesHeaderGradient}
      >
        <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={styles.versesHeaderBlur}>
          <Text style={[styles.chapterTitle, { color: theme.text }]}>
            {currentBook?.name} {currentChapter?.number}
          </Text>
          <Text style={[styles.chapterSubtitle, { color: theme.textSecondary }]}>
            {verses.length} verses • Tap to interact
          </Text>
        </BlurView>
      </LinearGradient>

      {/* Modern Chapter Navigation */}
      <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.modernChapterNav}>
        <TouchableOpacity 
          onPress={goToPreviousChapter}
          style={[styles.modernNavButton, { 
            opacity: currentChapter?.number === '1' && books[0]?.id === currentBook?.id ? 0.3 : 1 
          }]}
          disabled={currentChapter?.number === '1' && books[0]?.id === currentBook?.id}
        >
          <LinearGradient
            colors={[`${theme.primary}20`, `${theme.primaryLight}10`]}
            style={styles.navButtonGradient}
          >
            <MaterialIcons name="chevron-left" size={20} color={theme.primary} />
            <Text style={[styles.modernNavText, { color: theme.primary }]}>Previous</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={goToNextChapter}
          style={[styles.modernNavButton, { 
            opacity: currentChapter?.number === currentBook?.chapters?.toString() && books[books.length - 1]?.id === currentBook?.id ? 0.3 : 1 
          }]}
          disabled={currentChapter?.number === currentBook?.chapters?.toString() && books[books.length - 1]?.id === currentBook?.id}
        >
          <LinearGradient
            colors={[`${theme.primary}20`, `${theme.primaryLight}10`]}
            style={styles.navButtonGradient}
          >
            <Text style={[styles.modernNavText, { color: theme.primary }]}>Next</Text>
            <MaterialIcons name="chevron-right" size={20} color={theme.primary} />
          </LinearGradient>
        </TouchableOpacity>
      </BlurView>
      


      <View style={styles.versesContainer}>
        {verses.map((verse, index) => {
        const isSimplified = verse.isSimplified && verse.simplifiedContent;
        const verseId = verse.id || `${currentBook?.id}_${currentChapter?.number}_${verse.number}`;
        const highlightColor = verseHighlights[verseId]?.color;
        
        return (
            <View key={verse.id} style={styles.modernVerseCard}>
              <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.verseBlurCard}>
                <LinearGradient
                  colors={highlightColor ? [
                    `${highlightColor}40`,
                    `${highlightColor}20`
                  ] : [
                    `${theme.primary}${Math.round(8 + (index % 5) * 3).toString(16)}`,
                    `${theme.primaryLight}${Math.round(4 + (index % 5) * 2).toString(16)}`
                  ]}
                  style={styles.verseGradient}
                >
                  <View style={styles.modernVerseHeader}>
                    <View style={[styles.verseNumberContainer, { backgroundColor: `${theme.primary}20` }]}>
                      <Text 
                        style={[styles.verseLabel, { color: theme.primary }]}
                        numberOfLines={1}
                      >
                        VERSE
                      </Text>
                      <Text 
                        style={[styles.verseNumberLarge, { color: theme.primary }]}
                        numberOfLines={1}
                      >
                        {String(verse.displayNumber || verse.number || index + 1).replace(/^Verse\s*/i, '')}
                      </Text>
                    </View>
              
                    <View style={styles.modernVerseActions}>
                      {/* Journal/Notes Button */}
                      <TouchableOpacity
                        onPress={() => handleJournalVerse(verse)}
                        style={[styles.modernActionButton, { 
                          backgroundColor: verseNotes[verse.id] ? `${theme.success}30` : `${theme.surface}40`
                        }]}
                        activeOpacity={0.7}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.actionButtonBlur}>
                          <MaterialIcons 
                            name={verseNotes[verse.id] ? "edit-note" : "note-add"} 
                            size={18} 
                            color={verseNotes[verse.id] ? theme.success : theme.textSecondary} 
                          />
                        </BlurView>
                      </TouchableOpacity>

                      {/* Highlight Button */}
                      <TouchableOpacity
                        onPress={() => {
                          console.log('🎨 Highlight button tapped!', verse);
                          console.log('🎨 Current showHighlightPicker state:', showHighlightPicker);
                          setSelectedVerseForAction(verse);
                          setShowHighlightPicker(true);
                          hapticFeedback.light();
                          console.log('🎨 Highlight picker should open now');
                          // Add a small delay to check state
                          setTimeout(() => {
                            console.log('🎨 showHighlightPicker state after timeout:', showHighlightPicker);
                          }, 100);
                        }}
                        style={[styles.modernActionButton, { 
                          backgroundColor: verseHighlights[verse.id] ? `${verseHighlights[verse.id].color}30` : `${theme.surface}40`
                        }]}
                        activeOpacity={0.7}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.actionButtonBlur}>
                          <MaterialIcons 
                            name="highlight" 
                            size={18} 
                            color={verseHighlights[verse.id] ? verseHighlights[verse.id].color : theme.textSecondary} 
                          />
                        </BlurView>
                      </TouchableOpacity>

                      {/* Bookmark Button */}
                      <TouchableOpacity
                        onPress={() => {
                          console.log('🔖 Bookmark button tapped!', verse);
                          setSelectedVerseForAction(verse);
                          setShowBookmarkPicker(true);
                          hapticFeedback.light();
                          console.log('🔖 Bookmark picker should open now');
                          console.log('🔖 showBookmarkPicker state:', showBookmarkPicker);
                          console.log('🔖 selectedVerseForAction:', verse);
                        }}
                        style={[styles.modernActionButton, { 
                          backgroundColor: verseBookmarks[verse.id] ? `${theme.warning}30` : `${theme.surface}40`
                        }]}
                        activeOpacity={0.7}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.actionButtonBlur}>
                          <MaterialIcons 
                            name={verseBookmarks[verse.id] ? "bookmark" : "bookmark-border"} 
                            size={18} 
                            color={verseBookmarks[verse.id] ? theme.warning : theme.textSecondary} 
                          />
                        </BlurView>
                      </TouchableOpacity>

                      {/* Share Button */}
                      <TouchableOpacity
                        onPress={() => handleShareVerse(verse)}
                        style={[styles.modernActionButton, { 
                          backgroundColor: `${theme.primary}20`
                        }]}
                      >
                        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.actionButtonBlur}>
                          <MaterialIcons name="share" size={18} color={theme.primary} />
                        </BlurView>
                      </TouchableOpacity>

                      {/* Discuss Button */}
                      <TouchableOpacity
                        onPress={() => {
                          hapticFeedback.buttonPress();
                          const bookName = currentBook?.name || 'Book';
                          const chapterNum = currentChapter?.number || currentChapter?.id?.split('_').pop() || '';
                          const verseNum = verse.number || verse.verse || '';
                          const reference = `${bookName} ${chapterNum}:${verseNum}`;
                          const verseText = verse.content || verse.text || '';
                          
                          const verseData = {
                            text: verseText,
                            reference: reference
                          };
                          
                          if (onNavigateToAI) {
                            onNavigateToAI(verseData);
                          }
                          
                          onClose();
                        }}
                        style={[styles.modernActionButton, { 
                          backgroundColor: `${theme.primary}30`
                        }]}
                      >
                        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.actionButtonBlur}>
                          <MaterialIcons name="forum" size={18} color={theme.primary} />
                        </BlurView>
                      </TouchableOpacity>

                      {/* Journal Button */}
                      <TouchableOpacity
                        onPress={() => {
                          console.log('📝 Journal button tapped!', verse);
                          setSelectedVerseForJournal(verse);
                          setShowJournalingModal(true);
                          hapticFeedback.light();
                        }}
                        style={[styles.modernActionButton, { 
                          backgroundColor: verseNotes[verseId] ? `${theme.success}30` : `${theme.surface}40`
                        }]}
                        activeOpacity={0.7}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.actionButtonBlur}>
                          <MaterialIcons 
                            name={verseNotes[verseId] ? "edit-note" : "note-add"} 
                            size={18} 
                            color={verseNotes[verseId] ? theme.success : theme.textSecondary} 
                          />
                        </BlurView>
                      </TouchableOpacity>
                    </View>
            </View>
            
                  {/* Beautiful Verse Content */}
                  <View style={styles.verseContentContainer}>
                    <Text style={[styles.modernVerseText, { color: theme.text }]}>
                      {isSimplified ? verse.simplifiedContent : verse.content}
                    </Text>
                    
                    {/* Show both versions if simplified */}
                    {isSimplified && verse.content !== verse.simplifiedContent && (
                      <TouchableOpacity 
                        style={styles.originalToggle}
                        onPress={() => {
                          hapticFeedback.light();
                          setShowOriginal(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(verse.id)) {
                              newSet.delete(verse.id);
                            } else {
                              newSet.add(verse.id);
                            }
                            return newSet;
                          });
                        }}
                      >
                        <Text style={[styles.originalToggleText, { color: theme.textSecondary }]}>
                          {showOriginal.has(verse.id) ? '← Simple' : 'Original →'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Show original text when toggled */}
                    {isSimplified && showOriginal.has(verse.id) && (
                      <View style={styles.originalTextContainer}>
                        <Text style={[styles.originalLabel, { color: theme.textSecondary }]}>
                          Original Text:
                        </Text>
                        <Text style={[styles.originalText, { color: theme.text }]}>
              {verse.content}
            </Text>
                      </View>
                    )}

                    {/* Journal Indicator - Show if verse has journal entry */}
                    {verseNotes[verseId] && (
                      <View style={styles.journalIndicatorContainer}>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedVerseForJournal(verse);
                            setShowJournalingModal(true);
                            hapticFeedback.light();
                          }}
                          style={[styles.journalIndicator, { backgroundColor: `${theme.success}20`, borderColor: `${theme.success}40` }]}
                        >
                          <MaterialIcons name="auto-stories" size={16} color={theme.success} />
                          <Text style={[styles.journalIndicatorText, { color: theme.success }]}>
                            Journal Entry
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Simple Button - Simplify verse for 12-year-olds */}
                    <View style={styles.simpleButtonContainer}>
                      <TouchableOpacity
                        onPress={() => handleSimplifyVerse(verse)}
                        style={[styles.simpleButton, { 
                          backgroundColor: verse.isSimplified ? `${theme.warning}30` : `${theme.primary}20`,
                          borderColor: verse.isSimplified ? `${theme.warning}60` : `${theme.primary}40`
                        }]}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons 
                          name={verse.isSimplified ? "child-care" : "child-friendly"} 
                          size={16} 
                          color={verse.isSimplified ? theme.warning : theme.primary} 
                        />
                        <Text style={[styles.simpleButtonText, { 
                          color: verse.isSimplified ? theme.warning : theme.primary 
                        }]}>
                          {verse.isSimplified ? 'Simplified' : 'Simple'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </BlurView>
          </View>
        );
      })}
      </View>
      
      {/* Beautiful Bottom Navigation */}
      <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={styles.modernBottomNav}>
        <TouchableOpacity 
          onPress={() => {
            hapticFeedback.buttonPress();
            goToPreviousChapter();
          }}
          style={[styles.modernBottomButton, { 
            opacity: currentChapter?.number === '1' && books[0]?.id === currentBook?.id ? 0.3 : 1 
          }]}
          disabled={currentChapter?.number === '1' && books[0]?.id === currentBook?.id}
        >
          <LinearGradient
            colors={[`${theme.primary}20`, `${theme.primaryLight}10`]}
            style={styles.bottomButtonGradient}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.primary} />
            <View style={styles.bottomButtonText}>
              <Text style={[styles.bottomButtonTitle, { color: theme.primary }]}>Previous</Text>
              <Text style={[styles.bottomButtonSubtitle, { color: theme.textSecondary }]}>
            {currentChapter?.number === '1' 
              ? (books.findIndex(b => b.id === currentBook?.id) > 0 
                  ? books[books.findIndex(b => b.id === currentBook?.id) - 1]?.name 
                      : 'Previous Chapter')
              : `Chapter ${parseInt(currentChapter?.number) - 1}`}
          </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => {
            hapticFeedback.buttonPress();
            goToNextChapter();
          }}
          style={[styles.modernBottomButton, { 
            opacity: currentChapter?.number === currentBook?.chapters?.toString() && books[books.length - 1]?.id === currentBook?.id ? 0.3 : 1 
          }]}
          disabled={currentChapter?.number === currentBook?.chapters?.toString() && books[books.length - 1]?.id === currentBook?.id}
        >
          <LinearGradient
            colors={[`${theme.primary}20`, `${theme.primaryLight}10`]}
            style={styles.bottomButtonGradient}
          >
            <View style={styles.bottomButtonText}>
              <Text style={[styles.bottomButtonTitle, { color: theme.primary }]}>Next</Text>
              <Text style={[styles.bottomButtonSubtitle, { color: theme.textSecondary }]}>
            {currentChapter?.number === currentBook?.chapters?.toString()
              ? (books.findIndex(b => b.id === currentBook?.id) < books.length - 1
                  ? books[books.findIndex(b => b.id === currentBook?.id) + 1]?.name
                      : 'Next Chapter')
              : `Chapter ${parseInt(currentChapter?.number) + 1}`}
          </Text>
      </View>
            <MaterialIcons name="arrow-forward" size={24} color={theme.primary} />
          </LinearGradient>
        </TouchableOpacity>
      </BlurView>
    </ScrollView>
  );

  const renderSearchResults = () => (
    <ScrollView style={[styles.content, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>🔍 Search Results for "{searchQuery}"</Text>
      
      {searchResults.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No verses found. Try a different search term.</Text>
      ) : (
        searchResults.map((result, index) => (
          <View key={index} style={[styles.searchResultItem, { backgroundColor: theme.card }]}>
            <Text style={[styles.searchReference, { color: theme.primary }]}>{result.reference}</Text>
            <Text style={[styles.searchText, { color: theme.text }]}>{result.content}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderOldTestament = () => (
    <ScrollView 
      style={[styles.content, { backgroundColor: 'transparent' }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Beautiful Header */}
      <LinearGradient
        colors={[`${theme.primary}20`, 'transparent']}
        style={styles.headerGradient}
      >
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.headerBlur}>
          <Text style={[styles.beautifulTitle, { color: theme.text }]}>📜 Old Testament</Text>
          <Text style={[styles.beautifulSubtitle, { color: theme.textSecondary }]}>
            Ancient wisdom and foundational stories of faith
          </Text>
        </BlurView>
      </LinearGradient>

      <View style={styles.booksContainer}>
        {books.filter(book => book.testament === 'old').map((book, index) => (
        <TouchableOpacity
          key={book.id}
            style={styles.modernBookCard}
            onPress={() => {
              hapticFeedback.buttonPress();
              loadChapters(book);
            }}
          >
            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.bookBlurCard}>
              <LinearGradient
                colors={[
                  `${theme.primary}${Math.round(15 + (index % 3) * 5).toString(16)}`,
                  `${theme.primaryLight}${Math.round(8 + (index % 3) * 3).toString(16)}`
                ]}
                style={styles.bookGradient}
              >
                <View style={styles.bookIconContainer}>
                  <Text style={styles.bookEmoji}>
                    {index < 5 ? '📖' : index < 17 ? '👑' : index < 22 ? '✍️' : index < 27 ? '🔮' : '📜'}
                  </Text>
                </View>
                <View style={styles.bookInfo}>
                  <Text style={[styles.modernBookName, { color: theme.text }]}>{book.name}</Text>
                  <Text style={[styles.modernChapterCount, { color: theme.textSecondary }]}>
                    {book.chapters} chapters
                  </Text>
                  <View style={styles.bookCategory}>
                    <Text style={[styles.categoryText, { color: theme.primary }]}>
                      {index < 5 ? 'Torah' : index < 17 ? 'History' : index < 22 ? 'Wisdom' : index < 27 ? 'Major Prophets' : 'Minor Prophets'}
                    </Text>
                  </View>
                </View>
                <View style={styles.bookChevron}>
                  <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
                </View>
              </LinearGradient>
            </BlurView>
        </TouchableOpacity>
      ))}
      </View>
    </ScrollView>
  );

  const renderNewTestament = () => (
    <ScrollView 
      style={[styles.content, { backgroundColor: 'transparent' }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Beautiful Header */}
      <LinearGradient
        colors={[`${theme.primary}20`, 'transparent']}
        style={styles.headerGradient}
      >
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.headerBlur}>
          <Text style={[styles.beautifulTitle, { color: theme.text }]}>✝️ New Testament</Text>
          <Text style={[styles.beautifulSubtitle, { color: theme.textSecondary }]}>
            The Gospel message and early Christian teachings
          </Text>
        </BlurView>
      </LinearGradient>

      <View style={styles.booksContainer}>
        {books.filter(book => book.testament === 'new').map((book, index) => (
        <TouchableOpacity
          key={book.id}
            style={styles.modernBookCard}
            onPress={() => {
              hapticFeedback.buttonPress();
              loadChapters(book);
            }}
          >
            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.bookBlurCard}>
              <LinearGradient
                colors={[
                  `${theme.primary}${Math.round(15 + (index % 3) * 5).toString(16)}`,
                  `${theme.primaryLight}${Math.round(8 + (index % 3) * 3).toString(16)}`
                ]}
                style={styles.bookGradient}
              >
                <View style={styles.bookIconContainer}>
                  <Text style={styles.bookEmoji}>
                    {index < 4 ? '✝️' : index < 5 ? '⚡' : index < 18 ? '✉️' : '🔮'}
                  </Text>
                </View>
                <View style={styles.bookInfo}>
                  <Text style={[styles.modernBookName, { color: theme.text }]}>{book.name}</Text>
                  <Text style={[styles.modernChapterCount, { color: theme.textSecondary }]}>
                    {book.chapters} chapters
                  </Text>
                  <View style={styles.bookCategory}>
                    <Text style={[styles.categoryText, { color: theme.primary }]}>
                      {index < 4 ? 'Gospels' : index < 5 ? 'History' : index < 18 ? 'Epistles' : 'Prophecy'}
                    </Text>
                  </View>
                </View>
                <View style={styles.bookChevron}>
                  <MaterialIcons name="chevron-right" size={24} color={theme.primary} />
                </View>
              </LinearGradient>
            </BlurView>
        </TouchableOpacity>
      ))}
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <CirclePulseMultiple size={80} />
          <Text style={[styles.loadingText, { color: theme.text, marginTop: 20 }]}>Loading Bible...</Text>
        </View>
      );
    }

    switch (view) {
      case 'books':
        return renderBooks();
      case 'old-testament':
        return renderOldTestament();
      case 'new-testament':
        return renderNewTestament();
      case 'chapters':
        return renderChapters();
      case 'verses':
        return renderVerses();
      case 'search':
        return renderSearchResults();
      default:
        return renderBooks();
    }
  };

  return (
    <>
      <Modal 
        visible={visible} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {renderHeader()}
          <View style={styles.mainContent}>
            {renderContent()}
          </View>
        
        {/* Smart Assistant Button - Fixed at bottom */}
        {view === 'books' && (
          <View style={[styles.aiButtonContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.aiAssistantButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              activeOpacity={0.7}
              onPress={() => {
                console.log('🤖 AI button tapped!');
                try {
                  hapticFeedback.medium();
                  
                  if (onNavigateToAI) {
                    onNavigateToAI(null); // null means general chat
                  }
                  
                  onClose(); // Close Bible reader after navigation
                  console.log('🤖 Navigating to AI chat');
                } catch (error) {
                  console.error('Error opening AI chat:', error);
                }
              }}
            >
              <View style={styles.aiButtonContent}>
                <MaterialIcons name="smart-toy" size={20} color={theme.primary} />
                <Text style={[styles.aiButtonText, { color: theme.text }]}>
                  Ask me anything...
                </Text>
                <MaterialIcons name="arrow-forward" size={16} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </Modal>

      {/* Bible Version Picker Modal */}
      <Modal visible={showVersionPicker} animationType="slide" transparent={true}>
        <View style={styles.versionPickerOverlay}>
          <View style={[styles.versionPickerContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.versionPickerHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setShowVersionPicker(false)}>
                <Text style={[styles.versionPickerCancel, { color: theme.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.versionPickerTitle, { color: theme.text }]}>Bible Version</Text>
              <View style={{ width: 50 }} />
            </View>
            
            <ScrollView style={styles.versionPickerContent}>
              {bibleVersions.map((version) => {
                const isSelected = selectedBibleVersion === version.id;
                
                return (
                  <TouchableOpacity
                    key={version.id}
                    style={[
                      styles.versionItem, 
                      { backgroundColor: theme.card },
                      isSelected && { borderColor: theme.primary, borderWidth: 2 },
                      !version.isAvailable && { opacity: 0.5 }
                    ]}
                    onPress={() => version.isAvailable && handleVersionChange(version.id)}
                    disabled={!version.isAvailable}
                  >
                    <View style={styles.versionInfo}>
                      <Text style={[styles.versionName, { color: theme.text }]}>
                        {version.name} ({version.abbreviation})
                      </Text>
                      <Text style={[styles.versionDescription, { color: theme.textSecondary }]}>
                        {version.description}
                      </Text>
                    </View>
                    {isSelected && version.isAvailable && (
                      <MaterialIcons name="check-circle" size={24} color={theme.primary} />
                    )}
                    {!version.isAvailable && (
                      <MaterialIcons name="lock" size={20} color={theme.textTertiary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Verse Journaling Modal */}
      <Modal
        visible={showJournalingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowJournalingModal(false);
          setSelectedVerseForJournal(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.pickerModal}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Journal Entry</Text>
            <Text style={[{ color: theme.text, marginBottom: 20 }]}>
              {selectedVerseForJournal?.reference || 'Loading...'}
            </Text>
            <Text style={[{ color: theme.textSecondary, marginBottom: 20 }]}>
              "{selectedVerseForJournal?.text || 'Loading verse...'}"
            </Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Write your thoughts here..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowJournalingModal(false);
                  setSelectedVerseForJournal(null);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.surface }]}
                onPress={() => {
                  setShowJournalingModal(false);
                  setSelectedVerseForJournal(null);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Highlight Color Picker Modal */}
      {console.log('🎨 Rendering highlight modal, visible:', showHighlightPicker)}
      <Modal
        visible={showHighlightPicker}
        transparent={false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          console.log('🎨 Highlight modal onRequestClose called');
          setShowHighlightPicker(false);
          setSelectedVerseForAction(null);
        }}
      >
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowHighlightPicker(false);
                setSelectedVerseForAction(null);
              }}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.pickerModal, { backgroundColor: theme.background }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Choose Highlight Color</Text>
            <View style={styles.colorGrid}>
              {[
                { name: 'None', color: null, emoji: '🚫' },
                { name: 'Yellow', color: '#FFD700', emoji: '💛' },
                { name: 'Pink', color: '#FF1493', emoji: '💖' },
                { name: 'Green', color: '#32CD32', emoji: '💚' },
                { name: 'Blue', color: '#1E90FF', emoji: '💙' },
                { name: 'Purple', color: '#9932CC', emoji: '💜' },
                { name: 'Orange', color: '#FF4500', emoji: '🧡' },
                { name: 'Red', color: '#DC143C', emoji: '❤️' },
                { name: 'Teal', color: '#20B2AA', emoji: '💎' },
                { name: 'Lime', color: '#32CD32', emoji: '🍃' },
                { name: 'Coral', color: '#FF7F50', emoji: '🪸' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.colorOption, { backgroundColor: item.color }]}
                  onPress={() => selectedVerseForAction && handleHighlightVerse(selectedVerseForAction, item.color)}
                >
                  <Text style={styles.colorEmoji}>{item.emoji}</Text>
                  <Text style={styles.colorName}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                setShowHighlightPicker(false);
                setSelectedVerseForAction(null);
              }}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bookmark Category Picker Modal */}
      <Modal
        visible={showBookmarkPicker}
        transparent={false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowBookmarkPicker(false);
          setSelectedVerseForAction(null);
        }}
      >
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowBookmarkPicker(false);
                setSelectedVerseForAction(null);
              }}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.pickerModal, { backgroundColor: theme.background }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Choose Bookmark Category</Text>
            <View style={styles.bookmarkGrid}>
              {[
                { name: 'Study', emoji: '📖', category: 'study' },
                { name: 'Favorites', emoji: '💝', category: 'favorites' },
                { name: 'Prayer', emoji: '🙏', category: 'prayer' },
                { name: 'Inspiration', emoji: '✨', category: 'inspiration' },
                { name: 'Comfort', emoji: '🤗', category: 'comfort' },
                { name: 'Guidance', emoji: '🧭', category: 'guidance' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.category}
                  style={[styles.bookmarkOption, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => selectedVerseForAction && handleBookmarkVerse(selectedVerseForAction, item.category)}
                >
                  <Text style={styles.bookmarkEmoji}>{item.emoji}</Text>
                  <Text style={[styles.bookmarkName, { color: theme.text }]}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                setShowBookmarkPicker(false);
                setSelectedVerseForAction(null);
              }}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Journal Modal */}
      <VerseJournalingModal
        visible={showJournalingModal}
        onClose={() => {
          setShowJournalingModal(false);
          setSelectedVerseForJournal(null);
        }}
        verse={selectedVerseForJournal}
        verseReference={selectedVerseForJournal ? `${currentBook?.name || 'Book'} ${currentChapter?.number || ''}:${selectedVerseForJournal.number || selectedVerseForJournal.verse || ''}` : ''}
        onSave={handleSaveNote}
      />

    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 70 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  searchButton: {
    padding: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  searchSubmit: {
    padding: 8,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#667eea',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  testamentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  chapterCount: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  chapterItem: {
    width: '15%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    margin: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  verseContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  versionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  simpleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  simpleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  verseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  discussButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discussButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  versionPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  versionPickerContainer: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  versionPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  versionPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  versionPickerCancel: {
    fontSize: 16,
  },
  versionPickerContent: {
    padding: 16,
  },
  versionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  versionInfo: {
    flex: 1,
  },
  versionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  versionDescription: {
    fontSize: 14,
  },
  chapterNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  currentChapterInfo: {
    flex: 1,
    alignItems: 'center',
  },
  bottomChapterNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 12,
    gap: 12,
  },
  bottomNavButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  bottomNavText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    minWidth: 30,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleButtonText: {
    fontSize: 12,
    color: '#667eea',
    marginLeft: 4,
    fontWeight: '500',
  },
  simplifiedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  simplifiedIndicatorText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 2,
    fontWeight: '500',
  },
  translateButton: {
    padding: 4,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  simplifiedContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  simplifiedLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  simplifiedText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
    fontStyle: 'italic',
  },
  searchResultItem: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  searchReference: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8,
  },
  searchText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  testamentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  testamentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  testamentEmoji: {
    fontSize: 24,
  },
  testamentInfo: {
    flex: 1,
  },
  testamentCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  testamentCardSubtitle: {
    fontSize: 14,
  },
  aiButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34, // Add gap from bottom
    borderTopWidth: 1,
  },
  aiAssistantButton: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  aiButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, // Make thinner
    paddingHorizontal: 16,
  },
  aiButtonText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  
  // Modern Beautiful Styles
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
  },
  headerBlur: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  beautifulTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  beautifulSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  
  // Testament Cards
  testamentsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  modernTestamentCard: {
    marginBottom: 16,
  },
  testamentBlurCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  testamentGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  modernTestamentIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernTestamentEmoji: {
    fontSize: 28,
  },
  modernTestamentInfo: {
    flex: 1,
  },
  modernTestamentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modernTestamentSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  testamentStats: {
    flexDirection: 'row',
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modernChevron: {
    marginLeft: 12,
  },
  
  // Quick Access
  quickAccessSection: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  quickAccessTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAccessItem: {
    alignItems: 'center',
    padding: 12,
  },
  quickAccessEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickAccessText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Books Container
  booksContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modernBookCard: {
    marginBottom: 12,
  },
  bookBlurCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bookGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bookIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bookEmoji: {
    fontSize: 24,
  },
  bookInfo: {
    flex: 1,
  },
  modernBookName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modernChapterCount: {
    fontSize: 14,
    marginBottom: 8,
  },
  bookCategory: {
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  bookChevron: {
    marginLeft: 12,
  },
  
  // Chapters
  chaptersContainer: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  modernChaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modernChapterItem: {
    width: '18%',
    aspectRatio: 1,
    marginBottom: 12,
  },
  chapterBlurCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chapterGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modernChapterNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chapterIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  
  // Verses
  versesHeaderGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
  },
  versesHeaderBlur: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  chapterTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  chapterSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  modernChapterNav: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    gap: 12,
  },
  modernNavButton: {
    flex: 1,
  },
  navButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  modernNavText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Verse Cards
  versesContainer: {
    paddingHorizontal: 20,
  },
  modernVerseCard: {
    marginBottom: 16,
  },
  verseBlurCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  verseGradient: {
    padding: 20,
  },
  modernVerseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  verseNumberContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60, // Ensure minimum width
    paddingVertical: 4,
  },
  modernVerseNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false, // Remove extra padding on Android
    flexShrink: 0, // Prevent text from shrinking
  },
  verseLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    includeFontPadding: false,
    marginBottom: -2,
  },
  verseNumberLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    flexShrink: 0,
    marginTop: -2,
  },
  modernVerseActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
  },
  modernActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // Allow touches to pass through
  },
  verseContentContainer: {
    marginTop: 8,
  },
  modernVerseText: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 12,
  },
  originalToggle: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  originalToggleText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  originalTextContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  originalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  originalText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  
  // Bottom Navigation
  modernBottomNav: {
    flexDirection: 'row',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    gap: 12,
  },
  modernBottomButton: {
    flex: 1,
  },
  bottomButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  bottomButtonText: {
    flex: 1,
  },
  bottomButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bottomButtonSubtitle: {
    fontSize: 12,
  },

  // Modal styles for interactive features
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  colorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  bookmarkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  bookmarkOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookmarkEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  bookmarkName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  noteInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Journal Indicator Styles
  journalIndicatorContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  journalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  journalIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Simple Button Styles
  simpleButtonContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  simpleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  simpleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Full screen modal styles
  fullScreenModal: {
    flex: 1,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});

export default BibleReader;
