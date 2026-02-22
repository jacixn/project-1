import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Modal,
  Platform,
  ScrollView,
  Alert,
  RefreshControl,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Svg, Path, Circle, Defs, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const AnimatedPath = Animated.createAnimatedComponent(Path);

import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import userStorage from '../utils/userStorage';
import SimplePercentageLoader from './SimplePercentageLoader';
import AchievementService from '../services/achievementService';

const { width, height } = Dimensions.get('window');

// =============================================
// Layout Configuration
// =============================================
const PADDING_H = 20;
const NODE_SIZE = 54; // slightly larger node
const GAP = 16;
const CARD_WIDTH = width - (PADDING_H * 2) - NODE_SIZE - GAP;
const CARD_HEIGHT = 170; // slightly taller for more breathing room
const ITEM_SPACING = 70; // larger vertical gap between items
const ITEM_HEIGHT = CARD_HEIGHT + ITEM_SPACING;
const START_Y = CARD_HEIGHT / 2;

// Calculated X positions for nodes
const LEFT_NODE_X = PADDING_H + NODE_SIZE / 2;
const RIGHT_NODE_X = width - PADDING_H - NODE_SIZE / 2;

const VIEWED_ERAS_KEY = 'timeline_viewed_eras';
const STICKER_SIZE = 85;

