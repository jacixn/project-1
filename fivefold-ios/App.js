import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LogBox, Linking, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View, Text, Image, Animated, DeviceEventEmitter } from 'react-native';
import * as Notifications from 'expo-notifications';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { WorkoutProvider, useWorkout } from './src/contexts/WorkoutContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import notificationService from './src/services/notificationService';
// OnboardingWrapper is now handled inside RootNavigator
import { initializeApiSecurity } from './src/utils/secureApiKey';
import { getStoredData } from './src/utils/localStorage';
import ErrorBoundary from './src/components/ErrorBoundary';
import { Asset } from 'expo-asset';
import iCloudSyncService from './src/services/iCloudSyncService';
import userStorage from './src/utils/userStorage';
import {
  performFullSync,
  downloadAndMergeCloudData,
  syncSavedVersesToCloud,
  syncJournalNotesToCloud,
  syncPrayersToCloud,
  syncThemePreferencesToCloud,
  syncAllHistoryToCloud,
  syncUserStatsToCloud,
} from './src/services/userSyncService';
import MiniWorkoutPlayer from './src/components/MiniWorkoutPlayer';
import WorkoutModal from './src/components/WorkoutModal';
import AchievementToast from './src/components/AchievementToast';
import PersistentAudioPlayerBar from './src/components/PersistentAudioPlayerBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WorkoutService from './src/services/workoutService';

if (!Object.getOwnPropertyDescriptor(globalThis, 'width')) {
  Object.defineProperty(globalThis, 'width', {
    configurable: true,
    get() {
      console.error('⚠️ Global width accessed unexpectedly');
      console.trace('Global width trace');
      return undefined;
    },
    set(value) {
      console.warn('⚠️ Attempt to set global width to', value);
      return value;
    },
  });
}

// Catch global errors to inspect stack traces
if (global.ErrorUtils && !global.__ERROR_HANDLER_INSTALLED__) {
  global.__ERROR_HANDLER_INSTALLED__ = true;
  const defaultHandler = global.ErrorUtils.getGlobalHandler && global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('🔥 Global error captured:', error?.message);
    console.log('🔥 Stack:', error?.stack);
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

// Silence noisy warnings while debugging
LogBox.ignoreLogs(['ReferenceError: Property']);

// Splash Screen Component (dark theme — used during Bible version reload)
const SplashScreen = () => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#09090B',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
        alignItems: 'center',
      }}>
        <Image 
          source={require('./assets/logo.png')} 
          style={{
            width: 100,
            height: 100,
            marginBottom: 20,
          }}
          resizeMode="contain"
        />
        <Text style={{
          fontSize: 28,
          fontWeight: '700',
          color: '#FAFAFA',
        }}>Biblely</Text>
      </Animated.View>
    </View>
  );
};

// Import bible audio service to track audio state
import bibleAudioService from './src/services/bibleAudioService';

// ============================================================
// 90-DAY HISTORY CLEANUP
// Runs once on app startup to purge workout history & completed
// tasks older than 90 days from both local storage and Firebase.
// ============================================================
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

const cleanOldCompletedTasks = async () => {
  try {
    // Use UID-scoped userStorage to prevent cross-account data leaks
    const todosStr = await userStorage.getRaw('fivefold_todos');
    if (!todosStr) return;
    const todos = JSON.parse(todosStr);
    if (!Array.isArray(todos)) return;

    const cutoff = Date.now() - RETENTION_MS;
    const cleaned = todos.filter(todo => {
      // Only prune completed tasks — active tasks stay forever
      if (!todo.completed) return true;
      const dateStr = todo.completedAt || todo.createdAt;
      if (!dateStr) return true; // keep if no date
      const t = new Date(dateStr).getTime();
      if (isNaN(t)) return true;
      return t > cutoff;
    });

    if (cleaned.length < todos.length) {
      await userStorage.setRaw('fivefold_todos', JSON.stringify(cleaned));
      console.log(`🧹 Cleaned completed tasks: ${todos.length} → ${cleaned.length} (removed ${todos.length - cleaned.length} entries older than 90 days)`);
    }
  } catch (e) {
    console.warn('⚠️ Error cleaning old completed tasks:', e);
  }
};

