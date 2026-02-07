import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LogBox, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View, Text, Image, Animated, DeviceEventEmitter } from 'react-native';

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
import iCloudSyncService from './src/services/iCloudSyncService';
import MiniWorkoutPlayer from './src/components/MiniWorkoutPlayer';
import WorkoutModal from './src/components/WorkoutModal';
import AchievementToast from './src/components/AchievementToast';
import PersistentAudioPlayerBar from './src/components/PersistentAudioPlayerBar';

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

// Splash Screen Component
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
      backgroundColor: '#FFFFFF',
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
          color: '#1A1A1A',
        }}>Biblely</Text>
      </Animated.View>
    </View>
  );
};

// Import bible audio service to track audio state
import bibleAudioService from './src/services/bibleAudioService';

// App navigation wrapper with mini workout player
const AppNavigation = () => {
  const { hasActiveWorkout, maximizeWorkout } = useWorkout();
  const { user } = useAuth(); // Check if user is authenticated
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [modalTemplateData, setModalTemplateData] = useState(null);
  const [isAudioPlayerVisible, setIsAudioPlayerVisible] = useState(false);
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

    const achievementSubscription = DeviceEventEmitter.addListener('achievementUnlocked', (data) => {
      console.log('🏆 Achievement unlocked listener triggered:', data);
      if (achievementToastRef.current) {
        achievementToastRef.current.show(data.title, data.points);
      }
    });

    return () => {
      subscription.remove();
      achievementSubscription.remove();
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
            isAudioPlayerVisible 
              ? (firstPlayer === 'workout' ? 95 : 180) // Workout first = bottom, otherwise top
              : 95 // Only workout = bottom
          }
        />
      )}

      {/* Global Bible Audio Player - Shows when Bible audio is playing */}
      {/* Position depends on who came first */}
      {/* Audio on top = 150px (55px gap from bottom player), Audio on bottom = 95px */}
      {/* Don't show on auth/login screen */}
      {user && (
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
  
  // Handle notification-based navigation
  const handleNotificationNavigation = (payload) => {
    const { tab, data, notificationType } = payload;
    
    console.log('📱 Notification navigation request:', { tab, notificationType });
    
    // Navigate to the appropriate tab
    if (navigationRef.current?.isReady()) {
      try {
        navigationRef.current.navigate(tab);
        console.log('✅ Navigated to:', tab);
        
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
  
  // Listen for notification navigation events
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('notificationNavigation', handleNotificationNavigation);
    
    return () => {
      subscription.remove();
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
    const initializeApp = async () => {
      try {
        // Initialize API security
        await initializeApiSecurity();
        console.log('API security initialized');

        // Initialize iCloud sync
        const iCloudAvailable = await iCloudSyncService.initialize();
        console.log('☁️ iCloud sync initialized:', iCloudAvailable ? 'available' : 'not available');

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
    };
  }, []);

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
            onReady={() => {
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
            <AppNavigation />
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