import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Switch,
  Alert,
  Modal,
  TextInput,
  Image,
  Animated,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
  PanResponder,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';

// const { width } = Dimensions.get('window');
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
  isLiquidGlassSupportedByDevice,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getStoredData, saveData } from '../utils/localStorage';
import { countries } from '../data/countries';
import { resetOnboardingForTesting } from '../utils/onboardingReset';
import AchievementsModal from '../components/AchievementsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimationDemo from '../components/AnimationDemo';
import ProfilePhotoPicker from '../components/ProfilePhotoPicker';
import NotificationSettings from '../components/NotificationSettings';
import { FluidTransition, FluidCard, FluidButton } from '../components/FluidTransition';
import { GlassCard, GlassHeader } from '../components/GlassEffect';
import ScrollHeader from '../components/ScrollHeader';
import { createEntranceAnimation } from '../utils/animations';
import { hapticFeedback, updateHapticsSetting } from '../utils/haptics';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';
import { bibleVersions, getVersionById, getFreeVersions, getPremiumVersions } from '../data/bibleVersions';
import AiBibleChat from '../components/AiBibleChat';
import bibleAudioService from '../services/bibleAudioService';
import BibleReader from '../components/BibleReader';
import PrayerCompletionManager from '../utils/prayerCompletionManager';
import AppStreakManager from '../utils/appStreakManager';
import VerseDataManager from '../utils/verseDataManager';
import verseByReferenceService from '../services/verseByReferenceService';
import ThemeModal from '../components/ThemeModal';
import AchievementService from '../services/achievementService';


