import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, View, Text, Image, Animated, DeviceEventEmitter } from 'react-native';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import TabNavigator from './src/navigation/TabNavigator';
import notificationService from './src/services/notificationService';
import OnboardingWrapper from './src/components/OnboardingWrapper';
import { initializeApiSecurity } from './src/utils/secureApiKey';
import ErrorBoundary from './src/components/ErrorBoundary';

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

// App component wrapped with theme
const ThemedApp = () => {
  const { theme, isDark } = useTheme();
  const [isReloading, setIsReloading] = useState(false);
  const [appKey, setAppKey] = useState(0); // Used to force remount
  
  // Initialize notifications and API security on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize API security
        await initializeApiSecurity();
        console.log('API security initialized');

        // Initialize notifications
        await notificationService.initialize();
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
          <NavigationContainer key={`nav-${appKey}`}>
            <TabNavigator key={`tab-${appKey}`} />
          </NavigationContainer>
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