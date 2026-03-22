import React, { useState, useEffect } from 'react';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkout } from '../contexts/WorkoutContext';
import userStorage from '../utils/userStorage';

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

const DEFAULT_ORDER = ['BiblePrayer', 'Todos', 'Gym', 'Hub', 'Profile'];

const TAB_DEFINITIONS = {
  BiblePrayer: {
    component: BiblePrayerTab,
    title: 'Faith',
    icon: 'book.fill',
    accessibilityLabel: 'Faith tab',
  },
  Todos: {
    component: TodosTab,
    title: 'Focus',
    icon: 'checkmark.circle.fill',
    accessibilityLabel: 'Focus tab',
  },
  Gym: {
    component: GymTab,
    title: 'Fitness',
    icon: 'figure.strengthtraining.traditional',
    accessibilityLabel: 'Fitness tab',
  },
  Hub: {
    component: HubTab,
    title: 'Hub',
    icon: 'bubble.left.and.bubble.right.fill',
    accessibilityLabel: 'Hub tab',
  },
  Profile: {
    component: ProfileTab,
    title: 'Profile',
    icon: 'person.fill',
    accessibilityLabel: 'Profile tab',
  },
};

let _refreshFn = null;
let _cachedConfig = undefined;

export const refreshTabBarConfig = () => _refreshFn?.();

export const preloadTabConfig = async () => {
  try {
    const config = await userStorage.get('tabBarConfig');
    _cachedConfig = config;
    return config;
  } catch (_) {
    _cachedConfig = null;
    return null;
  }
};

export { DEFAULT_ORDER, TAB_DEFINITIONS };

const TabNavigator = () => {
  const { theme, isDark } = useTheme();
  const { hasActiveWorkout } = useWorkout();
  const [tabConfig, setTabConfig] = useState(_cachedConfig ?? null);
  const [configLoaded, setConfigLoaded] = useState(_cachedConfig !== undefined);

  const loadConfig = async () => {
    try {
      const config = await userStorage.get('tabBarConfig');
      _cachedConfig = config;
      setTabConfig(config);
    } catch (_) {}
    setConfigLoaded(true);
  };

  useEffect(() => {
    if (!configLoaded) loadConfig();
    _refreshFn = loadConfig;
    return () => { _refreshFn = null; };
  }, []);

  const getActiveTintColor = () => {
    if (theme.name === 'blush') return '#FF69B4';
    if (theme.name === 'cresvia') return '#8A2BE2';
    if (theme.name === 'eterna') return '#4B0082';
    if (theme.name === 'faith') return '#4A90E2';
    return theme.primary || '#007AFF';
  };

  if (!configLoaded) return null;

  const order = tabConfig?.order || DEFAULT_ORDER;
  const hidden = new Set(tabConfig?.hidden || []);
  hidden.delete('Profile');

  const visibleTabs = order.filter(name => !hidden.has(name) && TAB_DEFINITIONS[name]);

  if (!visibleTabs.includes('Profile')) {
    visibleTabs.push('Profile');
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: getActiveTintColor(),
      }}
      translucent={true}
      hapticFeedbackEnabled={true}
      sidebarAdaptable={false}
    >
      {visibleTabs.map(name => {
        const def = TAB_DEFINITIONS[name];
        return (
          <Tab.Screen
            key={name}
            name={name}
            component={def.component}
            options={{
              title: def.title,
              tabBarIcon: () => ({ sfSymbol: def.icon }),
              tabBarBadge: name === 'Gym' && hasActiveWorkout ? '' : undefined,
              tabBarAccessibilityLabel: def.accessibilityLabel,
            }}
          />
        );
      })}
    </Tab.Navigator>
  );
};

export default TabNavigator;
