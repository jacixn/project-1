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
// SafeAreaView removed - using full screen experience
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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



  // Bible access section with Liquid Glass
  const BibleSection = () => {
    // Liquid Glass Container for Bible Section
    const LiquidGlassBibleContainer = ({ children }) => {
      if (!isLiquidGlassSupported) {
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
      <Text style={[styles.sectionTitle, { color: theme.text }]}>📖 Holy Bible</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Read, study, and grow in faith
      </Text>
      
      <AnimatedBibleButton 
        style={[styles.bibleButton, { 
          backgroundColor: `${theme.primary}10`, // Added 4 to opacity (06 -> 10)
          borderWidth: 0.8, // Much thinner border (1.4 -> 0.8)
          borderColor: `${theme.primary}15`, // Much more subtle border (32% -> 15%)
          borderRadius: 16, // Smooth rounded corners - no sharp edges!
          shadowColor: theme.primary, // Colored shadow
          shadowOffset: { width: 0, height: 1 }, // Smaller shadow (2 -> 1)
          shadowOpacity: 0.06, // Much more subtle shadow (0.12 -> 0.06)
          shadowRadius: 3, // Smaller shadow radius (5 -> 3)
          elevation: 1, // Much lower elevation (3 -> 1)
          // Add glow effect for different themes
          ...(isBlushTheme && {
            shadowColor: '#FF69B4', // Hot pink glow
            backgroundColor: 'rgba(255, 182, 193, 0.2)', // Keep Blush at 20%
            borderColor: 'rgba(255, 105, 180, 0.4)', // Reduced to 40%
          }),
          ...(isCresviaTheme && {
            shadowColor: '#8A2BE2', // Blue violet glow
            backgroundColor: 'rgba(138, 43, 226, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
            borderColor: 'rgba(147, 112, 219, 0.15)', // Much more subtle (0.32 -> 0.15)
          }),
          ...(isEternaTheme && {
            shadowColor: '#4B0082', // Indigo glow
            backgroundColor: 'rgba(75, 0, 130, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
            borderColor: 'rgba(72, 61, 139, 0.15)', // Much more subtle (0.32 -> 0.15)
          }),
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
        activeOpacity={0.4} // Reduced brightness by 50% (was 0.8, now 0.4)
        onPress={() => {
          hapticFeedback.light();
          // Future: Add verse sharing or Bible navigation
        }}
        style={[styles.transparentVerseOfDay, { 
          backgroundColor: `${theme.primary}10`, // Added 4 to opacity (06 -> 10)
          borderWidth: 0.8, // Much thinner border (1.4 -> 0.8)
          borderColor: `${theme.primary}15`, // Much more subtle border (32% -> 15%)
          borderRadius: 16, // Smooth rounded corners - no sharp edges!
          shadowColor: theme.primary, // Colored shadow
          shadowOffset: { width: 0, height: 1 }, // Smaller shadow (2 -> 1)
          shadowOpacity: 0.06, // Much more subtle shadow (0.12 -> 0.06)
          shadowRadius: 3, // Smaller shadow radius (5 -> 3)
          elevation: 1, // Much lower elevation (3 -> 1)
          // Add glow effect for different themes
          ...(isBlushTheme && {
            shadowColor: '#FF69B4', // Hot pink glow
            backgroundColor: 'rgba(255, 182, 193, 0.2)', // Keep Blush at 20%
            borderColor: 'rgba(255, 105, 180, 0.4)', // Reduced to 40%
          }),
          ...(isCresviaTheme && {
            shadowColor: '#8A2BE2', // Blue violet glow
            backgroundColor: 'rgba(138, 43, 226, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
            borderColor: 'rgba(147, 112, 219, 0.15)', // Much more subtle (0.32 -> 0.15)
          }),
          ...(isEternaTheme && {
            shadowColor: '#4B0082', // Indigo glow
            backgroundColor: 'rgba(75, 0, 130, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
            borderColor: 'rgba(72, 61, 139, 0.15)', // Much more subtle (0.32 -> 0.15)
          }),
        }]}
      >
        <Text style={[styles.verseLabel, { color: theme.textSecondary }]}>
          💫 Verse of the Day
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
          {dailyVerse.reference}
        </Text>
      </TouchableOpacity>
      </LiquidGlassBibleContainer>
    );
  };

  // Bible Study section with Liquid Glass
  const BibleStudySection = () => {
    // Liquid Glass Container for Bible Study Section
    const LiquidGlassBibleStudyContainer = ({ children }) => {
      if (!isLiquidGlassSupported) {
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
      <Text style={[styles.sectionTitle, { color: theme.text }]}>📚 Bible Study</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Explore characters, timeline, maps & more
      </Text>
      
      <AnimatedBibleButton 
        style={[styles.bibleButton, { 
          backgroundColor: `${theme.primary}10`, // Added 4 to opacity (06 -> 10)
          borderWidth: 0.8, // Much thinner border (1.4 -> 0.8)
          borderColor: `${theme.primary}15`, // Much more subtle border (32% -> 15%)
          borderRadius: 16, // Smooth rounded corners - no sharp edges!
          shadowColor: theme.primary, // Colored shadow
          shadowOffset: { width: 0, height: 1 }, // Smaller shadow (2 -> 1)
          shadowOpacity: 0.06, // Much more subtle shadow (0.12 -> 0.06)
          shadowRadius: 3, // Smaller shadow radius (5 -> 3)
          elevation: 1, // Much lower elevation (3 -> 1)
          // Add glow effect for different themes
          ...(isBlushTheme && {
            shadowColor: '#FF69B4', // Hot pink glow
            backgroundColor: 'rgba(255, 182, 193, 0.2)', // Keep Blush at 20%
            borderColor: 'rgba(255, 105, 180, 0.4)', // Reduced to 40%
          }),
          ...(isCresviaTheme && {
            shadowColor: '#8A2BE2', // Blue violet glow
            backgroundColor: 'rgba(138, 43, 226, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
            borderColor: 'rgba(147, 112, 219, 0.15)', // Much more subtle (0.32 -> 0.15)
          }),
          ...(isEternaTheme && {
            shadowColor: '#4B0082', // Indigo glow
            backgroundColor: 'rgba(75, 0, 130, 0.10)', // Added 4 to opacity (0.06 -> 0.10)
            borderColor: 'rgba(72, 61, 139, 0.15)', // Much more subtle (0.32 -> 0.15)
          }),
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
      <View style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? 'transparent' : theme.background }]}>
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
});

export default BiblePrayerTab;
