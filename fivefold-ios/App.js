import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import TabNavigator from './src/navigation/TabNavigator';
import notificationService from './src/services/notificationService';
import OnboardingWrapper from './src/components/OnboardingWrapper';
import { initializeApiSecurity } from './src/utils/secureApiKey';
// import ErrorBoundary from './src/components/ErrorBoundary';

// App component wrapped with theme
const ThemedApp = () => {
  const { theme, isDark } = useTheme();
  
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
  
  return (
    <>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.background}
        translucent={false}
        hidden={false}
      />
      <OnboardingWrapper>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </OnboardingWrapper>
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