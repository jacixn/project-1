import React from 'react';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkout } from '../contexts/WorkoutContext';

// Tab screens
import BiblePrayerTab from '../screens/BiblePrayerTab';
import TodosTab from '../screens/TodosTab';
import GymTab from '../screens/GymTab';
import ProfileTab from '../screens/ProfileTab';

const Tab = createNativeBottomTabNavigator();

const TabNavigator = () => {
  const { theme, isDark } = useTheme();
  const { hasActiveWorkout } = useWorkout();

  // Get the active tint color based on theme
  const getActiveTintColor = () => {
    if (theme.name === 'blush') return '#FF69B4';
    if (theme.name === 'cresvia') return '#8A2BE2';
    if (theme.name === 'eterna') return '#4B0082';
    if (theme.name === 'spiderman') return '#E31E24';
    if (theme.name === 'faith') return '#4A90E2';
    if (theme.name === 'sailormoon') return '#C8A2D0';
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
        }}
      />
      <Tab.Screen 
        name="Todos" 
        component={TodosTab}
        options={{
          title: 'Tasks',
          tabBarIcon: () => ({ sfSymbol: 'checkmark.circle.fill' }),
        }}
      />
      <Tab.Screen 
        name="Gym" 
        component={GymTab}
        options={{
          title: 'Fitness',
          tabBarIcon: () => ({ sfSymbol: 'figure.strengthtraining.traditional' }),
          tabBarBadge: hasActiveWorkout ? '' : undefined,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileTab}
        options={{
          title: 'Profile',
          tabBarIcon: () => ({ sfSymbol: 'person.fill' }),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
