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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width } = Dimensions.get('window');

const LiquidGlassTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme } = useTheme();
  const [dimensions, setDimensions] = useState({ width: width - 40 });
  const morphAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimations = useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  // Calculate tab width and position
  const tabWidth = dimensions.width / state.routes.length;
  const activeTabIndex = state.index;

  useEffect(() => {
    // Animate the morphing pill to the active tab
    Animated.spring(morphAnimation, {
      toValue: activeTabIndex * tabWidth,
      useNativeDriver: false,
      tension: 300,
      friction: 30,
    }).start();

    // Animate glow effect
    Animated.sequence([
      Animated.timing(glowAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnimation, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();

    // Scale animations for active/inactive states
    scaleAnimations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: index === activeTabIndex ? 1.1 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }).start();
    });
  }, [activeTabIndex, tabWidth]);

  const getTabIcon = (routeName) => {
    switch (routeName) {
      case 'BiblePrayer':
        return 'menu-book';
      case 'Todos':
        return 'check-circle';
      case 'Profile':
        return 'person';
      default:
        return 'circle';
    }
  };

  const getTabLabel = (routeName) => {
    switch (routeName) {
      case 'BiblePrayer':
        return 'Feed';
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
      {/* Main Glass Container */}
      <BlurView
        intensity={isDark ? 40 : 30}
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: isBlushTheme || isCresviaTheme || isEternaTheme
              ? 'rgba(255, 255, 255, 0.05)'
              : isDark
              ? 'rgba(0, 0, 0, 0.1)'
              : 'rgba(255, 255, 255, 0.15)',
          },
        ]}
      >
        {/* Animated Morphing Pill Background */}
        <Animated.View
          style={[
            styles.morphingPill,
            {
              width: tabWidth * 0.9,
              transform: [{ translateX: morphAnimation }],
              marginLeft: tabWidth * 0.05,
            },
          ]}
        >
          {/* Subtle Inner Glow Effect */}
          <BlurView
            intensity={20}
            style={[
              styles.pillInner,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.02)',
              },
            ]}
          />
          
          {/* Very Subtle Border Glow - Only on Active */}
          <Animated.View
            style={[
              styles.subtleGlow,
              {
                opacity: glowAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3],
                }),
              },
            ]}
          />
        </Animated.View>

        {/* Tab Buttons */}
        <View style={styles.tabsContainer}>
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
                style={styles.tabButton}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    styles.tabContent,
                    {
                      transform: [{ scale: scaleAnimations[index] }],
                    },
                  ]}
                >
                  <MaterialIcons
                    name={getTabIcon(route.name)}
                    size={24}
                    color={
                      isFocused
                        ? isDark
                          ? '#FFFFFF'
                          : '#000000'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.6)'
                        : 'rgba(0, 0, 0, 0.6)'
                    }
                    style={[
                      styles.tabIcon,
                      isFocused && styles.activeTabIcon,
                    ]}
                  />
                  
                  {/* Tab Label */}
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isFocused
                          ? isDark
                            ? '#FFFFFF'
                            : '#000000'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.6)'
                          : 'rgba(0, 0, 0, 0.6)',
                        opacity: isFocused ? 1 : 0.8,
                        fontWeight: isFocused ? '600' : '500',
                      },
                    ]}
                  >
                    {getTabLabel(route.name)}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    height: 80,
    justifyContent: 'center',
  },
  tabBarContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    // iOS specific blur backdrop
    ...(Platform.OS === 'ios' && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }),
  },
  morphingPill: {
    position: 'absolute',
    top: 8,
    height: 64,
    borderRadius: 20,
    zIndex: 1,
  },
  pillInner: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  subtleGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'transparent',
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 3,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    marginBottom: 4,
  },
  activeTabIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default LiquidGlassTabBar;
