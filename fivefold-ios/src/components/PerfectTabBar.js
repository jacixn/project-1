import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width: screenWidth } = Dimensions.get('window');

const PerfectTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDark, currentTheme } = useTheme();
  const isBlushTheme = theme === 'blush';
  const isCresviaTheme = theme === 'cresvia';
  const isEternaTheme = theme === 'eterna';

  // Simple, accurate calculations
  const containerWidth = screenWidth * 0.85;
  const maxWidth = Math.min(containerWidth, 320);
  const numberOfTabs = state.routes.length;
  const tabWidth = maxWidth / numberOfTabs;

  // Animation for the sliding background
  const slideAnimation = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    // Simple slide animation to the correct tab
    Animated.spring(slideAnimation, {
      toValue: state.index * tabWidth,
      tension: 300,
      friction: 25,
      useNativeDriver: true,
    }).start();
  }, [state.index, tabWidth]);

  const getTabIcon = (routeName) => {
    switch (routeName) {
      case 'BiblePrayer':
        return 'menu-book';
      case 'Todos':
        return 'check-circle';
      case 'Profile':
        return 'person';
      default:
        return 'home';
    }
  };

  const getTabLabel = (routeName) => {
    switch (routeName) {
      case 'BiblePrayer':
        return 'Bible';
      case 'Todos':
        return 'Tasks';
      case 'Profile':
        return 'Profile';
      default:
        return routeName;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.tabBarContainer, { width: maxWidth }]}>
        {/* Main blur background */}
        <BlurView
          intensity={isDark ? 50 : 35}
          style={[
            styles.blurBackground,
            {
              backgroundColor: isBlushTheme || isCresviaTheme || isEternaTheme
                ? 'rgba(255, 255, 255, 0.05)'
                : isDark
                ? 'rgba(0, 0, 0, 0.1)'
                : 'rgba(255, 255, 255, 0.15)',
            },
          ]}
        >
          {/* Sliding active background */}
          <Animated.View
            style={[
              styles.activeBackground,
              {
                width: tabWidth,
                transform: [{ translateX: slideAnimation }],
                backgroundColor: theme.primary,
              },
            ]}
          >
            <BlurView
              intensity={25}
              style={styles.activeBackgroundBlur}
            />
          </Animated.View>

          {/* Tab buttons */}
          <View style={styles.tabsRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;

              const onPress = () => {
                hapticFeedback.selection();
                
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  style={[styles.tabButton, { width: tabWidth }]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={getTabIcon(route.name)}
                    size={isFocused ? 24 : 22}
                    color={
                      isFocused
                        ? isDark
                          ? '#FFFFFF'
                          : '#000000'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.4)'
                        : 'rgba(0, 0, 0, 0.4)'
                    }
                    style={[
                      styles.tabIcon,
                      isFocused && {
                        textShadowColor: isDark 
                          ? 'rgba(255, 255, 255, 0.4)' 
                          : 'rgba(0, 0, 0, 0.3)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                      },
                    ]}
                  />
                  
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isFocused
                          ? isDark
                            ? '#FFFFFF'
                            : '#000000'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.4)'
                          : 'rgba(0, 0, 0, 0.4)',
                        fontWeight: isFocused ? '700' : '500',
                        fontSize: isFocused ? 13 : 11,
                        textShadowColor: isFocused 
                          ? (isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)')
                          : 'transparent',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      },
                    ]}
                  >
                    {getTabLabel(route.name)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 10 : 5,
    paddingHorizontal: 40,
    paddingTop: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  blurBackground: {
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 70,
    position: 'relative',
  },
  activeBackground: {
    position: 'absolute',
    top: 6,
    left: 0,
    bottom: 6,
    borderRadius: 22,
    overflow: 'hidden',
  },
  activeBackgroundBlur: {
    flex: 1,
    borderRadius: 22,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    minHeight: 70,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabIcon: {
    marginBottom: 3,
  },
  tabLabel: {
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default PerfectTabBar;
