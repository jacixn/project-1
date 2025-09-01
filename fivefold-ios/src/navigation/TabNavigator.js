import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

// Tab screens
import BiblePrayerTab from '../screens/BiblePrayerTab';
import TodosTab from '../screens/TodosTab';
import ProfileTab from '../screens/ProfileTab';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'BiblePrayer') {
            iconName = 'menu-book';
          } else if (route.name === 'Todos') {
            iconName = 'check-circle';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarShowLabel: false, // Hide the text labels
        tabBarStyle: {
          backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? 'rgba(255, 255, 255, 0.5)' : theme.tabBackground, // 50% opacity as requested
          borderTopWidth: 0, // Remove border
          paddingBottom: 20, // Reduced padding
          paddingTop: 12,
          height: 65, // Reduced height
          position: 'absolute',
          bottom: 25, // Moved up from 10 to 25
          left: 20, // Big gap from sides - much more visible
          right: 20, // Big gap from sides - much more visible
          borderRadius: 24, // Slightly less rounded
          shadowColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? theme.primary : theme.shadowColor, // Theme shadow
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: (isBlushTheme || isCresviaTheme || isEternaTheme) ? 0.4 : 0.12, // More blur effect
          shadowRadius: 12,
          elevation: 6,
          // Add backdrop blur for iOS
          ...(Platform.OS === 'ios' && (isBlushTheme || isCresviaTheme || isEternaTheme) && {
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }),
        },
        tabBarIconStyle: {
          marginTop: 0, // Center the icon
        },
      })}
    >
      <Tab.Screen 
        name="BiblePrayer" 
        component={BiblePrayerTab}
        options={{
          tabBarBadge: undefined, // We can add prayer notifications here later
        }}
        listeners={() => ({
          tabPress: () => {
            hapticFeedback.selection(); // Selection feedback when switching tabs
          },
        })}
      />
      <Tab.Screen 
        name="Todos" 
        component={TodosTab}
        options={{
          tabBarBadge: undefined, // We can add task count here later
        }}
        listeners={() => ({
          tabPress: () => {
            hapticFeedback.selection(); // Selection feedback when switching tabs
          },
        })}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileTab}
        options={{
          tabBarBadge: undefined, // We can add level up notifications here later
        }}
        listeners={() => ({
          tabPress: () => {
            hapticFeedback.selection(); // Selection feedback when switching tabs
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