// Animated Profile Card Components (follows Rules of Hooks)
const AnimatedStatCard = ({ children, onPress, style, ...props }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        delayPressIn={0}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedSettingsCard = ({ children, onPress, style, ...props }) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98, // Reduced by 50% - more subtle press effect (was 0.96, now 0.98)
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Liquid Glass Container for Settings Cards
  const LiquidGlassSettingsContainer = ({ children, style }) => {
    if (!isLiquidGlassSupported) {
      return (
        <BlurView 
          intensity={18} 
          tint={isDark ? "dark" : "light"} 
          style={[style, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}10` // Added 4 to opacity (06 -> 10)
          }]}
        >
          {children}
        </BlurView>
      );
    }

    return (
      <LiquidGlassView
        interactive={true}
        effect="clear"
        colorScheme="system"
        tintColor="rgba(255, 255, 255, 0.08)"
        style={[style, styles.liquidGlassSettingsCard]}
      >
        {children}
      </LiquidGlassView>
    );
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <LiquidGlassSettingsContainer style={style}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
          delayPressIn={0}
          style={{ flex: 1 }}
          {...props}
        >
          {children}
        </TouchableOpacity>
      </LiquidGlassSettingsContainer>
    </Animated.View>
  );
};

const AnimatedModalButton = ({ children, onPress, style, ...props }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 400,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        delayPressIn={0}
        style={style}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const ProfileTab = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme, toggleTheme, changeTheme, availableThemes, currentTheme } = useTheme();
  const { t, language, changeLanguage, isChangingLanguage, availableLanguages } = useLanguage();
  const [userStats, setUserStats] = useState({
    points: 0,
    level: 1,
    completedTasks: 0,
    streak: 0,
    badges: [],
    versesRead: 0,
    prayersCompleted: 0,
  });
  const [userName, setUserName] = useState('Faithful Friend');
  const [userProfile, setUserProfile] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('Faithful Friend');
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [showAchievements, setShowAchievements] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showAnimationDemo, setShowAnimationDemo] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedBibleVersion, setSelectedBibleVersion] = useState('kjv');
  const [showBibleVersionModal, setShowBibleVersionModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' or 'lbs'
  const [audioVoiceGender, setAudioVoiceGender] = useState('female'); // 'male' or 'female'
  const [showSavedVerses, setShowSavedVerses] = useState(false);
  const [savedVersesList, setSavedVersesList] = useState([]);
  const [simplifiedSavedVerses, setSimplifiedSavedVerses] = useState(new Map());
  const [refreshingSavedVerses, setRefreshingSavedVerses] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [verseToInterpret, setVerseToInterpret] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showBible, setShowBible] = useState(false);
  const [verseReference, setVerseReference] = useState(null);

  const [purchasedVersions, setPurchasedVersions] = useState(['kjv', 'web']); // Free versions
  
  // App Streak State
  const [appStreak, setAppStreak] = useState(0);
  const [showStreakMilestone, setShowStreakMilestone] = useState(false);
  const [streakAnimation, setStreakAnimation] = useState(null);
  
  // Journal State
  const [journalNotes, setJournalNotes] = useState([]);
  const [journalVerseTexts, setJournalVerseTexts] = useState({});
  const [showAddJournalNote, setShowAddJournalNote] = useState(false);
  const [newJournalNote, setNewJournalNote] = useState({ reference: '', text: '' });
  const [isAddingEntry, setIsAddingEntry] = useState(false); // Track if we're in add mode within journal modal
  
  // Highlights State
  const [highlightedVerses, setHighlightedVerses] = useState([]);
  const [showHighlights, setShowHighlights] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState(null); // Track selected color for drill-down
  const [highlightVersesWithText, setHighlightVersesWithText] = useState([]); // Store verses with full text
  const [customHighlightNames, setCustomHighlightNames] = useState({}); // Store custom names for highlight colors
  const [showRenameHighlight, setShowRenameHighlight] = useState(false);
  const [renameHighlightColor, setRenameHighlightColor] = useState(null);
  const [renameHighlightText, setRenameHighlightText] = useState('');
  const [highlightViewMode, setHighlightViewMode] = useState('compact'); // 'compact' or 'expanded'
  
  // Tasks Done State
  const [showTasksDone, setShowTasksDone] = useState(false);
  const [completedTodosList, setCompletedTodosList] = useState([]);
  const [savedVersesSort, setSavedVersesSort] = useState('desc'); // 'asc' | 'desc'
  const [savedVersesSearch, setSavedVersesSearch] = useState('');
  const [showJournal, setShowJournal] = useState(false);
  const [journalLoading, setJournalLoading] = useState(true); // Start true to avoid empty flash
  
  // Modal animation refs for interactive dismissal
  const savedVersesSlideAnim = useRef(new Animated.Value(0)).current;
  const journalSlideAnim = useRef(new Animated.Value(0)).current;
  const highlightsSlideAnim = useRef(new Animated.Value(0)).current;
  const addJournalSlideAnim = useRef(new Animated.Value(600)).current;
  
  const savedVersesFadeAnim = useRef(new Animated.Value(0)).current;
  const journalFadeAnim = useRef(new Animated.Value(0)).current;
  const highlightsFadeAnim = useRef(new Animated.Value(0)).current;
  
  // 🌸 Scroll animation for wallpaper
  const wallpaperScrollY = useRef(new Animated.Value(0)).current;

  const loadSavedVerses = async () => {
    try {
      const savedVersesData = await AsyncStorage.getItem('savedBibleVerses');
      if (savedVersesData) {
        const verses = JSON.parse(savedVersesData);
        
        // Get user's current preferred Bible version
        const preferredVersion = await AsyncStorage.getItem('selectedBibleVersion') || 'kjv';
        console.log(`📖 Loading ${verses.length} saved verses in preferred version: ${preferredVersion.toUpperCase()}`);
        
        // Fetch each verse in the user's preferred version
        const versesWithPreferredVersion = await Promise.all(
          verses.map(async (verse) => {
            try {
              // Skip if this is a Key Verse (special identifier)
              if (verse.version === 'KEY_VERSES') {
                return verse; // Keep Key Verses as-is
              }
              
              // Fetch the verse in the user's preferred version
              const { text, version } = await verseByReferenceService.getVerseByReference(
                verse.reference,
                preferredVersion
              );
              
              return {
                ...verse,
                text: text,
                version: version.toLowerCase(),
                originalVersion: verse.version, // Keep track of original version
              };
            } catch (error) {
              console.warn(`⚠️ Could not fetch ${verse.reference} in ${preferredVersion}, using saved text:`, error.message);
              // If fetching fails, keep the original saved text
              return verse;
            }
          })
        );
        
        setSavedVersesList(versesWithPreferredVersion);
        
        // Update the stats count
        setUserStats(prev => ({
          ...prev,
          savedVerses: verses.length
        }));
        
        // Also update in AsyncStorage
        const stats = await AsyncStorage.getItem('userStats');
        const userStatsData = stats ? JSON.parse(stats) : {};
        userStatsData.savedVerses = verses.length;
        await AsyncStorage.setItem('userStats', JSON.stringify(userStatsData));
        
        console.log(`✅ Loaded ${verses.length} saved verses in ${preferredVersion.toUpperCase()}`);
      } else {
        setSavedVersesList([]);
        console.log('📖 No saved verses found');
      }
    } catch (error) {
      console.error('Error loading saved verses:', error);
    }
  };

  const refreshSavedVerses = async () => {
    setRefreshingSavedVerses(true);
    await loadSavedVerses();
    setRefreshingSavedVerses(false);
  };

  const loadAppStreak = async () => {
    try {
      const streakData = await AppStreakManager.trackAppOpen();
      setAppStreak(streakData.currentStreak);
      // Keep userStats in sync so Achievements reflects the real app streak
      setUserStats(prev => ({
        ...prev,
        streak: streakData.currentStreak,
      }));
      
      // Check for milestone and show animation
      if (streakData.milestoneReached) {
        setShowStreakMilestone(true);
        const animation = AppStreakManager.getStreakAnimation(streakData.currentStreak);
        setStreakAnimation(animation);
        
        // Clear milestone flag
        await AppStreakManager.clearMilestoneFlag();
        
        // Hide animation after 3 seconds
        setTimeout(() => {
          setShowStreakMilestone(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error loading app streak:', error);
    }
  };

  // Helper function to check if a string looks like a Bible reference
  const isValidBibleReference = (ref) => {
    if (!ref || ref === 'Unknown Reference' || ref === 'My Thoughts') return false;
    // Check if it matches pattern like "Book Chapter:Verse" or "Book Chapter:Verse-Verse"
    const bibleRefPattern = /^[1-3]?\s*[A-Za-z]+\s+\d+:\d+(-\d+)?$/;
    return bibleRefPattern.test(ref.trim());
  };

  const loadJournalNotes = async () => {
    try {
      setJournalLoading(true);
      
      // Read from the CORRECT storage key: 'journalNotes' (where + button saves)
      const existingNotes = await AsyncStorage.getItem('journalNotes');
      const notes = existingNotes ? JSON.parse(existingNotes) : [];
      
      // Also merge any notes from verse_data (long-press notes)
      const verseNotes = await VerseDataManager.getAllNotes();
      
      // Combine both sources, dedupe by id
      const allNotes = [...notes];
      const existingIds = new Set(notes.map(n => n.id));
      verseNotes.forEach(vn => {
        if (!existingIds.has(vn.id)) {
          allNotes.push(vn);
        }
      });
      
      // Sort by creation date (newest first)
      allNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setJournalNotes(allNotes);
      console.log(`📖 Loaded ${allNotes.length} journal notes (${notes.length} from journalNotes, ${verseNotes.length} from verse_data)`);
      
      // Fetch verse texts only for notes with valid Bible references
      const verseTexts = {};
      for (const note of allNotes) {
        if (isValidBibleReference(note.verseReference)) {
          try {
            console.log(`📖 Fetching verse: ${note.verseReference}`);
            const preferredVersion = await AsyncStorage.getItem('selectedBibleVersion') || 'niv';
            const verseData = await verseByReferenceService.getVerseByReference(
              note.verseReference,
              preferredVersion
            );
            if (verseData && verseData.text) {
              verseTexts[note.id] = verseData.text;
            }
          } catch (error) {
            console.error(`Error fetching verse for ${note.verseReference}:`, error);
            // Keep existing text if already cached
            if (journalVerseTexts[note.id]) {
              verseTexts[note.id] = journalVerseTexts[note.id];
            }
          }
        } else {
          console.log(`📝 Skipping non-verse reference: ${note.verseReference}`);
        }
      }
      setJournalVerseTexts(verseTexts);
    } catch (error) {
      console.error('Error loading journal notes:', error);
      // Attempt a fallback from journalNotes directly
      try {
        const existingNotes = await AsyncStorage.getItem('journalNotes');
        if (existingNotes) {
          const notes = JSON.parse(existingNotes);
          if (notes && notes.length > 0) {
            setJournalNotes(notes);
            console.log(`📖 Fallback loaded ${notes.length} journal notes`);
          }
        }
      } catch (fallbackErr) {
        console.error('Error in fallback load:', fallbackErr);
      }
    }
    setJournalLoading(false);
  };

  const loadCustomHighlightNames = async () => {
    try {
      const names = await VerseDataManager.getHighlightNames();
      setCustomHighlightNames(names);
      console.log(`🏷️ Loaded custom highlight names:`, Object.keys(names).length);
    } catch (error) {
      console.error('Error loading custom highlight names:', error);
    }
  };

  const loadHighlightViewMode = async () => {
    try {
      const mode = await AsyncStorage.getItem('highlightViewMode');
      if (mode) {
        setHighlightViewMode(mode);
      }
    } catch (error) {
      console.error('Error loading highlight view mode:', error);
    }
  };

  const saveHighlightViewMode = async (mode) => {
    try {
      await AsyncStorage.setItem('highlightViewMode', mode);
      setHighlightViewMode(mode);
      hapticFeedback.light();
    } catch (error) {
      console.error('Error saving highlight view mode:', error);
    }
  };

  const loadHighlights = async () => {
    try {
      const allData = await VerseDataManager.getAllVerseData();
      const highlights = [];
      
      Object.entries(allData).forEach(([verseId, data]) => {
        if (data.highlights && data.highlights.length > 0) {
          const latestHighlight = data.highlights[data.highlights.length - 1];
          highlights.push({
            verseId,
            color: latestHighlight.color,
            verseReference: latestHighlight.verseReference || verseId,
            timestamp: latestHighlight.createdAt
          });
        }
      });
      
      setHighlightedVerses(highlights);
      
      // Also load custom highlight names and view preference
      await loadCustomHighlightNames();
      await loadHighlightViewMode();
      
      console.log(`🎨 Loaded ${highlights.length} highlighted verses`);
    } catch (error) {
      console.error('Error loading highlights:', error);
    }
  };

  // Helper function to format date smartly
  const formatSmartDate = (dateString) => {
    const taskDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time to compare dates only
    const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    const time = taskDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (taskDateOnly.getTime() === todayOnly.getTime()) {
      return `Today at ${time}`;
    } else if (taskDateOnly.getTime() === yesterdayOnly.getTime()) {
      return `Yesterday at ${time}`;
    } else {
      // Show readable date for older tasks
      const dateStr = taskDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: taskDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
      return `${dateStr} at ${time}`;
    }
  };

  const loadCompletedTasks = async () => {
    try {
      console.log('🔍 Loading completed tasks from AsyncStorage...');
      const storedTodos = await AsyncStorage.getItem('fivefold_todos');
      console.log('📦 Raw stored todos:', storedTodos);
      
      if (storedTodos) {
        const todos = JSON.parse(storedTodos);
        console.log('📋 Total todos:', todos.length);
        
        // Use the EXACT same logic as the History card
        const completedHistory = todos
          .filter(todo => todo.completed)
          .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
        
        console.log('✅ Completed tasks count:', completedHistory.length);
        console.log('✅ Completed tasks:', completedHistory);
        
        setCompletedTodosList(completedHistory);
        
        // Update userStats with actual count
        setUserStats(prev => ({
          ...prev,
          completedTasks: completedHistory.length
        }));
      } else {
        console.log('❌ No todos found in storage');
        setCompletedTodosList([]);
        setUserStats(prev => ({
          ...prev,
          completedTasks: 0
        }));
      }
    } catch (error) {
      console.error('❌ Error loading completed tasks:', error);
      setCompletedTodosList([]);
      setUserStats(prev => ({
        ...prev,
        completedTasks: 0
      }));
    }
  };

  // Load verses with full text for a specific color
  const loadVersesForColor = async (color) => {
    try {
      const versesInColor = highlightedVerses.filter(v => v.color === color);
      const versesWithText = [];
      
      for (const verse of versesInColor) {
        try {
          const verseData = await verseByReferenceService.getVerseByReference(verse.verseReference);
          // Extract text from the returned object
          const verseText = typeof verseData === 'string' ? verseData : (verseData?.text || 'Verse text not available');
          versesWithText.push({
            ...verse,
            text: verseText
          });
        } catch (error) {
          console.error(`Error fetching verse ${verse.verseReference}:`, error);
          versesWithText.push({
            ...verse,
            text: 'Verse text not available'
          });
        }
      }
      
      setHighlightVersesWithText(versesWithText);
      setSelectedHighlightColor(color);
      console.log(`📖 Loaded ${versesWithText.length} verses for color ${color}`);
    } catch (error) {
      console.error('Error loading verses for color:', error);
    }
  };

  // Group highlights by color
  const groupHighlightsByColor = () => {
    const grouped = {};
    highlightedVerses.forEach(verse => {
      if (!grouped[verse.color]) {
        grouped[verse.color] = [];
      }
      grouped[verse.color].push(verse);
    });
    return grouped;
  };

  // Default color names lookup
  const defaultColorNames = {
    '#FFF9C4': 'Yellow', '#C8E6C9': 'Green', '#BBDEFB': 'Blue', '#F8BBD0': 'Pink',
    '#FFE0B2': 'Orange', '#E1BEE7': 'Purple', '#FFCCCB': 'Coral', '#B5EAD7': 'Mint',
    '#FFDAB9': 'Peach', '#E6E6FA': 'Lavender', '#D4F1A9': 'Lime', '#87CEEB': 'Sky',
    '#FFD1DC': 'Rose', '#C9DED4': 'Sage', '#FBCEB1': 'Apricot', '#C8A2C8': 'Lilac',
    '#FFF44F': 'Lemon', '#7FDBFF': 'Aqua', '#E0B0FF': 'Mauve', '#FFFDD0': 'Cream',
    '#B2DFDB': 'Teal', '#FFB3B3': 'Salmon', '#CCCCFF': 'Periwinkle', '#F7E7CE': 'Champagne',
    '#AFEEEE': 'Turquoise', '#FFE4E1': 'Blush', '#98FF98': 'Mint Green', '#89CFF0': 'Baby Blue',
    '#FFB6C1': 'Powder', '#FFFFCC': 'Butter', '#93E9BE': 'Seafoam', '#DA70D6': 'Orchid',
    '#FFD700': 'Honey', '#C1E1EC': 'Ice Blue', '#DE3163': 'Cherry', '#93C572': 'Pistachio',
    '#DDA0DD': 'Plum', '#FFCC00': 'Tangerine', '#F5DEB3': 'Sand', '#7FFFD4': 'Cyan',
    '#FF77FF': 'Magenta', '#FFDEAD': 'Melon', '#C4C3D0': 'Iris', '#FFE5B4': 'Gold',
    '#AFE1AF': 'Celadon', '#C9A0DC': 'Wisteria', '#FFEA00': 'Citrus', '#B0E0E6': 'Azure',
    '#F3E5AB': 'Vanilla', '#50C878': 'Emerald', '#9966CC': 'Amethyst', '#F0EAD6': 'Pearl',
    '#00A86B': 'Jade'
  };

  // Get color name from hex - checks custom names first, then default
  const getColorName = (hexColor) => {
    // Check for custom name first
    if (customHighlightNames[hexColor]) {
      return customHighlightNames[hexColor];
    }
    return defaultColorNames[hexColor] || 'Custom';
  };

  // Get the default name for a color (used in rename modal)
  const getDefaultColorName = (hexColor) => {
    return defaultColorNames[hexColor] || 'Custom';
  };

  // Handle renaming a highlight color
  const handleRenameHighlight = async () => {
    if (!renameHighlightColor || !renameHighlightText.trim()) return;
    
    try {
      hapticFeedback.success();
      await VerseDataManager.setHighlightName(renameHighlightColor, renameHighlightText.trim());
      
      // Update local state
      setCustomHighlightNames(prev => ({
        ...prev,
        [renameHighlightColor]: renameHighlightText.trim()
      }));
      
      setShowRenameHighlight(false);
      setRenameHighlightColor(null);
      setRenameHighlightText('');
    } catch (error) {
      console.error('Error renaming highlight:', error);
      Alert.alert('Error', 'Failed to rename highlight. Please try again.');
    }
  };

  // Reset highlight name to default
  const handleResetHighlightName = async (hexColor) => {
    try {
      hapticFeedback.light();
      await VerseDataManager.removeHighlightName(hexColor);
      
      // Update local state
      setCustomHighlightNames(prev => {
        const updated = { ...prev };
        delete updated[hexColor];
        return updated;
      });
    } catch (error) {
      console.error('Error resetting highlight name:', error);
    }
  };

  // PanResponders for interactive dismissal
  const savedVersesPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        console.log('📱 Saved Verses: Pan started');
      },
      onPanResponderMove: (_, gestureState) => {
        console.log('📱 Saved Verses: Dragging dy:', gestureState.dy);
        if (gestureState.dy > 0) {
          savedVersesSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('📱 Saved Verses: Released at dy:', gestureState.dy);
        if (gestureState.dy > 150) {
          console.log('📱 Saved Verses: Dismissing...');
          Animated.timing(savedVersesSlideAnim, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowSavedVerses(false);
          });
        } else {
          console.log('📱 Saved Verses: Bouncing back...');
          Animated.spring(savedVersesSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const journalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        console.log('📖 Journal: Pan started');
      },
      onPanResponderMove: (_, gestureState) => {
        console.log('📖 Journal: Dragging dy:', gestureState.dy);
        if (gestureState.dy > 0) {
          journalSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('📖 Journal: Released at dy:', gestureState.dy);
        if (gestureState.dy > 150) {
          console.log('📖 Journal: Dismissing...');
          Animated.timing(journalSlideAnim, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowJournal(false);
          });
        } else {
          console.log('📖 Journal: Bouncing back...');
          Animated.spring(journalSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const highlightsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        console.log('🎨 Highlights: Pan started');
      },
      onPanResponderMove: (_, gestureState) => {
        console.log('🎨 Highlights: Dragging dy:', gestureState.dy);
        if (gestureState.dy > 0) {
          highlightsSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('🎨 Highlights: Released at dy:', gestureState.dy);
        if (gestureState.dy > 150) {
          console.log('🎨 Highlights: Dismissing...');
          Animated.timing(highlightsSlideAnim, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowHighlights(false);
          });
        } else {
          console.log('🎨 Highlights: Bouncing back...');
          Animated.spring(highlightsSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const addJournalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          addJournalSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          Animated.timing(addJournalSlideAnim, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setIsAddingEntry(false);
            setNewJournalNote({ reference: '', text: '' });
            addJournalSlideAnim.setValue(600);
          });
        } else {
          Animated.spring(addJournalSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)  ).current;
  
  // Logo animations
  const logoSpin = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  
  // Modal card animations
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(50)).current;
  const cardShimmer = useRef(new Animated.Value(0)).current;

  const startShimmerAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardShimmer, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(cardShimmer, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Continuous logo animations
  const startLogoAnimations = () => {
    // Gentle spinning animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoSpin, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(logoSpin, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Reset states when modals close
  useEffect(() => {
    if (!showJournal) {
      setIsAddingEntry(false);
      setNewJournalNote({ reference: '', text: '' });
    }
  }, [showJournal]);

  // Ensure journal notes load whenever the journal modal opens
  useEffect(() => {
    if (showJournal) {
      loadJournalNotes();
    }
  }, [showJournal]);

  // Animate add journal entry modal
  useEffect(() => {
    if (isAddingEntry) {
      addJournalSlideAnim.setValue(600);
      Animated.spring(addJournalSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [isAddingEntry]);

  // Debug: Monitor showAddJournalNote state
  useEffect(() => {
    console.log('📝 showAddJournalNote changed to:', showAddJournalNote);
  }, [showAddJournalNote]);

  useEffect(() => {
    loadUserData();
    checkAiStatus();
    loadVibrationSetting();
    loadLiquidGlassSetting();
    loadSavedVerses();
    loadAppStreak();
    loadJournalNotes();
    loadHighlights();
    loadCompletedTasks();
    startLogoAnimations();
    startShimmerAnimation();
    // Start entrance animation
    createEntranceAnimation(slideAnim, fadeAnim, scaleAnim, 0, 0).start();
    // Header appears after content
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 300,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  // Force refresh all data when Profile tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('👤 Profile tab focused - refreshing all data');
      loadUserData();
      loadSavedVerses();
      loadAppStreak();
      loadJournalNotes();
      loadHighlights();
      loadCompletedTasks();
    }, [])
  );

  useEffect(() => {
    if (showAboutModal) {
      // Animate modal entrance
      modalFadeAnim.setValue(0);
      modalSlideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAboutModal]);

  // Refresh saved verses when modal becomes visible
  useEffect(() => {
    if (showSavedVerses) {
      console.log('📖 Saved verses modal opened, refreshing data...');
      loadSavedVerses();
    }
  }, [showSavedVerses]);

  // Refresh completed tasks when modal becomes visible
  useEffect(() => {
    if (showTasksDone) {
      console.log('✅ Tasks Done modal opened, refreshing data...');
      loadCompletedTasks();
    }
  }, [showTasksDone]);

  // Listen for task completion events
  useEffect(() => {
    const taskCompletedListener = DeviceEventEmitter.addListener('taskCompleted', () => {
      console.log('✅ Task completed event received, refreshing data...');
      loadCompletedTasks();
      loadUserData(); // Also refresh user stats
    });

    return () => {
      taskCompletedListener.remove();
    };
  }, []);

  const loadUserData = async () => {
    try {
      const storedStats = await getStoredData('userStats') || {};
      const storedProfile = await AsyncStorage.getItem('userProfile');
      
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setUserProfile(profile);
        setUserName(profile.name || 'Faithful Friend');
        setEditName(profile.name || 'Faithful Friend');
        setProfilePicture(profile.profilePicture);
        
        // Set country object from profile data
        if (profile.countryCode) {
          const countryObj = {
            code: profile.countryCode,
            name: profile.country,
            flag: profile.countryFlag
          };
          setSelectedCountry(countryObj);
        }
      } else {
        // Fallback to old data format
        const storedName = await getStoredData('userName') || 'Faithful Friend';
        const storedPhoto = await getStoredData('profilePicture');
        setUserName(storedName);
        setEditName(storedName);
        if (storedPhoto) {
          setProfilePicture(storedPhoto);
        }
      }

      // Load Bible version preferences
      const storedBibleVersion = await AsyncStorage.getItem('selectedBibleVersion');
      if (storedBibleVersion) {
        setSelectedBibleVersion(storedBibleVersion);
      } else {
        // Default to NIV if no version selected
        setSelectedBibleVersion('niv');
      }

      // Load weight unit preference
      const storedWeightUnit = await AsyncStorage.getItem('weightUnit');
      if (storedWeightUnit) {
        setWeightUnit(storedWeightUnit);
      } else {
        setWeightUnit('kg'); // Default to kg
      }
      
      // Load audio voice preference
      const audioSettings = bibleAudioService.getSettings();
      setAudioVoiceGender(audioSettings.voiceGender || 'female');

      const storedPurchasedVersions = await AsyncStorage.getItem('purchasedBibleVersions');
      if (storedPurchasedVersions) {
        setPurchasedVersions(JSON.parse(storedPurchasedVersions));
      }
      
      // Load actual points from PrayerCompletionManager
      const totalPoints = await PrayerCompletionManager.getTotalPoints();
      const level = AchievementService.getLevelFromPoints(totalPoints);
      
      // Get actual completed tasks count from todos
      const storedTodos = await AsyncStorage.getItem('fivefold_todos');
      let actualCompletedCount = 0;
      if (storedTodos) {
        const todos = JSON.parse(storedTodos);
        actualCompletedCount = todos.filter(todo => todo.completed).length;
      }
      
      setUserStats({
        points: totalPoints,
        level: level,
        completedTasks: actualCompletedCount, // Use actual count, not cached
        streak: 0,
        badges: [],
        versesRead: 25,
        prayersCompleted: 12,
        ...storedStats,
        completedTasks: actualCompletedCount, // Override cached value with actual
      });
      
      console.log(`📊 Profile loaded: ${totalPoints} points, Level ${level}, ${actualCompletedCount} completed tasks`);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticFeedback.gentle(); // Nice haptic feedback when pulling
    
    try {
      // Reload all user data
      await loadUserData();
      await checkAiStatus();
      await loadVibrationSetting();
      
      // Add a small delay to make the refresh feel more responsive
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
      hapticFeedback.success(); // Success haptic when done
    }
  }, []);

  const saveProfileChanges = async () => {
    // Prevent multiple saves
    if (isSavingProfile) {
      console.log('Save already in progress, ignoring...');
      return;
    }

    try {
      console.log('Starting profile save...', { editName, selectedCountry });
      setIsSavingProfile(true);
      
      setUserName(editName);
      
      // Save new profile format
      const profileData = {
        name: editName,
        profilePicture: profilePicture,
        country: selectedCountry?.name || null,
        countryCode: selectedCountry?.code || null,
        countryFlag: selectedCountry?.flag || null,
        joinedDate: userProfile?.joinedDate || new Date().toISOString(),
      };
      
      console.log('Profile data to save:', profileData);
      
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
      setUserProfile(profileData);
      
      // Also save in old format for backwards compatibility
      await saveData('userName', editName);
      if (profilePicture) {
        await saveData('profilePicture', profilePicture);
      }
      
      // Emit event to notify other components
      DeviceEventEmitter.emit('userNameChanged');
      
      console.log('Profile saved successfully');
      
      // Reset saving state first
      setIsSavingProfile(false);
      
      // Close modal immediately - no delays needed
      setShowEditModal(false);
      
      // Haptic feedback after modal closes
      setTimeout(() => {
        try {
          hapticFeedback.profileUpdate();
        } catch (hapticError) {
          console.log('Haptic feedback error (non-critical):', hapticError);
        }
      }, 200);
      
    } catch (error) {
      console.error('Failed to save profile changes:', error);
      setIsSavingProfile(false);
      // Still close modal even if save fails
      setShowEditModal(false);
    }
  };

  const handleProfilePhotoSelected = async (imageUri) => {
    try {
      setProfilePicture(imageUri);
      await saveData('profilePicture', imageUri);
      hapticFeedback.photoCapture();
    } catch (error) {
      console.error('Failed to save profile picture:', error);
    }
  };

  const checkAiStatus = async () => {
    try {
      // Smart features are now always enabled through the secure proxy server
      setAiEnabled(true);
      console.log('✅ Smart Features: Enabled via secure proxy server');
    } catch (error) {
      console.error('Failed to check AI status:', error);
      setAiEnabled(true); // Still enabled through proxy
    }
  };

  const loadVibrationSetting = async () => {
    try {
      const setting = await AsyncStorage.getItem('fivefold_vibration');
      setVibrationEnabled(setting !== 'false');
    } catch (error) {
      console.log('Error loading vibration setting:', error);
    }
  };

  const handleVibrationToggle = async (enabled) => {
    setVibrationEnabled(enabled);
    await updateHapticsSetting(enabled);
  };

  const loadLiquidGlassSetting = async () => {
    try {
      const setting = await AsyncStorage.getItem('fivefold_liquidGlass');
      if (setting !== null) {
        const enabled = setting === 'true';
        setLiquidGlassEnabled(enabled);
        global.liquidGlassUserPreference = enabled;
      }
    } catch (error) {
      console.log('Error loading liquid glass setting:', error);
    }
  };

  const handleLiquidGlassToggle = async (enabled) => {
    setLiquidGlassEnabled(enabled);
    await AsyncStorage.setItem('fivefold_liquidGlass', enabled.toString());
    global.liquidGlassUserPreference = enabled;
    hapticFeedback.light();
    
    // Notify all components about the change
    DeviceEventEmitter.emit('liquidGlassChanged', enabled);
    console.log('💎 Broadcast: Liquid glass changed to', enabled);
  };

  const handleBibleVersionSelect = async (versionId) => {
    try {
      // Only allow selecting available versions
      const version = bibleVersions.find(v => v.id === versionId);
      if (!version || !version.isAvailable) {
        return;
      }
      
      // Set as selected version
      setSelectedBibleVersion(versionId);
      await AsyncStorage.setItem('selectedBibleVersion', versionId);
      
      // Close modal
      setShowBibleVersionModal(false);
      
      // Haptic feedback
      hapticFeedback.success();
      
      // Automatically refresh the app to reflect new Bible version
      console.log('🔄 Triggering FULL APP RELOAD for Bible version change to:', versionId);
      
      // Emit event to trigger full app reload (shows splash screen)
      DeviceEventEmitter.emit('bibleVersionChanged', versionId);
      console.log('📡 Broadcast: Bible version changed to', versionId);
    } catch (error) {
      console.error('Failed to select Bible version:', error);
      Alert.alert('Error', 'Failed to update Bible version. Please try again.');
    }
  };



  const handleEnableAi = async () => {
    try {
      // Smart features are always enabled through secure proxy
      Alert.alert(
        '✨ Smart Features Active!',
        'Intelligent task scoring and Friend chat are powered by our secure cloud service.\n\n✅ API keys secured in the cloud\n✅ No credentials stored on device\n✅ Professional-grade security',
        [
          { text: 'Excellent!', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Failed to handle AI status:', error);
    }
  };

  // Handle navigation to specific Bible verse
  const handleNavigateToVerse = useCallback((verseRef) => {
    console.log('📖 ProfileTab: Navigating to verse:', verseRef);
    hapticFeedback.medium();
    setVerseReference(verseRef);
    setShowSavedVerses(false);
    // IMPORTANT: also close Highlights, otherwise Bible can open "behind" this modal
    // which makes the button appear broken.
    setShowHighlights(false);
    setSelectedHighlightColor(null);
    setHighlightVersesWithText([]);
    setTimeout(() => {
      setShowBible(true);
    }, 300);
  }, []);

  // These functions are no longer needed as we use the secure proxy server
  // Keeping empty stubs to prevent any reference errors
  const enableDeepSeekAI = () => {};
  const clearApiKey = () => {};

  // Calculate level progress - mirrors AchievementService (exp to 9, flat after)
  const levelThresholds = [0, 1000, 3000, 7000, 15000, 31000, 63000, 127000, 255000]; // Level 1..9

  const getThresholdForLevel = (lvl) => {
    if (lvl <= 1) return 0;
    if (lvl <= levelThresholds.length) return levelThresholds[lvl - 1];
    const extraLevels = lvl - levelThresholds.length;
    return levelThresholds[levelThresholds.length - 1] + extraLevels * 128000;
  };

  const getPointsNeededForNextLevel = (lvl) => {
    if (lvl < 1) return 1000;
    if (lvl < levelThresholds.length) {
      return levelThresholds[lvl] - levelThresholds[lvl - 1];
    }
    return 128000; // flat after level 9
  };

  const currentPoints = Math.max(userStats.points || 0, 0);
  const currentLevelThreshold = getThresholdForLevel(userStats.level);
  const nextLevelPoints = getPointsNeededForNextLevel(userStats.level);
  const nextTarget = currentLevelThreshold + nextLevelPoints;
  const progress = Math.min(
    nextLevelPoints > 0 ? (currentPoints - currentLevelThreshold) / nextLevelPoints : 0,
    1
  );

  // Profile Header Component
  const ProfileHeader = () => {
    // Liquid Glass Container for Profile Header
    const LiquidGlassProfileContainer = ({ children }) => {
      if (!isLiquidGlassSupported) {
        return (
          <BlurView 
            intensity={18} 
            tint={isDark ? "dark" : "light"} 
            style={[styles.profileCard, { 
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.05)' 
                : `${theme.primary}15`
            }]}
          >
            {children}
          </BlurView>
        );
      }

      return (
        <LiquidGlassView
          interactive={true}
          effect="clear"
          colorScheme="system"
          tintColor="rgba(255, 255, 255, 0.08)"
          style={styles.liquidGlassProfileCard}
        >
          {children}
        </LiquidGlassView>
      );
    };

    return (
      <LiquidGlassProfileContainer>
      {/* Edit Button with Fluid Animation */}
      <FluidButton
        style={styles.editButton}
        onPress={() => {
          setEditName(userName);
          setShowEditModal(true);
          hapticFeedback.buttonPress();
        }}
        hapticType="light"
      >
        <TouchableOpacity style={styles.editButtonInner}>
          <MaterialIcons name="edit" size={20} color={theme.primary} />
        </TouchableOpacity>
      </FluidButton>

      <TouchableOpacity 
        style={[styles.avatarContainer, { backgroundColor: theme.primary }]}
        onPress={() => setShowEditModal(true)}
      >
        {profilePicture ? (
          <Image source={{ uri: profilePicture }} style={styles.profileImage} />
        ) : (
          <MaterialIcons name="person" size={40} color="#FFFFFF" />
        )}
      </TouchableOpacity>
      
      <View style={{ alignItems: 'center' }}>
      <Text style={[styles.userName, { color: theme.text }]}>
        {userName} {selectedCountry?.flag || '🌍'}
      </Text>
        
        {/* Streak Display */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: `${theme.warning}20`,
          borderRadius: 20,
        }}>
          <Text style={{ fontSize: 18, marginRight: 6 }}>
            {AppStreakManager.getStreakEmoji(appStreak)}
          </Text>
          <Text style={[{
            fontSize: 15,
            fontWeight: '700',
            color: theme.warning
          }]}>
            {appStreak} Day Streak
          </Text>
        </View>
      </View>
      
      <Text style={[styles.userLevel, { color: theme.textSecondary }]}>
        {t.level || 'Level'} {userStats.level} {t.believer || 'Believer'}
      </Text>
      
      {/* Level Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {currentPoints.toLocaleString()} / {nextTarget.toLocaleString()} {t.points || 'points'}
          </Text>
          <Text style={[styles.progressLevel, { color: theme.primary }]}>
            {t.level || 'Level'} {userStats.level + 1}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.surface }]}>
          <View 
            style={[styles.progressFill, { 
              backgroundColor: theme.primary,
              width: `${progress * 100}%`
            }]} 
          />
        </View>
      </View>
      </LiquidGlassProfileContainer>
    );
  };

  // Stats Grid Component
  const StatsGrid = () => {
    // Liquid Glass Container for Stats Grid
    const LiquidGlassStatsContainer = ({ children }) => {
      if (!isLiquidGlassSupported) {
        return (
          <BlurView 
            intensity={18} 
            tint={isDark ? "dark" : "light"} 
            style={[styles.statsCard, { 
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.05)' 
                : `${theme.primary}15`
            }]}
          >
            {children}
          </BlurView>
        );
      }

      return (
        <LiquidGlassView
          interactive={true}
          effect="clear"
          colorScheme="system"
          tintColor="rgba(255, 255, 255, 0.08)"
          style={styles.liquidGlassStatsCard}
        >
          {children}
        </LiquidGlassView>
      );
    };

    return (
      <LiquidGlassStatsContainer>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.yourJourney || 'Your Journey'}</Text>
      
      <View style={styles.statsGrid}>
        <AnimatedStatCard 
          style={[styles.statBox, { 
            backgroundColor: `${theme.primary}30`,
            borderColor: `${theme.primary}99`,
            borderWidth: 0.8,
            borderRadius: 16,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 1,
          }]}
          onPress={() => {
            hapticFeedback.light();
            setShowTasksDone(true);
            loadCompletedTasks(); // Load data in background after modal opens
          }}
        >
          <MaterialIcons name="check-circle" size={24} color={theme.success} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {userStats.completedTasks || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t.tasksDone || 'Tasks Done'}
          </Text>
        </AnimatedStatCard>
        
        <AnimatedStatCard 
          style={[styles.statBox, { 
            backgroundColor: `${theme.primary}30`,
            borderColor: `${theme.primary}99`,
            borderWidth: 0.8,
            borderRadius: 16,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 1,
          }]}
          onPress={() => {
            hapticFeedback.light();
            setShowSavedVerses(true);
            loadSavedVerses(); // Load data in background after modal opens
          }}
        >
          <MaterialIcons name="bookmark" size={24} color={theme.info} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {savedVersesList.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t.savedVerses || 'Saved Verses'}
          </Text>
        </AnimatedStatCard>
        
        <AnimatedStatCard
          style={[styles.statBox, { 
          backgroundColor: `${theme.primary}30`,
          borderColor: `${theme.primary}99`,
          borderWidth: 0.8,
          borderRadius: 16,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
          }]}
          onPress={() => {
            hapticFeedback.light();
            setShowHighlights(true);
            loadHighlights(); // Load data in background after modal opens
          }}
        >
          <MaterialIcons name="palette" size={24} color={theme.warning} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {highlightedVerses.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t.highlights || 'Highlights'}
          </Text>
        </AnimatedStatCard>
        
        <AnimatedStatCard
          style={[styles.statBox, { 
          backgroundColor: 'rgba(30, 64, 175, 0.30)', // See-through deep blue at 30% opacity
          borderColor: 'rgba(30, 64, 175, 0.6)', // Semi-transparent deep blue border
          borderWidth: 0.8, // Very subtle border
          borderRadius: 16, // Smooth rounded corners - no sharp edges!
          shadowColor: '#1E40AF', // Deep blue shadow
          shadowOffset: { width: 0, height: 1 }, // Minimal shadow
          shadowOpacity: 0.06, // Very subtle shadow
          shadowRadius: 3, // Small shadow radius
          elevation: 1, // Minimal elevation
          // Add glow effect for different themes
          ...(isBlushTheme && {
            shadowColor: '#FF69B4',
            backgroundColor: 'rgba(255, 182, 193, 0.2)', // Keep Blush at 20%
            borderColor: 'rgba(255, 105, 180, 0.4)',
          }),
          ...(isCresviaTheme && {
            shadowColor: '#8A2BE2',
            backgroundColor: 'rgba(138, 43, 226, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
            borderColor: 'rgba(147, 112, 219, 0.15)', // Very subtle border
          }),
          ...(isEternaTheme && {
            shadowColor: '#4B0082',
            backgroundColor: 'rgba(75, 0, 130, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
            borderColor: 'rgba(72, 61, 139, 0.15)', // Very subtle border
          }),
          ...(isFaithTheme && {
            shadowColor: '#4A90E2', // Sky blue glow - Faith theme
            backgroundColor: 'rgba(74, 144, 226, 0.30)', // See-through sky blue at 30% - Faith theme
            borderColor: 'rgba(74, 144, 226, 0.6)', // Semi-transparent sky blue border - Faith theme
          }),
          ...(isSailormoonTheme && {
            shadowColor: '#C8A2D0', // Soft purple glow - Sailor Moon theme
            backgroundColor: 'rgba(200, 162, 208, 0.30)', // See-through soft purple at 30% - Sailor Moon theme
            borderColor: 'rgba(200, 162, 208, 0.6)', // Semi-transparent soft purple border - Sailor Moon theme
          }),
          ...(isSpidermanTheme && {
            shadowColor: '#E31E24', // Red glow - Spiderman theme
            backgroundColor: 'rgba(227, 30, 36, 0.30)', // See-through red at 30% - Spiderman theme
            borderColor: 'rgba(227, 30, 36, 0.6)', // Semi-transparent red border - Spiderman theme
          }),
          }]}
          onPress={() => {
            hapticFeedback.light();
            setShowJournal(true);
            loadJournalNotes(); // Load data in background after modal opens
          }}
        >
          <MaterialIcons name="book" size={24} color={theme.info} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {journalNotes.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t.journal || 'Journal'}
          </Text>
        </AnimatedStatCard>
      </View>
      </LiquidGlassStatsContainer>
    );
  };

  // Badges Section
  const BadgesSection = () => {
    const sampleBadges = [
      { id: 1, name: "First Prayer", icon: "favorite", earned: true },
      { id: 2, name: "Bible Reader", icon: "menu-book", earned: true },
      { id: 3, name: "Task Master", icon: "check-circle", earned: false },
      { id: 4, name: "Week Warrior", icon: "local-fire-department", earned: false },
    ];

    return (
      <AnimatedSettingsCard 
        style={styles.badgesCard}
        onPress={() => {
          setShowAchievements(true);
          hapticFeedback.achievement();
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Achievements</Text>
          <MaterialIcons name="chevron-right" size={20} color={theme.primary} />
        </View>
        
        <View style={styles.badgesGrid}>
          {sampleBadges.map(badge => (
            <View 
              key={badge.id} 
              style={[
                styles.badgeItem, 
                { 
                  backgroundColor: 'rgba(30, 64, 175, 0.30)', // See-through deep blue at 30% opacity
                  borderWidth: 0.8, // Very subtle border
                  borderColor: 'rgba(30, 64, 175, 0.6)', // Semi-transparent deep blue border
                  borderRadius: 16, // Smooth rounded corners - no sharp edges!
                  shadowColor: '#1E40AF', // Deep blue shadow
                  shadowOffset: { width: 0, height: 1 }, // Minimal shadow
                  shadowOpacity: 0.06, // Very subtle shadow
                  shadowRadius: 3, // Small shadow radius
                  elevation: 1, // Minimal elevation
                  // Add glow effect for different themes
                  ...(isBlushTheme && {
                    shadowColor: '#FF69B4',
                    backgroundColor: 'rgba(255, 182, 193, 0.2)', // Keep Blush at 20%
                    borderColor: 'rgba(255, 105, 180, 0.4)',
                  }),
                  ...(isCresviaTheme && {
                    shadowColor: '#8A2BE2',
                    backgroundColor: 'rgba(138, 43, 226, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
                    borderColor: 'rgba(147, 112, 219, 0.15)', // Very subtle border
                  }),
                  ...(isEternaTheme && {
                    shadowColor: '#4B0082',
                    backgroundColor: 'rgba(75, 0, 130, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
                    borderColor: 'rgba(72, 61, 139, 0.15)', // Very subtle border
                  }),
                  ...(isFaithTheme && {
                    shadowColor: '#4A90E2', // Sky blue glow - Faith theme
                    backgroundColor: 'rgba(74, 144, 226, 0.30)', // See-through sky blue at 30% - Faith theme
                    borderColor: 'rgba(74, 144, 226, 0.6)', // Semi-transparent sky blue border - Faith theme
                  }),
                  ...(isSailormoonTheme && {
                    shadowColor: '#C8A2D0', // Soft purple glow - Sailor Moon theme
                    backgroundColor: 'rgba(200, 162, 208, 0.30)', // See-through soft purple at 30% - Sailor Moon theme
                    borderColor: 'rgba(200, 162, 208, 0.6)', // Semi-transparent soft purple border - Sailor Moon theme
                  }),
                  ...(isSpidermanTheme && {
                    shadowColor: '#E31E24', // Red glow - Spiderman theme
                    backgroundColor: 'rgba(227, 30, 36, 0.30)', // See-through red at 30% - Spiderman theme
                    borderColor: 'rgba(227, 30, 36, 0.6)', // Semi-transparent red border - Spiderman theme
                  }),
                },
                !badge.earned && { opacity: 0.5 }
              ]}
            >
              <MaterialIcons 
                name={badge.icon} 
                size={20} 
                color={badge.earned ? theme.primary : theme.textTertiary} 
              />
              <Text style={[
                styles.badgeText, 
                { color: badge.earned ? theme.text : theme.textTertiary }
              ]}>
                {badge.name}
              </Text>
            </View>
          ))}
        </View>
        
          <View style={[styles.viewAllButton, { 
            backgroundColor: 'rgba(30, 64, 175, 0.30)', // See-through deep blue at 30% opacity
            borderWidth: 0.8, // Very subtle border
            borderColor: 'rgba(30, 64, 175, 0.6)', // Semi-transparent deep blue border
            shadowColor: '#1E40AF', // Deep blue shadow
            shadowOffset: { width: 0, height: 1 }, // Minimal shadow
            shadowOpacity: 0.06, // Very subtle shadow
            shadowRadius: 3, // Small shadow radius
            elevation: 1, // Minimal elevation
            // Add glow effect for different themes
            ...(isBlushTheme && {
              shadowColor: '#FF69B4',
              backgroundColor: 'rgba(255, 182, 193, 0.2)', // Keep Blush at 20%
              borderColor: 'rgba(255, 105, 180, 0.4)',
            }),
            ...(isCresviaTheme && {
              shadowColor: '#8A2BE2',
              backgroundColor: 'rgba(138, 43, 226, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
              borderColor: 'rgba(147, 112, 219, 0.15)', // Very subtle border
            }),
            ...(isEternaTheme && {
              shadowColor: '#4B0082',
              backgroundColor: 'rgba(75, 0, 130, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
              borderColor: 'rgba(72, 61, 139, 0.15)', // Very subtle border
            }),
            ...(isFaithTheme && {
              shadowColor: '#4A90E2', // Sky blue glow - Faith theme
              backgroundColor: 'rgba(74, 144, 226, 0.30)', // See-through sky blue at 30% - Faith theme
              borderColor: 'rgba(74, 144, 226, 0.6)', // Semi-transparent sky blue border - Faith theme
            }),
            ...(isSailormoonTheme && {
              shadowColor: '#C8A2D0', // Soft purple glow - Sailor Moon theme
              backgroundColor: 'rgba(200, 162, 208, 0.30)', // See-through soft purple at 30% - Sailor Moon theme
              borderColor: 'rgba(200, 162, 208, 0.6)', // Semi-transparent soft purple border - Sailor Moon theme
            }),
            ...(isSpidermanTheme && {
              shadowColor: '#E31E24', // Red glow - Spiderman theme
              backgroundColor: 'rgba(227, 30, 36, 0.30)', // See-through red at 30% - Spiderman theme
              borderColor: 'rgba(227, 30, 36, 0.6)', // Semi-transparent red border - Spiderman theme
            }),
          }]}>
            <Text style={[styles.viewAllText, { color: theme.primary }]}>
              View All Achievements
            </Text>
          </View>
      </AnimatedSettingsCard>
    );
  };

  // Settings Button - Single button that opens modal
  const SettingsButton = () => (
    <AnimatedSettingsCard 
      style={[styles.aboutCard, { marginTop: 12 }]}
      onPress={() => {
        hapticFeedback.buttonPress();
        Alert.alert('New tools coming soon', 'Fresh controls and shortcuts are on the way.');
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
        <View style={styles.settingLeft}>
          <MaterialIcons name="auto-awesome" size={24} color={theme.primary} />
          <Text style={[styles.aboutButtonText, { color: theme.text }]}>
            New tools coming soon
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.textTertiary} />
      </View>
    </AnimatedSettingsCard>
  );

  // Changes Button - sits between Settings and About
  const ChangesButton = () => (
    <AnimatedSettingsCard 
      style={styles.aboutCard}
      onPress={() => {
        hapticFeedback.buttonPress();
        setShowSettingsModal(true); // Open the settings modal
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
        <View style={styles.settingLeft}>
          <MaterialIcons name="settings" size={24} color={theme.primary} />
          <Text style={[styles.aboutButtonText, { color: theme.text }]}>
            Settings
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.textTertiary} />
      </View>
    </AnimatedSettingsCard>
  );

  // About Section - Separate card
  const AboutSection = () => (
    <AnimatedSettingsCard 
      style={styles.aboutCard}
      onPress={() => {
        hapticFeedback.buttonPress();
        Alert.alert(
            'About Biblely', 
            'A Christian productivity app for faith and focus.\n\nVersion 1.0.0\n\nMade with ❤️ for believers worldwide.'
          );
        }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
        <View style={styles.settingLeft}>
          <MaterialIcons name="info" size={24} color={theme.primary} />
          <Text style={[styles.aboutButtonText, { color: theme.text }]}>
            About Biblely
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.textTertiary} />
      </View>
    </AnimatedSettingsCard>
  );

  return (
    <>
    <AnimatedWallpaper 
      scrollY={wallpaperScrollY}
      parallaxFactor={0.3}
      blurOnScroll={false}
      fadeOnScroll={false}
      scaleOnScroll={true}
    >
      <View style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme || isSpidermanTheme || isFaithTheme || isSailormoonTheme) ? 'transparent' : theme.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.background}
        />
      
      {/* Fixed Header - Always Visible - Glassy */}
      <GlassHeader 
        style={[styles.fixedHeader, { 
          backgroundColor: isDark 
            ? 'rgba(255, 255, 255, 0.05)' 
            : `${theme.primary}15` // Same as cards - use theme primary color with 15% opacity
        }]}
        intensity={15}
        absolute={false}
      >
        <View style={styles.headerContent}>
          {/* Animated Logo positioned on the left */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.heavy();
              setShowAboutModal(true);
            }}
            activeOpacity={0.7}
          >
            <Animated.Image 
              source={require('../../assets/logo.png')} 
              style={[
                styles.headerLogo,
                {
                  backgroundColor: 'transparent',
                  transform: [
                    {
                      rotate: logoSpin.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    },
                    { scale: logoPulse },
                    {
                      translateY: logoFloat.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -6]
                      })
                    }
                  ],
                  shadowColor: theme.primary,
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 0 },
                }
              ]}
              resizeMode="contain"
            />
          </TouchableOpacity>
          
          {/* Centered text content */}
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{t.profile || 'Profile'}</Text>
          </View>
        </View>
      </GlassHeader>

      {/* Main Content - flows to top like Twitter */}
      <Animated.ScrollView 
        style={styles.twitterContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.twitterScrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: wallpaperScrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.background}
            title={t.pullToRefresh || "Pull to refresh"}
            titleColor={theme.textSecondary}
          />
        }
      >
        {/* Header spacing to prevent overlap when header is visible */}
        <View style={styles.headerSpacer} />
        
        {/* Profile Header */}
        <ProfileHeader />
        
        {/* Stats Grid */}
        <StatsGrid />
        
        {/* Badges Section */}
        <BadgesSection />
        <SettingsButton />
        <ChangesButton />
        <AboutSection />
      </Animated.ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => {
              console.log('Canceling profile edit...');
              setShowEditModal(false);
              setCountrySearchQuery(''); // Clear search when canceling
            }}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>
            <TouchableOpacity 
              onPress={saveProfileChanges}
              disabled={isSavingProfile}
              style={{ opacity: isSavingProfile ? 0.5 : 1 }}
            >
              <Text style={[styles.modalSave, { color: theme.primary }]}>
                {isSavingProfile ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.editSection}>
              <Text style={[styles.editLabel, { color: theme.text }]}>Profile Picture</Text>
              
              {/* Current profile picture preview */}
              <View style={styles.photoPreviewContainer}>
                <View style={[styles.photoPreview, { backgroundColor: theme.primary + '20' }]}>
                  {profilePicture ? (
                    <Image
                      source={{ uri: profilePicture }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <MaterialIcons name="person" size={40} color={theme.primary} />
                  )}
                </View>
              </View>
              
              {/* Photo picker component */}
              <ProfilePhotoPicker onImageSelected={handleProfilePhotoSelected} />
            </View>

            <View style={styles.editSection}>
              <Text style={[styles.editLabel, { color: theme.text }]}>Display Name</Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.editSection}>
              <Text style={[styles.editLabel, { color: theme.text }]}>Country</Text>
              <TouchableOpacity
                style={[styles.countrySelectButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => {
                  console.log('Country picker button pressed');
                  console.log('Countries available:', countries?.length || 'undefined');
                  console.log('Current selected country:', selectedCountry);
                  console.log('showCountryPicker BEFORE:', showCountryPicker);
                  setShowCountryPicker(true);
                  console.log('setShowCountryPicker(true) called');
                  // Check state after a brief delay
                  setTimeout(() => {
                    console.log('showCountryPicker AFTER:', showCountryPicker);
                  }, 100);
                }}
              >
                <View style={styles.countrySelectContent}>
                  <Text style={styles.countryFlag}>
                    {selectedCountry?.flag || '🏳️'}
                  </Text>
                  <Text style={[styles.countrySelectText, { color: selectedCountry ? theme.text : theme.textSecondary }]}>
                    {selectedCountry?.name || 'Select Country'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Country Picker Modal - INSIDE Edit Profile Modal */}
          <Modal 
            visible={showCountryPicker} 
            animationType="slide" 
            transparent={false}
            onShow={() => console.log('✅ Country picker modal OPENED successfully!')}
            onRequestClose={() => {
              console.log('Modal close requested');
              setShowCountryPicker(false);
            }}
          >
            <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 60 }}>
              <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#ccc' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => {
                    console.log('Cancel pressed');
                    setShowCountryPicker(false);
                    setCountrySearchQuery('');
                  }}>
                    <Text style={{ color: '#007AFF', fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Select Country</Text>
                  <TouchableOpacity onPress={() => {
                    console.log('Done pressed');
                    setShowCountryPicker(false);
                    setCountrySearchQuery('');
                  }}>
                    <Text style={{ color: '#007AFF', fontSize: 16 }}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TextInput
                style={{ 
                  margin: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 8,
                  fontSize: 16
                }}
                placeholder="Search countries..."
                value={countrySearchQuery}
                onChangeText={(text) => {
                  console.log('Search text changed:', text);
                  setCountrySearchQuery(text);
                }}
              />
              
              <ScrollView style={{ flex: 1 }}>
                <Text style={{ padding: 16, fontSize: 14, color: '#666' }}>
                  Countries loaded: {countries?.length || 'ERROR: undefined'}
                </Text>
                {countries && countries.length > 0 ? (
                  countries
                    .filter(country => 
                      country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
                    )
                    .map((country) => (
                      <TouchableOpacity
                        key={country.code}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 16,
                          borderBottomWidth: 1,
                          borderBottomColor: '#eee',
                          backgroundColor: selectedCountry?.code === country.code ? '#f0f0f0' : 'transparent'
                        }}
                        onPress={() => {
                          console.log('Country selected:', country.name);
                          setSelectedCountry(country);
                          setShowCountryPicker(false);
                          setCountrySearchQuery('');
                        }}
                      >
                        <Text style={{ fontSize: 24, marginRight: 12 }}>{country.flag}</Text>
                        <Text style={{ fontSize: 16, flex: 1 }}>{country.name}</Text>
                        {selectedCountry?.code === country.code && (
                          <MaterialIcons name="check" size={20} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    ))
                ) : (
                  <Text style={{ padding: 16, color: 'red' }}>ERROR: Countries not loaded!</Text>
                )}
              </ScrollView>
            </View>
          </Modal>
        </View>
      </Modal>

      {/* Achievements Modal */}
      <AchievementsModal 
        visible={showAchievements} 
        onClose={() => setShowAchievements(false)}
        userStats={userStats}
      />

      {/* Animation Demo Modal */}
      <AnimationDemo
        visible={showAnimationDemo}
        onClose={() => setShowAnimationDemo(false)}
      />

      {/* Notification Settings Modal */}
      <NotificationSettings
        visible={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />


      {/* Bible Version Modal */}
      <Modal 
        visible={showBibleVersionModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBibleVersionModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowBibleVersionModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Bible Version</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionHeader, { color: theme.text, marginBottom: 15 }]}>
              Select Bible Version
            </Text>
            
            {bibleVersions && bibleVersions.map((version) => {
              const isSelected = selectedBibleVersion === version.id;
              const isAvailable = version.isAvailable !== false;
              
              return (
                <TouchableOpacity
                  key={version.id}
                  style={[
                    styles.versionItem, 
                    { 
                      backgroundColor: theme.card,
                      marginBottom: 10,
                      padding: 15,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    },
                    isSelected && { borderColor: theme.primary, borderWidth: 2 },
                    !isAvailable && { opacity: 0.6 }
                  ]}
                  onPress={() => {
                    if (isAvailable) {
                      handleBibleVersionSelect(version.id);
                    }
                  }}
                  activeOpacity={isAvailable ? 0.7 : 1}
                  disabled={!isAvailable}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.versionName, { color: theme.text, fontSize: 16, fontWeight: '600' }]}>
                      {version.name}
                    </Text>
                    <Text style={[styles.versionAbbreviation, { color: theme.textSecondary, fontSize: 14, marginTop: 2 }]}>
                      {version.abbreviation}
                    </Text>
                    {!isAvailable && (
                      <Text style={[styles.comingSoonText, { color: theme.primary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }]}>
                        Coming Soon
                      </Text>
                    )}
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isSelected && isAvailable && (
                      <MaterialIcons name="check-circle" size={24} color={theme.primary} style={{ marginRight: 8 }} />
                    )}
                    {!isAvailable && (
                      <MaterialIcons name="lock" size={20} color={theme.textTertiary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
      
      {/* Language Selection Modal */}
      <Modal 
        visible={showLanguageModal} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.language}</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {availableLanguages.map((lang) => {
              const isSelected = language === lang.code;
              const isEnglish = lang.code === 'en';
              
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.versionItem, 
                    { 
                      backgroundColor: theme.card,
                      marginBottom: 10,
                      padding: 15,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: isEnglish ? 1 : 0.5
                    },
                    isSelected && { borderColor: theme.primary, borderWidth: 2 }
                  ]}
                  onPress={isEnglish ? async () => {
                    hapticFeedback.success();
                    setShowLanguageModal(false);
                    setTimeout(async () => {
                      await changeLanguage(lang.code);
                    }, 300);
                  } : () => {
                    // Do nothing for non-English languages
                  }}
                  activeOpacity={isEnglish ? 0.7 : 1}
                  disabled={!isEnglish}
                >
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, marginRight: 12 }}>{lang.flag}</Text>
                    <View>
                      <Text style={[styles.versionName, { color: theme.text, fontSize: 16, fontWeight: '600' }]}>
                        {lang.nativeName}
                      </Text>
                      <Text style={[styles.versionAbbreviation, { color: theme.textSecondary, fontSize: 14, marginTop: 2 }]}>
                        {lang.name}
                      </Text>
                      {!isEnglish && (
                        <Text style={[styles.comingSoonText, { color: theme.primary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }]}>
                          Coming Soon
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isSelected && isEnglish && (
                      <MaterialIcons name="check-circle" size={24} color={theme.primary} style={{ marginRight: 8 }} />
                  )}
                    {!isEnglish && (
                      <MaterialIcons name="lock" size={20} color={theme.textTertiary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
      
      {/* Loading Overlay for Language Change */}
      {isChangingLanguage && (
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text, marginTop: 15 }]}>
              {t.changingLanguage}
            </Text>
          </View>
        </View>
      )}

      {/* Saved Verses Modal - Interactive Dismissal Style */}
      <Modal
        visible={showSavedVerses}
        animationType="none"
        onRequestClose={() => {
          setShowSavedVerses(false);
          setSavedVersesSearch('');
        }}
        presentationStyle="fullScreen"
      >
        <View style={{
          flex: 1,
          backgroundColor: theme.background
        }}>
            {/* Content */}
            <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 100 : 80 }}>
            
            <ScrollView 
              style={styles.modalScrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingSavedVerses}
                  onRefresh={refreshSavedVerses}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              }
            >
              {/* Search Bar */}
              <View style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.2 : 0.08,
                shadowRadius: 8,
                elevation: 3,
                borderWidth: isDark ? 1 : 0,
                borderColor: 'rgba(255,255,255,0.1)'
              }}>
                <MaterialIcons name="search" size={22} color={theme.textSecondary} />
                <TextInput
                  value={savedVersesSearch}
                  onChangeText={setSavedVersesSearch}
                  placeholder="Search verses or references..."
                  placeholderTextColor={theme.textTertiary}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: theme.text,
                    marginLeft: 12,
                    paddingVertical: 4
                  }}
                />
                {savedVersesSearch.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSavedVersesSearch('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons name="close" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Stats Row */}
              {savedVersesList.length > 0 && (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    {(() => {
                      const filtered = savedVersesList.filter(v => {
                        if (!savedVersesSearch.trim()) return true;
                        const searchLower = savedVersesSearch.toLowerCase();
                        const text = (v.text || v.content || '').toLowerCase();
                        const ref = (v.reference || '').toLowerCase();
                        return text.includes(searchLower) || ref.includes(searchLower);
                      });
                      return `${filtered.length} ${filtered.length === 1 ? 'verse' : 'verses'}${savedVersesSearch ? ' found' : ''}`;
                    })()}
                  </Text>
                </View>
              )}

              {savedVersesList.length === 0 ? (
                <View style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 60
                }}>
                  <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: `${theme.primary}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20
                  }}>
                    <MaterialIcons name="bookmark-border" size={40} color={theme.primary} />
                  </View>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: theme.text,
                    marginBottom: 8
                  }}>
                    No Saved Verses Yet
                  </Text>
                  <Text style={{
                    fontSize: 15,
                    color: theme.textSecondary,
                    textAlign: 'center',
                    lineHeight: 22
                  }}>
                    Tap the bookmark icon on any verse{'\n'}to save it for later
                  </Text>
                </View>
              ) : (
                // Filter and map verses
                (() => {
                  const filteredVerses = savedVersesList.filter(v => {
                    if (!savedVersesSearch.trim()) return true;
                    const searchLower = savedVersesSearch.toLowerCase();
                    const text = (v.text || v.content || '').toLowerCase();
                    const ref = (v.reference || '').toLowerCase();
                    return text.includes(searchLower) || ref.includes(searchLower);
                  });
                  
                  const sortedVerses = savedVersesSort === 'desc' ? [...filteredVerses].reverse() : filteredVerses;
                  
                  if (sortedVerses.length === 0 && savedVersesSearch) {
                    return (
                      <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 40
                      }}>
                        <MaterialIcons name="search-off" size={48} color={theme.textTertiary} />
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: theme.textSecondary,
                          marginTop: 16
                        }}>
                          No results for "{savedVersesSearch}"
                        </Text>
                      </View>
                    );
                  }
                  
                  return sortedVerses.map((verse, index) => (
                    <View 
                      key={verse.id || index} 
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                        borderRadius: 20,
                        padding: 20,
                        marginBottom: 14,
                        shadowColor: theme.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDark ? 0.15 : 0.08,
                        shadowRadius: 12,
                        elevation: 4,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: 'rgba(255,255,255,0.08)'
                      }}
                    >
                      {/* Header Row */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 14
                      }}>
                        {/* Bookmark Icon */}
                        <View style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: `${theme.primary}15`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          <MaterialIcons name="bookmark" size={22} color={theme.primary} />
                        </View>
                        
                        {/* Reference and Version */}
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 17,
                            fontWeight: '700',
                            color: theme.primary,
                            letterSpacing: 0.3
                          }}>
                            {verse.reference}
                          </Text>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: theme.textTertiary,
                            marginTop: 2,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}>
                            {verse.version?.toUpperCase() || 'KJV'}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Verse Text */}
                      <Text style={{
                        fontSize: 16,
                        color: theme.text,
                        lineHeight: 26,
                        marginBottom: 18,
                        fontWeight: '500'
                      }}>
                        {verse.text || verse.content}
                      </Text>
                      
                      {/* Action Buttons Row */}
                      <View style={{
                        flexDirection: 'row',
                        gap: 10
                      }}>
                        {/* Remove Button */}
                        <TouchableOpacity
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: `${theme.error}15`,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onPress={async () => {
                            hapticFeedback.light();
                            const newList = savedVersesList.filter(v => v.id !== verse.id);
                            setSavedVersesList(newList);
                            await AsyncStorage.setItem('savedBibleVerses', JSON.stringify(newList));
                            const stats = await AsyncStorage.getItem('userStats');
                            const userStats = stats ? JSON.parse(stats) : {};
                            userStats.savedVerses = newList.length;
                            await AsyncStorage.setItem('userStats', JSON.stringify(userStats));
                            setUserStats(userStats);
                          }}
                          activeOpacity={0.7}
                          delayPressIn={0}
                        >
                          <MaterialIcons name="delete-outline" size={20} color={theme.error} />
                        </TouchableOpacity>

                        {/* Discuss Button */}
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: theme.primary,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            shadowColor: theme.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8
                          }}
                          onPress={() => {
                            hapticFeedback.medium();
                            setVerseToInterpret({
                              text: verse.text || verse.content,
                              reference: verse.reference
                            });
                            setShowSavedVerses(false);
                            setSavedVersesSearch('');
                            setTimeout(() => {
                              setShowAiChat(true);
                            }, 300);
                          }}
                          activeOpacity={0.7}
                          delayPressIn={0}
                        >
                          <MaterialIcons name="forum" size={18} color="#FFFFFF" />
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: '#FFFFFF'
                          }}>
                            Discuss
                          </Text>
                        </TouchableOpacity>

                        {/* Go to Verse Button */}
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: theme.success,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            shadowColor: theme.success,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8
                          }}
                          onPress={() => {
                            handleNavigateToVerse(verse.reference);
                          }}
                          activeOpacity={0.7}
                          delayPressIn={0}
                        >
                          <MaterialIcons name="menu-book" size={18} color="#FFFFFF" />
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: '#FFFFFF'
                          }}>
                            Read
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ));
                })()
              )}
            </ScrollView>
            </View>

            {/* Transparent Blurred Header */}
            <BlurView 
              intensity={20} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
                backgroundColor: 'transparent',
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                overflow: 'hidden',
              }}
            >
              <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
              <View style={{ 
                backgroundColor: 'transparent', 
                borderBottomWidth: 0, 
                paddingTop: 8, 
                paddingBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20
              }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowSavedVerses(false);
                    setSavedVersesSearch('');
                  }}
                  style={{ 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    paddingHorizontal: 16, 
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                  activeOpacity={0.7}
                  delayPressIn={0}
                >
                  <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
                <Text style={{ 
                  color: theme.text, 
                  fontSize: 18, 
                  fontWeight: '600',
                  flex: 1,
                  textAlign: 'center'
                }}>
                  Saved Verses
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.light();
                    setSavedVersesSort(prev => prev === 'desc' ? 'asc' : 'desc');
                  }}
                  style={{ 
                    paddingHorizontal: 12, 
                    paddingVertical: 6,
                    borderRadius: 18,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
                  }}
                  activeOpacity={0.7}
                  delayPressIn={0}
                >
                  <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>
                    {savedVersesSort === 'desc' ? 'Newest' : 'Oldest'}
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Done</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.settings || 'Settings'}</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Theme Selection Button */}
            <TouchableOpacity 
              style={[styles.modalSettingItem, { backgroundColor: theme.card }]}
              onPress={() => {
                console.log('Theme button pressed');
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                setTimeout(() => {
                  setShowThemeModal(true);
                }, 300);
                console.log('showThemeModal set to true');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <MaterialIcons name="palette" size={20} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {t.theme || 'Theme'}
                </Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                  {isBlushTheme ? 'Blush Bloom' : isEternaTheme ? 'Eterna' : isCresviaTheme ? 'Cresvia' : isSpidermanTheme ? 'Spiderman' : isFaithTheme ? 'Faith' : isSailormoonTheme ? 'Sailor Moon' : 'Default'}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>
            
            {/* Bible Version Setting */}
            <TouchableOpacity 
              style={[styles.modalSettingItem, { backgroundColor: theme.card }]}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                setTimeout(() => {
                  setShowBibleVersionModal(true);
                }, 300);
              }}
            >
              <View style={styles.settingLeft}>
                <MaterialIcons name="menu-book" size={20} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {t.bibleVersion || 'Bible Version'}
                </Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                  {getVersionById(selectedBibleVersion).abbreviation}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>
            
            {/* Language Setting */}
            <TouchableOpacity 
              style={[styles.modalSettingItem, { backgroundColor: theme.card }]}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                setTimeout(() => {
                  setShowLanguageModal(true);
                }, 300);
              }}
            >
              <View style={styles.settingLeft}>
                <MaterialIcons name="language" size={20} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {t.language || 'Language'}
                </Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                  {availableLanguages.find(l => l.code === language)?.nativeName || 'English'}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>
            
            {/* Audio Voice Setting */}
            <TouchableOpacity 
              style={[styles.modalSettingItem, { backgroundColor: theme.card }]}
              onPress={async () => {
                hapticFeedback.buttonPress();
                const newGender = audioVoiceGender === 'female' ? 'male' : 'female';
                setAudioVoiceGender(newGender);
                await bibleAudioService.setVoiceGender(newGender);
              }}
            >
              <View style={styles.settingLeft}>
                <MaterialIcons name="record-voice-over" size={20} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Bible Audio Voice
                </Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                  {audioVoiceGender === 'female' ? 'Female' : 'Male'}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>

            {/* Weight Unit Setting */}
            <TouchableOpacity 
              style={[styles.modalSettingItem, { backgroundColor: theme.card }]}
              onPress={async () => {
                hapticFeedback.buttonPress();
                const newUnit = weightUnit === 'kg' ? 'lbs' : 'kg';
                setWeightUnit(newUnit);
                await AsyncStorage.setItem('weightUnit', newUnit);
                
                // Update in user profile
                const storedProfile = await AsyncStorage.getItem('userProfile');
                if (storedProfile) {
                  const profile = JSON.parse(storedProfile);
                  profile.weightUnit = newUnit;
                  await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
                }
              }}
            >
              <View style={styles.settingLeft}>
                <MaterialIcons name="fitness-center" size={20} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Weight Unit
                </Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                  {weightUnit.toUpperCase()}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>

            {/* Haptic Feedback Toggle */}
            <View style={[styles.modalSettingItem, { backgroundColor: theme.card }]}>
              <View style={styles.settingLeft}>
                <MaterialIcons 
                  name="vibration" 
                  size={20} 
                  color={theme.primary} 
                />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {t.hapticFeedback || 'Haptic Feedback'}
                </Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={handleVibrationToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={vibrationEnabled ? "#FFFFFF" : "#F4F3F4"}
              />
            </View>

            {/* Liquid Glass Toggle - Only show if device supports it */}
            {isLiquidGlassSupportedByDevice && (
              <View style={[styles.modalSettingItem, { backgroundColor: theme.card }]}>
                <View style={styles.settingLeft}>
                  <MaterialIcons 
                    name="gradient" 
                    size={20} 
                    color={theme.primary} 
                  />
                  <Text style={[styles.settingLabel, { color: theme.text }]}>
                    Liquid Glass Effect
                  </Text>
                </View>
                <Switch
                  value={liquidGlassEnabled}
                  onValueChange={handleLiquidGlassToggle}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={liquidGlassEnabled ? "#FFFFFF" : "#F4F3F4"}
                />
              </View>
            )}
            
            {/* Notifications */}
            <TouchableOpacity 
              style={[styles.modalSettingItem, { backgroundColor: theme.card }]}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowNotificationSettings(true);
                setShowSettingsModal(false);
              }}
            >
              <View style={styles.settingLeft}>
                <MaterialIcons name="notifications" size={20} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {t.notifications || 'Notifications'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            </TouchableOpacity>

            
            {/* Delete Account */}
            <TouchableOpacity 
              style={[styles.modalSettingItem, { backgroundColor: theme.card, marginTop: 20 }]}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                setTimeout(() => {
                  Alert.alert(
                    'Delete Account',
                    'This will permanently delete your account and all your data. This action cannot be undone. Are you sure?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete Account', 
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            hapticFeedback.buttonPress();
                            
                            const { deleteAccountCompletely } = await import('../utils/onboardingReset');
                            const success = await deleteAccountCompletely();
                            
                            if (success) {
                              // Account successfully deleted - onboarding will restart automatically
                              console.log('✅ Account deletion completed - returning to onboarding');
                            } else {
                              Alert.alert('Error', 'Failed to delete account. Please try again.');
                            }
                          } catch (error) {
                            console.error('Delete account error:', error);
                            Alert.alert('Error', 'Failed to delete account. Please try again.');
                          }
                        }
                      }
                    ]
                  );
                }, 300);
              }}
            >
              <View style={styles.settingLeft}>
                <MaterialIcons name="delete-forever" size={20} color="#FF3B30" />
                <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>
                  {t.deleteAccount || 'Delete Account'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* AI Bible Chat Modal */}
      {showAiChat && (
        <AiBibleChat
          visible={showAiChat}
          onClose={() => {
            setShowAiChat(false);
            setVerseToInterpret(null);
          }}
          initialVerse={verseToInterpret}
          onNavigateToBible={handleNavigateToVerse}
        />
      )}

      {/* Bible Reader Modal */}
      <BibleReader
        visible={showBible}
        onClose={() => {
          setShowBible(false);
          setVerseReference(null);
        }}
        initialVerseReference={verseReference}
      />

      {/* Journal Modal - Interactive Dismissal Style */}
      <Modal
        visible={showJournal}
        animationType="none"
        onRequestClose={() => setShowJournal(false)}
        presentationStyle="fullScreen"
      >
        <View style={{
          flex: 1,
          backgroundColor: theme.background
        }}>
            <LinearGradient
              colors={isDark ? ['#1a1a1a', '#000000'] : ['#fdfbfb', '#ebedee']}
              style={StyleSheet.absoluteFill}
            />
            {/* Content */}
            <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 110 : 90 }}>
            
            {/* Journal List View */}
            <ScrollView 
              style={styles.modalScrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
              scrollEventThrottle={16}
            >
              {journalLoading ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="hourglass-bottom" size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                    Loading your notes...
                  </Text>
                </View>
              ) : journalNotes.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="menu-book" size={64} color={theme.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary, fontSize: 20, fontWeight: '700', marginTop: 24 }]}>
                    No Notes Yet
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme.textTertiary, fontSize: 15, marginTop: 12, lineHeight: 22, textAlign: 'center' }]}>
                    Long-press any verse in the Bible to add your personal notes and reflections
                  </Text>
                </View>
              ) : (
                journalNotes.map((note, index) => (
                  <View
                    key={note.id || index}
                    style={{
                      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.85)',
                      borderRadius: 24,
                      marginBottom: 20,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      shadowColor: theme.primary,
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.15,
                      shadowRadius: 16,
                      elevation: 8,
                    }}
                  >
                    <LinearGradient
                      colors={[theme.primary, `${theme.primary}CC`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.25)',
                          borderRadius: 8,
                          padding: 6,
                          marginRight: 10
                        }}>
                          <MaterialIcons name="auto-stories" size={16} color="#fff" />
                        </View>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '800',
                          color: '#fff',
                          letterSpacing: 0.3
                        }}>
                          {note.verseReference || 'Personal Reflection'}
                        </Text>
                      </View>
                      <View style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.15)',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20
                      }}>
                        <Text style={{
                          fontSize: 11,
                          color: 'rgba(255, 255, 255, 0.95)',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5
                        }}>
                          {new Date(note.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) + ' • ' + new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </LinearGradient>

                    <View style={{ padding: 20 }}>
                      {journalVerseTexts[note.id] && (
                        <View style={{
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                          borderRadius: 16,
                          padding: 16,
                          marginBottom: 16,
                          borderLeftWidth: 4,
                          borderLeftColor: `${theme.primary}60`,
                        }}>
                          <Text style={{
                            fontSize: 15,
                            lineHeight: 24,
                            color: theme.text,
                            opacity: 0.85,
                            fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'
                          }}>
                            "{journalVerseTexts[note.id]}"
                          </Text>
                        </View>
                      )}
                      
                      <View style={{
                        backgroundColor: `${theme.primary}08`,
                        borderRadius: 18,
                        padding: 20,
                        borderWidth: 1,
                        borderColor: `${theme.primary}15`
                      }}>
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center',
                          marginBottom: 10,
                          opacity: 0.8
                        }}>
                          <MaterialIcons name="bubble-chart" size={18} color={theme.primary} />
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: theme.primary,
                            marginLeft: 8,
                            textTransform: 'uppercase',
                            letterSpacing: 1
                          }}>
                            Reflection
                          </Text>
                        </View>
                        <Text style={{
                          fontSize: 17,
                          lineHeight: 26,
                          color: theme.text,
                          fontWeight: '500',
                          fontStyle: 'italic',
                          opacity: 0.95
                        }}>
                          {note.text}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={{
                          marginTop: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          opacity: 0.6
                        }}
                        onPress={() => {
                          hapticFeedback.light();
                          Alert.alert(
                            'Delete Journal Entry',
                            'Are you sure you want to delete this note?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  const noteId = note.id;
                                  const raw = await AsyncStorage.getItem('journalNotes');
                                  const allNotes = raw ? JSON.parse(raw) : [];
                                  const remaining = allNotes.filter(n => n.id !== noteId);
                                  await AsyncStorage.setItem('journalNotes', JSON.stringify(remaining));
                                  setJournalNotes(remaining);
                                  hapticFeedback.light();
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <View style={{
                          backgroundColor: `${theme.error}10`,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <MaterialIcons name="delete-outline" size={16} color={theme.error} />
                          <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: theme.error,
                            marginLeft: 4
                          }}>
                            Delete
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            
            {/* Floating Add Button */}
            <View
              style={{
                position: 'absolute',
                bottom: 30,
                right: 20,
                zIndex: 1000
              }}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                  hapticFeedback.medium();
                  setIsAddingEntry(true);
                }}
              >
                <MaterialIcons name="add" size={32} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Add Entry Bottom Sheet Modal - Appears on top */}
            {isAddingEntry && (
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'position' : 'height'}
                keyboardVerticalOffset={0}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'flex-end',
                  zIndex: 2000
                }}
              >
                {/* Backdrop */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsAddingEntry(false);
                    setNewJournalNote({ reference: '', text: '' });
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'transparent'
                  }}
                />

                {/* Bottom Sheet */}
                <Animated.View style={{
                  backgroundColor: theme.background,
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingBottom: Platform.OS === 'ios' ? 12 : 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 25,
                  transform: [{ translateY: addJournalSlideAnim }]
                }}>
                  {/* Drag Handle */}
                  <View 
                    style={{ 
                      alignItems: 'center',
                      paddingVertical: 14,
                    }}
                    {...addJournalPanResponder.panHandlers}
                  >
                    <View style={{ 
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)', 
                      width: 40, 
                      height: 5,
                      borderRadius: 3
                    }} />
                  </View>

                  {/* Header */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 24,
                    paddingBottom: 20
                  }}>
                    <View>
                      <Text style={{
                        fontSize: 26,
                        fontWeight: '900',
                        color: theme.text,
                        letterSpacing: -0.5
                      }}>
                        New Reflection
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: theme.textSecondary,
                        marginTop: 2,
                        fontWeight: '500'
                      }}>
                        Capture your spiritual journey
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        hapticFeedback.light();
                        setIsAddingEntry(false);
                        setNewJournalNote({ reference: '', text: '' });
                      }}
                      style={{
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        borderRadius: 20,
                        padding: 8
                      }}
                    >
                      <MaterialIcons name="close" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                  >
                      {/* Title Input */}
                      <View style={{ marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <MaterialIcons name="label-outline" size={18} color={theme.primary} />
                          <Text style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: theme.text,
                            marginLeft: 8,
                            letterSpacing: 0.3
                          }}>
                            Topic or Reference
                          </Text>
                        </View>
                        <TextInput
                          style={{
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            borderRadius: 16,
                            padding: 18,
                            fontSize: 17,
                            color: theme.text,
                            fontWeight: '600',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                          }}
                          placeholder="e.g. My Morning Prayer"
                          placeholderTextColor={theme.textTertiary}
                          value={newJournalNote.reference}
                          onChangeText={(text) => setNewJournalNote({ ...newJournalNote, reference: text })}
                        />
                      </View>

                      {/* Note Input */}
                      <View style={{ marginBottom: 30 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <MaterialIcons name="create" size={18} color={theme.primary} />
                          <Text style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: theme.text,
                            marginLeft: 8,
                            letterSpacing: 0.3
                          }}>
                            Your Reflection
                          </Text>
                        </View>
                        <TextInput
                          style={{
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            borderRadius: 18,
                            padding: 20,
                            fontSize: 17,
                            color: theme.text,
                            fontWeight: '500',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                            minHeight: 220,
                            textAlignVertical: 'top',
                            lineHeight: 26
                          }}
                          placeholder="What is God speaking to you today?"
                          placeholderTextColor={theme.textTertiary}
                          value={newJournalNote.text}
                          onChangeText={(text) => setNewJournalNote({ ...newJournalNote, text: text })}
                          multiline
                          numberOfLines={10}
                        />
                      </View>

                      {/* Save Button */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={{
                          borderRadius: 20,
                          overflow: 'hidden',
                          shadowColor: theme.primary,
                          shadowOffset: { width: 0, height: 10 },
                          shadowOpacity: 0.3,
                          shadowRadius: 15,
                          elevation: 10
                        }}
                        onPress={async () => {
                          if (!newJournalNote.text.trim()) {
                            Alert.alert('Empty Note', 'Please write something before saving.');
                            return;
                          }

                          hapticFeedback.success();
                          const newEntry = {
                            id: Date.now().toString(),
                            verseReference: newJournalNote.reference.trim() || 'Personal Reflection',
                            text: newJournalNote.text.trim(),
                            createdAt: new Date().toISOString(),
                            verseId: `custom_${Date.now()}`
                          };

                          try {
                            const existingNotes = await AsyncStorage.getItem('journalNotes');
                            const notes = existingNotes ? JSON.parse(existingNotes) : [];
                            notes.unshift(newEntry);
                            await AsyncStorage.setItem('journalNotes', JSON.stringify(notes));
                            
                            setJournalNotes(notes);
                            setNewJournalNote({ reference: '', text: '' });
                            setIsAddingEntry(false);
                          } catch (error) {
                            console.error('Error saving journal entry:', error);
                            Alert.alert('Error', 'Failed to save your journal entry. Please try again.');
                          }
                        }}
                      >
                        <LinearGradient
                          colors={[theme.primary, `${theme.primary}DD`]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            paddingVertical: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row'
                          }}
                        >
                          <MaterialIcons name="auto-awesome" size={20} color="#fff" style={{ marginRight: 10 }} />
                          <Text style={{
                            fontSize: 18,
                            fontWeight: '800',
                            color: '#fff',
                            letterSpacing: 1
                          }}>
                            SAVE REFLECTION
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                  </ScrollView>
                </Animated.View>
              </KeyboardAvoidingView>
            )}</View>
            {/* Transparent Blurred Header */}
            <BlurView 
              intensity={30} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
                backgroundColor: 'transparent',
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
                overflow: 'hidden',
              }}
            >
              <View style={{ height: Platform.OS === 'ios' ? 60 : 35, backgroundColor: 'transparent' }} />
              <View style={{ 
                backgroundColor: 'transparent', 
                borderBottomWidth: 0, 
                paddingTop: 10, 
                paddingBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 24
              }}>
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.light();
                    setShowJournal(false);
                    setIsAddingEntry(false);
                  }}
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20
                  }}
                >
                  <Text style={{ 
                    fontSize: 15, 
                    fontWeight: '700', 
                    color: theme.primary 
                  }}>
                    Close
                  </Text>
                </TouchableOpacity>
                
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ 
                    fontSize: 22, 
                    fontWeight: '900', 
                    color: theme.text,
                    letterSpacing: -0.5
                  }}>
                    Journal
                  </Text>
                  <View style={{ 
                    width: 20, 
                    height: 3, 
                    backgroundColor: theme.primary, 
                    borderRadius: 2,
                    marginTop: 4
                  }} />
                </View>

                <View style={{ width: 70 }} />
              </View>
            </BlurView>
        </View>
      </Modal>

      {/* Add Journal Entry Modal */}
      <Modal
        visible={showAddJournalNote}
        animationType="slide"
        transparent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          setShowAddJournalNote(false);
          setTimeout(() => setShowJournal(true), 300);
        }}
        onShow={() => console.log('📝 Journal entry modal opened!')}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end'
          }}>
            <View style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingBottom: 40,
              paddingHorizontal: 20,
              maxHeight: '90%'
            }}>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24
              }}>
                <Text style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: theme.text
                }}>
                  New Journal Entry
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddJournalNote(false);
                    setNewJournalNote({ reference: '', text: '' });
                    setTimeout(() => setShowJournal(true), 300);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={28} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Title Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: theme.textSecondary,
                    marginBottom: 8
                  }}>
                    Title (Optional)
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      padding: 16,
                      fontSize: 16,
                      color: theme.text,
                      borderWidth: 1,
                      borderColor: theme.border
                    }}
                    placeholder="e.g., Exodus 1:1 or My Thoughts"
                    placeholderTextColor={theme.textTertiary}
                    value={newJournalNote.reference}
                    onChangeText={(text) => setNewJournalNote(prev => ({ ...prev, reference: text }))}
                  />
                </View>

                {/* Note Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: theme.textSecondary,
                    marginBottom: 8
                  }}>
                    Your Note
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      padding: 16,
                      fontSize: 16,
                      color: theme.text,
                      minHeight: 200,
                      borderWidth: 1,
                      borderColor: theme.border,
                      textAlignVertical: 'top'
                    }}
                    placeholder="Write your thoughts, reflections, or prayers..."
                    placeholderTextColor={theme.textTertiary}
                    value={newJournalNote.text}
                    onChangeText={(text) => setNewJournalNote(prev => ({ ...prev, text: text }))}
                    multiline
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    opacity: newJournalNote.text.trim() ? 1 : 0.5
                  }}
                  disabled={!newJournalNote.text.trim()}
                  onPress={async () => {
                    if (newJournalNote.text.trim()) {
                      hapticFeedback.success();
                      try {
                        // Create a unique ID for this journal entry
                        const journalId = `journal_${Date.now()}`;
                        const noteReference = newJournalNote.reference.trim() || 'My Thoughts';
                        
                        // Save to VerseDataManager
                        await VerseDataManager.addNote(
                          journalId,
                          newJournalNote.text.trim(),
                          noteReference
                        );
                        
                        // Reload journal notes
                        await loadJournalNotes();
                        
                        // Close modal and reset
                        setShowAddJournalNote(false);
                        setNewJournalNote({ reference: '', text: '' });
                        
                        // Reopen journal modal
                        setTimeout(() => setShowJournal(true), 300);
                      } catch (error) {
                        console.error('Error saving journal entry:', error);
                        Alert.alert('Error', 'Could not save journal entry. Please try again.');
                      }
                    }
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#fff'
                  }}>
                    Save Entry
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Highlights Modal - Interactive Dismissal Style */}
      <Modal
        visible={showHighlights}
        animationType="none"
        onRequestClose={() => {
          setShowHighlights(false);
          setSelectedHighlightColor(null);
          setHighlightVersesWithText([]);
        }}
        presentationStyle="fullScreen"
      >
        <View style={{
          flex: 1,
          backgroundColor: theme.background
        }}>
            {/* Content */}
            <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 100 : 80 }}>
            
            <ScrollView 
              style={styles.modalScrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            >
              {highlightedVerses.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="palette" size={64} color={theme.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary, fontSize: 20, fontWeight: '700', marginTop: 24 }]}>
                    No Highlights Yet
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme.textTertiary, fontSize: 15, marginTop: 12, lineHeight: 22 }]}>
                    Long-press any verse in the Bible and choose a color to highlight it
                  </Text>
                </View>
              ) : !selectedHighlightColor ? (
                // Show color cards - Compact or Expanded view
                <View>
                  {highlightViewMode === 'compact' && (
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: theme.textTertiary,
                      marginBottom: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 1
                    }}>
                      {Object.keys(groupHighlightsByColor()).length} Categories
                    </Text>
                  )}
                  {Object.entries(groupHighlightsByColor()).map(([color, verses], index) => (
                  highlightViewMode === 'compact' ? (
                    // COMPACT VIEW - Premium card design
                    <TouchableOpacity
                      key={color}
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                        borderRadius: 20,
                        paddingVertical: 16,
                        paddingHorizontal: 18,
                        marginBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDark ? 0.3 : 0.15,
                        shadowRadius: 12,
                        elevation: 4,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
                      }}
                      onPress={() => {
                        hapticFeedback.medium();
                        loadVersesForColor(color);
                      }}
                      onLongPress={() => {
                        hapticFeedback.medium();
                        setRenameHighlightColor(color);
                        setRenameHighlightText(getColorName(color));
                        setShowRenameHighlight(true);
                      }}
                      activeOpacity={0.8}
                      delayPressIn={0}
                    >
                      {/* Color Circle with Glow */}
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: color,
                        marginRight: 16,
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                        elevation: 6,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <MaterialIcons name="format-paint" size={20} color="rgba(255,255,255,0.9)" />
                      </View>
                      
                      {/* Name and Details */}
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: theme.text,
                          letterSpacing: 0.3
                        }}>
                          {getColorName(color)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          {customHighlightNames[color] && (
                            <Text style={{
                              fontSize: 12,
                              fontWeight: '500',
                              color: theme.textSecondary,
                              marginRight: 8
                            }}>
                              {getDefaultColorName(color)} •
                            </Text>
                          )}
                          <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: color,
                          }}>
                            {verses.length} {verses.length === 1 ? 'verse' : 'verses'}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Action Buttons */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            hapticFeedback.light();
                            setRenameHighlightColor(color);
                            setRenameHighlightText(getColorName(color));
                            setShowRenameHighlight(true);
                          }}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: `${color}20`,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          activeOpacity={0.7}
                          delayPressIn={0}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons name="edit" size={16} color={color} />
                        </TouchableOpacity>
                        
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: `${color}15`,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <MaterialIcons name="arrow-forward-ios" size={14} color={color} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    // EXPANDED VIEW - Premium large card
                    <View
                      key={color}
                      style={{
                        marginBottom: 16,
                        borderRadius: 28,
                        overflow: 'hidden',
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.25,
                        shadowRadius: 20,
                        elevation: 8
                      }}
                    >
                      <LinearGradient
                        colors={[
                          `${color}${isDark ? '40' : '25'}`,
                          `${color}${isDark ? '20' : '10'}`
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          padding: 24,
                          alignItems: 'center',
                          borderWidth: 2,
                          borderColor: `${color}40`,
                          borderRadius: 28
                        }}
                      >
                        <TouchableOpacity
                          style={{
                            width: '100%',
                            alignItems: 'center'
                          }}
                          onPress={() => {
                            hapticFeedback.medium();
                            loadVersesForColor(color);
                          }}
                          onLongPress={() => {
                            hapticFeedback.medium();
                            setRenameHighlightColor(color);
                            setRenameHighlightText(getColorName(color));
                            setShowRenameHighlight(true);
                          }}
                          activeOpacity={0.8}
                          delayPressIn={0}
                        >
                          {/* Edit Button */}
                          <TouchableOpacity
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
                              alignItems: 'center',
                              justifyContent: 'center',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 4
                            }}
                            onPress={() => {
                              hapticFeedback.light();
                              setRenameHighlightColor(color);
                              setRenameHighlightText(getColorName(color));
                              setShowRenameHighlight(true);
                            }}
                            activeOpacity={0.7}
                            delayPressIn={0}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <MaterialIcons name="edit" size={18} color={color} />
                          </TouchableOpacity>
                          
                          {/* Large Color Circle */}
                          <View style={{
                            width: 72,
                            height: 72,
                            borderRadius: 36,
                            backgroundColor: color,
                            marginBottom: 16,
                            shadowColor: color,
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.6,
                            shadowRadius: 16,
                            elevation: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 4,
                            borderColor: 'rgba(255,255,255,0.4)'
                          }}>
                            <MaterialIcons name="format-paint" size={28} color="rgba(255,255,255,0.95)" />
                          </View>
                          
                          <Text style={{
                            fontSize: 22,
                            fontWeight: '800',
                            color: theme.text,
                            marginBottom: 8,
                            letterSpacing: 0.5
                          }}>
                            {getColorName(color)}
                          </Text>
                          
                          {customHighlightNames[color] && (
                            <Text style={{
                              fontSize: 13,
                              fontWeight: '500',
                              color: theme.textSecondary,
                              marginBottom: 8
                            }}>
                              Originally: {getDefaultColorName(color)}
                            </Text>
                          )}
                          
                          <View style={{
                            backgroundColor: color,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 20,
                            shadowColor: color,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.4,
                            shadowRadius: 8
                          }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: '#FFFFFF',
                              letterSpacing: 0.5
                            }}>
                              {verses.length} {verses.length === 1 ? 'verse' : 'verses'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </LinearGradient>
                    </View>
                  )
                ))}
                </View>
              ) : (
                // Show verses with full text for selected color
                highlightVersesWithText.map((verse, index) => (
                  <View
                    key={verse.verseId + index}
                    style={{
                      marginBottom: 16,
                      borderRadius: 24,
                      overflow: 'hidden',
                      shadowColor: selectedHighlightColor,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: isDark ? 0.4 : 0.2,
                      shadowRadius: 16,
                      elevation: 6
                    }}
                  >
                    <LinearGradient
                      colors={[
                        isDark ? `${selectedHighlightColor}30` : `${selectedHighlightColor}18`,
                        isDark ? `${selectedHighlightColor}20` : `${selectedHighlightColor}12`
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        padding: 22,
                        borderWidth: 2,
                        borderColor: `${selectedHighlightColor}50`,
                        borderRadius: 24
                      }}
                    >
                      {/* Highlight Color Accent Bar */}
                      <View style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 6,
                        backgroundColor: selectedHighlightColor
                      }} />
                      
                      {/* Verse Reference Header */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 16,
                        paddingLeft: 8
                      }}>
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: selectedHighlightColor,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: selectedHighlightColor,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.4,
                          shadowRadius: 6,
                          elevation: 3
                        }}>
                          <MaterialIcons name="auto-stories" size={20} color="#FFFFFF" />
                        </View>
                        <Text style={{
                          fontSize: 18,
                          fontWeight: '800',
                          color: theme.text,
                          marginLeft: 12,
                          flex: 1
                        }}>
                          {verse.verseReference}
                        </Text>
                      </View>
                      
                      {/* Verse Text */}
                      <Text style={{
                        fontSize: 16,
                        color: theme.text,
                        lineHeight: 28,
                        marginBottom: 18,
                        paddingLeft: 8,
                        fontWeight: '500'
                      }}>
                        {verse.text}
                      </Text>
                    
                    {/* Action Buttons Row */}
                    <View style={{
                      flexDirection: 'row',
                      gap: 10,
                      marginTop: 8,
                      paddingLeft: 8
                    }}>
                      {/* Remove Button (left) */}
                      <TouchableOpacity
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 16,
                          backgroundColor: `${theme.error}20`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1.5,
                          borderColor: `${theme.error}30`
                        }}
                        onPress={() => {
                          Alert.alert(
                            'Remove Highlight',
                            'Are you sure you want to remove this highlight?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: async () => {
                                  hapticFeedback.light();
                                  await VerseDataManager.removeHighlight(verse.verseId);
                                  await loadHighlights();
                                  setHighlightVersesWithText(prev => prev.filter(v => v.verseId !== verse.verseId));
                                  if (highlightVersesWithText.length === 1) {
                                    setSelectedHighlightColor(null);
                                  }
                                  DeviceEventEmitter.emit('highlightsChanged');
                                }
                              }
                            ]
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="delete-outline" size={24} color={theme.error} />
                      </TouchableOpacity>
                      
                      {/* Discuss Button */}
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 16,
                          backgroundColor: theme.primary,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: theme.primary,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 3
                        }}
                        onPress={() => {
                          hapticFeedback.medium();
                          setVerseToInterpret({
                            text: verse.text,
                            reference: verse.verseReference
                          });
                          setShowHighlights(false);
                          setTimeout(() => {
                            setShowAiChat(true);
                          }, 300);
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="forum" size={18} color="#FFFFFF" />
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: '#FFFFFF',
                          marginLeft: 6
                        }}>
                          Discuss
                        </Text>
                      </TouchableOpacity>
                      
                      {/* Go to Verse Button (right) */}
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 16,
                          backgroundColor: theme.success,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: theme.success,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 3
                        }}
                        onPress={() => {
                          hapticFeedback.medium();
                          handleNavigateToVerse(verse.verseReference);
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="menu-book" size={18} color="#FFFFFF" />
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: '#FFFFFF',
                          marginLeft: 6
                        }}>
                          Go to Verse
                        </Text>
                      </TouchableOpacity>
                    </View>
                    </LinearGradient>
                  </View>
                ))
              )}
            </ScrollView>
            </View>

            {/* Transparent Blurred Header */}
            <BlurView 
              intensity={20} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
                backgroundColor: 'transparent',
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                overflow: 'hidden',
              }}
            >
              <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
              <View style={{ 
                backgroundColor: 'transparent', 
                borderBottomWidth: 0, 
                paddingTop: 8, 
                paddingBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20
              }}>
                {selectedHighlightColor ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedHighlightColor(null);
                      setHighlightVersesWithText([]);
                      hapticFeedback.light();
                    }}
                    style={{ 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                      paddingHorizontal: 16, 
                      paddingVertical: 8,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setShowHighlights(false);
                      setSelectedHighlightColor(null);
                      setHighlightVersesWithText([]);
                    }}
                    style={{ 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                      paddingHorizontal: 16, 
                      paddingVertical: 8,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Close</Text>
                  </TouchableOpacity>
                )}
                <Text style={{ 
                  color: theme.text, 
                  fontSize: 18, 
                  fontWeight: '600',
                  flex: 1,
                  textAlign: 'center'
                }}>
                  {selectedHighlightColor ? getColorName(selectedHighlightColor) : 'Highlights'}
                </Text>
                {/* View Toggle Button - only show on main list */}
                {!selectedHighlightColor ? (
                  <TouchableOpacity
                    onPress={() => saveHighlightViewMode(highlightViewMode === 'compact' ? 'expanded' : 'compact')}
                    style={{ 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                      paddingHorizontal: 12, 
                      paddingVertical: 8,
                      borderRadius: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4
                    }}
                    activeOpacity={0.7}
                    delayPressIn={0}
                  >
                    <MaterialIcons 
                      name={highlightViewMode === 'compact' ? 'view-agenda' : 'view-list'} 
                      size={16} 
                      color={theme.primary} 
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 60 }} />
                )}
              </View>
            </BlurView>
        </View>
      </Modal>

      {/* Rename Highlight Modal */}
      <Modal
        visible={showRenameHighlight}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowRenameHighlight(false);
          setRenameHighlightColor(null);
          setRenameHighlightText('');
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24
            }}
            activeOpacity={1}
            onPress={() => {
              setShowRenameHighlight(false);
              setRenameHighlightColor(null);
              setRenameHighlightText('');
            }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={{
                backgroundColor: theme.card,
                borderRadius: 24,
                padding: 24,
                width: '100%',
                maxWidth: 340,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10
              }}
            >
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20
              }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: renameHighlightColor || theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  shadowColor: renameHighlightColor || theme.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6
                }}>
                  <MaterialIcons name="edit" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: theme.text
                  }}>
                    Rename Highlight
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: theme.textSecondary,
                    marginTop: 2
                  }}>
                    {getDefaultColorName(renameHighlightColor)}
                  </Text>
                </View>
              </View>

              {/* Input */}
              <TextInput
                value={renameHighlightText}
                onChangeText={setRenameHighlightText}
                placeholder="Enter custom name"
                placeholderTextColor={theme.textTertiary}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 16,
                  color: theme.text,
                  borderWidth: 2,
                  borderColor: renameHighlightColor || theme.primary,
                  marginBottom: 20
                }}
                autoFocus={true}
                selectTextOnFocus={true}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {/* Reset to Default Button */}
                {customHighlightNames[renameHighlightColor] && (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      borderRadius: 14,
                      padding: 14,
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      handleResetHighlightName(renameHighlightColor);
                      setShowRenameHighlight(false);
                      setRenameHighlightColor(null);
                      setRenameHighlightText('');
                    }}
                    activeOpacity={0.7}
                    delayPressIn={0}
                  >
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: theme.textSecondary
                    }}>
                      Reset
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Save Button */}
                <TouchableOpacity
                  style={{
                    flex: customHighlightNames[renameHighlightColor] ? 1.5 : 1,
                    backgroundColor: renameHighlightColor || theme.primary,
                    borderRadius: 14,
                    padding: 14,
                    alignItems: 'center',
                    shadowColor: renameHighlightColor || theme.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8
                  }}
                  onPress={handleRenameHighlight}
                  activeOpacity={0.7}
                  delayPressIn={0}
                  disabled={!renameHighlightText.trim()}
                >
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#fff'
                  }}>
                    Save Name
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tasks Done Modal */}
      <Modal
        visible={showTasksDone}
        animationType="none"
        onRequestClose={() => setShowTasksDone(false)}
        presentationStyle="fullScreen"
      >
        <View style={{
          flex: 1,
          backgroundColor: theme.background
        }}>
            {/* Content */}
            <View style={{ flex: 1, paddingTop: Platform.OS === 'ios' ? 100 : 80 }}>
            
            <ScrollView 
              style={styles.modalScrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
            >
              {completedTodosList.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="check-circle-outline" size={64} color={theme.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary, fontSize: 20, fontWeight: '700', marginTop: 24 }]}>
                    No Completed Tasks Yet
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme.textTertiary, fontSize: 15, marginTop: 12, lineHeight: 22 }]}>
                    Complete tasks to see them here
                  </Text>
                </View>
              ) : (
                completedTodosList.map((task, index) => (
                  <LinearGradient
                    key={task.id || index}
                    colors={[
                      isDark ? `${theme.success}25` : `${theme.success}15`,
                      isDark ? `${theme.success}15` : `${theme.success}08`
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 20,
                      padding: 18,
                      marginBottom: 14,
                      shadowColor: theme.success,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.3 : 0.15,
                      shadowRadius: 12,
                      elevation: 4,
                      borderWidth: 1,
                      borderColor: `${theme.success}30`,
                      overflow: 'hidden'
                    }}
                  >
                    {/* Completion Badge */}
                    <View style={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: `${theme.success}20`,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: theme.success,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: theme.success,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 3
                      }}>
                        <MaterialIcons name="check" size={20} color="#FFFFFF" />
                      </View>
                    </View>

                    {/* Task Content */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingRight: 30 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: theme.text,
                          lineHeight: 24,
                          marginBottom: 8
                        }}>
                          {task.text || task.title}
                        </Text>
                        
                        {/* Date and Points Row */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 4
                        }}>
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}>
                            <MaterialIcons name="access-time" size={14} color={theme.textSecondary} />
                            <Text style={{
                              fontSize: 13,
                              color: theme.textSecondary,
                              marginLeft: 6,
                              fontWeight: '500'
                            }}>
                              {task.completedAt ? formatSmartDate(task.completedAt) : 'Completed'}
                            </Text>
                          </View>
                          
                          {task.points && (
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: `${theme.success}25`,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: `${theme.success}40`
                            }}>
                              <MaterialIcons name="stars" size={14} color={theme.success} />
                              <Text style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: theme.success,
                                marginLeft: 4
                              }}>
                                +{task.points}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                ))
              )}
            </ScrollView>
            
            {/* Transparent Blurred Header */}
            <BlurView 
              intensity={20} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
                backgroundColor: 'transparent',
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                overflow: 'hidden',
              }}
            >
              <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
              <View style={{ 
                backgroundColor: 'transparent', 
                borderBottomWidth: 0, 
                paddingTop: 8, 
                paddingBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20
              }}>
                <TouchableOpacity
                  onPress={() => setShowTasksDone(false)}
                  style={{ 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    paddingHorizontal: 16, 
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
                <Text style={{ 
                  color: theme.text, 
                  fontSize: 18, 
                  fontWeight: '600',
                  flex: 1,
                  textAlign: 'center'
                }}>
                  Tasks Done
                </Text>
                <View style={{ width: 60 }} />
              </View>
            </BlurView>
            </View>
        </View>
      </Modal>

      {/* Streak Milestone Animation Overlay */}
      {showStreakMilestone && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <View style={{
            backgroundColor: theme.card,
            borderRadius: 24,
            padding: 40,
            alignItems: 'center',
            shadowColor: theme.warning,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 10
          }}>
            <Text style={{ fontSize: 80, marginBottom: 16 }}>
              {AppStreakManager.getStreakEmoji(appStreak)}
            </Text>
            <Text style={{
              fontSize: 32,
              fontWeight: '800',
              color: theme.warning,
              marginBottom: 8
            }}>
              {appStreak} Day Streak
            </Text>
            <Text style={{
              fontSize: 18,
              color: theme.textSecondary,
              textAlign: 'center'
            }}>
              You're on fire! Keep it up!
            </Text>
          </View>
        </View>
      )}
    </View>
    </AnimatedWallpaper>

    {/* About Modal */}
    <Modal
      visible={showAboutModal}
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={() => setShowAboutModal(false)}
    >
      <LinearGradient
        colors={isDark 
          ? ['#0F0F23', '#1A1A2E', '#16213E'] 
          : ['#F0F4FF', '#E8EEFF', '#DDE6FF']}
        style={styles.aboutModal}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        
        {/* Animated Background Circles */}
        <Animated.View style={[styles.bgCircle1, {
          opacity: cardShimmer.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.6]
          }),
          transform: [{
            scale: cardShimmer.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.2]
            })
          }]
        }]} />
        <Animated.View style={[styles.bgCircle2, {
          opacity: cardShimmer.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 0.7]
          })
        }]} />
        
        {/* Close Button */}
        <TouchableOpacity
          style={[styles.closeButtonFloating, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }]}
          onPress={() => {
            hapticFeedback.medium();
            setShowAboutModal(false);
          }}
        >
          <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.closeButtonBlur}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </BlurView>
        </TouchableOpacity>

        {/* Content */}
        <Animated.ScrollView 
          style={styles.aboutContent}
          contentContainerStyle={styles.aboutContentContainer}
          showsVerticalScrollIndicator={false}
          opacity={modalFadeAnim}
        >
          {/* Hero Title */}
          <Animated.View style={{
            transform: [{ translateY: modalSlideAnim }]
          }}>
            <LinearGradient
              colors={[theme.primary, theme.primaryLight, theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <Text style={styles.heroTitle}>About Biblely</Text>
              <MaterialIcons name="auto-awesome" size={28} color="#FFFFFF" style={styles.heroIcon} />
            </LinearGradient>
          </Animated.View>

          {/* Creator Card */}
          <Animated.View style={{
            transform: [{ translateY: modalSlideAnim }],
            opacity: modalFadeAnim
          }}>
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.creatorCard}>
              <LinearGradient
                colors={isDark 
                  ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                  : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
                style={styles.creatorCardInner}
              >
                {/* Animated Avatar with Logo */}
                <Animated.View style={[styles.creatorIconContainer, {
                  transform: [{
                    scale: cardShimmer.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05]
                    })
                  }]
                }]}>
                  <LinearGradient
                    colors={[theme.primary, theme.primaryLight]}
                    style={styles.avatarGradient}
                  >
                    <Image 
                      source={require('../../assets/logo.png')} 
                      style={styles.avatarLogo}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                  {/* Glow ring */}
                  <Animated.View style={[styles.glowRing, {
                    borderColor: theme.primary,
                    opacity: cardShimmer.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.8]
                    })
                  }]} />
                </Animated.View>
                
                <Text style={[styles.creatorName, { color: theme.text }]}>
                  Hi, I'm Jason 👋
                </Text>
                <View style={styles.badgeContainer}>
                  <LinearGradient
                    colors={[theme.primary + '40', theme.primary + '20']}
                    style={styles.badge}
                  >
                    <MaterialIcons name="school" size={14} color={theme.primary} />
                    <Text style={[styles.badgeText, { color: theme.primary }]}>
                      CS Student
                    </Text>
                  </LinearGradient>
                  <LinearGradient
                    colors={[theme.success + '40', theme.success + '20']}
                    style={styles.badge}
                  >
                    <MaterialIcons name="code" size={14} color={theme.success} />
                    <Text style={[styles.badgeText, { color: theme.success }]}>
                      Developer
                    </Text>
                  </LinearGradient>
                </View>
              </LinearGradient>
            </BlurView>
          </Animated.View>

          {/* Story Section */}
          <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.storyCard}>
            <LinearGradient
              colors={isDark 
                ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
              style={styles.storyCardInner}
            >
              {/* Story Header with Gradient */}
              <LinearGradient
                colors={[theme.primary + '30', theme.primary + '10']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyHeaderGradient}
              >
                <MaterialIcons name="auto-stories" size={24} color={theme.primary} />
                <Text style={[styles.storyTitle, { color: theme.text }]}>
                  Why I Built This
                </Text>
              </LinearGradient>
              
              <Text style={[styles.storyText, { color: theme.text }]}>
                I'm Jason, a computer science student who loves reading the Bible. I wanted an app to help me read daily, so I tried a few popular Bible apps.
              </Text>
              
              <Text style={[styles.storyText, { color: theme.text }]}>
                Some had paywalls, others just weren't what I was looking for. I wanted something simple that combined faith, productivity, and wellness in one place.
              </Text>
              
              <Text style={[styles.storyText, { color: theme.text }]}>
                So I built Biblely. It's got everything I wanted - Bible reading, daily prayers, tasks to stay productive, and even fitness tracking. All completely free.
              </Text>

              <Text style={[styles.storyText, { color: theme.text }]}>
                I made this for myself, but I hope it helps you too. No subscriptions, no paywalls, just a simple app to help you grow.
              </Text>
            </LinearGradient>
          </BlurView>

          {/* Thank You Section */}
          <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.thankYouCard}>
            <LinearGradient
              colors={isDark
                ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
              style={styles.thankYouCardInner}
            >
              <Animated.View style={{
                transform: [{
                  scale: cardShimmer.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1]
                  })
                }]
              }}>
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A6F']}
                  style={styles.heartContainer}
                >
                  <MaterialIcons name="favorite" size={32} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={[styles.thankYouTitle, { color: theme.text }]}>
                Thanks for being here
              </Text>
              <Text style={[styles.thankYouText, { color: theme.textSecondary }]}>
                Hope Biblely helps you out. If you've got any ideas or feedback, I'd love to hear them.
              </Text>
              
              <View style={styles.contactInfo}>
                <View style={styles.contactItem}>
                  <MaterialIcons name="email" size={18} color={theme.primary} />
                  <Text style={[styles.contactText, { color: theme.text }]}>
                    biblelyios@gmail.com
                  </Text>
                </View>
                <View style={styles.contactItem}>
                  <MaterialIcons name="alternate-email" size={18} color={theme.primary} />
                  <Text style={[styles.contactText, { color: theme.text }]}>
                    @biblely.app on TikTok
                  </Text>
                </View>
              </View>
              
              <View style={styles.signatureContainer}>
                <View style={styles.signatureLine} />
                <Text style={[styles.signature, { color: theme.textSecondary }]}>
                  Jason
                </Text>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.ScrollView>
      </LinearGradient>
    </Modal>

    {/* Theme Modal */}
    <ThemeModal 
      visible={showThemeModal} 
      onClose={() => setShowThemeModal(false)} 
    />

    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Higher z-index to stay on top
    paddingTop: Platform.OS === 'ios' ? 70 : 35,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 65 : 40,
    paddingBottom: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  twitterContent: {
    flex: 1,
    marginTop: 0, // Removed safe area - content flows to top
  },
  twitterScrollContent: {
    paddingTop: 130, // Content starts after header - no overlap
    paddingBottom: 80, // Space for floating tab bar - no content hidden
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
  },
  headerLogo: {
    width: 32,
    height: 32,
    position: 'absolute',
    left: 20,
  },
  headerTextContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 110, // Adjusted for lower header position
    paddingBottom: 20, // Space for floating tab bar
  },
  profileCard: {
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    overflow: 'hidden',
    shadowRadius: 8,
    elevation: 2,
  },
  // Liquid Glass Styles
  liquidGlassProfileCard: {
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  liquidGlassStatsCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  liquidGlassSettingsCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userLevel: {
    fontSize: 16,
    marginBottom: 20,
  },
  progressSection: {
    width: '100%',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
  },
  progressLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statBox: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 80,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  badgesCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeItem: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 60,
  },
  badgeText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  settingsCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 16, // Increased spacing from icon
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  editButtonInner: {
    padding: 8,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  editSection: {
    marginBottom: 24,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  photoPreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  countrySelectButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countrySelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  countrySelectText: {
    fontSize: 16,
    flex: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    fontSize: 16,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  countryItemSelected: {
    backgroundColor: '#F2F2F7',
  },
  countryItemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryItemName: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementCount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  viewAllButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  settingsButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  aboutCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  aboutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  aboutButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 16,
  },
  modalSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  // 🌸 Theme Selector Styles
  themeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  themeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  themeEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  themeText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  versionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  versionInfo: {
    flex: 1,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  versionName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  versionPrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  purchasedLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  versionDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  versionPublisher: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  loadingContainer: {
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    paddingTop: 150,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  savedVerseItem: {
    padding: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  savedVerseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  savedVerseReference: {
    fontSize: 16,
    fontWeight: '700',
  },
  savedVerseVersion: {
    fontSize: 12,
    fontWeight: '600',
  },
  savedVerseContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  savedVerseActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  savedVerseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  savedVerseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalScrollView: {
    flex: 1,
    paddingTop: 15,
  },
  pullIndicatorContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  pullIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  
  // Simplified saved verse styles
  simplifiedSavedVerseContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  simplifiedSavedVerseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  simplifiedSavedVerseLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  simplifiedSavedVerseText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 10,
    borderRadius: 8,
    fontStyle: 'italic',
  },
  // About Modal Styles
  aboutModal: {
    flex: 1,
  },
  bgCircle1: {
    position: 'absolute',
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').width * 1.2,
    borderRadius: Dimensions.get('window').width * 0.6,
    backgroundColor: '#667eea',
    top: -Dimensions.get('window').width * 0.4,
    right: -Dimensions.get('window').width * 0.2,
  },
  bgCircle2: {
    position: 'absolute',
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').width * 0.8,
    borderRadius: Dimensions.get('window').width * 0.4,
    backgroundColor: '#764ba2',
    bottom: -Dimensions.get('window').width * 0.3,
    left: -Dimensions.get('window').width * 0.2,
  },
  closeButtonFloating: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
  },
  aboutContentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  heroGradient: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroIcon: {
    opacity: 0.9,
  },
  creatorCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  creatorCardInner: {
    padding: 24,
    alignItems: 'center',
  },
  creatorIconContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarLogo: {
    width: 70,
    height: 70,
  },
  glowRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    top: -7,
    left: -7,
  },
  creatorName: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  storyCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  storyCardInner: {
    padding: 24,
  },
  storyHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  storyTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  storyText: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
    fontWeight: '400',
  },
  thankYouCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  thankYouCardInner: {
    padding: 32,
    alignItems: 'center',
  },
  heartContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  thankYouTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  thankYouText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
  },
  contactInfo: {
    width: '100%',
    gap: 12,
    marginTop: 20,
    marginBottom: 28,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  signatureContainer: {
    alignItems: 'center',
  },
  signatureLine: {
    width: 100,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 12,
  },
  signature: {
    fontSize: 20,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});

export default ProfileTab;
