import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LiquidGlassView,
  LiquidGlassContainerView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { hapticFeedback } from '../utils/haptics';

// const { width: screenWidth } = Dimensions.get('window');

const LiquidGlassTabBar = ({ state, descriptors, navigation }) => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme } = useTheme();
  const { hasActiveWorkout } = useWorkout();
  const [profilePicture, setProfilePicture] = useState(null);
  
  // Calculate dimensions - EXACTLY like native iOS from your image
  const tabBarWidth = Dimensions.get('window').width * 0.75; // Bigger like the native iOS in your image
  const maxWidth = Math.min(tabBarWidth, 414); // Increased by 50px (was 364, now 414)
  const numberOfTabs = state.routes.length;
  const tabWidth = maxWidth / numberOfTabs;
  
  // Animations for morphing bubble
  const slideAnimation = useRef(new Animated.Value(state.index * tabWidth)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  
  // Load profile picture
  useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        const userProfileData = await AsyncStorage.getItem('userProfile');
        if (userProfileData) {
          const profile = JSON.parse(userProfileData);
          setProfilePicture(profile.profilePicture);
        }
      } catch (error) {
        console.error('Failed to load profile picture:', error);
      }
    };
    
    loadProfilePicture();
    
    // Listen for profile updates
    const interval = setInterval(loadProfilePicture, 2000);
    return () => clearInterval(interval);
  }, []);
  
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

              const activeColor = isBlushTheme ? '#FF69B4' : 
                isCresviaTheme ? '#8A2BE2' : 
                isEternaTheme ? '#4B0082' :
                isSpidermanTheme ? '#E31E24' : 
                isFaithTheme ? '#4A90E2' : 
                isSailormoonTheme ? '#C8A2D0' : 
                theme.tabActive || theme.primary;

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  style={[
                    styles.tabButton, 
                    { width: tabWidth },
                    route.name === 'Todos' && { marginLeft: 5 },
                    route.name === 'Gym' && { marginLeft: -1 },
                    route.name === 'Profile' && { marginLeft: -1 }
                  ]}
                  activeOpacity={0.8}
                >
                  {route.name === 'Profile' && profilePicture ? (
                    <Image 
                      source={{ uri: profilePicture }} 
                      style={[
                        styles.profileImage,
                        {
                          width: isFocused ? 26 : 24,
                          height: isFocused ? 26 : 24,
                          borderRadius: isFocused ? 13 : 12,
                          borderWidth: isFocused ? 2 : 1.5,
                          borderColor: activeColor,
                        }
                      ]} 
                    />
                  ) : (
                  <View>
                    <MaterialIcons
                      name={getTabIcon(route.name)}
                      size={isFocused ? 26 : 24}
                      color={
                        isFocused
                          ? activeColor
                          : theme.textSecondary || `${activeColor}80`
                      }
                      style={styles.tabIcon}
                    />
                    {/* Active workout badge for Gym tab */}
                    {route.name === 'Gym' && hasActiveWorkout && (
                      <View style={[styles.badge, { backgroundColor: theme.error || '#EF4444' }]} />
                    )}
                  </View>
                  )}
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isFocused
                          ? activeColor
                          : theme.textSecondary || `${activeColor}80`,
                        fontWeight: isFocused ? '600' : '500',
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

              {/* Active tab indicator - Professional glassy pill/bubble */}
              <Animated.View
                style={[
                  styles.activeIndicator,
                  {
                    width: tabWidth - 12, // Perfect pill size
                    height: 60,
                    borderRadius: 30, // Perfectly rounded pill
                    backgroundColor: isBlushTheme ? 'rgba(255, 105, 180, 0.15)' : 
                      isCresviaTheme ? 'rgba(138, 43, 226, 0.12)' : 
                      isEternaTheme ? 'rgba(75, 0, 130, 0.12)' :
                      isSpidermanTheme ? 'rgba(227, 30, 36, 0.15)' : 
                      isFaithTheme ? 'rgba(74, 144, 226, 0.15)' : 
                      isSailormoonTheme ? 'rgba(200, 162, 208, 0.15)' : 
                      isDark ? 'rgba(255, 255, 255, 0.12)' :
                      'rgba(59, 130, 246, 0.12)',
                    borderWidth: 1,
                    borderColor: isBlushTheme ? 'rgba(255, 105, 180, 0.3)' : 
                      isCresviaTheme ? 'rgba(138, 43, 226, 0.25)' : 
                      isEternaTheme ? 'rgba(75, 0, 130, 0.25)' :
                      isSpidermanTheme ? 'rgba(227, 30, 36, 0.3)' : 
                      isFaithTheme ? 'rgba(74, 144, 226, 0.3)' : 
                      isSailormoonTheme ? 'rgba(200, 162, 208, 0.3)' : 
                      isDark ? 'rgba(255, 255, 255, 0.25)' :
                      'rgba(59, 130, 246, 0.25)',
                    position: 'absolute',
                    top: 3,
                    shadowColor: isBlushTheme ? '#FF69B4' : 
                      isCresviaTheme ? '#8A2BE2' : 
                      isEternaTheme ? '#4B0082' :
                      isSpidermanTheme ? '#E31E24' : 
                      isFaithTheme ? '#4A90E2' : 
                      isSailormoonTheme ? '#C8A2D0' : 
                      theme.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 3,
                    transform: [
                      { 
                        translateX: Animated.add(
                          slideAnimation, 
                          new Animated.Value(6)
                        ) 
                      },
                      { scale: scaleAnimation },
                    ],
                  },
                ]}
              >
                {/* Inner glass effect layer */}
                <View style={{
                  flex: 1,
                  borderRadius: 30,
                  backgroundColor: isBlushTheme ? 'rgba(255, 255, 255, 0.08)' : 
                    isCresviaTheme ? 'rgba(255, 255, 255, 0.06)' : 
                    isEternaTheme ? 'rgba(255, 255, 255, 0.06)' :
                    isSpidermanTheme ? 'rgba(255, 255, 255, 0.08)' : 
                    isFaithTheme ? 'rgba(255, 255, 255, 0.08)' : 
                    isSailormoonTheme ? 'rgba(255, 255, 255, 0.08)' : 
                    isDark ? 'rgba(255, 255, 255, 0.06)' :
                    'rgba(255, 255, 255, 0.06)',
                }} />
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

              const activeColor = isBlushTheme ? '#FF69B4' : 
                isCresviaTheme ? '#8A2BE2' : 
                isEternaTheme ? '#4B0082' :
                isSpidermanTheme ? '#E31E24' : 
                isFaithTheme ? '#4A90E2' : 
                isSailormoonTheme ? '#C8A2D0' : 
                theme.tabActive || theme.primary;

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  style={[
                    styles.tabButton, 
                    { width: tabWidth },
                    route.name === 'Todos' && { marginLeft: 5 },
                    route.name === 'Gym' && { marginLeft: -1 },
                    route.name === 'Profile' && { marginLeft: -1 }
                  ]}
                  activeOpacity={0.8}
                >
                  {route.name === 'Profile' && profilePicture ? (
                    <Image 
                      source={{ uri: profilePicture }} 
                      style={[
                        styles.profileImage,
                        {
                          width: isFocused ? 26 : 24,
                          height: isFocused ? 26 : 24,
                          borderRadius: isFocused ? 13 : 12,
                          borderWidth: isFocused ? 2 : 1.5,
                          borderColor: activeColor,
                        }
                      ]} 
                    />
                  ) : (
                  <MaterialIcons
                    name={getTabIcon(route.name)}
                      size={isFocused ? 26 : 24}
                    color={
                      isFocused
                          ? activeColor
                          : theme.textSecondary || `${activeColor}80`
                    }
                    style={styles.tabIcon}
                  />
                  )}
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isFocused
                          ? activeColor
                          : theme.textSecondary || `${activeColor}80`,
                        fontWeight: isFocused ? '600' : '500',
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
    height: 66,
    borderRadius: 33,
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
    height: 60,
    borderRadius: 30,
    zIndex: 1,
  },
  tabBarContainer: {
    height: 66,
    borderRadius: 33,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  activeIndicator: {
    position: 'absolute',
    top: 3,
    borderRadius: 30,
    overflow: 'hidden',
    zIndex: 1,
  },
  indicatorGlass: {
    flex: 1,
    borderRadius: 30,
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
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginLeft: -10,
  },
  tabIcon: {
    marginBottom: 3,
  },
  profileImage: {
    marginBottom: 3,
  },
  tabLabel: {
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export default LiquidGlassTabBar;