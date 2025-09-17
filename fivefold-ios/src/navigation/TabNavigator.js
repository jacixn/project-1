import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
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
import ProfileTab from '../screens/ProfileTab';

const TabNavigator = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme } = useTheme();

  // Use native tabs if available, otherwise fallback to custom liquid glass
  if (createNativeBottomTabNavigator) {
    const NativeTab = createNativeBottomTabNavigator();
    
    return (
      <NativeTab.Navigator
        screenOptions={{
          headerShown: false,
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
          }}
        />
      </NativeTab.Navigator>
    );
  }

  // Fallback to custom liquid glass tab bar
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
