import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SimplePercentageLoader from './SimplePercentageLoader';
import AchievementService from '../services/achievementService';

const { width, height } = Dimensions.get('window');
const screenHeight = Dimensions.get('screen').height;

// Remote Bible Timeline Configuration
const TIMELINE_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/bible-timeline.json',
  get URL() {
    if (this.GITHUB_USERNAME === 'YOUR_USERNAME') return null;
    return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.REPO_NAME}/${this.BRANCH}/${this.FILE_PATH}`;
  },
  CACHE_KEY: 'bible_timeline_data_v2_with_images', // Changed to v2 to invalidate old cache
  CACHE_TIMESTAMP_KEY: 'bible_timeline_timestamp_v2',
  CACHE_DURATION: 60 * 60 * 1000, // 1 hour
};

const BibleTimeline = ({ visible, onClose, onNavigateToVerse, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const [selectedEra, setSelectedEra] = useState(null);
  // Static animation values for compatibility (no animations running)
  const [panX] = useState(new Animated.Value(0));
  const [panY] = useState(new Animated.Value(0));
  // Removed heavy bubble animations for better performance

  // Remote data state
  const [timelineDataState, setTimelineDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Cache management functions
  const isCacheValid = async () => {
    try {
      const timestamp = await AsyncStorage.getItem(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < TIMELINE_CONFIG.CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  };

  const fetchTimelineFromRemote = async () => {
    try {
      const url = TIMELINE_CONFIG.URL;
      if (!url) {
        throw new Error('Remote URL not configured');
      }

      console.log('Fetching Bible timeline from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      await AsyncStorage.setItem(TIMELINE_CONFIG.CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('✅ Successfully fetched and cached Bible timeline');
      return data;
    } catch (error) {
      console.error('Error fetching Bible timeline from remote:', error);
      throw error;
    }
  };

  const loadLocalFallbackData = () => {
    // Minimal fallback data
    return {
      timelineData: [
        {
          id: 'creation-sample',
      title: 'CREATION & EARLY WORLD',
      subtitle: 'Genesis 1 to 11',
      emoji: '🌍',
      bgEmoji: '✨',
      color: '#E91E63',
      gradient: ['#FF6B9D', '#E91E63', '#C2185B'],
      position: { x: width * 0.25, y: 40 },
      size: 120,
      imageUrl: 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/timeline-stickers/creation-sticker.png',
          description: 'Bible timeline is loading from remote source...',
      stories: [
        {
              title: 'Loading Timeline...',
              when: 'Please wait',
              bibleStory: 'Loading...',
              characters: 'Loading...',
              story: 'Please check your internet connection and try refreshing.'
        }
      ],
      connections: []
        }
      ]
    };
  };

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheValid = await isCacheValid();
      if (cacheValid) {
        const cachedData = await AsyncStorage.getItem(TIMELINE_CONFIG.CACHE_KEY);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setTimelineDataState(data);
          setLoading(false);
          console.log('✅ Loaded Bible timeline from cache');
          return;
        }
      }

      // Try to fetch from remote
      try {
        const data = await fetchTimelineFromRemote();
        setTimelineDataState(data);
      } catch (remoteError) {
        console.error('Remote fetch failed, using fallback:', remoteError);
        
        // Try cached data even if expired
        const cachedData = await AsyncStorage.getItem(TIMELINE_CONFIG.CACHE_KEY);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setTimelineDataState(data);
          console.log('📦 Using expired cache due to remote failure');
        } else {
          // Use fallback data
          const fallbackData = loadLocalFallbackData();
          setTimelineDataState(fallbackData);
          console.log('🔄 Using fallback data');
        }
        
        setError('Using offline data. Pull to refresh when online.');
      }
    } catch (error) {
      console.error('Error loading Bible timeline:', error);
      setError('Failed to load timeline. Please try again.');
      
      // Use fallback data
      const fallbackData = loadLocalFallbackData();
      setTimelineDataState(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const refreshTimeline = async () => {
    try {
      // Clear cache and reload
      await AsyncStorage.removeItem(TIMELINE_CONFIG.CACHE_KEY);
      await AsyncStorage.removeItem(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY);
      await loadTimeline();
    } catch (error) {
      console.error('Error refreshing timeline:', error);
      Alert.alert('Error', 'Failed to refresh timeline. Please try again.');
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    try {
      await AsyncStorage.removeItem(TIMELINE_CONFIG.CACHE_KEY);
      await AsyncStorage.removeItem(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY);
      await loadTimeline();
    } catch (error) {
      console.error('Error refreshing timeline:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Initialize data loading
  useEffect(() => {
    if (visible) {
      // Clear old v1 cache to force fresh data load with imageUrls
      AsyncStorage.removeItem('bible_timeline_data_v1').catch(() => {});
      AsyncStorage.removeItem('bible_timeline_timestamp_v1').catch(() => {});
      
      loadTimeline();
    }
  }, [visible]);

  // Dynamic timeline data from loaded data
  const timelineData = timelineDataState ? timelineDataState.timelineData : [];


  // Removed heavy animations for better performance

  const handleBubblePress = (era) => {
    hapticFeedback.medium();
    setSelectedEra(era);
    AchievementService.incrementStat('timelineErasViewed');
    // Removed selection animation for better performance
  };

  // Generate static geometric shapes background with theme colors
  const renderGeometricShapesBackground = () => {
    const shapes = [];
    const shapeTypes = ['circle', 'triangle', 'square', 'diamond', 'hexagon', 'star', 'pentagon'];
    
    // Use theme-based colors instead of hardcoded yellow colors
    const colors = isDark ? [
      `${theme.primary}20`, `${theme.primary}15`, `${theme.primary}10`, 
      `${theme.accent}20`, `${theme.accent}15`, `${theme.accent}10`,
      `${theme.surface}40`, `${theme.surface}30`, `${theme.surface}20`
    ] : [
      `${theme.primary}30`, `${theme.primary}20`, `${theme.primary}15`, 
      `${theme.accent}30`, `${theme.accent}20`, `${theme.accent}15`,
      `${theme.surface}60`, `${theme.surface}40`, `${theme.surface}30`
    ];
    
    // Generate small static shapes (minimal animations for performance)
    for (let i = 0; i < 30; i++) {
      const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 40 + 15; // Bigger: Size between 15-55
      const x = Math.random() * (width * 3.1 - size); // Tighter shape distribution
      const y = Math.random() * (1400 - size); // Extended for Apostolic Age positioning
      const rotation = Math.random() * 360;
      const opacity = Math.random() * 0.4 + 0.1; // Opacity between 0.1-0.5
      
      // All shapes are now completely static for better performance
      const shapeComponent = View;
      
      let shapeElement;
      
      if (shapeType === 'triangle') {
        shapeElement = React.createElement(shapeComponent, {
          key: `shape-${i}`,
          style: [
            styles.geometricShape,
            styles.triangleShape,
            {
              left: x,
              top: y,
              opacity: opacity,
              transform: [{ rotate: `${rotation}deg` }],
              borderBottomColor: color,
              borderLeftWidth: size * 0.6,
              borderRightWidth: size * 0.6,
              borderBottomWidth: size,
            }
          ]
        });
      } else if (shapeType === 'star') {
        shapeElement = React.createElement(shapeComponent, {
          key: `shape-${i}`,
          style: [
            styles.geometricShape,
            styles.starShape,
            {
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: color,
              opacity: opacity,
              transform: [{ rotate: `${rotation}deg` }],
            }
          ]
        });
      } else {
        shapeElement = React.createElement(shapeComponent, {
          key: `shape-${i}`,
          style: [
            styles.geometricShape,
            {
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: color,
              opacity: opacity,
              transform: [{ rotate: `${rotation}deg` }],
              borderRadius: shapeType === 'circle' ? size / 2 : 
                          shapeType === 'hexagon' ? size / 4 : 
                          shapeType === 'pentagon' ? size / 3 : 0,
            }
          ]
        });
      }
      
      shapes.push(shapeElement);
    }
    
    // Add medium static accent shapes (minimal animations)
    for (let i = 0; i < 10; i++) {
      const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 60 + 40; // Bigger: Medium sizes 40-100
      const x = Math.random() * (width * 3.1 - size); // Tighter shape distribution
      const y = Math.random() * (1400 - size); // Extended for Apostolic Age positioning
      const opacity = Math.random() * 0.3 + 0.05; // More visible
      
      // Medium shapes are completely static (no animations)
      const rotation = Math.random() * 360;
      
      shapes.push(
        <View
          key={`medium-shape-${i}`}
          style={[
            styles.geometricShape,
            {
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: color,
              opacity: opacity,
              transform: [{ rotate: `${rotation}deg` }],
              borderRadius: shapeType === 'circle' ? size / 2 : 
                          shapeType === 'hexagon' ? size / 4 : 
                          shapeType === 'pentagon' ? size / 3 : 0,
            }
          ]}
        />
      );
    }
    
    // Add large static background shapes (no animations)
    for (let i = 0; i < 8; i++) {
      const shapeType = ['circle', 'square', 'hexagon'][Math.floor(Math.random() * 3)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 100 + 100; // Much bigger: Large sizes 100-200
      const x = Math.random() * (width * 3.1 - size); // Tighter shape distribution
      const y = Math.random() * (1400 - size); // Extended for Apostolic Age positioning
      const opacity = Math.random() * 0.15 + 0.03; // More visible
      
      // Large shapes are completely static (no animations)
      const rotation = Math.random() * 360;
      
      shapes.push(
        <View
          key={`large-shape-${i}`}
          style={[
            styles.geometricShape,
            {
              left: x,
              top: y,
              width: size,
              height: size,
              backgroundColor: color,
              opacity: opacity,
              transform: [{ rotate: `${rotation}deg` }],
              borderRadius: shapeType === 'circle' ? size / 2 : 
                          shapeType === 'hexagon' ? size / 4 : 0,
            }
          ]}
        />
      );
    }
    
    return (
      <View style={styles.geometricShapesContainer}>
        {shapes}
      </View>
    );
  };

  // Render beautiful curved flowing path like a golden river through the desert
  const renderCurvedFlowingPath = () => {
    if (timelineData.length < 2) return null;

    return (
      <View style={styles.curvedPathContainer}>
        {timelineData.map((era, index) => {
          if (index === timelineData.length - 1) return null; // No path after last era
          
          const nextEra = timelineData[index + 1];
          
          // Calculate edge-to-edge connection points for better visual connection
          let startX, startY, endX, endY;
          
          // Determine connection points based on relative positions
          if (Math.abs(nextEra.position.x - era.position.x) < 50) {
            // Eras are vertically aligned - use center points for clean vertical connection
            startX = era.position.x + era.size / 2;
            endX = nextEra.position.x + nextEra.size / 2;
          } else if (nextEra.position.x > era.position.x) {
            // Next era is to the right - connect from right edge to left edge
            startX = era.position.x + era.size;
            endX = nextEra.position.x;
          } else {
            // Next era is to the left - connect from left edge to right edge  
            startX = era.position.x;
            endX = nextEra.position.x + nextEra.size;
          }
          
          if (nextEra.position.y > era.position.y) {
            // Next era is below - connect from bottom edge to top edge
            startY = era.position.y + era.size;
            endY = nextEra.position.y;
          } else {
            // Next era is above - connect from top edge to bottom edge
            startY = era.position.y;
            endY = nextEra.position.y + nextEra.size;
          }
          
          // For cases where eras are at similar heights, use center points
          if (Math.abs(nextEra.position.y - era.position.y) < 50) {
            startY = era.position.y + era.size / 2;
            endY = nextEra.position.y + nextEra.size / 2;
          }
          
          // Calculate arrow position at 80% along the path for better visibility
          const arrowX = startX + (endX - startX) * 0.8;
          const arrowY = startY + (endY - startY) * 0.8;
          
          // Calculate arrow angle
          const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
          
          // Create smooth curved path segments
          const segments = [];
          const numSegments = 12; // More segments = smoother curve
          
          for (let i = 0; i < numSegments; i++) {
            const t = i / (numSegments - 1);
            
            // Create beautiful flowing curve with control points
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
            const curveOffset = 40; // How much the curve flows
            
            // Quadratic bezier curve for smooth flow
            const controlX = midX + (index % 2 === 0 ? curveOffset : -curveOffset);
            const controlY = midY - curveOffset / 2;
            
            const x = Math.pow(1-t, 2) * startX + 2 * (1-t) * t * controlX + t * t * endX;
            const y = Math.pow(1-t, 2) * startY + 2 * (1-t) * t * controlY + t * t * endY;
            
            if (i < numSegments - 1) {
              const nextT = (i + 1) / (numSegments - 1);
              const nextX = Math.pow(1-nextT, 2) * startX + 2 * (1-nextT) * nextT * controlX + nextT * nextT * endX;
              const nextY = Math.pow(1-nextT, 2) * startY + 2 * (1-nextT) * nextT * controlY + nextT * nextT * endY;
              
              const segmentLength = Math.sqrt(Math.pow(nextX - x, 2) + Math.pow(nextY - y, 2));
              const segmentAngle = Math.atan2(nextY - y, nextX - x) * (180 / Math.PI);
              
              segments.push(
                <View key={`segment-${index}-${i}`}>
                  {/* Outer glow - theme colored */}
                  <View style={{
                    position: 'absolute',
                    left: x - 2,
                    top: y - 2,
                    width: segmentLength + 4,
                    height: 12,
                    backgroundColor: theme.primary + '20', // Theme primary with transparency
                    borderRadius: 6,
                    transform: [{ rotate: `${segmentAngle}deg` }],
                    shadowColor: theme.primary, // Theme primary shadow
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 20,
                  }} />
                  
                  {/* Middle glow */}
                  <View style={{
                    position: 'absolute',
                    left: x - 1,
                    top: y - 1,
                    width: segmentLength + 2,
                    height: 8,
                    backgroundColor: theme.primary + '40', // Theme primary with more opacity
                    borderRadius: 4,
                    transform: [{ rotate: `${segmentAngle}deg` }],
                    shadowColor: theme.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 12,
                  }} />
                  
                  {/* Main flowing path */}
                  <View style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: segmentLength,
                    height: 5,
                    backgroundColor: theme.primary + 'DD', // Theme primary with high opacity
                    borderRadius: 2.5,
                    transform: [{ rotate: `${segmentAngle}deg` }],
                    shadowColor: theme.primary, // Theme primary shadow
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                  }} />
                  
                  {/* Inner bright core */}
                  <View style={{
                    position: 'absolute',
                    left: x,
                    top: y + 1,
                    width: segmentLength,
                    height: 3,
                    backgroundColor: theme.primary, // Theme primary full color
                    borderRadius: 1.5,
                    transform: [{ rotate: `${segmentAngle}deg` }],
                  }} />
                </View>
              );
            }
          }

    return (
            <View key={`curved-path-${index}`}>
              {segments}
              
              {/* Flowing theme particles along the curve */}
              <Animated.View style={{
                position: 'absolute',
                left: startX + (endX - startX) * 0.25,
                top: startY + (endY - startY) * 0.2 - 15,
                width: 12,
                height: 12,
                backgroundColor: theme.primary, // Theme primary color
                borderRadius: 6,
                opacity: 0.9,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 12,
                transform: [
                  {
                    translateX: 0, // Static value for better performance
                  },
                  {
                    translateY: new Animated.Value(0).interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }) || 0,
                  },
                ],
              }} />
              
              <Animated.View style={{
                position: 'absolute',
                left: startX + (endX - startX) * 0.6,
                top: startY + (endY - startY) * 0.5 - 20,
                width: 10,
                height: 10,
                backgroundColor: theme.primary + 'DD', // Theme primary with transparency
                borderRadius: 5,
                opacity: 0.8,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 10,
                transform: [
                  {
                    translateX: new Animated.Value(0).interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -25],
                    }) || 0,
                  },
                  {
                    translateY: new Animated.Value(0).interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 15],
                    }) || 0,
                  },
                ],
              }} />
              
              <Animated.View style={{
                position: 'absolute',
                left: startX + (endX - startX) * 0.85,
                top: startY + (endY - startY) * 0.8 - 10,
                width: 8,
                height: 8,
                backgroundColor: theme.primary + 'AA', // Theme primary with transparency
                borderRadius: 4,
                opacity: 0.7,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
                transform: [
                  {
                    translateX: new Animated.Value(0).interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 20],
                    }) || 0,
                  },
                ],
              }} />
              {/* Big Glowing Arrow - Positioned along the path for visibility */}
              <View style={{
                position: 'absolute',
                left: arrowX - 25,
                top: arrowY - 20,
                width: 50,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ rotate: `${angle}deg` }],
                zIndex: 5, // Above everything else
              }}>
                {/* Outer Glow */}
                <View style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  borderLeftWidth: 45,
                  borderTopWidth: 20,
                  borderBottomWidth: 20,
                  borderLeftColor: '#FFD700' + '40', // Bright gold glow
                  borderTopColor: 'transparent',
                  borderBottomColor: 'transparent',
                  shadowColor: '#FFD700',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 20,
                }} />
                
                {/* Middle Glow */}
                <View style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  borderLeftWidth: 35,
                  borderTopWidth: 15,
                  borderBottomWidth: 15,
                  borderLeftColor: '#DAA520' + '80',
                  borderTopColor: 'transparent',
                  borderBottomColor: 'transparent',
                  shadowColor: '#DAA520',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 15,
                }} />
                
                {/* Main Arrow */}
                <View style={{
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  borderLeftWidth: 28,
                  borderTopWidth: 12,
                  borderBottomWidth: 12,
                  borderLeftColor: '#8B4513',
                  borderTopColor: 'transparent',
                  borderBottomColor: 'transparent',
                  shadowColor: '#000',
                  shadowOffset: { width: 2, height: 2 },
                  shadowOpacity: 0.8,
                  shadowRadius: 5,
                  elevation: 8,
                }} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderTimelineBubble = (era, index) => {
    // Static animation values for better performance (no animations running)
    const anim = { float: new Animated.Value(0), pulse: new Animated.Value(1) };
    const isSelected = selectedEra?.id === era.id;
    
    // Debug logging
    console.log(`Rendering bubble for ${era.id}:`, {
      hasImageUrl: !!era.imageUrl,
      imageUrl: era.imageUrl,
      emoji: era.emoji
    });

    return (
      <Animated.View
        key={era.id}
        style={[
          styles.timelineBubbleContainer,
          {
            left: era.position.x - era.size / 2,
            top: era.position.y,
            transform: [
              {
                translateY: anim.float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8],
                }),
              },
              {
                scale: anim.pulse.interpolate({
                  inputRange: [1, 1.03],
                  outputRange: [isSelected ? 1.1 : 1, isSelected ? 1.13 : 1.03],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.timelineSticker]}
          onPress={() => handleBubblePress(era)}
          activeOpacity={0.8}
        >
                    {/* Floating Aura Rings */}
          <Animated.View style={[styles.auraRing1, {
            width: era.size + 40,
            height: era.size + 40,
            borderRadius: (era.size + 40) / 2,
            backgroundColor: `${theme.primary}15`,
            transform: [{
              scale: anim.pulse.interpolate({
                inputRange: [1, 1.03],
                outputRange: [1, 1.1],
              }),
            }],
          }]} />
          
          <Animated.View style={[styles.auraRing2, {
                width: era.size + 20, 
                height: era.size + 20, 
                borderRadius: (era.size + 20) / 2,
            backgroundColor: `${theme.primary}25`,
            transform: [{
              scale: anim.pulse.interpolate({
                inputRange: [1, 1.03],
                outputRange: [1.05, 0.95],
              }),
            }],
          }]} />
          
          {/* Rotating Sparkle Particles */}
          {Array.from({ length: 6 }).map((_, sparkleIndex) => (
            <Animated.View
              key={sparkleIndex}
              style={[
                styles.sparkleParticle,
                {
                  transform: [
                    {
                      rotate: anim.float.interpolate({
                        inputRange: [0, 1],
                        outputRange: [`${sparkleIndex * 60}deg`, `${sparkleIndex * 60 + 360}deg`],
                      }),
                    },
                    {
                      translateX: era.size * 0.6,
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.sparkle, { backgroundColor: theme.primary }]} />
            </Animated.View>
          ))}
          
          {/* Main Sticker with Enhanced Effects */}
          <Animated.View style={{
            transform: [{
              scale: anim.pulse.interpolate({
                inputRange: [1, 1.03],
                outputRange: [1, 1.05],
              }),
            }],
          }}>
            <Image
              source={{ uri: era.imageUrl }}
              style={[styles.stickerImage, { 
                width: era.size, 
                height: era.size,
                // Add a subtle glow filter effect
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 15,
              }]}
              resizeMode="contain"
              onError={(error) => {
                console.log(`Failed to load image for ${era.id}:`, error.nativeEvent.error);
                console.log(`Image URL: ${era.imageUrl}`);
              }}
            />
          </Animated.View>
          
          {/* Enhanced Selection Glow */}
          {isSelected && (
                        <Animated.View style={[styles.selectionGlow, { 
              width: era.size + 60, 
              height: era.size + 60, 
              borderRadius: (era.size + 60) / 2,
              borderColor: theme.primary,
              backgroundColor: `${theme.primary}10`,
              transform: [{
                scale: new Animated.Value(1).interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              }],
              }]} />
            )}
        </TouchableOpacity>
        
        {/* Floating Title */}
        <Animated.View
          style={[
            styles.bubbleTitle,
            {
              transform: [
                {
                  translateY: anim.float.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                },
              ],
            },
          ]}
        >
          <BlurView intensity={35} tint="systemMaterialDark" style={[styles.titleBlur, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Text style={[styles.titleText, { color: '#FFFFFF' }]}>
              {era.title}
            </Text>
                          <Text style={[styles.subtitleText, { color: '#FFFFFF', opacity: 0.9 }]}>
              {era.subtitle}
            </Text>
          </BlurView>
        </Animated.View>
      </Animated.View>
    );
  };

  const renderSelectedEraDetail = () => {
    if (!selectedEra) return null;

    return (
      <Animated.View
        style={[
          styles.eraDetailContainer,
          {
            opacity: selectedEra ? 1 : 0,
            transform: [
              {
                translateY: selectedEra ? 0 : 50,
              },
            ],
          },
        ]}
      >
        <BlurView intensity={40} tint="systemMaterialDark" style={[styles.eraDetailCard, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
          {/* Close Button - Top Right */}
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'absolute', top: 12, right: 12 }}
            onPress={() => {
              hapticFeedback.light();
              setSelectedEra(null);
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back-ios-new" size={18} color={selectedEra.color} />
          </TouchableOpacity>
          
          <LinearGradient
            colors={[`${selectedEra.color}25`, `${selectedEra.color}15`, 'transparent']}
            style={styles.eraDetailGradient}
          >
            {/* Header */}
            <View style={styles.eraDetailHeader}>
              <View style={[styles.eraDetailIcon, { backgroundColor: `${selectedEra.color}30` }]}>
                {selectedEra.imageUrl && (
                  <Image
                    source={{ uri: selectedEra.imageUrl }}
                    style={{
                      width: 60,
                      height: 60,
                    }}
                    resizeMode="contain"
                  />
                )}
              </View>
              <View style={styles.eraDetailTitles}>
                <Text style={[styles.eraDetailTitle, { color: '#FFFFFF' }]}>
                  {selectedEra.title}
                </Text>
                <Text style={[styles.eraDetailSubtitle, { color: '#FFFFFF' }]}>
                  {selectedEra.subtitle}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={[styles.eraDetailDescription, { color: '#FFFFFF' }]}>
              {selectedEra.description}
            </Text>

            {/* Stories */}
            <View style={styles.storiesContainer}>
              <ScrollView 
                style={styles.storiesScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {selectedEra.stories?.map((storyItem, index) => (
                  <View
                    key={index}
                    style={[
                      styles.storyCard,
                      {
                        backgroundColor: `${selectedEra.color}15`,
                        borderColor: `${selectedEra.color}30`,
                      },
                    ]}
                  >
                    <Text style={[styles.storyTitle, { color: '#FFFFFF' }]}>
                      {storyItem.title}
                    </Text>
                    
                    <View style={styles.storyDetails}>
                      <View style={styles.storyDetailRow}>
                        <Text style={[styles.storyLabel, { color: '#FFFFFF' }]}>When:</Text>
                        <Text style={[styles.storyValue, { color: '#FFFFFF' }]}>{storyItem.when}</Text>
              </View>
                      
                      <View style={styles.storyDetailRow}>
                        <Text style={[styles.storyLabel, { color: '#FFFFFF' }]}>Bible Story:</Text>
                        <Text style={[styles.storyValue, { color: '#FFFFFF', fontWeight: '600' }]}>{storyItem.bibleStory}</Text>
            </View>

                      <View style={styles.storyDetailRow}>
                        <Text style={[styles.storyLabel, { color: '#FFFFFF' }]}>Characters:</Text>
                        <Text style={[styles.storyValue, { color: '#FFFFFF' }]}>{storyItem.characters}</Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.storyText, { color: '#FFFFFF' }]}>
                      {storyItem.story}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    );
  };

  // Removed pan responder for better performance

    const content = (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
        
        {/* Simple Loading with Percentage */}
        <SimplePercentageLoader 
          isVisible={loading}
          loadingText="Loading Bible timeline..."
        />

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error_outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.errorText, { color: theme.text }]}>
              {error}
                </Text>
                    <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={refreshTimeline}
            >
              <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>
                Try Again
              </Text>
                    </TouchableOpacity>
                </View>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <>
        <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: 0, paddingBottom: 0 }}>
        
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>

      {/* Interactive Mindmap with Smooth Scrolling */}
      <ScrollView
        style={styles.mindmapScrollContainer}
        contentContainerStyle={[styles.mindmapContent]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={true}
        bouncesZoom={true}
        minimumZoomScale={0.8}
        maximumZoomScale={2.0}
        pinchGestureEnabled={true}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            title="Pull to refresh..."
            titleColor={theme.textSecondary}
          />
        }
      >
        {/* Add top spacing wrapper */}
        <View style={{ marginTop: Platform.OS === 'ios' ? 100 : 80, width: '100%', height: '100%' }}>
        {/* Scattered Geometric Shapes Background */}
        {renderGeometricShapesBackground()}
        
        {/* Beautiful Curved Flowing Path */}
        {renderCurvedFlowingPath()}

        {/* Floating Bubbles */}
        {timelineData.map((era, index) => renderTimelineBubble(era, index))}
        
        {/* Floating Particles */}
        <View style={styles.particlesContainer}>
          {Array.from({ length: 18 }).map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  left: Math.random() * (width * 3.0),
                  top: Math.random() * 400,
                  backgroundColor: timelineData[index % timelineData.length]?.color + '40',
                  transform: [
                    {
                      translateY: new Animated.Value(0).interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }) || 0,
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
        </View>
      </ScrollView>

      {/* Era Detail Panel */}
      {renderSelectedEraDetail()}
      </View>
    </View>
          </>
        )}
        
        {/* Transparent Blurred Header */}
        <BlurView 
          intensity={20} 
          tint={isDark ? 'dark' : 'light'} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            backgroundColor: 'transparent',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
          <View style={[styles.solidHeader, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: 8, paddingBottom: 12 }]}>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
            </TouchableOpacity>
            <Text style={[styles.solidHeaderTitle, { color: theme.text }]}>
              Bible Timeline
            </Text>
            <View style={{ width: 60 }} />
          </View>
        </BlurView>
    </View>
  );

  if (asScreen) {
    return content;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  decorativeElements: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    bottom: -100,
    height: screenHeight + 150,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonTopRight: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    width: 60, // Bigger
    height: 60, // Bigger
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  backButtonGlow: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  helpButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  helpButtonBlur: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  
  // Interactive Mindmap
  mindmapScrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mindmapContent: {
    width: width * 2.9 + 150, // Much tighter - just enough for rightmost era + minimal padding
    height: 1200, // Much tighter - lowest era at y:1000 + era size + minimal padding
    position: 'relative',
    backgroundColor: 'transparent', // Make content transparent too
  },
  
  // Geometric Shapes Background
  geometricShapesContainer: {
    position: 'absolute',
    top: -200, // Start above visible area
    left: -200, // Start left of visible area
    width: width * 3.1 + 300, // Tighter coverage matching reduced content width
    height: 1400 + 300, // Much tighter - match reduced content height
    zIndex: -1, // Behind everything else
  },
  geometricShape: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  triangleShape: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  starShape: {
    transform: [{ rotate: '45deg' }],
  },
  
  // Curved Flowing Path
  curvedPathContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // Behind the stickers so they can be tapped
  },
  connectionContainer: {
    position: 'absolute',
  },
  connectionGlow: {
    position: 'absolute',
    borderRadius: 4,
    opacity: 0.6,
    elevation: 2,
  },
  connectionLine: {
    position: 'absolute',
    borderRadius: 2,
    opacity: 0.9,
    elevation: 4,
  },
  arrowHead: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    elevation: 6,
  },
  flowParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
    elevation: 6,
  },
  
  // Timeline Bubbles
  timelineBubbleContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10, // Above the curved path
  },
  timelineSticker: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 12,
    shadowColor: '#000',
    zIndex: 10, // Above the curved path
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  stickerImage: {
    zIndex: 10,
    elevation: 15,
  },
  auraRing1: {
    position: 'absolute',
    opacity: 0.6,
    zIndex: 1,
  },
  auraRing2: {
    position: 'absolute',
    opacity: 0.8,
    zIndex: 2,
  },
  sparkleParticle: {
    position: 'absolute',
    zIndex: 3,
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
    elevation: 5,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  selectionGlow: {
    position: 'absolute',
    borderWidth: 3,
    opacity: 0.8,
    zIndex: 0,
    elevation: 20,
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 4,
    opacity: 1,
    zIndex: 0,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  bubbleTitle: {
    marginTop: 12,
    alignItems: 'center',
  },
  titleBlur: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    overflow: 'hidden', // This ensures BlurView respects borderRadius
  },
  titleText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  
  // Floating Particles
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  
  // Era Detail Panel
  eraDetailContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    maxHeight: '75%',
  },
  eraDetailCard: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  eraDetailGradient: {
    padding: 20,
  },
  eraDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eraDetailIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  eraDetailEmoji: {
    fontSize: 24,
    zIndex: 2,
  },
  eraDetailBgEmoji: {
    position: 'absolute',
    fontSize: 40,
    opacity: 0.3,
    zIndex: 1,
  },
  eraDetailTitles: {
    flex: 1,
  },
  eraDetailTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  eraDetailSubtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eraDetailDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  
  // Stories Container
  storiesContainer: {
    marginBottom: 16,
    flex: 1,
  },
  storiesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  storiesScrollView: {
    maxHeight: 300,
  },
  storyCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  storyDetails: {
    marginBottom: 12,
  },
  storyDetailRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  storyLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 80,
    marginRight: 8,
  },
  storyValue: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  storyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'left',
  },
  glassyHeader: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  glassyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  glassyCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  solidHeaderButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  solidHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BibleTimeline;