// Also clean the separate completedTodos key used by sync
const cleanOldCompletedTodosSync = async () => {
  try {
    // Use UID-scoped userStorage to prevent cross-account data leaks
    const str = await userStorage.getRaw('completedTodos');
    if (!str) return;
    const arr = JSON.parse(str);
    if (!Array.isArray(arr)) return;

    const cutoff = Date.now() - RETENTION_MS;
    const cleaned = arr.filter(entry => {
      if (!entry) return false;
      const dateStr = entry.completedAt || entry.completedDate || entry.date || entry.createdAt;
      if (!dateStr) return true;
      const t = new Date(dateStr).getTime();
      if (isNaN(t)) return true;
      return t > cutoff;
    });

    if (cleaned.length < arr.length) {
      await userStorage.setRaw('completedTodos', JSON.stringify(cleaned));
      console.log(`🧹 Cleaned completedTodos sync key: ${arr.length} → ${cleaned.length}`);
    }
  } catch (e) {
    console.warn('⚠️ Error cleaning completedTodos sync key:', e);
  }
};

const runHistoryCleanup = async () => {
  console.log('[Cleanup] Running 90-day history cleanup...');
  await Promise.all([
    WorkoutService.cleanOldHistory(),
    cleanOldCompletedTasks(),
    cleanOldCompletedTodosSync(),
  ]);
  console.log('[Cleanup] Done.');
};

// Helper: extract the active route name from navigation state (handles nested navigators)
const getActiveRouteName = (state) => {
  if (!state || !state.routes) return null;
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state);
  return route.name;
};

// Shared context so AppNavigation can read the current route set by NavigationContainer.onStateChange
const CurrentRouteContext = React.createContext(null);

