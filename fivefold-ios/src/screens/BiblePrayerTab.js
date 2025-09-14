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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { FluidTransition, FluidCard, FluidButton } from '../components/FluidTransition';
import { GlassCard, GlassHeader } from '../components/GlassEffect';
import ScrollHeader from '../components/ScrollHeader';
import { createEntranceAnimation } from '../utils/animations';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';

// Components
import PrayerCard from '../components/PrayerCard';
import SimplePrayerCard from '../components/SimplePrayerCard';
import BibleReader from '../components/BibleReader';
import BibleStudyModal from '../components/BibleStudyModal';
import PrayerScreen from '../components/PrayerScreen';
import AiBibleChat from '../components/AiBibleChat';
import { getStoredData, saveData } from '../utils/localStorage';
// Location permission removed - using fixed prayer times
import { hapticFeedback } from '../utils/haptics';
import { initializeDailyReset, scheduleNextDayReset } from '../utils/dailyReset';
import { getDailyVerse } from '../utils/dailyVerse';

// Fixed prayer times - no location needed
const calculatePrayerTimes = () => {
  return {
    beforeSunrise: '05:30',
    afterSunrise: '06:30', 
    midday: '12:00',
    beforeSunset: '17:30',
    afterSunset: '18:30'
  };
};

const getNextPrayerTime = (times) => {
  const timeKeys = Object.keys(times);
  return timeKeys[0]; // Simple fallback
};

const BiblePrayerTab = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme } = useTheme();
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

  useEffect(() => {
    initializePrayerData();
  }, []);

  // Update daily verse at midnight
  useEffect(() => {
    const updateDailyVerse = async () => {
      try {
        const verse = await getDailyVerse();
        setDailyVerse(verse);
      } catch (error) {
        console.error('Error loading daily verse:', error);
        setDailyVerse({ 
          text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.", 
          reference: "Jeremiah 29:11" 
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

  const initializePrayerData = async () => {
    try {
      // Initialize daily reset system first
      await initializeDailyReset();
      
      // Schedule automatic reset at midnight
      scheduleNextDayReset();

      // Load prayer history (after potential reset)
      const history = await getStoredData('prayerHistory') || [];
      setPrayerHistory(history);
      
      // Calculate fixed prayer times (no location needed)
      const times = calculatePrayerTimes();
      setPrayerTimes(times);
      setNextPrayer(getNextPrayerTime(times));
    } catch (error) {
      console.error('Failed to initialize prayer data:', error);
    }
  };

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



  // Bible access section
  const BibleSection = () => (
    <BlurView intensity={18} tint="light" style={styles.bibleCard}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>📖 Holy Bible</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Read, study, and grow in faith
      </Text>
      
      <TouchableOpacity 
        style={[styles.bibleButton, { backgroundColor: theme.bibleBackground }]}
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
      </TouchableOpacity>
      
      {/* Verse of the day */}
      <BlurView intensity={30} tint="light" style={styles.verseOfDay}>
        <Text style={[styles.verseLabel, { color: theme.textSecondary }]}>
          💫 Verse of the Day
        </Text>
        <Text 
          style={[styles.verseText, { color: theme.text }]}
          selectable={true}
          selectTextOnFocus={false}
          dataDetectorType="none"
          allowFontScaling={true}
        >
          "{dailyVerse.text}"
        </Text>
        <Text 
          style={[styles.verseReference, { color: theme.textSecondary }]}
          selectable={true}
          selectTextOnFocus={false}
          dataDetectorType="none"
          allowFontScaling={true}
        >
          {dailyVerse.reference}
        </Text>
      </BlurView>
    </BlurView>
  );

  // Bible Study section with educational features
  const BibleStudySection = () => (
    <BlurView intensity={18} tint="light" style={styles.bibleCard}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>📚 Bible Study</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Explore characters, timeline, maps & more
      </Text>
      
      <TouchableOpacity 
        style={[styles.bibleButton, { backgroundColor: theme.bibleBackground }]}
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
      </TouchableOpacity>

      {/* Quick access features */}
      <View style={styles.quickAccessContainer}>
        <TouchableOpacity 
          style={[styles.quickAccessButton, { backgroundColor: `${theme.primary}15` }]}
          onPress={() => {
            hapticFeedback.light();
            setShowBibleStudy(true);
            // Could set initial section to characters
          }}
        >
          <MaterialIcons name="people" size={18} color={theme.primary} />
          <Text style={[styles.quickAccessText, { color: theme.primary }]}>Characters</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.quickAccessButton, { backgroundColor: `${theme.primary}15` }]}
          onPress={() => {
            hapticFeedback.light();
            setShowBibleStudy(true);
            // Could set initial section to timeline
          }}
        >
          <MaterialIcons name="timeline" size={18} color={theme.primary} />
          <Text style={[styles.quickAccessText, { color: theme.primary }]}>Timeline</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.quickAccessButton, { backgroundColor: `${theme.primary}15` }]}
          onPress={() => {
            hapticFeedback.light();
            setShowBibleStudy(true);
            // Could set initial section to maps
          }}
        >
          <MaterialIcons name="map" size={18} color={theme.primary} />
          <Text style={[styles.quickAccessText, { color: theme.primary }]}>Maps</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );

  return (
    <AnimatedWallpaper 
      scrollY={scrollY}
      parallaxFactor={0.3}
      blurOnScroll={false}
      fadeOnScroll={false}
      scaleOnScroll={true}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? 'transparent' : theme.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.background}
        />
      
      {/* Fixed Header - Always Visible - Glassy */}
      <GlassHeader 
        style={[styles.fixedHeader, { 
          backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? 'rgba(255, 255, 255, 0.1)' : (isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)')
        }]}
        intensity={(isBlushTheme || isCresviaTheme || isEternaTheme) ? 15 : 25}
        absolute={false}
      >
        <View style={styles.headerContent}>
          {/* Logo positioned on the left */}
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          
          {/* Centered text content */}
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Biblely</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Faith & Focus, Every Day
            </Text>
          </View>
        </View>
      </GlassHeader>

      {/* Main Content - flows to top like Twitter */}
      <Animated.ScrollView 
        style={styles.twitterContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.twitterScrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Simple Prayer Card */}
        <SimplePrayerCard />



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
      {showFriendChat && (
        <AiBibleChat
          visible={showFriendChat}
          onClose={() => {
            setShowFriendChat(false);
            setVerseToInterpret(null);
          }}
          initialVerse={verseToInterpret}
          onNavigateToBible={handleNavigateToVerse}
        />
      )}
    </SafeAreaView>
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
    marginTop: Platform.OS === 'ios' ? 77 : 52, // No gap after header line
  },
  twitterScrollContent: {
    paddingTop: 0, // No padding - content starts right after header
    paddingBottom: 90, // Reduced space for floating tab bar
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
    paddingBottom: 90, // Reduced space for floating tab bar
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
    borderRadius: 12,
    marginBottom: 16,
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
});

export default BiblePrayerTab;
