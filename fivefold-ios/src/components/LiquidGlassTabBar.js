import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  LiquidGlassView,
  LiquidGlassContainerView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width: screenWidth } = Dimensions.get('window');

const LiquidGlassTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme } = useTheme();
  
  // Calculate dimensions - EXACTLY like native iOS from your image
  const tabBarWidth = screenWidth * 0.75; // Bigger like the native iOS in your image
  const maxWidth = Math.min(tabBarWidth, 414); // Increased by 50px (was 364, now 414)
  const numberOfTabs = state.routes.length;
  const tabWidth = maxWidth / numberOfTabs;
  
  // Animations for morphing bubble
  const slideAnimation = useRef(new Animated.Value(state.index * tabWidth)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Morphing animation sequence
    Animated.sequence([
      // First, scale down slightly
      Animated.timing(scaleAnimation, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      // Then slide to new position while scaling back up
      Animated.parallel([
        Animated.spring(slideAnimation, {
          toValue: state.index * tabWidth,
          tension: 400,
          friction: 25,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnimation, {
          toValue: 1.1, // Slightly larger for bubble effect
          tension: 400,
          friction: 25,
          useNativeDriver: true,
        }),
      ]),
      // Finally, settle to normal size
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [state.index, tabWidth]);

  const getTabIcon = (routeName) => {
    switch (routeName) {
      case 'BiblePrayer':
        return 'menu-book';
      case 'Todos':
        return 'check-circle';
      case 'Gym':
        return 'fitness-center';
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
      case 'Gym':
        return 'Gym';
      case 'Profile':
        return 'Profile';
      default:
        return routeName;
    }
  };

  if (!isLiquidGlassSupported) {
    // Fallback for unsupported devices - beautiful blur with theme colors
    return (
      <View style={styles.container}>
        <BlurView 
          intensity={90} 
          tint={isDark ? "dark" : "light"}
          style={[styles.fallbackTabBar, { 
            width: maxWidth,
            backgroundColor: isDark 
              ? 'rgba(0, 0, 0, 0.5)' 
              : 'rgba(255, 255, 255, 0.7)'
          }]}
        >
          {/* Fallback active indicator with theme colors */}
          <Animated.View
            style={[
              styles.fallbackActiveIndicator,
              {
                width: tabWidth - 16,
                backgroundColor: isBlushTheme 
                  ? 'rgba(255, 105, 180, 0.4)' 
                  : isCresviaTheme 
                  ? 'rgba(138, 43, 226, 0.35)' 
                  : isEternaTheme 
                  ? 'rgba(75, 0, 130, 0.35)'
                  : isDark 
                  ? 'rgba(255, 255, 255, 0.25)' 
                  : 'rgba(59, 130, 246, 0.35)',
                transform: [{ translateX: Animated.add(slideAnimation, new Animated.Value(8)) }],
              },
            ]}
          />
          
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
                    size={isFocused ? 32 : 28}
                    color={
                      isFocused
                        ? theme.tabActive || theme.primary
                        : theme.textSecondary || `${theme.tabActive || theme.primary}99`
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    );
  }

      return (
        <View style={styles.container}>
          <LiquidGlassContainerView spacing={8} style={styles.glassContainer}>

            {/* Main liquid glass background - native iOS style */}
            <LiquidGlassView
              interactive={false}
              effect="clear"
              colorScheme="system"
              tintColor="rgba(255, 255, 255, 0.02)" // Very subtle tint like native
              style={[styles.tabBarContainer, { width: maxWidth }]}
            >

              {/* Active tab indicator - smaller and more subtle */}
              <Animated.View
                style={[
                  styles.activeIndicator,
                  {
                    width: tabWidth - 10, // Reduced by 2px (was -8, now -10)
                    height: 63, // Increased by 5px (was 58, now 63)
                    transform: [
                      { translateX: Animated.add(slideAnimation, new Animated.Value(8)) },
                      { scale: scaleAnimation },
                    ],
                  },
                ]}
              >
                <LiquidGlassView
                  interactive={true}
                  effect="regular"
                  colorScheme="system"
                  tintColor={
                    isBlushTheme ? 'rgba(255, 105, 180, 0.4)' : // Beautiful hot pink for Blush
                    isCresviaTheme ? 'rgba(138, 43, 226, 0.35)' : // More vibrant purple for Cresvia
                    isEternaTheme ? 'rgba(75, 0, 130, 0.35)' : // More vibrant indigo for Eterna
                    isDark ? 'rgba(255, 255, 255, 0.25)' : // Brighter white for dark mode
                    'rgba(59, 130, 246, 0.35)' // More vibrant blue for default
                  }
                  style={styles.indicatorGlass}
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
                    size={isFocused ? 32 : 28}
                    color={
                      isFocused
                        ? theme.tabActive || theme.primary
                        : theme.textSecondary || `${theme.tabActive || theme.primary}99`
                    }
                    style={styles.tabIcon}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </LiquidGlassView>
      </LiquidGlassContainerView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 0, // Moved down by 20px (was 40, now 20)
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50, // Increased for more equal spacing
  },
  glassContainer: {
    alignItems: 'center',
  },
  fallbackTabBar: {
    height: 69,
    borderRadius: 34,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  fallbackActiveIndicator: {
    position: 'absolute',
    top: 3,
    height: 63,
    borderRadius: 31,
    zIndex: 1,
  },
  tabBarContainer: {
    height: 69, // Increased by 5px (was 64, now 69)
    borderRadius: 34, // Adjusted for new height
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02, // Almost no shadow like native
    shadowRadius: 2,
    elevation: 1,
  },
  activeIndicator: {
    position: 'absolute',
    top: 3, // Centered for 69px height with 63px pill
    borderRadius: 31, // Rounded pill shape (adjusted for new height)
    overflow: 'hidden',
    zIndex: 1,
  },
  indicatorGlass: {
    flex: 1,
    borderRadius: 31, // Rounded pill to match (adjusted for new height)
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
    paddingHorizontal: 8,
    zIndex: 2,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabLabel: {
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
  },
});

export default LiquidGlassTabBar;