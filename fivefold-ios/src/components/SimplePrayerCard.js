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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { getStoredData, saveData } from '../utils/localStorage';
import AiBibleChat from './AiBibleChat';
import { 
  AnimatedLiquidGlassCard, 
  LiquidGlassButton, 
  GlassText,
  isLiquidGlassSupported 
} from './LiquidGlassComponents';

// Animated Prayer Components (follows Rules of Hooks)
const AnimatedPrayerButton = ({ children, onPress, style, ...props }) => {
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
        activeOpacity={1}
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
      toValue: 0.97,
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
        activeOpacity={1}
        style={{ flex: 1 }}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Simple verse pool
const VERSES = [
  { id: 1, reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future." },
  { id: 2, reference: "Philippians 4:13", text: "I can do all this through him who gives me strength." },
  { id: 3, reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { id: 4, reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { id: 5, reference: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing." },
  { id: 6, reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { id: 7, reference: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { id: 8, reference: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." },
  { id: 9, reference: "Psalm 46:10", text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth." },
  { id: 10, reference: "1 Corinthians 13:4", text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud." },
];

const SimplePrayerCard = () => {
  const { theme } = useTheme();
  
  const [prayers, setPrayers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPrayerName, setNewPrayerName] = useState('');
  const [newPrayerTime, setNewPrayerTime] = useState('');
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [editingPrayer, setEditingPrayer] = useState(null);
  
  // Simple and Discussion states
  const [simplifiedVerses, setSimplifiedVerses] = useState(new Map()); // Track which verses are simplified
  const [loadingSimplification, setLoadingSimplification] = useState(new Set()); // Track loading states
  const [showDiscussModal, setShowDiscussModal] = useState(false);
  const [verseToDiscuss, setVerseToDiscuss] = useState(null);

  // Load prayers on start
  useEffect(() => {
    loadPrayers();
  }, []);

  // Format time input with auto-colon (17 -> 17:00)
  const formatTimeInput = (input) => {
    // Remove any non-digits
    const digits = input.replace(/\D/g, '');
    
    if (digits.length === 0) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) {
      return digits.slice(0, 2) + ':' + digits.slice(2);
    }
    return digits.slice(0, 2) + ':' + digits.slice(2, 4);
  };

  // Validate time format (HH:MM)
  const isValidTime = (time) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const loadPrayers = async () => {
    try {
      const stored = await getStoredData('simplePrayers') || [];
      setPrayers(stored);
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

  // Get exactly 2 verses - always the same for consistency
  const getTwoVerses = () => {
    // Always return exactly 2 verses, no changing
    const shuffled = [...VERSES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  };

  // Add new prayer
  const addPrayer = async () => {
    if (!newPrayerName.trim()) {
      Alert.alert('Error', 'Please enter a prayer name');
      return;
    }

    if (!newPrayerTime.trim()) {
      Alert.alert('Error', 'Please enter a prayer time');
      return;
    }

    if (!isValidTime(newPrayerTime)) {
      Alert.alert('Error', 'Please enter a valid time (e.g., 17:00)');
      return;
    }

    const newPrayer = {
      id: Date.now(),
      name: newPrayerName.trim(),
      time: newPrayerTime,
      verses: getTwoVerses(), // Always exactly 2 verses
      createdAt: new Date().toISOString(),
      completedAt: null, // Track when completed
      canComplete: true, // Can complete initially
    };

    const updatedPrayers = [...prayers, newPrayer];
    setPrayers(updatedPrayers);
    await savePrayers(updatedPrayers);
    
    setShowAddModal(false);
    setNewPrayerName('');
    setNewPrayerTime('');
    hapticFeedback.success();
  };

  // Edit prayer
  const editPrayer = (prayer) => {
    setEditingPrayer(prayer);
    setNewPrayerName(prayer.name);
    setNewPrayerTime(prayer.time);
    setShowEditModal(true);
    hapticFeedback.light();
  };

  // Save edited prayer
  const saveEditedPrayer = async () => {
    if (!newPrayerName.trim()) {
      Alert.alert('Error', 'Please enter a prayer name');
      return;
    }

    if (!newPrayerTime.trim()) {
      Alert.alert('Error', 'Please enter a prayer time');
      return;
    }

    if (!isValidTime(newPrayerTime)) {
      Alert.alert('Error', 'Please enter a valid time (e.g., 17:00)');
      return;
    }

    const updatedPrayers = prayers.map(p => 
      p.id === editingPrayer.id 
        ? { ...p, name: newPrayerName.trim(), time: newPrayerTime }
        : p
    );
    
    setPrayers(updatedPrayers);
    await savePrayers(updatedPrayers);
    
    setShowEditModal(false);
    setEditingPrayer(null);
    setNewPrayerName('');
    setNewPrayerTime('');
    hapticFeedback.success();
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

  // Simplify verse for 12-year-old understanding
  const simplifyVerse = async (verse) => {
    try {
      hapticFeedback.light();
      
      // If already simplified, toggle back to original
      if (simplifiedVerses.has(verse.id)) {
        const newMap = new Map(simplifiedVerses);
        newMap.delete(verse.id);
        setSimplifiedVerses(newMap);
        return;
      }
      
      // Start loading
      const newLoadingSet = new Set(loadingSimplification);
      newLoadingSet.add(verse.id);
      setLoadingSimplification(newLoadingSet);
      
      let simplifiedText;
      
      // Try to get AI simplification
      try {
        const productionAiService = require('../services/productionAiService').default;
        simplifiedText = await productionAiService.simplifyBibleVerse(verse.text, verse.reference);
      } catch (error) {
        // Fallback to basic simplification [[memory:7766870]]
        simplifiedText = `This verse means: ${verse.text
          .replace(/thee|thou|thy/gi, 'you')
          .replace(/ye/gi, 'you all')
          .replace(/hath/gi, 'has')
          .replace(/doth/gi, 'does')
          .replace(/shalt/gi, 'should')
          .replace(/unto/gi, 'to')}

In simple words: God is telling us something important here that we can understand and follow in our daily lives.`;
      }
      
      // Stop loading and show simplified text
      const newLoadingSetAfter = new Set(loadingSimplification);
      newLoadingSetAfter.delete(verse.id);
      setLoadingSimplification(newLoadingSetAfter);
      
      const newMap = new Map(simplifiedVerses);
      newMap.set(verse.id, simplifiedText);
      setSimplifiedVerses(newMap);
      
    } catch (error) {
      console.log('Error simplifying verse:', error);
      Alert.alert('Error', 'Could not simplify verse');
      
      // Stop loading on error
      const newLoadingSet = new Set(loadingSimplification);
      newLoadingSet.delete(verse.id);
      setLoadingSimplification(newLoadingSet);
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

      // Mark prayer as completed with timestamp - verses stay the same
      const updatedPrayers = prayers.map(p => 
        p.id === prayer.id 
          ? { 
              ...p, 
              completedAt: new Date().toISOString(),
              canComplete: false
            }
          : p
      );
      setPrayers(updatedPrayers);
      await savePrayers(updatedPrayers);

      setShowPrayerModal(false);
      hapticFeedback.success();
      
      Alert.alert(
        'Prayer Completed! 🙏',
        'Wonderful! You earned 500 points. You can complete this prayer again in 24 hours.',
        [{ text: 'Amen! 🙏', style: 'default' }]
      );
    } catch (error) {
      console.log('Error completing prayer:', error);
      Alert.alert('Error', 'Could not complete prayer');
    }
  };

  return (
    <AnimatedLiquidGlassCard 
      style={styles.container}
      effect="regular"
      interactive={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <GlassText style={[styles.title]}>🙏 My Prayers</GlassText>
        <LiquidGlassButton
          style={[styles.addButton]}
          effect="clear"
          onPress={() => {
            setShowAddModal(true);
            hapticFeedback.light();
          }}
        >
          <MaterialIcons name="add" size={24} color={theme.primary} />
        </LiquidGlassButton>
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
            
            return (
              <View key={prayer.id} style={[styles.prayerItem, { 
                backgroundColor: theme.card + 'CC',
                opacity: canComplete ? 1 : 0.7
              }]}>
                <AnimatedPrayerCard
                  style={styles.prayerContent}
                  onPress={() => {
                    setSelectedPrayer(prayer);
                    setShowPrayerModal(true);
                    hapticFeedback.light();
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
                      <Text style={[styles.prayerName, { color: theme.text }]}>
                        {prayer.name}
                      </Text>
                      <Text style={[styles.prayerTime, { color: theme.textSecondary }]}>
                        {prayer.time} {timeUntil ? `• ${timeUntil}` : 
                         isInTimeWindow ? '• Available now' : ''}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
                </AnimatedPrayerCard>
                
                <AnimatedPrayerButton
                  style={[styles.editButton, { backgroundColor: theme.primary + '20' }]}
                  onPress={() => editPrayer(prayer)}
                >
                  <MaterialIcons name="edit" size={16} color={theme.primary} />
                </AnimatedPrayerButton>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Prayer Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F0' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add Prayer
              </Text>
              <TouchableOpacity onPress={addPrayer}>
                <Text style={[styles.saveButton, { color: theme.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Prayer Name
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="e.g., Morning Prayer, Gratitude"
                placeholderTextColor={theme.textSecondary}
                value={newPrayerName}
                onChangeText={setNewPrayerName}
                autoFocus
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 20 }]}>
                Prayer Time
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="e.g., 17:00, 09:30"
                placeholderTextColor={theme.textSecondary}
                value={newPrayerTime}
                onChangeText={(text) => setNewPrayerTime(formatTimeInput(text))}
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                Just type the numbers (e.g., 1700 becomes 17:00)
              </Text>
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Prayer Detail Modal */}
      <Modal
        visible={showPrayerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrayerModal(false)}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F0' }]}>
            {selectedPrayer && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowPrayerModal(false)}>
                    <MaterialIcons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {selectedPrayer.name}
                  </Text>
                  <View style={{ width: 24 }} />
                </View>
                
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Prayer Time Display */}
                  <View style={[styles.prayerTimeCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                    <MaterialIcons name="schedule" size={20} color={theme.primary} />
                    <Text style={[styles.prayerTimeText, { color: theme.primary }]}>
                      Prayer Time: {selectedPrayer.time}
                    </Text>
                    <View style={[styles.timeBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.timeBadgeText}>⏰</Text>
                    </View>
                  </View>

                  {/* Inspirational Quote */}
                  <View style={[styles.quoteCard, { backgroundColor: theme.success + '10', borderColor: theme.success + '20' }]}>
                    <Text style={[styles.quoteText, { color: theme.textSecondary }]}>
                      "Prayer is not asking. It is a longing of the soul." 
                    </Text>
                    <Text style={[styles.quoteAuthor, { color: theme.success }]}>
                      — Mahatma Gandhi
                    </Text>
                  </View>

                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    📖 Today's Verses
                  </Text>
                  
                  {selectedPrayer.verses.map((verse, index) => (
                    <View key={verse.id} style={[styles.verseCard, { backgroundColor: theme.card + 'E0' }]}>
                      <View style={styles.verseHeader}>
                        <View style={[styles.verseNumber, { backgroundColor: theme.primary }]}>
                          <Text style={styles.verseNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.verseReference, { color: theme.primary }]}>
                          {verse.reference}
                        </Text>
                      </View>
                      
                      {/* Original Verse Text */}
                      <Text style={[styles.verseText, { color: theme.text }]}>
                        {verse.text}
                      </Text>

                      {/* Simplified Text (if available) */}
                      {simplifiedVerses.has(verse.id) && (
                        <View style={[styles.simplifiedContainer, { backgroundColor: theme.success + '10', borderColor: theme.success + '30' }]}>
                          <View style={styles.simplifiedHeader}>
                            <MaterialIcons name="child-care" size={16} color={theme.success} />
                            <Text style={[styles.simplifiedLabel, { color: theme.success }]}>
                              Simple Version:
                            </Text>
                          </View>
                          <Text style={[styles.simplifiedText, { color: theme.textSecondary }]}>
                            {simplifiedVerses.get(verse.id)}
                          </Text>
                        </View>
                      )}

                      {/* Verse Action Buttons */}
                      <View style={styles.verseActions}>
                        <TouchableOpacity
                          style={[styles.verseActionButton, { 
                            backgroundColor: simplifiedVerses.has(verse.id) ? theme.success + '30' : theme.success + '20',
                            borderColor: simplifiedVerses.has(verse.id) ? theme.success : theme.success + '40'
                          }]}
                          onPress={() => simplifyVerse(verse)}
                          disabled={loadingSimplification.has(verse.id)}
                        >
                          {loadingSimplification.has(verse.id) ? (
                            <MaterialIcons name="hourglass-empty" size={16} color={theme.success} />
                          ) : (
                            <MaterialIcons name="child-care" size={16} color={theme.success} />
                          )}
                          <Text style={[styles.verseActionText, { color: theme.success }]}>
                            {simplifiedVerses.has(verse.id) ? 'Original' : 'Simple'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.verseActionButton, { 
                            backgroundColor: theme.primary + '20',
                            borderColor: theme.primary + '40'
                          }]}
                          onPress={() => discussVerse(verse)}
                        >
                          <MaterialIcons name="chat" size={16} color={theme.primary} />
                          <Text style={[styles.verseActionText, { color: theme.primary }]}>
                            Discuss
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* Prayer Completion Section */}
                  <View style={[styles.completionSection, { backgroundColor: theme.card + '80' }]}>
                    <View style={styles.completionHeader}>
                      <MaterialIcons name="auto-awesome" size={20} color={theme.success} />
                      <Text style={[styles.completionTitle, { color: theme.text }]}>
                        Ready to Complete?
                      </Text>
                    </View>
                    
                    <Text style={[styles.completionSubtitle, { color: theme.textSecondary }]}>
                      Take a moment to reflect on these verses and complete your prayer when ready.
                    </Text>

                    <TouchableOpacity
                      style={[styles.completeButton, { 
                        backgroundColor: canCompletePrayer(selectedPrayer) ? theme.success : theme.textSecondary,
                        opacity: canCompletePrayer(selectedPrayer) ? 1 : 0.6
                      }]}
                      onPress={() => completePrayer(selectedPrayer)}
                      disabled={!canCompletePrayer(selectedPrayer)}
                    >
                      <MaterialIcons name="check-circle" size={24} color="#ffffff" />
                      <Text style={styles.completeButtonText}>
                        {canCompletePrayer(selectedPrayer) ? 'Complete Prayer' : 
                         getTimeUntilAvailable(selectedPrayer) ? 
                         `${getTimeUntilAvailable(selectedPrayer)}` : 'Not Available'}
                      </Text>
                      {canCompletePrayer(selectedPrayer) && (
                        <View style={styles.pointsBadge}>
                          <Text style={styles.pointsText}>+500 pts</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Decorative Elements */}
                    <View style={styles.decorativeElements}>
                      <Text style={styles.decorativeEmoji}>🙏</Text>
                      <Text style={styles.decorativeEmoji}>✨</Text>
                      <Text style={styles.decorativeEmoji}>💫</Text>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* Edit Prayer Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background + 'F0' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Prayer
              </Text>
              <TouchableOpacity onPress={saveEditedPrayer}>
                <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Prayer Name
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="e.g., Morning Prayer, Gratitude"
                placeholderTextColor={theme.textSecondary}
                value={newPrayerName}
                onChangeText={setNewPrayerName}
                autoFocus
              />

              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 20 }]}>
                Prayer Time
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border
                }]}
                placeholder="e.g., 17:00, 09:30"
                placeholderTextColor={theme.textSecondary}
                value={newPrayerTime}
                onChangeText={(text) => setNewPrayerTime(formatTimeInput(text))}
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                Just type the numbers (e.g., 1700 becomes 17:00)
              </Text>

              {editingPrayer && (
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: theme.error + '20', marginTop: 30 }]}
                  onPress={() => {
                    setShowEditModal(false);
                    setTimeout(() => removePrayer(editingPrayer.id), 300);
                  }}
                >
                  <MaterialIcons name="delete" size={20} color={theme.error} />
                  <Text style={[styles.deleteButtonText, { color: theme.error }]}>
                    Delete Prayer
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

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
          title="Discuss This Verse"
        />
      )}
    </BlurView>
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
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  verseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  verseNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verseReference: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pointsBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Verse action buttons
  verseActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  verseActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  verseActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Simplified text inline styles
  simplifiedContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  simplifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  simplifiedLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  simplifiedText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // New visual elements
  prayerTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  prayerTimeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  timeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBadgeText: {
    fontSize: 16,
  },
  quoteCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  quoteAuthor: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  completionSection: {
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  completionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  decorativeElements: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  decorativeEmoji: {
    fontSize: 24,
    opacity: 0.6,
  },
});

export default SimplePrayerCard;
