import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { hapticFeedback } from '../utils/haptics';

// Import native bottom tabs with fallback
let createNativeBottomTabNavigator;
try {
  const { createNativeBottomTabNavigator: nativeTabNavigator } = require('react-native-bottom-tabs');
  createNativeBottomTabNavigator = nativeTabNavigator;
} catch (error) {
  console.log('Native bottom tabs not available, using fallback');
  createNativeBottomTabNavigator = null;
}

// Custom Liquid Glass Tab Bar
import LiquidGlassTabBar from '../components/LiquidGlassTabBar';

// Tab screens
import BiblePrayerTab from '../screens/BiblePrayerTab';
import TodosTab from '../screens/TodosTab';
import GymTab from '../screens/GymTab';
import ProfileTab from '../screens/ProfileTab';

const TabNavigator = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme } = useTheme();
  const { hasActiveWorkout } = useWorkout();

  // Debug log
  console.log('🏋️ TabNavigator - hasActiveWorkout:', hasActiveWorkout);

  // Use native tabs for iOS if available - with native iOS 26 Liquid Glass effect
  // Falls back to custom themed tabs for Android or if native tabs unavailable
  if (createNativeBottomTabNavigator && Platform.OS === 'ios') {
    const NativeTab = createNativeBottomTabNavigator();
    
    return (
      <NativeTab.Navigator
        screenOptions={{
          headerShown: false,
        }}
        appearance={{
          // Native iOS 26 Liquid Glass effect
          translucent: true,
          blur: true,
          // Let iOS handle the blur automatically based on system appearance
          // This ensures proper blur even when modals are opened/closed
        }}
      >
        <NativeTab.Screen 
          name="BiblePrayer" 
          component={BiblePrayerTab}
          options={{
            title: 'Bible',
            tabBarIcon: ({ color }) => ({
              sfSymbol: "book.fill",
              fill: color,
            }),
            scrollToTopOnPress: true,
          }}
        />
        <NativeTab.Screen 
          name="Todos" 
          component={TodosTab}
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color }) => ({
              sfSymbol: "checkmark.circle.fill",
              fill: color,
            }),
            scrollToTopOnPress: false,
          }}
        />
        <NativeTab.Screen 
          name="Gym" 
          component={GymTab}
          options={{
            title: 'Gym',
            tabBarIcon: ({ color }) => ({
              sfSymbol: "figure.strengthtraining.traditional",
              fill: color,
            }),
            tabBarBadge: hasActiveWorkout ? 1 : undefined,
            scrollToTopOnPress: false,
          }}
        />
        <NativeTab.Screen 
          name="Profile" 
          component={ProfileTab}
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => ({
              sfSymbol: "person.fill",
              fill: color,
            }),
            scrollToTopOnPress: true,
          }}
        />
      </NativeTab.Navigator>
    );
  }

  // Fallback to custom themed Liquid Glass tab bar for Android or unsupported devices
  const Tab = createBottomTabNavigator();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
    >
      <Tab.Screen 
        name="BiblePrayer" 
        component={BiblePrayerTab}
        options={{
          tabBarLabel: 'Bible',
        }}
      />
      <Tab.Screen 
        name="Todos" 
        component={TodosTab}
        options={{
          tabBarLabel: 'Tasks',
        }}
      />
      <Tab.Screen 
        name="Gym" 
        component={GymTab}
        options={{
          tabBarLabel: 'Gym',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileTab}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
