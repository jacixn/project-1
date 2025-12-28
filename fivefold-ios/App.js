import React, { useEffect, useState, useRef } from 'react';
import { LogBox, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View, Text, Image, Animated, DeviceEventEmitter } from 'react-native';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { WorkoutProvider, useWorkout } from './src/contexts/WorkoutContext';
import TabNavigator from './src/navigation/TabNavigator';
import notificationService from './src/services/notificationService';
import OnboardingWrapper from './src/components/OnboardingWrapper';
import { initializeApiSecurity } from './src/utils/secureApiKey';
import { getStoredData } from './src/utils/localStorage';
import ErrorBoundary from './src/components/ErrorBoundary';
import MiniWorkoutPlayer from './src/components/MiniWorkoutPlayer';
import WorkoutModal from './src/components/WorkoutModal';
import AchievementToast from './src/components/AchievementToast';

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

// App navigation wrapper with mini workout player
const AppNavigation = () => {
  const { hasActiveWorkout, maximizeWorkout } = useWorkout();
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [modalTemplateData, setModalTemplateData] = useState(null);
  const achievementToastRef = React.useRef(null);

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

  return (
    <>
      <TabNavigator />
      
      {/* Global Mini Workout Player - Shows when workout is active */}
      {hasActiveWorkout && (
        <MiniWorkoutPlayer onPress={handleMiniPlayerPress} />
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
  const { theme, isDark } = useTheme();
  const [isReloading, setIsReloading] = useState(false);
  const [appKey, setAppKey] = useState(0); // Used to force remount
  const navigationRef = useRef(null);
  
  // Handle deep links from widgets
  const handleDeepLink = (url) => {
    if (!url) return;
    
    console.log('🔗 Deep link received:', url);
    
    try {
      // Parse biblely://verse?ref=Proverbs%2012:2
      if (url.startsWith('biblely://verse')) {
        const urlObj = new URL(url);
        const reference = urlObj.searchParams.get('ref');
        
        if (reference) {
          const decodedRef = decodeURIComponent(reference);
          console.log('📖 Widget tap - navigating to verse:', decodedRef);
          
          // Small delay to ensure app is ready
          setTimeout(() => {
            // Navigate to Bible/Prayer tab and open verse
            DeviceEventEmitter.emit('widgetVerseNavigation', decodedRef);
          }, 500);
        }
      }
    } catch (error) {
      console.error('❌ Error parsing deep link:', error);
    }
  };
  
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
  
  // Initialize notifications and API security on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize API security
        await initializeApiSecurity();
        console.log('API security initialized');

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
        <OnboardingWrapper key={`onboarding-${appKey}`}>
          <WorkoutProvider>
            <NavigationContainer key={`nav-${appKey}`}>
              <AppNavigation />
            </NavigationContainer>
          </WorkoutProvider>
        </OnboardingWrapper>
      </ErrorBoundary>
    </>
  );
};

// Main App component
export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ThemedApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}