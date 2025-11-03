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
import AiBibleChat from './AiBibleChat';
import AddPrayerModal from './AddPrayerModal';
import EditPrayerModal from './EditPrayerModal';
import PrayerDetailModal from './PrayerDetailModal';
import verseByReferenceService from '../services/verseByReferenceService';
import completeBibleService from '../services/completeBibleService';

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
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrayerName, setNewPrayerName] = useState('');
  const [newPrayerTime, setNewPrayerTime] = useState('');
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [editingPrayer, setEditingPrayer] = useState(null);
  
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
      setPrayers(prayersWithType);
    } catch (error) {
      console.log('Error loading prayers:', error);
    }
  };

  const savePrayers = async (prayerList) => {
    try {
      await saveData('simplePrayers', prayerList);
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

  // Check if prayer can be completed (both time window and 24-hour cooldown)
  const canCompletePrayer = (prayer) => {
    // Check 24-hour cooldown first
    if (prayer.completedAt) {
      const completedTime = new Date(prayer.completedAt);
      const now = new Date();
      const hoursSinceCompletion = (now - completedTime) / (1000 * 60 * 60);
      
      if (hoursSinceCompletion < 24) {
        return false; // Still in cooldown
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
      const availableTime = new Date(completedTime.getTime() + (24 * 60 * 60 * 1000));
      const now = new Date();
      
      if (now < availableTime) {
        const hoursLeft = Math.ceil((availableTime - now) / (1000 * 60 * 60));
        return `${hoursLeft}h (cooldown)`;
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
            const canComplete = canCompletePrayer(prayer);
            const timeUntil = getTimeUntilAvailable(prayer);
            const isInTimeWindow = isPrayerTimeAvailable(prayer);
            
            // Individual Prayer Item Component - Fully transparent
              const PrayerItemCard = ({ children, style, onPress }) => {
              // Use regular View with completely transparent background - no white tint!
              return (
                <View
                  style={[styles.fullyTransparentPrayerItem, { 
                    backgroundColor: `${theme.primary}30`,
                    borderColor: `${theme.primary}99`,
                    opacity: canComplete ? 1 : 0.7
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
                  onPress={() => {
                    // FIXED: Set prayer first, THEN show modal after a small delay to ensure state is set
                    setSelectedPrayer(prayer);
                    hapticFeedback.light();
                    // Fetch verses in background (don't block UI)
                    loadPrayerVerses(prayer);
                    // Use requestAnimationFrame to ensure prayer state is set before showing modal
                    requestAnimationFrame(() => {
                      setShowPrayerModal(true);
                    });
                  }}
                >
                  <View style={styles.prayerInfo}>
                    <View style={[styles.prayerIcon, { 
                      backgroundColor: canComplete ? theme.success : 
                                     isInTimeWindow ? theme.primary : theme.textSecondary 
                    }]}>
                      <MaterialIcons name="favorite" size={16} color="#ffffff" />
                    </View>
                    <View style={styles.prayerDetails}>
                      <View style={styles.prayerNameRow}>
                        <Text style={[styles.prayerName, { color: theme.text }]}>
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
                      <Text style={[styles.prayerTime, { color: theme.textSecondary }]}>
                        {prayer.time} {timeUntil ? `• ${timeUntil}` : 
                         isInTimeWindow ? '• Available now' : ''}
                      </Text>
                    </View>
                  </View>
                </AnimatedPrayerCard>
                
                <AnimatedPrayerButton
                  style={[styles.editButton, { backgroundColor: theme.primary + '20' }]}
                  onPress={() => editPrayer(prayer)}
                >
                  <MaterialIcons name="edit" size={16} color={theme.primary} />
                </AnimatedPrayerButton>
              </PrayerItemCard>
            );
          })
        )}
      </ScrollView>

      {/* Prayer Detail Modal */}
      <PrayerDetailModal
        visible={showPrayerModal}
        onClose={() => setShowPrayerModal(false)}
        prayer={selectedPrayer}
        canComplete={selectedPrayer ? canCompletePrayer(selectedPrayer) : false}
        onComplete={() => selectedPrayer && completePrayer(selectedPrayer)}
        onSimplify={handleSimplifyVerse}
        onDiscuss={discussVerse}
        simpleVerseText={simpleVerseText}
        loadingSimple={loadingSimple}
        timeUntilAvailable={selectedPrayer ? getTimeUntilAvailable(selectedPrayer) : null}
        fetchedVerses={fetchedVerses}
        bibleVersion={bibleVersion}
        loadingVerses={loadingVerses}
      />

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
    maxHeight: 300,
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
