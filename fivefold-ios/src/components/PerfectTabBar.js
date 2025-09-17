import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  LiquidGlassView,
  LiquidGlassContainerView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width: screenWidth } = Dimensions.get('window');

const PerfectTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDark } = useTheme();
  const isBlushTheme = theme === 'blush';
  const isCresviaTheme = theme === 'cresvia';
  const isEternaTheme = theme === 'eterna';

  // Simple, accurate calculations
  const containerWidth = screenWidth * 0.85;
  const maxWidth = Math.min(containerWidth, 290); // Increased by 45px from 245
  const numberOfTabs = state.routes.length;
  const tabWidth = maxWidth / numberOfTabs;

  // Animation for the sliding background
  const slideAnimation = useRef(new Animated.Value(state.index * tabWidth)).current;
  const dragAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  useEffect(() => {
    // Simple slide animation to the correct tab
    Animated.spring(slideAnimation, {
      toValue: state.index * tabWidth,
      tension: 300,
      friction: 25,
      useNativeDriver: true,
    }).start();
  }, [state.index, tabWidth]);

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: (evt, gestureState) => {
        setIsDragging(true);
        Animated.spring(scaleAnimation, {
          toValue: 1.1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        dragAnimation.setValue(gestureState.dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        setIsDragging(false);
        
        // Calculate which tab we're closest to
        const currentPosition = state.index * tabWidth + gestureState.dx;
        const targetTab = Math.round(currentPosition / tabWidth);
        const clampedTab = Math.max(0, Math.min(targetTab, numberOfTabs - 1));
        
        // Navigate to the target tab if different
        if (clampedTab !== state.index) {
          navigation.navigate(state.routes[clampedTab].name);
        }
        
        // Reset animations
        Animated.parallel([
          Animated.spring(dragAnimation, {
            toValue: 0,
            tension: 300,
            friction: 25,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnimation, {
            toValue: 1,
            tension: 300,
            friction: 10,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

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
        {/* Main liquid glass background */}
        <LiquidGlassContainerView spacing={8}>
          <LiquidGlassView
            interactive={true}
            effect="clear"
            colorScheme="system"
            tintColor={isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'}
            style={[
              styles.liquidGlassBackground,
              !isLiquidGlassSupported && {
                backgroundColor: isBlushTheme || isCresviaTheme || isEternaTheme
                  ? 'rgba(255, 255, 255, 0.01)'
                  : theme.tabBackground || (isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(255, 255, 255, 0.01)'),
              },
            ]}
          >
            {/* Draggable sliding active background */}
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.activeBackground,
                {
                  width: tabWidth - 16, // Make it smaller with padding
                  transform: [
                    { translateX: Animated.add(slideAnimation, dragAnimation) },
                    { scale: scaleAnimation },
                  ],
                },
              ]}
            >
              <LiquidGlassView
                interactive={true}
                effect={isDragging ? "regular" : "regular"}
                colorScheme="system"
                tintColor={isDragging 
                  ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)')
                  : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)')
                }
                style={[
                  styles.activeLiquidGlass,
                  !isLiquidGlassSupported && {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
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
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={getTabIcon(route.name)}
                      size={isFocused ? 24 : 22}
                      color={
                        isFocused
                          ? theme.tabActive || theme.primary
                          : theme.textSecondary || `${theme.tabActive || theme.primary}CC`
                      }
                      style={[
                        styles.tabIcon,
                        isFocused && {
                          textShadowColor: theme.tabActive ? `${theme.tabActive}30` : (isDark 
                            ? 'rgba(255, 255, 255, 0.3)' 
                            : 'rgba(99, 102, 241, 0.2)'),
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
                            ? theme.tabActive || theme.primary
                            : theme.textSecondary || `${theme.tabActive || theme.primary}CC`,
                          fontWeight: isFocused ? '700' : '500',
                          fontSize: isFocused ? 13 : 11,
                          textShadowColor: isFocused 
                            ? (theme.tabActive ? `${theme.tabActive}30` : 'rgba(99, 102, 241, 0.2)')
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
          </LiquidGlassView>
        </LiquidGlassContainerView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 9,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  blurBackground: {
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 70, // Increased by 45px from 25
    position: 'relative',
  },
  liquidGlassBackground: {
    borderRadius: 28,
    overflow: 'hidden',
    minHeight: 70,
    position: 'relative',
  },
  activeBackground: {
    position: 'absolute',
    top: 8,
    left: 8,
    bottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activeBackgroundBlur: {
    flex: 1,
    borderRadius: 22,
  },
  activeLiquidGlass: {
    flex: 1,
    borderRadius: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10, // Increased from 2 to 10
    minHeight: 70, // Increased by 45px from 25
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    zIndex: 10,
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