// App navigation wrapper with mini workout player
const AppNavigation = () => {
  const { hasActiveWorkout, maximizeWorkout } = useWorkout();
  const { user } = useAuth(); // Check if user is authenticated
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [modalTemplateData, setModalTemplateData] = useState(null);
  const [isAudioPlayerVisible, setIsAudioPlayerVisible] = useState(false);

  // Read current route from context (set by NavigationContainer.onStateChange in ThemedApp)
  const currentRoute = React.useContext(CurrentRouteContext);
  const [firstPlayer, setFirstPlayer] = useState(null); // 'workout' or 'audio' - tracks which came first
  const achievementToastRef = React.useRef(null);

  // Track which player came first
  useEffect(() => {
    if (hasActiveWorkout && !isAudioPlayerVisible) {
      // Only workout is active
      setFirstPlayer('workout');
    } else if (!hasActiveWorkout && isAudioPlayerVisible) {
      // Only audio is active
      setFirstPlayer('audio');
    } else if (!hasActiveWorkout && !isAudioPlayerVisible) {
      // Neither active, reset
      setFirstPlayer(null);
    }
    // When both are active, keep the existing firstPlayer value
  }, [hasActiveWorkout, isAudioPlayerVisible]);

  // Track audio player visibility using the proper listener API
  useEffect(() => {
    const updateAudioVisibility = (state) => {
      if (!state) {
        setIsAudioPlayerVisible(false);
        return;
      }
      const hasVerse = !!state.currentVerse;
      const isActive = state.isPlaying || state.isPaused || state.isLoading || state.autoPlayEnabled;
      setIsAudioPlayerVisible(hasVerse && isActive);
    };
    
    // Check initial state
    const initialState = bibleAudioService.getPlaybackState?.();
    updateAudioVisibility(initialState);
    
    // Use proper listener API if available
    if (typeof bibleAudioService.addPlaybackListener === 'function') {
      const unsubscribe = bibleAudioService.addPlaybackListener(updateAudioVisibility);
      
      // Also listen for complete event to hide player
      const unsubscribeComplete = bibleAudioService.addCompleteListener?.(() => {
        setIsAudioPlayerVisible(false);
      });
      
      return () => {
        unsubscribe?.();
        unsubscribeComplete?.();
      };
    }
    
    // Fallback: poll for state changes
    const interval = setInterval(() => {
      const state = bibleAudioService.getPlaybackState?.();
      updateAudioVisibility(state);
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('openWorkoutModal', (payload = {}) => {
      console.log('🎵 Received openWorkoutModal event with payload:', payload);
      const template = payload?.template || null;
      setModalTemplateData(template);

      if (hasActiveWorkout) {
        maximizeWorkout();
      }

      setWorkoutModalVisible(true);
    });

    // Listen for batched achievements (multiple at once)
    const achievementBatchSubscription = DeviceEventEmitter.addListener('achievementsUnlockedBatch', (achievements) => {
      console.log('🏆 Achievement batch unlocked:', achievements.length);
      if (achievementToastRef.current) {
        achievementToastRef.current.showBatch(achievements);
      }
    });

    // Individual event fallback — only fires for legacy/external callers
    // (The batch handler above covers the main checkAchievements flow)
    const achievementSubscription = DeviceEventEmitter.addListener('achievementUnlocked', (data) => {
      // No-op: batch handler already shows these.
      // Kept for subscription cleanup only.
    });

    return () => {
      subscription.remove();
      achievementSubscription.remove();
      achievementBatchSubscription.remove();
    };
  }, [hasActiveWorkout, maximizeWorkout]);

  const handleMiniPlayerPress = () => {
    console.log('🎵 Mini player pressed - opening workout modal');
    maximizeWorkout();
    setModalTemplateData(null);
    setWorkoutModalVisible(true);
  };

  const handleAudioPlayerNavigate = (verseData) => {
    // Emit event to navigate to the verse being read
    console.log('🔊 Audio player tapped - navigating to verse:', verseData);
    DeviceEventEmitter.emit('navigateToAudioVerse', verseData);
  };

  return (
    <>
      <RootNavigator />
      
      {/* Global Mini Workout Player - Shows when workout is active and user is logged in */}
      {/* Position depends on who came first */}
      {/* Don't show on auth/login screen */}
      {hasActiveWorkout && user && (
        <MiniWorkoutPlayer 
          onPress={handleMiniPlayerPress} 
          bottomOffset={
            // Only offset for the audio bar if it's actually visible (not hidden on BibleReader)
            (isAudioPlayerVisible && currentRoute !== 'BibleReader')
              ? (firstPlayer === 'workout' ? 95 : 180) // Workout first = bottom, otherwise top
              : 95 // Only workout = bottom
          }
        />
      )}

      {/* Global Bible Audio Player - Shows when Bible audio is playing */}
      {/* Position depends on who came first */}
      {/* Audio on top = 150px (55px gap from bottom player), Audio on bottom = 95px */}
      {/* Don't show on auth/login screen */}
      {/* Hide on BibleReader screen — that screen already has inline audio controls */}
      {user && currentRoute !== 'BibleReader' && (
        <PersistentAudioPlayerBar 
          bottomOffset={
            hasActiveWorkout 
              ? (firstPlayer === 'audio' ? 95 : 150) // Audio first = bottom (95), otherwise top (150 for 55px gap)
              : 95 // Only audio = bottom
          }
          onNavigateToVerse={handleAudioPlayerNavigate}
        />
      )}

      {/* Workout Modal - Opens when mini player is tapped */}
      <WorkoutModal
        visible={workoutModalVisible}
        onClose={() => {
          setWorkoutModalVisible(false);
          setModalTemplateData(null);
        }}
        templateData={modalTemplateData}
      />

      {/* Global Achievement Notification */}
      <AchievementToast ref={achievementToastRef} />
    </>
  );
};

// App component wrapped with theme
const ThemedApp = () => {
  const { theme, isDark, reloadTheme } = useTheme();
  const { user } = useAuth();
  const [isReloading, setIsReloading] = useState(false);
  const [appKey, setAppKey] = useState(0); // Used to force remount
  const navigationRef = useRef(null);
  const pendingNavigationRef = useRef(null); // Store pending navigation if nav isn't ready
  const prevUserIdRef = useRef(undefined); // Start as undefined, not null
  const [currentRoute, setCurrentRoute] = useState(null);

  // Run 90-day history cleanup once on app startup
  useEffect(() => {
    runHistoryCleanup();
  }, []);
  
  // Listen for userDataDownloaded event to reload theme after sign-in sync
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('userDataDownloaded', () => {
      console.log('[App] Received userDataDownloaded event, reloading theme...');
      reloadTheme?.();
    });
    
    return () => subscription.remove();
  }, [reloadTheme]);
  
  // Also reload theme when user changes (sign out clears data)
  useEffect(() => {
    const currentUserId = user?.uid || null;
    const prevUserId = prevUserIdRef.current;
    
    // Skip the very first render (when prevUserId is undefined)
    if (prevUserId === undefined) {
      prevUserIdRef.current = currentUserId;
      return;
    }
    
    // If user signed out (had a user, now null), reload theme to reset
    if (prevUserId !== null && currentUserId === null) {
      console.log('[App] User signed out, reloading theme to default...');
      setTimeout(() => reloadTheme?.(), 100);
    }
    
    prevUserIdRef.current = currentUserId;
  }, [user?.uid, reloadTheme]);
  
  // Store pending widget verse for when app finishes loading
  const pendingWidgetVerseRef = useRef(null);
  
  // Process a widget verse navigation (called when nav is ready)
  const processWidgetVerse = useCallback((decodedRef) => {
    console.log('📖 Processing widget verse:', decodedRef);
    
    global.__WIDGET_LAUNCH__ = true;
    
    DeviceEventEmitter.emit('closeAllModals');
    
    setTimeout(() => {
      if (navigationRef.current?.isReady()) {
        try {
          navigationRef.current.navigate('BiblePrayer');
          console.log('✅ Navigated to BiblePrayer tab for widget');
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
        }
      }
      
      setTimeout(() => {
        DeviceEventEmitter.emit('widgetVerseNavigation', decodedRef);
      }, 300);
    }, 100);
    
    setTimeout(() => {
      global.__WIDGET_LAUNCH__ = false;
    }, 1500);
  }, []);
  
  // Handle deep links from widgets
  const handleDeepLink = useCallback((url) => {
    if (!url) return;
    
    console.log('🔗 Deep link received:', url);
    
    try {
      if (url.startsWith('biblely://verse')) {
        const urlObj = new URL(url);
        const reference = urlObj.searchParams.get('ref');
        
        if (reference) {
          const decodedRef = decodeURIComponent(reference);
          console.log('📖 Widget tap - verse:', decodedRef);
          
          global.__WIDGET_LAUNCH__ = true;
          
          // Check if navigation is ready
          if (navigationRef.current?.isReady()) {
            // App is already running - process immediately
            processWidgetVerse(decodedRef);
          } else {
            // App is cold-launching - store for later and process when ready
            console.log('📱 Navigation not ready, storing pending widget verse');
            pendingWidgetVerseRef.current = decodedRef;
          }
        }
      }
    } catch (error) {
      console.error('❌ Error parsing deep link:', error);
    }
  }, [processWidgetVerse]);
  
  // Listen for deep links
  useEffect(() => {
    // Handle initial URL (app launched from widget)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });
    
    // Handle URLs while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Map notification data to a navigation payload (same logic as notificationService)
  const mapNotificationToNavPayload = (data) => {
    if (!data?.type) return null;
    
    let tab = null;
    let additionalData = null;
    
    switch (data.type) {
      case 'prayer_reminder':
      case 'missed_prayer':
      case 'custom_prayer':
        tab = 'BiblePrayer';
        additionalData = { prayerSlot: data.prayerSlot, prayerName: data.prayerName };
        break;
      case 'workout_reminder':
      case 'workout_overdue':
        tab = 'Gym';
        additionalData = { templateId: data.templateId, scheduleId: data.scheduleId };
        break;
      case 'task_reminder':
        tab = 'Todos';
        additionalData = { taskId: data.taskId };
        break;
      case 'weekly_body_checkin':
        tab = 'Gym';
        additionalData = { openNutrition: true };
        break;
      case 'daily_streak':
      case 'streak_reminder':
        tab = 'Profile';
        additionalData = { streakType: data.streakType };
        break;
      case 'achievement':
        tab = 'Profile';
        break;
      case 'message':
        if (data.senderId) {
          tab = 'Chat';
          additionalData = {
            otherUserId: data.senderId,
            otherUser: { uid: data.senderId, displayName: data.senderName || 'Friend' },
          };
        } else {
          tab = 'Hub';
        }
        break;
      case 'friend_request':
      case 'friend_accepted':
      case 'challenge':
      case 'challenge_received':
      case 'challenge_result':
        tab = 'Hub';
        break;
      default:
        console.log('📱 [mapNotificationToNavPayload] Unknown type:', data.type);
        return null;
    }
    
    return tab ? { tab, data: additionalData, notificationType: data.type } : null;
  };
  
  // Track the last navigation to prevent double-navigating from dual listeners
  const lastNavTimestampRef = useRef(0);
  
  // Handle notification-based navigation
  const handleNotificationNavigation = (payload) => {
    const { tab, data, notificationType } = payload;
    
    // Deduplication: prevent the same navigation from firing twice within 2 seconds
    // (both DeviceEventEmitter and direct Expo listener may fire for the same tap)
    const now = Date.now();
    if (now - lastNavTimestampRef.current < 2000) {
      console.log('📱 Notification navigation deduplicated (already navigated recently)');
      return;
    }
    lastNavTimestampRef.current = now;
    
    console.log('📱 Notification navigation request:', { tab, notificationType });
    
    // Navigate to the appropriate screen
    if (navigationRef.current?.isReady()) {
      try {
        // For stack screens like Chat, pass data as route params
        if (tab === 'Chat' && data) {
          navigationRef.current.navigate('Chat', {
            otherUser: data.otherUser,
            otherUserId: data.otherUserId,
          });
          console.log('✅ Navigated directly to Chat with:', data.otherUser?.displayName);
        } else {
          navigationRef.current.navigate(tab);
          console.log('✅ Navigated to:', tab);
        }
        
        // Emit a secondary event for the specific screen to handle additional data
        if (data) {
          setTimeout(() => {
            DeviceEventEmitter.emit('notificationDataReceived', {
              tab,
              data,
              notificationType,
            });
          }, 300);
        }
      } catch (error) {
        console.error('❌ Navigation error:', error);
      }
    } else {
      // Navigation not ready yet, store for later
      console.log('📱 Navigation not ready, storing pending navigation');
      pendingNavigationRef.current = payload;
    }
  };
  
  // Listen for notification navigation events (from notificationService via DeviceEventEmitter)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('notificationNavigation', handleNotificationNavigation);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // CRITICAL: Direct Expo notification response listener as a safety net.
  // This catches notification taps even when the DeviceEventEmitter flow fails
  // (e.g., cold start race condition, app killed state, etc.)
  const handledResponseIdsRef = useRef(new Set());
  useEffect(() => {
    // 1. Register the listener for future taps while app is running
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const responseId = response.notification.request.identifier;
      const data = response.notification.request.content?.data;
      
      console.log('📱 [App.js Direct Listener] Notification response:', responseId, data?.type);
      
      // Avoid double-processing (notificationService also handles this)
      if (handledResponseIdsRef.current.has(responseId)) {
        console.log('📱 [App.js Direct Listener] Already handled, skipping');
        return;
      }
      handledResponseIdsRef.current.add(responseId);
      
      // Keep set small
      if (handledResponseIdsRef.current.size > 20) {
        const arr = [...handledResponseIdsRef.current];
        handledResponseIdsRef.current = new Set(arr.slice(-10));
      }
      
      // Process directly — don't rely on DeviceEventEmitter round-trip
      const payload = mapNotificationToNavPayload(data);
      if (payload) {
        // Small delay to ensure navigation is mounted
        setTimeout(() => handleNotificationNavigation(payload), 200);
      }
    });
    
    // 2. Check for cold-start notification (app launched from killed state by tapping a notification)
    Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
      if (lastResponse) {
        const responseId = lastResponse.notification.request.identifier;
        const data = lastResponse.notification.request.content?.data;
        
        // Guard against stale responses from previous app sessions.
        // Only process if the notification was interacted with in the last 30 seconds.
        const actionTimestamp = lastResponse.actionIdentifier 
          ? Date.now() // actionIdentifier present means it was a real tap
          : 0;
        const notifDate = lastResponse.notification?.date;
        const responseAge = notifDate ? (Date.now() - notifDate) : Infinity;
        
        console.log('📱 [App.js Cold Start] Found last notification response:', responseId, data?.type, 'age:', Math.round(responseAge / 1000), 's');
        
        // Only process if notification is fresh (< 30 seconds old) and not already handled
        if (responseAge < 30000 && !handledResponseIdsRef.current.has(responseId)) {
          handledResponseIdsRef.current.add(responseId);
          const payload = mapNotificationToNavPayload(data);
          if (payload) {
            // Longer delay for cold start — navigation might not be ready yet
            const attemptNavigation = () => {
              if (navigationRef.current?.isReady()) {
                handleNotificationNavigation(payload);
              } else {
                // If navigation isn't ready, store it as pending
                console.log('📱 [App.js Cold Start] Nav not ready, storing as pending');
                pendingNavigationRef.current = payload;
              }
            };
            setTimeout(attemptNavigation, 500);
          }
        } else if (responseAge >= 30000) {
          console.log('📱 [App.js Cold Start] Stale response (', Math.round(responseAge / 1000), 's old), ignoring');
        }
      }
    }).catch((err) => {
      console.warn('📱 [App.js Cold Start] Error checking last response:', err.message);
    });
    
    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Listen for audio player navigation events (tap on audio player bar)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('navigateToAudioVerse', (verseData) => {
      console.log('🔊 Navigating to audio verse:', verseData);
      
      // Navigate to BiblePrayer tab
      if (navigationRef.current?.isReady()) {
        try {
          navigationRef.current.navigate('BiblePrayer');
          console.log('✅ Navigated to BiblePrayer tab for audio verse');
          
          // Emit event to open Bible reader at the specific verse
          setTimeout(() => {
            DeviceEventEmitter.emit('openBibleReaderAtVerse', verseData);
          }, 300);
        } catch (error) {
          console.error('❌ Audio verse navigation error:', error);
        }
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Initialize notifications and API security on app start
  useEffect(() => {
    // Preload the current theme's wallpaper into memory so it's ready before scrolling
    const preloadWallpaper = async () => {
      try {
        // Use UID-scoped storage; fall back to raw AsyncStorage for pre-migration compat
        const currentTheme = await userStorage.getRaw('fivefold_theme') || await AsyncStorage.getItem('fivefold_theme');
        const wallpaperIndex = await userStorage.getRaw('fivefold_wallpaper_index') || await AsyncStorage.getItem('fivefold_wallpaper_index');

        // Map theme name to wallpaper require() 
        const wallpaperMap = {
          'blush': require('./src/themes/blush-bloom/wallpaper1.jpg'),
          'cresvia': require('./src/themes/cresvia/wallpaper1.png'),
          'eterna': require('./src/themes/eterna/wallpaper1.jpg'),
          'spiderman': require('./src/themes/spiderman/wallpaper1.jpg'),
          'faith': require('./src/themes/faith/wallpaper1.jpg'),
          'sailormoon': require('./src/themes/sailormoon/wallpaper1.jpg'),
        };

        // Biblely theme has multiple wallpapers
        const biblelyWallpapers = [
          require('./src/themes/biblely/wallpaper1.jpg'),
          require('./src/themes/biblely/wallpaper2.jpg'),
          require('./src/themes/biblely/wallpaper3.jpg'),
        ];

        let wallpaperToLoad = null;

        if (currentTheme && wallpaperMap[currentTheme]) {
          wallpaperToLoad = wallpaperMap[currentTheme];
        } else {
          // Default/Biblely theme
          const idx = wallpaperIndex ? parseInt(wallpaperIndex, 10) : 0;
          wallpaperToLoad = biblelyWallpapers[idx] || biblelyWallpapers[0];
        }

        if (wallpaperToLoad) {
          await Asset.loadAsync(wallpaperToLoad);
          console.log('Wallpaper preloaded into memory');
        }
      } catch (error) {
        // Non-critical — wallpaper will still load normally, just slightly delayed
        console.log('Wallpaper preload skipped:', error.message);
      }
    };

    const initializeApp = async () => {
      try {
        // Preload wallpaper FIRST (runs during loading screen)
        await preloadWallpaper();

        // Initialize API security
        await initializeApiSecurity();
        console.log('API security initialized');

        // Initialize iCloud sync
        const iCloudAvailable = await iCloudSyncService.initialize();
        console.log('☁️ iCloud sync initialized:', iCloudAvailable ? 'available' : 'not available');

        // Enable auto-sync: all data changes push to iCloud, foreground pulls from iCloud
        if (iCloudAvailable) {
          iCloudSyncService.enableAutoSync();
          console.log('☁️ iCloud auto-sync enabled — syncing on every data change');
        }

        // Initialize notifications
        await notificationService.initialize();
        await notificationService.scheduleStoredPrayerReminders();
        await notificationService.debugListScheduledNotifications('after-app-start');

        // Schedule Daily Check-In if enabled (avoid "instant" fires via next-occurrence logic)
        const notificationSettings =
          (await getStoredData('notificationSettings')) || {
            prayerReminders: true,
            achievementNotifications: true,
            streakReminders: true,
            pushNotifications: true,
            sound: true,
            vibration: true,
          };

        if (notificationSettings.pushNotifications !== false && notificationSettings.streakReminders) {
          await notificationService.scheduleDailyStreakReminder(20, 0);
        }
        await notificationService.debugListScheduledNotifications('after-daily-checkin');

        console.log('Notifications initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    // Cleanup on app unmount
    return () => {
      notificationService.cleanup();
      iCloudSyncService.disableAutoSync();
    };
  }, []);

  // ============================================================
  // FIREBASE AUTO-SYNC
  // Automatically syncs data to Firebase when local data changes
  // and downloads from Firebase when app comes to foreground.
  // This ensures account-based sync (same user on multiple devices).
  // ============================================================
  const firebaseSyncTimerRef = useRef(null);
  const firebaseDirtyKeysRef = useRef(new Set());
  const lastFirebaseDownloadRef = useRef(0);

  useEffect(() => {
    if (!user?.uid) return;

    const userId = user.uid;

    // --- 1. Listen for data changes (via iCloud auto-sync notifications) ---
    // When any synced key changes locally, schedule a batched Firebase upload
    const removeKeyListener = iCloudSyncService.addListener((event, data) => {
      if (event === 'key_changed' && data?.key) {
        firebaseDirtyKeysRef.current.add(data.key);

        // Debounce: batch all changes into one Firebase upload after 5 seconds of quiet
        if (firebaseSyncTimerRef.current) {
          clearTimeout(firebaseSyncTimerRef.current);
        }

        firebaseSyncTimerRef.current = setTimeout(async () => {
          const dirtyKeys = new Set(firebaseDirtyKeysRef.current);
          firebaseDirtyKeysRef.current.clear();

          if (dirtyKeys.size === 0) return;

          console.log(`[Firebase] Auto-syncing ${dirtyKeys.size} changed keys:`, [...dirtyKeys]);

          try {
            // Determine which sync functions to call based on changed keys
            const syncPromises = [];

            // Saved verses
            if (dirtyKeys.has('savedBibleVerses')) {
              syncPromises.push(syncSavedVersesToCloud(userId));
            }

            // Journal notes
            if (dirtyKeys.has('journalNotes') || dirtyKeys.has('journal_notes')) {
              syncPromises.push(syncJournalNotesToCloud(userId));
            }

            // Prayers
            if (dirtyKeys.has('fivefold_simplePrayers') || dirtyKeys.has('userPrayers') || dirtyKeys.has('prayer_completions') || dirtyKeys.has('prayer_history')) {
              syncPromises.push(syncPrayersToCloud(userId));
            }

            // Theme
            if (dirtyKeys.has('theme_preference') || dirtyKeys.has('fivefold_theme') || dirtyKeys.has('fivefold_dark_mode')) {
              syncPromises.push(syncThemePreferencesToCloud(userId));
            }

            // Stats/points
            if (dirtyKeys.has('total_points') || dirtyKeys.has('fivefold_user_stats') || dirtyKeys.has('fivefold_userStats') || dirtyKeys.has('userLevel') || dirtyKeys.has('userPoints')) {
              syncPromises.push(syncUserStatsToCloud(userId));
            }

            // History and everything else (todos, workouts, streaks, settings, etc.)
            const historyKeys = [
              'fivefold_todos', 'completedTodos', 'workoutHistory', 'quizHistory',
              'prayerHistory', 'app_open_streak', 'app_streak_data', 'reading_streaks',
              'readingProgress', 'selectedBibleVersion', 'weightUnit', 'verse_data',
              'bookmarks', 'highlight_custom_names', 'achievements',
            ];
            if ([...dirtyKeys].some(k => historyKeys.includes(k))) {
              syncPromises.push(syncAllHistoryToCloud(userId));
            }

            await Promise.allSettled(syncPromises);
            console.log('[Firebase] Auto-sync complete');
          } catch (error) {
            console.warn('[Firebase] Auto-sync error:', error.message);
          }
        }, 5000); // 5 second debounce for Firebase (has costs, batch more)
      }
    });

    // --- 2. Download from Firebase on foreground ---
    // When app comes to foreground, pull latest data from Firebase
    // Cooldown: at most once every 60 seconds to avoid excessive reads
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && userId) {
        const now = Date.now();
        const elapsed = now - lastFirebaseDownloadRef.current;

        if (elapsed > 60000) { // 60 second cooldown
          lastFirebaseDownloadRef.current = now;
          console.log('[Firebase] App came to foreground — downloading latest data...');

          setTimeout(async () => {
            try {
              const result = await downloadAndMergeCloudData(userId);
              if (result) {
                console.log('[Firebase] Foreground download complete — data merged');
                // Emit event so screens can refresh their data
                DeviceEventEmitter.emit('firebaseDataDownloaded');
              }
            } catch (error) {
              console.warn('[Firebase] Foreground download error:', error.message);
            }
          }, 1500); // 1.5s delay — let iCloud sync finish first
        }
      }
    });

    return () => {
      removeKeyListener();
      appStateSubscription.remove();
      if (firebaseSyncTimerRef.current) {
        clearTimeout(firebaseSyncTimerRef.current);
      }
    };
  }, [user?.uid]);

  // Listen for Bible version changes and trigger full app reload
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('bibleVersionChanged', async (newVersion) => {
      console.log('🔄 App.js: Bible version changed, triggering FULL APP RELOAD');
      
      // Show splash screen
      setIsReloading(true);
      
      // Wait for splash animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Force complete remount of the entire app
      setAppKey(prev => prev + 1);
      
      // Hide splash screen
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsReloading(false);
      
      console.log('✅ App fully reloaded with new Bible version:', newVersion);
    });

    return () => {
      subscription.remove();
    };
  }, []);
  
  // Show splash screen during reload
  if (isReloading) {
    return <SplashScreen />;
  }
  
  return (
    <>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.background}
        translucent={false}
        hidden={false}
      />
      <ErrorBoundary key={appKey}>
        <WorkoutProvider>
          <NavigationContainer 
            key={`nav-${appKey}`}
            ref={navigationRef}
            onStateChange={(state) => {
              const routeName = getActiveRouteName(state);
              setCurrentRoute(routeName);
            }}
            onReady={() => {
              // Set initial route
              const state = navigationRef.current?.getRootState?.();
              if (state) setCurrentRoute(getActiveRouteName(state));

              // Handle any pending navigation from notification tap
              if (pendingNavigationRef.current) {
                console.log('📱 Processing pending notification navigation');
                handleNotificationNavigation(pendingNavigationRef.current);
                pendingNavigationRef.current = null;
              }
              
              // Handle any pending widget verse navigation (cold launch)
              if (pendingWidgetVerseRef.current) {
                console.log('📱 Processing pending widget verse:', pendingWidgetVerseRef.current);
                // Extra delay to ensure BiblePrayerTab is mounted and listener is active
                setTimeout(() => {
                  processWidgetVerse(pendingWidgetVerseRef.current);
                  pendingWidgetVerseRef.current = null;
                }, 1000);
              }
            }}
          >
            <CurrentRouteContext.Provider value={currentRoute}>
              <AppNavigation />
            </CurrentRouteContext.Provider>
          </NavigationContainer>
        </WorkoutProvider>
      </ErrorBoundary>
    </>
  );
};

// Main App component
export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}