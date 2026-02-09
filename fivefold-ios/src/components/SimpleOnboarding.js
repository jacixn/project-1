import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
  Animated,
  Switch,
  ActivityIndicator,
  Easing,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { hapticFeedback } from '../utils/haptics';
import { countries } from '../data/countries';
import { bibleVersions } from '../data/bibleVersions';
import { persistProfileImage } from '../utils/profileImageStorage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadProfilePicture } from '../services/storageService';

const { width, height } = Dimensions.get('window');

// ============================================
// EXTRACTED COMPONENT: Name Input Screen
// Must be OUTSIDE main component to prevent re-creation
// Inline styles to avoid dependency on main styles object
// ============================================
const NameInputScreen = React.memo(({ 
  userName, 
  setUserName, 
  onNext, 
  progress,
  screenTheme 
}) => {
  const inputRef = useRef(null);
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenTheme.bg }}>
      {/* Progress Bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden' }}>
          <View 
            style={{ 
              height: '100%',
              backgroundColor: screenTheme.accent,
              width: `${progress * 100}%`,
              borderRadius: 3,
            }} 
          />
        </View>
      </View>
      
      <KeyboardAvoidingView 
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 30 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, color: '#333' }}>
            First things first - what's your name?
          </Text>
          
          <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 30, lineHeight: 24, color: '#666' }}>
            I like to keep things personal around here
          </Text>
          
          <View style={{ width: '100%', marginTop: 20 }}>
            <TextInput
              ref={inputRef}
              style={{
                backgroundColor: '#FFF',
                borderRadius: 16,
                paddingHorizontal: 20,
                paddingVertical: 18,
                fontSize: 18,
                textAlign: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
              placeholder="Your name"
              placeholderTextColor="#999"
              defaultValue={userName}
              onChangeText={setUserName}
              maxLength={30}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (userName.trim()) onNext();
              }}
            />
          </View>
          
          {userName.trim() !== '' && (
            <Text style={{ fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginTop: 20, color: '#666' }}>
              Nice to meet you, <Text style={{ fontWeight: 'bold' }}>{userName}</Text>! This is going to be great.
            </Text>
          )}
        </View>
        
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
        </View>
      </KeyboardAvoidingView>
      
      <TouchableOpacity 
        onPress={onNext}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: userName.trim() ? '#333' : '#CCC',
          marginHorizontal: 20,
          marginBottom: 30,
          paddingVertical: 18,
          borderRadius: 16,
          gap: 8,
        }}
        disabled={!userName.trim()}
      >
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '600' }}>Next</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
});

// ============================================
// EXTRACTED COMPONENT: Country Search Screen
// Must be OUTSIDE main component to prevent re-creation
// Inline styles to avoid dependency on main styles object
// ============================================
const CountrySearchScreen = React.memo(({ 
  selectedCountry, 
  setSelectedCountry, 
  onNext, 
  progress,
  screenTheme,
  userName 
}) => {
  const [searchText, setSearchText] = useState('');
  const inputRef = useRef(null);
  
  const popularCountryCodes = ['US', 'GB', 'CA', 'AU', 'NG', 'IN'];
  const popularCountries = popularCountryCodes
    .map(code => countries.find(c => c.code === code))
    .filter(Boolean);
  
  const filteredCountries = searchText.trim()
    ? countries.filter((c) => c.name.toLowerCase().includes(searchText.toLowerCase()))
    : popularCountries;
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenTheme.bg }}>
      {/* Progress Bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden' }}>
          <View 
            style={{ 
              height: '100%',
              backgroundColor: screenTheme.accent,
              width: `${progress * 100}%`,
              borderRadius: 3,
            }} 
          />
        </View>
      </View>
      
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 30 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, color: '#333' }}>
          Where are you from, {userName}?
        </Text>
        
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 30, lineHeight: 24, color: '#666' }}>
          This helps personalize your experience
        </Text>
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFF',
          borderRadius: 12,
          paddingHorizontal: 15,
          paddingVertical: 12,
          marginBottom: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <MaterialIcons name="search" size={20} color="#999" />
          <TextInput
            ref={inputRef}
            style={{ flex: 1, marginLeft: 10, fontSize: 16 }}
            placeholder="Search countries..."
            placeholderTextColor="#999"
            defaultValue=""
            onChangeText={setSearchText}
            autoCorrect={false}
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => {
              setSearchText('');
              if (inputRef.current) inputRef.current.clear();
            }}>
              <MaterialIcons name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView 
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filteredCountries.map((country) => {
            const isSelected = selectedCountry?.code === country.code;
            return (
              <TouchableOpacity
                key={country.code}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FFF',
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 10,
                    borderWidth: 2,
                    borderColor: 'transparent',
                  },
                  isSelected && { borderColor: screenTheme.accent },
                ]}
                onPress={() => {
                  hapticFeedback.selection();
                  setSelectedCountry(country);
                }}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>{country.flag}</Text>
                <Text style={[
                  { flex: 1, fontSize: 16 },
                  isSelected && { color: screenTheme.accent, fontWeight: '600' }
                ]}>
                  {country.name}
                </Text>
                {isSelected && (
                  <MaterialIcons name="check-circle" size={22} color={screenTheme.accent} />
                )}
              </TouchableOpacity>
            );
          })}
          
          {!searchText.trim() && (
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 10, fontSize: 14 }}>
              Don't see your country? Search above!
            </Text>
          )}
          
          {searchText.trim() && filteredCountries.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 20, fontSize: 14 }}>
              No countries found for "{searchText}"
            </Text>
          )}
        </ScrollView>
      </View>
      
      <TouchableOpacity 
        onPress={onNext}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#333',
          marginHorizontal: 20,
          marginBottom: 30,
          paddingVertical: 18,
          borderRadius: 16,
          gap: 8,
        }}
      >
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '600' }}>{selectedCountry ? 'Next' : 'Skip'}</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
});

// Screen background colors (like Bread app's themed backgrounds)
const SCREEN_THEMES = {
  splash: { bg: '#E8F5E9', accent: '#2E7D32' },           // Green - growth
  welcome: { bg: '#FCE4EC', accent: '#C62828' },          // Pink - warm welcome
  name: { bg: '#FFF3E0', accent: '#E65100' },             // Orange/peach
  country: { bg: '#E8F5E9', accent: '#2E7D32' },          // Green
  language: { bg: '#E3F2FD', accent: '#1976D2' },         // Blue - language
  painPoint: { bg: '#FFFDE7', accent: '#F57F17' },        // Yellow
  features: { bg: '#E3F2FD', accent: '#1565C0' },         // Blue
  featuresTasks: { bg: '#E8F5E9', accent: '#2E7D32' },    // Green - productivity
  featuresGym: { bg: '#FFEBEE', accent: '#C62828' },      // Red - fitness
  featuresHub: { bg: '#E8EAF6', accent: '#5C6BC0' },      // Indigo - social/community
  bible: { bg: '#FFF8E1', accent: '#FF8F00' },            // Amber - scripture
  weight: { bg: '#E0F7FA', accent: '#00838F' },           // Cyan - fitness
  photo: { bg: '#FCE4EC', accent: '#AD1457' },            // Pink - personal
  theme: { bg: '#F3E5F5', accent: '#7B1FA2' },            // Purple - personalization
  notifications: { bg: '#E0F2F1', accent: '#00695C' },    // Teal
  howFound: { bg: '#EDE7F6', accent: '#5E35B1' },         // Purple
  gift: { bg: '#FCE4EC', accent: '#AD1457' },             // Pink
  paywall: { bg: '#E3F2FD', accent: '#1565C0' },          // Blue
  complete: { bg: '#E8F5E9', accent: '#2E7D32' },         // Green - success
};

// Available languages
const LANGUAGES = [
  { id: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', available: true },
  { id: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', available: false },
  { id: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', available: false },
  { id: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', available: false },
  { id: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', available: false },
  { id: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', available: false },
  { id: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', available: false },
  { id: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', available: false },
  { id: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', available: false },
  { id: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', available: false },
  { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', available: false },
  { id: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', available: false },
  { id: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', available: false },
  { id: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', available: false },
  { id: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', available: false },
  { id: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', available: false },
  { id: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', available: false },
  { id: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', available: false },
  { id: 'fil', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭', available: false },
  { id: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', available: false },
];

// Pain point options (like Bread's "What's on your mind?")
const PAIN_POINTS = [
  {
    id: 'grow',
    icon: '🌱',
    iconBg: '#E8F5E9',
    title: 'I want to grow in faith',
    subtitle: 'Deepen my relationship with God',
  },
  {
    id: 'consistency',
    icon: '📅',
    iconBg: '#FFF3E0',
    title: 'I struggle with consistency',
    subtitle: 'Need help building daily habits',
  },
  {
    id: 'bible',
    icon: '📖',
    iconBg: '#E3F2FD',
    title: 'I want to read the Bible more',
    subtitle: 'Make scripture part of my routine',
  },
  {
    id: 'prayer',
    icon: '🙏',
    iconBg: '#FCE4EC',
    title: 'I need prayer support',
    subtitle: 'Want to develop a prayer life',
  },
  {
    id: 'fitness',
    icon: '💪',
    iconBg: '#FFEBEE',
    title: 'I want to get fit',
    subtitle: 'Strengthen body and spirit together',
  },
];

// How did you find us options
const ATTRIBUTION_OPTIONS = [
  { id: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', type: 'ionicon' },
  { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', type: 'ionicon' },
  { id: 'twitter', name: 'X / Twitter', icon: 'logo-twitter', type: 'ionicon' },
  { id: 'friend', name: 'Friend or Family', icon: 'people', type: 'ionicon' },
  { id: 'appstore', name: 'App Store', icon: 'apps', type: 'ionicon' },
  { id: 'google', name: 'Google Search', icon: 'search', type: 'ionicon' },
  { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', type: 'ionicon' },
  { id: 'church', name: 'Church', icon: 'business', type: 'ionicon' },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal', type: 'ionicon' },
];

// Premium features for paywall - compelling selling points
const PREMIUM_FEATURES = [
  { icon: 'chat', text: 'Smart Bible companion - ask anything, anytime' },
  { icon: 'menu-book', text: '44 Bible translations to compare' },
  { icon: 'headphones', text: 'Audio Bible stories - learn while you listen' },
  { icon: 'quiz', text: 'Bible quizzes - make Scripture stick' },
  { icon: 'auto-stories', text: 'Thematic guides for 50+ life moments' },
  { icon: 'task-alt', text: 'Smart tasks with points & streaks' },
  { icon: 'fitness-center', text: 'Faith-based workout programs' },
  { icon: 'favorite', text: 'Prayer tracking & daily reflections' },
  { icon: 'palette', text: 'Beautiful themes & customization' },
  { icon: 'emoji-events', text: 'Achievements, rewards & milestones' },
];

const SimpleOnboarding = ({ onComplete }) => {
  const { theme, isDark, changeTheme, toggleDarkMode, availableThemes } = useTheme();
  const { user, userProfile } = useAuth();
  const [currentScreen, setCurrentScreen] = useState(0);
  // Get display name from auth or profile - user already entered it during signup
  const [userName, setUserName] = useState(
    user?.displayName || userProfile?.displayName || userProfile?.username || user?.username || 'Friend'
  );
  const [profileImage, setProfileImage] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedPainPoint, setSelectedPainPoint] = useState(null);
  const [selectedAttribution, setSelectedAttribution] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [giftOpened, setGiftOpened] = useState(false);
  const [showFreeReveal, setShowFreeReveal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('jesusnlambs');
  const [selectedMode, setSelectedMode] = useState('dark');
  const [selectedBibleVersion, setSelectedBibleVersion] = useState('niv');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Default to English
  
  // Setup/Loading screen state
  const [showSetupScreen, setShowSetupScreen] = useState(false);
  const [setupSteps, setSetupSteps] = useState([]);
  const [currentSetupStep, setCurrentSetupStep] = useState(-1);

  // Migration state
  const [hasExistingData, setHasExistingData] = useState(false);
  const [existingDataSummary, setExistingDataSummary] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [checkingData, setCheckingData] = useState(true);
  
  // Animation refs - start at 1 so content is visible immediately
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const giftScaleAnim = useRef(new Animated.Value(1)).current;
  const priceStrikeAnim = useRef(new Animated.Value(0)).current;
  const freeRevealAnim = useRef(new Animated.Value(0)).current;

  // Check for existing local data on mount
  useEffect(() => {
    const checkExistingData = async () => {
      try {
        // Check multiple sources for existing data
        const [
          totalPointsStr,
          userStatsStr,
          fivefoldStatsStr,
          todosStr,
          workoutsStr,
          savedVersesStr,
          prayersStr,
          prayersStr2,
        ] = await Promise.all([
          AsyncStorage.getItem('total_points'),
          AsyncStorage.getItem('fivefold_userStats'),
          AsyncStorage.getItem('userStats'),
          AsyncStorage.getItem('fivefold_todos'),
          AsyncStorage.getItem('@scheduled_workouts'),
          AsyncStorage.getItem('fivefold_savedBibleVerses'),
          AsyncStorage.getItem('fivefold_simplePrayers'),
          AsyncStorage.getItem('simplePrayers'),
        ]);
        
        let totalPoints = 0;
        let todosCount = 0;
        let workoutsCount = 0;
        let savedVersesCount = 0;
        let prayersCompleted = 0;
        let quizzesCompleted = 0;
        let prayersCount = 0;
        
        // Parse points
        if (totalPointsStr) {
          totalPoints = Math.max(totalPoints, parseInt(totalPointsStr, 10) || 0);
        }
        if (userStatsStr) {
          const stats = JSON.parse(userStatsStr);
          totalPoints = Math.max(totalPoints, stats.totalPoints || stats.points || 0);
          prayersCompleted = stats.prayersCompleted || 0;
          quizzesCompleted = stats.quizzesCompleted || 0;
        }
        if (fivefoldStatsStr) {
          const stats = JSON.parse(fivefoldStatsStr);
          totalPoints = Math.max(totalPoints, stats.totalPoints || stats.points || 0);
          prayersCompleted = Math.max(prayersCompleted, stats.prayersCompleted || 0);
          quizzesCompleted = Math.max(quizzesCompleted, stats.quizzesCompleted || 0);
        }
        
        // Parse todos
        if (todosStr) {
          const todos = JSON.parse(todosStr);
          todosCount = Array.isArray(todos) ? todos.length : 0;
        }
        
        // Parse workouts
        if (workoutsStr) {
          const workouts = JSON.parse(workoutsStr);
          workoutsCount = Array.isArray(workouts) ? workouts.length : 0;
        }
        
        // Parse saved verses
        if (savedVersesStr) {
          const verses = JSON.parse(savedVersesStr);
          savedVersesCount = Array.isArray(verses) ? verses.length : 0;
        }
        
        // Parse prayers (simplePrayers - the user's custom prayers on Bible tab)
        if (prayersStr) {
          const prayers = JSON.parse(prayersStr);
          prayersCount = Array.isArray(prayers) ? prayers.length : 0;
        } else if (prayersStr2) {
          const prayers = JSON.parse(prayersStr2);
          prayersCount = Array.isArray(prayers) ? prayers.length : 0;
        }
        
        // Determine if there's significant data worth migrating
        const hasData = totalPoints > 0 || todosCount > 0 || workoutsCount > 0 || savedVersesCount > 0 || prayersCount > 0;
        
        if (hasData) {
          setHasExistingData(true);
          setExistingDataSummary({
            totalPoints,
            todosCount,
            workoutsCount,
            savedVersesCount,
            prayersCompleted,
            quizzesCompleted,
            prayersCount,
          });
          console.log('[Migration] Found existing data:', { totalPoints, todosCount, workoutsCount, savedVersesCount, prayersCount });
        } else {
          console.log('[Migration] No existing data found');
        }
      } catch (error) {
        console.error('[Migration] Error checking for existing data:', error);
      } finally {
        setCheckingData(false);
      }
    };
    
    checkExistingData();
  }, []);

  // Screen order - include migration screen only if there's existing data
  const screens = hasExistingData ? [
    'migrate',
    'splash',
    'welcome',
    'country',
    'language',
    'painPoint',
    'features',
    'featuresTasks',
    'featuresGym',
    'featuresHub',
    'bible',
    'weight',
    'photo',
    'theme',
    'notifications',
    'howFound',
    'gift',
    'complete'
  ] : [
    'splash',
    'welcome',
    'country',
    'language',
    'painPoint',
    'features',
    'featuresTasks',
    'featuresGym',
    'featuresHub',
    'bible',
    'weight',
    'photo',
    'theme',
    'notifications',
    'howFound',
    'gift',
    'complete'
  ];

  const totalScreens = screens.length;
  const progress = (currentScreen + 1) / totalScreens;

  useEffect(() => {
    // Only animate on screen changes (not initial render)
    if (currentScreen > 0) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentScreen]);

  const handleNext = async () => {
    hapticFeedback.selection();
    
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      // Complete onboarding - save all data
      await finishOnboarding();
    }
  };

  // Handle data migration - uploads all local data to the new account
  const handleMigrateData = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be signed in to migrate data.');
      return;
    }
    
    setIsMigrating(true);
    hapticFeedback.selection();
    
    try {
      // Import sync functions
      const { 
        syncUserStatsToCloud, 
        syncSavedVersesToCloud, 
        syncJournalNotesToCloud,
        syncPrayersToCloud,
        syncThemePreferencesToCloud,
        syncAllHistoryToCloud,
      } = await import('../services/userSyncService');
      
      // Upload all local data to the new account
      console.log('[Migration] Starting data migration for user:', user.uid);
      
      await syncUserStatsToCloud(user.uid);
      await syncSavedVersesToCloud(user.uid);
      await syncJournalNotesToCloud(user.uid);
      await syncPrayersToCloud(user.uid);
      await syncThemePreferencesToCloud(user.uid);
      await syncAllHistoryToCloud(user.uid);
      
      console.log('[Migration] Data migration completed successfully');
      
      hapticFeedback.success();
      Alert.alert(
        'Data Imported!',
        `Your existing data has been imported to your new account:\n\n` +
        `${existingDataSummary?.totalPoints || 0} points\n` +
        `${existingDataSummary?.prayersCount || 0} prayers\n` +
        `${existingDataSummary?.todosCount || 0} tasks\n` +
        `${existingDataSummary?.workoutsCount || 0} workouts\n` +
        `${existingDataSummary?.savedVersesCount || 0} saved verses`,
        [{ text: 'Continue', onPress: () => setCurrentScreen(currentScreen + 1) }]
      );
    } catch (error) {
      console.error('[Migration] Error migrating data:', error);
      Alert.alert(
        'Migration Error',
        'There was an issue importing your data. You can try again later from Settings.',
        [{ text: 'Continue Anyway', onPress: () => setCurrentScreen(currentScreen + 1) }]
      );
    } finally {
      setIsMigrating(false);
    }
  };

  // Skip migration - start fresh
  const handleSkipMigration = async () => {
    hapticFeedback.selection();
    
    Alert.alert(
      'Start Fresh?',
      'Your existing local data will not be imported to this account. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Fresh', 
          style: 'destructive',
          onPress: async () => {
            // Clear local data so it doesn't get accidentally synced later
            try {
              await AsyncStorage.multiRemove([
                'total_points',
                'userStats',
                'fivefold_userStats',
                'fivefold_todos',
                'completedTodos',
                '@scheduled_workouts',
                'fivefold_savedBibleVerses',
                'journalNotes',
                'prayerHistory',
                'workoutHistory',
                'quizHistory',
                'simplePrayers',
                'fivefold_simplePrayers',
              ]);
              console.log('[Migration] Cleared local data for fresh start');
            } catch (error) {
              console.error('[Migration] Error clearing local data:', error);
            }
            setCurrentScreen(currentScreen + 1);
          }
        }
      ]
    );
  };

  const finishOnboarding = async () => {
    // Build the list of setup steps based on what the user configured
    const steps = [];
    
    steps.push({ id: 'profile', label: `Setting up your profile${userName ? `, ${userName.trim()}` : ''}...`, icon: 'person', done: false });
    
    if (profileImage) {
      steps.push({ id: 'photo', label: 'Uploading your profile photo...', icon: 'photo-camera', done: false });
    }
    
    if (selectedCountry) {
      steps.push({ id: 'country', label: `Setting location to ${selectedCountry.flag || ''} ${selectedCountry.name}...`, icon: 'public', done: false });
    }
    
    steps.push({ id: 'bible', label: `Setting Bible to ${selectedBibleVersion?.toUpperCase() || 'NIV'}...`, icon: 'menu-book', done: false });
    
    if (selectedLanguage && selectedLanguage !== 'en') {
      steps.push({ id: 'language', label: 'Applying language preferences...', icon: 'translate', done: false });
    }
    
    steps.push({ id: 'units', label: `Setting weight to ${weightUnit === 'kg' ? 'kilograms (kg)' : 'pounds (lbs)'}...`, icon: 'fitness-center', done: false });

    const themeName = availableThemes?.find(t => t.id === selectedTheme)?.name || selectedTheme;
    steps.push({ id: 'theme', label: `Applying ${themeName} theme...`, icon: 'palette', done: false });
    
    if (notificationsEnabled) {
      steps.push({ id: 'notifications', label: 'Enabling notifications...', icon: 'notifications-active', done: false });
    }
    
    steps.push({ id: 'sync', label: 'Syncing to the cloud...', icon: 'cloud-upload', done: false });
    steps.push({ id: 'finish', label: 'Finishing touches...', icon: 'auto-awesome', done: false });

    setSetupSteps(steps);
    setCurrentSetupStep(-1);
    setShowSetupScreen(true);

    // Now run each step with a visual delay
    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentSetupStep(i);
        hapticFeedback.selection();

        const step = steps[i];
        
        // Minimum visual delay so users can see what's happening
        const minDelay = new Promise(resolve => setTimeout(resolve, 700));

        if (step.id === 'profile') {
          const profileData = {
            name: userName.trim() || 'Friend',
            profilePicture: profileImage || null,
            country: selectedCountry?.name || null,
            countryCode: selectedCountry?.code || null,
            countryFlag: selectedCountry?.flag || null,
            theme: selectedTheme,
            mode: selectedMode,
            bibleVersion: selectedBibleVersion,
            weightUnit: weightUnit,
            language: selectedLanguage,
            joinedDate: new Date().toISOString(),
          };
          await Promise.all([
            AsyncStorage.setItem('userProfile', JSON.stringify(profileData)),
            minDelay,
          ]);
        } else if (step.id === 'photo') {
          let uploadedUrl = null;
          if (profileImage && user?.uid) {
            try {
              uploadedUrl = await uploadProfilePicture(user.uid, profileImage);
              await persistProfileImage(profileImage);
            } catch (e) {
              console.warn('[Setup] Photo upload failed:', e);
            }
          }
          await minDelay;
          // Store for later sync step
          step._uploadedUrl = uploadedUrl;
        } else if (step.id === 'country') {
          // Country saved as part of profile, just visual
          await minDelay;
        } else if (step.id === 'bible') {
          await Promise.all([
            AsyncStorage.setItem('selectedBibleVersion', selectedBibleVersion),
            minDelay,
          ]);
        } else if (step.id === 'language') {
          await Promise.all([
            AsyncStorage.setItem('selectedLanguage', selectedLanguage),
            minDelay,
          ]);
        } else if (step.id === 'units') {
          await Promise.all([
            AsyncStorage.setItem('weightUnit', weightUnit),
            minDelay,
          ]);
        } else if (step.id === 'theme') {
          await Promise.all([
            changeTheme(selectedTheme),
            minDelay,
          ]);
          if (selectedMode === 'dark' && !isDark) await toggleDarkMode();
          if (selectedMode === 'light' && isDark) await toggleDarkMode();
        } else if (step.id === 'notifications') {
          // Notifications already requested during onboarding
          await minDelay;
        } else if (step.id === 'sync') {
          // Sync everything to Firebase
          if (user?.uid) {
            try {
              const uploadedPhotoUrl = steps.find(s => s.id === 'photo')?._uploadedUrl;
              const userRef = doc(db, 'users', user.uid);
              await Promise.all([
                updateDoc(userRef, {
                  displayName: userName.trim() || 'Friend',
                  profilePicture: uploadedPhotoUrl || profileImage || null,
                  country: selectedCountry?.name || null,
                  countryCode: selectedCountry?.code || null,
                  countryFlag: selectedCountry?.flag || null,
                  theme: selectedTheme,
                  mode: selectedMode,
                  bibleVersion: selectedBibleVersion,
                  weightUnit: weightUnit,
                  language: selectedLanguage,
                  onboardingCompleted: true,
                  onboardingCompletedAt: new Date().toISOString(),
                  ...(selectedAttribution ? { attribution: selectedAttribution } : {}),
                  ...(selectedPainPoint ? { painPoint: selectedPainPoint } : {}),
                }),
                minDelay,
              ]);

              // Update AuthContext cache
              const cacheStr = await AsyncStorage.getItem('@biblely_user_cache');
              const cached = cacheStr ? JSON.parse(cacheStr) : {};
              await AsyncStorage.setItem('@biblely_user_cache', JSON.stringify({
                ...cached,
                displayName: userName.trim() || 'Friend',
                profilePicture: uploadedPhotoUrl || profileImage || cached.profilePicture || null,
                country: selectedCountry?.name || null,
                countryCode: selectedCountry?.code || null,
                countryFlag: selectedCountry?.flag || null,
              }));
            } catch (syncError) {
              console.warn('[Setup] Firebase sync failed:', syncError);
              await minDelay;
            }
          } else {
            await minDelay;
          }
        } else if (step.id === 'finish') {
          // Save remaining individual settings
          if (selectedPainPoint) {
            await AsyncStorage.setItem('userPainPoint', selectedPainPoint);
          }
          if (selectedAttribution) {
            await AsyncStorage.setItem('userAttribution', selectedAttribution);
          }
          await Promise.all([
            AsyncStorage.setItem('onboardingCompleted', 'true'),
            minDelay,
          ]);
        }

        // Mark step as done
        setSetupSteps(prev => prev.map((s, idx) => idx === i ? { ...s, done: true } : s));
      }

      // All done - brief pause then complete
      hapticFeedback.success();
      await new Promise(resolve => setTimeout(resolve, 800));
      onComplete();
    } catch (error) {
      console.error('Failed during setup:', error);
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      hapticFeedback.success();
      onComplete();
    }
  };

  const handleSkip = async () => {
    hapticFeedback.selection();
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    await AsyncStorage.setItem('userProfile', JSON.stringify({
      name: 'Friend',
      profilePicture: null,
      joinedDate: new Date().toISOString(),
    }));
    onComplete();
  };

  const handleNotificationToggle = async (value) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } else {
      setNotificationsEnabled(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const tempUri = result.assets[0].uri;
      const permanentUri = await persistProfileImage(tempUri);
      setProfileImage(permanentUri);
    }
  };

  // Gift hold state
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const giftShakeAnim = useRef(new Animated.Value(0)).current;
  
  const startGiftHold = () => {
    if (giftOpened) return;
    
    // Clear any existing interval first
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    
    setIsHolding(true);
    setHoldProgress(0);
    giftScaleAnim.setValue(1);
    
    // Smooth scale animation over 5 seconds (no jumpy setValue)
    Animated.timing(giftScaleAnim, {
      toValue: 1.5,
      duration: 5000,
      useNativeDriver: true,
    }).start();
    
    // Gentle continuous wobble (smooth, not shaky)
    const wobble = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(giftShakeAnim, { toValue: 4, duration: 120, useNativeDriver: true }),
          Animated.timing(giftShakeAnim, { toValue: -4, duration: 120, useNativeDriver: true }),
        ])
      ).start();
    };
    wobble();
    
    // Progress timer (5 seconds total) - update less frequently to avoid flicker
    let progress = 0;
    holdIntervalRef.current = setInterval(() => {
      progress += 5; // Increment by 5 = 4 seconds total (20 intervals × 200ms)
      setHoldProgress(Math.min(progress, 100));
      
      // Haptic feedback at 25%, 50%, 75%
      if (progress === 25 || progress === 50 || progress === 75) {
        hapticFeedback.light();
      }
      
      // Complete at 100
      if (progress >= 100) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        giftShakeAnim.stopAnimation();
        giftShakeAnim.setValue(0);
        hapticFeedback.success();
        
        // Celebration pop
        Animated.sequence([
          Animated.timing(giftScaleAnim, {
            toValue: 1.8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(giftScaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setGiftOpened(true);
          setIsHolding(false);
        });
      }
    }, 200); // 200ms intervals (smoother, fewer re-renders)
  };
  
  const endGiftHold = () => {
    if (giftOpened) return;
    
    // Always clear the interval immediately
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    
    // Stop all animations and reset
    giftScaleAnim.stopAnimation();
    giftShakeAnim.stopAnimation();
    setIsHolding(false);
    setHoldProgress(0);
    giftScaleAnim.setValue(1);
    giftShakeAnim.setValue(0);
  };

  const handlePaywallReveal = () => {
    hapticFeedback.success();
    setShowFreeReveal(true);
    Animated.parallel([
      Animated.timing(priceStrikeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(freeRevealAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Progress Bar Component
  const ProgressBar = ({ screenTheme }) => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBg, { backgroundColor: screenTheme.accent + '30' }]}>
        <Animated.View 
          style={[
            styles.progressFill, 
            { 
              backgroundColor: screenTheme.accent,
              width: `${progress * 100}%`,
            }
          ]} 
        />
      </View>
    </View>
  );

  // ============================================
  // SCREEN: Splash
  // ============================================
  const SplashScreen = () => {
    const screenTheme = SCREEN_THEMES.splash;
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <View style={styles.content}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.splashLogo}
            resizeMode="contain"
          />
          <Text style={[styles.splashTitle, { color: '#333' }]}>Biblely</Text>
        </View>
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>Get Started</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Welcome (Meet the mascot)
  // ============================================
  const WelcomeScreen = () => {
    const screenTheme = SCREEN_THEMES.welcome;
    
    const highlights = [
      { icon: 'menu-book', text: '44 Bible translations' },
      { icon: 'chat', text: 'Smart Bible companion' },
      { icon: 'task-alt', text: 'Smart task system' },
      { icon: 'fitness-center', text: 'Gym & workouts' },
    ];
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { justifyContent: 'center' }]}
          showsVerticalScrollIndicator={false}
        >
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.mascotImage}
            resizeMode="contain"
          />
          
          <Text style={[styles.welcomeTitle, { color: '#333' }]}>
            Hey {userName}, I'm Biblely!
          </Text>
          
          <Text style={[styles.welcomeSubtitle, { color: '#666' }]}>
            Your all-in-one companion for Scripture, prayer, habits, and fitness.
          </Text>
          
          {/* Quick feature highlights */}
          <View style={styles.welcomeHighlights}>
            {highlights.map((item, index) => (
              <View key={index} style={styles.welcomeHighlightItem}>
                <MaterialIcons name={item.icon} size={20} color={screenTheme.accent} />
                <Text style={styles.welcomeHighlightText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>Let's Go</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Language Selection
  // ============================================
  const LanguageScreen = () => {
    const screenTheme = SCREEN_THEMES.language;
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.featureHeaderIcon}>
            <Text style={{ fontSize: 50 }}>🌐</Text>
          </View>
          
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            Choose your language, {userName}
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            More languages coming soon!
          </Text>
          
          <View style={{ marginTop: 20 }}>
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.id;
              const isAvailable = lang.available;
              
              return (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFF',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 10,
                      borderWidth: 2,
                      borderColor: isSelected ? screenTheme.accent : 'transparent',
                      opacity: isAvailable ? 1 : 0.5,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                    },
                  ]}
                  onPress={() => {
                    if (isAvailable) {
                      hapticFeedback.selection();
                      setSelectedLanguage(lang.id);
                    } else {
                      hapticFeedback.warning();
                    }
                  }}
                  disabled={!isAvailable}
                  activeOpacity={isAvailable ? 0.7 : 1}
                >
                  <Text style={{ fontSize: 28, marginRight: 14 }}>{lang.flag}</Text>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      fontSize: 17, 
                      fontWeight: '600', 
                      color: isAvailable ? '#333' : '#999',
                      marginBottom: 2,
                    }}>
                      {lang.name}
                    </Text>
                    <Text style={{ 
                      fontSize: 14, 
                      color: isAvailable ? '#666' : '#BBB',
                    }}>
                      {lang.nativeName}
                    </Text>
                  </View>
                  
                  {isSelected && isAvailable && (
                    <View style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: screenTheme.accent,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <MaterialIcons name="check" size={18} color="#FFF" />
                    </View>
                  )}
                  
                  {!isAvailable && (
                    <View style={{
                      backgroundColor: '#F5F5F5',
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}>
                      <Text style={{ fontSize: 11, color: '#999', fontWeight: '600' }}>
                        COMING SOON
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Pain Point Selection
  // ============================================
  const PainPointScreen = () => {
    const screenTheme = SCREEN_THEMES.painPoint;
    const [hasScrolled, setHasScrolled] = useState(false);
    
    const handleScroll = (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY > 20 && !hasScrolled) {
        setHasScrolled(true);
      }
    };
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            Hey {userName}! What's on your mind?
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            No judgment here - pick what feels right and I'll help from there
          </Text>
          
          <View style={styles.painPointList}>
            {PAIN_POINTS.map((point) => (
              <TouchableOpacity
                key={point.id}
                style={[
                  styles.painPointCard,
                  selectedPainPoint === point.id && styles.painPointCardSelected,
                ]}
                onPress={() => {
                  hapticFeedback.selection();
                  setSelectedPainPoint(point.id);
                }}
              >
                <View style={[styles.painPointIcon, { backgroundColor: point.iconBg }]}>
                  <Text style={styles.painPointEmoji}>{point.icon}</Text>
                </View>
                <View style={styles.painPointText}>
                  <Text style={[
                    styles.painPointTitle,
                    selectedPainPoint === point.id && styles.painPointTitleSelected,
                  ]}>
                    {point.title}
                  </Text>
                  <Text style={styles.painPointSubtitle}>{point.subtitle}</Text>
                </View>
                {selectedPainPoint === point.id && (
                  <View style={styles.checkCircle}>
                    <MaterialIcons name="check" size={16} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        {/* Scroll indicator - hidden once user scrolls */}
        {!hasScrolled && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>Scroll for more</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#999" />
          </View>
        )}
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>{selectedPainPoint ? 'Next' : 'Skip'}</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Features Preview
  // ============================================
  const FeaturesScreen = () => {
    const screenTheme = SCREEN_THEMES.features;
    const [hasScrolledFeatures, setHasScrolledFeatures] = useState(false);
    
    const handleFeaturesScroll = (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY > 20 && !hasScrolledFeatures) {
        setHasScrolledFeatures(true);
      }
    };
    
    const features = [
      { 
        icon: '🤖', 
        title: 'Smart Bible Companion', 
        desc: 'Got questions at 2am? Ask anything and get answers rooted in Scripture', 
        color: '#26A69A',
        badge: 'Unique'
      },
      { 
        icon: '📖', 
        title: '44 Bible Translations', 
        desc: 'Compare NIV, ESV, KJV and 41 more - see the original meaning from every angle', 
        color: '#42A5F5',
        badge: null
      },
      { 
        icon: '🎧', 
        title: 'Audio Bible Stories', 
        desc: 'Listen to David & Goliath, Samson, and more - perfect for commutes', 
        color: '#9C27B0',
        badge: null
      },
      { 
        icon: '🧠', 
        title: 'Bible Quizzes', 
        desc: 'Actually remember what you read - fun quizzes that make Scripture stick', 
        color: '#FF9800',
        badge: null
      },
      { 
        icon: '📚', 
        title: 'Thematic Guides', 
        desc: 'Struggling with anxiety, grief, or doubt? Curated verses for 50+ life moments', 
        color: '#E91E63',
        badge: null
      },
    ];
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleFeaturesScroll}
          scrollEventThrottle={16}
        >
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            {userName}, it's more than just a Bible app
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            Everything you need for spiritual growth - in one beautiful place
          </Text>
          
          <View style={styles.featureCards}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
                  <Text style={styles.featureEmoji}>{feature.icon}</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <View style={styles.featureTitleRow}>
                    <Text style={[styles.featureTitle, { color: feature.color }]}>{feature.title}</Text>
                    {feature.badge && (
                      <View style={[styles.featureBadge, { backgroundColor: feature.color }]}>
                        <Text style={styles.featureBadgeText}>{feature.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          
        </ScrollView>
        
        {/* Scroll indicator */}
        {!hasScrolledFeatures && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>Scroll for more</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#999" />
          </View>
        )}
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>And there's more...</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Features Tasks
  // ============================================
  const FeaturesTasksScreen = () => {
    const screenTheme = SCREEN_THEMES.featuresTasks;
    const [hasScrolledTasks, setHasScrolledTasks] = useState(false);
    
    const handleTasksScroll = (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY > 20 && !hasScrolledTasks) {
        setHasScrolledTasks(true);
      }
    };
    
    const features = [
      { 
        icon: '🤖', 
        title: 'Smart Scoring', 
        desc: 'Each task is analyzed and assigned points based on difficulty - harder tasks = more points!', 
        color: '#2E7D32',
      },
      { 
        icon: '🎯', 
        title: '3-Tier Point System', 
        desc: 'Easy tasks (500-800 pts), Medium (800-2000 pts), Hard tasks (2000-4000 pts). Earn big for big efforts!', 
        color: '#FF9800',
      },
      { 
        icon: '🔥', 
        title: 'Daily Streaks', 
        desc: 'Complete tasks daily to build your streak. Watch the fire grow - don\'t break the chain!', 
        color: '#F44336',
      },
      { 
        icon: '📊', 
        title: 'Progress Dashboard', 
        desc: 'See your daily points, weekly totals, and track your productivity over time', 
        color: '#1976D2',
      },
      { 
        icon: '🏆', 
        title: 'Achievements', 
        desc: 'Unlock milestones as you grow - first 100 tasks, 30-day streak, and more!', 
        color: '#FFC107',
      },
    ];
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleTasksScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.featureHeaderIcon}>
            <Text style={{ fontSize: 50 }}>✅</Text>
          </View>
          
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            Tasks that feel rewarding
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            Not your boring to-do list - smart scoring makes productivity actually satisfying
          </Text>
          
          <View style={styles.featureCards}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
                  <Text style={styles.featureEmoji}>{feature.icon}</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={[styles.featureTitle, { color: feature.color }]}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          
          {/* Points example */}
          <View style={[styles.exampleCard, { backgroundColor: screenTheme.accent + '15', borderColor: screenTheme.accent }]}>
            <Text style={[styles.exampleTitle, { color: screenTheme.accent }]}>Example Tasks</Text>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleTask}>"Drink water"</Text>
              <Text style={[styles.examplePoints, { color: '#4CAF50' }]}>+500 pts</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleTask}>"Study for 1 hour"</Text>
              <Text style={[styles.examplePoints, { color: '#FF9800' }]}>+1,200 pts</Text>
            </View>
            <View style={styles.exampleRow}>
              <Text style={styles.exampleTask}>"Complete project report"</Text>
              <Text style={[styles.examplePoints, { color: '#F44336' }]}>+3,500 pts</Text>
            </View>
          </View>
        </ScrollView>
        
        {/* Scroll indicator */}
        {!hasScrolledTasks && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>Scroll for more</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#999" />
          </View>
        )}
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>And there's gym too...</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Features Gym
  // ============================================
  const FeaturesGymScreen = () => {
    const screenTheme = SCREEN_THEMES.featuresGym;
    const [hasScrolledGym, setHasScrolledGym] = useState(false);
    
    const handleGymScroll = (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY > 20 && !hasScrolledGym) {
        setHasScrolledGym(true);
      }
    };
    
    const features = [
      { 
        icon: '📋', 
        title: 'Workout Templates', 
        desc: 'Pre-built workout plans or create your own. Start training in seconds!', 
        color: '#C62828',
      },
      { 
        icon: '💪', 
        title: 'Exercise Library', 
        desc: 'Hundreds of exercises with proper form guidance - never guess again', 
        color: '#E65100',
      },
      { 
        icon: '⏱️', 
        title: 'Smart Rest Timer', 
        desc: 'Built-in rest timer between sets - stay focused and maximize gains', 
        color: '#1565C0',
      },
      { 
        icon: '📈', 
        title: 'Progress Tracking', 
        desc: 'See your weights, reps, and personal records over time. Watch yourself grow!', 
        color: '#2E7D32',
      },
      { 
        icon: '📸', 
        title: 'Workout Photos', 
        desc: 'Snap progress photos and attach them to workouts - see your transformation', 
        color: '#7B1FA2',
      },
      { 
        icon: '📅', 
        title: 'Workout Calendar', 
        desc: 'Schedule workouts and see your training history at a glance', 
        color: '#00838F',
      },
    ];
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleGymScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.featureHeaderIcon}>
            <Text style={{ fontSize: 50 }}>💪</Text>
          </View>
          
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            Your pocket gym partner
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            Track every rep, set, and PR - strengthen body and spirit together
          </Text>
          
          <View style={styles.featureCards}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
                  <Text style={styles.featureEmoji}>{feature.icon}</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={[styles.featureTitle, { color: feature.color }]}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          
          {/* Motivation callout */}
          <View style={[styles.exampleCard, { backgroundColor: screenTheme.accent + '10', borderColor: screenTheme.accent }]}>
            <Text style={[styles.exampleTitle, { color: screenTheme.accent }]}>Body & Soul</Text>
            <Text style={styles.motivationText}>
              "Do you not know that your bodies are temples of the Holy Spirit?"
            </Text>
            <Text style={styles.motivationRef}>— 1 Corinthians 6:19</Text>
          </View>
        </ScrollView>
        
        {/* Scroll indicator */}
        {!hasScrolledGym && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>Scroll for more</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#999" />
          </View>
        )}
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Features Hub (Social Community)
  // ============================================
  const FeaturesHubScreen = () => {
    const screenTheme = SCREEN_THEMES.featuresHub;
    const [hasScrolledHub, setHasScrolledHub] = useState(false);
    
    const handleHubScroll = (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY > 20 && !hasScrolledHub) {
        setHasScrolledHub(true);
      }
    };
    
    const features = [
      { 
        icon: '🌍', 
        title: 'Global Community', 
        desc: 'Share thoughts, encouragements, and prayers with believers worldwide', 
        color: '#5C6BC0',
      },
      { 
        icon: '💬', 
        title: 'Daily Sharing', 
        desc: 'Post what\'s on your heart - get one token daily to share something meaningful', 
        color: '#26A69A',
      },
      { 
        icon: '👀', 
        title: 'See What Others Share', 
        desc: 'Scroll through uplifting posts from the community - get inspired every day', 
        color: '#42A5F5',
      },
      { 
        icon: '🤝', 
        title: 'Connect with Friends', 
        desc: 'Add friends, send messages, and support each other on your faith journey', 
        color: '#FF7043',
      },
      { 
        icon: '🏆', 
        title: 'Friendly Challenges', 
        desc: 'Challenge friends to Bible quizzes - compete and grow together!', 
        color: '#FFB300',
      },
      { 
        icon: '📊', 
        title: 'Leaderboards', 
        desc: 'See how you rank among friends and globally - stay motivated!', 
        color: '#AB47BC',
      },
    ];
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleHubScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.featureHeaderIcon}>
            <Text style={{ fontSize: 50 }}>🌍</Text>
          </View>
          
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            You're not alone on this journey
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            The Hub connects you with a global community of believers
          </Text>
          
          <View style={styles.featureCards}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
                  <Text style={styles.featureEmoji}>{feature.icon}</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={[styles.featureTitle, { color: feature.color }]}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          
          {/* Community callout */}
          <View style={[styles.exampleCard, { backgroundColor: screenTheme.accent + '10', borderColor: screenTheme.accent }]}>
            <Text style={[styles.exampleTitle, { color: screenTheme.accent }]}>Together in Faith</Text>
            <Text style={styles.motivationText}>
              "For where two or three gather in my name, there am I with them."
            </Text>
            <Text style={styles.motivationRef}>— Matthew 18:20</Text>
          </View>
        </ScrollView>
        
        {/* Scroll indicator */}
        {!hasScrolledHub && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>Scroll for more</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#999" />
          </View>
        )}
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Bible Version Selection
  // ============================================
  const BibleScreen = () => {
    const screenTheme = SCREEN_THEMES.bible;
    const [hasScrolledBible, setHasScrolledBible] = useState(false);
    
    const handleBibleScroll = (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY > 20 && !hasScrolledBible) {
        setHasScrolledBible(true);
      }
    };
    
    // Popular versions to show first
    const popularVersions = bibleVersions.filter((v) => 
      ['niv', 'esv', 'kjv', 'nlt', 'nasb', 'nkjv'].includes(v.id)
    );
    const otherVersions = bibleVersions.filter((v) => 
      !['niv', 'esv', 'kjv', 'nlt', 'nasb', 'nkjv'].includes(v.id) && v.isAvailable
    );
    const displayVersions = showAllVersions ? [...popularVersions, ...otherVersions] : popularVersions;
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleBibleScroll}
          scrollEventThrottle={16}
        >
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            {userName}, which Bible version do you prefer?
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            You can always change this later in settings
          </Text>
          
          <View style={styles.bibleVersionList}>
            {displayVersions.map((version) => {
              const isSelected = selectedBibleVersion === version.id;
              return (
                <TouchableOpacity
                  key={version.id}
                  style={[
                    styles.bibleVersionCard,
                    isSelected && [styles.bibleVersionCardSelected, { borderColor: screenTheme.accent }],
                  ]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setSelectedBibleVersion(version.id);
                  }}
                >
                  <View style={styles.bibleVersionInfo}>
                    <Text style={[styles.bibleVersionAbbr, isSelected && { color: screenTheme.accent }]}>
                      {version.abbreviation}
                    </Text>
                    <Text style={styles.bibleVersionName}>{version.name}</Text>
                    <Text style={styles.bibleVersionDesc}>{version.description}</Text>
                  </View>
                  {isSelected && (
                    <MaterialIcons name="check-circle" size={24} color={screenTheme.accent} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          {!showAllVersions && (
            <TouchableOpacity 
              onPress={() => setShowAllVersions(true)}
              style={styles.showMoreButton}
            >
              <Text style={[styles.showMoreText, { color: screenTheme.accent }]}>
                Show all 44 translations
              </Text>
              <MaterialIcons name="expand-more" size={20} color={screenTheme.accent} />
            </TouchableOpacity>
          )}
        </ScrollView>
        
        {/* Scroll indicator */}
        {!hasScrolledBible && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>Scroll for more</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#999" />
          </View>
        )}
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Weight Unit Selection
  // ============================================
  const WeightScreen = () => {
    const screenTheme = SCREEN_THEMES.weight;
    
    const units = [
      { id: 'kg', label: 'Kilograms (kg)', icon: '🌍', desc: 'Used in most countries' },
      { id: 'lb', label: 'Pounds (lb)', icon: '🇺🇸', desc: 'Used in USA & UK' },
    ];
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <View style={styles.weightScreenContent}>
          <View style={styles.weightTopSection}>
            <View style={styles.weightIconContainer}>
              <MaterialIcons name="fitness-center" size={48} color={screenTheme.accent} />
            </View>
            
            <Text style={[styles.screenTitle, { color: '#333' }]}>
              How do you measure weight?
            </Text>
            
            <Text style={[styles.screenSubtitle, { color: '#666' }]}>
              This helps us display your workout progress correctly
            </Text>
            
            <View style={styles.weightOptions}>
              {units.map((unit) => {
                const isSelected = weightUnit === unit.id;
                return (
                  <TouchableOpacity
                    key={unit.id}
                    style={[
                      styles.weightOption,
                      isSelected && [styles.weightOptionSelected, { borderColor: screenTheme.accent }],
                    ]}
                    onPress={() => {
                      hapticFeedback.selection();
                      setWeightUnit(unit.id);
                    }}
                  >
                    <Text style={styles.weightEmoji}>{unit.icon}</Text>
                    <Text style={[styles.weightLabel, isSelected && { color: screenTheme.accent, fontWeight: '700' }]}>
                      {unit.label}
                    </Text>
                    <Text style={styles.weightDesc}>{unit.desc}</Text>
                    {isSelected && (
                      <View style={[styles.weightCheck, { backgroundColor: screenTheme.accent }]}>
                        <MaterialIcons name="check" size={16} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Profile Photo
  // ============================================
  const PhotoScreen = () => {
    const screenTheme = SCREEN_THEMES.photo;
    
    const pickImage = async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        
        if (!result.canceled && result.assets && result.assets[0]) {
          setProfileImage(result.assets[0].uri);
          hapticFeedback.success();
        }
      } catch (error) {
        console.error('Image picker error:', error);
      }
    };
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <View style={styles.photoScreenContent}>
          <View style={styles.photoTopSection}>
            <Text style={[styles.screenTitle, { color: '#333' }]}>
              Add a profile photo, {userName}
            </Text>
            
            <Text style={[styles.screenSubtitle, { color: '#666' }]}>
              Make your profile feel more personal
            </Text>
            
            <TouchableOpacity 
              style={styles.photoPickerContainer}
              onPress={pickImage}
            >
              {profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.profileImagePreview}
                />
              ) : (
                <View style={[styles.photoPlaceholder, { borderColor: screenTheme.accent }]}>
                  <MaterialIcons name="add-a-photo" size={40} color={screenTheme.accent} />
                  <Text style={[styles.photoPlaceholderText, { color: screenTheme.accent }]}>
                    Tap to add photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {profileImage && (
              <TouchableOpacity 
                onPress={() => setProfileImage(null)}
                style={styles.removePhotoButton}
              >
                <Text style={styles.removePhotoText}>Remove photo</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.bottomMascot}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.smallMascot}
              resizeMode="contain"
            />
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>{profileImage ? 'Next' : 'Skip for now'}</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Theme Selection
  // ============================================
  const ThemeScreen = () => {
    const screenTheme = SCREEN_THEMES.theme;
    
    // Filter themes by mode
    const lightThemes = ['blush-bloom', 'eterna', 'sailormoon', 'biblely'];
    const darkThemes = ['cresvia', 'spiderman', 'jesusnlambs', 'classic'];
    
    const filteredThemes = availableThemes?.filter((t) => {
      if (selectedMode === 'light') return lightThemes.includes(t.id);
      return darkThemes.includes(t.id);
    }) || [];
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            Pick your vibe, {userName}
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            Choose a theme that feels right for you
          </Text>
          
          {/* Light/Dark Mode Toggle */}
          <View style={styles.modeToggleContainer}>
            {['light', 'dark'].map((mode) => {
              const isActive = selectedMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeToggleButton,
                    isActive && { backgroundColor: screenTheme.accent },
                  ]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setSelectedMode(mode);
                    // Set default theme for mode
                    setSelectedTheme(mode === 'light' ? 'blush-bloom' : 'cresvia');
                  }}
                >
                  <MaterialIcons 
                    name={mode === 'light' ? 'light-mode' : 'dark-mode'} 
                    size={20} 
                    color={isActive ? '#FFF' : '#666'} 
                  />
                  <Text style={[
                    styles.modeToggleText,
                    isActive && { color: '#FFF' },
                  ]}>
                    {mode === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Theme Grid */}
          <View style={styles.themeGrid}>
            {filteredThemes.map((t) => {
              const isSelected = selectedTheme === t.id;
              const themeColors = t.theme[selectedMode] || t.theme;
              const gradientColors = themeColors.gradient || [themeColors.primary, themeColors.primaryLight || themeColors.primary];
              
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.themeCard,
                    isSelected && { borderColor: screenTheme.accent, borderWidth: 3 },
                  ]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setSelectedTheme(t.id);
                  }}
                >
                  <View style={[styles.themePreview, { backgroundColor: gradientColors[0] }]}>
                    {isSelected && (
                      <View style={styles.themeCheckmark}>
                        <MaterialIcons name="check" size={16} color="#FFF" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.themeName, isSelected && { color: screenTheme.accent, fontWeight: '700' }]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Notifications Permission
  // ============================================
  const NotificationsScreen = () => {
    const screenTheme = SCREEN_THEMES.notifications;
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            {userName}, can I check in with you?
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            A little accountability goes a long way. I'll keep you motivated with friendly nudges.
          </Text>
          
          {/* Social proof banner */}
          <View style={[styles.socialProofBanner, { backgroundColor: screenTheme.accent + '20', borderColor: screenTheme.accent }]}>
            <Text style={[styles.socialProofNumber, { color: screenTheme.accent }]}>3x</Text>
            <Text style={[styles.socialProofText, { color: screenTheme.accent }]}>
              more likely to build lasting habits with notifications on
            </Text>
          </View>
          
          {/* Toggle card */}
          <View style={styles.notifToggleCard}>
            <View style={styles.notifToggleIcon}>
              <MaterialIcons name="notifications" size={28} color="#666" />
            </View>
            <View style={styles.notifToggleText}>
              <Text style={styles.notifToggleTitle}>Enable Notifications</Text>
              <Text style={styles.notifToggleSubtitle}>Tap to turn on</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#DDD', true: screenTheme.accent }}
              thumbColor="#FFF"
            />
          </View>
          
          {/* Benefits list */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="trending-up" size={20} color="#2E7D32" />
              </View>
              <Text style={styles.benefitText}>Daily verse reminders keep you grounded</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="emoji-events" size={20} color="#E65100" />
              </View>
              <Text style={styles.benefitText}>Celebrate streaks and stay motivated</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={[styles.benefitIcon, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="access-time" size={20} color="#1565C0" />
              </View>
              <Text style={styles.benefitText}>Prayer time reminders you can customize</Text>
            </View>
          </View>
          
          <Text style={styles.noSpamText}>
            No spam, ever. Just helpful reminders you can customize anytime.
          </Text>
        </ScrollView>
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>Next</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: How Did You Find Us
  // ============================================
  const HowFoundScreen = () => {
    const screenTheme = SCREEN_THEMES.howFound;
    const [hasScrolledHow, setHasScrolledHow] = useState(false);
    
    const handleHowScroll = (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY > 20 && !hasScrolledHow) {
        setHasScrolledHow(true);
      }
    };
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleHowScroll}
          scrollEventThrottle={16}
        >
          <Text style={[styles.screenTitle, { color: '#333' }]}>
            How did you find us?
          </Text>
          
          <Text style={[styles.screenSubtitle, { color: '#666' }]}>
            We'd love to know how you discovered Biblely!
          </Text>
          
          <View style={styles.attributionList}>
            {ATTRIBUTION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.attributionCard,
                  selectedAttribution === option.id && [styles.attributionCardSelected, { borderColor: screenTheme.accent }],
                ]}
                onPress={() => {
                  hapticFeedback.selection();
                  setSelectedAttribution(option.id);
                }}
              >
                <View style={[
                  styles.attributionIcon,
                  selectedAttribution === option.id && { backgroundColor: screenTheme.accent }
                ]}>
                  <Ionicons 
                    name={option.icon} 
                    size={22} 
                    color={selectedAttribution === option.id ? '#FFF' : '#666'} 
                  />
                </View>
                <Text style={[
                  styles.attributionText,
                  selectedAttribution === option.id && { color: screenTheme.accent, fontWeight: '600' }
                ]}>
                  {option.name}
                </Text>
                {selectedAttribution === option.id && (
                  <MaterialIcons name="check-circle" size={22} color={screenTheme.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        
        {/* Scroll indicator */}
        {!hasScrolledHow && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>Scroll for more</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#999" />
          </View>
        )}
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#333' }]}
        >
          <Text style={styles.mainButtonText}>{selectedAttribution ? 'Next' : 'Skip'}</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Gift Reveal
  // ============================================
  const GiftScreen = () => {
    const screenTheme = SCREEN_THEMES.gift;
    
    // Currency data by country code (symbol, approximate rate from USD)
    const currencyMap = {
      'US': { symbol: '$', rate: 1 }, 'WW': { symbol: '$', rate: 1 },
      'GB': { symbol: '£', rate: 0.79 }, 'EU': { symbol: '€', rate: 0.92 },
      'CA': { symbol: 'C$', rate: 1.36 }, 'AU': { symbol: 'A$', rate: 1.53 },
      'DE': { symbol: '€', rate: 0.92 }, 'FR': { symbol: '€', rate: 0.92 },
      'IT': { symbol: '€', rate: 0.92 }, 'ES': { symbol: '€', rate: 0.92 },
      'NL': { symbol: '€', rate: 0.92 }, 'BE': { symbol: '€', rate: 0.92 },
      'AT': { symbol: '€', rate: 0.92 }, 'PT': { symbol: '€', rate: 0.92 },
      'IE': { symbol: '€', rate: 0.92 }, 'FI': { symbol: '€', rate: 0.92 },
      'GR': { symbol: '€', rate: 0.92 }, 'SK': { symbol: '€', rate: 0.92 },
      'SI': { symbol: '€', rate: 0.92 }, 'EE': { symbol: '€', rate: 0.92 },
      'LV': { symbol: '€', rate: 0.92 }, 'LT': { symbol: '€', rate: 0.92 },
      'CY': { symbol: '€', rate: 0.92 }, 'MT': { symbol: '€', rate: 0.92 },
      'LU': { symbol: '€', rate: 0.92 }, 'HR': { symbol: '€', rate: 0.92 },
      'MX': { symbol: 'MX$', rate: 17.15 }, 'BR': { symbol: 'R$', rate: 4.97 },
      'AR': { symbol: 'AR$', rate: 870 }, 'CL': { symbol: 'CL$', rate: 940 },
      'CO': { symbol: 'COP$', rate: 3950 }, 'PE': { symbol: 'S/', rate: 3.72 },
      'IN': { symbol: '₹', rate: 83.1 }, 'PK': { symbol: 'Rs', rate: 278 },
      'BD': { symbol: '৳', rate: 110 }, 'LK': { symbol: 'Rs', rate: 312 },
      'NP': { symbol: 'Rs', rate: 133 },
      'CN': { symbol: '¥', rate: 7.24 }, 'JP': { symbol: '¥', rate: 149 },
      'KR': { symbol: '₩', rate: 1330 }, 'TW': { symbol: 'NT$', rate: 31.5 },
      'TH': { symbol: '฿', rate: 35.5 }, 'VN': { symbol: '₫', rate: 24500 },
      'MY': { symbol: 'RM', rate: 4.72 }, 'SG': { symbol: 'S$', rate: 1.34 },
      'PH': { symbol: '₱', rate: 56.2 }, 'ID': { symbol: 'Rp', rate: 15700 },
      'RU': { symbol: '₽', rate: 91.5 }, 'UA': { symbol: '₴', rate: 38.5 },
      'TR': { symbol: '₺', rate: 30.2 }, 'SA': { symbol: 'SAR', rate: 3.75 },
      'AE': { symbol: 'AED', rate: 3.67 }, 'QA': { symbol: 'QAR', rate: 3.64 },
      'KW': { symbol: 'KD', rate: 0.31 }, 'BH': { symbol: 'BD', rate: 0.38 },
      'OM': { symbol: 'OMR', rate: 0.38 }, 'JO': { symbol: 'JOD', rate: 0.71 },
      'EG': { symbol: 'E£', rate: 30.9 }, 'MA': { symbol: 'MAD', rate: 10.1 },
      'ZA': { symbol: 'R', rate: 18.6 }, 'NG': { symbol: '₦', rate: 1550 },
      'GH': { symbol: 'GH₵', rate: 12.5 }, 'KE': { symbol: 'KSh', rate: 153 },
      'TZ': { symbol: 'TSh', rate: 2520 }, 'UG': { symbol: 'USh', rate: 3790 },
      'ET': { symbol: 'Br', rate: 56.8 }, 'RW': { symbol: 'FRw', rate: 1270 },
      'CM': { symbol: 'FCFA', rate: 603 }, 'CI': { symbol: 'FCFA', rate: 603 },
      'SN': { symbol: 'FCFA', rate: 603 }, 'CD': { symbol: 'FC', rate: 2750 },
      'ZW': { symbol: 'ZWL', rate: 13500 }, 'BW': { symbol: 'P', rate: 13.6 },
      'MZ': { symbol: 'MT', rate: 63.5 }, 'AO': { symbol: 'Kz', rate: 830 },
      'SE': { symbol: 'kr', rate: 10.4 }, 'NO': { symbol: 'kr', rate: 10.5 },
      'DK': { symbol: 'kr', rate: 6.87 }, 'IS': { symbol: 'kr', rate: 137 },
      'PL': { symbol: 'zł', rate: 4.02 }, 'CZ': { symbol: 'Kč', rate: 22.8 },
      'HU': { symbol: 'Ft', rate: 358 }, 'RO': { symbol: 'lei', rate: 4.57 },
      'BG': { symbol: 'лв', rate: 1.8 }, 'RS': { symbol: 'din', rate: 108 },
      'CH': { symbol: 'CHF', rate: 0.88 },
      'IL': { symbol: '₪', rate: 3.67 }, 'NZ': { symbol: 'NZ$', rate: 1.64 },
      'JM': { symbol: 'J$', rate: 155 }, 'TT': { symbol: 'TT$', rate: 6.79 },
      'HK': { symbol: 'HK$', rate: 7.82 },
      'AM': { symbol: '֏', rate: 387 },
    };
    
    // Get currency for selected country
    const getCurrency = () => {
      const code = selectedCountry?.code || 'US';
      return currencyMap[code] || { symbol: '$', rate: 1 };
    };
    
    const formatPrice = (usdPrice) => {
      const { symbol, rate } = getCurrency();
      const converted = usdPrice * rate;
      // Format with appropriate decimals
      if (rate >= 100) {
        return `${symbol}${Math.round(converted).toLocaleString()}/mo`;
      } else if (rate >= 10) {
        return `${symbol}${converted.toFixed(1)}/mo`;
      } else {
        return `${symbol}${converted.toFixed(2)}/mo`;
      }
    };
    
    // Price breakdown in USD (base prices)
    const basePrices = [
      { feature: 'Smart Bible Companion', usd: 4.99 },
      { feature: '44 Bible Translations', usd: 3.99 },
      { feature: 'Audio Bible Stories', usd: 2.99 },
      { feature: 'Bible Quizzes & Games', usd: 1.99 },
      { feature: 'Smart Task Scoring', usd: 3.99 },
      { feature: 'Gym & Workout Tracker', usd: 4.99 },
      { feature: 'Thematic Study Guides', usd: 2.99 },
    ];
    
    const priceBreakdown = basePrices.map(item => ({
      feature: item.feature,
      price: formatPrice(item.usd),
    }));
    
    const totalUsd = basePrices.reduce((sum, item) => sum + item.usd, 0);
    const totalValue = formatPrice(totalUsd);
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        {!giftOpened ? (
          // Hold to reveal state
          <View style={styles.content}>
            <Text style={[styles.screenTitle, { color: '#333' }]}>
              {userName}, I got you something!
            </Text>
            
            <Text style={[styles.screenSubtitle, { color: '#666' }]}>
              A special welcome gift to start your journey
            </Text>
            
            <TouchableOpacity 
              onPressIn={startGiftHold}
              onPressOut={endGiftHold}
              activeOpacity={1}
              style={styles.giftContainer}
            >
              <Animated.View style={{ 
                transform: [
                  { scale: giftScaleAnim },
                  { translateX: giftShakeAnim }
                ] 
              }}>
                <View style={styles.giftBox}>
                  <Text style={styles.giftEmoji}>🎁</Text>
                </View>
              </Animated.View>
            </TouchableOpacity>
            
            {/* Hold instruction & progress */}
            <View style={styles.holdInstructionContainer}>
              {!isHolding ? (
                <Text style={styles.holdInstruction}>Hold to unwrap...</Text>
              ) : (
                <View style={styles.holdProgressContainer}>
                  <View style={styles.holdProgressBar}>
                    <View 
                      style={[
                        styles.holdProgressFill, 
                        { 
                          width: `${holdProgress}%`,
                          backgroundColor: screenTheme.accent,
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.holdProgressText}>
                    {holdProgress < 100 ? `${Math.ceil((100 - holdProgress) / 20)}s` : 'Opening...'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          // Revealed state - show the app is FREE
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.giftRevealScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.giftRevealEmoji}>🎉</Text>
            
            <Text style={[styles.screenTitle, { color: '#333', marginBottom: 8 }]}>
              It's all FREE!
            </Text>
            
            <Text style={[styles.screenSubtitle, { color: '#666', marginBottom: 24 }]}>
              Everything. Forever. No catch.
            </Text>
            
            {/* Value breakdown */}
            <View style={styles.priceBreakdownCard}>
              <Text style={styles.priceBreakdownTitle}>What you're getting:</Text>
              
              {priceBreakdown.map((item, index) => (
                <View key={index} style={styles.priceBreakdownRow}>
                  <View style={styles.priceBreakdownCheck}>
                    <MaterialIcons name="check" size={14} color="#4CAF50" />
                  </View>
                  <Text style={styles.priceBreakdownFeature}>{item.feature}</Text>
                  <Text style={styles.priceBreakdownPrice}>{item.price}</Text>
                </View>
              ))}
              
              <View style={styles.priceBreakdownDivider} />
              
              <View style={styles.priceBreakdownTotal}>
                <Text style={styles.priceBreakdownTotalLabel}>Total Value</Text>
                <Text style={styles.priceBreakdownTotalPrice}>{totalValue}</Text>
              </View>
            </View>
            
            {/* Your price */}
            <View style={styles.yourPriceCard}>
              <Text style={styles.yourPriceLabel}>Your price:</Text>
              <View style={styles.yourPriceRow}>
                <Text style={styles.yourPriceStrikethrough}>{totalValue}</Text>
                <Text style={styles.yourPriceFree}>{getCurrency().symbol}0</Text>
              </View>
              <Text style={styles.yourPriceForever}>Forever free. No ads. No trials.</Text>
            </View>
            
            {/* Why free? */}
            <View style={styles.whyFreeCard}>
              <Text style={styles.whyFreeTitle}>Why is this free?</Text>
              <Text style={styles.whyFreeText}>
                I believe everyone deserves access to God's word and tools for spiritual growth - 
                regardless of their financial situation. This app is my ministry to you.
              </Text>
            </View>
          </ScrollView>
        )}
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[
            styles.mainButton, 
            { backgroundColor: giftOpened ? '#4CAF50' : '#333' }
          ]}
          disabled={!giftOpened}
        >
          <Text style={styles.mainButtonText}>
            {giftOpened ? 'Start My Journey' : 'Hold the gift above'}
          </Text>
          {giftOpened && <MaterialIcons name="arrow-forward" size={20} color="#FFF" />}
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Paywall (with FREE reveal)
  // ============================================
  const PaywallScreen = () => {
    const screenTheme = SCREEN_THEMES.paywall;
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ProgressBar screenTheme={screenTheme} />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.paywallScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.paywallContent}>
            {/* Mascot */}
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.paywallMascot}
              resizeMode="contain"
            />
            
            <Text style={[styles.paywallTitle, { color: '#333' }]}>
              Ready to grow in faith?
            </Text>
            
            <Text style={[styles.paywallSubtitle, { color: '#666' }]}>
              Everything you need for your spiritual journey
            </Text>
            
            {/* Features list */}
            <View style={styles.paywallFeatures}>
              <Text style={styles.featuresHeader}>Here's what you'll unlock:</Text>
              
              {PREMIUM_FEATURES.map((feature, index) => (
                <View key={index} style={styles.paywallFeatureItem}>
                  <View style={[styles.featureCheck, { backgroundColor: '#4CAF50' }]}>
                    <MaterialIcons name="check" size={14} color="#FFF" />
                  </View>
                  <Text style={styles.paywallFeatureText}>{feature.text}</Text>
                </View>
              ))}
            </View>
            
            {/* Pricing section */}
            <View style={styles.pricingSection}>
              {!showFreeReveal ? (
                <>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Biblely Pro</Text>
                    <Text style={styles.priceAmount}>£3.99<Text style={styles.priceFrequency}>/month</Text></Text>
                  </View>
                  <Text style={styles.priceSubtext}>Cancel anytime. 7-day free trial included.</Text>
                  
                  <TouchableOpacity 
                    onPress={handlePaywallReveal}
                    style={[styles.subscribeButton, { backgroundColor: screenTheme.accent }]}
                  >
                    <Text style={styles.subscribeButtonText}>Start Free Trial</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={handlePaywallReveal}>
                    <Text style={styles.noThanksText}>Wait, I have a surprise for you...</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Animated.View style={[styles.freeReveal, { opacity: freeRevealAnim }]}>
                  <View style={styles.celebrationBanner}>
                    <Text style={styles.celebrationEmoji}>🎉</Text>
                    <Text style={styles.celebrationTitle}>SURPRISE!</Text>
                  </View>
                  
                  <View style={styles.strikethroughContainer}>
                    <Text style={styles.originalPrice}>£3.99/month</Text>
                    <View style={styles.strikethrough} />
                  </View>
                  
                  <Text style={styles.freePrice}>£0 - Completely FREE!</Text>
                  
                  <Text style={styles.freeExplanation}>
                    For a limited time, Biblely is 100% free.{'\n'}
                    No credit card. No trial. No tricks.{'\n'}
                    Just everything you need to grow in faith.
                  </Text>
                  
                  <View style={styles.freeFeaturesList}>
                    <View style={styles.freeFeatureItem}>
                      <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                      <Text style={styles.freeFeatureText}>All premium features included</Text>
                    </View>
                    <View style={styles.freeFeatureItem}>
                      <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                      <Text style={styles.freeFeatureText}>No payment required</Text>
                    </View>
                    <View style={styles.freeFeatureItem}>
                      <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                      <Text style={styles.freeFeatureText}>Full access forever</Text>
                    </View>
                  </View>
                </Animated.View>
              )}
            </View>
          </View>
        </ScrollView>
        
        {showFreeReveal && (
          <TouchableOpacity 
            onPress={handleNext}
            style={[styles.mainButton, { backgroundColor: '#4CAF50' }]}
          >
            <Text style={styles.mainButtonText}>Claim Free Access</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Complete
  // ============================================
  const CompleteScreen = () => {
    const screenTheme = SCREEN_THEMES.complete;
    
    const quickStats = [
      { icon: 'menu-book', label: '44 Bible translations' },
      { icon: 'fitness-center', label: 'Gym & workouts' },
      { icon: 'task-alt', label: 'Smart tasks & goals' },
      { icon: 'favorite', label: 'Prayer tracking' },
      { icon: 'restaurant', label: 'Nutrition tracker' },
      { icon: 'people', label: 'Community & friends' },
    ];
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: screenTheme.bg }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { justifyContent: 'center' }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.completeEmoji}>🎉</Text>
          
          <Text style={[styles.completeTitle, { color: '#333' }]}>
            You're All Set, {userName || 'Friend'}!
          </Text>
          
          <Text style={[styles.completeSubtitle, { color: '#666' }]}>
            Everything you need is ready and waiting
          </Text>
          
          {/* Quick reminder of what they have */}
          <View style={styles.completeStatsGrid}>
            {quickStats.map((stat, index) => (
              <View key={index} style={styles.completeStatItem}>
                <MaterialIcons name={stat.icon} size={24} color={screenTheme.accent} />
                <Text style={styles.completeStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.completeMascot}
            resizeMode="contain"
          />
          
          <Text style={styles.completeVerse}>
            "For I know the plans I have for you..."{'\n'}
            <Text style={styles.completeVerseRef}>— Jeremiah 29:11</Text>
          </Text>
        </ScrollView>
        
        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.mainButton, { backgroundColor: '#4CAF50' }]}
        >
          <Text style={styles.mainButtonText}>Start My Journey</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // ============================================
  // SCREEN: Setup Loading
  // ============================================
  const SetupScreen = () => {
    const stepAnims = useRef(setupSteps.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
      scale: new Animated.Value(0.8),
    }))).current;

    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const headerScale = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
      // Animate header in
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(headerScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      ]).start();

      // Pulse animation for active step
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }, []);

    useEffect(() => {
      if (currentSetupStep >= 0 && currentSetupStep < stepAnims.length) {
        const anim = stepAnims[currentSetupStep];
        Animated.parallel([
          Animated.timing(anim.opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(anim.translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
          Animated.spring(anim.scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
        ]).start();

        // Update progress bar
        Animated.timing(progressAnim, {
          toValue: (currentSetupStep + 1) / setupSteps.length,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    }, [currentSetupStep]);

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
          {/* Header */}
          <Animated.View style={{
            alignItems: 'center',
            marginBottom: 40,
            opacity: headerOpacity,
            transform: [{ scale: headerScale }],
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#4CAF50',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              shadowColor: '#4CAF50',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}>
              <MaterialIcons name="settings" size={36} color="#FFF" />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', marginBottom: 6 }}>
              Setting Up Your App
            </Text>
            <Text style={{ fontSize: 15, color: '#666', textAlign: 'center' }}>
              Just a moment, {userName || 'friend'}...
            </Text>
          </Animated.View>

          {/* Progress Bar */}
          <View style={{
            height: 6,
            backgroundColor: '#E0E0E0',
            borderRadius: 3,
            marginBottom: 32,
            overflow: 'hidden',
          }}>
            <Animated.View style={{
              height: '100%',
              backgroundColor: '#4CAF50',
              borderRadius: 3,
              width: progressWidth,
            }} />
          </View>

          {/* Steps List */}
          <View style={{ gap: 0 }}>
            {setupSteps.map((step, index) => {
              const anim = stepAnims[index];
              const isActive = index === currentSetupStep;
              const isDone = step.done;
              const isUpcoming = index > currentSetupStep;

              return (
                <Animated.View
                  key={step.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    marginBottom: 4,
                    borderRadius: 14,
                    backgroundColor: isActive ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
                    opacity: isUpcoming ? 0.2 : (isDone ? 1 : anim?.opacity),
                    transform: [
                      { translateY: isUpcoming ? 0 : (anim?.translateY || 0) },
                      { scale: isActive ? pulseAnim : 1 },
                    ],
                  }}
                >
                  {/* Icon */}
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDone ? '#4CAF50' : isActive ? '#4CAF50' : '#E0E0E0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}>
                    {isDone ? (
                      <MaterialIcons name="check" size={18} color="#FFF" />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <MaterialIcons name={step.icon} size={16} color="#999" />
                    )}
                  </View>

                  {/* Label */}
                  <Text style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: isActive ? '600' : isDone ? '500' : '400',
                    color: isDone ? '#4CAF50' : isActive ? '#1A1A2E' : '#999',
                  }}>
                    {isDone ? step.label.replace('...', '') : step.label}
                  </Text>

                  {/* Done Checkmark */}
                  {isDone && (
                    <MaterialIcons name="done" size={18} color="#4CAF50" />
                  )}
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Bottom hint */}
        <View style={{ paddingBottom: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: '#999' }}>
            This will only take a moment
          </Text>
        </View>
      </SafeAreaView>
    );
  };

  // Migration Screen Component
  const MigrationScreen = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F7FF' }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* Icon */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: '#4A90D9',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#4A90D9',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}>
            <Ionicons name="cloud-upload" size={48} color="#FFF" />
          </View>
        </View>
        
        {/* Title */}
        <Text style={{ 
          fontSize: 28, 
          fontWeight: 'bold', 
          textAlign: 'center', 
          marginBottom: 12, 
          color: '#333' 
        }}>
          Existing Data Found
        </Text>
        
        {/* Description */}
        <Text style={{ 
          fontSize: 16, 
          textAlign: 'center', 
          marginBottom: 32, 
          lineHeight: 24, 
          color: '#666' 
        }}>
          We found data from a previous session. Would you like to import it to your new account?
        </Text>
        
        {/* Data Summary Card */}
        <View style={{
          backgroundColor: '#FFF',
          borderRadius: 16,
          padding: 20,
          marginBottom: 32,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#999', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
            Data to Import
          </Text>
          
          {existingDataSummary?.totalPoints > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFD700' + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="star" size={18} color="#FFD700" />
              </View>
              <Text style={{ fontSize: 16, color: '#333' }}>
                <Text style={{ fontWeight: '700' }}>{existingDataSummary.totalPoints}</Text> points
              </Text>
            </View>
          )}
          
          {existingDataSummary?.todosCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#4CAF50' + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="checkbox" size={18} color="#4CAF50" />
              </View>
              <Text style={{ fontSize: 16, color: '#333' }}>
                <Text style={{ fontWeight: '700' }}>{existingDataSummary.todosCount}</Text> tasks
              </Text>
            </View>
          )}
          
          {existingDataSummary?.workoutsCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF5722' + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="barbell" size={18} color="#FF5722" />
              </View>
              <Text style={{ fontSize: 16, color: '#333' }}>
                <Text style={{ fontWeight: '700' }}>{existingDataSummary.workoutsCount}</Text> scheduled workouts
              </Text>
            </View>
          )}
          
          {existingDataSummary?.savedVersesCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#9C27B0' + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="bookmark" size={18} color="#9C27B0" />
              </View>
              <Text style={{ fontSize: 16, color: '#333' }}>
                <Text style={{ fontWeight: '700' }}>{existingDataSummary.savedVersesCount}</Text> saved verses
              </Text>
            </View>
          )}
          
          {existingDataSummary?.prayersCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2196F3' + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <FontAwesome5 name="pray" size={16} color="#2196F3" />
              </View>
              <Text style={{ fontSize: 16, color: '#333' }}>
                <Text style={{ fontWeight: '700' }}>{existingDataSummary.prayersCount}</Text> prayers
              </Text>
            </View>
          )}
          
          {existingDataSummary?.prayersCompleted > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#00BCD4' + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="checkmark-done" size={18} color="#00BCD4" />
              </View>
              <Text style={{ fontSize: 16, color: '#333' }}>
                <Text style={{ fontWeight: '700' }}>{existingDataSummary.prayersCompleted}</Text> prayers completed
              </Text>
            </View>
          )}
        </View>
        
        {/* Buttons */}
        <TouchableOpacity
          onPress={handleMigrateData}
          disabled={isMigrating}
          style={{
            backgroundColor: '#4A90D9',
            paddingVertical: 18,
            borderRadius: 16,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            opacity: isMigrating ? 0.7 : 1,
          }}
        >
          {isMigrating ? (
            <>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '600' }}>Importing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={22} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '600' }}>Import My Data</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleSkipMigration}
          disabled={isMigrating}
          style={{
            paddingVertical: 16,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: '#999', fontSize: 16, textAlign: 'center' }}>
            Start Fresh Instead
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // Render current screen
  const renderScreen = () => {
    // Show setup loading screen
    if (showSetupScreen) {
      return <SetupScreen />;
    }

    // Show loading while checking for data
    if (checkingData) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: '#666' }}>Loading...</Text>
        </SafeAreaView>
      );
    }
    
    switch (screens[currentScreen]) {
      case 'migrate': return <MigrationScreen />;
      case 'splash': return <SplashScreen />;
      case 'welcome': return <WelcomeScreen />;
      case 'country': return (
        <CountrySearchScreen 
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          onNext={handleNext}
          progress={progress}
          screenTheme={SCREEN_THEMES.country}
          userName={userName}
        />
      );
      case 'language': return <LanguageScreen />;
      case 'painPoint': return <PainPointScreen />;
      case 'features': return <FeaturesScreen />;
      case 'featuresTasks': return <FeaturesTasksScreen />;
      case 'featuresGym': return <FeaturesGymScreen />;
      case 'featuresHub': return <FeaturesHubScreen />;
      case 'bible': return <BibleScreen />;
      case 'weight': return <WeightScreen />;
      case 'photo': return <PhotoScreen />;
      case 'theme': return <ThemeScreen />;
      case 'notifications': return <NotificationsScreen />;
      case 'howFound': return <HowFoundScreen />;
      case 'gift': return <GiftScreen />;
      case 'complete': return <CompleteScreen />;
      default: return <SplashScreen />;
    }
  };

  return renderScreen();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Progress Bar
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  // Main content area
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  
  // Main Button
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginBottom: 40,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 8,
  },
  mainButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  
  // Splash Screen
  splashLogo: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    letterSpacing: -1,
  },
  
  // Welcome Screen
  mascotImage: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  welcomeHighlights: {
    marginTop: 24,
    gap: 10,
  },
  welcomeHighlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  welcomeHighlightText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },
  welcomeBadge: {
    marginTop: 20,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  welcomeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  
  // Screen titles
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  screenSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  
  // Name Input Screen
  nameScreenContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameTopSection: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 40,
  },
  nameInputContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  nameInput: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
  },
  greetingPreview: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
    paddingHorizontal: 24,
  },
  bottomMascot: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  smallMascot: {
    width: 80,
    height: 80,
    opacity: 0.9,
  },
  
  // Country Screen
  countryScreenContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  countrySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  countrySearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  countryItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  countrySectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  countryHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  countryNoResults: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
  
  // Theme Screen
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  modeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFF',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  modeToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  themeCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 4,
  },
  themePreview: {
    height: 80,
    borderRadius: 12,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCheckmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  
  // Bible Version Screen
  bibleVersionList: {
    gap: 12,
  },
  bibleVersionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bibleVersionCardSelected: {
    backgroundColor: '#FFF8E1',
  },
  bibleVersionInfo: {
    flex: 1,
  },
  bibleVersionAbbr: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  bibleVersionName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  bibleVersionDesc: {
    fontSize: 13,
    color: '#888',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  showMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Weight Screen
  weightScreenContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  weightTopSection: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  weightIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,131,143,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  weightOptions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  weightOption: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  weightOptionSelected: {
    backgroundColor: '#E0F7FA',
  },
  weightEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  weightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  weightDesc: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  weightCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Photo Screen
  photoScreenContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  photoTopSection: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  photoPickerContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  profileImagePreview: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  photoPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  photoPlaceholderText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  removePhotoButton: {
    marginTop: 8,
  },
  removePhotoText: {
    fontSize: 14,
    color: '#E53935',
    fontWeight: '500',
  },
  
  // Pain Point Screen
  painPointContent: {
    flex: 1,
  },
  painPointList: {
    gap: 12,
  },
  painPointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  painPointCardSelected: {
    borderColor: '#E57373',
    backgroundColor: '#FFEBEE',
  },
  painPointIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  painPointEmoji: {
    fontSize: 26,
  },
  painPointText: {
    flex: 1,
  },
  painPointTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  painPointTitleSelected: {
    color: '#C62828',
  },
  painPointSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E57373',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  scrollIndicatorText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  
  // Features Screen
  featuresContent: {
    flex: 1,
  },
  featureCards: {
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureEmoji: {
    fontSize: 26,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  featureHighlight: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featureHighlightText: {
    fontSize: 10,
    fontWeight: '600',
  },
  differentiatorCard: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1565C0',
    borderStyle: 'dashed',
  },
  differentiatorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 6,
    textAlign: 'center',
  },
  differentiatorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  featureHeaderIcon: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  exampleCard: {
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  exampleTask: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  examplePoints: {
    fontSize: 14,
    fontWeight: '700',
  },
  motivationText: {
    fontSize: 15,
    color: '#555',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  motivationRef: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Notifications Screen
  notifContent: {
    flex: 1,
  },
  socialProofBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
    gap: 12,
  },
  socialProofNumber: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  socialProofText: {
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
    lineHeight: 22,
  },
  notifToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  notifToggleIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  notifToggleText: {
    flex: 1,
  },
  notifToggleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  notifToggleSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  benefitsList: {
    gap: 16,
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 15,
    color: '#444',
    flex: 1,
  },
  noSpamText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Attribution Screen
  attributionContent: {
    flex: 1,
  },
  attributionList: {
    gap: 10,
  },
  attributionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  attributionCardSelected: {
    backgroundColor: '#EDE7F6',
  },
  attributionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  attributionText: {
    fontSize: 16,
    color: '#444',
    flex: 1,
  },
  
  // Gift Screen
  giftContainer: {
    marginTop: 40,
  },
  giftBox: {
    alignItems: 'center',
  },
  giftEmoji: {
    fontSize: 120,
  },
  giftTapText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
  },
  giftRevealed: {
    alignItems: 'center',
  },
  giftRevealEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  giftRevealTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  verseCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  verseText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 28,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  verseReference: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Hold to reveal styles
  holdInstructionContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  holdInstruction: {
    fontSize: 18,
    color: '#888',
    fontStyle: 'italic',
  },
  holdProgressContainer: {
    alignItems: 'center',
    width: '80%',
  },
  holdProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  holdProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  holdProgressText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  giftRevealScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  priceBreakdownCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  priceBreakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceBreakdownCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  priceBreakdownFeature: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  priceBreakdownPrice: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  priceBreakdownDivider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 16,
  },
  priceBreakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceBreakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  priceBreakdownTotalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#888',
    textDecorationLine: 'line-through',
  },
  yourPriceCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  yourPriceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  yourPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  yourPriceStrikethrough: {
    fontSize: 24,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  yourPriceFree: {
    fontSize: 48,
    fontWeight: '800',
    color: '#4CAF50',
  },
  yourPriceForever: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  whyFreeCard: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  whyFreeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  whyFreeText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  
  // Paywall Screen
  paywallScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  paywallContent: {
    alignItems: 'center',
  },
  paywallMascot: {
    width: 120,
    height: 120,
    marginTop: 20,
    marginBottom: 20,
  },
  paywallTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  paywallSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  paywallFeatures: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  featuresHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  paywallFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paywallFeatureText: {
    fontSize: 15,
    color: '#444',
    flex: 1,
  },
  pricingSection: {
    width: '100%',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  priceFrequency: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#888',
  },
  priceSubtext: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  subscribeButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    marginBottom: 16,
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  noThanksText: {
    fontSize: 15,
    color: '#666',
    textDecorationLine: 'underline',
  },
  
  // Free reveal
  freeReveal: {
    alignItems: 'center',
    width: '100%',
  },
  celebrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  celebrationEmoji: {
    fontSize: 40,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  strikethroughContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  originalPrice: {
    fontSize: 24,
    color: '#999',
    fontWeight: '600',
  },
  strikethrough: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 3,
    backgroundColor: '#E53935',
    transform: [{ rotate: '-5deg' }],
  },
  freePrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  freeExplanation: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
  },
  freeFeaturesList: {
    width: '100%',
    gap: 12,
  },
  freeFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  freeFeatureText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  
  // Complete Screen
  completeEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  completeSubtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  completeStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  completeStatItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '45%',
    gap: 6,
  },
  completeStatLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
    textAlign: 'center',
  },
  completeMascot: {
    width: 120,
    height: 120,
    opacity: 0.9,
    alignSelf: 'center',
    marginBottom: 16,
  },
  completeVerse: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  completeVerseRef: {
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '600',
    color: '#2E7D32',
  },
});

export default SimpleOnboarding;