// =============================================
// Remote Configuration
// =============================================
const TIMELINE_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/bible-timeline.json',
  get URL() {
    if (this.GITHUB_USERNAME === 'YOUR_USERNAME') return null;
    return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.REPO_NAME}/${this.BRANCH}/${this.FILE_PATH}`;
  },
  CACHE_KEY: 'bible_timeline_data_v2_with_images',
  CACHE_TIMESTAMP_KEY: 'bible_timeline_timestamp_v2',
  CACHE_DURATION: 60 * 60 * 1000,
};

const BibleTimeline = ({ visible, onClose, onNavigateToVerse, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Data state
  const [timelineDataState, setTimelineDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // UI state
  const [selectedEra, setSelectedEra] = useState(null);
  const [viewedEras, setViewedEras] = useState(new Set());
  const [activeIndex, setActiveIndex] = useState(0);

  // Animations
  const cardAnims = useRef([]).current;
  const hasAnimated = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Hover and pulse animations
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Start looping animations on mount
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(hoverAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 20000, useNativeDriver: true })
    ).start();

    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch(() => {});
  }, []);

  // Background color animation
  const bgAnim = useRef(new Animated.Value(0)).current;
  const [bgColors, setBgColors] = useState([theme.background, theme.background]);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Audio Player & Deck State
  const [playingStoryIndex, setPlayingStoryIndex] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const waveformAnim = useRef(new Animated.Value(0)).current;
  const waveformLoopRef = useRef(null);
  const swipeX = useRef(new Animated.Value(0)).current;
  const currentStoryRef = useRef(null);
  const soundRef = useRef(null);

  const AUDIO_CACHE_DIR = `${FileSystem.cacheDirectory}story_audio/`;

  const startWaveform = useCallback(() => {
    waveformAnim.setValue(0);
    waveformLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(waveformAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(waveformAnim, { toValue: 0, duration: 400, useNativeDriver: true })
      ])
    );
    waveformLoopRef.current.start();
  }, [waveformAnim]);

  const stopWaveform = useCallback(() => {
    if (waveformLoopRef.current) {
      waveformLoopRef.current.stop();
      waveformLoopRef.current = null;
    }
    waveformAnim.stopAnimation();
    waveformAnim.setValue(0);
  }, [waveformAnim]);

  const stopStoryAudio = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (_) {}
      soundRef.current = null;
    }
    setPlayingStoryIndex(null);
    setIsPaused(false);
    setIsAudioLoading(false);
    stopWaveform();
    currentStoryRef.current = null;
  }, [stopWaveform]);

  useEffect(() => {
    stopStoryAudio();
    setCurrentCardIndex(0);
    swipeX.setValue(0);
  }, [selectedEra, visible, stopStoryAudio, swipeX]);

  const getStoryAudioPath = useCallback((eraId, storyIndex) => {
    return `${AUDIO_CACHE_DIR}${eraId}_${storyIndex}.mp3`;
  }, [AUDIO_CACHE_DIR]);

  const playStory = async (story, index) => {
    await stopStoryAudio();
    if (!selectedEra) return;

    setPlayingStoryIndex(index);
    setIsPaused(false);
    setIsAudioLoading(true);
    currentStoryRef.current = { story, index };

    const eraId = selectedEra.id;
    const localPath = getStoryAudioPath(eraId, index);
    const remoteUrl = `https://raw.githubusercontent.com/${TIMELINE_CONFIG.GITHUB_USERNAME}/${TIMELINE_CONFIG.REPO_NAME}/${TIMELINE_CONFIG.BRANCH}/fivefold-ios/bible-timeline-audio/${eraId}/${index}.mp3`;

    try {
      const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
      }

      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (!fileInfo.exists || fileInfo.size === 0) {
        await FileSystem.downloadAsync(remoteUrl, localPath);
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: localPath },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsAudioLoading(false);
      startWaveform();

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
          setPlayingStoryIndex(null);
          setIsPaused(false);
          stopWaveform();
          currentStoryRef.current = null;
        }
      });
    } catch (err) {
      console.error('Story audio error:', err?.message || err);
      setIsAudioLoading(false);
      setPlayingStoryIndex(null);
      setIsPaused(false);
      stopWaveform();
      currentStoryRef.current = null;
      Alert.alert('Audio Error', 'Could not play this story. Please check your internet connection and try again.');
    }
  };

  const togglePause = async () => {
    if (!soundRef.current) return;
    try {
      if (isPaused) {
        await soundRef.current.playAsync();
        setIsPaused(false);
        startWaveform();
      } else {
        await soundRef.current.pauseAsync();
        setIsPaused(true);
        stopWaveform();
      }
    } catch (_) {}
  };

  const restartStory = async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
      setIsPaused(false);
      startWaveform();
    } catch (_) {}
  };

  // =============================================
  // DATA LAYER
  // =============================================
  const isCacheValid = async () => {
    try {
      const timestamp = await userStorage.getRaw(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < TIMELINE_CONFIG.CACHE_DURATION;
    } catch (error) {
      return false;
    }
  };

  const fetchTimelineFromRemote = async () => {
    const url = TIMELINE_CONFIG.URL;
    if (!url) throw new Error('Remote URL not configured');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    await userStorage.setRaw(TIMELINE_CONFIG.CACHE_KEY, JSON.stringify(data));
    await userStorage.setRaw(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
    return data;
  };

  const loadLocalFallbackData = () => ({
    timelineData: [
      {
        id: 'creation-sample',
        title: 'CREATION & EARLY WORLD',
        subtitle: 'Genesis 1 to 11',
        color: '#E91E63',
        gradient: ['#FF6B9D', '#E91E63', '#C2185B'],
        imageUrl: 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/timeline-stickers/creation-sticker.png',
        description: 'Bible timeline is loading...',
        stories: [],
      }
    ]
  });

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const cacheValid = await isCacheValid();
      if (cacheValid) {
        const cachedData = await userStorage.getRaw(TIMELINE_CONFIG.CACHE_KEY);
        if (cachedData) {
          setTimelineDataState(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }
      try {
        const data = await fetchTimelineFromRemote();
        setTimelineDataState(data);
      } catch (remoteError) {
        const cachedData = await userStorage.getRaw(TIMELINE_CONFIG.CACHE_KEY);
        if (cachedData) {
          setTimelineDataState(JSON.parse(cachedData));
        } else {
          setTimelineDataState(loadLocalFallbackData());
        }
        setError('Using offline data. Pull to refresh when online.');
      }
    } catch (error) {
      setError('Failed to load timeline.');
      setTimelineDataState(loadLocalFallbackData());
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    try {
      await userStorage.remove(TIMELINE_CONFIG.CACHE_KEY);
      await userStorage.remove(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY);
      await loadTimeline();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadTimeline();
    } else {
      hasAnimated.current = false;
    }
  }, [visible]);

  const timelineData = timelineDataState ? timelineDataState.timelineData : [];

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await userStorage.getRaw(VIEWED_ERAS_KEY);
        if (stored) setViewedEras(new Set(JSON.parse(stored)));
      } catch (e) {}
    };
    if (visible) load();
  }, [visible]);

  // Ensure cardAnims array matches data length
  if (cardAnims.length !== timelineData.length) {
    timelineData.forEach((_, i) => {
      if (!cardAnims[i]) cardAnims[i] = new Animated.Value(0);
    });
  }

  // Entrance animations
  useEffect(() => {
    if (timelineData.length > 0 && !loading && !hasAnimated.current) {
      hasAnimated.current = true;
      Animated.stagger(80,
        cardAnims.map((anim) =>
          Animated.spring(anim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true })
        )
      ).start(() => {
        cardAnims.forEach(a => a.setValue(1));
      });
      Animated.timing(progressAnim, {
        toValue: timelineData.length > 0 ? viewedEras.size / timelineData.length : 0,
        duration: 800,
        delay: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [timelineData.length, loading]);

  useEffect(() => {
    if (timelineData.length > 0 && !loading) {
      Animated.timing(progressAnim, {
        toValue: viewedEras.size / timelineData.length,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [viewedEras.size]);

  // Update dynamic background when activeIndex changes
  useEffect(() => {
    if (timelineData[activeIndex]) {
      const newColor = timelineData[activeIndex].color + (isDark ? '15' : '1A'); // subtle opacity
      setBgColors([bgColors[1], newColor]);
      bgAnim.setValue(0);
      Animated.timing(bgAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [activeIndex, timelineData, isDark]);

  // =============================================
  // Scroll & Haptics
  // =============================================
  const handleScroll = (event) => {
    const offsetY = Math.max(0, event.nativeEvent.contentOffset.y);
    
    // Since we snap by ITEM_HEIGHT, the current scroll offset divided by ITEM_HEIGHT
    // perfectly gives us the index of the item that is currently snapped into the "active" upper-middle zone.
    let newActiveIndex = Math.max(0, Math.min(
      timelineData.length - 1,
      Math.round(offsetY / ITEM_HEIGHT)
    ));

    if (newActiveIndex !== activeIndex) {
      // Light haptic tick as the user scrolls past each node
      hapticFeedback.light();
      setActiveIndex(newActiveIndex);
    }
  };

  // =============================================
  // Bottom sheet logic
  // =============================================
  const openSheet = useCallback(async (era) => {
    hapticFeedback.medium();
    setSelectedEra(era);

    if (!viewedEras.has(era.id)) {
      const newViewed = new Set(viewedEras);
      newViewed.add(era.id);
      setViewedEras(newViewed);
      try {
        await userStorage.setRaw(VIEWED_ERAS_KEY, JSON.stringify([...newViewed]));
      } catch (e) {}
      AchievementService.incrementStat('timelineErasViewed');
    }

    sheetY.setValue(height);
    overlayOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(sheetY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [viewedEras]);

  const closeSheet = useCallback(() => {
    hapticFeedback.light();
    Animated.parallel([
      Animated.timing(sheetY, { toValue: height, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setSelectedEra(null));
  }, []);

  const dismissHapticFired = useRef(false);
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderGrant: () => {
        dismissHapticFired.current = false;
        sheetY.stopAnimation();
        overlayOpacity.stopAnimation();
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy < 0) return;
        sheetY.setValue(gs.dy);
        overlayOpacity.setValue(Math.max(0, 1 - gs.dy / (height * 0.5)));

        if (gs.dy > 150 && !dismissHapticFired.current) {
          dismissHapticFired.current = true;
          hapticFeedback.medium();
        } else if (gs.dy <= 150 && dismissHapticFired.current) {
          dismissHapticFired.current = false;
          hapticFeedback.light();
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 150 || gs.vy > 0.5) {
          hapticFeedback.success();
          Animated.parallel([
            Animated.timing(sheetY, { toValue: height, duration: 250, useNativeDriver: true }),
            Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => setSelectedEra(null));
        } else {
          Animated.parallel([
            Animated.spring(sheetY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
            Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  // =============================================
  // Render Helpers
  // =============================================
  // Calculate total path length roughly (height + extra length due to curves)
  const pathSegmentLength = 340; // rough bezier curve length for ITEM_HEIGHT (240)
  const totalPathLength = (timelineData.length - 1) * pathSegmentLength + 200; // + head/tail

  const drawProgress = scrollY.interpolate({
    inputRange: [0, (timelineData.length * ITEM_HEIGHT)],
    outputRange: [totalPathLength, 0], // Start fully dashed, reduce as we scroll
    extrapolate: 'clamp'
  });

  const renderSVGPath = () => {
    if (timelineData.length < 2) return null;
    
    const segments = [];
    const segments2 = []; // Secondary DNA helix strand
    
    // Main path starts at center and swoops left (or right)
    let fullD = `M ${width / 2} -50 Q ${LEFT_NODE_X} 0, ${LEFT_NODE_X} ${START_Y}`;
    let fullD2 = `M ${width / 2} -50 Q ${RIGHT_NODE_X} 0, ${RIGHT_NODE_X} ${START_Y}`; // Secondary strand opposite
    
    for (let i = 0; i < timelineData.length - 1; i++) {
      const prevIsLeft = i % 2 === 0;
      const currIsLeft = (i + 1) % 2 === 0;
      
      const prevX = prevIsLeft ? LEFT_NODE_X : RIGHT_NODE_X;
      const currX = currIsLeft ? LEFT_NODE_X : RIGHT_NODE_X;
      
      const prevX2 = prevIsLeft ? RIGHT_NODE_X : LEFT_NODE_X;
      const currX2 = currIsLeft ? RIGHT_NODE_X : LEFT_NODE_X;
      
      const prevY = START_Y + i * ITEM_HEIGHT;
      const currY = START_Y + (i + 1) * ITEM_HEIGHT;
      const midY = (prevY + currY) / 2;
      
      // Crucial: The control points hit exactly `midY` (the physical gap between cards)
      // This forces the path to cleanly weave between the cards instead of slashing through them.
      const d = `M ${prevX} ${prevY} C ${prevX} ${midY}, ${currX} ${midY}, ${currX} ${currY}`;
      fullD += ` C ${prevX} ${midY}, ${currX} ${midY}, ${currX} ${currY}`;
      
      const d2 = `M ${prevX2} ${prevY} C ${prevX2} ${midY}, ${currX2} ${midY}, ${currX2} ${currY}`;
      fullD2 += ` C ${prevX2} ${midY}, ${currX2} ${midY}, ${currX2} ${currY}`;
      
      const isViewed = viewedEras.has(timelineData[i].id);
      const nextIsViewed = viewedEras.has(timelineData[i + 1].id);
      
      const isPathActive = isViewed && nextIsViewed;
      const pathColor = isPathActive ? timelineData[i].color : (isDark ? 'rgba(255,255,255,0.1)' : theme.primary + '20');

      // Primary segment
      segments.push(
        <Path 
          key={`segment-${i}`}
          d={d} 
          stroke={pathColor} 
          strokeWidth={26} 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      );
      
      // Secondary segment (thinner, more transparent to look like a helix background)
      segments2.push(
        <Path 
          key={`segment2-${i}`}
          d={d2} 
          stroke={pathColor} 
          strokeWidth={12} 
          opacity={0.35}
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      );
    }
    
    // Continue a bit past the last node
    const lastIndex = timelineData.length - 1;
    const lastIsLeft = lastIndex % 2 === 0;
    const lastX = lastIsLeft ? LEFT_NODE_X : RIGHT_NODE_X;
    const lastX2 = lastIsLeft ? RIGHT_NODE_X : LEFT_NODE_X;
    const lastY = START_Y + lastIndex * ITEM_HEIGHT;
    
    // Smooth final curve off the screen
    const tailD = `M ${lastX} ${lastY} Q ${lastX} ${lastY + 100}, ${width / 2} ${lastY + 150}`;
    fullD += ` Q ${lastX} ${lastY + 100}, ${width / 2} ${lastY + 150}`;
    
    const tailD2 = `M ${lastX2} ${lastY} Q ${lastX2} ${lastY + 100}, ${width / 2} ${lastY + 150}`;
    fullD2 += ` Q ${lastX2} ${lastY + 100}, ${width / 2} ${lastY + 150}`;
    
    const tailColor = isDark ? 'rgba(255,255,255,0.1)' : theme.primary + '20';

    segments.push(
      <Path key={`segment-tail`} d={tailD} stroke={tailColor} strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    );
    segments2.push(
      <Path key={`segment-tail2`} d={tailD2} stroke={tailColor} strokeWidth={12} opacity={0.35} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    );
    
    // Top leading path
    const headD = `M ${width / 2} -50 Q ${LEFT_NODE_X} 0, ${LEFT_NODE_X} ${START_Y}`;
    const headD2 = `M ${width / 2} -50 Q ${RIGHT_NODE_X} 0, ${RIGHT_NODE_X} ${START_Y}`;
    
    const headIsViewed = viewedEras.has(timelineData[0].id);
    const headColor = headIsViewed ? timelineData[0].color : (isDark ? 'rgba(255,255,255,0.1)' : theme.primary + '20');

    segments.unshift(
      <Path key={`segment-head`} d={headD} stroke={headColor} strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    );
    segments2.unshift(
      <Path key={`segment-head2`} d={headD2} stroke={headColor} strokeWidth={12} opacity={0.35} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    );

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height={lastY + 150}>
          {/* Secondary Helix (Behind everything) */}
          {segments2}
          <AnimatedPath
            d={fullD2}
            stroke={theme.primary}
            strokeWidth={4}
            opacity={0.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalPathLength * 1.5}
            strokeDashoffset={drawProgress}
          />

          {/* Primary Shadow path */}
          <Path 
            d={fullD} 
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'} 
            strokeWidth={38} 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            transform="translate(0, 4)"
          />
          {/* Primary Segments */}
          {segments}
          
          {/* Primary Laser Beam Scrolling Path (Glow) */}
          <AnimatedPath
            d={fullD}
            stroke={theme.primary}
            strokeWidth={18}
            opacity={0.35}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalPathLength * 1.5}
            strokeDashoffset={drawProgress}
          />
          {/* Primary Laser Beam Scrolling Path (Core) */}
          <AnimatedPath
            d={fullD}
            stroke={theme.primary}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalPathLength * 1.5}
            strokeDashoffset={drawProgress}
          />
        </Svg>
      </View>
    );
  };

  const renderEraItem = (era, index) => {
    const isViewed = viewedEras.has(era.id);
    // Expand the "active" zone so the user feels they are interacting with the timeline
    // The closest item to the center is active
    const isActive = index === activeIndex;
    const isLeft = index % 2 === 0;
    
    // We want the inactive items to be slightly faded out to emphasize the active one
    const fadeOpacity = isActive ? 1 : 0.45;
    
    const anim = cardAnims[index] || new Animated.Value(1);
    const cardTranslateY = anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
    const cardOpacity = anim;

    // Progress Ring Calculation (simulated as 100% when viewed)
    const ringCircumference = Math.PI * (NODE_SIZE - 6);
    // Add a slight gap in the dash offset so it looks like an arc when viewed instead of a full circle
    const ringStrokeDashoffset = isViewed ? 0 : ringCircumference;
    
    // Determine connection path color to the NEXT node
    // A path is "completed" if this node is viewed AND the next node is viewed
    const hasNextNode = index < timelineData.length - 1;
    const nextIsViewed = hasNextNode ? viewedEras.has(timelineData[index + 1].id) : false;
    const pathIsActive = isViewed && nextIsViewed;

    // Hover transforms (only applies to active item)
    const hoverY = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] });
    const stickerHoverY = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [4, -4] }); // Parallax opposite direction
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1.6, 1.9] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] });

    return (
      <View key={era.id} style={[styles.itemRow, { flexDirection: isLeft ? 'row' : 'row-reverse' }]}>
        
        {/* The Node (Duolingo Style Circle) */}
        <Animated.View style={[
          styles.nodeOuter, 
          { 
            opacity: cardOpacity, 
            transform: [
              { translateY: isActive ? hoverY : cardTranslateY }, // hover active node
              { scale: isActive ? 1.25 : 0.95 } // much larger bump when active, shrink when inactive
            ] 
          }
        ]}>
          {/* Glowing aura behind active node */}
          {isActive && (
            <Animated.View style={[StyleSheet.absoluteFillObject, { 
              backgroundColor: era.color, 
              borderRadius: NODE_SIZE, 
              opacity: pulseOpacity, 
              transform: [{ scale: pulseScale }] 
            }]} />
          )}

          <View style={[styles.nodeShadow, { shadowColor: era.color }]} />
          
          <View style={[styles.node, { backgroundColor: isViewed ? era.color : (isDark ? '#222' : '#FFF') }]}>
            {/* SVG Progress Ring */}
            <Svg width={NODE_SIZE} height={NODE_SIZE} style={{ position: 'absolute' }}>
              {/* Background ring (subtle track) */}
              <Circle
                cx={NODE_SIZE / 2}
                cy={NODE_SIZE / 2}
                r={(NODE_SIZE - 6) / 2}
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                strokeWidth={5}
                fill="none"
              />
              {/* Foreground ring (filled) */}
              <Circle
                cx={NODE_SIZE / 2}
                cy={NODE_SIZE / 2}
                r={(NODE_SIZE - 6) / 2}
                stroke={isViewed ? 'rgba(255,255,255,0.3)' : era.color}
                strokeWidth={5}
                fill="none"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringStrokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${NODE_SIZE/2} ${NODE_SIZE/2})`}
              />
            </Svg>

            {/* Node Icon/Content */}
            {isViewed ? (
              <FontAwesome5 name="check" size={18} color="#FFF" />
            ) : (
              <FontAwesome5 name="lock" size={16} color={era.color} />
            )}
          </View>
        </Animated.View>

        {/* The Card */}
        <Animated.View style={[
          styles.cardOuter, 
          { 
            opacity: cardOpacity, 
            transform: [
              { translateY: isActive ? hoverY : cardTranslateY }, // hover active card
              { scale: isActive ? 1.05 : 0.93 } // Scale active card slightly up, shrink others
            ] 
          }
        ]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openSheet(era)}
            style={[styles.cardShadow, { shadowColor: isActive ? era.color : '#000', shadowOpacity: isActive ? 0.45 : 0.15 }]}
          >
            <BlurView
              intensity={isDark ? 30 : 60}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.card, 
                { 
                  borderWidth: isActive ? 2.5 : 0, 
                  borderColor: 'rgba(255,255,255,0.4)',
                  opacity: fadeOpacity // apply the fade effect to the card itself
                }
              ]}
            >
              <LinearGradient
                colors={era.gradient ? [era.gradient[0] + '88', era.gradient[1] + '88'] : [era.color + '88', era.color + '66']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1.1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.cardScrim} />
              
              <Animated.Image 
                source={{ uri: era.imageUrl }} 
                style={[
                  styles.cardSticker, 
                  { 
                    transform: [
                      { scale: isActive ? 1.25 : 1 },
                      { translateY: isActive ? stickerHoverY : 0 } // parallax hover
                    ],
                    right: isActive ? 12 : 8,
                    top: isActive ? 4 : 12 
                  }
                ]} 
                resizeMode="contain" 
              />

              <View style={styles.cardTextArea}>
                <Text style={styles.cardTitle} numberOfLines={2}>{era.title}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{era.subtitle}</Text>
                <View style={[styles.countPill, { backgroundColor: isViewed ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)' }]}>
                  <Text style={styles.countPillText}>{era.stories?.length || 0} stories</Text>
                </View>
              </View>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const SWIPE_THRESHOLD = width * 0.25;
  const currentCardIndexRef = useRef(currentCardIndex);
  const selectedEraRef = useRef(selectedEra);
  currentCardIndexRef.current = currentCardIndex;
  selectedEraRef.current = selectedEra;

  const cardPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        swipeX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        const stories = selectedEraRef.current?.stories || [];
        const idx = currentCardIndexRef.current;
        if (gesture.dx < -SWIPE_THRESHOLD && idx < stories.length - 1) {
          Animated.spring(swipeX, { toValue: -width, useNativeDriver: true, speed: 20, bounciness: 4 }).start(() => {
            stopStoryAudio();
            setCurrentCardIndex(prev => prev + 1);
            swipeX.setValue(0);
          });
        } else if (gesture.dx > SWIPE_THRESHOLD && idx > 0) {
          Animated.spring(swipeX, { toValue: width, useNativeDriver: true, speed: 20, bounciness: 4 }).start(() => {
            stopStoryAudio();
            setCurrentCardIndex(prev => prev - 1);
            swipeX.setValue(0);
          });
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
        }
      },
    })
  ).current;

  const renderStackedCards = (eraColor) => {
    const stories = selectedEra?.stories || [];
    if (!stories.length) return null;

    const cardsToShow = stories.slice(currentCardIndex, currentCardIndex + 3);

    return (
      <View style={styles.stackContainer}>
        {cardsToShow.map((story, i) => {
          const actualIndex = currentCardIndex + i;
          const isTop = i === 0;
          const isPlaying = playingStoryIndex === actualIndex;

          const cardStyle = {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 3 - i,
            transform: isTop
              ? [
                  { translateX: swipeX },
                  { rotate: swipeX.interpolate({ inputRange: [-width, 0, width], outputRange: ['-8deg', '0deg', '8deg'], extrapolate: 'clamp' }) },
                ]
              : [
                  { scale: 1 - i * 0.05 },
                  { translateY: i * 10 },
                ],
          };

          return (
            <Animated.View key={actualIndex} style={cardStyle} {...(isTop ? cardPanResponder.panHandlers : {})}>
              <View style={[styles.deckCard, {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: isDark ? eraColor + '40' : eraColor + '30',
                shadowColor: eraColor,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: isTop ? 0.2 : 0.05,
                shadowRadius: 20,
                elevation: isTop ? 10 : 5 - i,
              }]}>
                <LinearGradient
                  colors={[eraColor + (isDark ? '30' : '15'), 'transparent']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150 }}
                />

                <ScrollView showsVerticalScrollIndicator={false} bounces={true} scrollEnabled={isTop} contentContainerStyle={{ padding: 24, paddingBottom: 140 }}>
                  <View style={[styles.storyNumber, { backgroundColor: eraColor + (isDark ? '40' : '20') }]}>
                    <Text style={[styles.storyNumberText, { color: isDark ? '#FFF' : eraColor }]}>STORY {String(actualIndex + 1).padStart(2, '0')}</Text>
                  </View>

                  <Text style={[styles.deckStoryTitle, { color: theme.text }]}>{story.title}</Text>

                  <View style={styles.deckMetaRow}>
                    <View style={[styles.deckMetaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                      <MaterialIcons name="event" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                      <Text style={[styles.deckMetaText, { color: theme.textSecondary }]}>{story.when}</Text>
                    </View>
                  </View>

                  <View style={styles.deckMetaRow}>
                    <View style={[styles.deckMetaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                      <FontAwesome5 name="bible" size={12} color={theme.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.deckMetaText, { color: theme.textSecondary, fontWeight: '700' }]}>{story.bibleStory}</Text>
                    </View>
                  </View>

                  <Text style={[styles.deckStoryText, { color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)' }]}>{story.story}</Text>
                </ScrollView>

                {isTop && (
                  <View style={styles.audioGradientWrap}>
                    <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <LinearGradient
                      colors={[
                        isDark ? 'rgba(28,28,30,0)' : 'rgba(255,255,255,0)',
                        isDark ? 'rgba(28,28,30,0.9)' : 'rgba(255,255,255,0.9)',
                        isDark ? '#1C1C1E' : '#FFFFFF'
                      ]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.audioControlsRow}>
                      {isPlaying && (
                        <TouchableOpacity
                          style={[styles.restartBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                          onPress={restartStory}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons name="replay" size={22} color={theme.text} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.audioBtn,
                          {
                            flex: 1,
                            backgroundColor: (isPlaying || isAudioLoading) ? eraColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                            shadowColor: (isPlaying || isAudioLoading) ? eraColor : '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: (isPlaying || isAudioLoading) ? 0.4 : 0,
                            shadowRadius: 12,
                          }
                        ]}
                        onPress={() => isAudioLoading ? null : (isPlaying ? togglePause() : playStory(story, actualIndex))}
                        activeOpacity={isAudioLoading ? 1 : 0.8}
                      >
                        <MaterialIcons
                          name={isAudioLoading ? "cloud-download" : (isPlaying ? (isPaused ? "play-arrow" : "pause") : "play-arrow")}
                          size={26}
                          color={isPlaying || isAudioLoading ? '#FFF' : theme.text}
                        />
                        <Text style={[styles.audioBtnText, { color: isPlaying || isAudioLoading ? '#FFF' : theme.text }]}>
                          {isAudioLoading ? "Loading..." : isPlaying ? (isPaused ? "Paused" : "Reading...") : "Listen to Story"}
                        </Text>

                        {isPlaying && !isPaused && !isAudioLoading && (
                          <View style={styles.waveformWrap}>
                            <Animated.View style={[styles.waveBar, { backgroundColor: '#FFF', transform: [{ scaleY: waveformAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }]} />
                            <Animated.View style={[styles.waveBar, { backgroundColor: '#FFF', transform: [{ scaleY: waveformAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) }] }]} />
                            <Animated.View style={[styles.waveBar, { backgroundColor: '#FFF', transform: [{ scaleY: waveformAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] }) }] }]} />
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        }).reverse()}
      </View>
    );
  };

  const renderBottomSheet = () => {
    if (!selectedEra) return null;
    const stories = selectedEra.stories || [];

    return (
      <>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents={selectedEra ? 'auto' : 'none'}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeSheet} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { backgroundColor: theme.background, transform: [{ translateY: sheetY }] }]}>
          <View {...sheetPanResponder.panHandlers} style={styles.sheetHandleWrap}>
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' }]} />
          </View>
          
          {/* Era Header */}
          <View style={styles.deckHeader}>
            <Image source={{ uri: selectedEra.imageUrl }} style={styles.deckHeaderSticker} resizeMode="contain" />
            <View style={styles.deckHeaderText}>
              <Text style={[styles.deckHeaderTitle, { color: theme.text }]} numberOfLines={2}>{selectedEra.title}</Text>
              <Text style={[styles.deckHeaderSubtitle, { color: theme.textSecondary }]}>{stories.length} Stories</Text>
            </View>
          </View>

          {/* Card counter + navigation */}
          <View style={styles.cardNav}>
            <TouchableOpacity
              onPress={() => { if (currentCardIndex > 0) { stopStoryAudio(); setCurrentCardIndex(prev => prev - 1); } }}
              style={[styles.cardNavBtn, { opacity: currentCardIndex > 0 ? 1 : 0.25 }]}
              disabled={currentCardIndex === 0}
              activeOpacity={0.6}
            >
              <MaterialIcons name="chevron-left" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.cardCounter, { color: theme.textSecondary }]}>
              {currentCardIndex + 1} / {stories.length}
            </Text>
            <TouchableOpacity
              onPress={() => { if (currentCardIndex < stories.length - 1) { stopStoryAudio(); setCurrentCardIndex(prev => prev + 1); } }}
              style={[styles.cardNavBtn, { opacity: currentCardIndex < stories.length - 1 ? 1 : 0.25 }]}
              disabled={currentCardIndex >= stories.length - 1}
              activeOpacity={0.6}
            >
              <MaterialIcons name="chevron-right" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          {/* Stacked Tinder-style Cards */}
          {renderStackedCards(selectedEra.color)}
        </Animated.View>
      </>
    );
  };

  const viewedCount = viewedEras.size;
  const totalEras = timelineData.length;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  const reverseSpin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg']
  });

  const content = (
    <View style={styles.root}>
      {/* Dynamic Animated Background overlay */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { 
            backgroundColor: bgAnim.interpolate({
              inputRange: [0, 1],
              outputRange: bgColors,
            }) 
          }
        ]} 
      />

      {/* Meshed Ambient Light Orbs */}
      {timelineData.length > 0 && timelineData[activeIndex] && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Top Right Orb */}
          <Animated.View style={{
            position: 'absolute', top: -150, right: -100, width: 400, height: 400, borderRadius: 200,
            backgroundColor: timelineData[activeIndex].color, opacity: 0.15,
            transform: [{ rotate: spin }, { translateX: 50 }, { translateY: 50 }]
          }} />
          {/* Bottom Left Orb */}
          <Animated.View style={{
            position: 'absolute', bottom: height * 0.1, left: -150, width: 500, height: 500, borderRadius: 250,
            backgroundColor: timelineData[Math.min(activeIndex + 1, timelineData.length - 1)].color, opacity: 0.1,
            transform: [{ rotate: reverseSpin }, { translateX: -60 }, { translateY: -40 }]
          }} />
          {/* Center Subtle Orb */}
          <Animated.View style={{
            position: 'absolute', top: height * 0.4, left: width * 0.1, width: 300, height: 300, borderRadius: 150,
            backgroundColor: timelineData[Math.max(activeIndex - 1, 0)].color, opacity: 0.12,
            transform: [{ rotate: spin }, { translateX: 80 }, { scale: hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }]
          }} />
        </View>
      )}

      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />

      <SimplePercentageLoader isVisible={loading} loadingText="Loading Bible timeline..." />

      {error && !loading && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error_outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={refreshTimeline}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={onClose}
        style={[styles.headerBtn, { backgroundColor: 'rgba(255,255,255,0.1)', position: 'absolute', top: insets.top + 8, left: 16, zIndex: 10 }]}
      >
        <MaterialIcons name="arrow-back-ios-new" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {!loading && !error && (
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          disableIntervalMomentum={true}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true, listener: handleScroll }
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
        >
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View style={{ width: 44 }} />
            <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Bible Timeline</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.titleSection}>
            <Text style={[styles.pageSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>Journey through Biblical history</Text>
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Animated.View style={[styles.progressFill, { backgroundColor: theme.primary, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
              </View>
              <Text style={[styles.progressLabel, { color: 'rgba(255,255,255,0.7)' }]}>{viewedCount} of {totalEras}</Text>
            </View>
          </View>

          <View style={styles.timelineWrap}>
            {renderSVGPath()}
            {timelineData.map((era, index) => renderEraItem(era, index))}
          </View>
        </Animated.ScrollView>
      )}

      {renderBottomSheet()}
    </View>
  );

  if (asScreen) return content;
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>{content}</Modal>;
};

// =============================================
// STYLES
// =============================================
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' }, // actual bg color handled by animated view
  scrollView: { flex: 1, zIndex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  titleSection: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  pageSubtitle: { fontSize: 15, fontWeight: '400', marginTop: 4, letterSpacing: 0.1 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', marginRight: 12 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 13, fontWeight: '700' },
  
  timelineWrap: { position: 'relative', paddingTop: 20 },
  
  itemRow: { 
    paddingHorizontal: PADDING_H, 
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  nodeOuter: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeShadow: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#FFF', // acts as base for shadow
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    overflow: 'hidden',
  },
  
  cardOuter: {
    width: CARD_WIDTH,
  },
  cardShadow: {
    borderRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardScrim: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  cardSticker: { position: 'absolute', right: 8, top: 12, width: STICKER_SIZE, height: STICKER_SIZE, opacity: 0.95 },
  cardTextArea: { padding: 20, paddingTop: 0, maxWidth: '80%' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  cardSubtitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  countPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  countPillText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200 },
  sheet: { position: 'absolute', top: height * 0.08, left: 0, right: 0, bottom: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, zIndex: 201, overflow: 'hidden' },
  sheetHandleWrap: { alignItems: 'center', justifyContent: 'center', height: 40 },
  sheetHandle: { width: 44, height: 5, borderRadius: 3 },
  sheetScroll: { paddingBottom: 20 },
  deckHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
  deckHeaderSticker: { width: 56, height: 56, marginRight: 16 },
  deckHeaderText: { flex: 1 },
  deckHeaderTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  deckHeaderSubtitle: { fontSize: 14, fontWeight: '600' },
  
  stackContainer: { flex: 1, marginHorizontal: 20, marginBottom: 20 },
  cardNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
  cardNavBtn: { padding: 4 },
  cardCounter: { fontSize: 15, fontWeight: '700', marginHorizontal: 16, letterSpacing: 0.5 },
  deckCard: { flex: 1, borderRadius: 32, borderWidth: 1.5, overflow: 'hidden' },
  storyNumber: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 16 },
  storyNumberText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  deckStoryTitle: { fontSize: 24, fontWeight: '800', marginBottom: 20, letterSpacing: -0.4, lineHeight: 30 },
  
  deckMetaRow: { marginBottom: 12 },
  deckMetaBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  deckMetaText: { fontSize: 14, fontWeight: '500' },
  
  deckStoryText: { fontSize: 17, lineHeight: 28, marginTop: 12, fontWeight: '400' },

  audioGradientWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, justifyContent: 'flex-end', padding: 16, paddingBottom: 16, overflow: 'hidden' },
  audioControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  restartBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  audioBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20 },
  audioBtnText: { fontSize: 16, fontWeight: '700', marginLeft: 8 },
  
  waveformWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 12, height: 16 },
  waveBar: { width: 3, height: 16, borderRadius: 1.5, marginHorizontal: 2 },

  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  errorText: { marginTop: 16, marginBottom: 24, fontSize: 16, textAlign: 'center', lineHeight: 24 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

export default BibleTimeline;
