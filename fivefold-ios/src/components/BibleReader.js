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
  StatusBar,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  DeviceEventEmitter,
  useWindowDimensions,
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
import bibleAudioService from '../services/bibleAudioService';
import AudioPlayerBar from './AudioPlayerBar';
import AchievementService from '../services/achievementService';
// Removed InteractiveSwipeBack import

const BibleReader = ({ visible, onClose, onNavigateToAI, initialVerseReference, asScreen = false }) => {
  
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
  const [recentSearches, setRecentSearches] = useState([]);
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
  const [rangeVersesSet, setRangeVersesSet] = useState(new Set()); // Track verses that are part of saved ranges (for purple heart)
  // Track which version the currently-rendered `verses` were fetched with.
  // This prevents a mismatch where the UI badge shows the stored version,
  // but the chapter text was fetched earlier with the default version.
  const lastLoadedVersesVersionRef = useRef(null);
  
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
  const searchModalPanY = useRef(new Animated.Value(windowHeight)).current;
  const searchModalFadeAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);
  
  // Verse action menu state (long-press menu)
  const [showVerseMenu, setShowVerseMenu] = useState(false);
  const [selectedVerseForMenu, setSelectedVerseForMenu] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [highlightedVerses, setHighlightedVerses] = useState({}); // { verseId: color }
  const verseMenuSlideAnim = useRef(new Animated.Value(0)).current;
  const verseMenuFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Range selection state for saving multiple verses
  const [rangeSelectionMode, setRangeSelectionMode] = useState(false);
  const [rangeStartVerse, setRangeStartVerse] = useState(null);
  const [rangeEndVerseNum, setRangeEndVerseNum] = useState(null); // Track end verse number for +/- controls
  
  // Share card state
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardFadeAnim = useRef(new Animated.Value(0)).current;
  const shareCardRef = useRef(null);
  const [shareCardAnimating, setShareCardAnimating] = useState(false);
  const [shareCardTextMode, setShareCardTextMode] = useState('full'); // 'selected' | 'full'
  const [shareCardText, setShareCardText] = useState('');
  const [shareCardEndVerseNumber, setShareCardEndVerseNumber] = useState(null);
  // Text selection state for partial verse sharing
  const [showTextSelectionModal, setShowTextSelectionModal] = useState(false);
  const [textSelectionStart, setTextSelectionStart] = useState(null); // word index
  const [textSelectionEnd, setTextSelectionEnd] = useState(null); // word index
  const [textSelectionWords, setTextSelectionWords] = useState([]); // array of words
  const [shareCardActiveBg, setShareCardActiveBg] = useState(0);
  const [shareCardActiveLayout, setShareCardActiveLayout] = useState('centered'); // Layout template
  const [shareCardTextAlign, setShareCardTextAlign] = useState('center'); // Text alignment
  const [shareCardAspect, setShareCardAspect] = useState('portrait'); // Aspect ratio
  const [shareCardFont, setShareCardFont] = useState('georgia'); // Font style
  const [shareCardFontSizeAdjust, setShareCardFontSizeAdjust] = useState(0); // Font size adjustment (-10 to +10)
  const [shareCardBold, setShareCardBold] = useState(false); // Bold toggle
  const [shareCardItalic, setShareCardItalic] = useState(false); // Italic toggle
  const [shareCardShowBranding, setShareCardShowBranding] = useState(true); // Show Biblely
  const [shareCardControlsTab, setShareCardControlsTab] = useState('bg'); // Active controls tab
  const shareCardPrefsLoaded = useRef(false);

  // Load saved share card preferences
  useEffect(() => {
    const loadShareCardPrefs = async () => {
      try {
        const prefs = await AsyncStorage.getItem('shareCardPreferences');
        if (prefs) {
          const parsed = JSON.parse(prefs);
          if (parsed.activeBg !== undefined) setShareCardActiveBg(parsed.activeBg);
          if (parsed.activeLayout) setShareCardActiveLayout(parsed.activeLayout);
          if (parsed.textAlign) setShareCardTextAlign(parsed.textAlign);
          if (parsed.aspect) setShareCardAspect(parsed.aspect);
          if (parsed.font) setShareCardFont(parsed.font);
          if (parsed.fontSizeAdjust !== undefined) setShareCardFontSizeAdjust(parsed.fontSizeAdjust);
          if (parsed.showBranding !== undefined) setShareCardShowBranding(parsed.showBranding);
          if (parsed.bold !== undefined) setShareCardBold(parsed.bold);
          if (parsed.italic !== undefined) setShareCardItalic(parsed.italic);
        }
        shareCardPrefsLoaded.current = true;
      } catch (err) {
        console.log('Failed to load share card prefs:', err);
        shareCardPrefsLoaded.current = true;
      }
    };
    loadShareCardPrefs();
  }, []);

  // Save share card preferences when they change
  const saveShareCardPrefs = async (updates) => {
    if (!shareCardPrefsLoaded.current) return;
    try {
      const current = await AsyncStorage.getItem('shareCardPreferences');
      const parsed = current ? JSON.parse(current) : {};
      const newPrefs = { ...parsed, ...updates };
      await AsyncStorage.setItem('shareCardPreferences', JSON.stringify(newPrefs));
    } catch (err) {
      console.log('Failed to save share card prefs:', err);
    }
  };

  // Premium Background Presets - 200+ Options
  const bgPresets = [
    // === DARK & MOODY (1-30) ===
    { colors: ['#0F0F0F', '#1a1a2e'], name: 'Midnight', isLight: false },
    { colors: ['#1e1e28', '#2d2d3a'], name: 'Onyx', isLight: false },
    { colors: ['#0F2027', '#203A43', '#2C5364'], name: 'Deep Ocean', isLight: false },
    { colors: ['#000428', '#004e92'], name: 'Navy Depths', isLight: false },
    { colors: ['#232526', '#414345'], name: 'Dark Matter', isLight: false },
    { colors: ['#000000', '#434343'], name: 'Space Black', isLight: false },
    { colors: ['#141E30', '#243B55'], name: 'Dark Blue', isLight: false },
    { colors: ['#16222A', '#3A6073'], name: 'Steel', isLight: false },
    { colors: ['#1D2671', '#C33764'], name: 'Galaxy', isLight: false },
    { colors: ['#200122', '#6f0000'], name: 'Dark Red', isLight: false },
    { colors: ['#0F2027', '#203A43'], name: 'Nebula', isLight: false },
    { colors: ['#2C3E50', '#3498DB'], name: 'Stellar', isLight: false },
    { colors: ['#1e3c72', '#2a5298'], name: 'Deep Blue', isLight: false },
    { colors: ['#000046', '#1CB5E0'], name: 'Ocean Abyss', isLight: false },
    { colors: ['#0B486B', '#F56217'], name: 'Deep Moody', isLight: false },
    { colors: ['#1f4037', '#99f2c8'], name: 'Forest Night', isLight: false },
    { colors: ['#355C7D', '#6C5B7B', '#C06C84'], name: 'Dusty Rose', isLight: false },
    { colors: ['#403A3E', '#BE5869'], name: 'Dusty Pink', isLight: false },
    { colors: ['#141517', '#51a3a3'], name: 'Dark Teal', isLight: false },
    { colors: ['#0f0c29', '#302b63', '#24243e'], name: 'Deep Purple', isLight: false },
    { colors: ['#360033', '#0b8793'], name: 'Royal Purple', isLight: false },
    { colors: ['#6441A5', '#2a0845'], name: 'Purple Depths', isLight: false },
    { colors: ['#8E0E00', '#1F1C18'], name: 'Dark Crimson', isLight: false },
    { colors: ['#870000', '#190A05'], name: 'Crimson Black', isLight: false },
    { colors: ['#0F2027', '#2C5364'], name: 'Deep Forest', isLight: false },
    { colors: ['#003973', '#E5E5BE'], name: 'Dark Teal 2', isLight: false },
    { colors: ['#2b5876', '#4e4376'], name: 'Deep Space', isLight: false },
    { colors: ['#0f3443', '#34e89e'], name: 'Jade Night', isLight: false },
    { colors: ['#021B79', '#0575E6'], name: 'Navy Pro', isLight: false },
    { colors: ['#1A2980', '#26D0CE'], name: 'Corporate', isLight: false },
    // === VIBRANT GRADIENTS (31-70) ===
    { colors: ['#6366F1', '#8B5CF6'], name: 'Indigo', isLight: false },
    { colors: ['#EC4899', '#F43F5E'], name: 'Rose', isLight: false },
    { colors: ['#8B5CF6', '#D946EF'], name: 'Violet', isLight: false },
    { colors: ['#ee0979', '#ff6a00'], name: 'Flamingo', isLight: false },
    { colors: ['#F97316', '#FBBF24'], name: 'Sunset', isLight: false },
    { colors: ['#4A00E0', '#8E2DE2'], name: 'Deep Violet', isLight: false },
    { colors: ['#7F00FF', '#E100FF'], name: 'Ultra Violet', isLight: false },
    { colors: ['#834d9b', '#d04ed6'], name: 'Purple Majesty', isLight: false },
    { colors: ['#5f2c82', '#49a09d'], name: 'Regal', isLight: false },
    { colors: ['#4776E6', '#8E54E9'], name: 'Electric Purple', isLight: false },
    { colors: ['#667eea', '#764ba2'], name: 'Purple Magic', isLight: false },
    { colors: ['#4568DC', '#B06AB3'], name: 'Mystic Purple', isLight: false },
    { colors: ['#6A82FB', '#FC5C7D'], name: 'Magic Hour', isLight: false },
    { colors: ['#9D50BB', '#6E48AA'], name: 'Enchanted', isLight: false },
    { colors: ['#5E60CE', '#4EA8DE'], name: 'Cosmic Blue', isLight: false },
    { colors: ['#8E2DE2', '#4A00E0'], name: 'Berry Blast', isLight: false },
    { colors: ['#a8c0ff', '#3f2b96'], name: 'Blueberry', isLight: false },
    { colors: ['#D31027', '#EA384D'], name: 'Cherry Red', isLight: false },
    { colors: ['#880E4F', '#1A237E'], name: 'Wine Dark', isLight: false },
    { colors: ['#642B73', '#C6426E'], name: 'Plum Wine', isLight: false },
    { colors: ['#f953c6', '#b91d73'], name: 'Tropical Pink', isLight: false },
    { colors: ['#FF7E5F', '#FEB47B'], name: 'Peach', isLight: false },
    { colors: ['#FA8BFF', '#2BD2FF', '#2BFF88'], name: 'Rainbow', isLight: false },
    { colors: ['#FF61D2', '#FE9090'], name: 'Coral Pink', isLight: false },
    { colors: ['#FC466B', '#3F5EFB'], name: 'Subu', isLight: false },
    { colors: ['#00c6ff', '#0072ff'], name: 'Clean Mirror', isLight: false },
    { colors: ['#f7ff00', '#db36a4'], name: 'Neon Life', isLight: false },
    { colors: ['#800080', '#ffc0cb'], name: 'Purple Love', isLight: false },
    { colors: ['#00F260', '#0575E6'], name: 'Rainbow Blue', isLight: false },
    { colors: ['#614385', '#516395'], name: 'Dusk', isLight: false },
    { colors: ['#2193b0', '#6dd5ed'], name: 'Cool Sky', isLight: false },
    { colors: ['#06beb6', '#48b1bf'], name: 'Teal Ocean', isLight: false },
    { colors: ['#eb3349', '#f45c43'], name: 'Cherry Sunset', isLight: false },
    { colors: ['#dd5e89', '#f7bb97'], name: 'Rose Gold', isLight: false },
    { colors: ['#56ab2f', '#a8e063'], name: 'Fresh Green', isLight: false },
    { colors: ['#eecda3', '#ef629f'], name: 'Rose Pink', isLight: false },
    { colors: ['#02aab0', '#00cdac'], name: 'Green Beach', isLight: false },
    { colors: ['#ff512f', '#f09819'], name: 'Orange Sun', isLight: false },
    { colors: ['#e96443', '#904e95'], name: 'Purple Red', isLight: false },
    // === SUNSET & SUNRISE (71-100) ===
    { colors: ['#ED4264', '#FFEDBC'], name: 'Coral Sunset', isLight: false },
    { colors: ['#C33764', '#1D2671'], name: 'Purple Dusk', isLight: false },
    { colors: ['#F2709C', '#FF9472'], name: 'Pink Sunrise', isLight: false },
    { colors: ['#EE0979', '#FF6A00'], name: 'Vibrant Sunset', isLight: false },
    { colors: ['#FF512F', '#DD2476'], name: 'Fire Sunset', isLight: false },
    { colors: ['#FF416C', '#FF4B2B'], name: 'Hot Sunset', isLight: false },
    { colors: ['#ff6e7f', '#bfe9ff'], name: 'Soft Sunset', isLight: false },
    { colors: ['#f83600', '#f9d423'], name: 'Fire Sky', isLight: false },
    { colors: ['#ffc3a0', '#ffafbd'], name: 'Pastel Sunset', isLight: false },
    { colors: ['#cc2b5e', '#753a88'], name: 'Magenta Sunset', isLight: false },
    { colors: ['#e43a15', '#e65245'], name: 'Orange Fire', isLight: false },
    { colors: ['#F09819', '#EDDE5D'], name: 'Honey Gold', isLight: false },
    { colors: ['#FFB75E', '#ED8F03'], name: 'Amber', isLight: false },
    { colors: ['#f7971e', '#ffd200'], name: 'Sunset Gold', isLight: false },
    { colors: ['#FDC830', '#F37335'], name: 'Mango Gold', isLight: false },
    { colors: ['#F46B45', '#EEA849'], name: 'Peach Gold', isLight: false },
    { colors: ['#F7971E', '#FFD200'], name: 'Golden Ocean', isLight: false },
    { colors: ['#de6262', '#ffb88c'], name: 'Sun Horizon', isLight: false },
    { colors: ['#D38312', '#A83279'], name: 'Autumn Leaves', isLight: false },
    { colors: ['#DA4453', '#89216B'], name: 'Deep Autumn', isLight: false },
    { colors: ['#F2994A', '#F2C94C'], name: 'Golden Fall', isLight: false },
    { colors: ['#D66D75', '#E29587'], name: 'Rustic Autumn', isLight: false },
    { colors: ['#BE93C5', '#7BC6CC'], name: 'Soft Autumn', isLight: false },
    { colors: ['#ff9966', '#ff5e62'], name: 'Orange Coral', isLight: false },
    { colors: ['#f54ea2', '#ff7676'], name: 'Hot Pink', isLight: false },
    { colors: ['#ff0844', '#ffb199'], name: 'Red Orange', isLight: false },
    { colors: ['#fa709a', '#fee140'], name: 'Pink Yellow', isLight: false },
    { colors: ['#f6d365', '#fda085'], name: 'Sunny Day', isLight: false },
    { colors: ['#fccb90', '#d57eeb'], name: 'Peach Purple', isLight: false },
    { colors: ['#fbab7e', '#f7ce68'], name: 'Peach Sun', isLight: false },
    // === NATURE & EARTH (101-130) ===
    { colors: ['#10B981', '#34D399'], name: 'Emerald', isLight: false },
    { colors: ['#11998e', '#38ef7d'], name: 'Forest', isLight: false },
    { colors: ['#06B6D4', '#3B82F6'], name: 'Azure', isLight: false },
    { colors: ['#134E5E', '#71B280'], name: 'Pine', isLight: false },
    { colors: ['#076585', '#fff'], name: 'Sky', isLight: false },
    { colors: ['#005C97', '#363795'], name: 'Deep Teal', isLight: false },
    { colors: ['#34e89e', '#0f3443'], name: 'Jade', isLight: false },
    { colors: ['#0cebeb', '#20e3b2', '#29ffc6'], name: 'Mint Gradient', isLight: false },
    { colors: ['#00d2ff', '#3a47d5'], name: 'Sky Green', isLight: false },
    { colors: ['#02AAB0', '#00CDAC'], name: 'Teal Fresh', isLight: false },
    { colors: ['#1D976C', '#93F9B9'], name: 'Ice Mint', isLight: false },
    { colors: ['#43cea2', '#185a9d'], name: 'Deep Sea', isLight: false },
    { colors: ['#11998e', '#38ef7d'], name: 'Quepal', isLight: false },
    { colors: ['#136a8a', '#267871'], name: 'Turquoise', isLight: false },
    { colors: ['#283c86', '#45a247'], name: 'Cool Gradient', isLight: false },
    { colors: ['#603813', '#b29f94'], name: 'Earth Brown', isLight: false },
    { colors: ['#3E2723', '#6D4C41'], name: 'Chocolate', isLight: false },
    { colors: ['#4E342E', '#5D4037'], name: 'Coffee Brown', isLight: false },
    { colors: ['#c79081', '#dfa579'], name: 'Sandstone', isLight: false },
    { colors: ['#3E5151', '#DECBA4'], name: 'Arctic Light', isLight: false },
    { colors: ['#355C7D', '#6C5B7B'], name: 'Frozen', isLight: false },
    { colors: ['#2C3E50', '#4CA1AF'], name: 'Ice Blue', isLight: false },
    { colors: ['#7474BF', '#348AC7'], name: 'Winter Sky', isLight: false },
    { colors: ['#00c9ff', '#92fe9d'], name: 'Bright Sky', isLight: false },
    { colors: ['#43e97b', '#38f9d7'], name: 'Mint', isLight: false },
    { colors: ['#84fab0', '#8fd3f4'], name: 'Blue Mint', isLight: false },
    { colors: ['#d4fc79', '#96e6a1'], name: 'Pale Green', isLight: false },
    { colors: ['#84fab0', '#8fd3f4'], name: 'Sky Mist', isLight: false },
    { colors: ['#5ee7df', '#b490ca'], name: 'Magic Morning', isLight: false },
    { colors: ['#74ebd5', '#9face6'], name: 'Sky Teal', isLight: false },
    // === BLUES & TEALS (131-155) ===
    { colors: ['#1488CC', '#2B32B2'], name: 'Azure Blue', isLight: false },
    { colors: ['#005AA7', '#FFFDE4'], name: 'Light Blue', isLight: false },
    { colors: ['#003973', '#E5E5BE'], name: 'Soft Blue', isLight: false },
    { colors: ['#2E3192', '#1BFFFF'], name: 'Electric Blue', isLight: false },
    { colors: ['#4facfe', '#00f2fe'], name: 'Blue Wave', isLight: false },
    { colors: ['#a1c4fd', '#c2e9fb'], name: 'Light Blue Sky', isLight: false },
    { colors: ['#0093e9', '#80d0c7'], name: 'Water Sea', isLight: false },
    { colors: ['#21d4fd', '#b721ff'], name: 'Blue Purple', isLight: false },
    { colors: ['#08aeea', '#2af598'], name: 'Clear Water', isLight: false },
    { colors: ['#3eeec0', '#3f5efb'], name: 'Aqua Blue', isLight: false },
    { colors: ['#8bc6ec', '#9599e2'], name: 'Blue Lavender', isLight: false },
    { colors: ['#00dbde', '#fc00ff'], name: 'Neon Aqua', isLight: false },
    { colors: ['#0099F7', '#F11712'], name: 'Bold Jewels', isLight: false },
    { colors: ['#009FFF', '#ec2F4B'], name: 'Neon Jewels', isLight: false },
    { colors: ['#108DC7', '#EF8E38'], name: 'Sapphire', isLight: false },
    { colors: ['#304352', '#d7d2cc'], name: 'Steel Blue', isLight: false },
    { colors: ['#2C3E50', '#BDC3C7'], name: 'Business Gray', isLight: false },
    { colors: ['#659999', '#f4791f'], name: 'Modern Blue', isLight: false },
    { colors: ['#37474F', '#263238'], name: 'Slate Gray', isLight: false },
    { colors: ['#455A64', '#263238'], name: 'Storm Gray', isLight: false },
    { colors: ['#868f96', '#596164'], name: 'Concrete', isLight: false },
    { colors: ['#bdc3c7', '#2c3e50'], name: 'Ash', isLight: false },
    { colors: ['#cfd9df', '#e2ebf0'], name: 'Soft Gray', isLight: false },
    { colors: ['#a6c0fe', '#f68084'], name: 'Purple Coral', isLight: false },
    { colors: ['#a18cd1', '#fbc2eb'], name: 'Lavender', isLight: false },
    // === NEON & VIBRANT (156-180) ===
    { colors: ['#FF0844', '#FFB199'], name: 'Hot Neon', isLight: false },
    { colors: ['#7F7FD5', '#86A8E7', '#91EAE4'], name: 'Neon Dream', isLight: false },
    { colors: ['#00F260', '#0575E6'], name: 'Cyber Green', isLight: false },
    { colors: ['#E100FF', '#7F00FF'], name: 'Neon Purple', isLight: false },
    { colors: ['#6A3093', '#A044FF'], name: 'Purple Neon', isLight: false },
    { colors: ['#F00000', '#DC281E'], name: 'Dramatic Red', isLight: false },
    { colors: ['#FF0099', '#493240'], name: 'Hot Pink Dark', isLight: false },
    { colors: ['#000000', '#e74c3c'], name: 'Black Red', isLight: false },
    { colors: ['#FF5F6D', '#FFC371'], name: 'Coral Drama', isLight: false },
    { colors: ['#17ea74', '#fe0a59'], name: 'Green Pink', isLight: false },
    { colors: ['#fa8Bff', '#2bd2ff', '#2bff88'], name: 'Neon Rainbow', isLight: false },
    { colors: ['#4158d0', '#c850c0', '#ffcc70'], name: 'Morning Palette', isLight: false },
    { colors: ['#ff9a8b', '#ff6a88', '#ff99ac'], name: 'Multi Pink', isLight: false },
    { colors: ['#fbda61', '#ff5ac0'], name: 'Gold Pink', isLight: false },
    { colors: ['#ffe000', '#799f0c'], name: 'Yellow Green', isLight: false },
    { colors: ['#ff3cac', '#784ba0', '#2b86c5'], name: 'Multi Purple', isLight: false },
    { colors: ['#f4d03f', '#16a085'], name: 'Yellow Teal', isLight: false },
    { colors: ['#ff758c', '#ff7eb3'], name: 'Rose Blossom', isLight: false },
    { colors: ['#92fe9d', '#00c9ff'], name: 'Sky Bright', isLight: false },
    { colors: ['#85ffbd', '#fffb7d'], name: 'Lime Yellow', isLight: false },
    { colors: ['#B92B27', '#1565C0'], name: 'Bold Red', isLight: false },
    { colors: ['#E74C3C', '#C0392B'], name: 'Ruby Red', isLight: false },
    { colors: ['#CB2D3E', '#EF473A'], name: 'Scarlet', isLight: false },
    { colors: ['#ff5f6d', '#ffc371'], name: 'Fire Ice', isLight: false },
    { colors: ['#f093fb', '#f5576c'], name: 'Pink Vibe', isLight: false },
    // === LIGHT & PASTEL (181-210) ===
    { colors: ['#ffffff', '#f3f4f6'], name: 'Arctic', isLight: true },
    { colors: ['#fdfcfb', '#e2d1c3'], name: 'Cream', isLight: true },
    { colors: ['#e0c3fc', '#8ec5fc'], name: 'Lilac', isLight: true },
    { colors: ['#a8edea', '#fed6e3'], name: 'Cotton', isLight: true },
    { colors: ['#ee9ca7', '#ffdde1'], name: 'Piggy Pink', isLight: true },
    { colors: ['#8ec5fc', '#e0c3fc'], name: 'Light Lilac', isLight: true },
    { colors: ['#d9afd9', '#97d9e1'], name: 'Purple Teal', isLight: true },
    { colors: ['#faaca8', '#ddd6f3'], name: 'Pink Lilac', isLight: true },
    { colors: ['#ff9a9e', '#fecfef'], name: 'Peach Pink', isLight: true },
    { colors: ['#ffecd2', '#fcb69f'], name: 'Peach Cream', isLight: true },
    { colors: ['#f5f7fa', '#c3cfe2'], name: 'Silver', isLight: true },
    { colors: ['#e6e9f0', '#eef1f5'], name: 'Snow', isLight: true },
    { colors: ['#f0f2f0', '#000c40'], name: 'Fog', isLight: true },
    { colors: ['#ffecd2', '#fcb69f'], name: 'Warm Peach', isLight: true },
    { colors: ['#fbc2eb', '#a6c1ee'], name: 'Soft Pink', isLight: true },
    { colors: ['#a1c4fd', '#c2e9fb'], name: 'Sky Blue', isLight: true },
    { colors: ['#d4fc79', '#96e6a1'], name: 'Fresh Lime', isLight: true },
    { colors: ['#f5af19', '#f12711'], name: 'Orange Bright', isLight: false },
    { colors: ['#fddb92', '#d1fdff'], name: 'Lemon Cream', isLight: true },
    { colors: ['#e8cbc0', '#636fa4'], name: 'Dusty Blue', isLight: true },
    { colors: ['#89f7fe', '#66a6ff'], name: 'Ice Blue 2', isLight: true },
    { colors: ['#cd9cf2', '#f6f3ff'], name: 'Lavender Light', isLight: true },
    { colors: ['#c1dfc4', '#deecdd'], name: 'Sage', isLight: true },
    { colors: ['#f3e7e9', '#e3eeff'], name: 'Blush', isLight: true },
    { colors: ['#ffeaa7', '#dfe6e9'], name: 'Butter', isLight: true },
    { colors: ['#fab1a0', '#e17055'], name: 'Coral Light', isLight: true },
    { colors: ['#81ecec', '#74b9ff'], name: 'Aqua Light', isLight: true },
    { colors: ['#fd79a8', '#e84393'], name: 'Pink Bold', isLight: false },
    { colors: ['#00cec9', '#00b894'], name: 'Teal Light', isLight: false },
    { colors: ['#6c5ce7', '#a29bfe'], name: 'Purple Light', isLight: false },
    // === SOLID COLORS (211-240) ===
    { colors: ['#000000', '#000000'], name: 'Black', isLight: false },
    { colors: ['#1F2937', '#1F2937'], name: 'Charcoal', isLight: false },
    { colors: ['#374151', '#374151'], name: 'Gray 700', isLight: false },
    { colors: ['#4B5563', '#4B5563'], name: 'Gray 600', isLight: false },
    { colors: ['#6B7280', '#6B7280'], name: 'Gray 500', isLight: false },
    { colors: ['#DC2626', '#DC2626'], name: 'Red', isLight: false },
    { colors: ['#EA580C', '#EA580C'], name: 'Orange', isLight: false },
    { colors: ['#CA8A04', '#CA8A04'], name: 'Yellow', isLight: false },
    { colors: ['#16A34A', '#16A34A'], name: 'Green', isLight: false },
    { colors: ['#0891B2', '#0891B2'], name: 'Cyan', isLight: false },
    { colors: ['#2563EB', '#2563EB'], name: 'Blue', isLight: false },
    { colors: ['#7C3AED', '#7C3AED'], name: 'Purple', isLight: false },
    { colors: ['#DB2777', '#DB2777'], name: 'Pink', isLight: false },
    { colors: ['#0F172A', '#0F172A'], name: 'Slate 900', isLight: false },
    { colors: ['#1E293B', '#1E293B'], name: 'Slate 800', isLight: false },
    { colors: ['#334155', '#334155'], name: 'Slate 700', isLight: false },
    { colors: ['#475569', '#475569'], name: 'Slate 600', isLight: false },
    { colors: ['#64748B', '#64748B'], name: 'Slate 500', isLight: false },
    { colors: ['#0C4A6E', '#0C4A6E'], name: 'Sky 900', isLight: false },
    { colors: ['#075985', '#075985'], name: 'Sky 800', isLight: false },
    { colors: ['#0369A1', '#0369A1'], name: 'Sky 700', isLight: false },
    { colors: ['#1E3A8A', '#1E3A8A'], name: 'Blue 900', isLight: false },
    { colors: ['#1D4ED8', '#1D4ED8'], name: 'Blue 700', isLight: false },
    { colors: ['#4F46E5', '#4F46E5'], name: 'Indigo 600', isLight: false },
    { colors: ['#6366F1', '#6366F1'], name: 'Indigo 500', isLight: false },
    { colors: ['#7C3AED', '#7C3AED'], name: 'Violet 600', isLight: false },
    { colors: ['#8B5CF6', '#8B5CF6'], name: 'Violet 500', isLight: false },
    { colors: ['#A855F7', '#A855F7'], name: 'Purple 500', isLight: false },
    { colors: ['#C026D3', '#C026D3'], name: 'Fuchsia 600', isLight: false },
    { colors: ['#D946EF', '#D946EF'], name: 'Fuchsia 500', isLight: false },
  ];

  // Layout Templates
  const layoutPresets = [
    { id: 'centered', name: 'Centered', description: 'Classic centered layout' },
    { id: 'bottom-ref', name: 'Bottom Ref', description: 'Reference at bottom' },
    { id: 'top-ref', name: 'Top Ref', description: 'Reference at top, verse below' },
    { id: 'split', name: 'Split', description: 'Reference left, version right' },
    { id: 'minimal', name: 'Minimal', description: 'Just the verse' },
    { id: 'bold', name: 'Bold', description: 'Large impactful text' },
  ];

  // Aspect Ratios
  const aspectPresets = [
    { id: 'portrait', label: '4:5', name: 'Portrait', ratio: 4/5 },
    { id: 'square', label: '1:1', name: 'Square', ratio: 1 },
    { id: 'story', label: '9:16', name: 'Story', ratio: 9/16 },
    { id: 'wide', label: '16:9', name: 'Wide', ratio: 16/9 },
  ];

  // Font Styles - Clean list without bold/italic variants (use toggles instead)
  const fontPresets = [
    // === SERIF FONTS ===
    { id: 'georgia', name: 'Georgia', style: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' } },
    { id: 'times', name: 'Times', style: { fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif' } },
    { id: 'palatino', name: 'Palatino', style: { fontFamily: Platform.OS === 'ios' ? 'Palatino' : 'serif' } },
    { id: 'baskerville', name: 'Baskerville', style: { fontFamily: Platform.OS === 'ios' ? 'Baskerville' : 'serif' } },
    { id: 'bodoni', name: 'Bodoni 72', style: { fontFamily: Platform.OS === 'ios' ? 'Bodoni 72' : 'serif' } },
    { id: 'cochin', name: 'Cochin', style: { fontFamily: Platform.OS === 'ios' ? 'Cochin' : 'serif' } },
    { id: 'didot', name: 'Didot', style: { fontFamily: Platform.OS === 'ios' ? 'Didot' : 'serif' } },
    { id: 'hoefler', name: 'Hoefler', style: { fontFamily: Platform.OS === 'ios' ? 'Hoefler Text' : 'serif' } },
    { id: 'iowan', name: 'Iowan', style: { fontFamily: Platform.OS === 'ios' ? 'Iowan Old Style' : 'serif' } },
    { id: 'charter', name: 'Charter', style: { fontFamily: Platform.OS === 'ios' ? 'Charter' : 'serif' } },
    // === SANS-SERIF FONTS ===
    { id: 'helvetica', name: 'Helvetica', style: { fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif' } },
    { id: 'arial', name: 'Arial', style: { fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' } },
    { id: 'avenir', name: 'Avenir', style: { fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif' } },
    { id: 'avenirNext', name: 'Avenir Next', style: { fontFamily: Platform.OS === 'ios' ? 'Avenir Next' : 'sans-serif' } },
    { id: 'futura', name: 'Futura', style: { fontFamily: Platform.OS === 'ios' ? 'Futura' : 'sans-serif' } },
    { id: 'gillSans', name: 'Gill Sans', style: { fontFamily: Platform.OS === 'ios' ? 'Gill Sans' : 'sans-serif' } },
    { id: 'optima', name: 'Optima', style: { fontFamily: Platform.OS === 'ios' ? 'Optima' : 'sans-serif' } },
    { id: 'sfPro', name: 'SF Pro', style: { fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif' } },
    { id: 'verdana', name: 'Verdana', style: { fontFamily: Platform.OS === 'ios' ? 'Verdana' : 'sans-serif' } },
    { id: 'trebuchet', name: 'Trebuchet', style: { fontFamily: Platform.OS === 'ios' ? 'Trebuchet MS' : 'sans-serif' } },
    // === SCRIPT & DECORATIVE ===
    { id: 'snell', name: 'Snell', style: { fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'cursive' } },
    { id: 'bradleyHand', name: 'Bradley Hand', style: { fontFamily: Platform.OS === 'ios' ? 'Bradley Hand' : 'cursive' } },
    { id: 'chalkboard', name: 'Chalkboard', style: { fontFamily: Platform.OS === 'ios' ? 'Chalkboard SE' : 'cursive' } },
    { id: 'noteworthy', name: 'Noteworthy', style: { fontFamily: Platform.OS === 'ios' ? 'Noteworthy' : 'cursive' } },
    { id: 'zapfino', name: 'Zapfino', style: { fontFamily: Platform.OS === 'ios' ? 'Zapfino' : 'cursive' } },
    // === MONOSPACE ===
    { id: 'courier', name: 'Courier', style: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' } },
    { id: 'menlo', name: 'Menlo', style: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' } },
    { id: 'americanTypewriter', name: 'Typewriter', style: { fontFamily: Platform.OS === 'ios' ? 'American Typewriter' : 'monospace' } },
    // === DISPLAY ===
    { id: 'copperplate', name: 'Copperplate', style: { fontFamily: Platform.OS === 'ios' ? 'Copperplate' : 'serif' } },
    { id: 'rockwell', name: 'Rockwell', style: { fontFamily: Platform.OS === 'ios' ? 'Rockwell' : 'sans-serif' } },
    { id: 'systemDefault', name: 'System', style: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' } },
  ];

  // Text Alignment Options
  const alignPresets = [
    { id: 'left', icon: 'format-align-left' },
    { id: 'center', icon: 'format-align-center' },
    { id: 'right', icon: 'format-align-right' },
  ];
  
  // Audio player state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [audioAutoPlayEnabled, setAudioAutoPlayEnabled] = useState(false);
  const [currentAudioVerse, setCurrentAudioVerse] = useState(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  
  // Load recent searches on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await AsyncStorage.getItem('recentBibleSearches');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed);
          }
        }
      } catch (err) {
        console.log('Failed to load recent searches:', err);
      }
    };
    loadRecentSearches();
  }, []);

  const addRecentSearch = async (reference) => {
    if (!reference) return;
    setRecentSearches(prev => {
      const next = [reference, ...prev.filter(r => r !== reference)].slice(0, 8);
      AsyncStorage.setItem('recentBibleSearches', JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

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
        const screenHeight = windowHeight;
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
    const screenHeight = windowHeight;
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
      
      // Auto-focus search input after modal animation starts
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
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

  // Load saved verses on mount and when chapter changes
  useEffect(() => {
    loadSavedVerses();
    loadInteractiveData();
  }, []);
  
  // Reload saved verses when viewing a chapter (to catch newly saved ranges)
  useEffect(() => {
    if (currentChapter && currentBook) {
      loadSavedVerses();
    }
  }, [currentChapter, currentBook]);

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
          const verseNum = parseInt(verse.number || verse.verse);
          const verseId = `${currentBook?.id}_${currentChapter?.number}_${verseNum}`;
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
        const allSavedVerseIds = new Set();
        const rangeVerseIds = new Set(); // Track verses that are part of ranges
        
        versesArray.forEach(v => {
          // If it's a range, add all individual verse IDs to both sets
          if (v.isRange && v.startVerse && v.endVerse) {
            // Extract book ID from the main ID (format: bookId_chapter_start-end)
            const idParts = v.id.split('_');
            if (idParts.length >= 2) {
              const bookId = idParts[0];
              const chapter = idParts[1];
              for (let i = v.startVerse; i <= v.endVerse; i++) {
                const individualId = `${bookId}_${chapter}_${i}`;
                allSavedVerseIds.add(individualId);
                rangeVerseIds.add(individualId); // Mark as range verse for purple heart
              }
            }
          } else {
            // For single verses, construct consistent ID if we have the data
            if (v.bookId && v.chapter && v.verse) {
              const consistentId = `${v.bookId}_${v.chapter}_${parseInt(v.verse)}`;
              allSavedVerseIds.add(consistentId);
            } else {
              // Fallback: add the original ID and try to parse it
              allSavedVerseIds.add(v.id);
              // Also try to construct from chapter/verse if available
              // This handles legacy data without bookId
              if (v.chapter && v.verse && v.id) {
                // Try extracting bookId from the stored id (format might be bookId_chapter_verse or bookId.chapter.verse)
                const underscoreParts = v.id.split('_');
                const dotParts = v.id.split('.');
                if (underscoreParts.length >= 2) {
                  const bookId = underscoreParts[0];
                  const consistentId = `${bookId}_${v.chapter}_${parseInt(v.verse)}`;
                  allSavedVerseIds.add(consistentId);
                } else if (dotParts.length >= 2) {
                  const bookId = dotParts[0];
                  const consistentId = `${bookId}_${v.chapter}_${parseInt(v.verse)}`;
                  allSavedVerseIds.add(consistentId);
                }
              }
            }
          }
        });
        
        setSavedVerses(allSavedVerseIds);
        setRangeVersesSet(rangeVerseIds);
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

  // If the selected Bible version changes (or finishes loading) while we're already
  // viewing a chapter, ensure the visible verses are refetched in that version.
  // This fixes a real bug: opening BibleReader can fetch verses in default 'kjv'
  // before AsyncStorage loads e.g. 'nlt', resulting in "NLT" label + KJV text.
  useEffect(() => {
    if (!visible) return;
    if (view !== 'verses' || !currentChapter) return;
    if (lastLoadedVersesVersionRef.current === selectedBibleVersion) return;

    console.log(
      '🔄 BibleReader: Version changed/loaded, refetching chapter',
      currentChapter.id,
      'as',
      selectedBibleVersion
    );
    loadVersesWithVersion(currentChapter, selectedBibleVersion);
  }, [visible, view, currentChapter, selectedBibleVersion]);

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
    
    const verseNum = parseInt(selectedVerseForMenu.number || selectedVerseForMenu.verse);
    const verseId = `${currentBook?.id}_${currentChapter?.number}_${verseNum}`;
    const verseReference = `${currentBook?.name} ${currentChapter?.number}:${verseNum}`;
    
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
    
    const verseNum = parseInt(selectedVerseForMenu.number || selectedVerseForMenu.verse);
    const verseId = `${currentBook?.id}_${currentChapter?.number}_${verseNum}`;
    
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
    
    const verseNum = parseInt(selectedVerseForMenu.number || selectedVerseForMenu.verse);
    const verseId = `${currentBook?.id}_${currentChapter?.number}_${verseNum}`;
    const journalData = {
      ...selectedVerseForMenu,
      id: verseId,
      reference: `${currentBook?.name} ${currentChapter?.number}:${verseNum}`,
      text: selectedVerseForMenu.content || selectedVerseForMenu.text || ''
    };
    
    // Close verse menu and open note modal
    closeVerseMenu();
    setSelectedVerseForJournal(journalData);
    setShowJournalingModal(true);
  };

  // 100+ Beautiful Share Card Gradients with excellent readability
  const getShareCardGradient = () => {
    const shareCardGradients = [
      // Deep Ocean Collection
      ['#0F2027', '#203A43', '#2C5364'], // Deep ocean
      ['#000428', '#004e92'], // Navy depths
      ['#141E30', '#243B55'], // Midnight ocean
      ['#1e3c72', '#2a5298'], // Deep blue
      ['#000046', '#1CB5E0'], // Ocean abyss
      
      // Sunset & Sunrise Collection
      ['#ED4264', '#FFEDBC'], // Coral sunset
      ['#C33764', '#1D2671'], // Purple dusk
      ['#F2709C', '#FF9472'], // Pink sunrise
      ['#EE0979', '#FF6A00'], // Vibrant sunset
      ['#FF512F', '#DD2476'], // Fire sunset
      ['#FF416C', '#FF4B2B'], // Hot sunset
      ['#200122', '#6f0000'], // Dark red sunset
      
      // Forest & Nature Collection
      ['#134E5E', '#71B280'], // Forest green
      ['#0F2027', '#2C5364'], // Deep forest
      ['#076585', '#fff'], // Sky gradient
      ['#11998e', '#38ef7d'], // Emerald
      ['#16222A', '#3A6073'], // Ocean forest
      ['#005C97', '#363795'], // Deep teal
      
      // Royal & Luxe Collection
      ['#360033', '#0b8793'], // Royal purple
      ['#4A00E0', '#8E2DE2'], // Deep violet
      ['#5f2c82', '#49a09d'], // Regal
      ['#834d9b', '#d04ed6'], // Purple majesty
      ['#6441A5', '#2a0845'], // Deep purple
      ['#7F00FF', '#E100FF'], // Ultra violet
      ['#8E0E00', '#1F1C18'], // Dark red royal
      
      // Berry & Wine Collection
      ['#8E2DE2', '#4A00E0'], // Berry blast
      ['#a8c0ff', '#3f2b96'], // Blueberry
      ['#D31027', '#EA384D'], // Cherry red
      ['#880E4F', '#1A237E'], // Wine dark
      ['#642B73', '#C6426E'], // Plum wine
      
      // Golden Hour Collection
      ['#F09819', '#EDDE5D'], // Honey gold
      ['#FFB75E', '#ED8F03'], // Amber
      ['#f7971e', '#ffd200'], // Sunset gold
      ['#FDC830', '#F37335'], // Mango gold
      ['#F46B45', '#EEA849'], // Peach gold
      
      // Mystical & Magic Collection
      ['#4568DC', '#B06AB3'], // Mystic purple
      ['#6A82FB', '#FC5C7D'], // Magic hour
      ['#9D50BB', '#6E48AA'], // Enchanted
      ['#5E60CE', '#4EA8DE'], // Cosmic blue
      ['#667eea', '#764ba2'], // Purple magic
      ['#4776E6', '#8E54E9'], // Electric purple
      
      // Earth Tones Collection
      ['#603813', '#b29f94'], // Earth brown
      ['#3E2723', '#6D4C41'], // Chocolate earth
      ['#37474F', '#263238'], // Slate gray
      ['#455A64', '#263238'], // Storm gray
      ['#4E342E', '#5D4037'], // Coffee brown
      
      // Cool Blues Collection
      ['#1488CC', '#2B32B2'], // Azure
      ['#005AA7', '#FFFDE4'], // Light blue
      ['#003973', '#E5E5BE'], // Soft blue
      ['#283c86', '#45a247'], // Cool gradient
      ['#2E3192', '#1BFFFF'], // Electric blue
      ['#136a8a', '#267871'], // Turquoise
      
      // Warm Reds Collection
      ['#B92B27', '#1565C0'], // Bold red
      ['#870000', '#190A05'], // Deep crimson
      ['#E74C3C', '#C0392B'], // Ruby red
      ['#CB2D3E', '#EF473A'], // Scarlet
      ['#3a1c71', '#d76d77', '#ffaf7b'], // Triple warmth
      
      // Tropical Collection
      ['#f953c6', '#b91d73'], // Tropical pink
      ['#ee0979', '#ff6a00'], // Mango tango
      ['#FF7E5F', '#FEB47B'], // Peach
      ['#FA8BFF', '#2BD2FF', '#2BFF88'], // Rainbow bright
      ['#FF61D2', '#FE9090'], // Coral pink
      
      // Galaxy & Space Collection
      ['#000000', '#434343'], // Space black
      ['#0F2027', '#203A43'], // Nebula
      ['#2C3E50', '#4CA1AF'], // Space blue
      ['#232526', '#414345'], // Dark matter
      ['#1D2671', '#C33764'], // Galaxy purple
      ['#2C3E50', '#3498DB'], // Stellar
      
      // Jewel Tones Collection
      ['#108DC7', '#EF8E38'], // Sapphire sunset
      ['#FF0099', '#493240'], // Ruby dark
      ['#0099F7', '#F11712'], // Bold jewels
      ['#614385', '#516395'], // Amethyst
      ['#009FFF', '#ec2F4B'], // Neon jewels
      
      // Moody Dark Collection
      ['#0B486B', '#F56217'], // Deep moody
      ['#003973', '#E5E5BE'], // Dark teal
      ['#1f4037', '#99f2c8'], // Forest night
      ['#355C7D', '#6C5B7B', '#C06C84'], // Dusty rose
      ['#403A3E', '#BE5869'], // Dusty pink
      
      // Vibrant Neon Collection
      ['#FF0844', '#FFB199'], // Hot neon
      ['#7F7FD5', '#86A8E7', '#91EAE4'], // Neon dream
      ['#00F260', '#0575E6'], // Cyber green
      ['#E100FF', '#7F00FF'], // Neon purple
      ['#6A3093', '#A044FF'], // Purple neon
      
      // Professional Blues
      ['#1A2980', '#26D0CE'], // Corporate blue
      ['#304352', '#d7d2cc'], // Professional steel
      ['#2C3E50', '#BDC3C7'], // Business gray
      ['#1e3c72', '#1e3c72', '#2a5298'], // Navy pro
      ['#659999', '#f4791f'], // Modern blue
      
      // Rich Greens
      ['#34e89e', '#0f3443'], // Jade
      ['#0cebeb', '#20e3b2', '#29ffc6'], // Mint gradient
      ['#00d2ff', '#3a47d5'], // Sky green
      ['#02AAB0', '#00CDAC'], // Teal fresh
      ['#56ab2f', '#a8e063'], // Spring green
      
      // Warm Sunset Extended
      ['#ff6e7f', '#bfe9ff'], // Soft sunset
      ['#f83600', '#f9d423'], // Fire sky
      ['#ffc3a0', '#ffafbd'], // Pastel sunset
      ['#cc2b5e', '#753a88'], // Magenta sunset
      ['#e43a15', '#e65245'], // Orange fire
      
      // Arctic & Ice Collection
      ['#3E5151', '#DECBA4'], // Arctic light
      ['#355C7D', '#6C5B7B'], // Frozen
      ['#2C3E50', '#4CA1AF'], // Ice blue
      ['#7474BF', '#348AC7'], // Winter sky
      ['#1D976C', '#93F9B9'], // Ice mint
      
      // Autumn Collection
      ['#D38312', '#A83279'], // Autumn leaves
      ['#DA4453', '#89216B'], // Deep autumn
      ['#F2994A', '#F2C94C'], // Golden fall
      ['#D66D75', '#E29587'], // Rustic autumn
      ['#BE93C5', '#7BC6CC'], // Soft autumn
      
      // Bold & Dramatic
      ['#F00000', '#DC281E'], // Dramatic red
      ['#FF0099', '#493240'], // Hot pink dark
      ['#000000', '#e74c3c'], // Black to red
      ['#141517', '#51a3a3'], // Dark teal drama
      ['#FF5F6D', '#FFC371'], // Coral drama
      
      // Soft Pastels (darkened for readability)
      ['#667eea', '#764ba2'], // Purple pastel
      ['#f093fb', '#f5576c'], // Pink pastel
      ['#4facfe', '#00f2fe'], // Blue pastel
      ['#43e97b', '#38f9d7'], // Green pastel
      ['#fa709a', '#fee140'], // Peach pastel
    ];
    
    // Pick a random gradient from the collection
    const randomIndex = Math.floor(Math.random() * shareCardGradients.length);
    return shareCardGradients[randomIndex];
  };

  const getFullVerseText = (verse) => (verse?.content || verse?.text || '').replace(/\s+/g, ' ').trim();

  // Get a verse from the currently loaded chapter by its verse number
  const getVerseByNumber = (verseNumber) => {
    if (!verseNumber || !Array.isArray(verses)) return null;
    const target = Number(verseNumber);
    return verses.find(v => Number(v.number ?? v.verse) === target) || null;
  };

  // Choose the most share-worthy slice of the verse:
  // prefer an inner quoted phrase (e.g., the memorable clause) and
  // fall back to the full verse text if no quotes are present.
  const getShareCardText = (verse) => {
    if (!verse) return '';

    const fullText = getFullVerseText(verse);
    const quotedSegments = fullText.match(/“([^”]+)”/g) || fullText.match(/"([^"]+)"/g);

    if (quotedSegments && quotedSegments.length) {
      const lastQuoted = quotedSegments[quotedSegments.length - 1]
        .replace(/[“”"]/g, '')
        .trim();

      if (lastQuoted.length > 0 && lastQuoted.length < fullText.length) {
        return lastQuoted;
      }
    }

    return fullText;
  };

  const getShareCardBaseTextForRange = (startNumber, endNumber, mode) => {
    if (!startNumber) return '';
    const start = Number(startNumber);
    const safeEnd = Math.max(start, Number(endNumber || startNumber));
    const collected = [];
    for (let i = start; i <= safeEnd; i++) {
      const v = getVerseByNumber(i);
      if (!v) break;
      collected.push(getFullVerseText(v));
    }
    // Use a single newline so multi-verse cards flow naturally
    return collected.join('\n');
  };

  // Get the selected portion of text with ellipsis prefix/suffix if needed
  const getSelectedVerseText = () => {
    if (textSelectionStart === null || textSelectionEnd === null || textSelectionWords.length === 0) {
      return '';
    }
    const startIdx = Math.min(textSelectionStart, textSelectionEnd);
    const endIdx = Math.max(textSelectionStart, textSelectionEnd);
    const selectedWords = textSelectionWords.slice(startIdx, endIdx + 1);
    let selectedText = selectedWords.join(' ');
    // Add "..." prefix if selection doesn't start at the beginning
    if (startIdx > 0) {
      selectedText = '...' + selectedText;
    }
    // Add "..." suffix if selection doesn't reach the end
    if (endIdx < textSelectionWords.length - 1) {
      selectedText = selectedText + '...';
    }
    return selectedText;
  };

  // Open text selection modal with words from the verse(s)
  const openTextSelectionModal = () => {
    if (!selectedVerseForMenu) return;
    // Get text from all verses in the range
    const selectedVerseNumber = selectedVerseForMenu.number || selectedVerseForMenu.verse;
    const fullText = getShareCardBaseTextForRange(
      selectedVerseNumber,
      shareCardEndVerseNumber || selectedVerseNumber,
      'full'
    );
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    setTextSelectionWords(words);
    setTextSelectionStart(null);
    setTextSelectionEnd(null);
    setShowTextSelectionModal(true);
  };

  // Handle word tap in selection modal
  const handleWordTap = (index) => {
    hapticFeedback.light();
    if (textSelectionStart === null) {
      // First tap - set start
      setTextSelectionStart(index);
      setTextSelectionEnd(index);
    } else if (textSelectionEnd === textSelectionStart) {
      // Second tap - set end
      setTextSelectionEnd(index);
    } else {
      // Third tap - reset and start over
      setTextSelectionStart(index);
      setTextSelectionEnd(index);
    }
  };

  // Confirm text selection
  const confirmTextSelection = () => {
    const selectedText = getSelectedVerseText();
    if (selectedText) {
      setShareCardText(selectedText);
      setShareCardTextMode('selected');
    }
    setShowTextSelectionModal(false);
  };

  // Scale verse text size gradually based on text length
  const getShareCardTextSizing = (text) => {
    const length = text.length;
    // Very long text (4+ verses)
    if (length > 800) return { fontSize: 14, lineHeight: 24 };
    if (length > 700) return { fontSize: 15, lineHeight: 25 };
    if (length > 600) return { fontSize: 16, lineHeight: 26 };
    if (length > 520) return { fontSize: 17, lineHeight: 28 };
    if (length > 450) return { fontSize: 18, lineHeight: 29 };
    // Medium text (2-3 verses)
    if (length > 380) return { fontSize: 19, lineHeight: 30 };
    if (length > 320) return { fontSize: 20, lineHeight: 31 };
    if (length > 270) return { fontSize: 21, lineHeight: 32 };
    if (length > 220) return { fontSize: 22, lineHeight: 34 };
    // Short text (1-2 verses)
    if (length > 180) return { fontSize: 24, lineHeight: 36 };
    if (length > 140) return { fontSize: 26, lineHeight: 40 };
    if (length > 100) return { fontSize: 28, lineHeight: 42 };
    if (length > 60) return { fontSize: 30, lineHeight: 44 };
    // Very short text
    return { fontSize: 32, lineHeight: 48 };
  };

  const getShareCardDisplayText = () => {
    if (!selectedVerseForMenu) return '';
    // If user has custom/selected text, use it directly
    if (shareCardText.trim()) {
      return shareCardText.trim();
    }
    // Otherwise fall back to full verse text
    const selectedVerseNumber = selectedVerseForMenu.number || selectedVerseForMenu.verse;
    return getShareCardBaseTextForRange(
      selectedVerseNumber,
      shareCardEndVerseNumber || selectedVerseNumber,
      shareCardTextMode
    );
  };

  // Save verse to saved verses
  
  // ========== AUDIO FUNCTIONS ==========
  
  // Setup audio service callbacks
  useEffect(() => {
    bibleAudioService.onPlaybackStateChange = (state) => {
      setIsAudioPlaying(state.isPlaying);
      setIsAudioPaused(state.isPaused);
      setAudioAutoPlayEnabled(state.autoPlayEnabled);
      
      // Update current verse when audio is active (playing, paused, or loading)
      if (state.isPlaying || state.isPaused || state.isLoading) {
        if (state.currentVerse) {
          setCurrentAudioVerse(state.currentVerse.verse);
        }
        // Show audio player when audio is active
        setShowAudioPlayer(true);
      }
      // Note: Don't hide the player here - let onComplete or stopAudio handle that
    };
    
    bibleAudioService.onVerseChange = (verse, index) => {
      setCurrentAudioVerse(verse);
      
      // Auto-scroll to keep the currently-read verse in view
      // Use a simple approach: scroll based on verse index position
      if (index !== undefined && versesScrollViewRef.current) {
        // Estimate verse height (~80px per verse) and scroll to position
        const estimatedY = index * 80;
        versesScrollViewRef.current.scrollTo({
          y: Math.max(0, estimatedY - 150),
          animated: true,
        });
      }
    };
    
    bibleAudioService.onComplete = () => {
      setShowAudioPlayer(false);
      setCurrentAudioVerse(null);
    };
    
    return () => {
      bibleAudioService.onPlaybackStateChange = null;
      bibleAudioService.onVerseChange = null;
      bibleAudioService.onComplete = null;
    };
  }, []);
  
  // Listen to verse - prompt user to choose single or continuous mode
  const listenToVerse = () => {
    if (!selectedVerseForMenu || !currentBook || !currentChapter) return;
    
    hapticFeedback.medium();
    
    // Capture verse data before closing menu (closeVerseMenu clears selectedVerseForMenu)
    const verseToPlay = selectedVerseForMenu;
    const bookToPlay = currentBook;
    const chapterToPlay = currentChapter;
    const verseNumber = verseToPlay.number || verseToPlay.verse;
    
    // Find start index for auto-play
    const startIndex = verses.findIndex(v => 
      (v.number || v.verse) === verseNumber
    );
    
    // Close verse menu first
    closeVerseMenu();
    
    // Show options to user
    Alert.alert(
      'Listen Mode',
      `How would you like to listen to ${bookToPlay.name} ${chapterToPlay.number}:${verseNumber}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'This Verse Only',
          onPress: () => playSingleVerse(bookToPlay, chapterToPlay, verseToPlay),
        },
        {
          text: 'Continue Reading',
          onPress: () => playAutoMode(bookToPlay, chapterToPlay, verseToPlay, startIndex),
        },
      ]
    );
  };
  
  // Play single verse only
  const playSingleVerse = async (bookToPlay, chapterToPlay, verseToPlay) => {
    setShowAudioPlayer(true);
    setCurrentAudioVerse(verseToPlay);
    setAudioAutoPlayEnabled(false);
    AchievementService.incrementStat('audiosPlayed');
    
    try {
      await bibleAudioService.speakVerse({
        book: bookToPlay.name,
        chapter: chapterToPlay.number,
        verse: verseToPlay,
        announceReference: true,
      });
    } catch (error) {
      console.error('Failed to play verse audio:', error);
      Alert.alert('Audio Error', 'Failed to play verse audio. Please try again.');
      setShowAudioPlayer(false);
    }
  };
  
  // Play auto-continue mode (reads through chapter)
  const playAutoMode = async (bookToPlay, chapterToPlay, verseToPlay, startIndex) => {
    setShowAudioPlayer(true);
    setCurrentAudioVerse(verseToPlay);
    setAudioAutoPlayEnabled(true);
    AchievementService.incrementStat('audiosPlayed');
    
    try {
      if (startIndex !== -1 && verses.length > 0) {
        await bibleAudioService.startAutoPlay({
          book: bookToPlay.name,
          chapter: chapterToPlay.number,
          verses: verses,
          startIndex: startIndex,
        });
      } else {
        // Fallback to single verse if can't find index
        await bibleAudioService.speakVerse({
          book: bookToPlay.name,
          chapter: chapterToPlay.number,
          verse: verseToPlay,
          announceReference: true,
        });
      }
    } catch (error) {
      console.error('Failed to play verse audio:', error);
      Alert.alert('Audio Error', 'Failed to play verse audio. Please try again.');
      setShowAudioPlayer(false);
      setAudioAutoPlayEnabled(false);
    }
  };
  
  // Stop audio playback
  const stopAudio = async () => {
    await bibleAudioService.stop();
    setShowAudioPlayer(false);
    setCurrentAudioVerse(null);
    setAudioAutoPlayEnabled(false);
  };
  
  // Toggle auto-play mode
  const toggleAutoPlay = async () => {
    if (audioAutoPlayEnabled) {
      // Disable auto-play, just let current verse finish
      bibleAudioService.autoPlayEnabled = false;
      setAudioAutoPlayEnabled(false);
      hapticFeedback.light();
    } else {
      // Enable auto-play from current position
      hapticFeedback.medium();
      if (currentAudioVerse && currentBook && currentChapter && verses.length > 0) {
        const verseNumber = currentAudioVerse.number || currentAudioVerse.verse;
        const startIndex = verses.findIndex(v => 
          (v.number || v.verse) === verseNumber
        );
        
        if (startIndex !== -1) {
          setAudioAutoPlayEnabled(true);
          await bibleAudioService.startAutoPlay({
            book: currentBook.name,
            chapter: currentChapter.number,
            verses: verses,
            startIndex: startIndex,
          });
        }
      }
    }
  };
  
  // Close audio player
  const closeAudioPlayer = async () => {
    await stopAudio();
  };
  
  // ========== END AUDIO FUNCTIONS ==========
  
  // Share verse function
  const shareVerse = () => {
    if (!selectedVerseForMenu) return;
    
    hapticFeedback.medium();

    // Default to FULL verse when opening the card and seed editable text
    const defaultFull = getFullVerseText(selectedVerseForMenu);
    setShareCardTextMode('full');
    const baseNumber = selectedVerseForMenu.number || selectedVerseForMenu.verse;
    setShareCardEndVerseNumber(baseNumber);
    setShareCardText(defaultFull);
    
    // Only reset temporary state, keep user's saved preferences (bg, layout, font, etc.)
    setShareCardControlsTab('bg');
    
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
      setSelectedVerseForMenu(null);
      setShareCardAnimating(false);
      // Reset customization state
      setShareCardText('');
      setShareCardEndVerseNumber(null);
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
    
    // Always construct verseId consistently for proper matching
    const verseNumber = parseInt(selectedVerseForMenu.number || selectedVerseForMenu.verse);
    const verseId = `${currentBook?.id}_${currentChapter?.number}_${verseNumber}`;
    const verseReference = `${currentBook?.name} ${currentChapter?.number}:${verseNumber}`;
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
        bookId: currentBook?.id, // Store bookId for consistent ID reconstruction
        chapter: currentChapter?.number,
        verse: verseNumber,
        version: selectedBibleVersion,
        timestamp: Date.now()
      };
      
      currentSavedVerses.push(newVerse);
      await AsyncStorage.setItem('savedBibleVerses', JSON.stringify(currentSavedVerses));
      
      // Update stats and check achievements
      AchievementService.setStat('savedVerses', currentSavedVerses.length);
      
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

  // Start range selection mode
  const startRangeSelection = () => {
    if (!selectedVerseForMenu) return;
    
    const startNum = parseInt(selectedVerseForMenu.number || selectedVerseForMenu.verse);
    setRangeStartVerse(selectedVerseForMenu);
    setRangeEndVerseNum(startNum); // Start with just the one verse
    setRangeSelectionMode(true);
    closeVerseMenu();
    hapticFeedback.medium();
  };
  
  // Add verse to range (plus button)
  const extendRange = () => {
    if (!rangeEndVerseNum || !verses.length) return;
    const maxVerse = Math.max(...verses.map(v => parseInt(v.number || v.verse)));
    if (rangeEndVerseNum < maxVerse) {
      setRangeEndVerseNum(rangeEndVerseNum + 1);
      hapticFeedback.light();
    }
  };
  
  // Remove verse from range (minus button)
  const shrinkRange = () => {
    if (!rangeEndVerseNum || !rangeStartVerse) return;
    const startNum = parseInt(rangeStartVerse.number || rangeStartVerse.verse);
    if (rangeEndVerseNum > startNum) {
      setRangeEndVerseNum(rangeEndVerseNum - 1);
      hapticFeedback.light();
    }
  };
  
  // Save the current range
  const saveCurrentRange = async () => {
    if (!rangeStartVerse || !rangeEndVerseNum || !currentBook || !currentChapter) return;
    
    const startNum = parseInt(rangeStartVerse.number || rangeStartVerse.verse);
    const actualStart = Math.min(startNum, rangeEndVerseNum);
    const actualEnd = Math.max(startNum, rangeEndVerseNum);
    
    // Get all verses in the range
    const versesInRange = verses.filter(v => {
      const num = parseInt(v.number || v.verse);
      return num >= actualStart && num <= actualEnd;
    }).sort((a, b) => parseInt(a.number || a.verse) - parseInt(b.number || b.verse));
    
    if (versesInRange.length === 0) {
      cancelRangeSelection();
      return;
    }
    
    // Create combined reference and text
    const rangeReference = actualStart === actualEnd 
      ? `${currentBook.name} ${currentChapter.number}:${actualStart}`
      : `${currentBook.name} ${currentChapter.number}:${actualStart}-${actualEnd}`;
    
    const combinedText = versesInRange
      .map(v => (v.content || v.text || '').replace(/\s+/g, ' ').trim())
      .join(' ');
    
    const rangeId = `${currentBook.id}_${currentChapter.number}_${actualStart}-${actualEnd}`;
    
    try {
      const savedVersesData = await AsyncStorage.getItem('savedBibleVerses');
      const currentSavedVerses = savedVersesData ? JSON.parse(savedVersesData) : [];
      
      // Check if already saved
      const alreadySaved = currentSavedVerses.some(v => v.id === rangeId);
      if (alreadySaved) {
        hapticFeedback.light();
        Alert.alert('Already Saved', 'This verse range is already in your saved verses');
        cancelRangeSelection();
        return;
      }
      
      // Add new verse range
      const newVerse = {
        id: rangeId,
        reference: rangeReference,
        text: combinedText,
        book: currentBook.name,
        chapter: currentChapter.number,
        verse: `${actualStart}-${actualEnd}`,
        version: selectedBibleVersion,
        timestamp: Date.now(),
        isRange: true,
        startVerse: actualStart,
        endVerse: actualEnd
      };
      
      currentSavedVerses.push(newVerse);
      await AsyncStorage.setItem('savedBibleVerses', JSON.stringify(currentSavedVerses));
      
      // Update stats and check achievements
      AchievementService.setStat('savedVerses', currentSavedVerses.length);
      
      // Mark all verses in the range as saved
      const newSavedVersesSet = new Set([...savedVerses]);
      const newRangeVersesSet = new Set([...rangeVersesSet]);
      for (let i = actualStart; i <= actualEnd; i++) {
        const individualVerseId = `${currentBook.id}_${currentChapter.number}_${i}`;
        newSavedVersesSet.add(individualVerseId);
        newRangeVersesSet.add(individualVerseId); // Mark as range verse for purple heart
      }
      newSavedVersesSet.add(rangeId);
      setSavedVerses(newSavedVersesSet);
      setRangeVersesSet(newRangeVersesSet);
      
      console.log(`✅ Saved verse range: ${rangeReference}`);
      hapticFeedback.success();
      Alert.alert('Saved', `${rangeReference} saved successfully`);
    } catch (error) {
      console.error('Error saving verse range:', error);
    }
    
    cancelRangeSelection();
  };

  // Complete range selection and save
  const completeRangeSelection = async (endVerse) => {
    if (!rangeStartVerse || !endVerse || !currentBook || !currentChapter) return;
    
    const startNum = parseInt(rangeStartVerse.number || rangeStartVerse.verse);
    const endNum = parseInt(endVerse.number || endVerse.verse);
    
    // Ensure start is before end
    const actualStart = Math.min(startNum, endNum);
    const actualEnd = Math.max(startNum, endNum);
    
    // Get all verses in the range
    const versesInRange = verses.filter(v => {
      const num = parseInt(v.number || v.verse);
      return num >= actualStart && num <= actualEnd;
    }).sort((a, b) => parseInt(a.number || a.verse) - parseInt(b.number || b.verse));
    
    if (versesInRange.length === 0) {
      setRangeSelectionMode(false);
      setRangeStartVerse(null);
      return;
    }
    
    // Create combined reference and text
    const rangeReference = actualStart === actualEnd 
      ? `${currentBook.name} ${currentChapter.number}:${actualStart}`
      : `${currentBook.name} ${currentChapter.number}:${actualStart}-${actualEnd}`;
    
    const combinedText = versesInRange
      .map(v => (v.content || v.text || '').replace(/\s+/g, ' ').trim())
      .join(' ');
    
    const rangeId = `${currentBook.id}_${currentChapter.number}_${actualStart}-${actualEnd}`;
    
    try {
      const savedVersesData = await AsyncStorage.getItem('savedBibleVerses');
      const currentSavedVerses = savedVersesData ? JSON.parse(savedVersesData) : [];
      
      // Check if already saved
      const alreadySaved = currentSavedVerses.some(v => v.id === rangeId);
      if (alreadySaved) {
        hapticFeedback.light();
        Alert.alert('Already Saved', 'This verse range is already in your saved verses');
        setRangeSelectionMode(false);
        setRangeStartVerse(null);
        return;
      }
      
      // Add new verse range
      const newVerse = {
        id: rangeId,
        reference: rangeReference,
        text: combinedText,
        book: currentBook.name,
        chapter: currentChapter.number,
        verse: `${actualStart}-${actualEnd}`,
        version: selectedBibleVersion,
        timestamp: Date.now(),
        isRange: true,
        startVerse: actualStart,
        endVerse: actualEnd
      };
      
      currentSavedVerses.push(newVerse);
      await AsyncStorage.setItem('savedBibleVerses', JSON.stringify(currentSavedVerses));
      
      // Update stats and check achievements
      AchievementService.setStat('savedVerses', currentSavedVerses.length);
      
      // Mark all verses in the range as saved (for heart icon display)
      const newSavedVersesSet = new Set([...savedVerses]);
      const newRangeVersesSet = new Set([...rangeVersesSet]);
      for (let i = actualStart; i <= actualEnd; i++) {
        const individualVerseId = `${currentBook.id}_${currentChapter.number}_${i}`;
        newSavedVersesSet.add(individualVerseId);
        newRangeVersesSet.add(individualVerseId); // Mark as range verse for purple heart
      }
      // Also add the range ID itself
      newSavedVersesSet.add(rangeId);
      setSavedVerses(newSavedVersesSet);
      setRangeVersesSet(newRangeVersesSet);
      
      console.log(`✅ Saved verse range: ${rangeReference}`);
      hapticFeedback.success();
      Alert.alert('Saved', `${rangeReference} saved successfully`);
    } catch (error) {
      console.error('Error saving verse range:', error);
    }
    
    setRangeSelectionMode(false);
    setRangeStartVerse(null);
  };

  // Cancel range selection
  const cancelRangeSelection = () => {
    setRangeSelectionMode(false);
    setRangeStartVerse(null);
    setRangeEndVerseNum(null);
    hapticFeedback.light();
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
      lastLoadedVersesVersionRef.current = selectedBibleVersion;
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
      lastLoadedVersesVersionRef.current = versionId;
      setCurrentChapter(chapter);
      setLoading(false);
    } catch (error) {
      Alert.alert('📜 Error', 'Failed to load verses.');
      setLoading(false);
    }
  };

  // Scroll to target verse when verses load
  useEffect(() => {
    if (verses.length > 0 && targetVerseNumber) {
      console.log('🎯 Attempting to scroll to verse:', targetVerseNumber, 'Ref exists:', !!verseRefs.current[targetVerseNumber]);
      
      // Function to attempt scrolling
      const attemptScroll = (attempt = 0) => {
        const targetVerseNum = parseInt(targetVerseNumber);
        const ref = verseRefs.current[targetVerseNum];
        
        if (ref) {
          console.log('✅ Found ref, scrolling to verse:', targetVerseNum);
          ref.measureLayout(
            versesScrollViewRef.current,
            (x, y) => {
              versesScrollViewRef.current?.scrollTo({
                y: Math.max(0, y - 200),
                animated: true
              });
              // Highlight the verse briefly
              setHighlightedVerse(targetVerseNum);
              hapticFeedback.light();
              setTimeout(() => {
                setHighlightedVerse(null);
                setTargetVerseNumber(null);
              }, 2000);
            },
            () => console.log('❌ Failed to measure verse position')
          );
        } else if (attempt < 5) {
          // Retry up to 5 times with increasing delays
          console.log(`⏳ Ref not ready yet, retrying in ${(attempt + 1) * 200}ms...`);
          setTimeout(() => attemptScroll(attempt + 1), (attempt + 1) * 200);
        } else {
          console.log('❌ Failed to find verse ref after 5 attempts');
        }
      };
      
      // Start attempting with initial delay
      setTimeout(() => attemptScroll(), 300);
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

  // Live search effect - triggers on every keystroke
  useEffect(() => {
    const performLiveSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Use the new liveSearchVerses method (limit to 100 results)
        const results = await completeBibleService.liveSearchVerses(searchQuery, 100);
        
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
            return result; // Fallback to default version if fetch fails
          })
        );
        
        setSearchResults(resultsWithVersion);
      } catch (error) {
        console.error('Live search error:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(performLiveSearch, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedBibleVersion]); // Re-run when query or version changes

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
        
        // Set target verse number to trigger automatic scroll and highlight
        // This uses the same mechanism as search results for consistent behavior
        // The parser returns 'startVerse' not 'verse'
        if (parsedRef.startVerse) {
          console.log('🎯 Setting targetVerseNumber to:', parsedRef.startVerse);
          setTargetVerseNumber(parsedRef.startVerse);
        } else {
          console.log('⚠️ No verse number in parsed reference:', parsedRef);
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
        temporarilyHighlightVerse(verseNumber);
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
    const verseNum = parseInt(verse.number || verse.verse);
    const verseId = `${currentBook?.id}_${currentChapter?.number}_${verseNum}`;
    const bookName = currentBook?.name || 'Book';
    const chapterNum = currentChapter?.number || currentChapter?.id?.split('_').pop() || '';
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
      const result = await Share.share({
        message: shareContent,
        title: reference
      });
      if (result.action !== Share.dismissedAction) {
        AchievementService.incrementStat('versesShared');
      }
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
    const verseNum = parseInt(verse.number || verse.verse);
    const reference = `${bookName} ${chapterNum}:${verseNum}`;
    const verseText = verse.content || verse.text || '';
      const verseId = `${currentBook?.id}_${currentChapter?.number}_${verseNum}`;
      
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
      
      // Update user stats and check achievements
      AchievementService.setStat('savedVerses', savedVersesList.length);
      
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
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
            </TouchableOpacity>
            <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
              <Text style={[styles.title, { color: theme.text }]}>Holy Bible</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                hapticFeedback.light();
            setShowSearchModal(true);
          }} 
          style={[styles.searchButton, { zIndex: 1 }]}
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
      contentContainerStyle={{ 
        paddingHorizontal: 20, 
        paddingBottom: 40,
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: 80,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Premium Testament Cards */}
      <View style={{ gap: 16 }}>
        
        {/* Old Testament Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            hapticFeedback.buttonPress();
            setExpandedTestament(expandedTestament === 'old' ? null : 'old');
          }}
        >
          <LinearGradient
            colors={isDark 
              ? [`${theme.primary}30`, `${theme.primary}15`] 
              : [`${theme.primary}20`, `${theme.primary}08`]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: `${theme.primary}40`,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Icon */}
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: `${theme.primary}25`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}>
                <MaterialIcons name="menu-book" size={28} color={theme.primary} />
              </View>
              
              {/* Content */}
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: theme.text,
                  letterSpacing: -0.3,
                }}>
                  Old Testament
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  marginTop: 2,
                  fontWeight: '500',
                }}>
                  {books.filter(book => book.testament === 'old').length} books
                </Text>
              </View>
              
              {/* Arrow */}
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons 
                  name={expandedTestament === 'old' ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color={theme.text} 
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Old Testament Dropdown */}
        {expandedTestament === 'old' && (
          <View style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          }}>
            {books.filter(book => book.testament === 'old').map((book, index, arr) => (
              <TouchableOpacity
                key={book.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  loadChapters(book);
                  setExpandedTestament(null);
                }}
                activeOpacity={0.6}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${theme.primary}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary }}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                    {book.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>
                    {book.chapters} chapters
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* New Testament Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            hapticFeedback.buttonPress();
            setExpandedTestament(expandedTestament === 'new' ? null : 'new');
          }}
        >
          <LinearGradient
            colors={isDark 
              ? [`${theme.primary}30`, `${theme.primary}15`] 
              : [`${theme.primary}20`, `${theme.primary}08`]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: `${theme.primary}40`,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Icon */}
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: `${theme.primary}25`,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}>
                <MaterialIcons name="auto-stories" size={28} color={theme.primary} />
              </View>
              
              {/* Content */}
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: theme.text,
                  letterSpacing: -0.3,
                }}>
                  New Testament
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: theme.textSecondary,
                  marginTop: 2,
                  fontWeight: '500',
                }}>
                  {books.filter(book => book.testament === 'new').length} books
                </Text>
              </View>
              
              {/* Arrow */}
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons 
                  name={expandedTestament === 'new' ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color={theme.text} 
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* New Testament Dropdown */}
        {expandedTestament === 'new' && (
          <View style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          }}>
            {books.filter(book => book.testament === 'new').map((book, index, arr) => (
              <TouchableOpacity
                key={book.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  loadChapters(book);
                  setExpandedTestament(null);
                }}
                activeOpacity={0.6}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${theme.primary}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary }}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                    {book.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textTertiary, marginTop: 2 }}>
                    {book.chapters} chapters
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        
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
        // Always construct verseId consistently for saved verse matching
        const verseId = `${currentBook?.id}_${currentChapter?.number}_${verseNumber}`;
        // Use consistent verseId for highlight lookup (not verse.id which may have different format)
        const highlightColor = highlightedVerses[verseId];
        
        // Check if this verse is currently being read aloud
        // Highlight if audio is playing, paused, or loading for this verse
        let audioVerseNum = null;
        if (currentAudioVerse && showAudioPlayer) {
          if (typeof currentAudioVerse === 'object') {
            audioVerseNum = parseInt(currentAudioVerse.number || currentAudioVerse.verse, 10);
          } else {
            audioVerseNum = parseInt(currentAudioVerse, 10);
          }
        }
        const isCurrentlyBeingRead = !isNaN(audioVerseNum) && audioVerseNum === verseNumber;
        
        // Check if this verse is in the current range selection
        const isInRangeSelection = rangeSelectionMode && rangeStartVerse && rangeEndVerseNum && (() => {
          const startNum = parseInt(rangeStartVerse.number || rangeStartVerse.verse);
          const actualStart = Math.min(startNum, rangeEndVerseNum);
          const actualEnd = Math.max(startNum, rangeEndVerseNum);
          return verseNumber >= actualStart && verseNumber <= actualEnd;
        })();
        
        return (
                      <TouchableOpacity
            key={verse.id}
            activeOpacity={0.9}
                          onPress={() => {
              // Handle verse tap - no action needed in range mode since we use +/- buttons
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
                },
                // Highlight the verse currently being read aloud - subtle green border style
                isCurrentlyBeingRead && {
                  backgroundColor: `${theme.primary}15`, // Very subtle tint
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: theme.primary,
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingVertical: 10,
                  marginLeft: -4,
                  marginRight: -4,
                  marginVertical: 4,
                },
                isInRangeSelection && {
                  backgroundColor: `${theme.success}25`,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: theme.success,
                  paddingLeft: 12,
                  paddingRight: 12,
                  marginLeft: -4,
                  marginRight: -4,
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
                  {/* Audio playing indicator */}
                  {isCurrentlyBeingRead && (
                    <View style={{ 
                      backgroundColor: theme.primary, 
                      borderRadius: 12, 
                      padding: 4,
                      marginLeft: 6,
                      marginTop: 2,
                    }}>
                      <MaterialIcons 
                        name="volume-up" 
                        size={14} 
                        color="#FFFFFF" 
                      />
                    </View>
                  )}
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
                      color={highlightColor 
                        ? (isColorBright(highlightColor) ? '#000' : '#fff') 
                        : (rangeVersesSet.has(verseId) ? '#9B59B6' : '#FF6B9D')} 
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
    
      {/* Sticky Bottom Bar for Range Selection */}
      {rangeSelectionMode && rangeStartVerse && rangeEndVerseNum && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: theme.success,
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: Platform.OS === 'ios' ? 34 : 16,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 10,
        }}>
          {/* Range Info */}
          <View style={{ alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', opacity: 0.9 }}>
              SAVING RANGE
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 4 }}>
              {currentBook?.name} {currentChapter?.number}:{parseInt(rangeStartVerse.number || rangeStartVerse.verse)}-{rangeEndVerseNum}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 }}>
              {rangeEndVerseNum - parseInt(rangeStartVerse.number || rangeStartVerse.verse) + 1} verses selected
            </Text>
          </View>
          
          {/* Controls Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Cancel Button */}
            <TouchableOpacity
              onPress={cancelRangeSelection}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 22
              }}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            
            {/* Plus/Minus Controls */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {/* Minus Button */}
              <TouchableOpacity
                onPress={shrinkRange}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: rangeEndVerseNum > parseInt(rangeStartVerse.number || rangeStartVerse.verse) 
                    ? 'rgba(255,255,255,0.3)' 
                    : 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                activeOpacity={0.7}
                delayPressIn={0}
                disabled={rangeEndVerseNum <= parseInt(rangeStartVerse.number || rangeStartVerse.verse)}
              >
                <MaterialIcons name="remove" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              
              {/* Plus Button */}
              <TouchableOpacity
                onPress={extendRange}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <MaterialIcons name="add" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {/* Save Button */}
            <TouchableOpacity
              onPress={saveCurrentRange}
              style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 22,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4
              }}
              activeOpacity={0.7}
              delayPressIn={0}
            >
              <Text style={{ color: theme.success, fontWeight: '800', fontSize: 15 }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
                    // Don't call onClose - onNavigateToAI already handles navigation
                  } else {
                    onClose();
                  }
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

  const bibleContent = (
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
                  activeOpacity={0.7}
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
                        ref={searchInputRef}
                        style={{
                          flex: 1,
                          fontSize: 16,
                          color: theme.text,
                          marginLeft: 12
                        }}
                        placeholder="Type to search (e.g., John 3:16)"
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
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
                        <MaterialIcons name="search" size={64} color={theme.textTertiary} style={{ opacity: 0.3, marginBottom: 16 }} />
                        <Text style={{
                          fontSize: 16,
                          color: theme.textSecondary,
                          textAlign: 'center',
                          marginBottom: 8
                        }}>
                          {searchQuery.trim() ? 'No verses found' : 'Start typing to search'}
                        </Text>
                        <Text style={{
                          fontSize: 14,
                          color: theme.textTertiary,
                          textAlign: 'center',
                          paddingHorizontal: 40
                        }}>
                          {searchQuery.trim() ? 'Try a different search term' : 'Try: John, John 3, or John 3:16'}
                        </Text>
                        {recentSearches.length > 0 && (
                          <View style={{ marginTop: 28, width: '100%' }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: '700',
                              color: theme.textSecondary,
                              marginBottom: 12,
                              textAlign: 'left'
                            }}>
                              Recent searches
                            </Text>
                            {recentSearches.map((ref, idx) => (
                              <TouchableOpacity
                                key={`${ref}-${idx}`}
                                style={{
                                  backgroundColor: theme.card,
                                  borderRadius: 10,
                                  paddingVertical: 12,
                                  paddingHorizontal: 14,
                                  marginBottom: 10,
                                  borderWidth: 1,
                                  borderColor: theme.border || 'rgba(0,0,0,0.05)',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                                onPress={() => {
                                  setSearchQuery(ref);
                                  setTimeout(() => searchBibleWithQuery(ref), 50);
                                }}
                                activeOpacity={0.85}
                              >
                                <Text style={{
                                  fontSize: 15,
                                  fontWeight: '600',
                                  color: theme.primary
                                }}>
                                  {ref}
                                </Text>
                                <MaterialIcons name="arrow-forward-ios" size={16} color={theme.textSecondary} />
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
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
                          {searchResults.length >= 100 
                            ? `Showing first ${searchResults.length} results for "${searchQuery}"` 
                            : `${searchResults.length} ${searchResults.length === 1 ? 'result' : 'results'} for "${searchQuery}"`
                          }
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
                              addRecentSearch(result.reference);
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
                    // Don't call onClose when using onNavigateToAI - it already handles navigation
                  } else {
                    onClose();
                  }
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
                  activeOpacity={0.7}
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
                    {highlightedVerses[`${currentBook?.id}_${currentChapter?.number}_${parseInt(selectedVerseForMenu.number || selectedVerseForMenu.verse)}`] && (
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
                    {/* Listen Option */}
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
                      onPress={listenToVerse}
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
                        <MaterialIcons name="volume-up" size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                          Listen
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                          Hear this verse read aloud
                        </Text>
                      </View>
                      <MaterialIcons name="play-arrow" size={24} color={theme.primary} />
                    </TouchableOpacity>

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
                          {verseNotes[`${currentBook?.id}_${currentChapter?.number}_${parseInt(selectedVerseForMenu?.number || selectedVerseForMenu?.verse)}`] ? 'Edit Note' : 'Add Note'}
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

                    {/* Save Option - Now shows choice between single verse or range */}
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
                      onPress={() => {
                        const verseNum = parseInt(selectedVerseForMenu?.number || selectedVerseForMenu?.verse);
                        const verseId = `${currentBook?.id}_${currentChapter?.number}_${verseNum}`;
                        const isAlreadySaved = savedVerses.has(verseId);
                        
                        if (isAlreadySaved) {
                          hapticFeedback.light();
                          Alert.alert('Already Saved', 'This verse is already in your saved verses');
                          closeVerseMenu();
                          return;
                        }
                        
                        Alert.alert(
                          'Save Verse',
                          'How would you like to save this verse?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Just This Verse',
                              onPress: () => saveVerseToProfile()
                            },
                            {
                              text: 'Save a Range',
                              onPress: () => startRangeSelection()
                            }
                          ]
                        );
                      }}
                      activeOpacity={0.7}
                      delayPressIn={0}
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
                          name={savedVerses.has(`${currentBook?.id}_${currentChapter?.number}_${parseInt(selectedVerseForMenu?.number || selectedVerseForMenu?.verse)}`) ? "favorite" : "bookmark"} 
                          size={20} 
                          color={theme.primary} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                          {savedVerses.has(`${currentBook?.id}_${currentChapter?.number}_${parseInt(selectedVerseForMenu?.number || selectedVerseForMenu?.verse)}`) ? 'Saved' : 'Save Verse'}
                        </Text>
                        <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                          {savedVerses.has(`${currentBook?.id}_${currentChapter?.number}_${parseInt(selectedVerseForMenu?.number || selectedVerseForMenu?.verse)}`) ? 'Already in your saved verses' : 'Save this verse or a range of verses'}
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
            activeOpacity={0.7}
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
          {showShareCard && selectedVerseForMenu && (() => {
            // Calculate dimensions based on aspect ratio
            const currentAspect = aspectPresets.find(a => a.id === shareCardAspect) || aspectPresets[0];
            const cardWidth = Math.min(windowWidth * 0.85, 360);
            const cardHeight = cardWidth / currentAspect.ratio;
            const currentBg = bgPresets[shareCardActiveBg] || bgPresets[0];
            const isLightBg = currentBg.isLight;
            const textColor = isLightBg ? '#1F2937' : '#FFFFFF';
            const subtleColor = isLightBg ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)';
            const currentFont = fontPresets.find(f => f.id === shareCardFont) || fontPresets[0];
            
            // Get verse reference text
            const baseVerseNum = selectedVerseForMenu.number || selectedVerseForMenu.verse;
            const endVerseNum = shareCardEndVerseNumber || baseVerseNum;
            const hasRange = Number(endVerseNum) !== Number(baseVerseNum);
            const verseRef = `${currentBook?.name} ${currentChapter?.number}:${baseVerseNum}${hasRange ? `-${endVerseNum}` : ''}`;
            const versionName = getVersionById(selectedBibleVersion)?.abbreviation || 'KJV';
            const shareText = getShareCardDisplayText();
            const sizing = getShareCardTextSizing(shareText);

            // Render card content based on layout
            const renderCardContent = () => {
              const baseFontSize = shareCardActiveLayout === 'bold' ? sizing.fontSize + 6 : sizing.fontSize;
              const adjustedFontSize = Math.max(10, Math.min(50, baseFontSize + shareCardFontSizeAdjust));
              const adjustedLineHeight = Math.max(14, sizing.lineHeight + shareCardFontSizeAdjust);
              
              const verseTextStyle = {
                fontSize: adjustedFontSize,
                fontWeight: shareCardBold || shareCardActiveLayout === 'bold' ? '700' : '400',
                color: textColor,
                lineHeight: adjustedLineHeight,
                textAlign: shareCardTextAlign,
                fontStyle: shareCardItalic ? 'italic' : 'normal',
                ...currentFont.style,
              };

              const refStyle = {
                fontSize: shareCardActiveLayout === 'bold' ? 20 : 18,
                fontWeight: '700',
                color: textColor,
                textAlign: shareCardTextAlign,
                ...currentFont.style,
              };

              const versionStyle = {
                fontSize: 11,
                fontWeight: '600',
                color: subtleColor,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              };

              const brandStyle = {
                fontSize: 13,
                fontWeight: '700',
                color: subtleColor,
                letterSpacing: 1.5,
              };

              switch (shareCardActiveLayout) {
                case 'bottom-ref':
                  return (
                    <View style={{ flex: 1, padding: 32, justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={verseTextStyle} numberOfLines={10} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {shareText}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 }}>
                        <View>
                          <Text style={refStyle}>{verseRef}</Text>
                          <Text style={[versionStyle, { marginTop: 4 }]}>{versionName}</Text>
                        </View>
                        {shareCardShowBranding && <Text style={brandStyle}>Biblely</Text>}
                      </View>
                    </View>
                  );

                case 'top-ref':
                  return (
                    <View style={{ flex: 1, padding: 32, justifyContent: 'space-between' }}>
                      <View>
                        <Text style={refStyle}>{verseRef}</Text>
                        <Text style={[versionStyle, { marginTop: 4 }]}>{versionName}</Text>
                      </View>
                      <View style={{ flex: 1, justifyContent: 'center', marginVertical: 16 }}>
                        <Text style={verseTextStyle} numberOfLines={10} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {shareText}
                        </Text>
                      </View>
                      {shareCardShowBranding && (
                        <View style={{ alignItems: shareCardTextAlign === 'left' ? 'flex-start' : shareCardTextAlign === 'right' ? 'flex-end' : 'center' }}>
                          <Text style={brandStyle}>Biblely</Text>
                        </View>
                      )}
                    </View>
                  );

                case 'split':
                  return (
                    <View style={{ flex: 1, padding: 32, justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={[versionStyle]}>{versionName}</Text>
                        {shareCardShowBranding && <Text style={brandStyle}>Biblely</Text>}
                      </View>
                      <View style={{ flex: 1, justifyContent: 'center', marginVertical: 20 }}>
                        <Text style={verseTextStyle} numberOfLines={10} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {shareText}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-start' }}>
                        <Text style={refStyle}>{verseRef}</Text>
                      </View>
                    </View>
                  );

                case 'minimal':
                  return (
                    <View style={{ flex: 1, padding: 40, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={[verseTextStyle, { textAlign: 'center' }]} numberOfLines={12} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {shareText}
                      </Text>
                    </View>
                  );

                case 'bold':
                  return (
                    <View style={{ flex: 1, padding: 28, justifyContent: 'space-between' }}>
                      <Text style={[versionStyle, { textAlign: 'center' }]}>{versionName}</Text>
                      <View style={{ flex: 1, justifyContent: 'center', marginVertical: 16 }}>
                        <Text style={[verseTextStyle, { textAlign: 'center', fontWeight: '800' }]} numberOfLines={8} adjustsFontSizeToFit minimumFontScale={0.6}>
                          {shareText}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[refStyle, { textAlign: 'center', marginBottom: 8 }]}>{verseRef}</Text>
                        {shareCardShowBranding && <Text style={brandStyle}>Biblely</Text>}
                      </View>
                    </View>
                  );

                case 'centered':
                default:
                  return (
                    <View style={{ flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={[refStyle, { textAlign: 'center', marginBottom: 24 }]}>{verseRef}</Text>
                      <Text style={[verseTextStyle, { textAlign: 'center' }]} numberOfLines={10} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {shareText}
                      </Text>
                      <View style={{ marginTop: 24, alignItems: 'center' }}>
                        <Text style={[versionStyle, { marginBottom: 8 }]}>{versionName}</Text>
                        {shareCardShowBranding && <Text style={brandStyle}>Biblely</Text>}
                      </View>
                    </View>
                  );
              }
            };

            return (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000001 }}>
                {/* Backdrop */}
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={closeShareCard}
                  disabled={shareCardAnimating}
                  style={StyleSheet.absoluteFill}
                >
                  <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', opacity: shareCardFadeAnim }} />
                </TouchableOpacity>

                {/* Close Button */}
                <Animated.View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, right: 16, zIndex: 10, opacity: shareCardFadeAnim }}>
                  <TouchableOpacity
                    onPress={closeShareCard}
                    disabled={shareCardAnimating}
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <MaterialIcons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </Animated.View>

                {/* Main Content */}
                <Animated.View style={{ flex: 1, opacity: shareCardFadeAnim, transform: [{ scale: shareCardFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
                  <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 100 : 80, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* Card Preview */}
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                      <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1.0 }}>
                        <LinearGradient
                          colors={currentBg.colors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ width: cardWidth, height: cardHeight, borderRadius: 24, overflow: 'hidden' }}
                        >
                          {renderCardContent()}
                        </LinearGradient>
                      </ViewShot>
                    </View>

                    {/* Control Panel */}
                    <View style={{ paddingHorizontal: 16 }}>
                      {/* Control Tabs */}
                      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
                        {[
                          { id: 'bg', label: 'Color', icon: 'palette' },
                          { id: 'layout', label: 'Layout', icon: 'dashboard' },
                          { id: 'text', label: 'Text', icon: 'text-fields' },
                          { id: 'size', label: 'Size', icon: 'aspect-ratio' },
                        ].map(tab => (
                          <TouchableOpacity
                            key={tab.id}
                            onPress={() => setShareCardControlsTab(tab.id)}
                            style={{
                              paddingVertical: 10,
                              paddingHorizontal: 16,
                              borderRadius: 12,
                              backgroundColor: shareCardControlsTab === tab.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                              marginHorizontal: 4,
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                          >
                            <MaterialIcons name={tab.icon} size={18} color={shareCardControlsTab === tab.id ? '#fff' : 'rgba(255,255,255,0.6)'} />
                            <Text style={{ color: shareCardControlsTab === tab.id ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
                              {tab.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Tab Content */}
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 16, marginBottom: 16 }}>
                        {/* Background Tab */}
                        {shareCardControlsTab === 'bg' && (
                          <View>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Background Color
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -8 }}>
                              <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
                                {bgPresets.map((preset, idx) => (
                                  <TouchableOpacity
                                    key={idx}
                                    onPress={() => {
                                      setShareCardActiveBg(idx);
                                      saveShareCardPrefs({ activeBg: idx });
                                    }}
                                    style={{ marginRight: 10, alignItems: 'center' }}
                                  >
                                    <LinearGradient
                                      colors={preset.colors}
                                      style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 24,
                                        borderWidth: shareCardActiveBg === idx ? 3 : 0,
                                        borderColor: '#fff',
                                      }}
                                    />
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 4, textAlign: 'center', width: 50 }} numberOfLines={1}>
                                      {preset.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </ScrollView>
                          </View>
                        )}

                        {/* Layout Tab */}
                        {shareCardControlsTab === 'layout' && (
                          <View>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Card Layout
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                              {layoutPresets.map(layout => (
                                <TouchableOpacity
                                  key={layout.id}
                                  onPress={() => {
                                    setShareCardActiveLayout(layout.id);
                                    saveShareCardPrefs({ activeLayout: layout.id });
                                  }}
                                  style={{
                                    width: '31%',
                                    margin: '1%',
                                    paddingVertical: 14,
                                    paddingHorizontal: 8,
                                    borderRadius: 12,
                                    backgroundColor: shareCardActiveLayout === layout.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                    borderWidth: shareCardActiveLayout === layout.id ? 1.5 : 1,
                                    borderColor: shareCardActiveLayout === layout.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: shareCardActiveLayout === layout.id ? '700' : '500', textAlign: 'center' }}>
                                    {layout.name}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            
                            {/* Branding Toggle */}
                            <TouchableOpacity
                              onPress={() => {
                                const newVal = !shareCardShowBranding;
                                setShareCardShowBranding(newVal);
                                saveShareCardPrefs({ showBranding: newVal });
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}
                            >
                              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Show Biblely Branding</Text>
                              <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: shareCardShowBranding ? '#6366F1' : 'rgba(255,255,255,0.2)', padding: 2 }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', marginLeft: shareCardShowBranding ? 18 : 0 }} />
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Text Tab */}
                        {shareCardControlsTab === 'text' && (
                          <View>
                            {/* Text Alignment */}
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Text Alignment
                            </Text>
                            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                              {alignPresets.map(align => (
                                <TouchableOpacity
                                  key={align.id}
                                  onPress={() => {
                                    setShareCardTextAlign(align.id);
                                    saveShareCardPrefs({ textAlign: align.id });
                                  }}
                                  style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    marginHorizontal: 4,
                                    borderRadius: 10,
                                    backgroundColor: shareCardTextAlign === align.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                    borderWidth: shareCardTextAlign === align.id ? 1.5 : 1,
                                    borderColor: shareCardTextAlign === align.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                                    alignItems: 'center',
                                  }}
                                >
                                  <MaterialIcons name={align.icon} size={22} color={shareCardTextAlign === align.id ? '#fff' : 'rgba(255,255,255,0.5)'} />
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Font Style */}
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Font Style
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -8, marginBottom: 20 }}>
                              <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
                                {fontPresets.map(font => (
                                  <TouchableOpacity
                                    key={font.id}
                                    onPress={() => {
                                      setShareCardFont(font.id);
                                      saveShareCardPrefs({ font: font.id });
                                    }}
                                    style={{
                                      paddingVertical: 12,
                                      paddingHorizontal: 16,
                                      marginRight: 8,
                                      borderRadius: 12,
                                      backgroundColor: shareCardFont === font.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                      borderWidth: shareCardFont === font.id ? 1.5 : 1,
                                      borderColor: shareCardFont === font.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                                      alignItems: 'center',
                                      minWidth: 80,
                                    }}
                                  >
                                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: shareCardFont === font.id ? '600' : '400', ...font.style }} numberOfLines={1}>
                                      {font.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </ScrollView>

                            {/* Bold & Italic Toggles */}
                            <View style={{ flexDirection: 'row', marginBottom: 20, gap: 12 }}>
                              <TouchableOpacity
                                onPress={() => {
                                  const newBold = !shareCardBold;
                                  setShareCardBold(newBold);
                                  saveShareCardPrefs({ bold: newBold });
                                }}
                                style={{
                                  flex: 1,
                                  paddingVertical: 14,
                                  borderRadius: 12,
                                  backgroundColor: shareCardBold ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                                  borderWidth: shareCardBold ? 1.5 : 1,
                                  borderColor: shareCardBold ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>B</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 }}>Bold</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  const newItalic = !shareCardItalic;
                                  setShareCardItalic(newItalic);
                                  saveShareCardPrefs({ italic: newItalic });
                                }}
                                style={{
                                  flex: 1,
                                  paddingVertical: 14,
                                  borderRadius: 12,
                                  backgroundColor: shareCardItalic ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                                  borderWidth: shareCardItalic ? 1.5 : 1,
                                  borderColor: shareCardItalic ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Text style={{ color: '#fff', fontSize: 16, fontStyle: 'italic' }}>I</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 }}>Italic</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Font Size */}
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Font Size
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                              <TouchableOpacity
                                onPress={() => {
                                  const newSize = Math.max(-16, shareCardFontSizeAdjust - 2);
                                  setShareCardFontSizeAdjust(newSize);
                                  saveShareCardPrefs({ fontSizeAdjust: newSize });
                                }}
                                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
                              >
                                <MaterialIcons name="remove" size={24} color="#fff" />
                              </TouchableOpacity>
                              <View style={{ marginHorizontal: 20, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', minWidth: 100, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                                  {shareCardFontSizeAdjust >= 0 ? '+' : ''}{shareCardFontSizeAdjust}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => {
                                  const newSize = Math.min(16, shareCardFontSizeAdjust + 2);
                                  setShareCardFontSizeAdjust(newSize);
                                  saveShareCardPrefs({ fontSizeAdjust: newSize });
                                }}
                                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
                              >
                                <MaterialIcons name="add" size={24} color="#fff" />
                              </TouchableOpacity>
                            </View>

                            {/* Text Mode */}
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 12, marginTop: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Verse Text
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                              {/* Selected Button */}
                              <TouchableOpacity
                                onPress={() => {
                                  hapticFeedback.light();
                                  openTextSelectionModal();
                                }}
                                style={{
                                  flex: 1,
                                  paddingVertical: 12,
                                  marginHorizontal: 4,
                                  borderRadius: 10,
                                  backgroundColor: shareCardTextMode === 'selected' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                  borderWidth: shareCardTextMode === 'selected' ? 1.5 : 1,
                                  borderColor: shareCardTextMode === 'selected' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                                  alignItems: 'center',
                                }}
                              >
                                <Text style={{ color: shareCardTextMode === 'selected' ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' }}>
                                  Selected
                                </Text>
                              </TouchableOpacity>
                              {/* Full Verse Button */}
                              <TouchableOpacity
                                onPress={() => {
                                  hapticFeedback.light();
                                  setShareCardTextMode('full');
                                  const fullText = selectedVerseForMenu ? getFullVerseText(selectedVerseForMenu) : '';
                                  setShareCardText(fullText);
                                }}
                                style={{
                                  flex: 1,
                                  paddingVertical: 12,
                                  marginHorizontal: 4,
                                  borderRadius: 10,
                                  backgroundColor: shareCardTextMode === 'full' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                  borderWidth: shareCardTextMode === 'full' ? 1.5 : 1,
                                  borderColor: shareCardTextMode === 'full' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                                  alignItems: 'center',
                                }}
                              >
                                <Text style={{ color: shareCardTextMode === 'full' ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' }}>
                                  Full Verse
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        {/* Size Tab */}
                        {shareCardControlsTab === 'size' && (
                          <View>
                            {/* Aspect Ratio */}
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Aspect Ratio
                            </Text>
                            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                              {aspectPresets.map(aspect => (
                                <TouchableOpacity
                                  key={aspect.id}
                                  onPress={() => {
                                    setShareCardAspect(aspect.id);
                                    saveShareCardPrefs({ aspect: aspect.id });
                                  }}
                                  style={{
                                    flex: 1,
                                    paddingVertical: 14,
                                    marginHorizontal: 4,
                                    borderRadius: 12,
                                    backgroundColor: shareCardAspect === aspect.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                    borderWidth: shareCardAspect === aspect.id ? 1.5 : 1,
                                    borderColor: shareCardAspect === aspect.id ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{aspect.label}</Text>
                                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>{aspect.name}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Verse Range */}
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Verse Range
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                              <TouchableOpacity
                                onPress={() => {
                                  if (!selectedVerseForMenu) return;
                                  const baseNum = Number(selectedVerseForMenu.number || selectedVerseForMenu.verse);
                                  const newEnd = Math.max(baseNum, (Number(shareCardEndVerseNumber) || baseNum) - 1);
                                  setShareCardEndVerseNumber(newEnd);
                                  setShareCardText('');
                                }}
                                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
                              >
                                <MaterialIcons name="remove" size={24} color="#fff" />
                              </TouchableOpacity>
                              <View style={{ marginHorizontal: 16, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                                  {baseVerseNum}{hasRange ? ` - ${endVerseNum}` : ''}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => {
                                  if (!selectedVerseForMenu || !Array.isArray(verses)) return;
                                  const baseNum = Number(selectedVerseForMenu.number || selectedVerseForMenu.verse);
                                  const maxVerse = verses.reduce((m, v) => Math.max(m, Number(v.number ?? v.verse) || 0), baseNum);
                                  const newEnd = Math.min(maxVerse, (Number(shareCardEndVerseNumber) || baseNum) + 1);
                                  setShareCardEndVerseNumber(newEnd);
                                  setShareCardText('');
                                }}
                                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
                              >
                                <MaterialIcons name="add" size={24} color="#fff" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Save Button */}
                      <TouchableOpacity
                        onPress={saveVerseCard}
                        activeOpacity={0.8}
                        style={{
                          backgroundColor: '#fff',
                          paddingVertical: 16,
                          borderRadius: 16,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 12,
                        }}
                      >
                        <MaterialIcons name="download" size={22} color="#000" />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#000', marginLeft: 10 }}>
                          Save to Photos
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </Animated.View>
              </View>
            );
          })()}

          {/* Text Selection Modal for partial verse sharing */}
          {showTextSelectionModal && (
            <Modal
              visible={showTextSelectionModal}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowTextSelectionModal(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
                <SafeAreaView style={{ flex: 1 }}>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }}>
                    <TouchableOpacity
                      onPress={() => setShowTextSelectionModal(false)}
                      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <MaterialIcons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>Select Text</Text>
                    <TouchableOpacity
                      onPress={confirmTextSelection}
                      disabled={textSelectionStart === null}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        backgroundColor: textSelectionStart !== null ? 'rgba(99,102,241,0.9)' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      <Text style={{ color: textSelectionStart !== null ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '600' }}>Done</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Instructions */}
                  <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' }}>
                      {textSelectionStart === null
                        ? 'Tap the first word of your selection'
                        : textSelectionStart === textSelectionEnd
                        ? 'Tap the last word of your selection'
                        : 'Tap again to restart selection'}
                    </Text>
                  </View>

                  {/* Preview of selected text */}
                  {textSelectionStart !== null && textSelectionEnd !== null && (
                    <View style={{ marginHorizontal: 20, marginBottom: 16, padding: 16, backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Preview
                      </Text>
                      <Text style={{ color: '#fff', fontSize: 16, lineHeight: 24, fontStyle: 'italic' }}>
                        "{getSelectedVerseText()}"
                      </Text>
                    </View>
                  )}

                  {/* Word Selection Grid */}
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {textSelectionWords.map((word, index) => {
                        const isInRange = textSelectionStart !== null && textSelectionEnd !== null &&
                          index >= Math.min(textSelectionStart, textSelectionEnd) &&
                          index <= Math.max(textSelectionStart, textSelectionEnd);
                        const isEndpoint = index === textSelectionStart || index === textSelectionEnd;

                        return (
                          <TouchableOpacity
                            key={index}
                            onPress={() => handleWordTap(index)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: isInRange
                                ? isEndpoint
                                  ? 'rgba(99,102,241,0.8)'
                                  : 'rgba(99,102,241,0.4)'
                                : 'rgba(255,255,255,0.08)',
                              borderWidth: 1,
                              borderColor: isInRange ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)',
                            }}
                          >
                            <Text style={{
                              color: isInRange ? '#fff' : 'rgba(255,255,255,0.7)',
                              fontSize: 16,
                              fontWeight: isEndpoint ? '700' : '400',
                            }}>
                              {word}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </SafeAreaView>
              </View>
            </Modal>
          )}
          
          {/* Audio Player Bar */}
          <AudioPlayerBar
            visible={showAudioPlayer}
            currentVerse={currentAudioVerse}
            bookName={currentBook?.name || ''}
            chapterNumber={currentChapter?.number || 1}
            isPlaying={isAudioPlaying}
            isPaused={isAudioPaused}
            autoPlayEnabled={audioAutoPlayEnabled}
            onStop={stopAudio}
            onToggleAutoPlay={toggleAutoPlay}
            onClose={closeAudioPlayer}
            bottomOffset={100}
          />
          
        </View>
  );

  if (asScreen) {
    return bibleContent;
  }

  return (
    <>
      <Modal 
        visible={visible} 
        animationType="slide" 
        presentationStyle="fullScreen"
        onRequestClose={() => {}}
      >
        {bibleContent}
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
          activeOpacity={0.7} 
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
