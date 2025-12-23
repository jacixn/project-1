import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  Animated,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { getStoredData, saveData } from '../utils/localStorage';
import notificationService from '../services/notificationService';
import AiBibleChat from './AiBibleChat';
import AddPrayerModal from './AddPrayerModal';
import EditPrayerModal from './EditPrayerModal';
import PrayerDetailModal from './PrayerDetailModal';
import verseByReferenceService from '../services/verseByReferenceService';
import completeBibleService from '../services/completeBibleService';
import productionAiService from '../services/productionAiService';
import { LinearGradient } from 'expo-linear-gradient';

// Animated Prayer Components (follows Rules of Hooks)
const AnimatedPrayerButton = ({ children, onPress, style, ...props }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.975, // Reduced by 50% - more subtle press effect (was 0.95, now 0.975)
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

const AnimatedPrayerCard = ({ children, onPress, style, ...props }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.975, // Reduced by 50% - more subtle press effect (was 0.95, now 0.975)
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
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.5} // Reduced brightness by 50% (was 1, now 0.5)
        style={{ flex: 1 }}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const SimplePrayerCard = ({ onNavigateToBible }) => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme } = useTheme();
  
  const [prayers, setPrayers] = useState([]);
  const [lastResetDate, setLastResetDate] = useState(new Date().toDateString());
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrayerName, setNewPrayerName] = useState('');
  const [newPrayerTime, setNewPrayerTime] = useState('');
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [showNotTimeCard, setShowNotTimeCard] = useState(false);
  const [pendingPrayer, setPendingPrayer] = useState(null);
  const [timeUntilWindow, setTimeUntilWindow] = useState('');
  const [showCompletedCard, setShowCompletedCard] = useState(false);
  const [completedPrayer, setCompletedPrayer] = useState(null);
  const [showStudyCard, setShowStudyCard] = useState(false);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyContent, setStudyContent] = useState(null);
  const studySlideAnim = useRef(new Animated.Value(0)).current;
  const studyPanY = useRef(new Animated.Value(0)).current;
  const studyFade = useRef(new Animated.Value(0)).current;
  
  // NEW Simple verse states - completely fresh
  const [simpleVerseText, setSimpleVerseText] = useState({}); // { 'prayerId-verseIndex': 'simplified text' }
  const [loadingSimple, setLoadingSimple] = useState({}); // { 'prayerId-verseIndex': true/false }
  
  // Fetched verses state - stores verse text and version
  const [fetchedVerses, setFetchedVerses] = useState({}); // { 'reference': { text: '...', version: 'NIV' } }
  const [loadingVerses, setLoadingVerses] = useState(true);
  const [bibleVersion, setBibleVersion] = useState('KJV');
  
  // Discussion states
  const [showDiscussModal, setShowDiscussModal] = useState(false);
  const [verseToDiscuss, setVerseToDiscuss] = useState(null);

  const isSameDay = (dateA, dateB) => {
    return (
      dateA.getFullYear() === dateB.getFullYear() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getDate() === dateB.getDate()
    );
  };
  
  // Load prayers on start
  useEffect(() => {
    loadPrayers();
    // Note: We don't pre-load verses anymore - they're fetched only when needed (when creating/viewing prayers)
  }, []);

  // Listen for Bible version changes from Settings
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('bibleVersionChanged', async (newVersion) => {
      console.log('📡 SimplePrayerCard: Received Bible version change event ->', newVersion);
      
      // Clear cached verses
      setFetchedVerses({});
      
      // Update version display
      setBibleVersion(newVersion.toUpperCase());
      
      // If a prayer is currently open, reload its verses with the new version
      if (selectedPrayer) {
        console.log('🔄 Reloading verses for current prayer with new version:', newVersion);
        await loadPrayerVerses(selectedPrayer);
      }
      
      // Reload all prayers to ensure timestamps are fresh
      await loadPrayers();
      
      console.log('✅ SimplePrayerCard refreshed with new Bible version');
    });

    return () => {
      subscription.remove();
    };
  }, [selectedPrayer]); // Re-subscribe if selectedPrayer changes

  // Midnight reset so completed prayers reopen without a 24h cooldown when the date rolls over
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== lastResetDate) {
        resetCompletedPrayersFromStorage();
        setLastResetDate(today);
      }
    }, 60000); // check every minute

    return () => clearInterval(interval);
  }, [lastResetDate]);

  const clearStaleCompletions = (prayerList) => {
    const today = new Date();
    let changed = false;

    const cleanedPrayers = prayerList.map((prayer) => {
      if (prayer.completedAt && !isSameDay(new Date(prayer.completedAt), today)) {
        changed = true;
        return {
          ...prayer,
          completedAt: null,
          canComplete: true,
        };
      }
      return prayer;
    });

    return { cleanedPrayers, changed };
  };

  const resetCompletedPrayersFromStorage = async () => {
    try {
      const stored = (await getStoredData('simplePrayers')) || [];
      const { cleanedPrayers, changed } = clearStaleCompletions(stored);
      if (changed) {
        await savePrayers(cleanedPrayers);
      }
      setPrayers(cleanedPrayers);
    } catch (error) {
      console.log('Error resetting prayers at midnight:', error);
    }
  };

  // Track modal changes with better debugging
  useEffect(() => {
    if (!showPrayerModal) {
      console.log('🚨 Prayer modal closed');
      if (selectedPrayer) {
        console.log('   Selected prayer still set:', selectedPrayer.name);
      } else {
        console.log('   No prayer selected (this might cause the issue!)');
      }
    } else {
      console.log('✅ Prayer modal opened');
      if (selectedPrayer) {
        console.log('   Prayer:', selectedPrayer.name);
        console.log('   Verses:', selectedPrayer.verses?.length || 0);
      } else {
        console.log('   ⚠️ WARNING: Modal opened but no prayer selected! This is the bug!');
      }
    }
  }, [showPrayerModal, selectedPrayer]);


  const loadPrayers = async () => {
    try {
      const stored = await getStoredData('simplePrayers') || [];
      // Add backward compatibility for prayers without type field
      const prayersWithType = stored.map(prayer => ({
        ...prayer,
        type: prayer.type || 'persistent' // Default to persistent for old prayers
      }));
      const { cleanedPrayers, changed } = clearStaleCompletions(prayersWithType);
      if (changed) {
        await savePrayers(cleanedPrayers);
      }
      setPrayers(cleanedPrayers);
    } catch (error) {
      console.log('Error loading prayers:', error);
    }
  };

  const savePrayers = async (prayerList) => {
    try {
      await saveData('simplePrayers', prayerList);
      // Keep notifications in sync with the latest prayer times
      await notificationService.scheduleStoredPrayerReminders();
    } catch (error) {
      console.log('Error saving prayers:', error);
    }
  };

  // Load verses for a specific prayer (only the 2 verses it needs)
  const loadPrayerVerses = async (prayer) => {
    try {
      setLoadingVerses(true);
      console.log('📖 Loading verses for prayer:', prayer.name);
      
      // Get user's preferred version
      const version = await verseByReferenceService.getPreferredVersion();
      setBibleVersion(version.toUpperCase());
      
      // Fetch only the 2 verses for this prayer
      const versesMap = { ...fetchedVerses }; // Keep any previously fetched verses
      for (const verse of prayer.verses) {
        // Skip if already fetched
        if (versesMap[verse.reference]) {
          console.log('✓ Already cached:', verse.reference);
          continue;
        }
        
        try {
          const verseData = await verseByReferenceService.getVerseByReference(verse.reference, version);
          versesMap[verse.reference] = {
            text: verseData.text,
            version: verseData.version
          };
          console.log('✅ Loaded:', verse.reference);
        } catch (error) {
          console.error('❌ Failed to load:', verse.reference, error);
          // Fallback to reference if fetch fails
          versesMap[verse.reference] = {
            text: verse.text || 'Unable to load verse',
            version: version.toUpperCase()
          };
        }
      }
      
      setFetchedVerses(versesMap);
      setLoadingVerses(false);
      console.log('✅ Prayer verses loaded!');
    } catch (error) {
      console.error('Error loading prayer verses:', error);
      setLoadingVerses(false);
    }
  };

  // Get 2 truly random verses from the ENTIRE Bible (optimized + validated)
  const getTwoRandomVerses = async () => {
    try {
      console.log('🎲 Picking 2 random verses from curated list...');
      
      // Import curated verses
      const CURATED_VERSES = require('../../daily-verses-references.json');
      const curatedReferences = CURATED_VERSES.verses;
      
      // Pick 2 random references
      const shuffled = [...curatedReferences].sort(() => Math.random() - 0.5);
      const selectedRefs = shuffled.slice(0, 2);
      
      console.log(`✅ Selected 2 verses from ${curatedReferences.length} curated verses`);
      
      // Fetch the actual verse text for each reference
      const versePromises = selectedRefs.map(async (reference, i) => {
        try {
          // Parse reference like "John 3:16" or "1 Corinthians 13:4"
          const match = reference.match(/^((?:\d\s)?[\w\s]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
          
          if (!match) {
            console.error('Failed to parse reference:', reference);
            return {
              id: Date.now() + i,
              reference: "Loading...",
              text: "Verse is loading..."
            };
          }
          
          const bookName = match[1].trim();
          const chapterNum = match[2];
          const verseNum = match[3];
          
          // Convert book name to book ID
          const bookId = bookName.toLowerCase()
            .replace(/\s+/g, '')
            .replace(/\d+/g, (num) => num);
          
          // Build chapter ID for githubBibleService
          const chapterId = `${bookId}_${chapterNum}`;
          
          // Fetch verses for this chapter
          const chapterVerses = await completeBibleService.getVerses(chapterId, 'kjv');
          
          if (!chapterVerses || chapterVerses.length === 0) {
            console.warn('⚠️ No verses returned for', reference);
            return {
              id: Date.now() + i,
              reference: reference,
              text: "Verse is loading..."
            };
          }
          
          // Find the specific verse
          const verseData = chapterVerses.find(v => {
            const vNum = parseInt(String(v.number || v.verse || v.displayNumber || '').replace(/^Verse\s*/i, ''));
            return vNum === parseInt(verseNum);
          });
          
          if (!verseData) {
            console.warn('⚠️ Verse not found:', reference);
            return {
              id: Date.now() + i,
              reference: reference,
              text: "Verse is loading..."
            };
          }
          
          console.log('✅ Fetched verse:', reference);
          
          return {
            id: Date.now() + i,
            reference: reference,
            text: (verseData.text || verseData.content || '').trim()
          };
          
        } catch (error) {
          console.error('❌ Error fetching verse', reference, ':', error);
          return {
            id: Date.now() + i,
            reference: "Loading...",
            text: "Verse is loading..."
          };
        }
      });
      
      const selectedVerses = await Promise.all(versePromises);
      console.log('🎉 2 curated verses selected!');
      return selectedVerses;
      
    } catch (error) {
      console.error('❌ Error in getTwoRandomVerses:', error);
      // Return fallback verses
      return [
        { id: 1, reference: "Psalm 46:10", text: "Be still, and know that I am God." },
        { id: 2, reference: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing." }
      ];
    }
  };

  // Edit prayer
  const editPrayer = (prayer) => {
    setEditingPrayer(prayer);
    setShowEditModal(true);
    hapticFeedback.light();
  };

  // Save edited prayer
  const saveEditedPrayer = async (name, time, type) => {
    const updatedPrayers = prayers.map(p => 
      p.id === editingPrayer.id 
        ? { ...p, name, time, type }
        : p
    );
    
    setPrayers(updatedPrayers);
    await savePrayers(updatedPrayers);
    
    setShowEditModal(false);
    setEditingPrayer(null);
    hapticFeedback.success();
  };

  // Delete prayer
  const deletePrayer = async () => {
    const updatedPrayers = prayers.filter(p => p.id !== editingPrayer.id);
    setPrayers(updatedPrayers);
    await savePrayers(updatedPrayers);
    
    setShowEditModal(false);
    setEditingPrayer(null);
    hapticFeedback.success();
  };

  // Add new prayer
  const addNewPrayer = async (prayerData) => {
    try {
      console.log('📝 Creating new prayer:', prayerData.name);
      
      // Close modal first with animation
      setShowAddModal(false);
      
      // Wait for modal close animation to complete (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Create prayer with placeholder verses first (for instant UI response)
      const newPrayer = {
        id: Date.now().toString(),
        name: prayerData.name,
        time: prayerData.time,
        type: prayerData.type,
        verses: [
          { id: 1, reference: "Loading...", text: "Selecting your verses..." },
          { id: 2, reference: "Loading...", text: "Selecting your verses..." }
        ],
        completedAt: null,
        canComplete: false,
      };

      const updatedPrayers = [...prayers, newPrayer];
      setPrayers(updatedPrayers);
      await savePrayers(updatedPrayers);
      hapticFeedback.success();
      
      // Now fetch random verses in background (don't block UI)
      console.log('🎲 Fetching random verses in background...');
      getTwoRandomVerses().then(async (randomVerses) => {
        // Update the prayer with real verses
        const prayersToUpdate = await getStoredData('simplePrayers') || [];
        const prayerIndex = prayersToUpdate.findIndex(p => p.id === newPrayer.id);
        
        if (prayerIndex !== -1) {
          prayersToUpdate[prayerIndex].verses = randomVerses;
          setPrayers(prayersToUpdate);
          await savePrayers(prayersToUpdate);
          console.log('✅ Prayer verses updated:', randomVerses.map(v => v.reference).join(', '));
        }
      }).catch(error => {
        console.error('❌ Error fetching verses:', error);
        // Keep the placeholder verses if fetching fails
      });
      
    } catch (error) {
      console.error('❌ Error creating prayer:', error);
      Alert.alert('Error', 'Failed to create prayer. Please try again.');
    }
  };

  // Remove prayer
  const removePrayer = (prayerId) => {
    Alert.alert(
      'Remove Prayer',
      'Are you sure you want to remove this prayer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedPrayers = prayers.filter(p => p.id !== prayerId);
    setPrayers(updatedPrayers);
    await savePrayers(updatedPrayers);
    hapticFeedback.success();
          }
        }
      ]
    );
  };

  // Simple button handler - stays open, just toggles simplified text
  const handleSimplifyVerse = async (verseIndex) => {
    if (!selectedPrayer) return;
    
    const key = `${selectedPrayer.id}-${verseIndex}`;
    const verse = selectedPrayer.verses[verseIndex];
    
    // If already showing simple version, hide it
    if (simpleVerseText[key]) {
        setSimpleVerseText(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      hapticFeedback.light();
        return;
      }
      
    // Start loading
      setLoadingSimple(prev => ({ ...prev, [key]: true }));
    hapticFeedback.light();
    
    try {
      // Call AI service
      const productionAiService = require('../services/productionAiService').default;
      const simplified = await productionAiService.simplifyBibleVerse(verse.text, verse.reference);
      
      // Save simplified text
        setSimpleVerseText(prev => ({ ...prev, [key]: simplified }));
        setLoadingSimple(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
        hapticFeedback.success();
    } catch (error) {
      console.error('Simplify error:', error);
        setLoadingSimple(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
        hapticFeedback.error();
    }
  };

  // Open discussion with AI about verse
  const discussVerse = (verse) => {
    hapticFeedback.light();
    setVerseToDiscuss({
      text: verse.text,
      reference: verse.reference
    });
    setShowPrayerModal(false); // Close prayer modal first
    setTimeout(() => {
      setShowDiscussModal(true); // Then open discussion modal
    }, 300);
  };

  const buildTakeaways = (text = '') => {
    const sentences = text
      .replace(/\s+/g, ' ')
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(Boolean);
    const picks = sentences.slice(0, 5);
    const fillers = [
      'God cares about you and listens when you reach out.',
      'Trusting God brings peace, even when life feels hard.',
      'God provides what you need; you can rely on Him.',
      'You can share hope and kindness with others every day.',
      'Staying close to God helps you make good choices.'
    ];
    const combined = [...picks];
    let fi = 0;
    while (combined.length < 5) {
      combined.push(fillers[fi % fillers.length]);
      fi += 1;
    }
    return combined.slice(0, 5);
  };

  const handleStudyVerse = async (verse) => {
    try {
      setStudyLoading(true);
      setStudyContent(null);
      hapticFeedback.light();
      setShowStudyCard(true);
      // reset animations
      studySlideAnim.setValue(0);
      studyPanY.setValue(0);
      studyFade.setValue(0);
      Animated.parallel([
        Animated.timing(studyFade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(studySlideAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true })
      ]).start();

      const displayedText = verse.text || '';
      const prompt = `
Explain this Bible verse for a 12-year-old. Return ONLY JSON with shape:
{
  "summary": "one short paragraph",
  "takeaways": ["item1","item2","item3","item4","item5"]
}
Verse: "${displayedText}"
Reference: ${verse.reference}
Guidelines:
- Use simple, warm language.
- Keep summary under 80 words.
- Takeaways must be 5 concise, practical points.
- No extra fields, no markdown, no code fences.
`;

      const aiResponse = await productionAiService.simpleSmartChat(prompt);
      let parsed = null;
      try {
        parsed = JSON.parse(aiResponse);
      } catch (err) {
        parsed = null;
      }

      if (!parsed || !parsed.summary || !Array.isArray(parsed.takeaways)) {
        setStudyContent({
          reference: verse.reference,
          version: verse.version || bibleVersion || 'KJV',
          explanation: 'Study is unavailable right now. Please try again in a moment.',
          takeaways: [],
          isError: true,
        });
        return;
      }

      setStudyContent({
        reference: verse.reference,
        version: verse.version || bibleVersion || 'KJV',
        explanation: parsed.summary,
        takeaways: parsed.takeaways.slice(0, 5),
        isError: false,
      });
    } catch (err) {
      setStudyContent({
        reference: verse.reference,
        version: verse.version || bibleVersion || 'KJV',
        explanation: 'Study is unavailable right now. Please try again in a moment.',
        takeaways: [],
        isError: true,
      });
    } finally {
      setStudyLoading(false);
    }
  };

  const studyPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          studyPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1) {
          Animated.parallel([
            Animated.timing(studyFade, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(studySlideAnim, { toValue: 0, duration: 200, useNativeDriver: true })
          ]).start(() => {
            setShowStudyCard(false);
            studyPanY.setValue(0);
          });
        } else {
          Animated.spring(studyPanY, { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }).start();
        }
      }
    })
  ).current;

  // Check if prayer is within time window (30 minutes before/after)
  const isPrayerTimeAvailable = (prayer) => {
    if (!prayer.time) return true; // No time set, always available
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
    
    // Parse prayer time (HH:MM)
    const [hours, minutes] = prayer.time.split(':').map(Number);
    const prayerTime = hours * 60 + minutes; // Prayer time in minutes
    
    // Calculate time difference (handle day wrap-around)
    let timeDiff = Math.abs(currentTime - prayerTime);
    if (timeDiff > 12 * 60) { // More than 12 hours difference, check wrap-around
      timeDiff = 24 * 60 - timeDiff;
    }
    
    return timeDiff <= 30; // Within 30 minutes
  };

  // Get time until prayer window opens
  const getTimeUntilPrayerWindow = (prayer) => {
    if (!prayer.time) return null;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [hours, minutes] = prayer.time.split(':').map(Number);
    const prayerTime = hours * 60 + minutes;
    
    // Calculate minutes until prayer window starts (30 minutes before prayer time)
    const windowStart = prayerTime - 30;
    let minutesUntil;
    
    if (windowStart > currentTime) {
      minutesUntil = windowStart - currentTime;
    } else if (windowStart < 0) { // Next day
      minutesUntil = (24 * 60) + windowStart - currentTime;
    } else {
      // Check if we're past the window (30 minutes after)
      const windowEnd = prayerTime + 30;
      if (currentTime > windowEnd) {
        // Next occurrence is tomorrow
        minutesUntil = (24 * 60) + windowStart - currentTime;
      } else {
        return null; // We're in the window
      }
    }
    
    const hoursUntil = Math.floor(minutesUntil / 60);
    const minsUntil = minutesUntil % 60;
    
    if (hoursUntil > 0) {
      return `${hoursUntil}h ${minsUntil}m`;
    } else {
      return `${minsUntil}m`;
    }
  };

  const handlePrayerPress = (prayer) => {
    const completedToday =
      prayer.completedAt && isSameDay(new Date(prayer.completedAt), new Date());
    
    // If completed today, let users view details without the "not time yet" gate
    if (completedToday) {
      setCompletedPrayer(prayer);
      setShowCompletedCard(true);
      hapticFeedback.light();
      return;
    }

    const isInTimeWindow = isPrayerTimeAvailable(prayer);
    
    if (!isInTimeWindow) {
      const windowCountdown = getTimeUntilPrayerWindow(prayer);
      setPendingPrayer(prayer);
      setTimeUntilWindow(windowCountdown || '');
      setShowNotTimeCard(true);
      hapticFeedback.light();
      return;
    }

    // FIXED: Set prayer first, THEN show modal after a small delay to ensure state is set
    setSelectedPrayer(prayer);
    hapticFeedback.light();
    // Fetch verses in background (don't block UI)
    loadPrayerVerses(prayer);
    // Use requestAnimationFrame to ensure prayer state is set before showing modal
    requestAnimationFrame(() => {
      setShowPrayerModal(true);
    });
  };

  const closeNotTimeCard = () => {
    setShowNotTimeCard(false);
    setPendingPrayer(null);
    setTimeUntilWindow('');
  };

  // Check if prayer can be completed (both time window and 24-hour cooldown)
  const canCompletePrayer = (prayer) => {
    // Check 24-hour cooldown first
    if (prayer.completedAt) {
      const completedTime = new Date(prayer.completedAt);
      const now = new Date();

      // If completed earlier today, block re-completion; if yesterday, allow immediately
      if (isSameDay(completedTime, now)) {
        return false; // Completed today, wait for midnight reset
      }
    }
    
    // Check if we're in the prayer time window
    return isPrayerTimeAvailable(prayer);
  };

  // Get time until prayer can be completed again (handles both cooldown and time window)
  const getTimeUntilAvailable = (prayer) => {
    // Check 24-hour cooldown first
    if (prayer.completedAt) {
      const completedTime = new Date(prayer.completedAt);
      const now = new Date();
      
      // If it was completed today, communicate completion without showing a cooldown timer
      if (isSameDay(completedTime, now)) {
        return 'Completed today';
      }
    }
    
    // If not in cooldown, check prayer time window
    if (!isPrayerTimeAvailable(prayer)) {
      const timeUntilWindow = getTimeUntilPrayerWindow(prayer);
      return timeUntilWindow ? `${timeUntilWindow} (prayer time)` : null;
    }
    
    return null; // Available now
  };

  // Complete prayer with time window and 24-hour cooldown
  const completePrayer = async (prayer) => {
    try {
      if (!canCompletePrayer(prayer)) {
        const timeUntil = getTimeUntilAvailable(prayer);
        
        if (timeUntil && timeUntil.includes('cooldown')) {
          Alert.alert(
            'Prayer Already Completed 🙏',
            `You can complete this prayer again in ${timeUntil.replace(' (cooldown)', '')}. Take time to reflect on today's verses!`,
            [{ text: 'OK', style: 'default' }]
          );
        } else if (timeUntil && timeUntil.includes('prayer time')) {
          const [hours, minutes] = prayer.time.split(':');
          const timeStr = `${hours}:${minutes}`;
          Alert.alert(
            'Prayer Time Window ⏰',
            `This prayer can only be completed between ${timeStr} ± 30 minutes. Available in ${timeUntil.replace(' (prayer time)', '')}.`,
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert(
            'Prayer Not Available 🙏',
            'This prayer is not available right now. Please check the time window.',
            [{ text: 'OK', style: 'default' }]
          );
        }
        return;
      }

      // Award 500 points
      const currentStats = await getStoredData('userStats') || {
        points: 0,
        level: 1,
        completedTasks: 0,
        streak: 0,
        prayersCompleted: 0
      };
      
      const updatedStats = {
        ...currentStats,
        points: currentStats.points + 500,
        prayersCompleted: (currentStats.prayersCompleted || 0) + 1
      };
      
      updatedStats.level = Math.floor(updatedStats.points / 1000) + 1;
      await saveData('userStats', updatedStats);

      // Mark prayer as completed with timestamp
      // For one-time prayers, remove them; for persistent prayers, mark as completed AND fetch new verses
      let updatedPrayers;
      if (prayer.type === 'one-time') {
        // Remove one-time prayer after completion
        updatedPrayers = prayers.filter(p => p.id !== prayer.id);
      } else {
        // Mark persistent prayer as completed with placeholder verses (will be replaced with new ones)
        updatedPrayers = prayers.map(p => 
          p.id === prayer.id 
            ? { 
                ...p, 
                completedAt: new Date().toISOString(),
                canComplete: false,
                verses: [
                  { id: 1, reference: "Loading...", text: "Selecting new verses for your next prayer..." },
                  { id: 2, reference: "Loading...", text: "Selecting new verses for your next prayer..." }
                ]
              }
            : p
        );
      }
      
      setPrayers(updatedPrayers);
      await savePrayers(updatedPrayers);
      
      setShowPrayerModal(false);
      hapticFeedback.success();
      
      // For persistent prayers, fetch 2 NEW random verses in background for next time
      if (prayer.type === 'persistent') {
        console.log('🔄 Fetching new verses for next prayer session...');
        getTwoRandomVerses().then(async (randomVerses) => {
          // Update the prayer with new verses
          const prayersToUpdate = await getStoredData('simplePrayers') || [];
          const prayerIndex = prayersToUpdate.findIndex(p => p.id === prayer.id);
          
          if (prayerIndex !== -1) {
            prayersToUpdate[prayerIndex].verses = randomVerses;
            setPrayers(prayersToUpdate);
            await savePrayers(prayersToUpdate);
            console.log('✅ New verses loaded for next prayer:', randomVerses.map(v => v.reference).join(', '));
          }
        }).catch(error => {
          console.error('❌ Error fetching new verses:', error);
          // Keep the placeholder verses if fetching fails
        });
      }
      
      const message = prayer.type === 'one-time' 
        ? 'Wonderful! You earned 500 points. This one-time prayer has been completed and removed.'
        : 'Wonderful! You earned 500 points. You can complete this prayer again in 24 hours.';
      
        Alert.alert(
          'Prayer Completed! 🙏',
        message,
          [{ text: 'Amen! 🙏', style: 'default' }]
        );
    } catch (error) {
      console.log('Error completing prayer:', error);
      Alert.alert('Error', 'Could not complete prayer');
    }
  };

  // Liquid Glass Container Component
  const LiquidGlassContainer = ({ children, style }) => {
    if (!isLiquidGlassSupported) {
      // Fallback for unsupported devices
      return (
        <BlurView 
          intensity={18} 
          tint={isDark ? "dark" : "light"} 
          style={[styles.container, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}15`
          }, style]}
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
        tintColor="rgba(255, 255, 255, 0.08)" // Subtle white tint for better visibility
        style={[styles.liquidGlassContainer, style]}
      >
        {children}
      </LiquidGlassView>
    );
  };

  return (
    <LiquidGlassContainer>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>My Prayers</Text>
              <AnimatedPrayerButton
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowAddModal(true);
                  hapticFeedback.light();
                }}
              >
                <MaterialIcons name="add" size={24} color="#ffffff" />
              </AnimatedPrayerButton>
            </View>

      {/* Prayer List */}
      <ScrollView style={styles.prayerList} showsVerticalScrollIndicator={false}>
        {prayers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite" size={60} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No prayers yet. Add your first prayer to get started!
            </Text>
          </View>
        ) : (
          prayers.map((prayer) => {
            const completedToday = prayer.completedAt && isSameDay(new Date(prayer.completedAt), new Date());
            const canComplete = completedToday ? false : canCompletePrayer(prayer);
            const timeUntil = completedToday ? null : getTimeUntilAvailable(prayer);
            const isInTimeWindow = isPrayerTimeAvailable(prayer);
            const baseTextColor = completedToday ? '#ffffff' : theme.text;
            const secondaryTextColor = completedToday ? 'rgba(255,255,255,0.85)' : theme.textSecondary;
            const metaText = completedToday
              ? 'Completed today'
              : timeUntil
                ? `• ${timeUntil}`
                : isInTimeWindow
                  ? '• Available now'
                  : '';
            
            // Individual Prayer Item Component - Fully transparent
              const PrayerItemCard = ({ children, style, onPress }) => {
              // Use regular View with completely transparent background - no white tint!
              return (
                <View
                  style={[styles.fullyTransparentPrayerItem, { 
                    backgroundColor: completedToday ? `${theme.success}30` : `${theme.primary}30`,
                    borderColor: completedToday ? `${theme.success}99` : `${theme.primary}99`,
                    opacity: completedToday ? 1 : (canComplete ? 1 : 0.7),
                    shadowColor: completedToday ? `${theme.success}` : '#000'
                  }, style]}
                >
                  {children}
                </View>
              );
              
              // Fallback with transparent background
              /*
              if (!isLiquidGlassSupported) {
                return (
                  <View style={[styles.prayerItem, { 
                    backgroundColor: 'transparent', // No purple in fallback either!
                    opacity: canComplete ? 1 : 0.7
                  }, style]}>
                    {children}
                  </View>
                );
              }
              */
            };

            return (
              <PrayerItemCard key={prayer.id}>
                <AnimatedPrayerCard
                  style={[styles.prayerContent, {
                    backgroundColor: 'transparent', // Remove inner rectangle background!
                    borderWidth: 0, // Remove border
                    borderColor: 'transparent', // Remove border color
                    borderRadius: 16, // Keep rounded corners for touch area
                    shadowColor: 'transparent', // Remove shadow
                    shadowOffset: { width: 0, height: 0 }, // Remove shadow
                    shadowOpacity: 0, // Remove shadow
                    shadowRadius: 0, // Remove shadow
                    elevation: 0, // Remove elevation
                  }]}
                  onPress={() => handlePrayerPress(prayer)}
                >
                  <View style={styles.prayerInfo}>
                    <View style={[styles.prayerIcon, { 
                      backgroundColor: completedToday
                        ? `${theme.success}55`
                        : canComplete
                          ? theme.success
                          : isInTimeWindow
                            ? theme.primary
                            : theme.textSecondary 
                    }]}>
                      <MaterialIcons name="favorite" size={16} color="#ffffff" />
                    </View>
                    <View style={styles.prayerDetails}>
                      <View style={styles.prayerNameRow}>
                        <Text style={[styles.prayerName, { color: baseTextColor }]}>
                        {prayer.name}
                        </Text>
                        <View style={[styles.prayerTypeBadge, { 
                          backgroundColor: prayer.type === 'one-time' 
                            ? (theme.warning || '#FF9500') + '25' 
                            : theme.primary + '25'
                        }]}>
                          <MaterialIcons 
                            name={prayer.type === 'one-time' ? 'done' : 'all-inclusive'} 
                            size={10} 
                            color={prayer.type === 'one-time' ? (theme.warning || '#FF9500') : theme.primary} 
                          />
                          <Text style={[styles.prayerTypeBadgeText, { 
                            color: prayer.type === 'one-time' ? (theme.warning || '#FF9500') : theme.primary 
                          }]}>
                            {prayer.type === 'one-time' ? 'Once' : 'Daily'}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.prayerTime, { color: secondaryTextColor }]}>
                        {prayer.time} {metaText}
                      </Text>
                    </View>
                  </View>
                </AnimatedPrayerCard>
                
                <AnimatedPrayerButton
                  style={[styles.editButton, { backgroundColor: completedToday ? 'rgba(255,255,255,0.25)' : theme.primary + '20' }]}
                  onPress={() => editPrayer(prayer)}
                >
                  <MaterialIcons name="edit" size={16} color={completedToday ? '#ffffff' : theme.primary} />
                </AnimatedPrayerButton>
              </PrayerItemCard>
            );
          })
        )}
      </ScrollView>

      {/* Not-time-yet card */}
      {showNotTimeCard && pendingPrayer && (
        <Modal
          visible={showNotTimeCard}
          transparent={true}
          animationType="fade"
          onRequestClose={closeNotTimeCard}
        >
          <View style={styles.notTimeOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeNotTimeCard}
            />
            <BlurView 
              intensity={isDark ? 45 : 70} 
              tint={isDark ? "dark" : "light"} 
              style={[
                styles.notTimeCard,
                { backgroundColor: isDark ? 'rgba(8,8,12,0.82)' : 'rgba(255,255,255,0.82)' }
              ]}
            >
              <LinearGradient
                colors={[
                  `${theme.primary}33`,
                  `${theme.primary}0A`,
                  'transparent'
                ]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.notTimeGradient}
              />
              <View style={styles.notTimeHalo} />
              <View style={[styles.notTimeIconWrap, { borderColor: theme.primary + '50', backgroundColor: theme.primary + '18' }]}>
                <MaterialIcons name="schedule" size={26} color={theme.primary} />
              </View>
              <Text style={[styles.notTimeTitle, { color: theme.text }]}>Not time yet</Text>
              <Text style={[styles.notTimeSubtitle, { color: theme.textSecondary }]}>
                {pendingPrayer.time ? `Starts at ${pendingPrayer.time}` : 'This prayer has a set time window.'}
              </Text>
              {timeUntilWindow ? (
                <View style={[styles.notTimePill, { borderColor: theme.primary + '50', backgroundColor: theme.primary + '15' }]}>
                  <MaterialIcons name="hourglass-bottom" size={18} color={theme.primary} />
                  <Text style={[styles.notTimePillText, { color: theme.text }]}>
                    Opens in {timeUntilWindow}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity 
                style={[styles.notTimeButton, { backgroundColor: theme.primary }]}
                onPress={closeNotTimeCard}
                activeOpacity={0.7}
              >
                <Text style={styles.notTimeButtonText}>Got it</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </Modal>
      )}

      {/* Prayer Detail Modal */}
      <PrayerDetailModal
        visible={showPrayerModal}
        onClose={() => setShowPrayerModal(false)}
        prayer={selectedPrayer}
        canComplete={selectedPrayer ? canCompletePrayer(selectedPrayer) : false}
        onComplete={() => selectedPrayer && completePrayer(selectedPrayer)}
        onSimplify={handleSimplifyVerse}
        onDiscuss={discussVerse}
        onStudyVerse={handleStudyVerse}
        onNavigateToBible={onNavigateToBible}
        simpleVerseText={simpleVerseText}
        loadingSimple={loadingSimple}
        timeUntilAvailable={selectedPrayer ? getTimeUntilAvailable(selectedPrayer) : null}
        fetchedVerses={fetchedVerses}
        bibleVersion={bibleVersion}
        loadingVerses={loadingVerses}
      />

      {/* Completed Today card */}
      {showCompletedCard && completedPrayer && (
        <Modal
          visible={showCompletedCard}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCompletedCard(false)}
        >
          <View style={styles.notTimeOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowCompletedCard(false)}
            />
            <BlurView 
              intensity={isDark ? 45 : 70} 
              tint={isDark ? "dark" : "light"} 
              style={[
                styles.notTimeCard,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.78)' : 'rgba(255,255,255,0.88)' }
              ]}
            >
              <LinearGradient
                colors={[
                  `${theme.success}33`,
                  `${theme.success}0A`,
                  'transparent'
                ]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.notTimeGradient}
              />
              <View style={styles.notTimeHalo} />
              <View style={[styles.notTimeIconWrap, { borderColor: theme.success + '60', backgroundColor: theme.success + '18' }]}>
                <MaterialIcons name="check-circle" size={26} color={theme.success} />
              </View>
              <Text style={[styles.notTimeTitle, { color: theme.text }]}>Completed</Text>
              <Text style={[styles.notTimeSubtitle, { color: theme.textSecondary }]}>
                {completedPrayer.time ? `Finished at ${completedPrayer.time}` : 'Prayer finished today'}
              </Text>
              <View style={[styles.notTimePill, { borderColor: theme.success + '50', backgroundColor: theme.success + '12' }]}>
                <MaterialIcons name="favorite" size={18} color={theme.success} />
                <Text style={[styles.notTimePillText, { color: theme.text }]}>
                  Great job staying consistent
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.notTimeButton, { backgroundColor: theme.success }]}
                onPress={() => setShowCompletedCard(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.notTimeButtonText}>Awesome</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </Modal>
      )}

      {/* Study card */}
      {showStudyCard && studyContent && (
        <Modal
          visible={showStudyCard}
          transparent={true}
          presentationStyle="overFullScreen"
          statusBarTranslucent
          hardwareAccelerated
          onRequestClose={() => setShowStudyCard(false)}
        >
          <View style={styles.studyOverlay}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: studyFade }]}>
              <TouchableOpacity 
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setShowStudyCard(false)}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.studyCard,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.96)' },
                {
                  opacity: studyFade,
                  transform: [{
                    translateY: Animated.add(
                      studySlideAnim.interpolate({ inputRange: [0,1], outputRange: [120, 0] }),
                      studyPanY
                    )
                  }]
                }
              ]}
              {...studyPanResponder.panHandlers}
            >
              <LinearGradient
                colors={[
                  `${theme.primary}33`,
                  `${theme.primary}0A`,
                  'transparent'
                ]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.notTimeGradient}
              />
              <View style={styles.notTimeHalo} />
              <View style={[styles.notTimeIconWrap, { borderColor: theme.primary + '60', backgroundColor: theme.primary + '14' }]}>
                <MaterialIcons name="school" size={26} color={theme.primary} />
              </View>
              <Text style={[styles.notTimeTitle, { color: theme.text }]}>Study</Text>
              <Text style={[styles.notTimeSubtitle, { color: theme.textSecondary }]}>
                {studyContent.reference} {studyContent.version ? `(${studyContent.version})` : ''}
              </Text>

              <View style={styles.studyExplanationCard}>
                <Text style={[styles.studyExplanationText, { color: theme.text }]}>
                  {studyLoading ? 'Preparing a simple explanation...' : studyContent.explanation}
                </Text>
              </View>

              {!studyContent.isError && (
                <View style={styles.studyTakeaways}>
                  {studyContent.takeaways?.slice(0,5).map((t, idx) => (
                    <View key={`takeaway-${idx}`} style={[styles.takeawayRow, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
                      <View style={[styles.takeawayBadge, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}>
                        <Text style={[styles.takeawayBadgeText, { color: theme.primary }]}>{idx + 1}</Text>
                      </View>
                      <Text style={[styles.takeawayText, { color: theme.textSecondary }]}>
                        {t}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity 
                style={[styles.notTimeButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowStudyCard(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.notTimeButtonText}>Got it</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Edit Prayer Modal */}
      <EditPrayerModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSavePrayer={saveEditedPrayer}
        onDeletePrayer={deletePrayer}
        prayer={editingPrayer}
      />

      {/* AI Discussion Modal */}
      {showDiscussModal && verseToDiscuss && (
        <AiBibleChat
          visible={showDiscussModal}
          onClose={() => {
            setShowDiscussModal(false);
            setVerseToDiscuss(null);
            // Reopen prayer modal after discussion
            setTimeout(() => {
              setShowPrayerModal(true);
            }, 300);
          }}
          initialVerse={verseToDiscuss}
          onNavigateToBible={onNavigateToBible}
          title="Discuss This Verse"
        />
      )}

      {/* Add Prayer Modal */}
      <AddPrayerModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={addNewPrayer}
      />
    </LiquidGlassContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  liquidGlassContainer: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  prayerList: {
    maxHeight: 620, // fits ~5 prayers without scrolling
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  liquidGlassPrayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent', // Force transparent background - no purple!
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, // Reduce shadow opacity
    shadowRadius: 8,
    elevation: 4,
    // Remove border that might cause color
    borderWidth: 0,
  },
  fullyTransparentPrayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 12,
    // Background and border set dynamically in JSX using theme colors
    borderWidth: 1.5,
    padding: 4, // Add padding so border is visible
    // Subtle shadow to lift it off the background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  prayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  prayerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prayerDetails: {
    flex: 1,
  },
  prayerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  prayerTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  prayerTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  prayerTime: {
    fontSize: 12,
    marginTop: 2,
  },
  editButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 16,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Not-time card styles
  notTimeOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 24,
  },
  notTimeCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 18,
  },
  notTimeGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  notTimeHalo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -60,
    opacity: 0.35,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  notTimeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  notTimeTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  notTimeSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  notTimeMeta: {
    fontSize: 13,
    marginBottom: 14,
  },
  notTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  notTimePillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  notTimeButton: {
    marginTop: 8,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 12,
  },
  notTimeButtonText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  studyCard: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 16,
  },
  studyExplanationCard: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  studyExplanationText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  studyTakeaways: {
    width: '100%',
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  takeawayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  takeawayBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  takeawayBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  takeawayText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  studyOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
});

export default SimplePrayerCard;
