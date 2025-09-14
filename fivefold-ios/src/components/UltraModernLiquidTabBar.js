import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  PlatformColor,
} from 'react-native';
import { 
  SafeLiquidGlassView as LiquidGlassView, 
  SafeLiquidGlassContainerView as LiquidGlassContainerView, 
  safeIsLiquidGlassSupported as isLiquidGlassSupported 
} from './SafeLiquidGlass';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width: screenWidth } = Dimensions.get('window');

const UltraModernLiquidTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDark } = useTheme();
  const isBlushTheme = theme === 'blush';
  const isCresviaTheme = theme === 'cresvia';
  const isEternaTheme = theme === 'eterna';

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

  const tabWidth = (screenWidth * 0.85) / state.routes.length; // Account for 85% width

  useEffect(() => {
    // Floating animation - continuous subtle movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect - continuous subtle glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (activeIndex !== state.index) {
      setIsTransitioning(true);
      
      // Dynamic Island morphing animation
      Animated.spring(morphAnimation, {
        toValue: state.index * tabWidth,
        tension: 400,
        friction: 25,
        useNativeDriver: true,
      }).start(() => {
        setIsTransitioning(false);
      });

      // Enhanced glow pulse effect for liquid glass
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0.8,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      // Enhanced scale animations for liquid glass tabs
      scaleAnimations.forEach((anim, index) => {
        Animated.spring(anim, {
          toValue: index === state.index ? 1.12 : 1,
          tension: 450,
          friction: 18,
          useNativeDriver: true,
        }).start();
      });

      // Enhanced pulse effect for liquid glass active tab
      if (state.index !== activeIndex) {
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.18,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }

      setActiveIndex(state.index);
    }
  }, [state.index, tabWidth, activeIndex]);

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

  // Enhanced fallback component for unsupported devices
  const FallbackGlassView = ({ children, style, interactive, effect, tintColor, ...props }) => {
    // If liquid glass is not supported, use enhanced blur fallback
    const fallbackStyle = [
      style,
      {
        backgroundColor: tintColor || (
          isBlushTheme || isCresviaTheme || isEternaTheme
            ? 'rgba(255, 255, 255, 0.08)'
            : isDark
            ? 'rgba(0, 0, 0, 0.12)'
            : 'rgba(255, 255, 255, 0.18)'
        ),
      },
    ];

    return (
      <BlurView
        intensity={effect === 'clear' ? (isDark ? 40 : 25) : (isDark ? 60 : 45)}
        style={fallbackStyle}
        {...props}
      >
        {children}
      </BlurView>
    );
  };

  const GlassComponent = isLiquidGlassSupported ? LiquidGlassView : FallbackGlassView;

  return (
    <View style={styles.container}>
      {/* Floating Container with Real Liquid Glass */}
      <Animated.View
        style={[
          styles.floatingContainer,
          {
            transform: [
              {
                translateY: floatAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -3],
                }),
              },
            ],
          },
        ]}
      >
        {isLiquidGlassSupported ? (
          <LiquidGlassContainerView spacing={8}>
            {/* Main Liquid Glass Background */}
            <LiquidGlassView
              effect="clear"
              interactive={false}
              tintColor={
                isBlushTheme || isCresviaTheme || isEternaTheme
                  ? 'rgba(255, 255, 255, 0.03)'
                  : isDark
                  ? 'rgba(0, 0, 0, 0.05)'
                  : 'rgba(255, 255, 255, 0.08)'
              }
              colorScheme={isDark ? 'dark' : 'light'}
              style={styles.liquidGlassBackground}
            >
              {/* Shimmer Overlay for Extra Effect */}
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    opacity: shimmerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.05, 0.15],
                    }),
                  },
                ]}
              >
                <LinearGradient
                  colors={[
                    'transparent',
                    isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                    'transparent',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>

              {/* Dynamic Island Morphing Background - Now with Liquid Glass */}
              <Animated.View
                style={[
                  styles.dynamicIslandContainer,
                  {
                    transform: [{ translateX: morphAnimation }],
                  },
                ]}
              >
              <LiquidGlassView
                effect="regular"
                interactive={false}
                tintColor={
                  isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.10)'
                }
                colorScheme={isDark ? 'dark' : 'light'}
                style={[
                  styles.dynamicIsland,
                  {
                    opacity: glowAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ]}
              >
                  {/* Glow Ring with Liquid Glass */}
                  <Animated.View
                    style={[
                      styles.glowRing,
                      {
                        opacity: glowAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.4, 0.9],
                        }),
                        transform: [{ scale: pulseAnimation }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
                        isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                        'transparent',
                      ]}
                      style={styles.gradientRing}
                    />
                  </Animated.View>
                </LiquidGlassView>
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
                    <LiquidGlassView
                      key={route.key}
                      interactive={true}
                      effect={isFocused ? "regular" : "none"}
                      tintColor={
                        isFocused
                          ? isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.05)'
                          : 'transparent'
                      }
                      colorScheme={isDark ? 'dark' : 'light'}
                      style={[
                        styles.tabButton,
                        { borderRadius: 18 },
                        !isLiquidGlassSupported && {
                          backgroundColor: isFocused
                            ? isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.08)'
                            : 'transparent',
                        },
                      ]}
                    >
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarTestID}
                        onPress={onPress}
                        style={styles.touchableArea}
                        activeOpacity={1}
                      >
                      <Animated.View
                        style={[
                          styles.tabContent,
                          {
                            transform: [{ scale: scaleAnimations[index] }],
                          },
                        ]}
                      >
                        {/* Icon with Liquid Glass Enhancement */}
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
                            size={isFocused ? 26 : 23}
                            color={
                              isLiquidGlassSupported && isFocused
                                ? PlatformColor('labelColor') // Auto-adapting color
                                : isFocused
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
                                  ? 'rgba(255, 255, 255, 0.7)' 
                                  : 'rgba(0, 0, 0, 0.5)',
                                textShadowOffset: { width: 0, height: 2 },
                                textShadowRadius: 5,
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
                                    outputRange: [0.2, 0.6],
                                  }),
                                },
                              ]}
                            >
                              <MaterialIcons
                                name={getTabIcon(route.name)}
                                size={26}
                                color={isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'}
                              />
                            </Animated.View>
                          )}
                        </Animated.View>
                        
                        {/* Label with Auto-Adapting Color */}
                        <Text
                          style={[
                            styles.tabLabel,
                            {
                              color: isLiquidGlassSupported && isFocused
                                ? PlatformColor('labelColor') // Auto-adapting color
                                : isFocused
                                ? isDark
                                  ? '#FFFFFF'
                                  : '#000000'
                                : isDark
                                ? 'rgba(255, 255, 255, 0.35)'
                                : 'rgba(0, 0, 0, 0.35)',
                              fontWeight: isFocused ? '800' : '500',
                              fontSize: isFocused ? 14 : 12,
                              letterSpacing: isFocused ? 0.6 : 0,
                              textShadowColor: isFocused 
                                ? (isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)')
                                : 'transparent',
                              textShadowOffset: { width: 0, height: 1 },
                              textShadowRadius: 3,
                            },
                          ]}
                        >
                          {getTabLabel(route.name)}
                        </Text>
                      </Animated.View>
                      </TouchableOpacity>
                    </LiquidGlassView>
                  );
                })}
              </View>
            </LiquidGlassView>
          </LiquidGlassContainerView>
        ) : (
          // Fallback for unsupported devices
          <FallbackGlassView style={styles.liquidGlassBackground}>
            {/* Same content but with BlurView fallback */}
            <Animated.View
              style={[
                styles.shimmerOverlay,
                {
                  opacity: shimmerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.05, 0.15],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={[
                  'transparent',
                  isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.dynamicIslandContainer,
                {
                  transform: [{ translateX: morphAnimation }],
                },
              ]}
            >
              <FallbackGlassView
                style={[
                  styles.dynamicIsland,
                  {
                    opacity: glowAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1],
                    }),
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.glowRing,
                    {
                      opacity: glowAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 0.9],
                      }),
                      transform: [{ scale: pulseAnimation }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
                      isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      'transparent',
                    ]}
                    style={styles.gradientRing}
                  />
                </Animated.View>
              </FallbackGlassView>
            </Animated.View>

            {/* Same tab buttons as above */}
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
                          size={isFocused ? 26 : 23}
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
                                ? 'rgba(255, 255, 255, 0.7)' 
                                : 'rgba(0, 0, 0, 0.5)',
                              textShadowOffset: { width: 0, height: 2 },
                              textShadowRadius: 5,
                            },
                          ]}
                        />
                        
                        {isFocused && (
                          <Animated.View
                            style={[
                              styles.iconGlow,
                              {
                                opacity: glowAnimation.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.2, 0.6],
                                }),
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={getTabIcon(route.name)}
                              size={26}
                              color={isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'}
                            />
                          </Animated.View>
                        )}
                      </Animated.View>
                      
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
                            fontSize: isFocused ? 14 : 12,
                            letterSpacing: isFocused ? 0.6 : 0,
                            textShadowColor: isFocused 
                              ? (isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)')
                              : 'transparent',
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
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
          </FallbackGlassView>
        )}
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
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
    width: '85%',
    maxWidth: 340,
  },
  liquidGlassBackground: {
    borderRadius: 30,
    overflow: 'hidden',
    minHeight: 75,
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    zIndex: 1,
  },
  dynamicIslandContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    width: `${100 / 3}%`,
    zIndex: 2,
  },
  dynamicIsland: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 26,
    overflow: 'hidden',
  },
  gradientRing: {
    flex: 1,
    borderRadius: 26,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 75,
    zIndex: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
  },
  touchableArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
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

export default UltraModernLiquidTabBar;
