import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Image,
  DeviceEventEmitter,
  Modal,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// SafeAreaView removed - using full screen experience
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { FluidTransition, FluidCard, FluidButton } from '../components/FluidTransition';
import { GlassCard, GlassHeader } from '../components/GlassEffect';
import ScrollHeader from '../components/ScrollHeader';
import { createEntranceAnimation } from '../utils/animations';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';

// Random, theme-independent color palettes for the Verse of the Day
const VERSE_COLOR_PALETTES = [
  { gradient: ['#FF9A9E', '#FAD0C4', '#FECFEF'], accent: '#FF9A9E' },
  { gradient: ['#A18CD1', '#FBC2EB', '#FEE7F3'], accent: '#A18CD1' },
  { gradient: ['#84FAB0', '#8FD3F4', '#C6FFDD'], accent: '#84FAB0' },
  { gradient: ['#FFD3A5', '#FD6585', '#FECFEF'], accent: '#FD6585' },
  { gradient: ['#89F7FE', '#66A6FF', '#8EC5FC'], accent: '#66A6FF' },
  { gradient: ['#F6D365', '#FDA085', '#FFCDA5'], accent: '#F6D365' },
  { gradient: ['#5EE7DF', '#B490CA', '#C9E4FF'], accent: '#5EE7DF' },
];

const pickRandomPalette = () =>
  VERSE_COLOR_PALETTES[Math.floor(Math.random() * VERSE_COLOR_PALETTES.length)];

