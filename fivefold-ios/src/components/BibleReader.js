import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  StatusBar,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  DeviceEventEmitter,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import ViewShot from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import completeBibleService from '../services/completeBibleService';
import githubBibleService from '../services/githubBibleService';
import { hapticFeedback } from '../utils/haptics';

import { CircleStrokeSpin, CirclePulseMultiple } from './ProgressHUDAnimations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bibleVersions, getVersionById } from '../data/bibleVersions';
import VerseDataManager from '../utils/verseDataManager';
import VerseJournalingModal from './VerseJournalingModal';
import bibleReferenceParser from '../utils/bibleReferenceParser';
import productionAiService from '../services/productionAiService';
import { GITHUB_CONFIG } from '../../github.config';
// Removed InteractiveSwipeBack import

const BibleReader = ({ visible, onClose, onNavigateToAI, initialVerseReference }) => {
  
  const { theme, isDark, isCresviaTheme, currentTheme } = useTheme();
  
  // All themes now get beautiful theme-colored cards for better visual appeal
  const useThemeColors = true; // Always use theme colors for vibrant, appealing cards
  const { language, t } = useLanguage();
  const versesScrollViewRef = useRef(null);
  const verseRefs = useRef({}); // Store refs to individual verses
  const [books, setBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [targetVerseNumber, setTargetVerseNumber] = useState(null); // Track which verse to scroll to
  const [simplifiedSearchResults, setSimplifiedSearchResults] = useState(new Map()); // Track simplified search results
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('books'); // 'books', 'chapters', 'verses', 'search'
  const [translatingVerse, setTranslatingVerse] = useState(null);
  const [showOriginal, setShowOriginal] = useState(new Set()); // Track which verses show original

  const [selectedBibleVersion, setSelectedBibleVersion] = useState('kjv');
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [savedVerses, setSavedVerses] = useState(new Set());
  
  // Interactive features state
  const [showJournalingModal, setShowJournalingModal] = useState(false);
  const [selectedVerseForJournal, setSelectedVerseForJournal] = useState(null);
  const [verseNotes, setVerseNotes] = useState({});
  const [highlightedVerse, setHighlightedVerse] = useState(null);
  const [noteText, setNoteText] = useState('');
  
  // Note modal animation
  const noteModalSlideAnim = useRef(new Animated.Value(600)).current;
  const noteModalFadeAnim = useRef(new Animated.Value(0)).current;

  // Testament dropdown state
  const [expandedTestament, setExpandedTestament] = useState(null); // 'old', 'new', or null
  
  // Book selector modal state
  const [showBookSelector, setShowBookSelector] = useState(false);
  const bookSelectorPanY = useRef(new Animated.Value(800)).current;
  const bookSelectorFadeAnim = useRef(new Animated.Value(0)).current;
  const [expandedBook, setExpandedBook] = useState(null); // Track which book is expanded
  const [bookChapters, setBookChapters] = useState({}); // Store chapters for each book
  
  // Version picker modal state with interactive dismissal
  const versionPickerPanY = useRef(new Animated.Value(800)).current;
  const versionPickerFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Search modal state with interactive dismissal
  const [showSearchModal, setShowSearchModal] = useState(false);
  const searchModalPanY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const searchModalFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Verse action menu state (long-press menu)
  const [showVerseMenu, setShowVerseMenu] = useState(false);
  const [selectedVerseForMenu, setSelectedVerseForMenu] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [highlightedVerses, setHighlightedVerses] = useState({}); // { verseId: color }
  const verseMenuSlideAnim = useRef(new Animated.Value(0)).current;
  const verseMenuFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Share card state
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardFadeAnim = useRef(new Animated.Value(0)).current;
  const shareCardRef = useRef(null);
  const [shareCardAnimating, setShareCardAnimating] = useState(false);
  
  // PanResponder for swipe-to-dismiss (book selector)
  const bookSelectorPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          bookSelectorPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          // Close modal
          Animated.parallel([
            Animated.timing(bookSelectorPanY, {
              toValue: 800,
              duration: 250,
              useNativeDriver: true
            }),
            Animated.timing(bookSelectorFadeAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true
            })
          ]).start(() => {
            setShowBookSelector(false);
          });
          } else {
          // Snap back
          Animated.spring(bookSelectorPanY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11
          }).start();
        }
      }
    })
  ).current;
  
  // PanResponder for swipe-to-dismiss (version picker)
  const versionPickerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          versionPickerPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          // Close modal
          Animated.parallel([
            Animated.timing(versionPickerPanY, {
              toValue: 800,
              duration: 250,
              useNativeDriver: true
            }),
            Animated.timing(versionPickerFadeAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true
            })
          ]).start(() => {
            setShowVersionPicker(false);
          });
        } else {
          // Snap back
          Animated.spring(versionPickerPanY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11
          }).start();
        }
      }
    })
  ).current;
  
  // PanResponder for swipe-to-dismiss (search modal)
  const searchModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          searchModalPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const screenHeight = Dimensions.get('window').height;
        const modalHeight = screenHeight * 0.94;
        
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          // Close modal
          Animated.parallel([
            Animated.timing(searchModalPanY, {
              toValue: modalHeight,
              duration: 250,
              useNativeDriver: true
            }),
            Animated.timing(searchModalFadeAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true
            })
          ]).start(() => {
            setShowSearchModal(false);
            setSearchQuery('');
            setSearchResults([]);
          });
        } else {
          // Snap back
          Animated.spring(searchModalPanY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11
          }).start();
        }
      }
    })
  ).current;
  
  // Animate search modal
  useEffect(() => {
    const screenHeight = Dimensions.get('window').height;
    if (showSearchModal) {
      Animated.parallel([
        Animated.spring(searchModalPanY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }),
        Animated.timing(searchModalFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();
          } else {
      searchModalPanY.setValue(screenHeight * 0.94); // Set to modal height
      searchModalFadeAnim.setValue(0);
    }
  }, [showSearchModal]);
  
  // Debug showBookSelector changes
  useEffect(() => {
    console.log('🔵 showBookSelector changed to:', showBookSelector);
    if (showBookSelector) {
      // Animate in
      Animated.parallel([
        Animated.spring(bookSelectorPanY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }),
        Animated.timing(bookSelectorFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();
        } else {
      // Animate out
      Animated.parallel([
        Animated.timing(bookSelectorPanY, {
          toValue: 800,
          duration: 250,
          useNativeDriver: true
        }),
        Animated.timing(bookSelectorFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();
      
      // Reset expanded state when modal closes
      setExpandedBook(null);
    }
  }, [showBookSelector]);
  
  // Animate version picker modal
  useEffect(() => {
    if (showVersionPicker) {
      // Animate in
      Animated.parallel([
        Animated.spring(versionPickerPanY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }),
        Animated.timing(versionPickerFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();
    } else {
      // Reset animation values when closed
      versionPickerPanY.setValue(800);
      versionPickerFadeAnim.setValue(0);
    }
  }, [showVersionPicker]);

  // Debug state changes
  // Animate note modal
  useEffect(() => {
    if (showJournalingModal) {
      // Load existing note if any
      const verseId = selectedVerseForJournal?.id;
      if (verseId && verseNotes[verseId]) {
        setNoteText(verseNotes[verseId].content || '');
      } else {
        setNoteText('');
      }
      
      // Animate in
      noteModalSlideAnim.setValue(600);
      noteModalFadeAnim.setValue(0);
      Animated.parallel([
        Animated.spring(noteModalSlideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }),
        Animated.timing(noteModalFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(noteModalSlideAnim, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true
        }),
        Animated.timing(noteModalFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [showJournalingModal]);

  // Load saved verses on mount
  useEffect(() => {
    loadSavedVerses();
    loadInteractiveData();
  }, []);

  // Listen for highlights changes from other parts of the app
  useEffect(() => {
    const highlightsListener = DeviceEventEmitter.addListener('highlightsChanged', () => {
      console.log('🔄 Highlights changed, reloading...');
      loadHighlightedVerses();
    });

    return () => {
      highlightsListener.remove();
    };
  }, []);

  // Reload interactive data when verses change
  useEffect(() => {
    if (verses && verses.length > 0) {
      loadInteractiveData();
    }
  }, [verses]);

  // Handle initial verse reference navigation or search
  useEffect(() => {
    if (visible && initialVerseReference && books.length > 0) {
      console.log('📖 Processing initial verse reference:', initialVerseReference);
      
      // Check if it's a search query object
      if (typeof initialVerseReference === 'object' && initialVerseReference.searchQuery) {
        console.log('📖 Performing search for:', initialVerseReference.searchQuery);
        setSearchQuery(initialVerseReference.searchQuery);
        searchBibleWithQuery(initialVerseReference.searchQuery);
      } else {
        // Regular verse navigation
        console.log('📖 Navigating to verse:', initialVerseReference);
      navigateToVerse(initialVerseReference);
      }
    }
  }, [visible, initialVerseReference, books]);

  // Load interactive data (notes, highlights, bookmarks)
  const loadInteractiveData = async () => {
    try {
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
      loadHighlightedVerses();
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

  const loadHighlightedVerses = async () => {
    try {
      // Load highlights from VerseDataManager
      const allVerseData = await VerseDataManager.getAllVerseData();
      const highlights = {};
      
      Object.entries(allVerseData).forEach(([verseId, data]) => {
        if (data.highlights && data.highlights.length > 0) {
          // Get the most recent highlight color
          const latestHighlight = data.highlights[data.highlights.length - 1];
          highlights[verseId] = latestHighlight.color;
        }
      });
      
      setHighlightedVerses(highlights);
      console.log('📚 Loaded', Object.keys(highlights).length, 'highlights from VerseDataManager');
    } catch (error) {
      console.log('Error loading highlighted verses:', error);
    }
  };

  // Handle long-press on verse
  const handleVerseLongPress = (verse) => {
    hapticFeedback.medium();
    setSelectedVerseForMenu(verse);
    setShowVerseMenu(true);
    
    // Animate verse menu in
    Animated.parallel([
      Animated.spring(verseMenuSlideAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(verseMenuFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Close verse menu
  const closeVerseMenu = () => {
    Animated.parallel([
      Animated.timing(verseMenuSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(verseMenuFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowVerseMenu(false);
      setSelectedVerseForMenu(null);
      setShowColorPicker(false);
    });
  };

  // Highlight verse with color
  const highlightVerse = async (color) => {
    if (!selectedVerseForMenu) return;
    
    const verseId = selectedVerseForMenu.id || `${currentBook?.id}_${currentChapter?.number}_${selectedVerseForMenu.number}`;
    const verseReference = `${currentBook?.name} ${currentChapter?.number}:${selectedVerseForMenu.number || selectedVerseForMenu.verse}`;
    
    // Use VerseDataManager to store highlight
    await VerseDataManager.addHighlight(verseId, color, verseReference);
    
    // Update local state
    const newHighlights = { ...highlightedVerses, [verseId]: color };
    setHighlightedVerses(newHighlights);
    
    // Emit event to notify other parts of the app
    DeviceEventEmitter.emit('highlightsChanged');
    
    hapticFeedback.success();
    closeVerseMenu();
  };

  // Remove highlight from verse
  const removeHighlight = async () => {
    if (!selectedVerseForMenu) return;
    
    const verseId = selectedVerseForMenu.id || `${currentBook?.id}_${currentChapter?.number}_${selectedVerseForMenu.number}`;
    
    // Use VerseDataManager to remove highlight
    await VerseDataManager.removeHighlight(verseId);
    
    // Update local state
    const newHighlights = { ...highlightedVerses };
    delete newHighlights[verseId];
    setHighlightedVerses(newHighlights);
    
    // Emit event to notify other parts of the app
    DeviceEventEmitter.emit('highlightsChanged');
    
    hapticFeedback.success();
    closeVerseMenu();
  };

  // Discuss verse with AI
  const discussVerse = () => {
    if (!selectedVerseForMenu) return;
    
    const verseReference = `${currentBook?.name} ${currentChapter?.number}:${selectedVerseForMenu.number || selectedVerseForMenu.verse}`;
    const verseText = (selectedVerseForMenu.content || selectedVerseForMenu.text || '').replace(/\s+/g, ' ').trim();
    
    closeVerseMenu();
    
    // Pass as object with text and reference (expected by AiBibleChat)
    onNavigateToAI?.({
      text: verseText,
      content: verseText,
      reference: verseReference
    });
  };

  // Add/Edit note for verse
  const addNoteToVerse = async () => {
    if (!selectedVerseForMenu) return;
    
    const verseId = selectedVerseForMenu.id || `${currentBook?.id}_${currentChapter?.number}_${selectedVerseForMenu.number}`;
    const journalData = {
      ...selectedVerseForMenu,
      id: verseId,
      reference: `${currentBook?.name} ${currentChapter?.number}:${selectedVerseForMenu.number || selectedVerseForMenu.verse}`,
      text: selectedVerseForMenu.content || selectedVerseForMenu.text || ''
    };
    
    // Close verse menu and open note modal
    closeVerseMenu();
    setSelectedVerseForJournal(journalData);
    setShowJournalingModal(true);
  };

  // Save verse to saved verses
  // Share verse function
  const shareVerse = () => {
    if (!selectedVerseForMenu) return;
    
    hapticFeedback.medium();
    
    // Close verse menu first
    Animated.parallel([
      Animated.timing(verseMenuSlideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(verseMenuFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowVerseMenu(false);
      setShowColorPicker(false);
      // Don't clear selectedVerseForMenu yet - we need it for the share card
      
      // Show share card after verse menu is closed
      setShowShareCard(true);
      setShareCardAnimating(true);
      Animated.timing(shareCardFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShareCardAnimating(false);
      });
    });
  };

  // Close share card
  const closeShareCard = () => {
    if (shareCardAnimating) {
      return;
    }
    
    setShareCardAnimating(true);
    Animated.timing(shareCardFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowShareCard(false);
      setSelectedVerseForMenu(null); // Clear the selected verse
      setShareCardAnimating(false);
    });
  };

  // Save verse card to photos
  const saveVerseCard = async () => {
    try {
      hapticFeedback.medium();
      
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save images to your photo library.');
        return;
      }

      // Capture the view as an image
      if (shareCardRef.current) {
        const uri = await shareCardRef.current.capture();
        
        // Save to camera roll
        await MediaLibrary.saveToLibraryAsync(uri);
        
        hapticFeedback.success();
        Alert.alert('Saved', 'Verse card saved to your photos');
      }
    } catch (error) {
      console.error('Error saving verse card:', error);
      Alert.alert('Error', 'Failed to save verse card');
    }
  };

  const saveVerseToProfile = async () => {
    if (!selectedVerseForMenu) return;
    
    const verseId = selectedVerseForMenu.id || `${currentBook?.id}_${currentChapter?.number}_${selectedVerseForMenu.number}`;
    const verseReference = `${currentBook?.name} ${currentChapter?.number}:${selectedVerseForMenu.number || selectedVerseForMenu.verse}`;
    const verseText = (selectedVerseForMenu.content || selectedVerseForMenu.text || '').replace(/\s+/g, ' ').trim();
    
    try {
      // Save to the same AsyncStorage key that ProfileTab uses
      const savedVersesData = await AsyncStorage.getItem('savedBibleVerses');
      const currentSavedVerses = savedVersesData ? JSON.parse(savedVersesData) : [];
      
      // Check if already saved
      const alreadySaved = currentSavedVerses.some(v => v.id === verseId);
      if (alreadySaved) {
        console.log('Verse already saved');
        hapticFeedback.light();
        Alert.alert('Already Saved', 'This verse is already in your saved verses');
        closeVerseMenu();
        return;
      }
      
      // Add new verse
      const newVerse = {
        id: verseId,
        reference: verseReference,
        text: verseText,
        book: currentBook?.name,
        chapter: currentChapter?.number,
        verse: selectedVerseForMenu.number || selectedVerseForMenu.verse,
        version: selectedBibleVersion,
        timestamp: Date.now()
      };
      
      currentSavedVerses.push(newVerse);
      await AsyncStorage.setItem('savedBibleVerses', JSON.stringify(currentSavedVerses));
      
      // Update stats
      const stats = await AsyncStorage.getItem('userStats');
      const userStats = stats ? JSON.parse(stats) : {};
      userStats.savedVerses = currentSavedVerses.length;
      await AsyncStorage.setItem('userStats', JSON.stringify(userStats));
      
      const newSavedVerses = new Set([...savedVerses, verseId]);
      setSavedVerses(newSavedVerses);
      
      console.log(`✅ Saved verse to profile: ${verseReference}`);
      hapticFeedback.success();
      Alert.alert('Saved', 'Verse saved successfully');
      closeVerseMenu();
    } catch (error) {
      console.error('Error saving verse:', error);
      closeVerseMenu();
    }
  };

  const handleVersionChange = async (versionId) => {
    try {
      console.log('📖 Changing version to:', versionId);
      const oldVersion = selectedBibleVersion;
      setSelectedBibleVersion(versionId);
      await AsyncStorage.setItem('selectedBibleVersion', versionId);
      setShowVersionPicker(false);
      hapticFeedback.success();
      
      // If we're viewing verses, reload them with the new version
      if (view === 'verses' && currentChapter) {
        console.log('🔄 Reloading verses with new version:', versionId);
        
        // Reload verses with new version
        await loadVersesWithVersion(currentChapter, versionId);
      }
    } catch (error) {
      console.error('Failed to change Bible version:', error);
    }
  };

  // Helper function to determine which service to use
  const getBibleService = (versionId) => {
    // Always use githubBibleService for all versions
    // This avoids rate limiting from bible-api.com
    return githubBibleService;
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
      const service = getBibleService(selectedBibleVersion);
      const chaptersData = await service.getChapters(book.id);
      setChapters(chaptersData);
      setCurrentBook(book);
      setLoading(false);
      
      // Automatically load chapter 1 instead of showing chapter selection
      if (chaptersData && chaptersData.length > 0) {
        const firstChapter = chaptersData[0];
        // Use loadVerses to trigger simplification if needed
        await loadVerses(firstChapter);
      } else {
      setView('chapters');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load book.');
      setLoading(false);
    }
  };

  const loadVerses = async (chapter) => {
    setLoading(true);
    try {
      console.log('📖 Loading verses for chapter:', chapter.id, 'version:', selectedBibleVersion);
      
      // Use the appropriate service based on version
      const service = getBibleService(selectedBibleVersion);
      const versesData = await service.getVerses(chapter.id, selectedBibleVersion);
      setVerses(versesData);
      setCurrentChapter(chapter);
      setView('verses');
      setLoading(false);
    } catch (error) {
      Alert.alert('📜 Error', 'Failed to load verses.');
      setLoading(false);
    }
  };

  // New function to load verses with a specific version (used when changing versions)
  const loadVersesWithVersion = async (chapter, versionId) => {
    setLoading(true);
    try {
      console.log('📖 Loading verses with version:', versionId, 'chapter:', chapter.id);
      
      // Use the appropriate service based on version
      const service = getBibleService(versionId);
      const versesData = await service.getVerses(chapter.id, versionId);
      setVerses(versesData);
      setCurrentChapter(chapter);
      setLoading(false);
    } catch (error) {
      Alert.alert('📜 Error', 'Failed to load verses.');
      setLoading(false);
    }
  };

  // Scroll to target verse when verses load
  useEffect(() => {
    if (verses.length > 0 && targetVerseNumber && verseRefs.current[targetVerseNumber]) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        const targetVerseNum = parseInt(targetVerseNumber);
        verseRefs.current[targetVerseNum]?.measureLayout(
          versesScrollViewRef.current,
          (x, y) => {
            versesScrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 200), // Increased offset to account for header
              animated: true
            });
            // Highlight the verse briefly
            setHighlightedVerse(targetVerseNum);
            setTimeout(() => {
              setHighlightedVerse(null);
              // Clear target verse after highlight fades
              setTargetVerseNumber(null);
            }, 2000);
          },
          () => console.log('Failed to measure verse position')
        );
      }, 500);
    }
  }, [verses, targetVerseNumber]);

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
      
      // Fetch verses in user's selected version
      const service = getBibleService(selectedBibleVersion);
      const resultsWithVersion = await Promise.all(
        results.map(async (result) => {
          try {
            // Get the chapter to find the verse
            const chapters = await service.getChapters(result.bookId);
            const chapter = chapters.find(c => c.number === result.chapter.toString());
            if (chapter) {
              const verses = await service.getVerses(chapter.id, selectedBibleVersion);
              const verse = verses.find(v => parseInt(v.number || v.verse) === parseInt(result.verse));
              if (verse) {
                return {
                  ...result,
                  text: verse.content || verse.text || result.text,
                  content: verse.content || verse.text || result.content
                };
              }
            }
          } catch (err) {
            console.log('Could not fetch verse in selected version:', err);
          }
          return result; // Fallback to KJV if fetch fails
        })
      );
      
      setSearchResults(resultsWithVersion);
      // View is now handled by modal, no need to set view
    } catch (error) {
      Alert.alert('Search Error', 'Failed to search Bible. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Search with a specific query (used for AI chat verse references)
  const searchBibleWithQuery = async (query) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const results = await completeBibleService.searchVerses(query);
      
      // Fetch verses in user's selected version
      const service = getBibleService(selectedBibleVersion);
      const resultsWithVersion = await Promise.all(
        results.map(async (result) => {
          try {
            // Get the chapter to find the verse
            const chapters = await service.getChapters(result.bookId);
            const chapter = chapters.find(c => c.number === result.chapter.toString());
            if (chapter) {
              const verses = await service.getVerses(chapter.id, selectedBibleVersion);
              const verse = verses.find(v => parseInt(v.number || v.verse) === parseInt(result.verse));
              if (verse) {
                return {
                  ...result,
                  text: verse.content || verse.text || result.text,
                  content: verse.content || verse.text || result.content
                };
              }
            }
          } catch (err) {
            console.log('Could not fetch verse in selected version:', err);
          }
          return result; // Fallback to KJV if fetch fails
        })
      );
      
      setSearchResults(resultsWithVersion);
      // Open the search modal instead of changing view
      setShowSearchModal(true);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to search Bible. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to a specific verse from a Bible reference
  const navigateToVerse = async (verseReference) => {
    try {
      console.log('📖 Starting navigation to verse:', verseReference);
      
      // Parse the verse reference
      const parsedRef = bibleReferenceParser.parseReference(verseReference);
      if (!parsedRef) {
        console.error('❌ Failed to parse verse reference:', verseReference);
        Alert.alert('Invalid Reference', `Could not understand the Bible reference: "${verseReference}"`);
        return;
      }

      console.log('✅ Parsed reference:', parsedRef);
      
      // Find the book
      const targetBook = books.find(book => 
        book.name.toLowerCase() === parsedRef.book.toLowerCase()
      );
      
      if (!targetBook) {
        console.error('❌ Book not found:', parsedRef.book);
        Alert.alert('Book Not Found', `Could not find the book: "${parsedRef.book}"`);
        return;
      }

      console.log('✅ Found book:', targetBook);

      // Set the book and load chapters
      setCurrentBook(targetBook);
      setLoading(true);

      try {
        // Load chapters for the book
        const service = getBibleService(selectedBibleVersion);
        const chaptersData = await service.getChapters(targetBook.id);
        setChapters(chaptersData);

        // Find the target chapter
        const targetChapter = chaptersData.find(chapter => 
          parseInt(chapter.number) === parsedRef.chapter
        );

        if (!targetChapter) {
          console.error('❌ Chapter not found:', parsedRef.chapter);
          Alert.alert('Chapter Not Found', `Could not find chapter ${parsedRef.chapter} in ${parsedRef.book}`);
          setView('chapters');
          return;
        }

        console.log('✅ Found chapter:', targetChapter);

        // Load verses for the chapter
        const versesData = await service.getVerses(targetChapter.id, selectedBibleVersion);
        setVerses(versesData);
        setCurrentChapter(targetChapter);
        setView('verses');

        console.log('✅ Navigation completed successfully');
        
        // Show success message
        hapticFeedback.success();
        
        // Scroll to and highlight the specific verse
        if (parsedRef.verse) {
          setTimeout(() => {
            scrollToSpecificVerse(parsedRef.verse);
          }, 500); // Wait for verses to render
        }
        
      } catch (error) {
        console.error('❌ Error loading Bible data:', error);
        Alert.alert('Navigation Error', 'Failed to load the requested verse. Please try again.');
      } finally {
        setLoading(false);
      }

    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert('Navigation Error', 'An error occurred while navigating to the verse.');
    }
  };

  // Scroll to a specific verse number within the current chapter
  const scrollToSpecificVerse = (verseNumber) => {
    try {
      console.log('📍 Scrolling to verse:', verseNumber);
      
      // Find the verse element by its number
      // Since we can't directly access DOM elements in React Native,
      // we'll use a different approach - find the verse in our data and scroll to its position
      
      const targetVerseIndex = verses.findIndex(verse => 
        parseInt(verse.number || verse.verse) === parseInt(verseNumber)
      );
      
      if (targetVerseIndex !== -1) {
        console.log('✅ Found verse at index:', targetVerseIndex);
        
        // Calculate approximate scroll position
        // Each verse card is roughly 150-200px tall
        const estimatedVerseHeight = 180;
        const scrollPosition = targetVerseIndex * estimatedVerseHeight;
        
        // Scroll to the calculated position
        setTimeout(() => {
          console.log('📍 Scrolling to position:', scrollPosition);
          if (versesScrollViewRef.current) {
            versesScrollViewRef.current.scrollTo({
              y: scrollPosition,
              animated: true
            });
          }
        }, 100);
        
        // Also highlight the verse temporarily
        highlightVerse(verseNumber);
      } else {
        console.warn('⚠️ Verse not found in current chapter:', verseNumber);
      }
    } catch (error) {
      console.error('❌ Error scrolling to verse:', error);
    }
  };

  // Temporarily highlight a specific verse (for scroll target)
  const temporarilyHighlightVerse = (verseNumber) => {
    console.log('✨ Highlighting verse:', verseNumber);
    setHighlightedVerse(parseInt(verseNumber));
    hapticFeedback.light();
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
      setHighlightedVerse(null);
    }, 3000);
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
      // Go directly back to books (skip chapters and testament pages)
      setView('books');
      setExpandedTestament(null); // Close any expanded testaments
    } else if (view === 'chapters') {
        setView('books');
      setExpandedTestament(null);
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

  const handleSaveNote = async (verseId, noteContent, verseReference) => {
    try {
      await VerseDataManager.addNote(verseId, noteContent, verseReference);
      setVerseNotes(prev => ({
        ...prev,
        [verseId]: { content: noteContent, timestamp: new Date().toISOString() }
      }));
      console.log(`Note saved for verse ${verseId} (${verseReference})`);
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  // Determine if a color is bright or dark (for text color selection)
  const isColorBright = (hexColor) => {
    if (!hexColor) return false;
    
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance (perceived brightness)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // If luminance > 0.5, it's a bright color
    return luminance > 0.5;
  };

  // Save and close note modal
  const saveAndCloseNote = async () => {
    if (selectedVerseForJournal && noteText.trim()) {
      await handleSaveNote(
        selectedVerseForJournal.id, 
        noteText.trim(), 
        selectedVerseForJournal.reference
      );
      hapticFeedback.success();
    }
    setShowJournalingModal(false);
    setSelectedVerseForJournal(null);
    setNoteText('');
  };

  // Close note modal without saving
  const closeNoteModal = () => {
    setShowJournalingModal(false);
    setSelectedVerseForJournal(null);
    setNoteText('');
  };

  // Pan Responder for note modal swipe-to-dismiss
  const noteModalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5 && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          noteModalSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Save and close if swiped down significantly
          saveAndCloseNote();
        } else {
          // Snap back
          Animated.spring(noteModalSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11
          }).start();
        }
      }
    })
  ).current;

  // PanResponder for verse menu swipe-to-dismiss
  const verseMenuPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5 && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Update slide animation
          verseMenuSlideAnim.setValue(Math.max(0, 1 - (gestureState.dy / 400)));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Close if swiped down significantly
          closeVerseMenu();
        } else {
          // Snap back
          Animated.spring(verseMenuSlideAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 65,
            friction: 11
          }).start();
        }
      }
    })
  ).current;




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

  // Handle saving/unsaving verses
  const handleSaveVerse = async (verse) => {
    try {
      hapticFeedback.light();
      
    const bookName = currentBook?.name || 'Book';
    const chapterNum = currentChapter?.number || currentChapter?.id?.split('_').pop() || '';
    const verseNum = verse.number || verse.verse || '';
    const reference = `${bookName} ${chapterNum}:${verseNum}`;
    const verseText = verse.content || verse.text || '';
      const verseId = verse.id || `${currentBook?.id}_${currentChapter?.number}_${verse.number}`;
      
      // Get current saved verses
      const savedVersesData = await AsyncStorage.getItem('savedBibleVerses');
      let savedVersesList = savedVersesData ? JSON.parse(savedVersesData) : [];
      
      // Check if verse is already saved
      const existingIndex = savedVersesList.findIndex(v => v.id === verseId);
      
      if (existingIndex !== -1) {
        // Remove from saved verses
        savedVersesList.splice(existingIndex, 1);
        setSavedVerses(prev => {
          const newSet = new Set(prev);
          newSet.delete(verseId);
          return newSet;
        });
        console.log('📖 Verse removed from saved:', reference);
      hapticFeedback.success();
      } else {
        // Add to saved verses
        const newSavedVerse = {
          id: verseId,
          reference: reference,
          content: verseText,
          version: selectedBibleVersion.toUpperCase(),
          savedAt: new Date().toISOString(),
          bookName: bookName,
          chapter: chapterNum,
          verse: verseNum
        };
        
        savedVersesList.push(newSavedVerse);
        setSavedVerses(prev => new Set([...prev, verseId]));
        console.log('📖 Verse saved:', reference);
        hapticFeedback.success();
      }
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('savedBibleVerses', JSON.stringify(savedVersesList));
      
      // Update user stats
      const stats = await AsyncStorage.getItem('userStats');
      const userStats = stats ? JSON.parse(stats) : {};
      userStats.savedVerses = savedVersesList.length;
      await AsyncStorage.setItem('userStats', JSON.stringify(userStats));
      
    } catch (error) {
      console.error('Error saving/unsaving verse:', error);
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to save verse. Please try again.');
    }
  };

  const renderHeader = () => {
    const isVersesView = view === 'verses';
    
    return (
      isVersesView ? (
        // YouVersion-style header for verses view with blur effect - wraps entire header
        <BlurView 
          intensity={45} 
          tint={isDark ? 'dark' : 'light'}
          style={[styles.header, { backgroundColor: 'transparent' }]}
        >
          <View style={styles.youversionHeader}>
            <View style={styles.youversionTop}>
        <TouchableOpacity 
          onPress={() => {
                  hapticFeedback.light();
                  goBack();
          }} 
                style={styles.youversionBackButton}
        >
                <MaterialIcons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
              
              <View style={styles.youversionTitleSection}>
                <Text style={[styles.youversionTitle, { color: theme.text }]}>
                  {currentBook?.testament === 'old' ? 'Old Testament' : 'New Testament'}
                </Text>
                <View style={styles.badgesRow}>
          <TouchableOpacity 
                    style={[styles.badge, { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
                    }]}
            onPress={() => {
              hapticFeedback.light();
                      setShowBookSelector(true);
            }}
                    activeOpacity={0.7}
          >
                    <Text style={[styles.badgeText, { color: theme.text }]}>
                      {currentBook?.name} {currentChapter?.number}
            </Text>
          </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                    onPress={() => {
                      console.log('📖 Version badge tapped');
              hapticFeedback.light();
              setShowVersionPicker(true);
                      console.log('📖 showVersionPicker set to true');
            }}
                    activeOpacity={0.7}
          >
                    <Text style={[styles.badgeText, { color: theme.text }]}>
                      {getVersionById(selectedBibleVersion)?.abbreviation || 'KJV'}
            </Text>
          </TouchableOpacity>
        </View>
              </View>
              
              <View style={styles.youversionActions}>
        <TouchableOpacity 
          onPress={() => {
                    hapticFeedback.light();
                    setShowSearchModal(true);
                  }}
                  style={styles.youversionActionButton}
                >
                  <MaterialIcons name="search" size={28} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    hapticFeedback.light();
                    onClose();
                  }}
                  style={[styles.youversionActionButton, { paddingHorizontal: 8 }]}
                  activeOpacity={0.6}
                >
                  <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Navigation Arrows - Inside BlurView */}
            <View style={styles.blurredNavigation}>
              <TouchableOpacity 
                style={[styles.navButton, !(view === 'verses' && (currentChapter?.number > 1 || books.findIndex(b => b.id === currentBook?.id) > 0)) && styles.navButtonDisabled]}
                onPress={goToPreviousChapter}
                disabled={!(view === 'verses' && (currentChapter?.number > 1 || books.findIndex(b => b.id === currentBook?.id) > 0))}
                activeOpacity={0.6}
              >
                <MaterialIcons 
                  name="chevron-left" 
                  size={32} 
                  color={(view === 'verses' && (currentChapter?.number > 1 || books.findIndex(b => b.id === currentBook?.id) > 0)) ? theme.primary : theme.textSecondary} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.navButton, !(view === 'verses' && (currentChapter?.number < (currentBook?.chapters || 0) || books.findIndex(b => b.id === currentBook?.id) < books.length - 1)) && styles.navButtonDisabled]}
                onPress={goToNextChapter}
                disabled={!(view === 'verses' && (currentChapter?.number < (currentBook?.chapters || 0) || books.findIndex(b => b.id === currentBook?.id) < books.length - 1))}
                activeOpacity={0.6}
              >
                <MaterialIcons 
                  name="chevron-right" 
                  size={32} 
                  color={(view === 'verses' && (currentChapter?.number < (currentBook?.chapters || 0) || books.findIndex(b => b.id === currentBook?.id) < books.length - 1)) ? theme.primary : theme.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      ) : (
          // Original header for books view
          <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }} 
              style={[styles.closeButton, { backgroundColor: 'transparent' }]}
              activeOpacity={0.6}
            >
              <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>Holy Bible</Text>
            <TouchableOpacity 
              onPress={() => {
                hapticFeedback.light();
            setShowSearchModal(true);
          }} 
          style={styles.searchButton}
        >
          <MaterialIcons name="search" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      {view !== 'books' && view !== 'verses' && view !== 'search' && (
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
            <MaterialIcons name="search" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      )}
      </View>
    )
  );
  };

  const renderBooks = () => (
    <ScrollView 
      style={[styles.content, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingTop: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Clean Header with theme colors */}
      <View style={[styles.cleanHeader, { 
        backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
        borderColor: useThemeColors ? `${theme.primary}60` : theme.border 
      }]}>
          <Text style={[styles.beautifulTitle, { color: theme.text }]}>Books of the Bible</Text>
          <Text style={[styles.beautifulSubtitle, { color: theme.textSecondary }]}>
            Explore the sacred texts with modern clarity
          </Text>
      </View>
      
      {/* Clean Testament Cards with theme colors */}
      <View style={styles.testamentsContainer}>
        {/* Old Testament Card */}
        <View style={styles.testamentSection}>
      <TouchableOpacity
          style={styles.modernTestamentCard}
          onPress={() => {
            hapticFeedback.buttonPress();
              setExpandedTestament(expandedTestament === 'old' ? null : 'old');
          }}
        >
          <View style={[styles.cleanTestamentCard, { 
            backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
            borderColor: useThemeColors ? `${theme.primary}60` : theme.border
          }]}>
            <View style={[styles.modernTestamentIcon, { backgroundColor: `${theme.primary}20` }]}>
                <MaterialIcons name="menu-book" size={28} color={theme.primary} />
        </View>
              <View style={styles.modernTestamentInfo}>
                <Text style={[styles.modernTestamentTitle, { color: theme.text }]}>Old Testament</Text>
                <Text style={[styles.modernTestamentSubtitle, { color: theme.textSecondary }]}>
                  {books.filter(book => book.testament === 'old').length} books • Ancient Wisdom
          </Text>
                <View style={styles.testamentStats}>
                <View style={[styles.statBadge, { backgroundColor: `${theme.primary}15` }]}>
                    <Text style={[styles.statText, { color: theme.primary }]}>Genesis to Malachi</Text>
        </View>
                </View>
              </View>
              <View style={styles.modernChevron}>
                <MaterialIcons 
                  name={expandedTestament === 'old' ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={28} 
                  color={theme.primary} 
                />
              </View>
          </View>
      </TouchableOpacity>

          {/* Old Testament Dropdown */}
          {expandedTestament === 'old' && (
            <View style={[styles.dropdownContainer, {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: useThemeColors ? `${theme.primary}30` : theme.border
            }]}>
              {books.filter(book => book.testament === 'old').map((book, index) => (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.dropdownBookItem, {
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
                  }]}
                  onPress={() => {
                    hapticFeedback.buttonPress();
                    loadChapters(book);
                    setExpandedTestament(null); // Close dropdown after selection
                  }}
                >
                  <View style={styles.dropdownBookIcon}>
                    <MaterialIcons name="book" size={22} color={theme.primary} />
                  </View>
                  <View style={styles.dropdownBookInfo}>
                    <Text style={[styles.dropdownBookName, { color: theme.text }]}>{book.name}</Text>
                    <Text style={[styles.dropdownBookDetails, { color: theme.textSecondary }]}>
                      {book.chapters} chapters • {index < 5 ? 'Torah' : index < 17 ? 'History' : index < 22 ? 'Wisdom' : index < 27 ? 'Major Prophets' : 'Minor Prophets'}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* New Testament Card */}
        <View style={styles.testamentSection}>
      <TouchableOpacity
          style={styles.modernTestamentCard}
          onPress={() => {
            hapticFeedback.buttonPress();
              setExpandedTestament(expandedTestament === 'new' ? null : 'new');
          }}
        >
          <View style={[styles.cleanTestamentCard, { 
            backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
            borderColor: useThemeColors ? `${theme.primary}60` : theme.border
          }]}>
            <View style={[styles.modernTestamentIcon, { backgroundColor: `${theme.primary}20` }]}>
                <MaterialIcons name="auto-stories" size={28} color={theme.primary} />
        </View>
              <View style={styles.modernTestamentInfo}>
                <Text style={[styles.modernTestamentTitle, { color: theme.text }]}>New Testament</Text>
                <Text style={[styles.modernTestamentSubtitle, { color: theme.textSecondary }]}>
                  {books.filter(book => book.testament === 'new').length} books • Gospel & Letters
          </Text>
                <View style={styles.testamentStats}>
                <View style={[styles.statBadge, { backgroundColor: `${theme.primary}15` }]}>
                    <Text style={[styles.statText, { color: theme.primary }]}>Matthew to Revelation</Text>
        </View>
                </View>
              </View>
              <View style={styles.modernChevron}>
                <MaterialIcons 
                  name={expandedTestament === 'new' ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={28} 
                  color={theme.primary} 
                />
              </View>
          </View>
      </TouchableOpacity>

          {/* New Testament Dropdown */}
          {expandedTestament === 'new' && (
            <View style={[styles.dropdownContainer, {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: useThemeColors ? `${theme.primary}30` : theme.border
            }]}>
              {books.filter(book => book.testament === 'new').map((book, index) => (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.dropdownBookItem, {
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
                  }]}
                  onPress={() => {
                    hapticFeedback.buttonPress();
                    loadChapters(book);
                    setExpandedTestament(null); // Close dropdown after selection
                  }}
                >
                  <View style={styles.dropdownBookIcon}>
                    <MaterialIcons name="book" size={22} color={theme.primary} />
                  </View>
                  <View style={styles.dropdownBookInfo}>
                    <Text style={[styles.dropdownBookName, { color: theme.text }]}>{book.name}</Text>
                    <Text style={[styles.dropdownBookDetails, { color: theme.textSecondary }]}>
                      {book.chapters} chapters • {index < 4 ? 'Gospels' : index < 5 ? 'History' : index < 14 ? 'Paul\'s Letters' : index < 22 ? 'General Letters' : 'Prophecy'}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderChapters = () => (
    <ScrollView 
      style={[styles.content, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Clean Header with theme colors */}
      <View style={[styles.cleanHeader, { 
        backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
        borderColor: useThemeColors ? `${theme.primary}60` : theme.border 
      }]}>
          <Text style={[styles.beautifulTitle, { color: theme.text }]}>{currentBook?.name}</Text>
          <Text style={[styles.beautifulSubtitle, { color: theme.textSecondary }]}>
            Choose a chapter to begin reading
          </Text>
      </View>
      
      <View style={[styles.cleanChaptersContainer, { 
        backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
        borderColor: useThemeColors ? `${theme.primary}60` : theme.border 
      }]}>
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
              <View style={[styles.cleanChapterCard, { 
                backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
                borderColor: useThemeColors ? `${theme.primary}60` : theme.border
              }]}>
                  <Text style={[styles.modernChapterNumber, { color: theme.text }]}>
                    {chapter.number}
                  </Text>
                  <View style={styles.chapterIndicator}>
                    <MaterialIcons name="play-arrow" size={16} color={theme.primary} />
                  </View>
              </View>
          </TouchableOpacity>
        ))}
      </View>
      </View>
    </ScrollView>
  );

  const renderVerses = () => {
    // Determine if navigation arrows should be enabled
    const currentChapterNum = parseInt(currentChapter?.number || 1);
    const currentBookIndex = books.findIndex(b => b.id === currentBook?.id);
    
    const canGoBack = currentChapterNum > 1 || currentBookIndex > 0;
    const canGoForward = currentChapterNum < (currentBook?.chapters || 0) || currentBookIndex < books.length - 1;
    
    return (
      <View style={{ flex: 1 }}>
        {/* Scrollable Verses */}
        <ScrollView 
          ref={versesScrollViewRef}
          style={[styles.content, { backgroundColor: theme.background, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.youversionContentContainer, { paddingTop: 170 }]}
          scrollEventThrottle={16}
          directionalLockEnabled={true}
        >
      
      <View style={styles.youversionVersesContainer}>
        {verses.map((verse, index) => {
        const isSimplified = verse.isSimplified && verse.simplifiedContent;
        const isHighlighted = highlightedVerse === parseInt(verse.number || verse.verse);
        
        const verseNumber = parseInt(verse.number || verse.verse || index + 1);
        const verseId = verse.id || `${currentBook?.id}_${currentChapter?.number}_${verse.number}`;
        const highlightColor = highlightedVerses[verseId];
        
        return (
                      <TouchableOpacity
            key={verse.id}
            activeOpacity={0.9}
                          onPress={() => {
              // Handle verse tap
            }}
            onLongPress={() => handleVerseLongPress(verse)}
            delayLongPress={500}
          >
            <View 
              style={[
                styles.youversionVerseRow,
                highlightColor && {
                  backgroundColor: highlightColor,
                  borderRadius: 8,
                  paddingLeft: 12,
                  paddingRight: 12,
                  marginLeft: -4,
                  marginRight: -4,
                },
                isHighlighted && {
                  backgroundColor: `${theme.primary}20`,
                  borderLeftWidth: 3,
                  borderLeftColor: theme.primary,
                  paddingLeft: 12
                }
              ]}
              ref={(el) => (verseRefs.current[verseNumber] = el)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
                <Text style={[
                  styles.youversionVerseNumber, 
                  { color: highlightColor ? (isColorBright(highlightColor) ? '#000' : '#fff') : theme.textSecondary }
                ]}>
                  {String(verse.displayNumber || verse.number || index + 1).replace(/^Verse\s*/i, '')}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.youversionVerseText, 
                    { color: highlightColor ? (isColorBright(highlightColor) ? '#000' : '#fff') : theme.text }
                  ]}>
                    {(verse.content || verse.text || '').replace(/\s+/g, ' ').trim()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {verseNotes[verseId] && (
                    <MaterialIcons 
                      name="description" 
                      size={16} 
                      color={highlightColor ? (isColorBright(highlightColor) ? '#000' : '#fff') : theme.primary} 
                      style={{ marginLeft: 8, marginTop: 2 }}
                    />
                  )}
                  {savedVerses.has(verseId) && (
                    <MaterialIcons 
                      name="favorite" 
                      size={16} 
                      color={highlightColor ? (isColorBright(highlightColor) ? '#000' : '#fff') : '#FF6B9D'} 
                      style={{ marginLeft: 6, marginTop: 2 }}
                    />
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
    </ScrollView>
      </View>
    );
  };

  const renderSearchResults = () => (
    <ScrollView style={[styles.content, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>🔍 Search Results for "{searchQuery}"</Text>
      
      {searchResults.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No verses found. Try a different search term.</Text>
      ) : (
        searchResults.map((result, index) => {
          const resultKey = `search_${index}`;
          const isSimplified = simplifiedSearchResults.has(resultKey);
          const isLoading = translatingVerse === resultKey;
          const displayText = isSimplified ? 
            simplifiedSearchResults.get(resultKey)?.simplifiedContent : 
            result.content;
          
          return (
          <View key={index} style={[styles.searchResultItem, { 
            backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
            borderColor: useThemeColors ? `${theme.primary}60` : theme.border,
            borderWidth: 1
          }]}>
            <Text style={[styles.searchReference, { color: theme.primary }]}>{result.reference}</Text>
            
            {/* Show simplified or original text */}
            <Text style={[styles.searchText, { color: theme.text, fontStyle: 'italic' }]}>
              {displayText}
            </Text>
            
            {/* Show loading indicator */}
            {isLoading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 8, gap: 8 }}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={{ fontSize: 14, fontStyle: 'italic', color: theme.textSecondary }}>
                  Loading...
                </Text>
          </View>
            )}
            
            {/* Show simplified label when simplified */}
            {isSimplified && !isLoading && (
              <View style={styles.simplifiedHeader}>
                <MaterialIcons name="child-care" size={16} color={theme.warning} />
                <Text style={[styles.simplifiedLabel, { color: theme.warning }]}>
                  Simplified
                </Text>
              </View>
            )}
            
            {/* Action Buttons */}
            <View style={styles.searchActionButtons}>
              {/* Discussion Button */}
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.buttonPress();
                  const verseData = {
                    text: result.content,
                    reference: result.reference
                  };
                  
                  if (onNavigateToAI) {
                    onNavigateToAI(verseData);
                  }
                  
                  onClose();
                }}
                style={[styles.searchActionButton, { 
                  backgroundColor: `${theme.primary}25`,
                  borderColor: `${theme.primary}50`,
                  borderWidth: 1
                }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="forum" size={16} color={theme.primary} />
                <Text style={[styles.searchActionText, { color: theme.primary }]}>Discuss</Text>
              </TouchableOpacity>
            </View>
          </View>
          );
        })
      )}
    </ScrollView>
  );

  const renderOldTestament = () => (
    <ScrollView 
      style={[styles.content, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Clean Header with theme colors */}
      <View style={[styles.cleanHeader, { 
        backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
        borderColor: useThemeColors ? `${theme.primary}60` : theme.border 
      }]}>
          <Text style={[styles.beautifulTitle, { color: theme.text }]}>Old Testament</Text>
          <Text style={[styles.beautifulSubtitle, { color: theme.textSecondary }]}>
            Ancient wisdom and foundational stories of faith
          </Text>
      </View>

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
            <View style={[styles.cleanBookCard, { 
              backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
              borderColor: useThemeColors ? `${theme.primary}60` : theme.border
            }]}>
                <View style={styles.bookIconContainer}>
                  <MaterialIcons name="book" size={24} color={theme.primary} />
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
            </View>
        </TouchableOpacity>
      ))}
      </View>
    </ScrollView>
  );

  const renderNewTestament = () => (
    <ScrollView 
      style={[styles.content, { backgroundColor: theme.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Clean Header with theme colors */}
      <View style={[styles.cleanHeader, { 
        backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
        borderColor: useThemeColors ? `${theme.primary}60` : theme.border 
      }]}>
          <Text style={[styles.beautifulTitle, { color: theme.text }]}>New Testament</Text>
          <Text style={[styles.beautifulSubtitle, { color: theme.textSecondary }]}>
            The Gospel message and early Christian teachings
          </Text>
      </View>

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
            <View style={[styles.cleanBookCard, { 
              backgroundColor: useThemeColors ? `${theme.primary}25` : theme.card,
              borderColor: useThemeColors ? `${theme.primary}60` : theme.border
            }]}>
                <View style={styles.bookIconContainer}>
                  <MaterialIcons name="book" size={24} color={theme.primary} />
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
            </View>
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
        presentationStyle="fullScreen"
        onRequestClose={() => {}} // Disable pull-down-to-close gesture
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View 
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          {renderHeader()}
          <View style={styles.mainContent}>
            {renderContent()}
            </View>
            
            {/* Book Selector Overlay - INSIDE main Modal */}
            {showBookSelector && (() => {
              const testamentBooks = books.filter(book => book.testament === currentBook?.testament);
              console.log('🟢 Rendering book selector with', testamentBooks.length, 'books for', currentBook?.testament);
              return (
              <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 99999,
                opacity: bookSelectorFadeAnim
              }}>
                <Animated.View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: theme.card,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  height: '80%',
                  overflow: 'hidden',
                  transform: [{ translateY: bookSelectorPanY }]
                }}>
                  <View {...bookSelectorPanResponder.panHandlers} style={{ alignItems: 'center' }}>
                    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', marginVertical: 8 }} />
                    <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', color: theme.text, marginBottom: 2 }}>
                      {currentBook?.testament === 'old' ? 'Old Testament' : 'New Testament'}
                    </Text>
                    <Text style={{ fontSize: 14, textAlign: 'center', color: theme.textSecondary, marginBottom: 12 }}>
                      {books.filter(book => book.testament === currentBook?.testament).length} books
                    </Text>
          </View>
        
                  <ScrollView 
                    style={{ flex: 1, margin: 0 }} 
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {books.filter(book => book.testament === currentBook?.testament).map((book) => {
                      const isExpanded = expandedBook === book.id;
                      const isCurrentBook = currentBook?.id === book.id;
                      
                      return (
                        <View key={book.id}>
                          {/* Book Row */}
            <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 16,
                              paddingHorizontal: 20,
                              borderRadius: 12,
                              marginBottom: isExpanded ? 0 : 8,
                              backgroundColor: isCurrentBook 
                                ? `${theme.primary}20` 
                                : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)')
                            }}
                            onPress={async () => {
                              console.log('📖 Book tapped:', book.name);
                              hapticFeedback.light();
                              
                              if (isExpanded) {
                                // Collapse
                                setExpandedBook(null);
                              } else {
                                // Expand and load chapters
                                setExpandedBook(book.id);
                                
                                // Load chapters if not already loaded
                                if (!bookChapters[book.id]) {
                                  try {
                                    const service = getBibleService(selectedBibleVersion);
                                    const chaptersData = await service.getChapters(book.id);
                                    setBookChapters(prev => ({
                                      ...prev,
                                      [book.id]: chaptersData
                                    }));
                } catch (error) {
                                    console.error('Error loading chapters:', error);
                                  }
                                }
                              }
                            }}
                          >
                            <Text style={{
                              fontSize: 18,
                              color: isCurrentBook ? theme.primary : theme.text,
                              fontWeight: isCurrentBook ? '700' : '500'
                            }}>
                              {book.name}
                </Text>
                            <MaterialIcons 
                              name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                              size={24} 
                              color={isCurrentBook ? theme.primary : theme.textSecondary} 
                            />
            </TouchableOpacity>
                          
                          {/* Chapters Dropdown */}
                          {isExpanded && (
                            <View style={{
                              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                              borderRadius: 12,
                              padding: 12,
                              marginBottom: 8
                            }}>
                              <View style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 8
                              }}>
                                {bookChapters[book.id] ? (
                                  bookChapters[book.id].map((chapter) => (
                                    <TouchableOpacity
                                      key={chapter.id}
                                      style={{
                                        paddingVertical: 8,
                                        paddingHorizontal: 16,
                                        borderRadius: 8,
                                        backgroundColor: theme.primary + '20',
                                        minWidth: 50,
                                        alignItems: 'center'
                                      }}
                                      onPress={() => {
                                        console.log('📖 Chapter selected:', book.name, chapter.number);
                                        hapticFeedback.light();
                                        setCurrentBook(book); // Set the book
                                        loadVerses(chapter);
                                        setShowBookSelector(false);
                                        setExpandedBook(null);
                                      }}
                                    >
                                      <Text style={{
                                        fontSize: 16,
                                        color: theme.primary,
                                        fontWeight: '600'
                                      }}>
                                        {chapter.number}
                                      </Text>
                                    </TouchableOpacity>
                                  ))
                                ) : (
                                  <ActivityIndicator size="small" color={theme.primary} />
                                )}
          </View>
          </View>
        )}
        </View>
                      );
                    })}
                  </ScrollView>
                </Animated.View>
              </Animated.View>
              );
            })()}
            
            {/* Version Picker Overlay - INSIDE main Modal */}
            {showVersionPicker && (() => {
              console.log('🟢 Rendering version picker modal');
              return (
              <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 99998,
                opacity: versionPickerFadeAnim
              }}>
                <Animated.View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: theme.card,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  height: '70%',
                  overflow: 'hidden',
                  transform: [{ translateY: versionPickerPanY }]
                }}>
                  <View {...versionPickerPanResponder.panHandlers} style={{ alignItems: 'center' }}>
                    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)', marginVertical: 8 }} />
                    <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', color: theme.text, marginBottom: 2 }}>
                      Bible Version
                    </Text>
                    <Text style={{ fontSize: 14, textAlign: 'center', color: theme.textSecondary, marginBottom: 12 }}>
                      {bibleVersions.filter(v => v.isAvailable).length} versions available
                    </Text>
            </View>
            
                  <ScrollView 
                    style={{ flex: 1 }} 
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 0, paddingBottom: 20 }}
                    showsVerticalScrollIndicator={true}
                  >
              {bibleVersions.map((version) => {
                const isSelected = selectedBibleVersion === version.id;
                
                return (
                  <TouchableOpacity
                    key={version.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 16,
                            borderRadius: 12,
                            marginBottom: 8,
                            backgroundColor: isSelected 
                              ? `${theme.primary}20` 
                              : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                            borderWidth: isSelected ? 2 : 0,
                            borderColor: isSelected ? theme.primary : 'transparent',
                            opacity: version.isAvailable ? 1 : 0.5
                          }}
                          onPress={() => {
                            if (version.isAvailable) {
                              hapticFeedback.light();
                              handleVersionChange(version.id);
                            }
                          }}
                    disabled={!version.isAvailable}
                  >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? '700' : '500', marginBottom: 4 }}>
                              {version.name}
                      </Text>
                            {version.abbreviation && (
                              <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 2 }}>
                                {version.abbreviation}
                              </Text>
                            )}
                            {version.description && (
                              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                        {version.description}
                      </Text>
                            )}
                    </View>
                    {isSelected && version.isAvailable && (
                      <MaterialIcons name="check-circle" size={24} color={theme.primary} />
                    )}
                    {!version.isAvailable && (
                            <MaterialIcons name="lock" size={20} color={theme.textSecondary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
                </Animated.View>
              </Animated.View>
              );
            })()}
            
            {/* Search Modal - INSIDE main Modal */}
            {showSearchModal && (
              <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 99997,
                opacity: searchModalFadeAnim,
                justifyContent: 'flex-end'
              }}>
                {/* Backdrop - tap to close */}
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                  }}
                  activeOpacity={1}
                  onPress={() => {
                    hapticFeedback.light();
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                />
                <Animated.View style={{
                  height: '94%',
                  backgroundColor: theme.background,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  overflow: 'hidden',
                  transform: [{ translateY: searchModalPanY }],
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 10
                }}>
                  {/* Drag Handle */}
                  <View {...searchModalPanResponder.panHandlers} style={{ 
                    alignItems: 'center',
                    paddingTop: 12,
                    paddingBottom: 10,
                    backgroundColor: theme.background
                  }}>
                    <View style={{ 
                      width: 40, 
                      height: 5, 
                      borderRadius: 3, 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)', 
                      marginBottom: 20 
                    }} />
                    
                    {/* Header */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      paddingHorizontal: 20,
                      marginBottom: 20
                    }}>
                      <Text style={{ 
                        fontSize: 24, 
                        fontWeight: '700', 
                        color: theme.text 
                      }}>
                        Search the Bible
                      </Text>
                    </View>
                  </View>
                  
                  {/* Search Input */}
                  <View style={{
                    paddingHorizontal: 20,
                    marginBottom: 20
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.card,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12
                    }}>
                      <MaterialIcons name="search" size={24} color={theme.textSecondary} />
                      <TextInput
                        style={{
                          flex: 1,
                          fontSize: 16,
                          color: theme.text,
                          marginLeft: 12
                        }}
                        placeholder="Search the Bible"
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => {
                          if (searchQuery.trim()) {
                            searchBible();
                          }
                        }}
                        autoFocus={false}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                          style={{ padding: 4 }}
                        >
                          <MaterialIcons name="cancel" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                  {/* Content */}
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                      paddingHorizontal: 20,
                      paddingBottom: 40
                    }}
                    showsVerticalScrollIndicator={false}
                  >
                    {loading ? (
                      // Loading State
                      <View style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingTop: 100
                      }}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={{
                          fontSize: 16,
                          color: theme.textSecondary,
                          marginTop: 16
                        }}>
                          Searching the Bible...
                        </Text>
                      </View>
                    ) : searchResults.length === 0 ? (
                      // Empty State
                      <View style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingTop: 80
                      }}>
                        <Text style={{
                          fontSize: 16,
                          color: theme.textSecondary,
                          textAlign: 'center'
                        }}>
                          No results found
                        </Text>
                      </View>
                    ) : (
                      // Search Results
                      <View>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: theme.textSecondary,
                          marginBottom: 16
                        }}>
                          {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                        </Text>
                        
                        {searchResults.map((result, index) => (
                          <TouchableOpacity
                            key={index}
                            style={{
                              backgroundColor: theme.card,
                              borderRadius: 12,
                              padding: 16,
                              marginBottom: 12
                            }}
                            onPress={() => {
                              hapticFeedback.light();
                              // Navigate to the verse
                              if (result.bookId && result.chapter && result.verse) {
                                const book = books.find(b => b.id === result.bookId);
                                if (book) {
                                  setCurrentBook(book);
                                  // Set the target verse number to scroll to
                                  setTargetVerseNumber(result.verse);
                                  const service = getBibleService(selectedBibleVersion);
                                  service.getChapters(book.id).then(chapters => {
                                    const chapter = chapters.find(c => c.number === result.chapter.toString());
                                    if (chapter) {
                                      loadVerses(chapter);
                                      setShowSearchModal(false);
                                      setSearchQuery('');
                                      setSearchResults([]);
                                    }
                                  });
                                }
                              }
                            }}
                          >
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: theme.primary,
                              marginBottom: 8
                            }}>
                              {result.reference}
                            </Text>
                            <Text style={{
                              fontSize: 15,
                              color: theme.text,
                              lineHeight: 22
                            }}>
                              {result.text}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                </Animated.View>
              </Animated.View>
            )}
        
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
          
          {/* Verse Action Menu - INSIDE main modal */}
          {showVerseMenu && selectedVerseForMenu && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999999,
            }}>
              {/* Backdrop */}
              <Animated.View style={{ 
                ...StyleSheet.absoluteFillObject, 
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                opacity: verseMenuFadeAnim 
              }}>
                <TouchableOpacity 
                  style={{ flex: 1 }}
                  activeOpacity={1}
                  onPress={closeVerseMenu}
                />
              </Animated.View>
              
              {/* Menu Content */}
              <Animated.View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: theme.background,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingBottom: 40,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 10,
                  transform: [{
                    translateY: verseMenuSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    })
                  }],
                }}
              >
                {/* Drag Handle with PanHandlers */}
                <View 
                  {...verseMenuPanResponder.panHandlers}
                  style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}
                >
                  <View style={{
                    width: 40,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)'
                  }} />
                </View>

                {/* Verse Reference */}
                <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
                    {currentBook?.name} {currentChapter?.number}:{selectedVerseForMenu.number || selectedVerseForMenu.verse}
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 20 }}>
                    "{(selectedVerseForMenu.content || selectedVerseForMenu.text || '').substring(0, 100)}..."
                  </Text>
                </View>

                {showColorPicker ? (
                  /* Color Picker View */
                  <View style={{ paddingHorizontal: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                        Choose Highlight Color
                      </Text>
                      <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                        <MaterialIcons name="close" size={24} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Color Options */}
                    <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {[
                          { name: 'Yellow', color: '#FFF9C4' },
                          { name: 'Green', color: '#C8E6C9' },
                          { name: 'Blue', color: '#BBDEFB' },
                          { name: 'Pink', color: '#F8BBD0' },
                          { name: 'Orange', color: '#FFE0B2' },
                          { name: 'Purple', color: '#E1BEE7' },
                          { name: 'Coral', color: '#FFCCCB' },
                          { name: 'Mint', color: '#B5EAD7' },
                          { name: 'Peach', color: '#FFDAB9' },
                          { name: 'Lavender', color: '#E6E6FA' },
                          { name: 'Lime', color: '#D4F1A9' },
                          { name: 'Sky', color: '#87CEEB' },
                          { name: 'Rose', color: '#FFD1DC' },
                          { name: 'Sage', color: '#C9DED4' },
                          { name: 'Apricot', color: '#FBCEB1' },
                          { name: 'Lilac', color: '#C8A2C8' },
                          { name: 'Lemon', color: '#FFF44F' },
                          { name: 'Aqua', color: '#7FDBFF' },
                          { name: 'Mauve', color: '#E0B0FF' },
                          { name: 'Cream', color: '#FFFDD0' },
                          { name: 'Teal', color: '#B2DFDB' },
                          { name: 'Salmon', color: '#FFB3B3' },
                          { name: 'Periwinkle', color: '#CCCCFF' },
                          { name: 'Champagne', color: '#F7E7CE' },
                          { name: 'Turquoise', color: '#AFEEEE' },
                          { name: 'Blush', color: '#FFE4E1' },
                          { name: 'Mint Green', color: '#98FF98' },
                          { name: 'Baby Blue', color: '#89CFF0' },
                          { name: 'Powder', color: '#FFB6C1' },
                          { name: 'Butter', color: '#FFFFCC' },
                          { name: 'Seafoam', color: '#93E9BE' },
                          { name: 'Orchid', color: '#DA70D6' },
                          { name: 'Honey', color: '#FFD700' },
                          { name: 'Ice Blue', color: '#C1E1EC' },
                          { name: 'Cherry', color: '#DE3163' },
                          { name: 'Pistachio', color: '#93C572' },
                          { name: 'Plum', color: '#DDA0DD' },
                          { name: 'Tangerine', color: '#FFCC00' },
                          { name: 'Sand', color: '#F5DEB3' },
                          { name: 'Cyan', color: '#7FFFD4' },
                          { name: 'Magenta', color: '#FF77FF' },
                          { name: 'Melon', color: '#FFDEAD' },
                          { name: 'Iris', color: '#C4C3D0' },
                          { name: 'Gold', color: '#FFE5B4' },
                          { name: 'Celadon', color: '#AFE1AF' },
                          { name: 'Wisteria', color: '#C9A0DC' },
                          { name: 'Citrus', color: '#FFEA00' },
                          { name: 'Azure', color: '#B0E0E6' },
                          { name: 'Fuchsia', color: '#FF77FF' },
                          { name: 'Vanilla', color: '#F3E5AB' },
                          { name: 'Emerald', color: '#50C878' },
                          { name: 'Amethyst', color: '#9966CC' },
                          { name: 'Sunflower', color: '#FFD700' },
                          { name: 'Pearl', color: '#F0EAD6' },
                          { name: 'Jade', color: '#00A86B' },
                        ].map((colorOption) => (
                        <TouchableOpacity
                          key={colorOption.name}
                          style={{
                            flex: 1,
                            minWidth: '30%',
                            backgroundColor: colorOption.color,
                            paddingVertical: 16,
                            borderRadius: 12,
                            alignItems: 'center',
                            borderWidth: 2,
                            borderColor: 'transparent'
                          }}
                          onPress={() => highlightVerse(colorOption.color)}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#000' }}>
                            {colorOption.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    </ScrollView>

                    {/* Remove Highlight Option */}
                    {highlightedVerses[selectedVerseForMenu.id || `${currentBook?.id}_${currentChapter?.number}_${selectedVerseForMenu.number}`] && (
                      <TouchableOpacity
                        style={{
                          marginTop: 12,
                          paddingVertical: 16,
                          borderRadius: 12,
                          alignItems: 'center',
                          backgroundColor: theme.card,
                          borderWidth: 1,
                          borderColor: theme.border
                        }}
                        onPress={removeHighlight}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                          Remove Highlight
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  /* Main Menu Options */
                  <View style={{ paddingHorizontal: 20 }}>
                    {/* Discuss Option */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        backgroundColor: theme.card,
                        borderRadius: 12,
                        marginBottom: 12
                      }}
                      onPress={discussVerse}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${theme.primary}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        <MaterialIcons name="chat" size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                          Discuss
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                          Get insights and explanations
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>

                    {/* Notes Option */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        backgroundColor: theme.card,
                        borderRadius: 12,
                        marginBottom: 12
                      }}
                      onPress={addNoteToVerse}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${theme.primary}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        <MaterialIcons name="note-add" size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                          {verseNotes[selectedVerseForMenu?.id || `${currentBook?.id}_${currentChapter?.number}_${selectedVerseForMenu?.number}`] ? 'Edit Note' : 'Add Note'}
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                          Write your thoughts about this verse
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>

                    {/* Highlight Option */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        backgroundColor: theme.card,
                        borderRadius: 12,
                        marginBottom: 12
                      }}
                      onPress={() => setShowColorPicker(true)}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${theme.primary}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        <MaterialIcons name="palette" size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                          Highlight
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                          Mark this verse with a color
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>

                    {/* Save Option */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        backgroundColor: theme.card,
                        borderRadius: 12,
                        marginBottom: 12
                      }}
                      onPress={saveVerseToProfile}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${theme.primary}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        <MaterialIcons 
                          name={savedVerses.has(selectedVerseForMenu?.id || `${currentBook?.id}_${currentChapter?.number}_${selectedVerseForMenu?.number}`) ? "favorite" : "bookmark"} 
                          size={20} 
                          color={theme.primary} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                          {savedVerses.has(selectedVerseForMenu?.id || `${currentBook?.id}_${currentChapter?.number}_${selectedVerseForMenu?.number}`) ? 'Saved' : 'Save Verse'}
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                          {savedVerses.has(selectedVerseForMenu?.id || `${currentBook?.id}_${currentChapter?.number}_${selectedVerseForMenu?.number}`) ? 'Already in your saved verses' : 'Add to your saved verses'}
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>

                    {/* Share Option */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        backgroundColor: theme.card,
                        borderRadius: 12,
                        marginBottom: 12
                      }}
                      onPress={shareVerse}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${theme.primary}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        <MaterialIcons name="share" size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                          Share
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                          Create a beautiful verse card
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </View>
          )}

          {/* Note Modal - Modal Presentation with Interactive Dismissal */}
          {showJournalingModal && selectedVerseForJournal && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'flex-end',
            zIndex: 1000000,
          }}
        >
          {/* Backdrop */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={saveAndCloseNote}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Animated.View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              opacity: noteModalFadeAnim
            }} />
          </TouchableOpacity>

          {/* Modal Content */}
          <Animated.View
            {...noteModalPanResponder.panHandlers}
            style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              height: '93%',
              transform: [{ translateY: noteModalSlideAnim }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 30,
            }}
          >
            {/* Drag Handle */}
            <View style={{ 
              alignItems: 'center', 
              paddingTop: 14, 
              paddingBottom: 10,
              backgroundColor: theme.background,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
            }}>
              <View style={{
                width: 50,
                height: 5,
                borderRadius: 3,
                backgroundColor: theme.textSecondary,
                opacity: 0.35
              }} />
            </View>

            {/* Scrollable Content */}
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={{
                paddingHorizontal: 28,
                paddingTop: 8,
                paddingBottom: 24,
                backgroundColor: theme.background,
              }}>
                <Text style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: theme.text,
                  marginBottom: 8,
                  letterSpacing: -0.5
                }}>
                  {verseNotes[selectedVerseForJournal.id] ? 'Edit Note' : 'Add Note'}
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <View style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: `${theme.primary}15`,
                    borderRadius: 8,
                  }}>
                    <Text style={{
                      fontSize: 14,
                      color: theme.primary,
                      fontWeight: '700'
                    }}>
                      {selectedVerseForJournal.reference}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Verse Display */}
              <View style={{
                marginHorizontal: 28,
                marginBottom: 28,
                paddingHorizontal: 24,
                paddingVertical: 24,
                backgroundColor: theme.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.border,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}>
                <Text style={{
                  fontSize: 18,
                  fontStyle: 'italic',
                  color: theme.text,
                  lineHeight: 28,
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  "{selectedVerseForJournal.text}"
                </Text>
              </View>

              {/* Info Box */}
              <View style={{
                marginHorizontal: 28,
                marginBottom: 20,
                padding: 16,
                backgroundColor: `${theme.primary}08`,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: `${theme.primary}20`,
              }}>
                <Text style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  lineHeight: 20,
                  textAlign: 'center'
                }}>
                  Write your personal thoughts, reflections, prayers, or any insights about this verse. Your notes are private and saved locally.
                </Text>
              </View>

              {/* Note Input */}
              <View style={{ paddingHorizontal: 28, paddingBottom: 28 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14
                }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 1
                  }}>
                    Your Note
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: theme.textTertiary,
                    fontWeight: '500'
                  }}>
                    {noteText.length} characters
                  </Text>
                </View>
                <TextInput
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 18,
                    padding: 20,
                    fontSize: 17,
                    color: theme.text,
                    minHeight: 220,
                    textAlignVertical: 'top',
                    borderWidth: 2,
                    borderColor: noteText.trim() ? theme.primary : theme.border,
                    lineHeight: 24
                  }}
                  placeholder="What does this verse mean to you? How does it apply to your life today?"
                  placeholderTextColor={theme.textTertiary}
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                />
              </View>
            </ScrollView>

            {/* Fixed Bottom Action Buttons */}
            <View style={{
              paddingHorizontal: 28,
              paddingTop: 20,
              paddingBottom: 32,
              backgroundColor: theme.background,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}>
              <View style={{
                flexDirection: 'row',
                gap: 14,
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 18,
                    borderRadius: 16,
                    backgroundColor: theme.surface,
                    borderWidth: 2,
                    borderColor: theme.border,
                    alignItems: 'center'
                  }}
                  onPress={closeNoteModal}
                >
                  <Text style={{
                    fontSize: 17,
                    fontWeight: '700',
                    color: theme.text
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1.5,
                    paddingVertical: 18,
                    borderRadius: 16,
                    backgroundColor: noteText.trim() ? theme.primary : theme.textTertiary,
                    alignItems: 'center',
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: noteText.trim() ? 0.4 : 0,
                    shadowRadius: 12,
                    elevation: noteText.trim() ? 12 : 0,
                  }}
                  onPress={saveAndCloseNote}
                  disabled={!noteText.trim()}
                >
                  <Text style={{
                    fontSize: 17,
                    fontWeight: '800',
                    color: '#fff',
                    letterSpacing: 0.3
                  }}>
                    Save Note
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}

          {/* Share Card Modal */}
          {showShareCard && selectedVerseForMenu && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000001,
              }}
            >
              {/* Backdrop - Separate TouchableOpacity */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={closeShareCard}
                disabled={shareCardAnimating}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              >
                <Animated.View style={{
                  flex: 1,
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  opacity: shareCardFadeAnim
                }} />
              </TouchableOpacity>

              {/* Card Content - Centered, blocks backdrop touches */}
              <View
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Animated.View 
                  style={{
                    width: '90%',
                    maxWidth: 400,
                    opacity: shareCardFadeAnim,
                    transform: [{
                      scale: shareCardFadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1]
                      })
                    }]
                  }}
                >
                  <View>
                    <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1.0 }}>
                    <LinearGradient
                      colors={[
                        ['#FF6B9D', '#FEC163'],
                        ['#A8EDEA', '#FED6E3'],
                        ['#667EEA', '#764BA2'],
                        ['#F093FB', '#F5576C'],
                        ['#4FACFE', '#00F2FE'],
                        ['#43E97B', '#38F9D7'],
                        ['#FA709A', '#FEE140'],
                        ['#30CFD0', '#330867'],
                        ['#A8EDEA', '#FED6E3'],
                        ['#FCCB90', '#D57EEB'],
                      ][Math.floor(Math.random() * 10)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 28,
                        padding: 50,
                        minHeight: 500
                      }}
                    >
                      {/* Version Badge - Top Right, Subtle */}
                      <View style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.5)',
                          letterSpacing: 0.5,
                          textTransform: 'uppercase'
                        }}>
                          {getVersionById(selectedBibleVersion)?.name || 'KJV'}
                        </Text>
                      </View>

                      {/* Main Content - Centered */}
                      <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: 40
                      }}>
                        {/* Verse Reference */}
                        <Text style={{
                          fontSize: 24,
                          fontWeight: '800',
                          color: '#fff',
                          marginBottom: 32,
                          textShadowColor: 'rgba(0, 0, 0, 0.2)',
                          textShadowOffset: { width: 0, height: 2 },
                          textShadowRadius: 4
                        }}>
                          {currentBook?.name} {currentChapter?.number}:{selectedVerseForMenu.number || selectedVerseForMenu.verse}
                        </Text>

                        {/* Verse Text - The Focus */}
                        <Text style={{
                          fontSize: 22,
                          fontWeight: '500',
                          color: '#fff',
                          lineHeight: 36,
                          textAlign: 'center',
                          fontStyle: 'italic',
                          textShadowColor: 'rgba(0, 0, 0, 0.15)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 3
                        }}>
                          "{(selectedVerseForMenu.content || selectedVerseForMenu.text || '').replace(/\s+/g, ' ').trim()}"
                        </Text>
                      </View>

                      {/* Biblely - Bottom, Subtle */}
                      <View style={{
                        alignItems: 'center',
                        marginTop: 24
                      }}>
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: 'rgba(255, 255, 255, 0.6)',
                          letterSpacing: 1.2,
                        }}>
                          Biblely
                        </Text>
                      </View>
                    </LinearGradient>
                  </ViewShot>

                  {/* Save Button - Outside the ViewShot */}
                  <TouchableOpacity
                    onPress={saveVerseCard}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      paddingVertical: 16,
                      paddingHorizontal: 32,
                      borderRadius: 28,
                      marginTop: 24,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 12,
                      elevation: 8
                    }}
                  >
                    <MaterialIcons name="download" size={22} color="#000" />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: '#000',
                      marginLeft: 10,
                      letterSpacing: 0.5
                    }}>
                      Save to Photos
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
              </View>
            </View>
          )}
          
        </View>
      </Modal>

    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 1000,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    minWidth: 60,
  },
  searchButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'flex-end',
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
    // color will be set dynamically with theme.primary
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    // color will be set dynamically with theme.text
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  testamentTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color will be set dynamically with theme.primary
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // backgroundColor will be set dynamically with theme.card
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '500',
    // color will be set dynamically with theme.text
    flex: 1,
  },
  chapterCount: {
    fontSize: 12,
    // color will be set dynamically with theme.textSecondary
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
    // backgroundColor will be set dynamically with theme.card
    margin: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    // color will be set dynamically with theme.primary
  },
  verseContainer: {
    // backgroundColor will be set dynamically with theme.card
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 20,
    width: undefined, // Let it use full available width
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
    // color will be set dynamically with theme.primary
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
    // color will be set dynamically with theme.text
  },
  simplifiedContainer: {
    marginTop: 12,
    padding: 12,
    // backgroundColor will be set dynamically with theme colors
    borderRadius: 8,
    borderLeftWidth: 3,
    // borderLeftColor will be set dynamically with theme.primary
  },
  simplifiedLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    // color will be set dynamically with theme.primary
    marginBottom: 4,
  },
  simplifiedText: {
    fontSize: 16,
    lineHeight: 22,
    // color will be set dynamically with theme.text
    fontStyle: 'italic',
    width: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  searchResultItem: {
    // backgroundColor will be set dynamically with theme.card
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  searchReference: {
    fontSize: 14,
    fontWeight: 'bold',
    // color will be set dynamically with theme.primary
    marginBottom: 8,
  },
  searchText: {
    fontSize: 16,
    lineHeight: 24,
    // color will be set dynamically with theme.text
  },
  searchActionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  searchActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  searchActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    // color will be set dynamically with theme.textSecondary
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
  
  // Clean Styles without gradients
  cleanHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cleanTestamentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cleanChaptersContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cleanChapterCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cleanChapterNav: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cleanNavButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cleanVerseCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cleanBottomNav: {
    flexDirection: 'row',
    margin: 20,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cleanBottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cleanBookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  testamentSection: {
    marginBottom: 16,
  },
  modernTestamentCard: {
    // No margin here since testamentSection handles it
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
    paddingHorizontal: 16,
  },
  modernVerseCard: {
    marginBottom: 16,
  },
  verseBlurCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  verseGradient: {
    padding: 16,
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
  verseContentContainer: {
    marginTop: 8,
    width: '100%',
  },
  modernVerseText: {
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 12,
    textAlign: 'left',
    width: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
    fontStyle: 'italic',
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
  
  // Simplified text styles
  simplifiedTextContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  simplifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  simplifiedLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  simplifiedText: {
    fontSize: 15,
    lineHeight: 22,
    padding: 12,
    borderRadius: 8,
    fontStyle: 'italic',
    width: '100%',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  
  // Dropdown Styles
  dropdownContainer: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownBookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  dropdownBookIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownBookEmoji: {
    fontSize: 22,
  },
  dropdownBookInfo: {
    flex: 1,
  },
  dropdownBookName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dropdownBookDetails: {
    fontSize: 13,
    opacity: 0.8,
  },
  
  // YouVersion-style Header Styles
  youversionHeader: {
    paddingTop: 8,
    paddingBottom: 1,
  },
  youversionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  youversionBackButton: {
    padding: 8,
  },
  profileButton: {
    padding: 0,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  youversionTitleSection: {
    flex: 1,
  },
  youversionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  youversionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  youversionActionButton: {
    padding: 8,
  },
  
  // YouVersion-style Verses Styles
  youversionContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  chapterNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 0,
    marginTop: -25,
    marginBottom: 8,
  },
  stickyChapterNavigation: {
    position: 'absolute',
    top: 160,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  blurredNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 20,
    marginBottom: -14,
  },
  navButton: {
    padding: 4,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  youversionVersesContainer: {
    marginTop: -8,
  },
  youversionVerseRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 12,
  },
  youversionVerseNumber: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    paddingTop: 2,
  },
  youversionVerseText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: 0.3,
  },
});

// Book Selector Modal Component
const BookSelectorModal = ({ visible, onClose, currentBook, books, onSelectBook, theme, isDark }) => {
  const panY = useRef(new Animated.Value(800)).current; // Start off-screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    console.log('📖 BookSelectorModal visible:', visible, 'currentBook:', currentBook?.name);
    if (visible) {
      Animated.parallel([
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(panY, {
          toValue: 800,
          duration: 250,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [visible]);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11
          }).start();
        }
      }
    })
  ).current;
  
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(panY, {
        toValue: 800,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      })
    ]).start(() => {
      onClose();
    });
  };
  
  // Filter books by current testament
  const currentTestament = currentBook?.testament || 'old';
  const testamentBooks = books.filter(book => book.testament === currentTestament);
  
  console.log('🟢 BookSelectorModal rendering:', {
    visible,
    currentBook: currentBook?.name,
    testament: currentTestament,
    booksCount: testamentBooks.length
  });
  
  if (!currentBook) {
    console.log('⚠️ BookSelectorModal: No currentBook - returning null');
    return null;
  }
  
  console.log('🟢 Rendering Modal component now!');
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
    >
      <View style={bookModalStyles.overlay}>
        <TouchableOpacity 
          style={bookModalStyles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View 
          style={[
            bookModalStyles.container,
            {
              backgroundColor: theme.card
            }
          ]}
        >
          {/* Drag Handle */}
          <View style={bookModalStyles.dragArea}>
            <View style={[bookModalStyles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />
          </View>
          
          {/* Testament Title */}
          <View style={bookModalStyles.header}>
            <Text style={[bookModalStyles.title, { color: theme.text }]}>
              {currentTestament === 'old' ? 'Old Testament' : 'New Testament'}
            </Text>
          </View>
          
          {/* Books List */}
          <ScrollView 
            style={bookModalStyles.scroll}
            contentContainerStyle={bookModalStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {testamentBooks.map((book, index) => {
              const isSelected = currentBook?.id === book.id;
              return (
                <TouchableOpacity
                  key={book.id}
                  style={[
                    bookModalStyles.bookItem,
                    { 
                      backgroundColor: isSelected 
                        ? `${theme.primary}20` 
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)')
                    }
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    onSelectBook(book);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    bookModalStyles.bookName,
                    { 
                      color: isSelected ? theme.primary : theme.text,
                      fontWeight: isSelected ? '700' : '500'
                    }
                  ]}>
                    {book.name}
                  </Text>
                  <MaterialIcons 
                    name="chevron-right" 
                    size={24} 
                    color={isSelected ? theme.primary : theme.textSecondary} 
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const bookModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  container: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  dragArea: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  bookName: {
    fontSize: 18,
  },
  // Verse menu styles
  verseMenuOverlay: {
    flex: 1,
  },
  verseMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  verseMenuContainer: {
    // Styles moved inline for theme support
  },
});

export default BibleReader;
