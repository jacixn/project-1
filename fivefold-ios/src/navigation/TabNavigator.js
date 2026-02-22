import React from 'react';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkout } from '../contexts/WorkoutContext';

// Tab screens
import BiblePrayerTab from '../screens/BiblePrayerTab';
import TodosTab from '../screens/TodosTab';
import GymTab from '../screens/GymTab';
import HubTab from '../screens/HubTab';
let ProfileTab;
try {
  ProfileTab = require('../screens/ProfileTab').default;
} catch (e) {
  console.error('[TabNavigator] ProfileTab failed to load:', e);
  // Fallback component so the app doesn't crash
  ProfileTab = () => {
    const { View, Text } = require('react-native');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 16 }}>ProfileTab failed to load</Text>
        <Text style={{ color: 'gray', fontSize: 12, marginTop: 8 }}>{String(e)}</Text>
      </View>
    );
  };
}

const Tab = createNativeBottomTabNavigator();

const TabNavigator = () => {
  const { theme, isDark } = useTheme();
  const { hasActiveWorkout } = useWorkout();

  // Get the active tint color based on theme
  const getActiveTintColor = () => {
      if (theme.name === 'blush') return '#FF69B4';
    if (theme.name === 'cresvia') return '#8A2BE2';
    if (theme.name === 'eterna') return '#4B0082';
    if (theme.name === 'faith') return '#4A90E2';
    return theme.primary || '#007AFF';
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: getActiveTintColor(),
      }}
      // Native iOS tab bar settings
      translucent={true}
      hapticFeedbackEnabled={true}
      sidebarAdaptable={false}
    >
      <Tab.Screen 
        name="BiblePrayer" 
        component={BiblePrayerTab}
        options={{
          title: 'Bible',
          tabBarIcon: () => ({ sfSymbol: 'book.fill' }),
          tabBarAccessibilityLabel: 'Bible tab',
        }}
      />
      <Tab.Screen 
        name="Todos" 
        component={TodosTab}
        options={{
          title: 'Tasks',
          tabBarIcon: () => ({ sfSymbol: 'checkmark.circle.fill' }),
          tabBarAccessibilityLabel: 'Tasks tab',
        }}
      />
      <Tab.Screen 
        name="Gym" 
        component={GymTab}
        options={{
          title: 'Fitness',
          tabBarIcon: () => ({ sfSymbol: 'figure.strengthtraining.traditional' }),
          tabBarBadge: hasActiveWorkout ? '' : undefined,
          tabBarAccessibilityLabel: 'Fitness tab',
        }}
      />
      <Tab.Screen 
        name="Hub" 
        component={HubTab}
        options={{
          title: 'Hub',
          tabBarIcon: () => ({ sfSymbol: 'bubble.left.and.bubble.right.fill' }),
          tabBarAccessibilityLabel: 'Hub tab',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileTab}
        options={{
          title: 'Profile',
          tabBarIcon: () => ({ sfSymbol: 'person.fill' }),
          tabBarAccessibilityLabel: 'Profile tab',
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