const withOpacity = (hex, opacity = 1) => {
  if (!hex) return `rgba(255,255,255,${opacity})`;
  const normalized = hex.replace('#', '');
  const isShort = normalized.length === 3;
  const r = parseInt(isShort ? normalized[0] + normalized[0] : normalized.slice(0, 2), 16);
  const g = parseInt(isShort ? normalized[1] + normalized[1] : normalized.slice(2, 4), 16);
  const b = parseInt(isShort ? normalized[2] + normalized[2] : normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// const { width } = Dimensions.get('window');

// Components
import PrayerCard from '../components/PrayerCard';
import SimplePrayerCard from '../components/SimplePrayerCard';
import BibleReader from '../components/BibleReader';
import BibleStudyModal from '../components/BibleStudyModal';
import PrayerScreen from '../components/PrayerScreen';
import AiBibleChat from '../components/AiBibleChat';
import { getStoredData, saveData } from '../utils/localStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Location permission removed - using fixed prayer times
import { hapticFeedback } from '../utils/haptics';
import { initializeDailyReset, scheduleNextDayReset } from '../utils/dailyReset';
import { getDailyVerse, refetchDailyVerseInNewVersion } from '../utils/dailyVerse';

// Prayer times are now user-configurable - no hardcoded defaults

// Animated Bible Components (follows Rules of Hooks)
const AnimatedBibleButton = ({ children, onPress, style, ...props }) => {
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.5} // Reduced brightness by 50% (was 1, now 0.5)
        style={style}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedQuickAccessButton = ({ children, onPress, style, ...props }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97, // Reduced by 50% - more subtle press effect (was 0.94, now 0.97)
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
        activeOpacity={0.5} // Reduced brightness by 50% (was 1, now 0.5)
        style={style}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const BiblePrayerTab = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme } = useTheme();
  const [showBible, setShowBible] = useState(false);
  const [showBibleStudy, setShowBibleStudy] = useState(false);
  const [showPrayerScreen, setShowPrayerScreen] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [showFriendChat, setShowFriendChat] = useState(false);
  const [verseToInterpret, setVerseToInterpret] = useState(null);
  const [verseReference, setVerseReference] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [prayerTimes, setPrayerTimes] = useState({});
  const [prayerHistory, setPrayerHistory] = useState([]);
  const [location, setLocation] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [dailyVerse, setDailyVerse] = useState({ text: "Loading daily verse...", reference: "" });
  const [userName, setUserName] = useState('');
  const [versePalette, setVersePalette] = useState(pickRandomPalette());
  const initialVerseShown = useRef(false);
  const [suppressVerseToday, setSuppressVerseToday] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Verse of the Day modal state
  const [showVerseModal, setShowVerseModal] = useState(false);
  const verseModalScale = useRef(new Animated.Value(0.3)).current;
  const verseModalOpacity = useRef(new Animated.Value(0)).current;
  const verseModalSlide = useRef(new Animated.Value(50)).current;
  const verseModalRotate = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  // Share card state
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareCardAnimating, setShareCardAnimating] = useState(false);
  const shareCardFadeAnim = useRef(new Animated.Value(0)).current;
  const shareCardRef = useRef(null);

  // About modal state
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(true);
  
  // Logo animations
  const logoSpin = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  
  // Modal card animations
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(50)).current;
  const cardShimmer = useRef(new Animated.Value(0)).current;

  // Load user's name for personalization (same method as Friend chat)
  const loadUserName = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('userProfile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        const name = profile.name || '';
        console.log('📛 Loaded user name for Verse of the Day:', name);
        setUserName(name);
      } else {
        console.log('📛 No user profile found');
        setUserName('');
      }
    } catch (error) {
      console.error('Failed to load user name:', error);
      setUserName('');
    }
  };

  // Load liquid glass setting
  const loadLiquidGlassSetting = async () => {
    try {
      const setting = await AsyncStorage.getItem('fivefold_liquidGlass');
      if (setting !== null) {
        const enabled = setting === 'true';
        setLiquidGlassEnabled(enabled);
        console.log('💎 Loaded liquid glass setting for BiblePrayerTab:', enabled);
      }
    } catch (error) {
      console.error('Failed to load liquid glass setting:', error);
    }
  };

  useEffect(() => {
    initializePrayerData();
    loadUserName();
    loadLiquidGlassSetting();
    startLogoAnimations();
    startShimmerAnimation();

    // Listen for liquid glass setting changes
    const liquidGlassListener = DeviceEventEmitter.addListener('liquidGlassChanged', (enabled) => {
      console.log('💎 BiblePrayerTab: Liquid glass setting changed to:', enabled);
      setLiquidGlassEnabled(enabled);
    });

    return () => {
      liquidGlassListener.remove();
    };
  }, []);

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

  // Continuous logo animations to attract attention
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

  // Force refresh all data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 BiblePrayerTab focused - refreshing all data');
      loadUserName();
      initializePrayerData();
      loadLiquidGlassSetting();
    }, [])
  );

  // Load userName when verse modal opens (just like Friend chat does)
  useEffect(() => {
    if (showVerseModal) {
      console.log('📖 Verse modal opened - loading user name');
      loadUserName();
    }
  }, [showVerseModal]);

  // Format possessive form of name (e.g., "Jason's" or "Jesus'")
  const getPossessiveName = () => {
    if (!userName) return '';
    // If name ends with 's', just add apostrophe, otherwise add 's
    return userName.endsWith('s') ? `${userName}'` : `${userName}'s`;
  };

  // Update daily verse at midnight
  useEffect(() => {
    const updateDailyVerse = async () => {
      try {
        const verse = await getDailyVerse();
        setDailyVerse(verse);
      } catch (error) {
        console.error('Error loading daily verse:', error);
        setDailyVerse({ 
          text: "Daily verse is loading...", 
          reference: "Loading...",
          version: "NIV"
        });
      }
    };

    // Update verse immediately
    updateDailyVerse();

    // Set up interval to check for date change every minute
    const interval = setInterval(async () => {
      try {
        const currentVerse = await getDailyVerse();
        if (currentVerse.reference !== dailyVerse.reference) {
          updateDailyVerse();
        }
      } catch (error) {
        console.error('Error checking daily verse update:', error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [dailyVerse.reference]);

  // Pick a new random palette whenever the verse changes (or on first load)
  useEffect(() => {
    setVersePalette(pickRandomPalette());
  }, [dailyVerse.reference]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await initializePrayerData();
      const verse = await getDailyVerse();
      setDailyVerse(verse);
    } catch (error) {
      console.error('Error refreshing BiblePrayerTab:', error);
    } finally {
      setRefreshing(false);
    }
  }, [initializePrayerData]);

  // Reset daily suppression when the verse changes (new day)
  useEffect(() => {
    const refreshSuppression = async () => {
      try {
        const dismissType = await getStoredData('votd_dismiss_type');
        const dismissedDate = await getStoredData('votd_dismissed_date');
        const now = new Date();
        
        let shouldSuppress = false;
        
        if (dismissType === 'forever') {
          shouldSuppress = true;
        } else if (dismissType === 'month' && dismissedDate) {
          const dismissed = new Date(dismissedDate);
          const monthLater = new Date(dismissed);
          monthLater.setMonth(monthLater.getMonth() + 1);
          shouldSuppress = now < monthLater;
        } else if (dismissType === 'week' && dismissedDate) {
          const dismissed = new Date(dismissedDate);
          const weekLater = new Date(dismissed);
          weekLater.setDate(weekLater.getDate() + 7);
          shouldSuppress = now < weekLater;
        } else if (dismissType === 'today' && dismissedDate) {
          const today = now.toDateString();
          const dismissedDay = new Date(dismissedDate).toDateString();
          shouldSuppress = today === dismissedDay;
        }
        
        setSuppressVerseToday(shouldSuppress);
        if (!shouldSuppress) {
          initialVerseShown.current = false; // allow auto-open
        }
      } catch (err) {
        console.error('Error refreshing Verse of the Day suppression state:', err);
      }
    };
    refreshSuppression();
  }, [dailyVerse.reference]);

  // Auto-show Verse of the Day on first app load once the verse is ready
  useEffect(() => {
    if (
      !initialVerseShown.current &&
      dailyVerse?.text &&
      dailyVerse.text !== "Daily verse is loading..." &&
      dailyVerse.text !== "Verse is loading..." &&
      dailyVerse.reference &&
      !suppressVerseToday
    ) {
      initialVerseShown.current = true;
      // slight delay so the UI is ready before animating
      setTimeout(() => {
        // Skip if launched from widget (user wants specific verse, not daily verse)
        if (global.__WIDGET_LAUNCH__) {
          console.log('📱 Skipping Verse of the Day - launched from widget');
          return;
        }
        if (!showVerseModal) {
          openVerseModal();
        }
      }, 450);
    }
  }, [dailyVerse.text, dailyVerse.reference, showVerseModal, openVerseModal, suppressVerseToday]);

  // Listen for Bible version changes and re-fetch the same verse in the new version
  useEffect(() => {
    const handleVersionChange = async () => {
      try {
        console.log('📖 Bible version changed, re-fetching same verse in new version...');
        const verse = await refetchDailyVerseInNewVersion();
        setDailyVerse(verse);
      } catch (error) {
        console.error('Error re-fetching daily verse after version change:', error);
      }
    };

    const subscription = DeviceEventEmitter.addListener('bibleVersionChanged', handleVersionChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Listen for user name changes
  useEffect(() => {
    const handleNameChange = async () => {
      try {
        console.log('📛 User name changed, reloading...');
        await loadUserName();
      } catch (error) {
        console.error('Error reloading user name:', error);
      }
    };

    const subscription = DeviceEventEmitter.addListener('userNameChanged', handleNameChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Listen for widget verse navigation (deep link from home/lock screen widget)
  useEffect(() => {
    const handleWidgetNavigation = (verseReference) => {
      console.log('📱 Widget navigation received:', verseReference);
      
      // Close Verse of the Day modal if somehow open
      if (showVerseModal) {
        setShowVerseModal(false);
      }
      
      // Navigate to the verse
      setTimeout(() => {
        handleNavigateToVerse(verseReference, 'navigate');
      }, 300);
    };

    const subscription = DeviceEventEmitter.addListener('widgetVerseNavigation', handleWidgetNavigation);
    
    return () => {
      subscription.remove();
    };
  }, [showVerseModal]);

  const initializePrayerData = async () => {
    try {
      // Initialize daily reset system first
      await initializeDailyReset();
      
      // Schedule automatic reset at midnight
      scheduleNextDayReset();

      // Load prayer history (after potential reset)
      const history = await getStoredData('prayerHistory') || [];
      setPrayerHistory(history);
      
      // Load user's custom prayer times (no hardcoded defaults)
      const customTimes = await getStoredData('customPrayerTimes') || {};
      setPrayerTimes(customTimes);
    } catch (error) {
      console.error('Failed to initialize prayer data:', error);
    }
  };

  const [showDismissOptions, setShowDismissOptions] = useState(false);
  
  const handleDismissVerse = useCallback(async (type) => {
    try {
      setSuppressVerseToday(true);
      initialVerseShown.current = true;
      setShowDismissOptions(false);
      setShowVerseModal(false);
      await saveData('votd_dismiss_type', type);
      await saveData('votd_dismissed_date', new Date().toISOString());
      hapticFeedback.success();
    } catch (error) {
      console.error('Failed to save verse suppression state:', error);
    }
  }, []);
  
  const handleReenableVerse = useCallback(async () => {
    try {
      await saveData('votd_dismiss_type', null);
      await saveData('votd_dismissed_date', null);
      setSuppressVerseToday(false);
      initialVerseShown.current = false;
      hapticFeedback.success();
    } catch (error) {
      console.error('Failed to re-enable verse:', error);
    }
  }, []);

  const openVerseModal = useCallback(() => {
    hapticFeedback.medium();
    console.log('📛 Opening verse modal with userName:', userName);
    console.log('📛 Possessive name will be:', userName ? getPossessiveName() : 'none');
    setShowVerseModal(true);
    
    // Reset animation values
    verseModalScale.setValue(0.3);
    verseModalOpacity.setValue(0);
    verseModalSlide.setValue(50);
    verseModalRotate.setValue(-5);
    shimmerAnim.setValue(0);
    iconPulse.setValue(0.8);
    
    // Animate in with beautiful spring effect
    Animated.parallel([
      Animated.spring(verseModalScale, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(verseModalOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(verseModalSlide, {
        toValue: 0,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(verseModalRotate, {
        toValue: 0,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(iconPulse, {
        toValue: 1,
        tension: 50,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start continuous shimmer effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Start icon pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.spring(iconPulse, {
            toValue: 1.1,
            tension: 50,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.spring(iconPulse, {
            toValue: 1,
            tension: 50,
            friction: 3,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [userName]); // Add userName to dependencies

  const closeVerseModal = useCallback(() => {
    hapticFeedback.light();
    setShowDismissOptions(false);
    
    // Animate out
    Animated.parallel([
      Animated.spring(verseModalScale, {
        toValue: 0.3,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(verseModalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(verseModalSlide, {
        toValue: 50,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowVerseModal(false);
    });
  }, []);

  const handleDiscussVerse = () => {
    console.log('💬 Discuss button pressed!');
    console.log('💬 Daily verse:', dailyVerse);
    hapticFeedback.medium();
    
    // Set the verse data first
    const verseData = {
      text: dailyVerse.text,
      content: dailyVerse.text,
      reference: dailyVerse.reference,
      version: dailyVerse.version
    };
    
    console.log('💬 Setting verse data:', verseData);
    setVerseToInterpret(verseData);
    
    // Close verse modal
    setShowVerseModal(false);
    
    // Open Friend chat immediately
    console.log('💬 Opening Friend chat now');
    setShowFriendChat(true);
  };

  const handleGoToVerse = () => {
    console.log('📖 Go to Verse button pressed!');
    console.log('📖 Daily verse reference:', dailyVerse.reference);
    hapticFeedback.medium();
    
    // Close verse modal
    setShowVerseModal(false);
    
    // Navigate to the verse in Bible reader with highlighting
    setTimeout(() => {
      handleNavigateToVerse(dailyVerse.reference, 'navigate');
    }, 300); // Small delay for smooth transition
  };

  const handleShareVerse = () => {
    console.log('📤 Share button pressed!');
    hapticFeedback.medium();
    
    // Close verse modal and open share card
    setShowVerseModal(false);
    
    // Small delay for smooth transition
    setTimeout(() => {
      openShareCard();
    }, 300);
  };

  // Higher-contrast UI for Verse of the Day modal (readability on pastel gradients)
  const VERSE_MODAL_TEXT_SCRIM = 'rgba(0, 0, 0, 0.38)';
  const VERSE_MODAL_BUTTON_GRADIENT = ['rgba(0, 0, 0, 0.42)', 'rgba(0, 0, 0, 0.28)'];

  // Open share card with animation
  const openShareCard = () => {
    if (shareCardAnimating) {
      return;
    }
    
    setShareCardAnimating(true);
    setShowShareCard(true);
    
    requestAnimationFrame(() => {
      Animated.timing(shareCardFadeAnim, {
        toValue: 1,
        duration: 300,
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

  // Get gradient colors for share card - tie to verse palette, not theme
  const getShareCardGradient = () => versePalette.gradient;

  const handlePrayerPress = useCallback((prayer) => {
    hapticFeedback.medium(); // Medium feedback when opening prayer screen
    setSelectedPrayer(prayer);
    setShowPrayerScreen(true);
  }, []);

  const handleInterpretVerse = useCallback((verse) => {
    console.log('🔍 Interpreting verse:', verse);
    hapticFeedback.medium();
    
    // Store the verse for interpretation
    setVerseToInterpret(verse);
    
    // Close prayer screen and open friend chat
    setShowPrayerScreen(false);
    setSelectedPrayer(null);
    setShowFriendChat(true);
  }, []);

  // Handle navigation to specific Bible verse
  const handleNavigateToVerse = useCallback((verseRef, mode = 'navigate') => {
    console.log('📖 BiblePrayerTab: Navigating to verse:', verseRef, 'mode:', mode);
    if (mode === 'search') {
      // For search mode, pass the verse reference as a search query
      setVerseReference({ searchQuery: verseRef });
    } else {
      // For navigation mode, pass as normal verse reference
      setVerseReference(verseRef);
    }
    setShowBible(true);
  }, []);

  const handlePrayerComplete = useCallback(async (prayerName) => {
    hapticFeedback.success(); // Success feedback when completing prayer
    
    const newEntry = {
      prayer: prayerName,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...prayerHistory, newEntry];
    setPrayerHistory(updatedHistory);
    await saveData('prayerHistory', updatedHistory);

    // Add 1000 points for prayer completion
    try {
      const currentStats = await getStoredData('userStats');
      const updatedStats = {
        ...currentStats,
        totalPoints: (currentStats?.totalPoints || 0) + 1000,
        prayersCompleted: (currentStats?.prayersCompleted || 0) + 1,
      };
      await saveData('userStats', updatedStats);
      console.log('🙏 Prayer completed! +1000 points earned!');
    } catch (error) {
      console.error('Failed to update points for prayer completion:', error);
    }
  }, [prayerHistory]);



  // Bible access section with Liquid Glass
  const BibleSection = () => {
    // Liquid Glass Container for Bible Section
    const LiquidGlassBibleContainer = ({ children }) => {
      // Use BlurView if: device doesn't support liquid glass OR user disabled it
      if (!isLiquidGlassSupported || !liquidGlassEnabled) {
        return (
          <BlurView 
            intensity={18} 
            tint={isDark ? "dark" : "light"} 
            style={[styles.bibleCard, { 
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.05)' 
                : `${theme.primary}15`
            }]}
          >
            {children}
          </BlurView>
        );
      }

      // Use Liquid Glass if: device supports it AND user enabled it
      return (
        <LiquidGlassView
          interactive={true}
          effect="clear"
          colorScheme="system"
          tintColor="rgba(255, 255, 255, 0.08)"
          style={styles.liquidGlassBibleCard}
        >
          {children}
        </LiquidGlassView>
      );
    };

    return (
      <LiquidGlassBibleContainer>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Holy Bible</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Read, study, and grow in faith
      </Text>
      
      <AnimatedBibleButton 
        style={[styles.bibleButton, { 
          backgroundColor: `${theme.primary}30`,
          borderWidth: 0.8,
          borderColor: `${theme.primary}99`,
          borderRadius: 16,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
        }]}
        onPress={() => {
          hapticFeedback.medium(); // Medium feedback when opening Bible
          setShowBible(true); // Open modal like prayers do
        }}
      >
        <MaterialIcons name="menu-book" size={24} color={theme.primary} />
        <View style={styles.bibleButtonContent}>
          <Text style={[styles.bibleButtonTitle, { color: theme.text }]}>
            Open Bible
          </Text>
          <Text style={[styles.bibleButtonSubtitle, { color: theme.textSecondary }]}>
            Simple English + Original text
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
      </AnimatedBibleButton>
      
      {/* Verse of the day - Force transparent styling */}
      <TouchableOpacity
        activeOpacity={0.4}
        onPress={openVerseModal}
        style={[styles.transparentVerseOfDay, { 
          backgroundColor: `${theme.primary}22`,
          borderWidth: 0.8,
          borderColor: `${theme.primary}65`,
          borderRadius: 16,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
        }]}
      >
        <Text style={[styles.verseLabel, { color: theme.textSecondary }]}>
          {userName ? `${getPossessiveName()} Verse of the Day` : 'Verse of the Day'}
        </Text>
        <Text 
          style={[styles.verseText, { color: theme.text }]}
          selectable={false} // Disable selection for tappable area
          allowFontScaling={true}
        >
          "{dailyVerse.text}"
        </Text>
        <Text 
          style={[styles.verseReference, { color: theme.textSecondary }]}
          selectable={false} // Disable selection for tappable area
          allowFontScaling={true}
        >
          {dailyVerse.reference} {dailyVerse.version ? `(${dailyVerse.version})` : ''}
        </Text>
      </TouchableOpacity>
      </LiquidGlassBibleContainer>
    );
  };

  // Bible Study section with Liquid Glass
  const BibleStudySection = () => {
    // Liquid Glass Container for Bible Study Section
    const LiquidGlassBibleStudyContainer = ({ children }) => {
      // Use BlurView if: device doesn't support liquid glass OR user disabled it
      if (!isLiquidGlassSupported || !liquidGlassEnabled) {
        return (
          <BlurView 
            intensity={18} 
            tint={isDark ? "dark" : "light"} 
            style={[styles.bibleCard, { 
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.05)' 
                : `${theme.primary}15`
            }]}
          >
            {children}
          </BlurView>
        );
      }

      // Use Liquid Glass if: device supports it AND user enabled it
      return (
        <LiquidGlassView
          interactive={true}
          effect="clear"
          colorScheme="system"
          tintColor="rgba(255, 255, 255, 0.08)"
          style={styles.liquidGlassBibleCard}
        >
          {children}
        </LiquidGlassView>
      );
    };

    return (
      <LiquidGlassBibleStudyContainer>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Bible Study</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Explore characters, timeline, maps & more
      </Text>
      
      <AnimatedBibleButton 
        style={[styles.bibleButton, { 
          backgroundColor: `${theme.primary}30`,
          borderWidth: 0.8,
          borderColor: `${theme.primary}99`,
          borderRadius: 16,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
        }]}
        onPress={() => {
          hapticFeedback.medium();
          setShowBibleStudy(true);
        }}
      >
        <MaterialIcons name="school" size={24} color={theme.primary} />
        <View style={styles.bibleButtonContent}>
          <Text style={[styles.bibleButtonTitle, { color: theme.text }]}>
            Interactive Learning
          </Text>
          <Text style={[styles.bibleButtonSubtitle, { color: theme.textSecondary }]}>
            Characters, Timeline, Maps & Quizzes
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
      </AnimatedBibleButton>

      </LiquidGlassBibleStudyContainer>
    );
  };

  return (
    <AnimatedWallpaper 
      scrollY={scrollY}
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Biblely</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Faith & Focus, Every Day
            </Text>
          </View>
          
          {/* Removed connection indicator - app works perfectly without it */}
          <View style={styles.headerRight} />
        </View>
      </GlassHeader>

      {/* Main Content - flows to top like Twitter */}
      <Animated.ScrollView 
        style={styles.twitterContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.twitterScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            title="Refreshing..."
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Simple Prayer Card */}
        <SimplePrayerCard onNavigateToBible={handleNavigateToVerse} />



        {/* Bible Section */}
        <BibleSection />

        {/* Bible Study Section */}
        <BibleStudySection />
      </Animated.ScrollView>



      {/* Bible Modal */}
      {showBible && (
        <BibleReader
          visible={showBible}
          onClose={() => {
            setShowBible(false);
            setVerseReference(null); // Clear verse reference when closing
          }}
          initialVerseReference={verseReference}
          onNavigateToAI={(verseContent) => {
            setShowBible(false);
            setVerseReference(null);
            if (verseContent) {
              setVerseToInterpret(verseContent);
            } else {
              setVerseToInterpret(null); // General chat
            }
            setTimeout(() => setShowFriendChat(true), 300);
          }}
          onInterpretVerse={(verseContent, reference) => {
            setShowBible(false);
            setVerseReference(null);
            setVerseToInterpret({ content: verseContent, reference });
            setTimeout(() => setShowFriendChat(true), 300);
          }}
        />
      )}

      {/* Bible Study Modal */}
      {showBibleStudy && (
        <BibleStudyModal
          visible={showBibleStudy}
          onClose={() => setShowBibleStudy(false)}
          onNavigateToVerse={(reference) => {
            // Close BibleStudy first, then open Bible after a delay
            setShowBibleStudy(false);
            setTimeout(() => {
              handleNavigateToVerse(reference);
            }, 200);
          }}
          onDiscussVerse={(versePayload) => {
            // Close BibleStudy first, then open chat after a delay
            setShowBibleStudy(false);
            setShowBible(false);
            setVerseReference(null);
            setTimeout(() => {
              setVerseToInterpret(versePayload);
              setShowFriendChat(true);
            }, 200);
          }}
        />
      )}

      {/* Prayer Screen Modal */}
      {showPrayerScreen && (
        <PrayerScreen
          visible={showPrayerScreen}
          onClose={() => {
            setShowPrayerScreen(false);
            setSelectedPrayer(null);
          }}
          prayer={selectedPrayer}
          onPrayerComplete={handlePrayerComplete}
          prayerHistory={prayerHistory}
          onInterpretVerse={handleInterpretVerse}
        />
      )}

      {/* Friend Chat Modal */}
        <AiBibleChat
          visible={showFriendChat}
          onClose={() => {
            setShowFriendChat(false);
            setVerseToInterpret(null);
          }}
          initialVerse={verseToInterpret}
          onNavigateToBible={handleNavigateToVerse}
        />

      {/* Verse of the Day Modal */}
      <Modal
        visible={showVerseModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeVerseModal}
      >
        <View style={styles.verseModalOverlay}>
          <TouchableOpacity 
            style={styles.verseModalBackdrop}
            activeOpacity={0.7}
            onPress={closeVerseModal}
          >
            <Animated.View style={{ 
              opacity: verseModalOpacity,
              ...StyleSheet.absoluteFillObject,
            }}>
              <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
                <View style={[styles.verseModalDimOverlay, { 
                  backgroundColor: 'rgba(0, 0, 0, 0.75)'
                }]} />
              </BlurView>
            </Animated.View>
          </TouchableOpacity>

          <Animated.View 
            style={[
              styles.verseModalCard,
              {
                opacity: verseModalOpacity,
                transform: [
                  { scale: verseModalScale },
                  { translateY: verseModalSlide },
                  { 
                    rotate: verseModalRotate.interpolate({
                      inputRange: [-5, 0],
                      outputRange: ['-5deg', '0deg']
                    })
                  }
                ]
              }
            ]}
          >
            {/* Animated shimmer overlay */}
            <Animated.View 
              style={[
                styles.shimmerOverlay,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.15]
                  }),
                  transform: [{
                    translateX: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-400, 400]
                    })
                  }]
                }
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255, 255, 255, 0.6)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* Main gradient background */}
            <LinearGradient
              colors={versePalette.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verseModalGradient}
            >
              <BlurView 
                intensity={isDark ? 20 : 30} 
                tint={isDark ? "dark" : "light"}
                style={styles.verseModalBlur}
              >
                <View style={styles.verseModalContent}>
                  {/* Close button */}
                  <TouchableOpacity 
                    style={[styles.verseModalClose, {
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                    }]}
                    onPress={closeVerseModal}
                  >
                    <MaterialIcons name="close" size={20} color="rgba(255, 255, 255, 0.9)" />
                  </TouchableOpacity>

                  {/* Decorative top accent */}
                  <View style={{
                    width: 40,
                    height: 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    borderRadius: 2,
                    alignSelf: 'center',
                    marginBottom: 20,
                  }} />

                  {/* Title Section */}
                  <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: 'rgba(255, 255, 255, 0.9)',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      marginBottom: 6,
                      textShadowColor: 'rgba(0, 0, 0, 0.3)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                    </Text>
                    <Text style={{
                      fontSize: 26,
                      fontWeight: '800',
                      color: '#FFFFFF',
                      textAlign: 'center',
                      letterSpacing: 0.5,
                      textShadowColor: 'rgba(0, 0, 0, 0.45)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 5,
                    }}>
                      {userName ? `${userName}'s Verse` : 'Your Verse'}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.95)',
                      marginTop: 4,
                      textShadowColor: 'rgba(0, 0, 0, 0.3)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                    }}>
                      {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>

                  {/* Verse Card - with dark scrim for readability */}
                  <View style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: 20,
                    padding: 24,
                    marginBottom: 24,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}>
                    {/* Opening quote mark */}
                    <Text style={{
                      fontSize: 48,
                      fontWeight: '300',
                      color: 'rgba(255, 255, 255, 0.35)',
                      position: 'absolute',
                      top: 8,
                      left: 16,
                      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                    }}>
                      "
                    </Text>
                    
                    <Text style={{
                      fontSize: 18,
                      lineHeight: 28,
                      fontStyle: 'italic',
                      color: '#FFFFFF',
                      textAlign: 'center',
                      fontWeight: '600',
                      paddingHorizontal: 8,
                      paddingTop: 12,
                      textShadowColor: 'rgba(0, 0, 0, 0.5)',
                      textShadowOffset: { width: 0, height: 2 },
                      textShadowRadius: 4,
                    }}>
                      {dailyVerse.text}
                    </Text>
                    
                    {/* Reference */}
                    <View style={{
                      marginTop: 20,
                      alignItems: 'center',
                    }}>
                      <View style={{
                        width: 32,
                        height: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                        borderRadius: 1,
                        marginBottom: 12,
                      }} />
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: '#FFFFFF',
                        letterSpacing: 0.5,
                        textShadowColor: 'rgba(0, 0, 0, 0.4)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                      }}>
                        {dailyVerse.reference}
                      </Text>
                      {dailyVerse.version && (
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.85)',
                          marginTop: 4,
                          textShadowColor: 'rgba(0, 0, 0, 0.3)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 2,
                        }}>
                          {dailyVerse.version}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={{ gap: 10 }}>
                    {/* Go to Verse Button - Primary */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: 14,
                        paddingVertical: 14,
                        paddingHorizontal: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                      }}
                      onPress={handleGoToVerse}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="menu-book" size={20} color={versePalette.gradient[0]} />
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: versePalette.gradient[0],
                      }}>
                        Read in Bible
                      </Text>
                    </TouchableOpacity>

                    {/* Secondary buttons row */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {/* Discuss Button */}
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: 14,
                          paddingVertical: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.25)',
                        }}
                        onPress={handleDiscussVerse}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="chat-bubble-outline" size={18} color="#FFFFFF" />
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: '#FFFFFF',
                          textShadowColor: 'rgba(0, 0, 0, 0.3)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 2,
                        }}>
                          Discuss
                        </Text>
                      </TouchableOpacity>

                      {/* Share Button */}
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: 14,
                          paddingVertical: 14,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.25)',
                        }}
                        onPress={handleShareVerse}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="ios-share" size={18} color="#FFFFFF" />
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '700',
                          textShadowColor: 'rgba(0, 0, 0, 0.3)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 2,
                          color: '#FFFFFF',
                        }}>
                          Share
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Dismiss Options */}
                    {!showDismissOptions ? (
                      <TouchableOpacity
                        style={styles.verseModalGhostButton}
                        onPress={() => {
                          hapticFeedback.light();
                          setShowDismissOptions(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.verseModalGhostButtonText}>
                          Hide verse popup
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: 16,
                        padding: 12,
                        marginTop: 8,
                      }}>
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.7)',
                          textAlign: 'center',
                          marginBottom: 10,
                        }}>
                          Hide for how long
                        </Text>
                        <View style={{ gap: 8 }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.15)',
                              borderRadius: 12,
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                            }}
                            onPress={() => handleDismissVerse('today')}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500', textAlign: 'center' }}>
                              Just today
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.15)',
                              borderRadius: 12,
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                            }}
                            onPress={() => handleDismissVerse('week')}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500', textAlign: 'center' }}>
                              For a week
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.15)',
                              borderRadius: 12,
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                            }}
                            onPress={() => handleDismissVerse('month')}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500', textAlign: 'center' }}>
                              For a month
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              backgroundColor: 'rgba(255, 80, 80, 0.25)',
                              borderRadius: 12,
                              paddingVertical: 12,
                              paddingHorizontal: 16,
                            }}
                            onPress={() => handleDismissVerse('forever')}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: '#ff9999', fontSize: 15, fontWeight: '500', textAlign: 'center' }}>
                              Permanently
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              paddingVertical: 10,
                            }}
                            onPress={() => setShowDismissOptions(false)}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </BlurView>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Share Card Modal */}
      {showShareCard && (
        <Modal
          visible={showShareCard}
          transparent={true}
          animationType="none"
          onRequestClose={closeShareCard}
        >
          <View style={styles.shareCardOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={0.7} 
              onPress={closeShareCard}
            />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
                      colors={getShareCardGradient()}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 28,
                        padding: 50,
                        minHeight: 500
                      }}
                    >
                      {/* Version Badge - Top Right */}
                      <View style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.85)',
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                          textShadowColor: 'rgba(0, 0, 0, 0.35)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 2,
                        }}>
                          {dailyVerse.version || 'NIV'}
                        </Text>
                      </View>

                      {/* Main Content - Centered */}
                      <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: 40
                      }}>
                        {/* Title */}
                        <Text style={{
                          fontSize: 20,
                          fontWeight: '800',
                          color: '#fff',
                          marginBottom: 12,
                          textAlign: 'center',
                          textShadowColor: 'rgba(0, 0, 0, 0.2)',
                          textShadowOffset: { width: 0, height: 2 },
                          textShadowRadius: 4
                        }}>
                          {userName ? `${getPossessiveName()} Verse of the Day` : 'Verse of the Day'}
                        </Text>

                        {/* Verse Reference */}
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '700',
                          color: 'rgba(255, 255, 255, 0.92)',
                          marginBottom: 28,
                          textShadowColor: 'rgba(0, 0, 0, 0.15)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 3
                        }}>
                          {dailyVerse.reference}
                        </Text>

                        {/* Verse Text */}
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
                          {dailyVerse.text}
                        </Text>
                      </View>

                      {/* Biblely - Bottom */}
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
        </Modal>
      )}

      {/* About Jason Modal */}
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
                <MaterialIcons name="stars" size={28} color="#FFFFFF" style={styles.heroIcon} />
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
    </View>
    </AnimatedWallpaper>
  );
};

