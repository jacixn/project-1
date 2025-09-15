import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
import PrayerCompletionManager from '../utils/prayerCompletionManager';

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
        activeOpacity={1}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedSettingsCard = ({ children, onPress, style, ...props }) => {
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
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <BlurView intensity={18} tint="light" style={style}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={{ 
            flex: 1, 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: 20
          }}
          {...props}
        >
          {children}
        </TouchableOpacity>
      </BlurView>
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
        activeOpacity={1}
        style={style}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const ProfileTab = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, toggleTheme, changeTheme, availableThemes, currentTheme } = useTheme();
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedBibleVersion, setSelectedBibleVersion] = useState('kjv');
  const [showBibleVersionModal, setShowBibleVersionModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSavedVerses, setShowSavedVerses] = useState(false);
  const [savedVersesList, setSavedVersesList] = useState([]);
  const [simplifiedSavedVerses, setSimplifiedSavedVerses] = useState(new Map());
  const [refreshingSavedVerses, setRefreshingSavedVerses] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [verseToInterpret, setVerseToInterpret] = useState(null);

  const [purchasedVersions, setPurchasedVersions] = useState(['kjv', 'web']); // Free versions
  
  // 🌸 Scroll animation for wallpaper
  const wallpaperScrollY = useRef(new Animated.Value(0)).current;

  const loadSavedVerses = async () => {
    try {
      const savedVersesData = await AsyncStorage.getItem('savedBibleVerses');
      if (savedVersesData) {
        const verses = JSON.parse(savedVersesData);
        setSavedVersesList(verses);
        
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
        
        console.log(`📖 Loaded ${verses.length} saved verses in ProfileTab`);
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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserData();
    checkAiStatus();
    loadVibrationSetting();
    loadSavedVerses();
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

  // Refresh saved verses when modal becomes visible
  useEffect(() => {
    if (showSavedVerses) {
      console.log('📖 Saved verses modal opened, refreshing data...');
      loadSavedVerses();
    }
  }, [showSavedVerses]);

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
        setSelectedCountry(profile.country);
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
      }

      const storedPurchasedVersions = await AsyncStorage.getItem('purchasedBibleVersions');
      if (storedPurchasedVersions) {
        setPurchasedVersions(JSON.parse(storedPurchasedVersions));
      }
      
      // Load actual points from PrayerCompletionManager
      const totalPoints = await PrayerCompletionManager.getTotalPoints();
      const level = Math.floor(totalPoints / 1000) + 1; // 1000 points per level
      
      setUserStats({
        points: totalPoints,
        level: level,
        completedTasks: 0,
        streak: 0,
        badges: [],
        versesRead: 25,
        prayersCompleted: 12,
        ...storedStats,
      });
      
      console.log(`📊 Profile loaded: ${totalPoints} points, Level ${level}`);
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
        country: selectedCountry,
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
      
      // Show confirmation
      setTimeout(() => {
        Alert.alert(
          'Bible Version Updated', 
          `Now using ${version.name} (${version.abbreviation})`,
          [{ text: 'OK' }]
        );
      }, 500);
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

  // These functions are no longer needed as we use the secure proxy server
  // Keeping empty stubs to prevent any reference errors
  const enableDeepSeekAI = () => {};
  const clearApiKey = () => {};

  // Calculate level progress
  const currentLevelPoints = (userStats.level - 1) * 1000;
  const nextLevelPoints = userStats.level * 1000;
  const progress = Math.min((userStats.points - currentLevelPoints) / 1000, 1);

  // Profile Header Component
  const ProfileHeader = () => (
    <BlurView intensity={18} tint="light" style={styles.profileCard}>
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
        <View style={[styles.cameraIcon, { backgroundColor: theme.background }]}>
          <MaterialIcons name="camera-alt" size={16} color={theme.primary} />
        </View>
      </TouchableOpacity>
      
      <Text style={[styles.userName, { color: theme.text }]}>
        {userName} {userProfile?.country?.flag || ''}
      </Text>
      <Text style={[styles.userLevel, { color: theme.textSecondary }]}>
        {t.level || 'Level'} {userStats.level} {t.believer || 'Believer'}
      </Text>
      
      {/* Level Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {userStats.points} / {nextLevelPoints} {t.points || 'points'}
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
    </BlurView>
  );

  // Stats Grid Component
  const StatsGrid = () => (
    <BlurView intensity={18} tint="light" style={styles.statsCard}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 {t.yourJourney || 'Your Journey'}</Text>
      
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="check-circle" size={24} color={theme.success} />
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t.tasksDone || 'Tasks Done'}
          </Text>
        </View>
        
        <AnimatedStatCard 
          style={[styles.statBox, { backgroundColor: theme.surface }]}
          onPress={() => {
            hapticFeedback.light();
            // Refresh saved verses before showing modal
            loadSavedVerses();
            setShowSavedVerses(true);
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
        
        <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="favorite" size={24} color={theme.error} />
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t.prayers || 'Prayers'}
          </Text>
        </View>
        
        <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
          <MaterialIcons name="local-fire-department" size={24} color={theme.warning} />
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {t.dayStreak || 'Day Streak'}
          </Text>
        </View>
      </View>
    </BlurView>
  );

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
          <View style={styles.achievementHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Achievements</Text>
          <View style={styles.achievementInfo}>
            <MaterialIcons name="chevron-right" size={20} color={theme.primary} />
          </View>
        </View>
        
        <View style={styles.badgesGrid}>
          {sampleBadges.map(badge => (
            <View 
              key={badge.id} 
              style={[
                styles.badgeItem, 
                { backgroundColor: theme.surface },
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
        
          <View style={[styles.viewAllButton, { backgroundColor: theme.primary + '20' }]}>
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
      style={styles.settingsCard}
      onPress={() => {
        hapticFeedback.buttonPress();
        setShowSettingsModal(true);
      }}
    >
        <View style={styles.settingLeft}>
          <MaterialIcons name="settings" size={24} color={theme.primary} />
          <Text style={[styles.settingsButtonText, { color: theme.text }]}>
            Settings
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.textTertiary} />
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
        <View style={styles.settingLeft}>
          <MaterialIcons name="info" size={24} color={theme.primary} />
          <Text style={[styles.aboutButtonText, { color: theme.text }]}>
            About Biblely
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.textTertiary} />
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
      <View style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? 'transparent' : theme.background }]}>
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
            style={[styles.headerLogo, { backgroundColor: 'transparent' }]}
            resizeMode="contain"
          />
          
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
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
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
                    </View>
                  </View>
                  
                  {isSelected && (
                    <MaterialIcons name="check-circle" size={24} color={theme.primary} />
                  )}
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

      {/* Saved Verses Modal */}
      <Modal
        visible={showSavedVerses}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSavedVerses(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            {/* Pull indicator */}
            <View style={styles.pullIndicatorContainer}>
              <View style={[styles.pullIndicator, { backgroundColor: theme.textTertiary }]} />
            </View>
            
            <View style={[styles.modalHeader, { paddingTop: 10, paddingBottom: 15, paddingHorizontal: 16 }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t.savedVersesTitle || 'Saved Verses'}</Text>
              <TouchableOpacity onPress={() => setShowSavedVerses(false)}>
                <MaterialIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView} 
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingSavedVerses}
                  onRefresh={refreshSavedVerses}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              }
            >
              {savedVersesList.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="bookmark-border" size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                    {t.noSavedVerses || 'No saved verses yet'}
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme.textTertiary }]}>
                    {t.tapToSave || 'Tap the bookmark icon on any verse to save it'}
                  </Text>
                </View>
              ) : (
                savedVersesList.map((verse, index) => (
                  <View key={verse.id || index} style={[styles.savedVerseItem, { 
                    backgroundColor: theme.surface,
                    borderBottomColor: theme.border
                  }]}>
                    <View style={styles.savedVerseHeader}>
                      <Text style={[styles.savedVerseReference, { color: theme.primary }]}>
                        {verse.reference}
                      </Text>
                      <Text style={[styles.savedVerseVersion, { color: theme.textTertiary }]}>
                        {verse.version?.toUpperCase() || 'KJV'}
                      </Text>
                    </View>
                    {/* Always show original content */}
                    <Text style={[styles.savedVerseContent, { color: theme.text }]}>
                      {verse.content}
                    </Text>
                    
                    {/* Show simplified text below original when simplified */}
                    {simplifiedSavedVerses.has(verse.id) && (
                      <View style={styles.simplifiedSavedVerseContainer}>
                        <View style={styles.simplifiedSavedVerseHeader}>
                          <MaterialIcons name="child-friendly" size={16} color={theme.warning} />
                          <Text style={[styles.simplifiedSavedVerseLabel, { color: theme.warning }]}>
                            Easy to understand:
                          </Text>
                        </View>
                        <Text style={[styles.simplifiedSavedVerseText, { color: theme.text, backgroundColor: `${theme.warning}10` }]}>
                          {simplifiedSavedVerses.get(verse.id)}
                        </Text>
                      </View>
                    )}
                    
                    {/* Action buttons */}
                    <View style={styles.savedVerseActions}>
                      {/* Simple Button */}
                      <TouchableOpacity
                        style={[styles.savedVerseButton, { 
                          backgroundColor: simplifiedSavedVerses.has(verse.id) ? theme.warning + '20' : theme.textSecondary + '15',
                          borderColor: simplifiedSavedVerses.has(verse.id) ? theme.warning : theme.textSecondary + '30'
                        }]}
                        onPress={async () => {
                          hapticFeedback.light();
                          if (simplifiedSavedVerses.has(verse.id)) {
                            // Toggle back to original
                            const newMap = new Map(simplifiedSavedVerses);
                            newMap.delete(verse.id);
                            setSimplifiedSavedVerses(newMap);
                            console.log(`📖 Hiding simplified text for saved verse: ${verse.reference}`);
                          } else {
                            // Simplify the verse [[memory:7766870]]
                            try {
                              console.log(`🧒 Simplifying saved verse for 12-year-old: ${verse.reference}`);
                              const productionAiService = require('../services/productionAiService').default;
                              const simplifiedText = await productionAiService.simplifyBibleVerse(verse.content, verse.reference);
                              const newMap = new Map(simplifiedSavedVerses);
                              newMap.set(verse.id, simplifiedText);
                              setSimplifiedSavedVerses(newMap);
                              console.log(`✅ Successfully simplified saved verse: ${verse.reference}`);
                            } catch (error) {
                              console.error('Error simplifying saved verse:', error);
                              Alert.alert('Error', 'Could not simplify verse. Please try again.');
                            }
                          }
                        }}
                      >
                        <MaterialIcons 
                          name={simplifiedSavedVerses.has(verse.id) ? "child-care" : "child-friendly"} 
                          size={16} 
                          color={simplifiedSavedVerses.has(verse.id) ? theme.warning : theme.textSecondary} 
                        />
                        <Text style={[styles.savedVerseButtonText, { color: simplifiedSavedVerses.has(verse.id) ? theme.warning : theme.textSecondary }]}>
                          {t.simple || 'Simple'}
                        </Text>
                      </TouchableOpacity>
                      
                      {/* Discuss Button */}
                      <TouchableOpacity
                        style={[styles.savedVerseButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}
                        onPress={() => {
                          hapticFeedback.medium();
                          setVerseToInterpret({
                            text: verse.content,
                            reference: verse.reference
                          });
                          setShowSavedVerses(false);
                          setTimeout(() => {
                            setShowAiChat(true);
                          }, 300);
                        }}
                      >
                        <MaterialIcons name="forum" size={16} color={theme.primary} />
                        <Text style={[styles.savedVerseButtonText, { color: theme.primary }]}>{t.discuss || 'Discuss'}</Text>
                      </TouchableOpacity>
                      
                      {/* Remove Button */}
                      <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: theme.error + '20' }]}
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
                      >
                        <MaterialIcons name="delete-outline" size={18} color={theme.error} />
                        <Text style={[styles.removeButtonText, { color: theme.error }]}>{t.remove || 'Remove'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
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
            {/* 🌸 Theme Selection */}
            <View style={[styles.modalSettingItem, { backgroundColor: theme.card, flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={styles.settingLeft}>
                <MaterialIcons 
                  name="palette" 
                  size={20} 
                  color={theme.primary} 
                />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  🎨 Theme
                </Text>
              </View>
              
              <View style={styles.themeSelector}>
                {availableThemes.map((themeOption) => (
                  <TouchableOpacity
                    key={themeOption.id}
                    style={[
                      styles.themeOption,
                      { 
                        backgroundColor: currentTheme === themeOption.id ? theme.primary + '20' : theme.surface,
                        borderColor: currentTheme === themeOption.id ? theme.primary : theme.border,
                        borderWidth: 1,
                      }
                    ]}
                    onPress={() => {
                      hapticFeedback.success();
                      changeTheme(themeOption.id);
                    }}
                  >
                    <Text style={styles.themeEmoji}>{themeOption.icon}</Text>
                    <Text style={[
                      styles.themeText, 
                      { 
                        color: currentTheme === themeOption.id ? theme.primary : theme.text,
                        fontWeight: currentTheme === themeOption.id ? '600' : '400'
                      }
                    ]}>
                      {themeOption.name}
                    </Text>
                    {currentTheme === themeOption.id && (
                      <MaterialIcons name="check-circle" size={16} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dark Mode Toggle (Legacy - kept for compatibility) */}
            <View style={[styles.modalSettingItem, { backgroundColor: theme.card }]}>
              <View style={styles.settingLeft}>
                <MaterialIcons 
                  name={isDark ? "dark-mode" : "light-mode"} 
                  size={20} 
                  color={theme.primary} 
                />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  {isDark ? (t.darkMode || "Dark Mode") : (t.lightMode || "Light Mode")}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={isDark ? "#FFFFFF" : "#F4F3F4"}
              />
            </View>
            
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
                  {t.language}
                </Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                  {availableLanguages.find(l => l.code === language)?.nativeName || 'English'}
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
        />
      )}
    </View>
    </AnimatedWallpaper>


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
    marginBottom: 20,
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
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
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
});

export default ProfileTab;
