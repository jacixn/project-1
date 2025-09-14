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

const { width: screenWidth } = Dimensions.get('window');

const ModernLiquidTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDark } = useTheme();
  const isBlushTheme = theme === 'blush';
  const isCresviaTheme = theme === 'cresvia';
  const isEternaTheme = theme === 'eterna';

  // Calculate dimensions
  const containerWidth = screenWidth * 0.85; // 85% of screen width
  const maxWidth = Math.min(containerWidth, 320); // Max 320px
  const tabsContainerPadding = 24; // 12px on each side
  const availableWidth = maxWidth - tabsContainerPadding;
  const tabWidth = availableWidth / state.routes.length;
  
  // Advanced Animation References
  const morphAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const floatAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimations = useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  // Dynamic Island State
  const [activeIndex, setActiveIndex] = useState(state.index);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Floating animation - continuous subtle movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect - continuous subtle glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Calculate exact position for the morphing background
    // Center the background within each tab by adding half the difference
    const backgroundWidth = availableWidth / 3; // Dynamic island width (33.33%)
    const tabCenter = state.index * tabWidth + (tabWidth / 2); // Center of the tab
    const targetPosition = tabCenter - (backgroundWidth / 2); // Center the background
    
    // Always animate to current position
    setIsTransitioning(true);
    
    // Dynamic Island morphing animation
    Animated.spring(morphAnimation, {
      toValue: targetPosition,
      tension: 300,
      friction: 30,
      useNativeDriver: true,
    }).start(() => {
      setIsTransitioning(false);
    });

      // Glow pulse effect
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Scale animations for tabs
      scaleAnimations.forEach((anim, index) => {
        Animated.spring(anim, {
          toValue: index === state.index ? 1.1 : 1,
          tension: 300,
          friction: 20,
          useNativeDriver: true,
        }).start();
      });

      // Pulse effect for active tab
      if (state.index !== activeIndex) {
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }

    setActiveIndex(state.index);
  }, [state.index, tabWidth, morphAnimation]);

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
      {/* Floating Container with Advanced Glassmorphism */}
      <Animated.View
        style={[
          styles.floatingContainer,
          {
            transform: [
              {
                translateY: floatAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
            ],
          },
        ]}
      >
        {/* Multi-layer Blur Background */}
        <BlurView
          intensity={isDark ? 60 : 40}
          style={[
            styles.blurBackground,
            {
              backgroundColor: isBlushTheme || isCresviaTheme || isEternaTheme
                ? 'rgba(255, 255, 255, 0.03)'
                : isDark
                ? 'rgba(0, 0, 0, 0.05)'
                : 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        >
          {/* Shimmer Overlay */}
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                opacity: shimmerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.1, 0.3],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={[
                'transparent',
                isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>

          {/* Dynamic Island Morphing Background */}
          <Animated.View
            style={[
              styles.dynamicIsland,
              {
                transform: [{ translateX: morphAnimation }],
                opacity: glowAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ]}
          >
            {/* Multi-layer Island Effect */}
            <BlurView
              intensity={25}
              style={[
                styles.islandCore,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            />
            
            {/* Glow Ring */}
            <Animated.View
              style={[
                styles.glowRing,
                {
                  opacity: glowAnimation,
                  transform: [{ scale: pulseAnimation }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                  isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  'transparent',
                ]}
                style={styles.gradientRing}
              />
            </Animated.View>
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
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.tabContent,
                      {
                        transform: [{ scale: scaleAnimations[index] }],
                      },
                    ]}
                  >
                    {/* Icon with Advanced Effects */}
                    <Animated.View
                      style={[
                        styles.iconContainer,
                        isFocused && {
                          transform: [{ scale: pulseAnimation }],
                        },
                      ]}
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
                            ? 'rgba(255, 255, 255, 0.35)'
                            : 'rgba(0, 0, 0, 0.35)'
                        }
                        style={[
                          styles.tabIcon,
                          isFocused && {
                            textShadowColor: isDark 
                              ? 'rgba(255, 255, 255, 0.6)' 
                              : 'rgba(0, 0, 0, 0.4)',
                            textShadowOffset: { width: 0, height: 2 },
                            textShadowRadius: 4,
                          },
                        ]}
                      />
                      
                      {/* Icon Glow Effect */}
                      {isFocused && (
                        <Animated.View
                          style={[
                            styles.iconGlow,
                            {
                              opacity: glowAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 0.7],
                              }),
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={getTabIcon(route.name)}
                            size={24}
                            color={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)'}
                          />
                        </Animated.View>
                      )}
                    </Animated.View>
                    
                    {/* Label with Typography Enhancement */}
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color: isFocused
                            ? isDark
                              ? '#FFFFFF'
                              : '#000000'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.35)'
                            : 'rgba(0, 0, 0, 0.35)',
                          fontWeight: isFocused ? '800' : '500',
                          fontSize: isFocused ? 13 : 11,
                          letterSpacing: isFocused ? 0.5 : 0,
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
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 40,
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
    width: '85%',
    maxWidth: 320,
  },
  blurBackground: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 70,
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  dynamicIsland: {
    position: 'absolute',
    top: 6,
    left: 12, // Match tabsContainer paddingHorizontal
    bottom: 6,
    width: `${100 / 3}%`,
    borderRadius: 20,
    overflow: 'hidden',
  },
  islandCore: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 23,
    overflow: 'hidden',
  },
  gradientRing: {
    flex: 1,
    borderRadius: 23,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 70,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 3,
  },
  tabIcon: {
    marginBottom: 2,
  },
  iconGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default ModernLiquidTabBar;