// Duplicate functions removed - using the ones at the top of the file

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
    paddingTop: Platform.OS === 'ios' ? 70 : 35, // Moved down slightly
    paddingBottom: 15,
    paddingHorizontal: 20,
    // Background color set dynamically in JSX based on theme
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
    paddingTop: 145, // Content starts after header - no overlap
    paddingBottom: 80, // Space for floating tab bar - no content hidden
  },
  headerSpacer: {
    height: 125, // Adjusted for lower header position
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
    left: 16,
    top: -2,
  },
  headerTextContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 105, // Reference gap for all tabs
    paddingBottom: 20, // Reduced space for floating tab bar
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },

  bibleCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20, // Add horizontal margins for consistent width with other cards
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  bibleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    // Background and border set dynamically in JSX using theme colors
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bibleButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  bibleButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  bibleButtonSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  verseOfDay: {
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  liquidGlassBibleCard: {
    borderRadius: 20,
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
  liquidGlassVerseOfDay: {
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    backgroundColor: 'transparent', // Make it transparent like prayer items!
    borderWidth: 0, // Remove border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tappableVerseOfDay: {
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Light transparent background - same as Open Bible
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Subtle border like Open Bible
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  transparentVerseOfDay: {
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    // Background and border set dynamically in JSX using theme colors
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  verseLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verseText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  verseReference: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  quickAccessButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  quickAccessText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Verse Modal Styles
  verseModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verseModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  verseModalDimOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  verseModalCard: {
    width: Dimensions.get('window').width - 32,
    maxWidth: 450,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 25,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 200,
    zIndex: 1,
  },
  verseModalGradient: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  verseModalBlur: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  verseModalContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  verseModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  verseModalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    elevation: 10,
  },
  iconGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  verseModalIcon: {
    fontSize: 36,
  },
  verseModalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  verseModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verseModalDate: {
    fontSize: 13,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verseModalTextContainer: {
    marginBottom: 18,
  },
  verseBackdrop: {
    borderRadius: 18,
    padding: 18,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  verseModalQuote: {
    fontSize: 20,
    lineHeight: 30,
    fontStyle: 'italic',
    marginBottom: 14,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  referenceContainer: {
    alignItems: 'center',
    gap: 8,
  },
  referenceDivider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 1,
  },
  verseModalReference: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verseModalActions: {
    marginTop: 4,
  },
  verseModalButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 18,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verseModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verseModalGhostButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  verseModalGhostButtonText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shareCardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
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
  missionBox: {
    borderRadius: 20,
    marginTop: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  missionBoxInner: {
    padding: 24,
    alignItems: 'center',
  },
  missionText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '600',
    color: '#FFFFFF',
    marginVertical: 12,
  },
  missionBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 6,
  },
  missionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
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

export default BiblePrayerTab;
