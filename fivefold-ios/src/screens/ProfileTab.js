import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { performFullSync, updateAndSyncProfile } from '../services/userSyncService';
import { checkUsernameAvailability, sendVerificationCode, refreshEmailVerificationStatus } from '../services/authService';
import { getReferralInfo, submitReferral, getReferralCount } from '../services/referralService';
import { getFriendCount } from '../services/friendsService';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
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
  DeviceEventEmitter,
  PanResponder,
  KeyboardAvoidingView,
  Dimensions,
  Easing,
} from 'react-native';

// const { width } = Dimensions.get('window');
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
  isLiquidGlassSupportedByDevice,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getStoredData, saveData } from '../utils/localStorage';
import userStorage from '../utils/userStorage';
import { countries } from '../data/countries';
import { resetOnboardingForTesting } from '../utils/onboardingReset';
import AchievementsModal from '../components/AchievementsModal';
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
import bibleAudioService from '../services/bibleAudioService';
import BibleReader from '../components/BibleReader';
import PrayerCompletionManager from '../utils/prayerCompletionManager';
import AppStreakManager from '../utils/appStreakManager';
import VerseDataManager from '../utils/verseDataManager';
import verseByReferenceService from '../services/verseByReferenceService';
import ThemeModal from '../components/ThemeModal';
import VoicePickerModal from '../components/VoicePickerModal';
import AchievementService from '../services/achievementService';
import JournalCalendar from '../components/JournalCalendar';
import WorkoutService from '../services/workoutService';


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
        activeOpacity={0.7}
        delayPressIn={0}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedSettingsCard = ({ children, onPress, style, ...props }) => {
  const { theme, isDark } = useTheme();
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

  // Liquid Glass Container for Settings Cards
  const LiquidGlassSettingsContainer = ({ children, style }) => {
    if (!isLiquidGlassSupported) {
      return (
        <BlurView 
          intensity={18} 
          tint={isDark ? "dark" : "light"} 
          style={[style, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}10` // Added 4 to opacity (06 -> 10)
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
        style={[style, styles.liquidGlassSettingsCard]}
      >
        {children}
      </LiquidGlassView>
    );
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <LiquidGlassSettingsContainer style={style}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
          delayPressIn={0}
          style={{ flex: 1 }}
          {...props}
        >
          {children}
        </TouchableOpacity>
      </LiquidGlassSettingsContainer>
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
        activeOpacity={0.7}
        delayPressIn={0}
        style={style}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT SWITCH OVERLAY — Premium animated transition between accounts
// ═══════════════════════════════════════════════════════════════════════════
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const AccountSwitchOverlay = React.memo(({ visible, switching, currentAccount, targetAccount, theme, isDark, onFinished }) => {
  // visible = should the overlay be showing (switchTarget is set)
  // switching = is the switch actively in progress (switchingAccount from AuthContext)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleFrom = useRef(new Animated.Value(1)).current;
  const scaleTo = useRef(new Animated.Value(0.6)).current;
  const slideFrom = useRef(new Animated.Value(0)).current;
  const slideTo = useRef(new Animated.Value(60)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;
  const [statusText, setStatusText] = useState('Preparing...');
  const [showOverlay, setShowOverlay] = useState(false);
  const [switchComplete, setSwitchComplete] = useState(false);
  const wasShowingRef = useRef(false);
  const timersRef = useRef([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const animateStatusChange = (text) => {
    Animated.timing(statusOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStatusText(text);
      Animated.timing(statusOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  };

  // Handle entrance: when visible becomes true
  useEffect(() => {
    if (visible && !wasShowingRef.current) {
      wasShowingRef.current = true;
      setShowOverlay(true);
      setSwitchComplete(false);
      setStatusText('Saving your data...');
      fadeAnim.setValue(0);
      scaleFrom.setValue(1);
      scaleTo.setValue(0.6);
      slideFrom.setValue(0);
      slideTo.setValue(60);
      arrowAnim.setValue(0);
      ringAnim.setValue(0);
      pulseAnim.setValue(1);
      progressAnim.setValue(0);
      checkAnim.setValue(0);
      statusOpacity.setValue(1);

      // Entrance
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(scaleFrom, { toValue: 0.85, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.spring(scaleTo, { toValue: 1, friction: 8, tension: 60, delay: 200, useNativeDriver: true }),
        Animated.timing(slideFrom, { toValue: -30, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(slideTo, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), delay: 100, useNativeDriver: true }),
      ]).start();

      // Arrow pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(arrowAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(arrowAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      // Ring rotation
      Animated.loop(
        Animated.timing(ringAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
      ).start();

      // Pulse glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      // Progress steps
      Animated.timing(progressAnim, { toValue: 0.3, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();

      timersRef.current.push(setTimeout(() => {
        animateStatusChange('Signing in...');
        Animated.timing(progressAnim, { toValue: 0.55, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      }, 1500));

      timersRef.current.push(setTimeout(() => {
        animateStatusChange('Downloading your data...');
        Animated.timing(progressAnim, { toValue: 0.8, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      }, 3000));

      timersRef.current.push(setTimeout(() => {
        animateStatusChange('Almost there...');
        Animated.timing(progressAnim, { toValue: 0.95, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      }, 5000));
    }

    if (!visible) {
      wasShowingRef.current = false;
    }
  }, [visible]);

  // Handle completion: when switching goes from true → false while overlay is showing
  useEffect(() => {
    if (showOverlay && !switching && visible) {
      // Switch completed — show success then auto-dismiss
      clearAllTimers();
      setSwitchComplete(true);
      setStatusText('Welcome back!');
      Animated.timing(progressAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      Animated.spring(checkAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }).start();

      const exitTimer = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          setShowOverlay(false);
          onFinished?.();
        });
      }, 1200);
      timersRef.current.push(exitTimer);
    }
  }, [switching, showOverlay, visible]);

  // Cleanup on unmount
  useEffect(() => () => clearAllTimers(), []);

  // Also handle error case: if visible goes false while overlay is still showing
  useEffect(() => {
    if (!visible && showOverlay) {
      clearAllTimers();
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setShowOverlay(false);
        onFinished?.();
      });
    }
  }, [visible, showOverlay]);

  if (!showOverlay) return null;

  const fromName = currentAccount?.username ? `@${currentAccount.username}` : (currentAccount?.email || 'You');
  const toName = targetAccount?.username ? `@${targetAccount.username}` : (targetAccount?.email || 'Account');

  const ringRotation = ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const arrowX = arrowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const renderAvatar = (account, size, style) => {
    if (account?.profilePicture) {
      return (
        <Image
          source={{ uri: account.profilePicture }}
          style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        />
      );
    }
    return (
      <View style={[{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        alignItems: 'center', justifyContent: 'center',
      }, style]}>
        <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: theme?.primary || '#4CAF50' }}>
          {(account?.username || account?.email || '?')[0]?.toUpperCase()}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={{
        flex: 1,
        backgroundColor: isDark ? '#0B0F1A' : '#F0F2F5',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeAnim,
      }}>
        {/* Decorative gradient rings */}
        <Animated.View style={{
          position: 'absolute',
          width: 320, height: 320, borderRadius: 160,
          borderWidth: 1.5,
          borderColor: (theme?.primary || '#4CAF50') + '15',
          transform: [{ rotate: ringRotation }],
        }} />
        <Animated.View style={{
          position: 'absolute',
          width: 400, height: 400, borderRadius: 200,
          borderWidth: 1,
          borderColor: (theme?.primary || '#4CAF50') + '08',
          transform: [{ rotate: ringRotation }, { scaleX: -1 }],
        }} />

        {/* Main content */}
        <View style={{ alignItems: 'center', paddingHorizontal: 40 }}>

          {/* Avatars with arrow */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 48, gap: 20 }}>
            {/* FROM avatar */}
            <Animated.View style={{
              transform: [{ scale: scaleFrom }, { translateX: slideFrom }],
              opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
            }}>
              <View style={{
                borderRadius: 44,
                borderWidth: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                padding: 3,
              }}>
                {renderAvatar(currentAccount, 80)}
              </View>
              <Text style={{
                fontSize: 13, fontWeight: '600',
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                textAlign: 'center', marginTop: 8, maxWidth: 90,
              }} numberOfLines={1}>{fromName}</Text>
            </Animated.View>

            {/* Animated arrow */}
            <Animated.View style={{
              transform: [{ translateX: arrowX }],
              opacity: fadeAnim,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: (theme?.primary || '#4CAF50') + '20',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 20, color: theme?.primary || '#4CAF50' }}>→</Text>
              </View>
            </Animated.View>

            {/* TO avatar */}
            <Animated.View style={{
              transform: [{ scale: scaleTo }, { translateX: slideTo }],
            }}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={{
                  borderRadius: 48,
                  borderWidth: 3,
                  borderColor: theme?.primary || '#4CAF50',
                  padding: 3,
                  shadowColor: theme?.primary || '#4CAF50',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 20,
                }}>
                  {renderAvatar(targetAccount, 84)}
                </View>
              </Animated.View>
              <Text style={{
                fontSize: 14, fontWeight: '700',
                color: theme?.text || '#fff',
                textAlign: 'center', marginTop: 8, maxWidth: 100,
              }} numberOfLines={1}>{toName}</Text>
            </Animated.View>
          </View>

          {/* Status text */}
          <Animated.Text style={{
            fontSize: 22, fontWeight: '800',
            color: theme?.text || '#fff',
            textAlign: 'center',
            marginBottom: 8,
            opacity: statusOpacity,
            letterSpacing: 0.3,
          }}>
            {switchComplete ? 'Switched!' : 'Switching Account'}
          </Animated.Text>

          <Animated.Text style={{
            fontSize: 15,
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
            textAlign: 'center',
            marginBottom: 32,
            opacity: statusOpacity,
          }}>
            {statusText}
          </Animated.Text>

          {/* Progress bar */}
          <View style={{
            width: 220, height: 4, borderRadius: 2,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            <Animated.View style={{
              height: '100%',
              borderRadius: 2,
              backgroundColor: theme?.primary || '#4CAF50',
              width: progressWidth,
            }} />
          </View>

          {/* Success checkmark */}
          <Animated.View style={{
            marginTop: 24,
            transform: [{ scale: checkAnim }],
            opacity: checkAnim,
          }}>
            <View style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: (theme?.primary || '#4CAF50') + '20',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 26, color: theme?.primary || '#4CAF50' }}>✓</Text>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
});

const ProfileTab = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme, isBiblelyTheme, toggleTheme, changeTheme, availableThemes, currentTheme, selectedWallpaperIndex } = useTheme();
  const { t, language, changeLanguage, isChangingLanguage, availableLanguages } = useLanguage();
  const navigation = useNavigation();
  const { 
    user, userProfile: authUserProfile, signOut, deleteAccount, isAuthenticated, loading: authLoading, updateLocalProfile,
    linkedAccounts, switchAccount, addLinkedAccount, unlinkAccount, switchingAccount, saveCurrentAsLinkedAccount,
  } = useAuth();
  const [friendCount, setFriendCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [addAccountEmail, setAddAccountEmail] = useState('');
  const [addAccountPassword, setAddAccountPassword] = useState('');
  const [currentAccountPassword, setCurrentAccountPassword] = useState('');
  const [addAccountError, setAddAccountError] = useState('');
  const [addAccountLoading, setAddAccountLoading] = useState(false);
  const [switchTarget, setSwitchTarget] = useState(null); // Account object we're switching TO
  
  // Only the main Biblely wallpaper (index 0) needs special white icons/text overrides
  // Jesus & Lambs (index 1) and Classic (index 2) use their own theme colors
  const isBiblelyMainWallpaper = isBiblelyTheme && selectedWallpaperIndex === 0;
  
  // For main Biblely wallpaper only, use white text and icons for better readability on main screen
  const textColor = isBiblelyMainWallpaper ? '#FFFFFF' : theme.text;
  const textSecondaryColor = isBiblelyMainWallpaper ? 'rgba(255,255,255,0.8)' : theme.textSecondary;
  const textTertiaryColor = isBiblelyMainWallpaper ? 'rgba(255,255,255,0.6)' : theme.textTertiary;
  const iconColor = isBiblelyMainWallpaper ? '#FFFFFF' : theme.primary;
  
  // Text shadow for outline effect - only on main Biblely wallpaper
  const textOutlineStyle = isBiblelyMainWallpaper ? {
    textShadowColor: theme.primaryDark || 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  } : {};
  
  // For modals - light Biblely needs dark text, dark Biblely variants need light text
  const isLightBiblely = isBiblelyTheme && !isDark;
  const modalTextColor = isLightBiblely ? '#2D2D2D' : theme.text;
  const modalTextSecondaryColor = isLightBiblely ? '#5A5A5A' : theme.textSecondary;
  const modalTextTertiaryColor = isLightBiblely ? '#8A8A8A' : theme.textTertiary;
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
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('Faithful Friend');
  const [profilePicture, setProfilePictureRaw] = useState(null);
  const profilePictureRef = useRef(null);
  
  // Wrapper that only triggers a re-render when the URI actually changes.
  // This prevents the Image component from flickering on tab focus.
  const setProfilePicture = useCallback((uri) => {
    if (uri !== profilePictureRef.current) {
      profilePictureRef.current = uri;
      setProfilePictureRaw(uri);
    }
  }, []);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [showAchievements, setShowAchievements] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralInfo, setReferralInfo] = useState({ referredBy: null, referredByUsername: null, referredByDisplayName: null, referralCount: 0 });
  const [referralUsername, setReferralUsername] = useState('');
  const [referralLoading, setReferralLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [selectedBibleVersion, setSelectedBibleVersion] = useState('kjv');
  const [showBibleVersionModal, setShowBibleVersionModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' or 'lbs'
  const [heightUnit, setHeightUnit] = useState('cm'); // 'cm' or 'ft'
  const [audioVoiceGender, setAudioVoiceGender] = useState('female'); // 'male' or 'female'
  const [showVoicePickerModal, setShowVoicePickerModal] = useState(false);
  const [currentVoiceName, setCurrentVoiceName] = useState('Default');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isPublicProfile, setIsPublicProfile] = useState(true); // Show on global leaderboard
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showSavedVerses, setShowSavedVerses] = useState(false);
  const [savedVersesList, setSavedVersesList] = useState([]);
  const [simplifiedSavedVerses, setSimplifiedSavedVerses] = useState(new Map());
  const [refreshingSavedVerses, setRefreshingSavedVerses] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [verseToInterpret, setVerseToInterpret] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(null); // 'privacy' | 'terms' | 'support' | null
  const [showBible, setShowBible] = useState(false);
  const [showAdminAnalytics, setShowAdminAnalytics] = useState(false);
  const [attributionData, setAttributionData] = useState(null);
  const [loadingAttribution, setLoadingAttribution] = useState(false);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [verseReference, setVerseReference] = useState(null);

  const [purchasedVersions, setPurchasedVersions] = useState(['kjv', 'web']); // Free versions
  
  // App Streak State
  const [appStreak, setAppStreak] = useState(0);
  const [showStreakMilestone, setShowStreakMilestone] = useState(false);
  const [streakAnimation, setStreakAnimation] = useState(null);
  const [streakOpenDates, setStreakOpenDates] = useState([]);
  const streakVisibleRef = useRef(false);
  
  // Customisation State
  const [selectedStreakAnim, setSelectedStreakAnim] = useState('fire1');
  const [bluetickToggle, setBluetickToggle] = useState(true);
  const [countryFlagToggle, setCountryFlagToggle] = useState(true);
  const [streakBadgeToggle, setStreakBadgeToggle] = useState(true);
  
  // Streak animation values
  const streakFireScale = useRef(new Animated.Value(0)).current;
  const streakFireFlicker = useRef(new Animated.Value(1)).current;
  const streakNumberScale = useRef(new Animated.Value(0)).current;
  const streakFadeIn = useRef(new Animated.Value(0)).current;
  // (Lottie handles flame layers internally)
  
  // Journal State
  const [journalNotes, setJournalNotes] = useState([]);
  const [journalVerseTexts, setJournalVerseTexts] = useState({});
  const [showAddJournalNote, setShowAddJournalNote] = useState(false);
  const [newJournalNote, setNewJournalNote] = useState({ reference: '', text: '' });
  const [isAddingEntry, setIsAddingEntry] = useState(false); // Track if we're in add mode within journal modal
  
  // Highlights State
  const [highlightedVerses, setHighlightedVerses] = useState([]);
  const [showHighlights, setShowHighlights] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState(null); // Track selected color for drill-down
  const [highlightVersesWithText, setHighlightVersesWithText] = useState([]); // Store verses with full text
  const [customHighlightNames, setCustomHighlightNames] = useState({}); // Store custom names for highlight colors
  const [showRenameHighlight, setShowRenameHighlight] = useState(false);
  const [renameHighlightColor, setRenameHighlightColor] = useState(null);
  const [renameHighlightText, setRenameHighlightText] = useState('');
  const [highlightViewMode, setHighlightViewMode] = useState('compact'); // 'compact' or 'expanded'
  
  // Tasks Done State
  const [showTasksDone, setShowTasksDone] = useState(false);
  const [completedTodosList, setCompletedTodosList] = useState([]);
  
  // Gym History
  const [workoutCount, setWorkoutCount] = useState(0);
  const [savedVersesSort, setSavedVersesSort] = useState('desc'); // 'asc' | 'desc'
  const [savedVersesSearch, setSavedVersesSearch] = useState('');
  const [currentBibleVersion, setCurrentBibleVersion] = useState('nlt'); // Track current version
  const [showJournal, setShowJournal] = useState(false);
  const [journalLoading, setJournalLoading] = useState(true); // Start true to avoid empty flash
  
  // Modal animation refs for interactive dismissal
  const savedVersesSlideAnim = useRef(new Animated.Value(0)).current;
  const journalSlideAnim = useRef(new Animated.Value(0)).current;
  const highlightsSlideAnim = useRef(new Animated.Value(0)).current;
  const addJournalSlideAnim = useRef(new Animated.Value(600)).current;
  
  const savedVersesFadeAnim = useRef(new Animated.Value(0)).current;
  const journalFadeAnim = useRef(new Animated.Value(0)).current;
  const highlightsFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Collapsible search bar animation for Saved Verses
  const savedVersesSearchAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef('up');
  
  const handleSavedVersesScroll = (event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
    
    // Only animate if direction changed and scrolled enough
    if (direction !== scrollDirection.current && Math.abs(currentScrollY - lastScrollY.current) > 10) {
      scrollDirection.current = direction;
      
      Animated.timing(savedVersesSearchAnim, {
        toValue: direction === 'down' ? 0 : 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
    
    lastScrollY.current = currentScrollY;
  };

  // Admin Analytics - check if current user is admin
  const ADMIN_EMAILS = ['biblelyios@gmail.com'];
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const fetchAttributionData = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAttribution(true);
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const counts = {};
      let total = 0;
      snapshot.forEach(docSnap => {
        total++;
        const data = docSnap.data();
        if (data.attribution) {
          counts[data.attribution] = (counts[data.attribution] || 0) + 1;
        }
      });
      
      // Map IDs to display names
      const LABEL_MAP = {
        tiktok: 'TikTok',
        instagram: 'Instagram',
        twitter: 'X / Twitter',
        friend: 'Friend / Family',
        appstore: 'App Store',
        google: 'Google Search',
        youtube: 'YouTube',
        church: 'Church',
        other: 'Other',
      };

      const COLOR_MAP = {
        tiktok: '#000000',
        instagram: '#E1306C',
        twitter: '#1DA1F2',
        friend: '#FF7043',
        appstore: '#007AFF',
        google: '#4285F4',
        youtube: '#FF0000',
        church: '#8E24AA',
        other: '#78909C',
      };

      // Build sorted array
      const sorted = Object.entries(counts)
        .map(([id, count]) => ({
          id,
          label: LABEL_MAP[id] || id,
          count,
          color: COLOR_MAP[id] || '#999',
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      setAttributionData(sorted);
      setTotalUsersCount(total);
    } catch (error) {
      console.error('[Admin] Failed to fetch attribution data:', error);
      Alert.alert('Error', 'Failed to load analytics data.');
    } finally {
      setLoadingAttribution(false);
    }
  }, [isAdmin]);

  // 🌸 Scroll animation for wallpaper
  const wallpaperScrollY = useRef(new Animated.Value(0)).current;

  const loadSavedVerses = async (refreshAll = false) => {
    try {
      const savedVersesData = await userStorage.getRaw('savedBibleVerses');
      if (savedVersesData) {
        const verses = JSON.parse(savedVersesData);
        
        // First, immediately set the verses from storage (no API calls) - prevents crash
        setSavedVersesList(verses);
        
        // Update the stats count
        setUserStats(prev => ({
          ...prev,
          savedVerses: verses.length
        }));
        
        // Update stats in AsyncStorage
        const stats = await userStorage.getRaw('userStats');
        const userStatsData = stats ? JSON.parse(stats) : {};
        userStatsData.savedVerses = verses.length;
        await userStorage.setRaw('userStats', JSON.stringify(userStatsData));
        
        // Get preferred version
        const preferredVersion = await userStorage.getRaw('selectedBibleVersion') || 'nlt';
        setCurrentBibleVersion(preferredVersion);
        
        // Determine batch size - refresh all on version change, otherwise first 15
        const BATCH_SIZE = refreshAll ? verses.length : 15;
        console.log(`📖 Loading ${verses.length} saved verses (refreshing ${refreshAll ? 'ALL' : 'first 15'} in ${preferredVersion.toUpperCase()})`);
        
        const versesToFetch = verses.slice(0, BATCH_SIZE);
        const updatedVerses = [...verses];
        let refreshedCount = 0;
        
        // Fetch one by one with small delays to prevent overwhelming network
        for (let i = 0; i < versesToFetch.length; i++) {
          const verse = versesToFetch[i];
          try {
            if (verse.version === 'KEY_VERSES') continue;
            
            const { text, version } = await verseByReferenceService.getVerseByReference(
              verse.reference,
              preferredVersion
            );
              
            updatedVerses[i] = {
              ...verse,
              text: text,
              version: version.toLowerCase(),
              originalVersion: verse.originalVersion || verse.version,
            };
            refreshedCount++;
          } catch (fetchError) {
            console.log(`⚠️ Could not fetch verse:`, verse.reference);
          }
        }
        
        setSavedVersesList(updatedVerses);
        
        // Persist the updated verses back to storage so they remain in the new version
        if (refreshedCount > 0) {
          await userStorage.setRaw('savedBibleVerses', JSON.stringify(updatedVerses));
          console.log(`💾 Persisted ${refreshedCount} refreshed verses to storage`);
        }
        
        console.log(`✅ Loaded ${verses.length} saved verses`);
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
    await loadSavedVerses(true); // Refresh all to current version
    setRefreshingSavedVerses(false);
  };

  // Load current Bible version
  const loadCurrentBibleVersion = async () => {
    try {
      const version = await userStorage.getRaw('selectedBibleVersion') || 'nlt';
      setCurrentBibleVersion(version);
    } catch (error) {
      console.error('Error loading Bible version:', error);
    }
  };

  // Quick version that just loads from storage without API calls (for focus refresh)
  const loadSavedVersesQuick = async () => {
    try {
      const savedVersesData = await userStorage.getRaw('savedBibleVerses');
      if (savedVersesData) {
        const verses = JSON.parse(savedVersesData);
        setSavedVersesList(verses);
        
        // Update the stats count
        setUserStats(prev => ({
          ...prev,
          savedVerses: verses.length
        }));
        
        console.log(`📖 Quick loaded ${verses.length} saved verses (no API calls)`);
      } else {
        setSavedVersesList([]);
      }
    } catch (error) {
      console.error('Error quick loading saved verses:', error);
    }
  };

  // Show the streak modal with animations
  const showStreakModal = () => {
    streakVisibleRef.current = true;
    setShowStreakMilestone(true);
    
    // Reset animation values
    streakFireScale.setValue(0);
    streakFireFlicker.setValue(1);
    streakNumberScale.setValue(0);
    streakFadeIn.setValue(0);
    
    // Start entrance animations
    Animated.sequence([
      Animated.spring(streakFireScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.spring(streakNumberScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
    
    Animated.timing(streakFadeIn, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();
    
    // Start continuous fire flicker
    const flicker = () => {
      Animated.sequence([
        Animated.timing(streakFireFlicker, {
          toValue: 1.06,
          duration: 400 + Math.random() * 200,
          useNativeDriver: true,
        }),
        Animated.timing(streakFireFlicker, {
          toValue: 0.97,
          duration: 300 + Math.random() * 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (streakVisibleRef.current) flicker();
      });
    };
    flicker();
  };

  const loadAppStreak = async () => {
    try {
      const streakData = await AppStreakManager.trackAppOpen();
      setAppStreak(streakData.currentStreak);
      setStreakOpenDates(streakData.openDates || []);
      // Sync app streak into userStats via AchievementService so streak achievements trigger
      await AchievementService.setStat('appStreak', streakData.currentStreak);
      setUserStats(prev => ({
        ...prev,
        streak: streakData.currentStreak,
        appStreak: streakData.currentStreak,
      }));
      
      // Clear milestone flag if any
      if (streakData.milestoneReached) {
        await AppStreakManager.clearMilestoneFlag();
      }
      
      // Show streak modal once per day
      const today = new Date().toDateString();
      const lastShown = await userStorage.getRaw('fivefold_streak_modal_last_shown');
      if (lastShown !== today) {
        await userStorage.setRaw('fivefold_streak_modal_last_shown', today);
        showStreakModal();
      }
    } catch (error) {
      console.error('Error loading app streak:', error);
    }
  };

  // Helper function to check if a string looks like a Bible reference
  const isValidBibleReference = (ref) => {
    if (!ref || ref === 'Unknown Reference' || ref === 'My Thoughts') return false;
    // Check if it matches pattern like "Book Chapter:Verse" or "Book Chapter:Verse-Verse"
    const bibleRefPattern = /^[1-3]?\s*[A-Za-z]+\s+\d+:\d+(-\d+)?$/;
    return bibleRefPattern.test(ref.trim());
  };

  const loadJournalNotes = async () => {
    try {
      setJournalLoading(true);
      
      // Read from the CORRECT storage key: 'journalNotes' (where + button saves)
      const existingNotes = await userStorage.getRaw('journalNotes');
      const notes = existingNotes ? JSON.parse(existingNotes) : [];
      
      // Also merge any notes from verse_data (long-press notes)
      const verseNotes = await VerseDataManager.getAllNotes();
      
      // Combine both sources, dedupe by id
      const allNotes = [...notes];
      const existingIds = new Set(notes.map(n => n.id));
      verseNotes.forEach(vn => {
        if (!existingIds.has(vn.id)) {
          allNotes.push(vn);
        }
      });
      
      // Sort by creation date (newest first)
      allNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setJournalNotes(allNotes);
      console.log(`📖 Loaded ${allNotes.length} journal notes (${notes.length} from journalNotes, ${verseNotes.length} from verse_data)`);
      
      // Fetch verse texts only for notes with valid Bible references
      const verseTexts = {};
      for (const note of allNotes) {
        if (isValidBibleReference(note.verseReference)) {
          try {
            console.log(`📖 Fetching verse: ${note.verseReference}`);
            const preferredVersion = await userStorage.getRaw('selectedBibleVersion') || 'niv';
            const verseData = await verseByReferenceService.getVerseByReference(
              note.verseReference,
              preferredVersion
            );
            if (verseData && verseData.text) {
              verseTexts[note.id] = verseData.text;
            }
          } catch (error) {
            console.error(`Error fetching verse for ${note.verseReference}:`, error);
            // Keep existing text if already cached
            if (journalVerseTexts[note.id]) {
              verseTexts[note.id] = journalVerseTexts[note.id];
            }
          }
        } else {
          console.log(`📝 Skipping non-verse reference: ${note.verseReference}`);
        }
      }
      setJournalVerseTexts(verseTexts);
    } catch (error) {
      console.error('Error loading journal notes:', error);
      // Attempt a fallback from journalNotes directly
      try {
        const existingNotes = await userStorage.getRaw('journalNotes');
        if (existingNotes) {
          const notes = JSON.parse(existingNotes);
          if (notes && notes.length > 0) {
            setJournalNotes(notes);
            console.log(`📖 Fallback loaded ${notes.length} journal notes`);
          }
        }
      } catch (fallbackErr) {
        console.error('Error in fallback load:', fallbackErr);
      }
    }
    setJournalLoading(false);
  };

  // Quick version that just loads from storage without API calls (for focus refresh)
  const loadJournalNotesQuick = async () => {
    try {
      // Read from storage without making API calls
      const existingNotes = await userStorage.getRaw('journalNotes');
      const notes = existingNotes ? JSON.parse(existingNotes) : [];
      
      // Also merge any notes from verse_data (long-press notes)
      const verseNotes = await VerseDataManager.getAllNotes();
      
      // Combine both sources, dedupe by id
      const allNotes = [...notes];
      const existingIds = new Set(notes.map(n => n.id));
      verseNotes.forEach(vn => {
        if (!existingIds.has(vn.id)) {
          allNotes.push(vn);
        }
      });
      
      // Sort by creation date (newest first)
      allNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setJournalNotes(allNotes);
      console.log(`📖 Quick loaded ${allNotes.length} journal notes (no API calls)`);
    } catch (error) {
      console.error('Error quick loading journal notes:', error);
    }
  };

  const loadCustomHighlightNames = async () => {
    try {
      const names = await VerseDataManager.getHighlightNames();
      setCustomHighlightNames(names);
      console.log(`🏷️ Loaded custom highlight names:`, Object.keys(names).length);
    } catch (error) {
      console.error('Error loading custom highlight names:', error);
    }
  };

  const loadHighlightViewMode = async () => {
    try {
      const mode = await userStorage.getRaw('highlightViewMode');
      if (mode) {
        setHighlightViewMode(mode);
      }
    } catch (error) {
      console.error('Error loading highlight view mode:', error);
    }
  };

  const saveHighlightViewMode = async (mode) => {
    try {
      await userStorage.setRaw('highlightViewMode', mode);
      setHighlightViewMode(mode);
      hapticFeedback.light();
    } catch (error) {
      console.error('Error saving highlight view mode:', error);
    }
  };

  const loadHighlights = async () => {
    try {
      const allData = await VerseDataManager.getAllVerseData();
      const highlights = [];
      
      Object.entries(allData).forEach(([verseId, data]) => {
        if (data.highlights && data.highlights.length > 0) {
          const latestHighlight = data.highlights[data.highlights.length - 1];
          highlights.push({
            verseId,
            color: latestHighlight.color,
            verseReference: latestHighlight.verseReference || verseId,
            timestamp: latestHighlight.createdAt
          });
        }
      });
      
      setHighlightedVerses(highlights);
      
      // Also load custom highlight names and view preference
      await loadCustomHighlightNames();
      await loadHighlightViewMode();
      
      console.log(`🎨 Loaded ${highlights.length} highlighted verses`);
    } catch (error) {
      console.error('Error loading highlights:', error);
    }
  };

  // Helper function to format date smartly
  const formatSmartDate = (dateString) => {
    const taskDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time to compare dates only
    const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    const time = taskDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (taskDateOnly.getTime() === todayOnly.getTime()) {
      return `Today at ${time}`;
    } else if (taskDateOnly.getTime() === yesterdayOnly.getTime()) {
      return `Yesterday at ${time}`;
    } else {
      // Show readable date for older tasks
      const dateStr = taskDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: taskDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
      return `${dateStr} at ${time}`;
    }
  };

  const loadCompletedTasks = async () => {
    try {
      console.log('🔍 Loading completed tasks from AsyncStorage...');
      const storedTodos = await userStorage.getRaw('fivefold_todos');
      console.log('📦 Raw stored todos:', storedTodos);
      
      if (storedTodos) {
        const todos = JSON.parse(storedTodos);
        console.log('📋 Total todos:', todos.length);
        
        // Use the EXACT same logic as the History card
        const completedHistory = todos
          .filter(todo => todo.completed)
          .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
        
        console.log('✅ Completed tasks count:', completedHistory.length);
        console.log('✅ Completed tasks:', completedHistory);
        
        setCompletedTodosList(completedHistory);
        
        // Update userStats with actual count
        setUserStats(prev => ({
          ...prev,
          completedTasks: completedHistory.length
        }));
      } else {
        console.log('❌ No todos found in storage');
        setCompletedTodosList([]);
        setUserStats(prev => ({
          ...prev,
          completedTasks: 0
        }));
      }
    } catch (error) {
      console.error('❌ Error loading completed tasks:', error);
      setCompletedTodosList([]);
      setUserStats(prev => ({
        ...prev,
        completedTasks: 0
      }));
    }
  };

  // Load verses with full text for a specific color
  const loadVersesForColor = async (color) => {
    try {
      const versesInColor = highlightedVerses.filter(v => v.color === color);
      const versesWithText = [];
      
      for (const verse of versesInColor) {
        try {
          const verseData = await verseByReferenceService.getVerseByReference(verse.verseReference);
          // Extract text from the returned object
          const verseText = typeof verseData === 'string' ? verseData : (verseData?.text || 'Verse text not available');
          versesWithText.push({
            ...verse,
            text: verseText
          });
        } catch (error) {
          console.error(`Error fetching verse ${verse.verseReference}:`, error);
          versesWithText.push({
            ...verse,
            text: 'Verse text not available'
          });
        }
      }
      
      setHighlightVersesWithText(versesWithText);
      setSelectedHighlightColor(color);
      console.log(`📖 Loaded ${versesWithText.length} verses for color ${color}`);
    } catch (error) {
      console.error('Error loading verses for color:', error);
    }
  };

  // Group highlights by color
  const groupHighlightsByColor = () => {
    const grouped = {};
    highlightedVerses.forEach(verse => {
      if (!grouped[verse.color]) {
        grouped[verse.color] = [];
      }
      grouped[verse.color].push(verse);
    });
    return grouped;
  };

  // Default color names lookup
  const defaultColorNames = {
      // New bold colors (15 main colors)
      '#FFE135': 'Yellow', '#FF6B6B': 'Red', '#4DABF7': 'Blue', '#51CF66': 'Green',
      '#FFA94D': 'Orange', '#B197FC': 'Purple', '#F783AC': 'Pink', '#38D9A9': 'Teal',
      '#A9E34B': 'Lime', '#9775FA': 'Lavender', '#FFD43B': 'Gold', '#74C0FC': 'Sky',
      '#63E6BE': 'Mint', '#FFC078': 'Peach', '#DA77F2': 'Plum',
      // Legacy pastel colors (for backwards compatibility)
      '#FFF9C4': 'Yellow', '#C8E6C9': 'Green', '#BBDEFB': 'Blue', '#F8BBD0': 'Pink',
      '#FFE0B2': 'Orange', '#E1BEE7': 'Purple', '#FFCCCB': 'Red', '#B5EAD7': 'Mint',
      '#FFDAB9': 'Peach', '#E6E6FA': 'Lavender', '#D4F1A9': 'Lime', '#87CEEB': 'Sky',
      '#FFD1DC': 'Rose', '#C9DED4': 'Sage', '#FBCEB1': 'Apricot', '#C8A2C8': 'Lilac',
      '#FFF44F': 'Lemon', '#7FDBFF': 'Aqua', '#E0B0FF': 'Mauve', '#FFFDD0': 'Cream',
      '#B2DFDB': 'Teal', '#FFB3B3': 'Salmon', '#CCCCFF': 'Periwinkle', '#F7E7CE': 'Champagne',
      '#AFEEEE': 'Turquoise', '#FFE4E1': 'Blush', '#98FF98': 'Mint Green', '#89CFF0': 'Baby Blue',
      '#FFB6C1': 'Powder', '#FFFFCC': 'Butter', '#93E9BE': 'Seafoam', '#DA70D6': 'Orchid',
      '#FFD700': 'Honey', '#C1E1EC': 'Ice Blue', '#DE3163': 'Cherry', '#93C572': 'Pistachio',
      '#DDA0DD': 'Plum', '#FFCC00': 'Tangerine', '#F5DEB3': 'Sand', '#7FFFD4': 'Cyan',
      '#FF77FF': 'Magenta', '#FFDEAD': 'Melon', '#C4C3D0': 'Iris', '#FFE5B4': 'Gold',
      '#AFE1AF': 'Celadon', '#C9A0DC': 'Wisteria', '#FFEA00': 'Citrus', '#B0E0E6': 'Azure',
      '#F3E5AB': 'Vanilla', '#50C878': 'Emerald', '#9966CC': 'Amethyst', '#F0EAD6': 'Pearl',
      '#00A86B': 'Jade'
    };

  // Get color name from hex - checks custom names first, then default
  const getColorName = (hexColor) => {
    // Check for custom name first
    if (customHighlightNames[hexColor]) {
      return customHighlightNames[hexColor];
    }
    return defaultColorNames[hexColor] || 'Custom';
  };

  // Get the default name for a color (used in rename modal)
  const getDefaultColorName = (hexColor) => {
    return defaultColorNames[hexColor] || 'Custom';
  };

  // Handle renaming a highlight color
  const handleRenameHighlight = async () => {
    if (!renameHighlightColor || !renameHighlightText.trim()) return;
    
    try {
      hapticFeedback.success();
      await VerseDataManager.setHighlightName(renameHighlightColor, renameHighlightText.trim());
      
      // Update local state
      setCustomHighlightNames(prev => ({
        ...prev,
        [renameHighlightColor]: renameHighlightText.trim()
      }));
      
      setShowRenameHighlight(false);
      setRenameHighlightColor(null);
      setRenameHighlightText('');
    } catch (error) {
      console.error('Error renaming highlight:', error);
      Alert.alert('Error', 'Failed to rename highlight. Please try again.');
    }
  };

  // Reset highlight name to default
  const handleResetHighlightName = async (hexColor) => {
    try {
      hapticFeedback.light();
      await VerseDataManager.removeHighlightName(hexColor);
      
      // Update local state
      setCustomHighlightNames(prev => {
        const updated = { ...prev };
        delete updated[hexColor];
        return updated;
      });
    } catch (error) {
      console.error('Error resetting highlight name:', error);
    }
  };

  // PanResponders for interactive dismissal
  const savedVersesPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        console.log('📱 Saved Verses: Pan started');
      },
      onPanResponderMove: (_, gestureState) => {
        console.log('📱 Saved Verses: Dragging dy:', gestureState.dy);
        if (gestureState.dy > 0) {
          savedVersesSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('📱 Saved Verses: Released at dy:', gestureState.dy);
        if (gestureState.dy > 150) {
          console.log('📱 Saved Verses: Dismissing...');
          Animated.timing(savedVersesSlideAnim, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowSavedVerses(false);
          });
        } else {
          console.log('📱 Saved Verses: Bouncing back...');
          Animated.spring(savedVersesSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const journalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        console.log('📖 Journal: Pan started');
      },
      onPanResponderMove: (_, gestureState) => {
        console.log('📖 Journal: Dragging dy:', gestureState.dy);
        if (gestureState.dy > 0) {
          journalSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('📖 Journal: Released at dy:', gestureState.dy);
        if (gestureState.dy > 150) {
          console.log('📖 Journal: Dismissing...');
          Animated.timing(journalSlideAnim, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowJournal(false);
          });
        } else {
          console.log('📖 Journal: Bouncing back...');
          Animated.spring(journalSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const highlightsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        console.log('🎨 Highlights: Pan started');
      },
      onPanResponderMove: (_, gestureState) => {
        console.log('🎨 Highlights: Dragging dy:', gestureState.dy);
        if (gestureState.dy > 0) {
          highlightsSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('🎨 Highlights: Released at dy:', gestureState.dy);
        if (gestureState.dy > 150) {
          console.log('🎨 Highlights: Dismissing...');
          Animated.timing(highlightsSlideAnim, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setShowHighlights(false);
          });
        } else {
          console.log('🎨 Highlights: Bouncing back...');
          Animated.spring(highlightsSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const addJournalPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          addJournalSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          Animated.timing(addJournalSlideAnim, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setIsAddingEntry(false);
            setNewJournalNote({ reference: '', text: '' });
            addJournalSlideAnim.setValue(600);
          });
        } else {
          Animated.spring(addJournalSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)  ).current;
  
  // Logo animations
  const logoSpin = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  
  // Modal card animations
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(50)).current;
  const cardShimmer = useRef(new Animated.Value(0)).current;

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

  // Continuous logo animations
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

  // Reset states when modals close
  useEffect(() => {
    if (!showJournal) {
      setIsAddingEntry(false);
      setNewJournalNote({ reference: '', text: '' });
    }
  }, [showJournal]);

  // Ensure journal notes load whenever the journal modal opens
  useEffect(() => {
    if (showJournal) {
      loadJournalNotes();
    }
  }, [showJournal]);

  // Animate add journal entry modal
  useEffect(() => {
    if (isAddingEntry) {
      addJournalSlideAnim.setValue(600);
      Animated.spring(addJournalSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [isAddingEntry]);

  // Debug: Monitor showAddJournalNote state
  useEffect(() => {
    console.log('📝 showAddJournalNote changed to:', showAddJournalNote);
  }, [showAddJournalNote]);

  useEffect(() => {
    loadUserData();
    checkAiStatus();
    loadVibrationSetting();
    loadLiquidGlassSetting();
    loadCurrentBibleVersion();
    loadSavedVerses();
    loadAppStreak();
    loadJournalNotes();
    loadHighlights();
    loadCompletedTasks();
    startLogoAnimations();
  }, []);

  // Load auth-related data when user changes
  useEffect(() => {
    const loadAuthData = async () => {
      if (user) {
        try {
          const count = await getFriendCount(user.uid);
          setFriendCount(count);
        } catch (error) {
          console.error('Error loading friend count:', error);
        }
      } else {
        setFriendCount(0);
      }
      
      // Update profile from Firebase auth if available
      if (authUserProfile) {
        console.log('[Profile] Updating from auth profile:', authUserProfile);
        
        // Update display name
        if (authUserProfile.displayName) {
          setUserName(authUserProfile.displayName);
          setEditName(authUserProfile.displayName);
        }
        
        // Update country
        if (authUserProfile.country || authUserProfile.countryFlag || authUserProfile.countryCode) {
          // Look up flag from countries data if not stored
          let flag = authUserProfile.countryFlag || '';
          if (!flag && authUserProfile.countryCode) {
            const match = countries.find(c => c.code === authUserProfile.countryCode);
            if (match) flag = match.flag;
          }
          const countryObj = {
            code: authUserProfile.countryCode || '',
            name: authUserProfile.country || '',
            flag: flag,
          };
          setSelectedCountry(countryObj);
        }
        
        // Update profile picture - check auth first, fallback to AsyncStorage
        const storedProfile = await userStorage.getRaw('userProfile');
        const localProfile = storedProfile ? JSON.parse(storedProfile) : {};
        
        if (authUserProfile.profilePicture) {
          console.log('[Profile] Setting profile picture from auth:', authUserProfile.profilePicture);
          setProfilePicture(authUserProfile.profilePicture);
          localProfile.profilePicture = authUserProfile.profilePicture;
        } else if (localProfile.profilePicture) {
          // AuthContext doesn't have picture but AsyncStorage does - keep it
          console.log('[Profile] Auth missing profile picture, keeping AsyncStorage value:', localProfile.profilePicture);
          setProfilePicture(localProfile.profilePicture);
        }
        
        // Update local profile with Firebase data (but don't overwrite profilePicture if auth doesn't have it)
        if (authUserProfile.displayName) localProfile.name = authUserProfile.displayName;
        if (authUserProfile.country) localProfile.country = authUserProfile.country;
        if (authUserProfile.countryFlag) localProfile.countryFlag = authUserProfile.countryFlag;
        if (authUserProfile.countryCode) localProfile.countryCode = authUserProfile.countryCode;
        
        setUserProfile(localProfile);
        await userStorage.setRaw('userProfile', JSON.stringify(localProfile));
      }
    };
    loadAuthData();
  }, [user, authUserProfile]);

  // Start animations on mount
  useEffect(() => {
    startShimmerAnimation();
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

  // Listen for global "close all modals" event (e.g., when widget is tapped)
  useEffect(() => {
    const handleCloseAllModals = () => {
      console.log('📱 ProfileTab: Closing all modals (widget navigation)');
      setShowEditModal(false);
      setShowCountryPicker(false);
      setShowAchievements(false);
      setShowNotificationSettings(false);
      setShowSettingsModal(false);
      setShowBibleVersionModal(false);
      setShowLanguageModal(false);
      setShowVoicePickerModal(false);
      setShowSavedVerses(false);
      setShowAiChat(false);
      setShowThemeModal(false);
      setShowAboutModal(false);
      setShowBible(false);
      setShowStreakMilestone(false);
      setShowAddJournalNote(false);
      setShowHighlights(false);
      setShowRenameHighlight(false);
      setShowTasksDone(false);
      setShowJournal(false);
    };

    const subscription = DeviceEventEmitter.addListener('closeAllModals', handleCloseAllModals);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Force refresh all data when Profile tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('👤 Profile tab focused - refreshing all data');
      // Wrap each call in try-catch to prevent crashes
      const safeRefresh = async () => {
        try {
          await loadUserData();
        } catch (e) {
          console.error('Error loading user data:', e);
        }
        try {
          await loadSavedVersesQuick(); // Use quick version that doesn't refetch from API
        } catch (e) {
          console.error('Error loading saved verses:', e);
        }
        try {
          await loadAppStreak();
        } catch (e) {
          console.error('Error loading app streak:', e);
        }
        try {
          await loadJournalNotesQuick(); // Use quick version that doesn't refetch from API
        } catch (e) {
          console.error('Error loading journal notes:', e);
        }
        try {
          await loadHighlights();
        } catch (e) {
          console.error('Error loading highlights:', e);
        }
        try {
          await loadCompletedTasks();
        } catch (e) {
          console.error('Error loading completed tasks:', e);
        }
        try {
          const verified = await refreshEmailVerificationStatus();
          setEmailVerified(verified);
        } catch (e) {
          console.error('Error checking email verification:', e);
        }
      };
      safeRefresh();
    }, [])
  );

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

  // Refresh saved verses when modal becomes visible - refresh ALL to current version
  useEffect(() => {
    if (showSavedVerses) {
      console.log('📖 Saved verses modal opened, refreshing ALL verses to current version...');
      loadSavedVerses(true); // Pass true to refresh ALL verses to current version
    }
  }, [showSavedVerses]);

  // Refresh completed tasks when modal becomes visible
  useEffect(() => {
    if (showTasksDone) {
      console.log('✅ Tasks Done modal opened, refreshing data...');
      loadCompletedTasks();
    }
  }, [showTasksDone]);

  // Listen for task completion events
  useEffect(() => {
    const taskCompletedListener = DeviceEventEmitter.addListener('taskCompleted', () => {
      console.log('✅ Task completed event received, refreshing data...');
      loadCompletedTasks();
      loadUserData(); // Also refresh user stats
    });

    return () => {
      taskCompletedListener.remove();
    };
  }, []);

  // Listen for user data downloaded from cloud (after sign in)
  useEffect(() => {
    const userDataListener = DeviceEventEmitter.addListener('userDataDownloaded', async () => {
      console.log('☁️ User data downloaded from cloud, refreshing all data...');
      await loadUserData();
      await loadAppStreak();
      await loadSavedVerses();
      await loadJournalNotes();
      await loadHighlights();
      await loadCompletedTasks();
    });

    return () => {
      userDataListener.remove();
    };
  }, []);

  // Listen for Bible version changes and refresh all verse data
  useEffect(() => {
    const versionChangeListener = DeviceEventEmitter.addListener('bibleVersionChanged', async (newVersion) => {
      console.log('📖 Bible version changed to', newVersion, '- refreshing all verses...');
      
      // Refresh ALL saved verses in the new version (pass true for full refresh)
      await loadSavedVerses(true);
      
      // Refresh journal verse texts in the new version
      await loadJournalNotes();
      
      // If highlighting modal is open with a selected color, refresh those verses too
      if (selectedHighlightColor && highlightVersesWithText.length > 0) {
        const versesInColor = highlightedVerses.filter(v => v.color === selectedHighlightColor);
        const versesWithText = [];
        for (const verse of versesInColor) {
          try {
            const verseData = await verseByReferenceService.getVerseByReference(verse.verseReference, newVersion);
            const verseText = typeof verseData === 'string' ? verseData : (verseData?.text || 'Verse text not available');
            versesWithText.push({ ...verse, text: verseText });
          } catch (error) {
            versesWithText.push({ ...verse, text: 'Verse text not available' });
          }
        }
        setHighlightVersesWithText(versesWithText);
      }
      
      console.log('✅ All verses refreshed with new Bible version');
    });

    return () => {
      versionChangeListener.remove();
    };
  }, [selectedHighlightColor, highlightVersesWithText, highlightedVerses]);

  // Listen for cross-screen navigation events (from SavedVerses/Highlights screens)
  useEffect(() => {
    const openBibleListener = DeviceEventEmitter.addListener('openBibleFromScreen', ({ verseRef }) => {
      console.log('📖 Opening Bible from screen event:', verseRef);
      navigation.navigate('BibleReader', { verseRef });
    });

    const openAiChatListener = DeviceEventEmitter.addListener('openAiChatFromScreen', ({ text, reference }) => {
      console.log('🤖 Opening AI Chat from screen event:', reference);
      setVerseToInterpret({ text, reference });
      setTimeout(() => {
        setShowAiChat(true);
      }, 300);
    });

    return () => {
      openBibleListener.remove();
      openAiChatListener.remove();
    };
  }, []);

  const loadUserData = async () => {
    try {
      const storedStats = await getStoredData('userStats') || {};
      const storedProfile = await userStorage.getRaw('userProfile');
      
      // IMPORTANT: Read AuthContext cache directly from AsyncStorage instead of
      // using the authUserProfile closure, which can be STALE when called from
      // useFocusEffect (its useCallback has [] deps, so it captures the initial closure).
      // The @biblely_user_cache key is always kept up-to-date by AuthContext.
      let freshAuthProfile = authUserProfile;
      try {
        const authCacheStr = await userStorage.getRaw('@biblely_user_cache');
        if (authCacheStr) {
          const authCacheProfile = JSON.parse(authCacheStr);
          // Use the fresh cache if it has a display name (i.e., it's a valid profile)
          if (authCacheProfile && authCacheProfile.displayName) {
            freshAuthProfile = authCacheProfile;
          }
        }
      } catch (cacheError) {
        console.log('[Profile] Error reading auth cache, using closure value:', cacheError.message);
      }
      
      // Prioritize Firebase auth profile data if user is signed in
      if (freshAuthProfile && freshAuthProfile.displayName) {
        console.log('[Profile] Using Firebase auth profile:', freshAuthProfile.displayName);
        setUserName(freshAuthProfile.displayName);
        setEditName(freshAuthProfile.displayName);
        
        // Load isPublic setting (for global leaderboard visibility)
        if (freshAuthProfile.isPublic !== undefined) {
          setIsPublicProfile(freshAuthProfile.isPublic);
        } else {
          // Check the auth cache as fallback (already loaded above)
        }
        
        // Load profile picture - check multiple sources with fallback chain
        // Priority: 1) Auth cache (cloud URL), 2) AsyncStorage userProfile, 3) Legacy key
        let resolvedProfilePicture = null;
        
        if (freshAuthProfile.profilePicture) {
          console.log('[Profile] Using cloud profile picture from auth cache:', freshAuthProfile.profilePicture);
          resolvedProfilePicture = freshAuthProfile.profilePicture;
        }
        
        // Also check AsyncStorage userProfile - use whichever is a cloud URL, or whichever exists
        const localProfileData = storedProfile ? JSON.parse(storedProfile) : {};
        if (localProfileData.profilePicture) {
          if (!resolvedProfilePicture) {
            console.log('[Profile] Auth has no profile picture, using AsyncStorage:', localProfileData.profilePicture);
            resolvedProfilePicture = localProfileData.profilePicture;
          } else if (
            !resolvedProfilePicture.startsWith('http') && 
            localProfileData.profilePicture.startsWith('http')
          ) {
            // Prefer cloud URL over local file path
            console.log('[Profile] Preferring cloud URL from AsyncStorage:', localProfileData.profilePicture);
            resolvedProfilePicture = localProfileData.profilePicture;
          }
        }
        
        // Last resort: legacy storage key
        if (!resolvedProfilePicture) {
          const legacyPhoto = await getStoredData('profilePicture');
          if (legacyPhoto) {
            console.log('[Profile] Using legacy storage profile picture:', legacyPhoto);
            resolvedProfilePicture = legacyPhoto;
          }
        }
        
        if (resolvedProfilePicture) {
          setProfilePicture(resolvedProfilePicture);
        }
        
        // Also update local profile to match
        const localProfile = storedProfile ? JSON.parse(storedProfile) : {};
        localProfile.name = freshAuthProfile.displayName;
        if (freshAuthProfile.country) localProfile.country = freshAuthProfile.country;
        if (freshAuthProfile.countryFlag) localProfile.countryFlag = freshAuthProfile.countryFlag;
        if (freshAuthProfile.countryCode) localProfile.countryCode = freshAuthProfile.countryCode;
        // Preserve the best profile picture we found in the local profile
        if (resolvedProfilePicture) localProfile.profilePicture = resolvedProfilePicture;
        setUserProfile(localProfile);
        await userStorage.setRaw('userProfile', JSON.stringify(localProfile));

        // Rebuild selectedCountry with proper flag lookup
        if (freshAuthProfile.countryCode || freshAuthProfile.country) {
          let flag = freshAuthProfile.countryFlag || '';
          if (!flag && freshAuthProfile.countryCode) {
            const match = countries.find(c => c.code === freshAuthProfile.countryCode);
            if (match) flag = match.flag;
          }
          setSelectedCountry({
            code: freshAuthProfile.countryCode || '',
            name: freshAuthProfile.country || '',
            flag: flag,
          });
        }
      } else if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setUserProfile(profile);
        setUserName(profile.displayName || profile.name || 'Faithful Friend');
        setEditName(profile.displayName || profile.name || 'Faithful Friend');
        
        // Load profile picture - handle both cloud URLs and local files
        if (profile.profilePicture) {
          // Cloud URLs (https://) are always valid - use directly
          if (profile.profilePicture.startsWith('http://') || profile.profilePicture.startsWith('https://')) {
            console.log('[Profile] Using cloud profile picture URL:', profile.profilePicture);
            setProfilePicture(profile.profilePicture);
          } else {
            // Local file - check if it exists
            try {
              const fileInfo = await FileSystem.getInfoAsync(profile.profilePicture);
              if (fileInfo.exists) {
                setProfilePicture(profile.profilePicture);
                console.log('[Profile] Profile picture loaded:', profile.profilePicture);
              } else {
                // File doesn't exist - but DON'T clear it yet, could be a temporary issue
                // Only clear if we're certain the file path is invalid (not starting with file://)
                console.log('[Profile] Profile picture file not found:', profile.profilePicture);
                if (!profile.profilePicture.startsWith('file://')) {
                  console.log('[Profile] Invalid file path format, clearing');
                  setProfilePicture(null);
                  profile.profilePicture = null;
                  await userStorage.setRaw('userProfile', JSON.stringify(profile));
                } else {
                  // Still use the stored path - React Native Image component may handle it
                  console.log('[Profile] Keeping stored path, may be accessible later');
                  setProfilePicture(profile.profilePicture);
                }
              }
            } catch (fileError) {
              // On error, still try to use the stored path
              console.log('[Profile] Error checking profile picture, using stored path:', fileError.message);
              setProfilePicture(profile.profilePicture);
            }
          }
        }
        
        // Set country object from profile data
        if (profile.countryCode || profile.country) {
          // Look up flag from countries data if missing
          let flag = profile.countryFlag || '';
          if (!flag && profile.countryCode) {
            const match = countries.find(c => c.code === profile.countryCode);
            if (match) flag = match.flag;
          }
          if (!flag && profile.country) {
            const match = countries.find(c => c.name === profile.country);
            if (match) flag = match.flag;
          }
          const countryObj = {
            code: profile.countryCode || '',
            name: profile.country || '',
            flag: flag,
          };
          setSelectedCountry(countryObj);
        }
      } else {
        // Fallback to old data format
        const storedName = await getStoredData('userName') || 'Faithful Friend';
        const storedPhoto = await getStoredData('profilePicture');
        setUserName(storedName);
        setEditName(storedName);
        
        // Use old format photo - be tolerant of file check issues
        if (storedPhoto) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(storedPhoto);
            if (fileInfo.exists) {
              setProfilePicture(storedPhoto);
              console.log('[Profile] Old format profile picture loaded:', storedPhoto);
            } else if (storedPhoto.startsWith('file://')) {
              // Still try to use it - might work
              console.log('[Profile] Old format file not found but using path:', storedPhoto);
              setProfilePicture(storedPhoto);
            }
          } catch (e) {
            // On error, still try to use the stored photo
            console.log('[Profile] Error checking old photo, using anyway:', storedPhoto);
            setProfilePicture(storedPhoto);
          }
        }
      }

      // Load Bible version preferences
      const storedBibleVersion = await userStorage.getRaw('selectedBibleVersion');
      if (storedBibleVersion) {
        setSelectedBibleVersion(storedBibleVersion);
      } else {
        // Default to NIV if no version selected
        setSelectedBibleVersion('niv');
      }

      // Load weight unit preference
      const storedWeightUnit = await userStorage.getRaw('weightUnit');
      if (storedWeightUnit) {
        setWeightUnit(storedWeightUnit);
      } else {
        setWeightUnit('kg'); // Default to kg
      }

      // Load height unit preference
      const storedHeightUnit = await userStorage.getRaw('heightUnit');
      if (storedHeightUnit) {
        setHeightUnit(storedHeightUnit);
      } else {
        setHeightUnit('cm'); // Default to cm
      }
      
      // Load audio voice preference
      const audioSettings = bibleAudioService.getSettings();
      setAudioVoiceGender(audioSettings.voiceGender || 'female');
      
      // Load current voice name
      const voice = bibleAudioService.getCurrentVoice();
      if (voice) {
        const name = voice.name || voice.identifier?.split('.').pop()?.replace(/-/g, ' ') || 'Default';
        setCurrentVoiceName(name.charAt(0).toUpperCase() + name.slice(1));
      }

      const storedPurchasedVersions = await userStorage.getRaw('purchasedBibleVersions');
      if (storedPurchasedVersions) {
        setPurchasedVersions(JSON.parse(storedPurchasedVersions));
      }
      
      // ── Recalculate score from scratch to fix any inflation ──
      // This runs the proper recalculation on every profile load so stale
      // inflated values get corrected automatically.
      let correctTotal;
      try {
        correctTotal = await AchievementService.recalculateScore();
      } catch (e) {
        console.warn('[Profile] recalculateScore failed, falling back:', e.message);
        correctTotal = 0;
      }
      const level = AchievementService.getLevelFromPoints(correctTotal);
      
      // Get actual completed tasks count from todos
      const storedTodos = await userStorage.getRaw('fivefold_todos');
      let actualCompletedCount = 0;
      if (storedTodos) {
        const todos = JSON.parse(storedTodos);
        actualCompletedCount = todos.filter(todo => todo.completed).length;
      }
      
      // Load workout history count
      try {
        const workoutHistory = await WorkoutService.getWorkoutHistory();
        setWorkoutCount(workoutHistory ? workoutHistory.length : 0);
      } catch (e) {
        console.log('[Profile] Error loading workout history count:', e.message);
      }
      
      const mergedStats = {
        ...storedStats,                        // Base from stored stats (activity counters etc.)
        points: correctTotal,                  // Override with recalculated total
        totalPoints: correctTotal,             // Keep in sync
        level: level,                          // Always derive from points
        completedTasks: actualCompletedCount,  // Use actual count, not cached
      };
      setUserStats(mergedStats);

      // Load profile badges from stats (respecting per-badge toggles)
      const badgeTogglesRaw = await userStorage.getRaw('fivefold_badge_toggles');
      const badgeTogglesObj = badgeTogglesRaw ? JSON.parse(badgeTogglesRaw) : {};
      // Backward compat: check old key if no toggles saved yet
      if (!badgeTogglesRaw) {
        const oldBt = await userStorage.getRaw('fivefold_bluetick_enabled');
        badgeTogglesObj.verified = oldBt !== 'false';
      }
      setBluetickToggle(badgeTogglesObj.verified !== false);
      setCountryFlagToggle(badgeTogglesObj.country !== false);
      setStreakBadgeToggle(badgeTogglesObj.streak !== false);

      // Badges are gated ONLY by referrals + toggles — no achievement conditions
      const BADGE_REFERRAL_GATES = { country: null, streak: null, verified: 1, biblely: 70 };
      let refCount = 0;
      try { refCount = await getReferralCount(); } catch (_) {}
      const visibleBadges = AchievementService.PROFILE_BADGES.filter(b => {
        if (badgeTogglesObj[b.id] === false) return false;
        const req = BADGE_REFERRAL_GATES[b.id];
        if (req != null && refCount < req) return false;
        return true;
      });
      setEarnedBadges(visibleBadges);
      
      // Load selected streak animation
      const savedAnim = await userStorage.getRaw('fivefold_streak_animation');
      if (savedAnim) setSelectedStreakAnim(savedAnim);
      
      console.log(`📊 Profile loaded: ${correctTotal} points, Level ${level}, ${actualCompletedCount} completed tasks`);
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
        country: selectedCountry?.name || null,
        countryCode: selectedCountry?.code || null,
        countryFlag: selectedCountry?.flag || null,
        joinedDate: userProfile?.joinedDate || new Date().toISOString(),
      };
      
      console.log('Profile data to save:', profileData);
      
      await userStorage.setRaw('userProfile', JSON.stringify(profileData));
      setUserProfile(profileData);
      
      // Also save in old format for backwards compatibility
      await saveData('userName', editName);
      if (profilePicture) {
        await saveData('profilePicture', profilePicture);
      }
      
      // Sync to Firebase if user is signed in
      if (user) {
        try {
          const { updateAndSyncProfile } = await import('../services/userSyncService');
          await updateAndSyncProfile(user.uid, {
            displayName: editName,
            country: selectedCountry?.name || '',
            countryFlag: selectedCountry?.flag || '',
            countryCode: selectedCountry?.code || '',
          });
          console.log('[Profile] Synced profile changes to Firebase');
        } catch (syncError) {
          console.error('[Profile] Failed to sync to Firebase:', syncError);
        }
      }
      
      // Emit event to notify other components
      DeviceEventEmitter.emit('userNameChanged');
      
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
      console.log('[ProfilePhoto] Saving new profile picture:', imageUri);
      
      // Set state immediately for UI (show local file first for instant feedback)
      setProfilePicture(imageUri);
      hapticFeedback.photoCapture();
      
      let finalUri = imageUri;
      
      // If user is signed in, upload to Firebase Storage for cloud access
      if (user) {
        try {
          console.log('[ProfilePhoto] Uploading to Firebase Storage...');
          const { uploadProfilePicture } = await import('../services/storageService');
          const downloadURL = await uploadProfilePicture(user.uid, imageUri);
          finalUri = downloadURL;
          console.log('[ProfilePhoto] Upload successful:', downloadURL);
          
          // Update UI with cloud URL
          setProfilePicture(downloadURL);
          
          // Sync to Firestore so other users can see it
          const { updateAndSyncProfile } = await import('../services/userSyncService');
          await updateAndSyncProfile(user.uid, { profilePicture: downloadURL });
          console.log('[ProfilePhoto] Synced profile picture URL to Firestore');
          
          // Also update the AuthContext's cached profile so it's immediately available
          if (updateLocalProfile) {
            await updateLocalProfile({ profilePicture: downloadURL });
            console.log('[ProfilePhoto] Updated AuthContext profile cache');
          }
          
          // Notify other screens (HubTab etc.) that profile image changed
          DeviceEventEmitter.emit('profileImageChanged', { profilePicture: downloadURL });
        } catch (uploadError) {
          console.error('[ProfilePhoto] Upload failed, using local file:', uploadError);
          // Keep using local file if upload fails
          finalUri = imageUri;
          
          // CRITICAL: Still update AuthContext with local file URI so it doesn't
          // get overwritten by stale data when switching tabs
          if (updateLocalProfile) {
            await updateLocalProfile({ profilePicture: imageUri });
            console.log('[ProfilePhoto] Updated AuthContext with local file URI (upload failed)');
          }
          
          // Still notify other screens even on upload failure
          DeviceEventEmitter.emit('profileImageChanged', { profilePicture: imageUri });
        }
      }
      
      // Save to legacy storage for backwards compatibility
      await saveData('profilePicture', finalUri);
      
      // CRITICAL: Always save to userProfile (create if doesn't exist)
      let profile;
      const storedProfile = await userStorage.getRaw('userProfile');
      if (storedProfile) {
        profile = JSON.parse(storedProfile);
      } else {
        // Create new profile if it doesn't exist
        profile = {
          name: userName || 'Faithful Friend',
          joinedDate: new Date().toISOString(),
        };
      }
      
      // Update the profile picture with final URI (cloud URL if uploaded, local otherwise)
      profile.profilePicture = finalUri;
      
      // Save immediately and await completion
      await userStorage.setRaw('userProfile', JSON.stringify(profile));
      
      // Update local state to match
      setUserProfile(profile);
      
      console.log('[ProfilePhoto] Profile picture saved successfully:', finalUri);
    } catch (error) {
      console.error('[ProfilePhoto] Failed to save profile picture:', error);
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
      const setting = await userStorage.getRaw('fivefold_vibration');
      setVibrationEnabled(setting !== 'false');
    } catch (error) {
      console.log('Error loading vibration setting:', error);
    }
  };

  const handleVibrationToggle = async (enabled) => {
    setVibrationEnabled(enabled);
    await updateHapticsSetting(enabled);
  };

  const loadLiquidGlassSetting = async () => {
    try {
      const setting = await userStorage.getRaw('fivefold_liquidGlass');
      if (setting !== null) {
        const enabled = setting === 'true';
        setLiquidGlassEnabled(enabled);
        global.liquidGlassUserPreference = enabled;
      }
    } catch (error) {
      console.log('Error loading liquid glass setting:', error);
    }
  };

  const handleLiquidGlassToggle = async (enabled) => {
    setLiquidGlassEnabled(enabled);
    await userStorage.setRaw('fivefold_liquidGlass', enabled.toString());
    global.liquidGlassUserPreference = enabled;
    hapticFeedback.light();
    
    // Notify all components about the change
    DeviceEventEmitter.emit('liquidGlassChanged', enabled);
    console.log('💎 Broadcast: Liquid glass changed to', enabled);
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
      await userStorage.setRaw('selectedBibleVersion', versionId);
      
      // Close modal
      setShowBibleVersionModal(false);
      
      // Haptic feedback
      hapticFeedback.success();
      
      // Automatically refresh the app to reflect new Bible version
      console.log('🔄 Triggering FULL APP RELOAD for Bible version change to:', versionId);
      
      // Emit event to trigger full app reload (shows splash screen)
      DeviceEventEmitter.emit('bibleVersionChanged', versionId);
      console.log('📡 Broadcast: Bible version changed to', versionId);
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
        'Intelligent task scoring and Friend chat are powered by our secure cloud service.\n\n✅ Encrypted and secure\n✅ No credentials stored on device\n✅ Professional-grade security',
        [
          { text: 'Excellent!', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Failed to handle AI status:', error);
    }
  };

  // Handle navigation to specific Bible verse
  const handleNavigateToVerse = useCallback((verseRef) => {
    console.log('📖 ProfileTab: Navigating to verse:', verseRef);
    hapticFeedback.medium();
    setVerseReference(verseRef);
    setShowSavedVerses(false);
    // IMPORTANT: also close Highlights, otherwise Bible can open "behind" this modal
    // which makes the button appear broken.
    setShowHighlights(false);
    setSelectedHighlightColor(null);
    setHighlightVersesWithText([]);
    setTimeout(() => {
      setShowBible(true);
    }, 300);
  }, []);

  // Calculate level progress — uses AchievementService (300 pts per level)
  const getThresholdForLevel = (lvl) => AchievementService.getPointsForLevel(lvl);
  const POINTS_PER_LEVEL = 300;

  const currentPoints = Math.max(userStats.points || 0, 0);
  const currentLevelThreshold = getThresholdForLevel(userStats.level);
  const nextLevelPoints = POINTS_PER_LEVEL;
  const nextTarget = currentLevelThreshold + nextLevelPoints;
  const progress = Math.min(
    nextLevelPoints > 0 ? (currentPoints - currentLevelThreshold) / nextLevelPoints : 0,
    1
  );

  // Profile Header Component - defined as a render function (not a component)
  // to avoid remounting the Image on every parent re-render
  const ProfileHeader = () => {
    // Wrapper element chosen based on Liquid Glass support
    const WrapperElement = isLiquidGlassSupported ? LiquidGlassView : BlurView;
    const wrapperProps = isLiquidGlassSupported
      ? {
          interactive: true,
          effect: "clear",
          colorScheme: "system",
          tintColor: "rgba(255, 255, 255, 0.08)",
          style: styles.liquidGlassProfileCard,
        }
      : {
          intensity: 18,
          tint: isDark ? "dark" : "light",
          style: [styles.profileCard, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}15`
          }],
        };

    return (
      <WrapperElement {...wrapperProps}>
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
          <Image 
            source={{ uri: profilePicture }} 
            style={styles.profileImage}
            onError={() => {
              // Only log the error — do NOT clear the stored URL.
              // Transient network issues or slow loads should not permanently
              // nuke the user's profile picture from all local storage.
              // The URL in Firestore/AsyncStorage is still valid and will
              // work again on next load.
              console.log('[Profile] Image failed to load (may be transient):', profilePicture);
            }}
          />
        ) : (
          <MaterialIcons name="person" size={40} color="#FFFFFF" />
        )}
      </TouchableOpacity>
      
      <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Text style={[styles.userName, { color: textColor, ...textOutlineStyle }]}>
          {userName}{countryFlagToggle ? ` ${selectedCountry?.flag || '🌍'}` : ''}
        </Text>
        {/* Streak animation badge */}
        {streakBadgeToggle && (
          <LottieView
            source={
              selectedStreakAnim === 'fire2' ? require('../../assets/Fire2.json') :
              selectedStreakAnim === 'redcar' ? require('../../assets/Red-Car.json') :
              selectedStreakAnim === 'bulb' ? require('../../assets/Bulb Transparent.json') :
              selectedStreakAnim === 'amongus' ? require('../../assets/Loading 50 _ Among Us.json') :
              selectedStreakAnim === 'lightning' ? require('../../assets/Lightning.json') :
              require('../../assets/fire-animation.json')
            }
            autoPlay
            loop
            style={{ width: 26, height: 26, marginLeft: 2, marginTop: -2 }}
          />
        )}
        {/* Static badges (blue tick, biblely, etc.) */}
        {earnedBadges.map(badge => (
          badge.image ? (
            <Image
              key={badge.id}
              source={badge.image}
              style={{ width: 28, height: 28, marginLeft: 5, borderRadius: 7 }}
              resizeMode="contain"
            />
          ) : (
            <MaterialIcons
              key={badge.id}
              name={badge.icon}
              size={22}
              color={badge.color}
              style={{ marginLeft: 4 }}
            />
          )
        ))}
      </View>
        
        {/* Username with tap to copy */}
        {authUserProfile?.username ? (
          <TouchableOpacity
            onPress={async () => {
              await Clipboard.setStringAsync(`@${authUserProfile.username}`);
              hapticFeedback.light();
              Alert.alert('Copied!', 'Username copied to clipboard. Share it with friends so they can find you!');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4,
              paddingHorizontal: 12,
              paddingVertical: 4,
              backgroundColor: `${theme.primary}15`,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 14, color: theme.primary, fontWeight: '600' }}>
              @{authUserProfile.username}
            </Text>
            <MaterialIcons name="content-copy" size={14} color={theme.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ) : isAuthenticated && (
          <TouchableOpacity
            onPress={() => {
              setNewUsername('');
              setUsernameError('');
              setShowUsernameModal(true);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: `${theme.primary}20`,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.primary,
              borderStyle: 'dashed',
            }}
          >
            <MaterialIcons name="add" size={16} color={theme.primary} />
            <Text style={{ fontSize: 13, color: theme.primary, fontWeight: '600', marginLeft: 4 }}>
              Set Username
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Streak Display — tap to show streak modal */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            hapticFeedback.buttonPress();
            showStreakModal();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: `${theme.warning}20`,
            borderRadius: 20,
          }}
        >
          <LottieView
            source={
              selectedStreakAnim === 'fire2' ? require('../../assets/Fire2.json') :
              selectedStreakAnim === 'redcar' ? require('../../assets/Red-Car.json') :
              selectedStreakAnim === 'bulb' ? require('../../assets/Bulb Transparent.json') :
              selectedStreakAnim === 'amongus' ? require('../../assets/Loading 50 _ Among Us.json') :
              selectedStreakAnim === 'lightning' ? require('../../assets/Lightning.json') :
              require('../../assets/fire-animation.json')
            }
            autoPlay
            loop
            style={{ width: 28, height: 28, marginRight: 4 }}
          />
          <Text style={[{
            fontSize: 15,
            fontWeight: '700',
            color: theme.warning
          }]}>
            {appStreak} Day Streak
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.userLevel, { color: textSecondaryColor }]}>
        {t.level || 'Level'} {userStats.level}
      </Text>
      
      {/* Level Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={[styles.progressText, { color: textSecondaryColor }]}>
            {currentPoints.toLocaleString()} / {nextTarget.toLocaleString()} {t.points || 'points'}
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
      </WrapperElement>
    );
  };

  // Stats Grid Component
  const StatsGrid = () => {
    const WrapperElement = isLiquidGlassSupported ? LiquidGlassView : BlurView;
    const wrapperProps = isLiquidGlassSupported
      ? {
          interactive: true,
          effect: "clear",
          colorScheme: "system",
          tintColor: "rgba(255, 255, 255, 0.08)",
          style: styles.liquidGlassStatsCard,
        }
      : {
          intensity: 18,
          tint: isDark ? "dark" : "light",
          style: [styles.statsCard, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}15`
          }],
        };

    return (
      <WrapperElement {...wrapperProps}>
      <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>{t.yourJourney || 'Your Journey'}</Text>
      
      <View style={styles.statsGrid}>
        <AnimatedStatCard 
          style={[styles.statBox, { 
            backgroundColor: `${theme.primary}30`,
            borderColor: `${theme.primary}99`,
            borderWidth: 0.8,
            borderRadius: 16,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 1,
          }]}
          onPress={() => {
            hapticFeedback.light();
            navigation.navigate('GymHistory');
          }}
        >
          <MaterialIcons name="fitness-center" size={24} color={theme.primary} />
          <Text style={[styles.statValue, { color: textColor, ...textOutlineStyle }]}>
            {workoutCount}
          </Text>
          <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
            Workouts
          </Text>
        </AnimatedStatCard>
        
        <AnimatedStatCard 
          style={[styles.statBox, { 
            backgroundColor: `${theme.primary}30`,
            borderColor: `${theme.primary}99`,
            borderWidth: 0.8,
            borderRadius: 16,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 1,
          }]}
          onPress={() => {
            hapticFeedback.light();
            navigation.navigate('SavedVerses');
          }}
        >
          <MaterialIcons name="bookmark" size={24} color={theme.info} />
          <Text style={[styles.statValue, { color: textColor, ...textOutlineStyle }]}>
            {savedVersesList.length}
          </Text>
          <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
            {t.savedVerses || 'Saved Verses'}
          </Text>
        </AnimatedStatCard>
        
        <AnimatedStatCard
          style={[styles.statBox, { 
          backgroundColor: `${theme.primary}30`,
          borderColor: `${theme.primary}99`,
          borderWidth: 0.8,
          borderRadius: 16,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
          }]}
          onPress={() => {
            hapticFeedback.light();
            navigation.navigate('Highlights');
          }}
        >
          <MaterialIcons name="palette" size={24} color={theme.warning} />
          <Text style={[styles.statValue, { color: textColor, ...textOutlineStyle }]}>
            {highlightedVerses.length}
          </Text>
          <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
            {t.highlights || 'Highlights'}
          </Text>
        </AnimatedStatCard>
        
        <AnimatedStatCard
          style={[styles.statBox, { 
            backgroundColor: `${theme.primary}30`,
            borderColor: `${theme.primary}99`,
            borderWidth: 0.8,
            borderRadius: 16,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 1,
          }]}
          onPress={() => {
            hapticFeedback.light();
            navigation.navigate('Journal');
          }}
        >
          <MaterialIcons name="import-contacts" size={24} color={theme.info} />
          <Text style={[styles.statValue, { color: textColor, ...textOutlineStyle }]}>
            {journalNotes.length}
          </Text>
          <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
            {t.journal || 'Journal'}
          </Text>
        </AnimatedStatCard>
      </View>
      </WrapperElement>
    );
  };

  // Badges Section — compact card matching Settings/Customisation style
  const BadgesSection = () => (
    <AnimatedSettingsCard 
      style={styles.aboutCard}
      onPress={() => {
        hapticFeedback.achievement();
        navigation.navigate('Achievements');
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
        <View style={styles.settingLeft}>
          <MaterialIcons name="emoji-events" size={24} color={iconColor} />
          <Text style={[styles.aboutButtonText, { color: textColor, ...textOutlineStyle }]}>
            Achievements
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={iconColor} />
      </View>
    </AnimatedSettingsCard>
  );

  // Handle sync to cloud
  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    hapticFeedback.buttonPress();
    try {
      await performFullSync(user.uid);
      Alert.alert('Sync Complete', 'Your data has been synced to the cloud.');
    } catch (error) {
      Alert.alert('Sync Failed', 'Unable to sync data. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle save username
  const handleSaveUsername = async () => {
    if (!user) return;
    
    const trimmedUsername = newUsername.toLowerCase().trim();
    
    // Validate
    if (trimmedUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (trimmedUsername.length > 20) {
      setUsernameError('Username must be less than 20 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      setUsernameError('Only letters, numbers, and underscores allowed');
      return;
    }
    
    setCheckingUsername(true);
    setUsernameError('');
    
    try {
      // Check availability
      const isAvailable = await checkUsernameAvailability(trimmedUsername);
      if (!isAvailable) {
        setUsernameError('Username is already taken');
        setCheckingUsername(false);
        return;
      }
      
      // Save to Firebase
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // Reserve the username
      await setDoc(doc(db, 'usernames', trimmedUsername), {
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      
      // Update user profile
      await updateAndSyncProfile(user.uid, {
        username: trimmedUsername,
      });
      
      hapticFeedback.success();
      setShowUsernameModal(false);
      setNewUsername('');
      Alert.alert('Success!', `Your username is now @${trimmedUsername}. Friends can find you with this!`);
      
      // Refresh the auth profile
      if (authUserProfile) {
        // Force a re-fetch by triggering sync
        await performFullSync(user.uid);
      }
    } catch (error) {
      console.error('Error saving username:', error);
      setUsernameError('Failed to save username. Please try again.');
    } finally {
      setCheckingUsername(false);
    }
  };

  // Handle toggle leaderboard visibility
  const handleToggleLeaderboardVisibility = async (value) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to change leaderboard visibility.');
      return;
    }
    
    setIsPublicProfile(value);
    hapticFeedback.light();
    
    try {
      // Import and use the sync service
      const { toggleLeaderboardVisibility } = await import('../services/userSyncService');
      await toggleLeaderboardVisibility(user.uid, value);
      
      // Also update the local auth cache so it persists on navigation
      const authCache = await userStorage.getRaw('@biblely_user_cache');
      if (authCache) {
        const cachedProfile = JSON.parse(authCache);
        cachedProfile.isPublic = value;
        await userStorage.setRaw('@biblely_user_cache', JSON.stringify(cachedProfile));
      }
      
      console.log('[Profile] Leaderboard visibility updated:', value);
    } catch (error) {
      console.error('Error updating leaderboard visibility:', error);
      // Revert on error
      setIsPublicProfile(!value);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    }
  };

  // Handle reset points
  const handleResetPoints = () => {
    Alert.alert(
      'Reset Points',
      'Are you sure you want to reset all your points to 0? This will also reset your level to 1. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            hapticFeedback.buttonPress();
            try {
              // Reset local points
              await PrayerCompletionManager.resetPoints();
              await userStorage.setRaw('fivefold_userStats', JSON.stringify({
                ...JSON.parse(await userStorage.getRaw('fivefold_userStats') || '{}'),
                points: 0,
                level: 1,
                totalPoints: 0,
              }));
              const existingStats = await userStorage.getRaw('userStats');
              if (existingStats) {
                const parsed = JSON.parse(existingStats);
                parsed.totalPoints = 0;
                parsed.level = 1;
                await userStorage.setRaw('userStats', JSON.stringify(parsed));
              }

              // Reset in Firebase
              if (user?.uid) {
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('../config/firebase');
                await updateDoc(doc(db, 'users', user.uid), {
                  totalPoints: 0,
                  level: 1,
                });
              }

              // Update local state
              setUserStats(prev => ({ ...prev, totalPoints: 0, level: 1, points: 0 }));

              Alert.alert('Points Reset', 'Your points have been reset to 0 and your level is now 1.');
            } catch (error) {
              console.error('[ProfileTab] Failed to reset points:', error);
              Alert.alert('Error', 'Failed to reset points. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Referral System ──────────────────────────────────────
  const loadReferralInfo = useCallback(async () => {
    try {
      const info = await getReferralInfo();
      setReferralInfo(info);
    } catch (error) {
      console.error('[Referral] Error loading referral info:', error);
    }
  }, []);

  // Load referral info when settings modal opens
  useEffect(() => {
    if (showSettingsModal || showReferralModal) {
      loadReferralInfo();
    }
  }, [showSettingsModal, showReferralModal, loadReferralInfo]);

  const referralSubmitLock = useRef(false);
  const handleSubmitReferral = async () => {
    // Hard lock — prevents any double-tap even if React state hasn't re-rendered yet
    if (referralSubmitLock.current) return;
    referralSubmitLock.current = true;

    if (!referralUsername.trim() || referralUsername.trim().length < 3) {
      Alert.alert('Enter a Username', 'Please enter the username of the person who referred you (at least 3 characters).');
      referralSubmitLock.current = false;
      return;
    }

    setReferralLoading(true);
    try {
      const result = await submitReferral(referralUsername.trim());
      if (result.success) {
        Alert.alert('Referral Saved', result.message);
        setReferralUsername('');
        await loadReferralInfo();
        setShowReferralModal(false);
      } else {
        Alert.alert('Referral Failed', result.message);
      }
    } catch (error) {
      console.error('[Referral] Error submitting referral:', error);
      Alert.alert('Error', 'Something went wrong. Please try again later.');
    } finally {
      setReferralLoading(false);
      referralSubmitLock.current = false;
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to sign in again to access the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            hapticFeedback.buttonPress();
            setSigningOut(true);
            try {
              await signOut();
              // RootNavigator will automatically show Auth screen
            } catch (error) {
              setSigningOut(false);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };


  // Account Section - Cloud Sync and Sign Out
  const AccountSection = () => (
    <View style={{ marginTop: 12 }}>
      {/* Sign Out */}
      <AnimatedSettingsCard 
        style={styles.aboutCard}
        onPress={handleSignOut}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="logout" size={24} color={theme.error || '#EF4444'} />
            <View>
              <Text style={[styles.aboutButtonText, { color: textColor, ...textOutlineStyle }]}>
                Sign Out
              </Text>
              <Text style={[{ fontSize: 12, color: textSecondaryColor, marginTop: 2 }]}>
                {authUserProfile?.email || user?.email || 'Signed in'}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={iconColor} />
        </View>
      </AnimatedSettingsCard>
    </View>
  );

  // Customisation Button - sits above Settings
  const CustomisationButton = () => (
    <AnimatedSettingsCard 
      style={styles.aboutCard}
      onPress={() => {
        hapticFeedback.buttonPress();
        navigation.navigate('Customisation');
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
        <View style={styles.settingLeft}>
          <MaterialIcons name="palette" size={24} color={iconColor} />
          <Text style={[styles.aboutButtonText, { color: textColor, ...textOutlineStyle }]}>
            Customisation
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={iconColor} />
      </View>
    </AnimatedSettingsCard>
  );

  // Changes Button - sits between Settings and About
  const ChangesButton = () => (
    <AnimatedSettingsCard 
      style={styles.aboutCard}
      onPress={() => {
        hapticFeedback.buttonPress();
        setShowSettingsModal(true); // Open the settings modal
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
        <View style={styles.settingLeft}>
          <MaterialIcons name="settings" size={24} color={iconColor} />
          <Text style={[styles.aboutButtonText, { color: textColor, ...textOutlineStyle }]}>
            Settings
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={iconColor} />
      </View>
    </AnimatedSettingsCard>
  );

  // Legal Section - Privacy Policy, Terms of Service, Support
  const LegalSection = () => (
    <AnimatedSettingsCard style={styles.aboutCard}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <MaterialIcons name="gavel" size={20} color={iconColor} />
          <Text style={[styles.aboutButtonText, { color: textColor, ...textOutlineStyle, marginLeft: 10, fontSize: 16, fontWeight: '700' }]}>
            Legal
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { hapticFeedback.buttonPress(); setShowLegalModal('privacy'); }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          activeOpacity={0.6}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="privacy-tip" size={20} color={isDark ? '#A5B4FC' : '#6366F1'} />
            <Text style={{ color: textColor, fontSize: 15, marginLeft: 12, ...textOutlineStyle }}>Privacy Policy</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { hapticFeedback.buttonPress(); setShowLegalModal('terms'); }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          activeOpacity={0.6}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="description" size={20} color={isDark ? '#A5B4FC' : '#6366F1'} />
            <Text style={{ color: textColor, fontSize: 15, marginLeft: 12, ...textOutlineStyle }}>Terms of Service</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { hapticFeedback.buttonPress(); setShowLegalModal('support'); }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}
          activeOpacity={0.6}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="help-outline" size={20} color={isDark ? '#A5B4FC' : '#6366F1'} />
            <Text style={{ color: textColor, fontSize: 15, marginLeft: 12, ...textOutlineStyle }}>Support & FAQ</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={iconColor} />
        </TouchableOpacity>
      </View>
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
            'A Christian productivity app for faith and focus.\n\nVersion 1.0.47\n\nMade with \u2764\uFE0F for believers worldwide.'
          );
        }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 }}>
        <View style={styles.settingLeft}>
          <MaterialIcons name="info" size={24} color={iconColor} />
          <Text style={[styles.aboutButtonText, { color: textColor, ...textOutlineStyle }]}>
            About Biblely
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={iconColor} />
      </View>
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
      <View style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme || isSpidermanTheme || isFaithTheme || isSailormoonTheme || isBiblelyTheme) ? 'transparent' : theme.background }]}>
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
                  backgroundColor: 'transparent',
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
            <Text style={[styles.headerTitle, { color: textColor, ...textOutlineStyle }]}>{t.profile || 'Profile'}</Text>
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
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.background}
            progressViewOffset={130}
          />
        }
      >
        {/* Profile Header - called as function to avoid remounting on re-render */}
        {ProfileHeader()}
        
        {/* Stats Grid - called as function to avoid remounting on re-render */}
        {StatsGrid()}
        
        {/* Badges Section - called as function to avoid remounting on re-render */}
        {BadgesSection()}
        
        
        
        <CustomisationButton />
        <ChangesButton />
        <LegalSection />
        {/* AboutSection removed */}
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
            <Text style={[styles.modalTitle, { color: textColor, ...textOutlineStyle }]}>Edit Profile</Text>
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
              <Text style={[styles.editLabel, { color: textColor, ...textOutlineStyle }]}>Profile Picture</Text>
              
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
              <Text style={[styles.editLabel, { color: textColor, ...textOutlineStyle }]}>Display Name</Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: theme.card, color: textColor, borderColor: theme.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.editSection}>
              <Text style={[styles.editLabel, { color: textColor, ...textOutlineStyle }]}>Country</Text>
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
            <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 60 }}>
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

      {/* Achievements - now navigated via stack navigator for swipe-back support */}

      {/* Notification Settings Modal */}
      <NotificationSettings
        visible={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {/* Voice Picker Modal */}
      <VoicePickerModal
        visible={showVoicePickerModal}
        onClose={() => {
          setShowVoicePickerModal(false);
          // Refresh voice name after selection
          const voice = bibleAudioService.getCurrentVoice();
          if (voice) {
            const name = voice.name || voice.identifier?.split('.').pop()?.replace(/-/g, ' ') || 'Default';
            setCurrentVoiceName(name.charAt(0).toUpperCase() + name.slice(1));
          }
        }}
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
            <Text style={[styles.modalTitle, { color: modalTextColor }]}>Bible Version</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionHeader, { color: textColor, marginBottom: 15 }]}>
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
                    <Text style={[styles.versionName, { color: modalTextColor, fontSize: 16, fontWeight: '600' }]}>
                      {version.name}
                    </Text>
                    <Text style={[styles.versionAbbreviation, { color: modalTextSecondaryColor, fontSize: 14, marginTop: 2 }]}>
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
            <Text style={[styles.modalTitle, { color: modalTextColor }]}>{t.language}</Text>
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
                      <Text style={[styles.versionName, { color: modalTextColor, fontSize: 16, fontWeight: '600' }]}>
                        {lang.nativeName}
                      </Text>
                      <Text style={[styles.versionAbbreviation, { color: modalTextSecondaryColor, fontSize: 14, marginTop: 2 }]}>
                        {lang.name}
                      </Text>
                      {!isEnglish && (
                        <Text style={[styles.comingSoonText, { color: theme.primary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }]}>
                          Coming Soon
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isSelected && isEnglish && (
                      <MaterialIcons name="check-circle" size={24} color={theme.primary} style={{ marginRight: 8 }} />
                  )}
                    {!isEnglish && (
                      <MaterialIcons name="lock" size={20} color={theme.textTertiary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Set Username Modal */}
      <Modal
        visible={showUsernameModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: theme.background }}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowUsernameModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: modalTextColor }]}>Set Username</Text>
            <TouchableOpacity 
              onPress={handleSaveUsername}
              disabled={checkingUsername || !newUsername.trim()}
            >
              {checkingUsername ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[styles.modalSave, { 
                  color: newUsername.trim() ? theme.primary : theme.textTertiary 
                }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 15, color: modalTextSecondaryColor, marginBottom: 20, lineHeight: 22 }}>
              Choose a unique username so friends can find and add you. This cannot be changed later.
            </Text>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.card,
              borderRadius: 12,
              paddingHorizontal: 16,
              borderWidth: usernameError ? 2 : 1,
              borderColor: usernameError ? theme.error : theme.border,
            }}>
              <Text style={{ fontSize: 18, color: theme.primary, fontWeight: '600' }}>@</Text>
              <TextInput
                value={newUsername}
                onChangeText={(text) => {
                  setNewUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  setUsernameError('');
                }}
                placeholder="username"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
                maxLength={20}
                style={{
                  flex: 1,
                  fontSize: 18,
                  color: modalTextColor,
                  paddingVertical: 16,
                  marginLeft: 4,
                }}
              />
            </View>

            {usernameError ? (
              <Text style={{ color: theme.error, fontSize: 13, marginTop: 8 }}>
                {usernameError}
              </Text>
            ) : (
              <Text style={{ color: modalTextSecondaryColor, fontSize: 13, marginTop: 8 }}>
                3-20 characters. Letters, numbers, and underscores only.
              </Text>
            )}

            <View style={{
              marginTop: 24,
              padding: 16,
              backgroundColor: `${theme.primary}10`,
              borderRadius: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialIcons name="people" size={20} color={theme.primary} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: modalTextColor, marginLeft: 8 }}>
                  How it works
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: modalTextSecondaryColor, lineHeight: 20 }}>
                Friends can search for your username to send you a friend request. You'll appear on leaderboards with this name.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Loading Overlay for Language Change */}
      {isChangingLanguage && (
        <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: textColor, marginTop: 15 }]}>
              {t.changingLanguage}
            </Text>
          </View>
        </View>
      )}

      {/* Saved Verses - now navigated via stack navigator for swipe-back support */}
      {false && (
        <View style={{
          flex: 1,
          backgroundColor: theme.background
        }}>
            {/* Content - ScrollView starts from top */}
            <Animated.ScrollView 
              style={{ flex: 1 }} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
              paddingHorizontal: 16,
                paddingBottom: 40,
              }}
              onScroll={handleSavedVersesScroll}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingSavedVerses}
                  onRefresh={refreshSavedVerses}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              }
            >
              {/* Animated spacer that shrinks with search bar */}
              <Animated.View style={{
                height: savedVersesSearchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Platform.OS === 'ios' ? 115 : 95, Platform.OS === 'ios' ? 173 : 143],
                }),
              }} />
              {/* Stats Row */}
              {savedVersesList.length > 0 && (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: modalTextSecondaryColor,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    {(() => {
                      const filtered = savedVersesList.filter(v => {
                        if (!savedVersesSearch.trim()) return true;
                        const searchLower = savedVersesSearch.toLowerCase();
                        const text = (v.text || v.content || '').toLowerCase();
                        const ref = (v.reference || '').toLowerCase();
                        return text.includes(searchLower) || ref.includes(searchLower);
                      });
                      return `${filtered.length} ${filtered.length === 1 ? 'verse' : 'verses'}${savedVersesSearch ? ' found' : ''}`;
                    })()}
                  </Text>
                </View>
              )}

              {savedVersesList.length === 0 ? (
                <View style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 60
                }}>
                  <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: `${theme.primary}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20
                  }}>
                    <MaterialIcons name="bookmark-border" size={40} color={theme.primary} />
                  </View>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: modalTextColor,
                    marginBottom: 8
                  }}>
                    No Saved Verses Yet
                  </Text>
                  <Text style={{
                    fontSize: 15,
                    color: modalTextSecondaryColor,
                    textAlign: 'center',
                    lineHeight: 22
                  }}>
                    Tap the bookmark icon on any verse{'\n'}to save it for later
                  </Text>
                </View>
              ) : (
                // Filter and map verses
                (() => {
                  const filteredVerses = savedVersesList.filter(v => {
                    if (!savedVersesSearch.trim()) return true;
                    const searchLower = savedVersesSearch.toLowerCase();
                    const text = (v.text || v.content || '').toLowerCase();
                    const ref = (v.reference || '').toLowerCase();
                    return text.includes(searchLower) || ref.includes(searchLower);
                  });
                  
                  const sortedVerses = savedVersesSort === 'desc' ? [...filteredVerses].reverse() : filteredVerses;
                  
                  if (sortedVerses.length === 0 && savedVersesSearch) {
                    return (
                      <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 40
                      }}>
                        <MaterialIcons name="search-off" size={48} color={theme.textTertiary} />
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: modalTextSecondaryColor,
                          marginTop: 16
                        }}>
                          No results for "{savedVersesSearch}"
                        </Text>
                      </View>
                    );
                  }
                  
                  return sortedVerses.map((verse, index) => (
                    <View 
                      key={verse.id || index} 
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                        borderRadius: 20,
                        padding: 20,
                        marginBottom: 14,
                        shadowColor: theme.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: isDark ? 0.15 : 0.08,
                        shadowRadius: 12,
                        elevation: 4,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: 'rgba(255,255,255,0.08)'
                      }}
                    >
                      {/* Header Row */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 14
                      }}>
                        {/* Bookmark Icon */}
                        <View style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: `${theme.primary}15`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          <MaterialIcons name="bookmark" size={22} color={theme.primary} />
                        </View>
                        
                        {/* Reference and Version */}
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 17,
                            fontWeight: '700',
                            color: theme.primary,
                            letterSpacing: 0.3
                          }}>
                        {verse.reference}
                      </Text>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: modalTextTertiaryColor,
                            marginTop: 2,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}>
                        {currentBibleVersion?.toUpperCase() || verse.version?.toUpperCase() || 'NLT'}
                      </Text>
                    </View>
                      </View>
                      
                      {/* Verse Text */}
                      <Text style={{
                        fontSize: 16,
                        color: modalTextColor,
                        lineHeight: 26,
                        marginBottom: 18,
                        fontWeight: '500'
                      }}>
                      {verse.text || verse.content}
                    </Text>
                    
                      {/* Action Buttons Row */}
                      <View style={{
                        flexDirection: 'row',
                        gap: 10
                      }}>
                        {/* Remove Button */}
                      <TouchableOpacity
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: `${theme.error}15`,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onPress={() => {
                          hapticFeedback.light();
                            Alert.alert(
                              'Remove Saved Verse',
                              `Are you sure you want to remove "${verse.reference}" from your saved verses?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Remove',
                                  style: 'destructive',
                                  onPress: async () => {
                                    hapticFeedback.medium();
                          const newList = savedVersesList.filter(v => v.id !== verse.id);
                          setSavedVersesList(newList);
                          await userStorage.setRaw('savedBibleVerses', JSON.stringify(newList));
                          const stats = await userStorage.getRaw('userStats');
                          const userStats = stats ? JSON.parse(stats) : {};
                          userStats.savedVerses = newList.length;
                          await userStorage.setRaw('userStats', JSON.stringify(userStats));
                          setUserStats(userStats);
                                  }
                                }
                              ]
                            );
                        }}
                          activeOpacity={0.7}
                          delayPressIn={0}
                      >
                          <MaterialIcons name="delete-outline" size={20} color={theme.error} />
                      </TouchableOpacity>

                        {/* Discuss Button */}
                      <TouchableOpacity
                          style={{
                            flex: 1,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: theme.primary,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            shadowColor: theme.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8
                          }}
                        onPress={() => {
                          hapticFeedback.medium();
                          setVerseToInterpret({
                            text: verse.text || verse.content,
                            reference: verse.reference
                          });
                          setShowSavedVerses(false);
                            setSavedVersesSearch('');
                          setTimeout(() => {
                            setShowAiChat(true);
                          }, 300);
                        }}
                          activeOpacity={0.7}
                          delayPressIn={0}
                      >
                          <MaterialIcons name="forum" size={18} color="#FFFFFF" />
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: '#FFFFFF'
                          }}>
                            Discuss
                          </Text>
                      </TouchableOpacity>

                        {/* Go to Verse Button */}
                      <TouchableOpacity
                          style={{
                            flex: 1,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: theme.success,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            shadowColor: theme.success,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8
                          }}
                        onPress={() => {
                          handleNavigateToVerse(verse.reference);
                        }}
                          activeOpacity={0.7}
                          delayPressIn={0}
                      >
                          <MaterialIcons name="menu-book" size={18} color="#FFFFFF" />
                          <Text style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: '#FFFFFF'
                          }}>
                            Read
                          </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  ));
                })()
              )}
            </Animated.ScrollView>

            {/* Premium Transparent Header */}
            <BlurView 
              intensity={50} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
              }}
            >
              {/* Safe area spacer */}
              <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
              
              {/* Header content */}
              <View style={{ 
                paddingHorizontal: 16, 
                paddingBottom: 16,
              }}>
                {/* Top row with buttons */}
                <View style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                  {/* Close button */}
                <TouchableOpacity
                  onPress={() => {
                    setShowSavedVerses(false);
                    setSavedVersesSearch('');
                  }}
                  style={{ 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      paddingHorizontal: 18, 
                      paddingVertical: 10,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  }}
                  activeOpacity={0.7}
                >
                    <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
                  
                  {/* Title */}
                  <View style={{ alignItems: 'center' }}>
                <Text style={{ 
                  color: modalTextColor, 
                      fontSize: 17, 
                      fontWeight: '700',
                      letterSpacing: 0.3,
                }}>
                  Saved Verses
                </Text>
                    <View style={{ 
                      width: 60, 
                      height: 3, 
                      backgroundColor: theme.primary, 
                      borderRadius: 2,
                      marginTop: 6,
                    }} />
                  </View>
                  
                  {/* Sort button */}
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.light();
                    setSavedVersesSort(prev => prev === 'desc' ? 'asc' : 'desc');
                  }}
                  style={{ 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      paddingHorizontal: 14, 
                      paddingVertical: 10,
                      borderRadius: 22,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  }}
                  activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name={savedVersesSort === 'desc' ? 'arrow-downward' : 'arrow-upward'} 
                      size={14} 
                      color={theme.primary} 
                    />
                    <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>
                      {savedVersesSort === 'desc' ? 'New' : 'Old'}
                  </Text>
                </TouchableOpacity>
                </View>
                
                {/* Collapsible Search bar */}
                <Animated.View style={{
                  height: savedVersesSearchAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 58],
                  }),
                  opacity: savedVersesSearchAnim,
                  overflow: 'hidden',
                }}>
                  <View style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    marginTop: 16,
                  }}>
                    <MaterialIcons name="search" size={20} color={theme.textTertiary} />
                    <TextInput
                      value={savedVersesSearch}
                      onChangeText={setSavedVersesSearch}
                      placeholder="Search verses or references..."
                      placeholderTextColor={modalTextTertiaryColor}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: modalTextColor,
                        marginLeft: 10,
                        paddingVertical: 2,
                      }}
                    />
                    {savedVersesSearch.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSavedVersesSearch('')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MaterialIcons name="close" size={14} color={theme.text} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              </View>
            </BlurView>
        </View>
      )}

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
          }}>
            <TouchableOpacity 
              onPress={() => { setShowAddAccountModal(false); setShowSettingsModal(false); }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderRadius: 20,
              }}
            >
              <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '700', 
              color: modalTextColor,
              letterSpacing: 0.3,
            }}>Settings</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {/* REFERRAL SECTION */}
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: modalTextTertiaryColor,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              marginLeft: 4,
            }}>
              Referral
            </Text>
            <View style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
            }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  setShowSettingsModal(false);
                  setTimeout(() => setShowReferralModal(true), 300);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="person-add" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Referred By</Text>
                    <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>
                      {referralInfo.referredByUsername
                        ? `@${referralInfo.referredByUsername} referred you`
                        : 'Enter who referred you'}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* VERIFY EMAIL SECTION */}
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: modalTextTertiaryColor,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              marginLeft: 4,
            }}>
              Verification
            </Text>
            <View style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
            }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
                onPress={() => {
                  hapticFeedback.buttonPress();
                  if (!emailVerified) {
                    setShowSettingsModal(false);
                    setTimeout(() => navigation.navigate('EmailVerification', { fromSignup: false, maskedEmail: user?.email || '' }), 300);
                  }
                }}
                activeOpacity={emailVerified ? 1 : 0.7}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: emailVerified ? 'rgba(16,185,129,0.15)' : `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons
                      name={emailVerified ? 'verified' : 'shield'}
                      size={20}
                      color={emailVerified ? '#10B981' : '#E67E22'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>
                      {emailVerified ? 'Email Verified' : 'Verify Email'}
                    </Text>
                    <Text style={{ fontSize: 12, color: emailVerified ? '#10B981' : modalTextSecondaryColor, marginTop: 2 }}>
                      {emailVerified ? 'Your email is verified' : 'Tap to verify your email'}
                    </Text>
                  </View>
                </View>
                {emailVerified ? (
                  <MaterialIcons name="check-circle" size={22} color="#10B981" />
                ) : (
                  <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
                )}
              </TouchableOpacity>
            </View>

            {/* APPEARANCE SECTION */}
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: modalTextTertiaryColor,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              marginLeft: 4,
            }}>
              Appearance
            </Text>
            <View style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
            }}>
              {/* Theme — moved to Customisation screen */}
              {/* Liquid Glass Toggle */}
              {isLiquidGlassSupportedByDevice && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: `${theme.primary}20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="blur-on" size={20} color={theme.primary} />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Glass Effect</Text>
                  </View>
                  <Switch
                    value={liquidGlassEnabled}
                    onValueChange={handleLiquidGlassToggle}
                    trackColor={{ false: isDark ? '#333' : '#ddd', true: theme.primary }}
                    thumbColor="#fff"
                  />
                </View>
              )}
            </View>

            {/* CONTENT SECTION */}
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: modalTextTertiaryColor,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              marginLeft: 4,
            }}>
              Content
            </Text>
            <View style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
            }}>
              {/* Bible Version */}
            <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                  setTimeout(() => setShowBibleVersionModal(true), 300);
              }}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                <MaterialIcons name="menu-book" size={20} color={theme.primary} />
              </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Bible Version</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, color: modalTextSecondaryColor }}>
                  {getVersionById(selectedBibleVersion).abbreviation}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>
            
              {/* Language */}
            <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                  setTimeout(() => setShowLanguageModal(true), 300);
              }}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                <MaterialIcons name="language" size={20} color={theme.primary} />
              </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Language</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, color: modalTextSecondaryColor }}>
                  {availableLanguages.find(l => l.code === language)?.nativeName || 'English'}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>
            
              {/* Reading Voice - Single button that opens voice picker */}
            <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                setTimeout(() => setShowVoicePickerModal(true), 300);
              }}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                <MaterialIcons name="record-voice-over" size={20} color={theme.primary} />
              </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Reading Voice</Text>
                    <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>
                      {bibleAudioService.isUsingGoogleTTS() ? 'Google Neural (best quality)' : 'Device voice (offline)'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>
            </View>

            {/* PREFERENCES SECTION */}
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: modalTextTertiaryColor,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              marginLeft: 4,
            }}>
              Preferences
            </Text>
            <View style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
            }}>
              {/* Weight Unit */}
            <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}
              onPress={async () => {
                hapticFeedback.buttonPress();
                const newUnit = weightUnit === 'kg' ? 'lbs' : 'kg';
                setWeightUnit(newUnit);
                await userStorage.setRaw('weightUnit', newUnit);
                const storedProfile = await userStorage.getRaw('userProfile');
                if (storedProfile) {
                  const profile = JSON.parse(storedProfile);
                  profile.weightUnit = newUnit;
                  await userStorage.setRaw('userProfile', JSON.stringify(profile));
                }
              }}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                <MaterialIcons name="fitness-center" size={20} color={theme.primary} />
              </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Weight Unit</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, color: modalTextSecondaryColor }}>
                  {weightUnit.toUpperCase()}
                </Text>
                  <MaterialIcons name="sync" size={18} color={theme.textTertiary} />
              </View>
            </TouchableOpacity>

              {/* Height Unit */}
              <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}
                onPress={async () => {
                  hapticFeedback.buttonPress();
                  const newUnit = heightUnit === 'cm' ? 'ft' : 'cm';
                  setHeightUnit(newUnit);
                  await userStorage.setRaw('heightUnit', newUnit);
                  const storedProfile = await userStorage.getRaw('userProfile');
                  if (storedProfile) {
                    const profile = JSON.parse(storedProfile);
                    profile.heightUnit = newUnit;
                    await userStorage.setRaw('userProfile', JSON.stringify(profile));
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="straighten" size={20} color={theme.primary} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Height Unit</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, color: modalTextSecondaryColor }}>
                    {heightUnit === 'cm' ? 'CM' : 'FT'}
                  </Text>
                  <MaterialIcons name="sync" size={18} color={theme.textTertiary} />
                </View>
              </TouchableOpacity>

              {/* Haptic Feedback */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="vibration" size={20} color={theme.primary} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Haptics</Text>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={handleVibrationToggle}
                  trackColor={{ false: isDark ? '#333' : '#ddd', true: theme.primary }}
                  thumbColor="#fff"
              />
            </View>

              {/* Verse Popup */}
              <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}
                onPress={async () => {
                  hapticFeedback.buttonPress();
                  try {
                    const dismissType = await getStoredData('votd_dismiss_type');
                    if (dismissType) {
                      await saveData('votd_dismiss_type', null);
                      await saveData('votd_dismissed_date', null);
                      Alert.alert('Enabled', 'Verse of the Day popup will show again.');
                    } else {
                      Alert.alert('Already Enabled', 'The popup is already enabled.');
                    }
                  } catch (error) {
                    console.error('Error toggling verse popup:', error);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="stars" size={20} color={theme.primary} />
                </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Daily Verse Popup</Text>
              </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            
            {/* Notifications */}
            <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowNotificationSettings(true);
                setShowSettingsModal(false);
              }}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="notifications-none" size={20} color={theme.primary} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>Notifications</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
            </View>

            {/* DANGER ZONE */}
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#FF6B6B',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              marginLeft: 4,
            }}>
              Privacy
            </Text>
            <View style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
            }}>
              {/* Global Leaderboard Visibility */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="public" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: modalTextColor }}>
                      Show on Global Leaderboard
                    </Text>
                    <Text style={{ fontSize: 12, color: modalTextSecondaryColor, marginTop: 2 }}>
                      {isPublicProfile ? 'Others can see your ranking' : 'Your ranking is private'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isPublicProfile}
                  onValueChange={handleToggleLeaderboardVisibility}
                  trackColor={{ false: isDark ? '#333' : '#ddd', true: theme.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* ADMIN ANALYTICS - Only visible to admin */}
            {isAdmin && (
              <>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: theme.primary,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  marginLeft: 4,
                }}>
                  Admin
                </Text>
                <View style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: 16,
                  marginBottom: 24,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                    }}
                    onPress={() => {
                      hapticFeedback.buttonPress();
                      setShowSettingsModal(false);
                      setTimeout(() => {
                        setShowAdminAnalytics(true);
                        fetchAttributionData();
                      }, 300);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: `${theme.primary}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <MaterialIcons name="bar-chart" size={20} color={theme.primary} />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text }}>User Analytics</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ACCOUNTS SECTION */}
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: theme.textSecondary,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              marginLeft: 4,
            }}>
              Accounts
            </Text>

            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              {/* Linked accounts list */}
              {linkedAccounts.map((account, idx) => {
                const isCurrentAccount = account.uid === user?.uid;
                return (
                  <TouchableOpacity
                    key={account.uid}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      borderBottomWidth: idx < linkedAccounts.length - 1 ? 1 : 0,
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      opacity: switchingAccount && !isCurrentAccount ? 0.5 : 1,
                    }}
                    onPress={async () => {
                      if (isCurrentAccount || switchingAccount) return;
                      setSwitchTarget(account);
                      setShowSettingsModal(false);
                      try {
                        await switchAccount(account.uid);
                      } catch (err) {
                        setSwitchTarget(null);
                        const errMsg = err.message || '';
                        // If the stored password is wrong, prompt the user to re-enter it
                        if (errMsg.includes('invalid-credential') || errMsg.includes('wrong-password')) {
                          Alert.prompt(
                            'Re-enter Password',
                            `The stored password for @${account.username || account.email} is incorrect. Please enter the correct password.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Sign In',
                                onPress: async (password) => {
                                  if (!password || !password.trim()) return;
                                  try {
                                    await addLinkedAccount(account.email, password.trim(), null);
                                    setShowSettingsModal(false);
                                  } catch (retryErr) {
                                    Alert.alert('Switch Failed', retryErr.message || 'Could not switch account.');
                                  }
                                },
                              },
                            ],
                            'secure-text',
                            '',
                            'default'
                          );
                        } else {
                          Alert.alert('Switch Failed', errMsg || 'Could not switch account.');
                        }
                      }
                    }}
                    onLongPress={() => {
                      if (isCurrentAccount) return;
                      Alert.alert(
                        'Remove Account',
                        `Remove @${account.username || account.email} from this device? You can add it back later.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await unlinkAccount(account.uid);
                              } catch (err) {
                                Alert.alert('Error', err.message);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    activeOpacity={isCurrentAccount ? 1 : 0.7}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      {account.profilePicture ? (
                        <Image
                          source={{ uri: account.profilePicture }}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            borderWidth: isCurrentAccount ? 2 : 0,
                            borderColor: theme.primary,
                          }}
                        />
                      ) : (
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: isCurrentAccount ? `${theme.primary}30` : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: isCurrentAccount ? 2 : 0,
                          borderColor: theme.primary,
                        }}>
                          <MaterialIcons name="person" size={20} color={isCurrentAccount ? theme.primary : theme.textSecondary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: isCurrentAccount ? '600' : '400', color: theme.text }}>
                          {account.username ? `@${account.username}` : account.email}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>
                          {isCurrentAccount ? 'Active' : 'Tap to switch'}
                        </Text>
                      </View>
                    </View>
                    {isCurrentAccount ? (
                      <MaterialIcons name="check-circle" size={22} color={theme.primary} />
                    ) : (
                      <MaterialIcons name="swap-horiz" size={20} color={theme.textTertiary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Add account button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderTopWidth: linkedAccounts.length > 0 ? 1 : 0,
                  borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }}
                onPress={() => {
                  setAddAccountEmail('');
                  setAddAccountPassword('');
                  setCurrentAccountPassword('');
                  setAddAccountError('');
                  setShowAddAccountModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: `${theme.primary}20`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="person-add" size={20} color={theme.primary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: theme.primary }}>Add Account</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>Sign into another account</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>

            {/* SIGN OUT */}
            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderRadius: 16,
              marginBottom: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
                onPress={() => {
                  setShowSettingsModal(false);
                  setTimeout(() => handleSignOut(), 300);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="logout" size={20} color={theme.error || '#EF4444'} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: theme.error || '#EF4444' }}>Sign Out</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                      {authUserProfile?.email || user?.email || 'Signed in'}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={theme.error || '#EF4444'} />
              </TouchableOpacity>
            </View>

            {/* DANGER ZONE SECTION */}
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#FF3B30',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 12,
              marginLeft: 4,
            }}>
              Danger Zone
            </Text>

            <View style={{
              backgroundColor: 'rgba(255, 59, 48, 0.1)',
              borderRadius: 16,
              marginBottom: 40,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255, 59, 48, 0.2)',
            }}>
            {/* Fix Score */}
            <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 59, 48, 0.15)',
                }}
              onPress={async () => {
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                try {
                  const correctedPoints = await AchievementService.recalculateScore();
                  const correctedLevel = AchievementService.getLevelFromPoints(correctedPoints);
                  setUserStats(prev => ({ ...prev, totalPoints: correctedPoints, points: correctedPoints, level: correctedLevel }));
                  Alert.alert('Score Fixed', `Your score has been recalculated to ${correctedPoints.toLocaleString()} points.`);
                } catch (err) {
                  Alert.alert('Error', 'Failed to fix score. Please try again.');
                }
              }}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(52, 199, 89, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="auto-fix-high" size={20} color="#34C759" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#34C759' }}>Fix Score</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#34C759" />
            </TouchableOpacity>
            {/* Reset Points */}
            <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 59, 48, 0.15)',
                }}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                setTimeout(() => handleResetPoints(), 300);
              }}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255, 149, 0, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="restart-alt" size={20} color="#FF9500" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#FF9500' }}>Reset Points</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#FF9500" />
            </TouchableOpacity>
            {/* Delete Account */}
            <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                }}
              onPress={() => {
                hapticFeedback.buttonPress();
                setShowSettingsModal(false);
                setTimeout(() => {
                  Alert.prompt(
                    'Delete Account',
                    'Enter your password to permanently delete your account and all data. This cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        style: 'destructive',
                        onPress: async (password) => {
                          if (!password) {
                            Alert.alert('Error', 'Password is required to delete account.');
                            return;
                          }
                          try {
                            hapticFeedback.buttonPress();
                            await deleteAccount(password);
                          } catch (error) {
                            console.error('Delete account error:', error);
                            if (error.message === 'WRONG_PASSWORD') {
                              Alert.alert('Incorrect Password', 'The password you entered is incorrect. Please try again.');
                            } else if (error.message === 'PASSWORD_REQUIRED') {
                              Alert.alert('Password Required', 'Please enter your password to delete your account.');
                            } else if (error.message === 'NO_EMAIL') {
                              Alert.alert('Cannot Delete', 'This account was created with a social login. Please contact support to delete your account.');
                            } else if (error.message === 'TOO_MANY_ATTEMPTS') {
                              Alert.alert('Too Many Attempts', 'You have tried too many times. Please wait a few minutes and try again.');
                            } else {
                              Alert.alert('Error', 'Failed to delete account. Please try again later.');
                            }
                          }
                        }
                      }
                    ],
                    'secure-text',
                    '',
                    'default'
                  );
                }, 300);
              }}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255, 59, 48, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="delete-outline" size={20} color="#FF3B30" />
              </View>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#FF3B30' }}>Delete Account</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#FF3B30" />
            </TouchableOpacity>
            </View>
          </ScrollView>

          {/* ADD ACCOUNT OVERLAY - absolute positioned on top of settings */}
          {showAddAccountModal && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: theme.background,
                zIndex: 100,
              }}
            >
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }}>
                <TouchableOpacity
                  onPress={() => setShowAddAccountModal(false)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700', color: modalTextColor, letterSpacing: 0.3 }}>Add Account</Text>
                <View style={{ width: 60 }} />
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 24, lineHeight: 20 }}>
                  Sign into another account to switch between them quickly. Your current account's data will be saved.
                </Text>

                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Sign in to account
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    color: theme.text,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  }}
                  placeholder="Email"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={addAccountEmail}
                  onChangeText={setAddAccountEmail}
                />
                <TextInput
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    color: theme.text,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  }}
                  placeholder="Password"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry
                  value={addAccountPassword}
                  onChangeText={setAddAccountPassword}
                  autoCapitalize="none"
                />

                {addAccountError ? (
                  <Text style={{ fontSize: 14, color: theme.error || '#EF4444', marginBottom: 16 }}>
                    {addAccountError}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    opacity: addAccountLoading ? 0.6 : 1,
                  }}
                  disabled={addAccountLoading || !addAccountEmail.trim() || !addAccountPassword.trim()}
                  onPress={async () => {
                    setAddAccountError('');
                    setAddAccountLoading(true);
                    try {
                      await addLinkedAccount(
                        addAccountEmail.trim(),
                        addAccountPassword.trim(),
                        null
                      );
                      setShowAddAccountModal(false);
                      setShowSettingsModal(false);
                    } catch (err) {
                      setAddAccountError(err.message || 'Failed to add account.');
                    } finally {
                      setAddAccountLoading(false);
                    }
                  }}
                >
                  {addAccountLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign In & Switch</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

        </View>
      </Modal>

      {/* Referral Modal */}
      <Modal visible={showReferralModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView 
          style={{ flex: 1, backgroundColor: theme.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
          }}>
            <TouchableOpacity 
              onPress={() => {
                setShowReferralModal(false);
                setReferralUsername('');
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderRadius: 20,
              }}
            >
              <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '700', 
              color: theme.text,
              letterSpacing: 0.3,
            }}>Referral</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* If already referred — show who referred them */}
            {referralInfo.referredByUsername ? (
              <View style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
                marginBottom: 24,
              }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: `${theme.primary}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <MaterialIcons name="person" size={32} color={theme.primary} />
                </View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: theme.text,
                  marginBottom: 6,
                }}>
                  {referralInfo.referredByDisplayName || referralInfo.referredByUsername} referred you
                </Text>
                <Text style={{
                  fontSize: 15,
                  color: theme.textSecondary,
                  marginBottom: 4,
                }}>
                  @{referralInfo.referredByUsername}
                </Text>
                {referralInfo.referralDate && (
                  <Text style={{
                    fontSize: 13,
                    color: theme.textTertiary || theme.textSecondary,
                    marginTop: 8,
                  }}>
                    Referred on {referralInfo.referralDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                )}
              </View>
            ) : (
              /* No referrer yet — show input form */
              <>
                <View style={{
                  backgroundColor: theme.card,
                  borderRadius: 16,
                  padding: 24,
                  marginBottom: 16,
                }}>
                  <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: `${theme.primary}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    alignSelf: 'center',
                  }}>
                    <MaterialIcons name="person-add" size={28} color={theme.primary} />
                  </View>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: theme.text,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}>
                    Who referred you?
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: theme.textSecondary,
                    textAlign: 'center',
                    lineHeight: 20,
                    marginBottom: 24,
                  }}>
                    If someone invited you to Biblely, enter their username below to give them credit. This can only be set once.
                  </Text>

                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  }}>
                    <Text style={{ fontSize: 18, color: theme.textSecondary, marginRight: 4 }}>@</Text>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 16,
                        color: theme.text,
                        paddingVertical: 14,
                      }}
                      placeholder="Enter their username"
                      placeholderTextColor={theme.textTertiary || theme.textSecondary}
                      value={referralUsername}
                      onChangeText={(text) => setReferralUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={20}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmitReferral}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: referralUsername.trim().length >= 3 ? theme.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 24,
                    opacity: referralLoading ? 0.7 : 1,
                  }}
                  onPress={handleSubmitReferral}
                  disabled={referralLoading || referralUsername.trim().length < 3}
                  activeOpacity={0.8}
                >
                  {referralLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: referralUsername.trim().length >= 3 ? '#fff' : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'),
                    }}>
                      Submit Referral
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Info card */}
                <View style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 10 }}>
                    How referrals work
                  </Text>
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <MaterialIcons name="check-circle" size={16} color={theme.primary} style={{ marginTop: 1 }} />
                      <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                        Both your email and the referrer's email must be verified
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <MaterialIcons name="check-circle" size={16} color={theme.primary} style={{ marginTop: 1 }} />
                      <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                        You can only set your referrer once — it cannot be changed
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <MaterialIcons name="check-circle" size={16} color={theme.primary} style={{ marginTop: 1 }} />
                      <Text style={{ fontSize: 13, color: theme.textSecondary, flex: 1, lineHeight: 18 }}>
                        Referrals cannot go both ways between two people
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Referral count — always show */}
            {referralInfo.referralCount > 0 && (
              <View style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 20,
                marginTop: referralInfo.referredByUsername ? 0 : 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${theme.primary}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <MaterialIcons name="group" size={24} color={theme.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>
                    {referralInfo.referralCount}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                    {referralInfo.referralCount === 1 ? 'person joined through you' : 'people joined through you'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Admin Analytics Modal */}
      <Modal visible={showAdminAnalytics} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: isDark ? '#111' : '#F5F5F7' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
            backgroundColor: isDark ? '#111' : '#F5F5F7',
          }}>
            <TouchableOpacity onPress={() => setShowAdminAnalytics(false)} style={{ padding: 4 }}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>User Analytics</Text>
            <TouchableOpacity onPress={fetchAttributionData} style={{ padding: 4 }}>
              <MaterialIcons name="refresh" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {/* Total Users Card */}
            <View style={{
              backgroundColor: isDark ? '#1C1C1E' : '#FFF',
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Total Users</Text>
              <Text style={{ fontSize: 48, fontWeight: '800', color: theme.primary }}>{totalUsersCount}</Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>
                {attributionData ? `${attributionData.reduce((sum, d) => sum + d.count, 0)} answered "How did you find us?"` : ''}
              </Text>
            </View>

            {/* Attribution Chart */}
            <View style={{
              backgroundColor: isDark ? '#1C1C1E' : '#FFF',
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 }}>Where Users Come From</Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 20 }}>Based on onboarding responses</Text>

              {loadingAttribution ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 14 }}>Loading analytics...</Text>
                </View>
              ) : attributionData && attributionData.length > 0 ? (
                <>
                  {/* Bar Chart */}
                  {attributionData.map((item, index) => {
                    const maxCount = attributionData[0]?.count || 1;
                    const barWidth = Math.max((item.count / maxCount) * 100, 8);
                    return (
                      <View key={item.id} style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                            {index === 0 ? '👑 ' : ''}{item.label}
                          </Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: item.color }}>
                            {item.count} ({item.percentage}%)
                          </Text>
                        </View>
                        <View style={{
                          height: 28,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          borderRadius: 14,
                          overflow: 'hidden',
                        }}>
                          <View style={{
                            height: '100%',
                            width: `${barWidth}%`,
                            backgroundColor: item.color,
                            borderRadius: 14,
                            justifyContent: 'center',
                            paddingLeft: 10,
                          }}>
                            {barWidth > 25 && (
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>{item.count} users</Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {/* Top Source Highlight */}
                  {attributionData.length > 0 && (
                    <View style={{
                      marginTop: 16,
                      padding: 16,
                      backgroundColor: `${attributionData[0].color}15`,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: `${attributionData[0].color}30`,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      <MaterialIcons name="trending-up" size={24} color={attributionData[0].color} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>
                          Top Source: {attributionData[0].label}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          {attributionData[0].percentage}% of users who answered found you here. Focus your advertising here.
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <MaterialIcons name="analytics" size={48} color={theme.textSecondary} />
                  <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 14, textAlign: 'center' }}>
                    No attribution data yet.{'\n'}Users will see "How did you find us?" during onboarding.
                  </Text>
                </View>
              )}
            </View>

            {/* Breakdown Table */}
            {attributionData && attributionData.length > 0 && (
              <View style={{
                backgroundColor: isDark ? '#1C1C1E' : '#FFF',
                borderRadius: 20,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 16 }}>Detailed Breakdown</Text>
                
                {/* Table Header */}
                <View style={{ flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Source</Text>
                  <Text style={{ width: 60, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Users</Text>
                  <Text style={{ width: 60, fontSize: 12, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Share</Text>
                </View>

                {attributionData.map((item, index) => (
                  <View key={item.id} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index < attributionData.length - 1 ? 1 : 0,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                      <Text style={{ fontSize: 14, fontWeight: index === 0 ? '700' : '500', color: theme.text }}>{item.label}</Text>
                    </View>
                    <Text style={{ width: 60, fontSize: 14, fontWeight: '600', color: theme.text, textAlign: 'center' }}>{item.count}</Text>
                    <Text style={{ width: 60, fontSize: 14, fontWeight: '600', color: item.color, textAlign: 'right' }}>{item.percentage}%</Text>
                  </View>
                ))}

                {/* Not Answered Row */}
                {totalUsersCount > 0 && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    marginTop: 4,
                    borderTopWidth: 1,
                    borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isDark ? '#555' : '#CCC' }} />
                      <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary, fontStyle: 'italic' }}>Didn't answer</Text>
                    </View>
                    <Text style={{ width: 60, fontSize: 14, fontWeight: '600', color: theme.textSecondary, textAlign: 'center' }}>
                      {totalUsersCount - attributionData.reduce((sum, d) => sum + d.count, 0)}
                    </Text>
                    <Text style={{ width: 60, fontSize: 14, fontWeight: '600', color: theme.textSecondary, textAlign: 'right' }}>
                      {Math.round(((totalUsersCount - attributionData.reduce((sum, d) => sum + d.count, 0)) / totalUsersCount) * 100)}%
                    </Text>
                  </View>
                )}
              </View>
            )}
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
          onNavigateToBible={handleNavigateToVerse}
        />
      )}

      {/* Bible Reader Modal */}
      <BibleReader
        visible={showBible}
        onClose={() => {
          setShowBible(false);
          setVerseReference(null);
        }}
        initialVerseReference={verseReference}
      />

      {/* Journal - now navigated via stack navigator for swipe-back support */}
      {false && (
        <View style={{
          flex: 1,
          backgroundColor: theme.background
        }}>
            <LinearGradient
              colors={isDark ? ['#1a1a1a', '#000000'] : ['#fdfbfb', '#ebedee']}
              style={StyleSheet.absoluteFill}
            />
            
            {/* Journal Calendar View */}
            <ScrollView 
              style={{ flex: 1 }} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                paddingBottom: 120,
                paddingTop: Platform.OS === 'ios' ? 130 : 100,
              }}
              scrollEventThrottle={16}
            >
              {journalLoading ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="hourglass-bottom" size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
                    Loading your notes...
                  </Text>
                </View>
              ) : (
                <JournalCalendar
                  journalNotes={journalNotes}
                  journalVerseTexts={journalVerseTexts}
                  onDeleteNote={async (noteId) => {
                    hapticFeedback.light();
                    const raw = await userStorage.getRaw('journalNotes');
                    const allNotes = raw ? JSON.parse(raw) : [];
                    const remaining = allNotes.filter(n => n.id !== noteId);
                    await userStorage.setRaw('journalNotes', JSON.stringify(remaining));
                    setJournalNotes(remaining);
                  }}
                  onAddEntry={() => setIsAddingEntry(true)}
                  theme={theme}
                  isDark={isDark}
                />
              )}
            </ScrollView>
            
            {/* Floating Add Button */}
            <View
              style={{
                position: 'absolute',
                bottom: 30,
                right: 20,
                zIndex: 1000
              }}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                  hapticFeedback.medium();
                  setIsAddingEntry(true);
                }}
              >
                <MaterialIcons name="add" size={32} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Add Entry Bottom Sheet Modal - Appears on top */}
            {isAddingEntry && (
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'position' : 'height'}
                keyboardVerticalOffset={0}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  justifyContent: 'flex-end',
                  zIndex: 2000
                }}
              >
                {/* Backdrop */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsAddingEntry(false);
                    setNewJournalNote({ reference: '', text: '' });
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'transparent'
                  }}
                />

                {/* Bottom Sheet */}
                <Animated.View style={{
                  backgroundColor: theme.background,
                  borderTopLeftRadius: 32,
                  borderTopRightRadius: 32,
                  paddingBottom: Platform.OS === 'ios' ? 12 : 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 20,
                  elevation: 25,
                  transform: [{ translateY: addJournalSlideAnim }]
                }}>
                  {/* Drag Handle */}
                  <View 
                    style={{ 
                      alignItems: 'center',
                      paddingVertical: 14,
                    }}
                    {...addJournalPanResponder.panHandlers}
                  >
                    <View style={{ 
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)', 
                      width: 40, 
                      height: 5,
                      borderRadius: 3
                    }} />
                  </View>

                  {/* Header */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 24,
                    paddingBottom: 20
                  }}>
                    <View>
                      <Text style={{
                        fontSize: 26,
                        fontWeight: '900',
                        color: textColor,
                        letterSpacing: -0.5
                      }}>
                        New Reflection
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: textSecondaryColor,
                        marginTop: 2,
                        fontWeight: '500'
                      }}>
                        Capture your spiritual journey
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        hapticFeedback.light();
                        setIsAddingEntry(false);
                        setNewJournalNote({ reference: '', text: '' });
                      }}
                      style={{
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        borderRadius: 20,
                        padding: 8
                      }}
                    >
                      <MaterialIcons name="close" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
                    keyboardShouldPersistTaps="handled"
                  >
                      {/* Title Input */}
                      <View style={{ marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <MaterialIcons name="label-outline" size={18} color={theme.primary} />
                          <Text style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: textColor,
                            marginLeft: 8,
                            letterSpacing: 0.3
                          }}>
                            Topic or Reference
                          </Text>
                        </View>
                        <TextInput
                          style={{
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            borderRadius: 16,
                            padding: 18,
                            fontSize: 17,
                            color: textColor,
                            fontWeight: '600',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                          }}
                          placeholder="e.g. My Morning Prayer"
                          placeholderTextColor={theme.textTertiary}
                          value={newJournalNote.reference}
                          onChangeText={(text) => setNewJournalNote({ ...newJournalNote, reference: text })}
                        />
                      </View>

                      {/* Note Input */}
                      <View style={{ marginBottom: 30 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <MaterialIcons name="create" size={18} color={theme.primary} />
                          <Text style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: textColor,
                            marginLeft: 8,
                            letterSpacing: 0.3
                          }}>
                            Your Reflection
                          </Text>
                        </View>
                        <TextInput
                          style={{
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            borderRadius: 18,
                            padding: 20,
                            fontSize: 17,
                            color: textColor,
                            fontWeight: '500',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                            minHeight: 220,
                            textAlignVertical: 'top',
                            lineHeight: 26
                          }}
                          placeholder="What is God speaking to you today?"
                          placeholderTextColor={theme.textTertiary}
                          value={newJournalNote.text}
                          onChangeText={(text) => setNewJournalNote({ ...newJournalNote, text: text })}
                          multiline
                          numberOfLines={10}
                        />
                      </View>

                      {/* Save Button */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={{
                          borderRadius: 20,
                          overflow: 'hidden',
                          shadowColor: theme.primary,
                          shadowOffset: { width: 0, height: 10 },
                          shadowOpacity: 0.3,
                          shadowRadius: 15,
                          elevation: 10
                        }}
                        onPress={async () => {
                          if (!newJournalNote.text.trim()) {
                            Alert.alert('Empty Note', 'Please write something before saving.');
                            return;
                          }

                          hapticFeedback.success();
                          const newEntry = {
                            id: Date.now().toString(),
                            verseReference: newJournalNote.reference.trim() || 'Personal Reflection',
                            text: newJournalNote.text.trim(),
                            createdAt: new Date().toISOString(),
                            verseId: `custom_${Date.now()}`
                          };

                          try {
                            const existingNotes = await userStorage.getRaw('journalNotes');
                            const notes = existingNotes ? JSON.parse(existingNotes) : [];
                            notes.unshift(newEntry);
                            await userStorage.setRaw('journalNotes', JSON.stringify(notes));
                            
                            setJournalNotes(notes);
                            setNewJournalNote({ reference: '', text: '' });
                            setIsAddingEntry(false);
                          } catch (error) {
                            console.error('Error saving journal entry:', error);
                            Alert.alert('Error', 'Failed to save your journal entry. Please try again.');
                          }
                        }}
                      >
                        <LinearGradient
                          colors={[theme.primary, `${theme.primary}DD`]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            paddingVertical: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row'
                          }}
                        >
                          <MaterialIcons name="stars" size={20} color="#fff" style={{ marginRight: 10 }} />
                          <Text style={{
                            fontSize: 18,
                            fontWeight: '800',
                            color: '#fff',
                            letterSpacing: 1
                          }}>
                            SAVE REFLECTION
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                  </ScrollView>
                </Animated.View>
              </KeyboardAvoidingView>
            )}

            {/* Premium Transparent Header */}
            <BlurView 
              intensity={50} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
              }}
            >
              <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.light();
                    setShowJournal(false);
                    setIsAddingEntry(false);
                  }}
                  style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      paddingHorizontal: 18, 
                      paddingVertical: 10,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  }}
                    activeOpacity={0.7}
                >
                    <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
                
                  <View style={{ alignItems: 'center' }}>
                  <Text style={{ 
                    color: textColor,
                      fontSize: 17, 
                      fontWeight: '700',
                      letterSpacing: 0.3,
                  }}>
                    Journal
                  </Text>
                  <View style={{ 
                    width: 20, 
                    height: 3, 
                    backgroundColor: theme.primary, 
                    borderRadius: 2,
                    marginTop: 4
                  }} />
                </View>

                <View style={{ width: 70 }} />
                </View>
              </View>
            </BlurView>
        </View>
      )}

      {/* Add Journal Entry Modal */}
      <Modal
        visible={showAddJournalNote}
        animationType="slide"
        transparent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          setShowAddJournalNote(false);
          setTimeout(() => setShowJournal(true), 300);
        }}
        onShow={() => console.log('📝 Journal entry modal opened!')}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end'
          }}>
            <View style={{
              backgroundColor: theme.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 20,
              paddingBottom: 40,
              paddingHorizontal: 20,
              maxHeight: '90%'
            }}>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 24
              }}>
                <Text style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: textColor
                }}>
                  New Journal Entry
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddJournalNote(false);
                    setNewJournalNote({ reference: '', text: '' });
                    setTimeout(() => setShowJournal(true), 300);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={28} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Title Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: textSecondaryColor,
                    marginBottom: 8
                  }}>
                    Title (Optional)
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      padding: 16,
                      fontSize: 16,
                      color: textColor,
                      borderWidth: 1,
                      borderColor: theme.border
                    }}
                    placeholder="e.g., Exodus 1:1 or My Thoughts"
                    placeholderTextColor={theme.textTertiary}
                    value={newJournalNote.reference}
                    onChangeText={(text) => setNewJournalNote(prev => ({ ...prev, reference: text }))}
                  />
                </View>

                {/* Note Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: textSecondaryColor,
                    marginBottom: 8
                  }}>
                    Your Note
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.surface,
                      borderRadius: 12,
                      padding: 16,
                      fontSize: 16,
                      color: textColor,
                      minHeight: 200,
                      borderWidth: 1,
                      borderColor: theme.border,
                      textAlignVertical: 'top'
                    }}
                    placeholder="Write your thoughts, reflections, or prayers..."
                    placeholderTextColor={theme.textTertiary}
                    value={newJournalNote.text}
                    onChangeText={(text) => setNewJournalNote(prev => ({ ...prev, text: text }))}
                    multiline
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    opacity: newJournalNote.text.trim() ? 1 : 0.5
                  }}
                  disabled={!newJournalNote.text.trim()}
                  onPress={async () => {
                    if (newJournalNote.text.trim()) {
                      hapticFeedback.success();
                      try {
                        // Create a unique ID for this journal entry
                        const journalId = `journal_${Date.now()}`;
                        const noteReference = newJournalNote.reference.trim() || 'My Thoughts';
                        
                        // Save to VerseDataManager
                        await VerseDataManager.addNote(
                          journalId,
                          newJournalNote.text.trim(),
                          noteReference
                        );
                        
                        // Reload journal notes
                        await loadJournalNotes();
                        
                        // Close modal and reset
                        setShowAddJournalNote(false);
                        setNewJournalNote({ reference: '', text: '' });
                        
                        // Reopen journal modal
                        setTimeout(() => setShowJournal(true), 300);
                      } catch (error) {
                        console.error('Error saving journal entry:', error);
                        Alert.alert('Error', 'Could not save journal entry. Please try again.');
                      }
                    }
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#fff'
                  }}>
                    Save Entry
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Highlights - now navigated via stack navigator for swipe-back support */}
      {false && (
        <View style={{
          flex: 1,
          backgroundColor: theme.background
        }}>
            {/* Content - ScrollView starts from top */}
            <ScrollView 
              style={{ flex: 1 }} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                paddingHorizontal: 16, 
                paddingBottom: 40,
                paddingTop: Platform.OS === 'ios' ? 120 : 100,
              }}
            >
              {highlightedVerses.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="palette" size={64} color={theme.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: textSecondaryColor, fontSize: 20, fontWeight: '700', marginTop: 24 }]}>
                    No Highlights Yet
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: textTertiaryColor, fontSize: 15, marginTop: 12, lineHeight: 22 }]}>
                    Long-press any verse in the Bible and choose a color to highlight it
                  </Text>
                </View>
              ) : !selectedHighlightColor ? (
                // Show color cards - Compact or Expanded view
                <View>
                  {highlightViewMode === 'compact' && (
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: textTertiaryColor,
                      marginBottom: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 1
                    }}>
                      {Object.keys(groupHighlightsByColor()).length} Categories
                    </Text>
                  )}
                  {Object.entries(groupHighlightsByColor()).map(([color, verses], index) => (
                  highlightViewMode === 'compact' ? (
                    // COMPACT VIEW - Premium card design
                  <TouchableOpacity
                    key={color}
                    style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                        borderRadius: 20,
                        paddingVertical: 16,
                        paddingHorizontal: 18,
                        marginBottom: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.25 : 0.08,
                        shadowRadius: 6,
                        elevation: 3,
                        borderWidth: isDark ? 1 : 0,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
                      }}
                      onPress={() => {
                        hapticFeedback.medium();
                        loadVersesForColor(color);
                      }}
                      onLongPress={() => {
                        hapticFeedback.medium();
                        setRenameHighlightColor(color);
                        setRenameHighlightText(getColorName(color));
                        setShowRenameHighlight(true);
                      }}
                      activeOpacity={0.8}
                      delayPressIn={0}
                    >
                      {/* Color Circle */}
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: color,
                        marginRight: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.15,
                        shadowRadius: 4,
                        elevation: 3,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <MaterialIcons name="format-paint" size={20} color="rgba(255,255,255,0.9)" />
                      </View>
                      
                      {/* Name and Details */}
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: textColor,
                          letterSpacing: 0.3
                        }}>
                          {getColorName(color)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          {customHighlightNames[color] && (
                            <Text style={{
                              fontSize: 12,
                              fontWeight: '500',
                              color: textSecondaryColor,
                              marginRight: 8
                            }}>
                              {getDefaultColorName(color)} •
                            </Text>
                          )}
                          <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: color,
                          }}>
                            {verses.length} {verses.length === 1 ? 'verse' : 'verses'}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Action Buttons */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            hapticFeedback.light();
                            setRenameHighlightColor(color);
                            setRenameHighlightText(getColorName(color));
                            setShowRenameHighlight(true);
                          }}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: `${color}20`,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          activeOpacity={0.7}
                          delayPressIn={0}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialIcons name="edit" size={16} color={color} />
                        </TouchableOpacity>
                        
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: `${color}15`,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <MaterialIcons name="arrow-forward-ios" size={14} color={color} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    // EXPANDED VIEW - Premium large card
                    <View
                      key={color}
                      style={{
                        marginBottom: 16,
                        borderRadius: 28,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: isDark ? 0.25 : 0.1,
                        shadowRadius: 8,
                        elevation: 4
                      }}
                    >
                      <LinearGradient
                        colors={[
                          `${color}${isDark ? '40' : '25'}`,
                          `${color}${isDark ? '20' : '10'}`
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          padding: 24,
                          alignItems: 'center',
                          borderWidth: 2,
                          borderColor: `${color}40`,
                          borderRadius: 28
                        }}
                      >
                        <TouchableOpacity
                          style={{
                            width: '100%',
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      hapticFeedback.medium();
                      loadVersesForColor(color);
                    }}
                          onLongPress={() => {
                            hapticFeedback.medium();
                            setRenameHighlightColor(color);
                            setRenameHighlightText(getColorName(color));
                            setShowRenameHighlight(true);
                          }}
                          activeOpacity={0.8}
                          delayPressIn={0}
                        >
                          {/* Edit Button */}
                          <TouchableOpacity
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)',
                              alignItems: 'center',
                              justifyContent: 'center',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 4
                            }}
                            onPress={() => {
                              hapticFeedback.light();
                              setRenameHighlightColor(color);
                              setRenameHighlightText(getColorName(color));
                              setShowRenameHighlight(true);
                            }}
                            activeOpacity={0.7}
                            delayPressIn={0}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <MaterialIcons name="edit" size={18} color={color} />
                          </TouchableOpacity>
                          
                          {/* Large Color Circle */}
                    <View style={{
                            width: 72,
                            height: 72,
                            borderRadius: 36,
                      backgroundColor: color,
                            marginBottom: 16,
                      shadowColor: '#000',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: isDark ? 0.3 : 0.15,
                            shadowRadius: 6,
                            elevation: 4,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 3,
                            borderColor: 'rgba(255,255,255,0.3)'
                          }}>
                            <MaterialIcons name="format-paint" size={28} color="rgba(255,255,255,0.95)" />
                          </View>
                          
                    <Text style={{
                            fontSize: 22,
                      fontWeight: '800',
                      color: textColor,
                            marginBottom: 8,
                            letterSpacing: 0.5
                    }}>
                      {getColorName(color)}
                    </Text>
                          
                          {customHighlightNames[color] && (
                            <Text style={{
                              fontSize: 13,
                              fontWeight: '500',
                              color: textSecondaryColor,
                              marginBottom: 8
                            }}>
                              Originally: {getDefaultColorName(color)}
                            </Text>
                          )}
                          
                    <View style={{
                            backgroundColor: color,
                            paddingHorizontal: 20,
                            paddingVertical: 10,
                            borderRadius: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: isDark ? 0.25 : 0.12,
                            shadowRadius: 4
                    }}>
                      <Text style={{
                              fontSize: 14,
                        fontWeight: '700',
                              color: '#FFFFFF',
                              letterSpacing: 0.5
                      }}>
                        {verses.length} {verses.length === 1 ? 'verse' : 'verses'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                      </LinearGradient>
                    </View>
                  )
                ))}
                </View>
              ) : (
                // Show verses with full text for selected color
                highlightVersesWithText.map((verse, index) => (
                  <View
                    key={verse.verseId + index}
                    style={{
                      marginBottom: 16,
                      borderRadius: 24,
                      overflow: 'hidden',
                      shadowColor: selectedHighlightColor,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: isDark ? 0.4 : 0.2,
                      shadowRadius: 16,
                      elevation: 6
                    }}
                  >
                    <LinearGradient
                      colors={[
                        isDark ? `${selectedHighlightColor}30` : `${selectedHighlightColor}18`,
                        isDark ? `${selectedHighlightColor}20` : `${selectedHighlightColor}12`
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        padding: 22,
                        borderWidth: 2,
                        borderColor: `${selectedHighlightColor}50`,
                        borderRadius: 24
                      }}
                    >
                      {/* Highlight Color Accent Bar */}
                      <View style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 6,
                        backgroundColor: selectedHighlightColor
                      }} />
                      
                      {/* Verse Reference Header */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 16,
                        paddingLeft: 8
                      }}>
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: selectedHighlightColor,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: selectedHighlightColor,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.4,
                          shadowRadius: 6,
                          elevation: 3
                        }}>
                          <MaterialIcons name="auto-stories" size={20} color="#FFFFFF" />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={{
                            fontSize: 18,
                            fontWeight: '800',
                            color: textColor,
                          }}>
                            {verse.verseReference}
                          </Text>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: textSecondaryColor,
                            marginTop: 2,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}>
                            {currentBibleVersion.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Verse Text */}
                      <Text style={{
                        fontSize: 16,
                        color: textColor,
                        lineHeight: 28,
                        marginBottom: 18,
                        paddingLeft: 8,
                        fontWeight: '500'
                      }}>
                        {verse.text}
                      </Text>
                    
                    {/* Action Buttons Row */}
                    <View style={{
                      flexDirection: 'row',
                      gap: 10,
                      marginTop: 8,
                      paddingLeft: 8
                    }}>
                      {/* Remove Button (left) */}
                      <TouchableOpacity
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 16,
                          backgroundColor: `${theme.error}20`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1.5,
                          borderColor: `${theme.error}30`
                        }}
                        onPress={() => {
                          Alert.alert(
                            'Remove Highlight',
                            'Are you sure you want to remove this highlight?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: async () => {
                                  hapticFeedback.light();
                                  await VerseDataManager.removeHighlight(verse.verseId);
                                  await loadHighlights();
                                  setHighlightVersesWithText(prev => prev.filter(v => v.verseId !== verse.verseId));
                                  if (highlightVersesWithText.length === 1) {
                                    setSelectedHighlightColor(null);
                                  }
                                  DeviceEventEmitter.emit('highlightsChanged');
                                }
                              }
                            ]
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="delete-outline" size={24} color={theme.error} />
                      </TouchableOpacity>
                      
                      {/* Discuss Button */}
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 16,
                          backgroundColor: theme.primary,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: theme.primary,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 3
                        }}
                        onPress={() => {
                          hapticFeedback.medium();
                          setVerseToInterpret({
                            text: verse.text,
                            reference: verse.verseReference
                          });
                          setShowHighlights(false);
                          setTimeout(() => {
                            setShowAiChat(true);
                          }, 300);
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="forum" size={18} color="#FFFFFF" />
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: '#FFFFFF',
                          marginLeft: 6
                        }}>
                          Discuss
                        </Text>
                      </TouchableOpacity>
                      
                      {/* Go to Verse Button (right) */}
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 16,
                          backgroundColor: theme.success,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: theme.success,
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          elevation: 3
                        }}
                        onPress={() => {
                          hapticFeedback.medium();
                          handleNavigateToVerse(verse.verseReference);
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="menu-book" size={18} color="#FFFFFF" />
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: '#FFFFFF',
                          marginLeft: 6
                        }}>
                          Go to Verse
                        </Text>
                      </TouchableOpacity>
                    </View>
                    </LinearGradient>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Premium Transparent Header */}
            <BlurView 
              intensity={50} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
              }}
            >
              <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                {selectedHighlightColor ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedHighlightColor(null);
                      setHighlightVersesWithText([]);
                      hapticFeedback.light();
                    }}
                    style={{ 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        paddingHorizontal: 18, 
                        paddingVertical: 10,
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    }}
                      activeOpacity={0.7}
                  >
                      <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setShowHighlights(false);
                      setSelectedHighlightColor(null);
                      setHighlightVersesWithText([]);
                    }}
                    style={{ 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        paddingHorizontal: 18, 
                        paddingVertical: 10,
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    }}
                      activeOpacity={0.7}
                  >
                      <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Close</Text>
                  </TouchableOpacity>
                )}
                  
                  <View style={{ alignItems: 'center' }}>
                <Text style={{ 
                  color: textColor, 
                      fontSize: 17, 
                      fontWeight: '700',
                      letterSpacing: 0.3,
                }}>
                  {selectedHighlightColor ? getColorName(selectedHighlightColor) : 'Highlights'}
                </Text>
                    <View style={{ 
                      width: 50, 
                      height: 3, 
                      backgroundColor: selectedHighlightColor || theme.primary, 
                      borderRadius: 2,
                      marginTop: 6,
                    }} />
                  </View>
                  
                {!selectedHighlightColor ? (
                  <TouchableOpacity
                    onPress={() => saveHighlightViewMode(highlightViewMode === 'compact' ? 'expanded' : 'compact')}
                    style={{ 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        paddingHorizontal: 14, 
                        paddingVertical: 10,
                        borderRadius: 22,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons 
                      name={highlightViewMode === 'compact' ? 'view-agenda' : 'view-list'} 
                        size={18} 
                      color={theme.primary} 
                    />
                  </TouchableOpacity>
                ) : (
                    <View style={{ width: 70 }} />
                )}
              </View>
        </View>
            </BlurView>

            {/* Rename Highlight Overlay - Inside Highlights Modal */}
            {showRenameHighlight && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1000
                }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24
            }}
            activeOpacity={1}
            onPress={() => {
              setShowRenameHighlight(false);
              setRenameHighlightColor(null);
              setRenameHighlightText('');
            }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={{
                backgroundColor: theme.card,
                borderRadius: 24,
                padding: 24,
                width: '100%',
                maxWidth: 340,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10
              }}
            >
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20
              }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: renameHighlightColor || theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  shadowColor: renameHighlightColor || theme.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6
                }}>
                  <MaterialIcons name="edit" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: textColor
                  }}>
                    Rename Highlight
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: textSecondaryColor,
                    marginTop: 2
                  }}>
                    {getDefaultColorName(renameHighlightColor)}
                  </Text>
                </View>
              </View>

              {/* Input */}
              <TextInput
                value={renameHighlightText}
                onChangeText={setRenameHighlightText}
                placeholder="Enter custom name"
                placeholderTextColor={theme.textTertiary}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 14,
                  padding: 16,
                  fontSize: 16,
                  color: textColor,
                  borderWidth: 2,
                  borderColor: renameHighlightColor || theme.primary,
                  marginBottom: 20
                }}
                autoFocus={true}
                selectTextOnFocus={true}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {/* Reset to Default Button */}
                {customHighlightNames[renameHighlightColor] && (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      borderRadius: 14,
                      padding: 14,
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      handleResetHighlightName(renameHighlightColor);
                      setShowRenameHighlight(false);
                      setRenameHighlightColor(null);
                      setRenameHighlightText('');
                    }}
                    activeOpacity={0.7}
                    delayPressIn={0}
                  >
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: textSecondaryColor
                    }}>
                      Reset
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Save Button */}
                <TouchableOpacity
                  style={{
                    flex: customHighlightNames[renameHighlightColor] ? 1.5 : 1,
                    backgroundColor: renameHighlightColor || theme.primary,
                    borderRadius: 14,
                    padding: 14,
                    alignItems: 'center',
                    shadowColor: renameHighlightColor || theme.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8
                  }}
                        onPress={() => {
                          handleRenameHighlight();
                          setShowRenameHighlight(false);
                          setRenameHighlightColor(null);
                          setRenameHighlightText('');
                        }}
                  activeOpacity={0.7}
                  delayPressIn={0}
                  disabled={!renameHighlightText.trim()}
                >
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#fff'
                  }}>
                    Save Name
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
            )}
        </View>
      )}

      {/* Tasks Done - now navigated via stack navigator for swipe-back support */}
      {false && (
        <View style={{
          flex: 1,
          backgroundColor: theme.background
        }}>
            {/* Content - ScrollView starts from top, content has paddingTop */}
            <ScrollView 
              style={{ flex: 1 }} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                paddingHorizontal: 16, 
                paddingBottom: 120,
                paddingTop: Platform.OS === 'ios' ? 120 : 100,
              }}
            >
              {completedTodosList.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="check-circle-outline" size={64} color={theme.textTertiary} />
                  <Text style={[styles.emptyStateText, { color: textSecondaryColor, fontSize: 20, fontWeight: '700', marginTop: 24 }]}>
                    No Completed Tasks Yet
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: textTertiaryColor, fontSize: 15, marginTop: 12, lineHeight: 22 }]}>
                    Complete tasks to see them here
                  </Text>
                </View>
              ) : (
                completedTodosList.map((task, index) => (
                  <LinearGradient
                    key={task.id || index}
                    colors={[
                      isDark ? `${theme.success}25` : `${theme.success}15`,
                      isDark ? `${theme.success}15` : `${theme.success}08`
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 20,
                      padding: 18,
                      marginBottom: 14,
                      shadowColor: theme.success,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.3 : 0.15,
                      shadowRadius: 12,
                      elevation: 4,
                      borderWidth: 1,
                      borderColor: `${theme.success}30`,
                      overflow: 'hidden'
                    }}
                  >
                    {/* Completion Badge */}
                    <View style={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: `${theme.success}20`,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: theme.success,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: theme.success,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 3
                      }}>
                        <MaterialIcons name="check" size={20} color="#FFFFFF" />
                      </View>
                    </View>

                    {/* Task Content */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingRight: 30 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 17,
                          fontWeight: '700',
                          color: textColor,
                          lineHeight: 24,
                          marginBottom: 8
                        }}>
                          {task.text || task.title}
                        </Text>
                        
                        {/* Date and Points Row */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 4
                        }}>
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}>
                            <MaterialIcons name="access-time" size={14} color={theme.textSecondary} />
                            <Text style={{
                              fontSize: 13,
                              color: textSecondaryColor,
                              marginLeft: 6,
                              fontWeight: '500'
                            }}>
                              {task.completedAt ? formatSmartDate(task.completedAt) : 'Completed'}
                            </Text>
                          </View>
                          
                          {task.points && (
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: `${theme.success}25`,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: `${theme.success}40`
                            }}>
                              <MaterialIcons name="stars" size={14} color={theme.success} />
                              <Text style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: theme.success,
                                marginLeft: 4
                              }}>
                                +{task.points}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                ))
              )}
            </ScrollView>
            
            {/* Premium Transparent Header */}
            <BlurView 
              intensity={50} 
              tint={isDark ? 'dark' : 'light'} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 1000,
              }}
            >
              <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <TouchableOpacity
                  onPress={() => setShowTasksDone(false)}
                  style={{ 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      paddingHorizontal: 18, 
                      paddingVertical: 10,
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  }}
                    activeOpacity={0.7}
                >
                    <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
                  
                  <View style={{ alignItems: 'center' }}>
                <Text style={{ 
                  color: textColor, 
                      fontSize: 17, 
                      fontWeight: '700',
                      letterSpacing: 0.3,
                }}>
                  Tasks Done
                </Text>
                    <View style={{ 
                      width: 50, 
                      height: 3, 
                      backgroundColor: theme.primary, 
                      borderRadius: 2,
                      marginTop: 6,
                    }} />
              </View>
                  
                  <View style={{ width: 70 }} />
            </View>
              </View>
            </BlurView>
        </View>
      )}

      {/* Streak Screen Overlay */}
      <Modal
        visible={showStreakMilestone}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => {
          streakVisibleRef.current = false;
          setShowStreakMilestone(false);
        }}
      >
        <BlurView
          intensity={50}
          tint="dark"
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}
        >
          <View style={{ alignItems: 'center', paddingHorizontal: 36, width: '100%' }}>

            {/* ── Animated Fire ─────────────────────────────── */}
            <Animated.View style={{
              transform: [{ scale: Animated.multiply(streakFireScale, streakFireFlicker) }],
              marginBottom: 4,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <LottieView
                source={
                  selectedStreakAnim === 'fire2' ? require('../../assets/Fire2.json') :
                  selectedStreakAnim === 'redcar' ? require('../../assets/Red-Car.json') :
                  selectedStreakAnim === 'bulb' ? require('../../assets/Bulb Transparent.json') :
                  selectedStreakAnim === 'amongus' ? require('../../assets/Loading 50 _ Among Us.json') :
                  selectedStreakAnim === 'lightning' ? require('../../assets/Lightning.json') :
                  require('../../assets/fire-animation.json')
                }
                autoPlay
                loop
                style={{ width: 130, height: 130 }}
              />
            </Animated.View>

            {/* ── Streak Number ────────────────────────────── */}
            <Animated.View style={{
              transform: [{ scale: streakNumberScale }],
              marginBottom: 2,
            }}>
              <Text style={{
                fontSize: 76,
                fontWeight: '800',
                color: '#FFFFFF',
                textAlign: 'center',
              }}>
                {appStreak}
              </Text>
            </Animated.View>

            {/* ── "day streak" label ──────────────────────── */}
            <Animated.View style={{ opacity: streakFadeIn, width: '100%', alignItems: 'center' }}>
              <Text style={{
                fontSize: 22,
                fontWeight: '700',
                color: '#FFFFFF',
                textAlign: 'center',
                marginBottom: 8,
                letterSpacing: 0.5,
              }}>
                day streak
              </Text>

              {/* Motivational subtitle */}
              <Text style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 28,
                paddingHorizontal: 20,
              }}>
                {appStreak === 0
                  ? 'welcome! open the app again tomorrow to start your streak'
                  : appStreak < 3
                    ? 'great start! keep building your daily prayer habit'
                    : appStreak < 7
                      ? 'you\'re on a roll! keep the momentum going'
                      : appStreak < 15
                        ? 'incredible dedication! you\'re unstoppable'
                        : appStreak < 30
                          ? 'amazing consistency! you\'re a true champion'
                          : 'legendary! you are an absolute inspiration'}
              </Text>

              {/* ── Weekly Calendar Strip ─────────────────── */}
              {(() => {
                const today = new Date();
                const dayOfWeek = today.getDay();
                const dayLabels = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
                const openDateStrings = streakOpenDates.map(d => d);

                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - dayOfWeek);

                const days = [];
                for (let i = 0; i < 7; i++) {
                  const d = new Date(weekStart);
                  d.setDate(weekStart.getDate() + i);
                  days.push({
                    label: dayLabels[i],
                    date: d.getDate(),
                    dateStr: d.toDateString(),
                    isToday: d.toDateString() === today.toDateString(),
                    isActive: openDateStrings.includes(d.toDateString()),
                    isFuture: d > today,
                  });
                }

                return (
                  <View style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 22,
                    paddingVertical: 18,
                    paddingHorizontal: 8,
                    marginBottom: 36,
                    width: '100%',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}>
                    {/* Combined day label + circle rows */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
                      {days.map((day) => (
                        <View key={day.dateStr} style={{ alignItems: 'center', width: 40 }}>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '600',
                            color: day.isToday ? '#FF9500' : 'rgba(255,255,255,0.4)',
                            textAlign: 'center',
                            marginBottom: 8,
                            textTransform: 'lowercase',
                          }}>
                            {day.label}
                          </Text>
                          <View style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: day.isToday
                              ? '#FF9500'
                              : day.isActive
                                ? 'rgba(255, 149, 0, 0.25)'
                                : 'rgba(255,255,255,0.06)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: day.isActive && !day.isToday ? 1.5 : 0,
                            borderColor: day.isActive && !day.isToday ? 'rgba(255, 149, 0, 0.5)' : 'transparent',
                          }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: day.isToday ? '700' : '500',
                              color: day.isToday
                                ? '#FFFFFF'
                                : day.isActive
                                  ? '#FF9500'
                                  : day.isFuture
                                    ? 'rgba(255,255,255,0.2)'
                                    : 'rgba(255,255,255,0.35)',
                            }}>
                              {day.date}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {/* ── Continue Button ───────────────────────── */}
              <TouchableOpacity
                onPress={() => {
                  streakVisibleRef.current = false;
                  setShowStreakMilestone(false);
                }}
                activeOpacity={0.85}
                style={{
                  borderRadius: 18,
                  alignSelf: 'stretch',
                  overflow: 'hidden',
                  shadowColor: '#FF9500',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 10,
                }}
              >
                <LinearGradient
                  colors={['#FFB347', '#FF9500', '#F57C00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingVertical: 17,
                    paddingHorizontal: 48,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    letterSpacing: 0.3,
                  }}>
                    continue
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </BlurView>
      </Modal>

    </View>
    </AnimatedWallpaper>

    {/* Legal Modal - Privacy Policy / Terms of Service / Support */}
    <Modal
      visible={showLegalModal !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowLegalModal(null)}
    >
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F0F23' : '#FAFAFA' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 16, paddingHorizontal: 20, paddingBottom: 16,
          borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          backgroundColor: isDark ? '#0F0F23' : '#FAFAFA',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons
              name={showLegalModal === 'privacy' ? 'privacy-tip' : showLegalModal === 'terms' ? 'description' : 'help-outline'}
              size={22} color={isDark ? '#A5B4FC' : '#6366F1'}
            />
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#FFF' : '#1a1a2e', marginLeft: 10 }}>
              {showLegalModal === 'privacy' ? 'Privacy Policy' : showLegalModal === 'terms' ? 'Terms of Service' : 'Support & FAQ'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { hapticFeedback.medium(); setShowLegalModal(null); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="close" size={18} color={isDark ? '#FFF' : '#333'} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {showLegalModal === 'privacy' && (
            <>
              <Text style={{ fontSize: 12, color: isDark ? '#888' : '#999', marginBottom: 20 }}>Last updated: February 8, 2026</Text>
              <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22, marginBottom: 16 }}>
                Biblely ("we", "our", or "the app") is a faith and productivity companion. Your privacy matters to us. This policy explains what data we collect, how we use it, and your rights.
              </Text>

              {[
                { title: '1. Data We Collect', content: 'Account information: When you create an account, we collect your email address, display name, username, and optional profile photo.\n\nUser-generated content: Prayers, journal entries, to-do items, saved Bible verses, workout logs, nutrition data, and social feed posts you choose to create within the app.\n\nHealth and fitness data: Workout history, nutrition tracking (food logs, calorie and macro data), body profile information (height, weight, age, body fat percentage), and body composition estimates. This data is used solely to provide personalised fitness and nutrition features within the app.\n\nUsage data: App interaction data such as streaks, points, quiz scores, and feature usage \u2014 used to provide achievements and personalised experiences.\n\nPhotos: If you choose to use the camera or photo library, images are processed for profile pictures or food analysis. Photos used for food scanning are sent for nutritional analysis and are not stored on our servers.' },
                { title: '2. How We Use Your Data', content: '\u2022 To provide and personalise app features (Bible reading, prayer tracking, workouts, nutrition, todos)\n\u2022 To sync your data across devices via Firebase and iCloud\n\u2022 To send push notifications (prayer reminders, streak alerts) that you opt into\n\u2022 To generate personalised insights\n\u2022 To enable social features (prayer wall, messaging, friend connections)' },
                { title: '3. Data Storage', content: 'Local storage: Your data is also stored locally on your device using AsyncStorage, so the app works offline.\n\nCloud sync (Firebase): Your data is synced to Google Firebase (Firestore) servers to enable cross-device access and social features.\n\niCloud sync: On iOS, your data may also be synced via Apple iCloud (CloudKit) if you are signed into iCloud.' },
                { title: '4. Third-Party Services', content: '\u2022 Google Firebase \u2014 authentication, cloud database, file storage\n\u2022 Apple iCloud / CloudKit \u2014 data sync\n\u2022 Google Cloud Text-to-Speech \u2014 audio Bible reading\n\u2022 Google Gemini \u2014 food photo nutritional analysis (photos are processed but not stored)\n\u2022 DeepSeek \u2014 personalised insights, workout suggestions, and smart features\n\u2022 OCR.space \u2014 text recognition from nutrition label photos\n\u2022 Resend \u2014 email delivery for verification codes\n\u2022 Expo Push Notification Service \u2014 notification delivery' },
                { title: '5. Data Sharing', content: 'We do not sell, rent, or share your personal data with third parties for marketing purposes. Data is only shared with the third-party services listed above, solely to provide app functionality.' },
                { title: '6. Analytics and Tracking', content: 'We do not use any analytics or tracking SDKs. We do not track you across apps or websites. No advertising identifiers are collected.' },
                { title: '7. Data Retention', content: 'Your data is retained as long as your account exists. Food logs older than 90 days are automatically cleaned from local storage. You can delete all your data at any time by deleting your account (Settings > Delete Account).' },
                { title: '8. Your Rights', content: 'Access: You can view all your data within the app.\n\nDeletion: You can delete your account and all associated data from Settings > Delete Account. This permanently removes your data from Firebase and your device.\n\nPortability: Your data is stored locally on your device and accessible through standard device backup mechanisms.' },
                { title: '9. Children\'s Privacy', content: 'Biblely is not directed at children under 13. We do not knowingly collect data from children under 13.' },
                { title: '10. Security', content: 'We use industry-standard security measures including Firebase Authentication, encrypted connections (HTTPS/TLS), and secure password hashing.' },
                { title: '11. Changes', content: 'We may update this privacy policy from time to time. We will notify you of significant changes through the app or by updating the "Last updated" date.' },
                { title: '12. Contact', content: 'If you have questions about this privacy policy or your data, contact us at:\n\nbiblelyios@gmail.com' },
              ].map((section, i) => (
                <View key={i} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#A5B4FC' : '#6366F1', marginBottom: 8 }}>{section.title}</Text>
                  <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22 }}>{section.content}</Text>
                </View>
              ))}
            </>
          )}

          {showLegalModal === 'terms' && (
            <>
              <Text style={{ fontSize: 12, color: isDark ? '#888' : '#999', marginBottom: 20 }}>Last updated: February 8, 2026</Text>
              <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22, marginBottom: 16 }}>
                Welcome to Biblely. By using the app, you agree to these Terms of Service. If you do not agree, please do not use the app.
              </Text>

              {[
                { title: '1. Description of Service', content: 'Biblely is a faith and productivity companion app that provides Bible reading, prayer tracking, workout logging, nutrition tracking, task management, and social features. The app is provided free of charge with no subscriptions or in-app purchases.' },
                { title: '2. Account Registration', content: 'To access certain features (cloud sync, social features, messaging), you must create an account with a valid email address. You are responsible for maintaining the confidentiality of your account credentials.' },
                { title: '3. Acceptable Use', content: 'You agree not to:\n\n\u2022 Use the app for any unlawful purpose\n\u2022 Post offensive, hateful, or inappropriate content on the prayer wall or social features\n\u2022 Harass, bully, or threaten other users\n\u2022 Attempt to interfere with or disrupt the app\'s services\n\u2022 Create multiple accounts for deceptive purposes\n\u2022 Scrape, copy, or redistribute Bible translations or app content' },
                { title: '4. User Content', content: 'You retain ownership of content you create (prayers, journal entries, todos, posts). By posting content to social features, you grant us a non-exclusive license to display that content to other users within the app. You can delete your content at any time.' },
                { title: '5. Bible Content', content: 'Bible translations available in the app are provided for personal, non-commercial use only. You may not redistribute, sell, or commercially use Bible text obtained through the app.' },
                { title: '6. Health and Fitness Disclaimer', content: 'Biblely provides workout tracking, nutrition tracking, and body composition estimates for informational and wellness purposes only. These features are NOT medical advice and should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always consult a healthcare professional before making significant changes to your diet or exercise routine.' },
                { title: '7. Intellectual Property', content: 'The app, its design, code, graphics, and non-Bible content are owned by Biblely. You may not copy, modify, distribute, or reverse engineer the app or its components.' },
                { title: '8. Account Termination', content: 'You may delete your account at any time through Settings > Delete Account. We reserve the right to suspend or terminate accounts that violate these terms.' },
                { title: '9. Limitation of Liability', content: 'The app is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the app.' },
                { title: '10. Changes to Terms', content: 'We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.' },
                { title: '11. Contact', content: 'If you have questions about these terms, contact us at:\n\nbiblelyios@gmail.com' },
              ].map((section, i) => (
                <View key={i} style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#A5B4FC' : '#6366F1', marginBottom: 8 }}>{section.title}</Text>
                  <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22 }}>{section.content}</Text>
                </View>
              ))}
            </>
          )}

          {showLegalModal === 'support' && (
            <>
              <Text style={{ fontSize: 14, color: isDark ? '#999' : '#666', marginBottom: 24 }}>
                We're here to help you get the most out of Biblely.
              </Text>

              {[
                // Account
                { q: 'How do I create an account?', a: 'Tap "Create Account" on the welcome screen. Enter your email, create a password, choose a display name and username, and you\'re all set. It takes less than a minute.' },
                { q: 'Do I need an account to use the app?', a: 'Yes, a free account is required to use Biblely. Creating one takes just a few seconds with your email. Your account enables cloud sync so your data is safe and available across devices.' },
                { q: 'I forgot my password. How do I reset it?', a: 'On the sign-in screen, tap "Forgot Password?" and enter your email address. You\'ll receive a password reset link within a few minutes. Check your spam folder if you don\'t see it.' },
                { q: 'How do I delete my account?', a: 'Go to your Profile, tap the Settings gear icon, scroll down to "Danger Zone," and tap "Delete Account." You\'ll need to enter your password to confirm. This permanently removes all your data from our servers.' },
                { q: 'How do I change my profile picture?', a: 'Go to your Profile and tap on your profile photo or the camera icon. You can take a new photo or choose one from your photo library.' },
                // Privacy & Data
                { q: 'Is my data private?', a: 'Yes. We do not sell or share your data with third parties for marketing. We do not use analytics or tracking SDKs. Your data is only used to provide app features. See our Privacy Policy for full details.' },
                { q: 'Does the app work offline?', a: 'Yes. Your data is stored locally on your device, so you can read the Bible, view your prayers, check your tasks, and review workouts even without an internet connection. Data syncs when you\'re back online.' },
                { q: 'My data isn\'t syncing across devices.', a: 'Make sure you\'re signed in with the same account on both devices and that you have an internet connection. Try closing and reopening the app. Data syncs automatically when the app is in the foreground.' },
                // Bible
                { q: 'How do I change my Bible translation?', a: 'In the Bible reader, tap the translation name at the top to open the translation picker. Choose from over 40 available translations including KJV, NIV, ESV, NLT, and many more.' },
                { q: 'Can I listen to the Bible?', a: 'Yes. Open any chapter in the Bible reader and tap the audio/play button. The text will be read aloud using natural text-to-speech. You can follow along as it reads.' },
                { q: 'How do I save or highlight verses?', a: 'While reading, tap and hold on a verse to see options. You can highlight it with different colours, save it to your collection, or share it with friends.' },
                // Prayer
                { q: 'What is the Prayer Wall?', a: 'The Prayer Wall is a community space where you can share prayer requests and pray for others. Your prayers can be anonymous or public. It\'s a way to support and encourage fellow believers.' },
                { q: 'How do prayer reminders work?', a: 'Go to your Profile settings and enable prayer reminders. You can choose the time of day you\'d like to be reminded. The app will send you a gentle notification to take a moment for prayer.' },
                // Fitness & Nutrition
                { q: 'How does food scanning work?', a: 'Tap the "+" button in the Fuel section, then choose Camera or Photo Library. Take or select a photo of your meal and the app will estimate its calories, protein, carbs, and fat. You can edit the values before saving.' },
                { q: 'How are my calorie targets calculated?', a: 'Your daily targets are personalised based on your profile (age, height, weight, activity level, and goal). The app uses established nutrition science formulas to calculate your ideal intake.' },
                { q: 'Are the body composition estimates accurate?', a: 'Body composition values are estimated using established research formulas based on your profile data. They\'re useful for tracking trends over time, but may differ from clinical measurements. For medical accuracy, please consult a healthcare professional.' },
                { q: 'How do I start a workout?', a: 'Go to the Gym tab and tap "Start Workout." You can choose from dozens of templates or create your own. During the workout, log your sets, reps, and weights for each exercise.' },
                // Tasks
                { q: 'How does task scoring work?', a: 'When you add a task, the app analyses its complexity and assigns it a point value. Quick tasks earn fewer points, while complex or time-intensive tasks earn more. Complete tasks to build your streak and earn points.' },
                { q: 'Can I schedule tasks for future dates?', a: 'Yes. Tap the calendar icon when creating or viewing a task to pick a specific date. Tasks are organised by date in the "View All" screen, with the closest deadlines shown first.' },
                // Themes & Customisation
                { q: 'How do I change the app theme?', a: 'Go to your Profile, then tap the Settings gear icon. Under "Appearance," you can choose from multiple beautiful themes including light mode, dark mode, and special themed styles.' },
                // General
                { q: 'Is Biblely really free?', a: 'Yes, completely free. No subscriptions, no in-app purchases, no hidden fees. Every feature is available to everyone.' },
                { q: 'How do I report a bug or suggest a feature?', a: 'Email us at biblelyios@gmail.com. We read every message and appreciate your feedback. Include as much detail as possible so we can help quickly.' },
              ].map((faq, i) => (
                <View key={i} style={{
                  marginBottom: 16, padding: 16, borderRadius: 14,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF',
                  borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
                  borderColor: 'rgba(0,0,0,0.06)',
                }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#FFF' : '#1a1a2e', marginBottom: 8 }}>{faq.q}</Text>
                  <Text style={{ fontSize: 14, color: isDark ? '#AAA' : '#555', lineHeight: 21 }}>{faq.a}</Text>
                </View>
              ))}

              <View style={{
                marginTop: 12, padding: 20, borderRadius: 16,
                backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#EDE9FE',
              }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#A5B4FC' : '#6366F1', marginBottom: 8 }}>Contact Us</Text>
                <Text style={{ fontSize: 14, color: isDark ? '#CCC' : '#444', lineHeight: 22 }}>
                  Email: biblelyios@gmail.com{'\n\n'}We typically respond within 48 hours.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>

    {/* About Modal */}
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
                
                <Text style={[styles.creatorName, { color: textColor, ...textOutlineStyle }]}>
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
                <Text style={[styles.storyTitle, { color: textColor, ...textOutlineStyle }]}>
                  Why I Built This
                </Text>
              </LinearGradient>
              
              <Text style={[styles.storyText, { color: textColor, ...textOutlineStyle }]}>
                I'm Jason, a computer science student who loves reading the Bible. I wanted an app to help me read daily, so I tried a few popular Bible apps.
              </Text>
              
              <Text style={[styles.storyText, { color: textColor, ...textOutlineStyle }]}>
                Some had paywalls, others just weren't what I was looking for. I wanted something simple that combined faith, productivity, and wellness in one place.
              </Text>
              
              <Text style={[styles.storyText, { color: textColor, ...textOutlineStyle }]}>
                So I built Biblely. It's got everything I wanted - Bible reading, daily prayers, tasks to stay productive, and even fitness tracking. All completely free.
              </Text>

              <Text style={[styles.storyText, { color: textColor, ...textOutlineStyle }]}>
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
              
              <Text style={[styles.thankYouTitle, { color: textColor, ...textOutlineStyle }]}>
                Thanks for being here
              </Text>
              <Text style={[styles.thankYouText, { color: textSecondaryColor }]}>
                Hope Biblely helps you out. If you've got any ideas or feedback, I'd love to hear them.
              </Text>
              
              <View style={styles.contactInfo}>
                <View style={styles.contactItem}>
                  <MaterialIcons name="email" size={18} color={theme.primary} />
                  <Text style={[styles.contactText, { color: textColor, ...textOutlineStyle }]}>
                    biblelyios@gmail.com
                  </Text>
                </View>
                <View style={styles.contactItem}>
                  <MaterialIcons name="alternate-email" size={18} color={theme.primary} />
                  <Text style={[styles.contactText, { color: textColor, ...textOutlineStyle }]}>
                    @biblely.app on TikTok
                  </Text>
                </View>
              </View>
              
              <View style={styles.signatureContainer}>
                <View style={styles.signatureLine} />
                <Text style={[styles.signature, { color: textSecondaryColor }]}>
                  Jason
                </Text>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.ScrollView>
      </LinearGradient>
    </Modal>

    {/* Theme Modal */}
    <ThemeModal 
      visible={showThemeModal} 
      onClose={() => setShowThemeModal(false)} 
    />

    {/* Sign Out Loading Overlay */}
    <Modal
      visible={signingOut}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.signOutOverlay}>
        <View style={styles.signOutCard}>
          <ActivityIndicator size="large" color={theme.primary || '#7C3AED'} />
          <Text style={styles.signOutText}>Signing out...</Text>
          <Text style={styles.signOutSubtext}>Saving your data to the cloud</Text>
        </View>
      </View>
    </Modal>

    {/* ═══════════ ACCOUNT SWITCH ANIMATION ═══════════ */}
    <AccountSwitchOverlay
      visible={!!switchTarget}
      switching={switchingAccount}
      currentAccount={{
        username: authUserProfile?.username,
        email: authUserProfile?.email || user?.email,
        profilePicture: authUserProfile?.profilePicture,
      }}
      targetAccount={switchTarget}
      theme={theme}
      isDark={isDark}
      onFinished={() => setSwitchTarget(null)}
    />


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
  // Liquid Glass Styles
  liquidGlassProfileCard: {
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  liquidGlassStatsCard: {
    borderRadius: 16,
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
  liquidGlassSettingsCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
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
    marginTop: 12,
    marginBottom: 0,
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
    marginTop: 0,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
    elevation: 2,
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
  badgeCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  signOutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 14,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  signOutSubtext: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '400',
  },
});

export default ProfileTab;
