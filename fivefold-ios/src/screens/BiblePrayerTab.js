import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
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
import BibleReader from '../components/BibleReader';
import PrayerScreen from '../components/PrayerScreen';
import AiBibleChat from '../components/AiBibleChat';
import { getStoredData, saveData } from '../utils/localStorage';
import { requestLocationPermission } from '../utils/locationPermission';
import { hapticFeedback } from '../utils/haptics';
import { initializeDailyReset, scheduleNextDayReset } from '../utils/dailyReset';

// Placeholder prayer time functions - replace with actual solar calculations
const calculatePrayerTimes = (location) => {
  const now = new Date();
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
  const [showPrayerScreen, setShowPrayerScreen] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [showFriendChat, setShowFriendChat] = useState(false);
  const [verseToInterpret, setVerseToInterpret] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [prayerTimes, setPrayerTimes] = useState({});
  const [prayerHistory, setPrayerHistory] = useState([]);
  const [location, setLocation] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);

  useEffect(() => {
    initializePrayerData();
  }, []);

  const initializePrayerData = async () => {
    try {
      // Initialize daily reset system first
      await initializeDailyReset();
      
      // Schedule automatic reset at midnight
      scheduleNextDayReset();

      // Load location and prayer data
      const userLocation = await requestLocationPermission();
      setLocation(userLocation);
      
      // Load prayer history (after potential reset)
      const history = await getStoredData('prayerHistory') || [];
      setPrayerHistory(history);
      
      // Calculate prayer times (imported from your existing logic)
      if (userLocation) {
        const times = calculatePrayerTimes(userLocation);
        setPrayerTimes(times);
        setNextPrayer(getNextPrayerTime(times));
      }
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
          setShowBible(true);
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
      
      {/* Verse of the day could go here */}
      <BlurView intensity={30} tint="light" style={styles.verseOfDay}>
        <Text style={[styles.verseLabel, { color: theme.textSecondary }]}>
          💫 Verse of the Day
        </Text>
        <Text style={[styles.verseText, { color: theme.text }]}>
          "For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, to give you hope and a future."
        </Text>
        <Text style={[styles.verseReference, { color: theme.textSecondary }]}>
          Jeremiah 29:11
        </Text>
      </BlurView>
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
        {/* Prayer Times Card */}
        <PrayerCard
          prayerTimes={prayerTimes}
          prayerHistory={prayerHistory}
          onPrayerComplete={handlePrayerComplete}
          onPrayerPress={handlePrayerPress}
          location={location}
          nextPrayer={nextPrayer}
        />



        {/* Bible Section */}
        <BibleSection />
      </Animated.ScrollView>

      {/* Bible Modal */}
      {showBible && (
        <BibleReader
          visible={showBible}
          onClose={() => setShowBible(false)}
          onInterpretVerse={(verseContent, reference) => {
            setShowBible(false);
            setVerseToInterpret({ content: verseContent, reference });
            setTimeout(() => setShowFriendChat(true), 300);
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
      {showFriendChat && (
        <AiBibleChat
          visible={showFriendChat}
          onClose={() => {
            setShowFriendChat(false);
            setVerseToInterpret(null);
          }}
          initialVerse={verseToInterpret}
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
    paddingBottom: 120, // Space for floating tab bar
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
    paddingBottom: 120, // Space for floating tab bar
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
});

export default BiblePrayerTab;
