import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  StatusBar,
  Animated,
  Dimensions,
  RefreshControl,
  Alert,
  PanResponder,
  Image,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import { getColors } from 'react-native-image-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const SORT_PREFERENCE_KEY = 'audio_stories_sort_order';
const PLAYBACK_MODE_KEY = 'audio_stories_playback_mode';

// Story thumbnail images
const storyImages = {
  'david-goliath': require('../assets/audio-stories/david-goliath.png'),
  'samson': require('../assets/audio-stories/samson.png'),
};

const { width, height } = Dimensions.get('window');

const AudioLearning = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  
  // State
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [playbackMode, setPlaybackMode] = useState('once'); // 'once' or 'continuous'
  
  // Audio State
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.1);
  const [progress, setProgress] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(1)).current;
  const waveAnim2 = useRef(new Animated.Value(1)).current;
  const waveAnim3 = useRef(new Animated.Value(1)).current;
  const playerDragY = useRef(new Animated.Value(0)).current;
  const playerOpacity = useRef(new Animated.Value(0)).current;
  const [playerVisible, setPlayerVisible] = useState(false);
  const [currentStoryData, setCurrentStoryData] = useState(null);
  const [extractedColors, setExtractedColors] = useState(null);
  
  // Refs for callback access (to avoid stale closure issues)
  const playbackModeRef = useRef(playbackMode);
  const selectedStoryRef = useRef(selectedStory);
  const storiesRef = useRef(stories);
  const sortOrderRef = useRef(sortOrder);
  const soundRef = useRef(sound);
  
  // Keep refs in sync with state
  useEffect(() => { playbackModeRef.current = playbackMode; }, [playbackMode]);
  useEffect(() => { selectedStoryRef.current = selectedStory; }, [selectedStory]);
  useEffect(() => { storiesRef.current = stories; }, [stories]);
  useEffect(() => { sortOrderRef.current = sortOrder; }, [sortOrder]);
  useEffect(() => { soundRef.current = sound; }, [sound]);

  // Extract colors from image
  const extractImageColors = async (storyId) => {
    try {
      if (storyImages[storyId]) {
        const imageSource = Image.resolveAssetSource(storyImages[storyId]);
        const colors = await getColors(imageSource.uri, {
          fallback: '#7C3AED',
          cache: true,
          key: storyId,
        });
        
        if (colors.platform === 'ios') {
          setExtractedColors({
            primary: colors.primary,
            secondary: colors.secondary,
            background: colors.background,
            detail: colors.detail,
          });
        } else {
          setExtractedColors({
            primary: colors.dominant,
            secondary: colors.vibrant || colors.muted,
            background: colors.darkVibrant || colors.darkMuted,
          });
        }
      }
    } catch (error) {
      console.log('Error extracting colors:', error);
    }
  };

  // Open player with animation
  const openPlayer = async (story) => {
    // If switching to a different story, stop the current audio first
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (e) {
        console.log('Error stopping previous audio:', e);
      }
      setSound(null);
    }
    
    // Reset audio state for the new story
    setIsPlaying(false);
    setProgress(0);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
    
    // Set the new story
    setCurrentStoryData(story);
    setSelectedStory(story);
    setPlayerVisible(true);
    playerDragY.setValue(0);
    playerOpacity.setValue(1);
    
    // Extract colors from image
    extractImageColors(story.id);
  };

  // Function to close player smoothly
  const closePlayer = async () => {
    // Stop audio first - use ref to get current sound (avoids stale closure)
    const currentSound = soundRef.current;
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (e) {
        console.log('Error stopping audio:', e);
      }
      setSound(null);
    }
    
    // Reset all state immediately (no animation to avoid flicker)
    playerOpacity.setValue(0);
    playerDragY.setValue(0);
    setPlayerVisible(false);
    setCurrentStoryData(null);
    setSelectedStory(null);
    setExtractedColors(null);
    setIsPlaying(false);
    setProgress(0);
    setPlaybackPosition(0);
  };

  // Pan responder for pull-down-to-dismiss on player
  const playerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to downward drags
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          playerDragY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          // Dismiss - just close immediately for smoothness
          closePlayer();
        } else {
          // Snap back smoothly
          Animated.spring(playerDragY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 300,
          }).start();
        }
      },
    })
  ).current;

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedSort = await AsyncStorage.getItem(SORT_PREFERENCE_KEY);
        if (savedSort) {
          setSortOrder(savedSort);
        }
        const savedPlaybackMode = await AsyncStorage.getItem(PLAYBACK_MODE_KEY);
        if (savedPlaybackMode) {
          setPlaybackMode(savedPlaybackMode);
        }
      } catch (error) {
        console.log('Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Toggle sort order and save preference
  const toggleSortOrder = async () => {
    const newOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
    setSortOrder(newOrder);
    hapticFeedback.selection();
    try {
      await AsyncStorage.setItem(SORT_PREFERENCE_KEY, newOrder);
    } catch (error) {
      console.log('Error saving sort preference:', error);
    }
  };

  // Toggle playback mode and save preference
  const togglePlaybackMode = async () => {
    const newMode = playbackMode === 'once' ? 'continuous' : 'once';
    setPlaybackMode(newMode);
    hapticFeedback.selection();
    try {
      await AsyncStorage.setItem(PLAYBACK_MODE_KEY, newMode);
    } catch (error) {
      console.log('Error saving playback mode:', error);
    }
  };

  // Get sorted stories
  const getSortedStories = () => {
    if (sortOrder === 'oldest') {
      return [...stories].reverse();
    }
    return stories;
  };

  // Load stories on mount and cleanup when modal closes
  useEffect(() => {
    if (visible) {
      loadStories();
    } else {
      // Stop audio when modal closes
      if (sound) {
        sound.stopAsync();
        sound.unloadAsync();
        setSound(null);
      }
      setIsPlaying(false);
      setSelectedStory(null);
    }
    return () => {
      // Cleanup audio when component unmounts
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [visible]);

  // Wave animations
  useEffect(() => {
    if (isPlaying) {
      const createWave = (anim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1.5,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        );
      };

      createWave(waveAnim1, 0).start();
      createWave(waveAnim2, 200).start();
      createWave(waveAnim3, 400).start();
    } else {
      waveAnim1.setValue(1);
      waveAnim2.setValue(1);
      waveAnim3.setValue(1);
    }
  }, [isPlaying]);

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadStories = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      const url = 'https://raw.githubusercontent.com/jacixn/project-1/main/quiz-data/audio-stories.json';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }
      
      const data = await response.json();
      setStories(data.stories || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading audio stories:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Could not load audio stories. Please try again.');
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadStories(true);
    setIsRefreshing(false);
  };

  // Get the next story in the list
  const getNextStory = () => {
    const currentStories = storiesRef.current;
    const currentSelected = selectedStoryRef.current;
    const currentSortOrder = sortOrderRef.current;
    
    if (!currentStories.length || !currentSelected) return null;
    
    // Get stories in the current sort order
    const sortedStories = currentSortOrder === 'oldest' 
      ? [...currentStories].reverse() 
      : currentStories;
    
    const currentIndex = sortedStories.findIndex(s => s.id === currentSelected.id);
    if (currentIndex === -1 || currentIndex >= sortedStories.length - 1) {
      return null; // No next story
    }
    
    return sortedStories[currentIndex + 1];
  };

  // Play the next story (for continuous mode)
  const playNextStory = async () => {
    const nextStory = getNextStory();
    if (nextStory) {
      // Update selected story and play
      setSelectedStory(nextStory);
      setCurrentStoryData(nextStory);
      extractImageColors(nextStory.id);
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        playAudio(nextStory);
      }, 300);
    } else {
      // No more stories, just stop
      setIsPlaying(false);
      setProgress(0);
      setPlaybackPosition(0);
    }
  };

  // Callback for playback status updates
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis || 0);
      setPlaybackDuration(status.durationMillis || 0);
      
      if (status.durationMillis > 0) {
        setProgress(status.positionMillis / status.durationMillis);
      }
      
      if (status.didJustFinish) {
        // Check if continuous mode - use ref for current value
        if (playbackModeRef.current === 'continuous') {
          playNextStory();
        } else {
          setIsPlaying(false);
          setProgress(0);
          setPlaybackPosition(0);
        }
      }
    }
  };

  const playAudio = async (story) => {
    try {
      // Stop and unload current audio if playing
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }

      hapticFeedback.selection();
      
      // Check if audioUrl exists
      if (!story.audioUrl) {
        Alert.alert(
          'Audio Not Available',
          'The audio file for this story hasn\'t been uploaded yet. Please check back later!'
        );
        return;
      }
      
      console.log('[AudioLearning] Loading audio from:', story.audioUrl);
      
      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      
      // Load and play audio from GitHub URL
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: story.audioUrl },
        { shouldPlay: true, rate: playbackSpeed, progressUpdateIntervalMillis: 500 },
        onPlaybackStatusUpdate
      );
      
      setSound(audioSound);
      setIsPlaying(true);
      
      console.log('[AudioLearning] Audio playing!');
      
    } catch (error) {
      console.error('[AudioLearning] Error playing audio:', error);
      setIsPlaying(false);
      Alert.alert('Error', 'Could not play audio. The file may not exist yet or there\'s a connection issue.');
    }
  };

  const togglePlayPause = async () => {
    hapticFeedback.selection();
    
    if (isPlaying && sound) {
      // Pause playback
      await sound.pauseAsync();
      setIsPlaying(false);
    } else if (sound) {
      // Resume playback
      await sound.playAsync();
      setIsPlaying(true);
    } else if (selectedStory) {
      // Start fresh
      playAudio(selectedStory);
    }
  };

  const changeSpeed = async () => {
    const speeds = [0.75, 1.0, 1.1, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    
    setPlaybackSpeed(nextSpeed);
    if (sound) {
      await sound.setRateAsync(nextSpeed, true);
    }
    hapticFeedback.selection();
  };

  // Seek to position when slider is moved
  const seekTo = async (value) => {
    if (sound && playbackDuration > 0) {
      const newPosition = value * playbackDuration;
      await sound.setPositionAsync(newPosition);
      setPlaybackPosition(newPosition);
      setProgress(value);
    }
  };

  // Skip forward/back 10 seconds
  const skipForward = async () => {
    if (sound) {
      const newPosition = Math.min(playbackPosition + 10000, playbackDuration);
      await sound.setPositionAsync(newPosition);
      hapticFeedback.selection();
    }
  };

  const skipBackward = async () => {
    if (sound) {
      const newPosition = Math.max(playbackPosition - 10000, 0);
      await sound.setPositionAsync(newPosition);
      hapticFeedback.selection();
    }
  };

  const formatTime = (millis) => {
    const totalSeconds = Math.floor(Math.abs(millis) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatRemainingTime = (current, total) => {
    const remaining = total - current;
    return `-${formatTime(remaining)}`;
  };

  // No traditional header - immersive design

  const renderStoryList = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={['#7C3AED', '#EC4899']}
              style={styles.loadingIconBg}
            >
              <MaterialIcons name="graphic-eq" size={48} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading Stories...
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Stories Grid */}
        <ScrollView 
          style={{ flex: 1 }} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.storiesGridContainer, { paddingTop: 130 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          {getSortedStories().map((story) => (
            <TouchableOpacity
              key={story.id}
              style={styles.storyGridCard}
              onPress={() => {
                hapticFeedback.selection();
                openPlayer(story);
              }}
              activeOpacity={0.9}
            >
              {/* Story Image */}
              <View style={styles.storyGridImageContainer}>
                {storyImages[story.id] ? (
                  <Image
                    source={storyImages[story.id]}
                    style={styles.storyGridImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={story.gradient}
                    style={styles.storyGridImage}
                  >
                    <Text style={{ fontSize: 60 }}>{story.icon}</Text>
                  </LinearGradient>
                )}
                {/* Play button overlay */}
                <View style={styles.storyGridPlayOverlay}>
                  <LinearGradient
                    colors={['#7C3AED', '#EC4899']}
                    style={styles.storyGridPlayBtn}
                  >
                    <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                {/* Duration badge */}
                <View style={styles.storyGridDurationBadge}>
                  <MaterialIcons name="schedule" size={12} color="#FFFFFF" />
                  <Text style={styles.storyGridDurationText}>{story.duration}</Text>
                </View>
              </View>

              {/* Story Info */}
              <View style={styles.storyGridInfo}>
                <Text style={[styles.storyGridTitle, { color: theme.text }]} numberOfLines={1}>
                  {story.title}
                </Text>
                <Text style={[styles.storyGridSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {story.subtitle}
                </Text>
                <View style={styles.storyGridMeta}>
                  <MaterialIcons name="menu-book" size={14} color={theme.textSecondary} />
                  <Text style={[styles.storyGridReference, { color: theme.textSecondary }]}>
                    {story.reference}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Empty state */}
          {stories.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="library-music" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Stories Yet</Text>
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Floating Blur Header */}
        <BlurView 
          intensity={90} 
          tint={isDark ? 'dark' : 'light'} 
          style={styles.floatingBlurHeader}
        >
          <View style={styles.equalHeader}>
            <TouchableOpacity
              style={[styles.equalCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }]}
              onPress={() => {
                hapticFeedback.selection();
                if (sound) {
                  sound.stopAsync();
                  sound.unloadAsync();
                  setSound(null);
                }
                onClose();
              }}
            >
              <MaterialIcons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
            
            <Text style={[styles.equalHeaderTitle, { color: theme.text }]}>Stories</Text>
            
            {/* Sort Toggle */}
            <TouchableOpacity
              style={[styles.sortToggleBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }]}
              onPress={toggleSortOrder}
            >
              <MaterialIcons 
                name={sortOrder === 'newest' ? 'arrow-downward' : 'arrow-upward'} 
                size={16} 
                color={theme.primary} 
              />
              <Text style={[styles.sortToggleText, { color: theme.text }]}>
                {sortOrder === 'newest' ? 'New' : 'Old'}
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    );
  };

  const renderPlayer = () => {
    if (!selectedStory) return null;

    const currentProgress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

    // Handle progress bar tap
    const handleProgressTap = async (event) => {
      const { locationX } = event.nativeEvent;
      const progressBarWidth = width - 60; // Account for padding
      const tapProgress = Math.max(0, Math.min(1, locationX / progressBarWidth));
      
      if (sound && playbackDuration > 0) {
        const newPosition = tapProgress * playbackDuration;
        await sound.setPositionAsync(newPosition);
        setPlaybackPosition(newPosition);
        setProgress(tapProgress);
        hapticFeedback.selection();
      }
    };

    const storyToShow = currentStoryData || selectedStory;
    if (!storyToShow) return null;

    // Interpolate opacity based on drag position - fade out gradually as user pulls down
    const dragOpacity = playerDragY.interpolate({
      inputRange: [0, 150, 400],
      outputRange: [1, 0.9, 0.6],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View 
        style={[
          styles.playerContainer,
          { 
            transform: [{ translateY: playerDragY }],
            opacity: Animated.multiply(playerOpacity, dragOpacity),
          }
        ]}
        pointerEvents={playerVisible ? 'auto' : 'none'}
      >
        {/* Beautiful gradient background - uses extracted colors from image */}
        <LinearGradient
          colors={[
            extractedColors?.primary || storyToShow.gradient[0],
            extractedColors?.secondary || extractedColors?.background || storyToShow.gradient[1],
            '#1C1C1E'
          ]}
          locations={[0, 0.5, 1]}
          style={styles.fullScreenGradient}
        />

        {/* Top Bar with Drag Handle and Close Button */}
        <View style={styles.playerTopBar}>
          <View {...playerPanResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>
          
          {/* Close button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={closePlayer}
          >
            <MaterialIcons name="keyboard-arrow-down" size={32} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.musicPlayerContent}>
          {/* Album Art */}
          <View style={styles.musicAlbumWrapper}>
            <View style={[styles.musicAlbumShadow, { shadowColor: storyToShow.gradient[0] }]}>
              {storyImages[storyToShow.id] ? (
                <Image 
                  source={storyImages[storyToShow.id]} 
                  style={styles.musicAlbumImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={storyToShow.gradient}
                  style={styles.musicAlbumArt}
                >
                  <Text style={styles.musicAlbumIcon}>{storyToShow.icon}</Text>
                </LinearGradient>
              )}
            </View>
          </View>

          {/* Song Info */}
          <View style={styles.musicInfoSection}>
            <Text style={styles.musicTitle}>{storyToShow.title}</Text>
            <Text style={styles.musicArtist}>{storyToShow.subtitle}</Text>
          </View>

          {/* Progress Bar - Tappable */}
          <View style={styles.musicProgressSection}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={handleProgressTap}
              style={styles.musicProgressTouchable}
            >
              <View style={styles.musicProgressTrack}>
                <LinearGradient
                  colors={[storyToShow.gradient[0], storyToShow.gradient[1]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.musicProgressFill, { width: `${currentProgress * 100}%` }]}
                />
                <View 
                  style={[
                    styles.musicProgressThumb, 
                    { 
                      left: `${currentProgress * 100}%`,
                      backgroundColor: '#FFFFFF',
                    }
                  ]} 
                />
              </View>
            </TouchableOpacity>
            <View style={styles.musicTimeRow}>
              <Text style={styles.musicTimeText}>{formatTime(playbackPosition)}</Text>
              <Text style={styles.musicTimeText}>
                {playbackDuration > 0 ? formatRemainingTime(playbackPosition, playbackDuration) : `-${storyToShow.duration}`}
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.musicControlsRow}>
            <TouchableOpacity onPress={skipBackward} style={styles.musicSkipButton}>
              <MaterialIcons name="replay-10" size={36} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={togglePlayPause} 
              style={styles.musicPlayButton}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={55}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={skipForward} style={styles.musicSkipButton}>
              <MaterialIcons name="forward-10" size={36} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Speed and Playback Mode */}
          <View style={styles.bottomOptionsRow}>
            <TouchableOpacity onPress={changeSpeed} style={styles.musicSpeedButton}>
              <Text style={styles.musicSpeedText}>{playbackSpeed}x</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={togglePlaybackMode} style={styles.playbackModeButton}>
              <MaterialIcons 
                name={playbackMode === 'continuous' ? 'repeat' : 'repeat-one'} 
                size={20} 
                color="rgba(255,255,255,0.7)" 
              />
              <Text style={styles.playbackModeText}>
                {playbackMode === 'continuous' ? 'Continuous' : 'Once'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        
        {/* Story list always rendered so it's visible when pulling down player */}
        {renderStoryList()}
        
        {/* Player always mounted but fades in/out */}
        {renderPlayer()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // ========== FLOATING BLUR HEADER ==========
  floatingBlurHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  equalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  equalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  equalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  sortToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ========== STORIES GRID ==========
  storiesGridContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  storyGridCard: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  storyGridImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  storyGridImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyGridPlayOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  storyGridPlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  storyGridDurationBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  storyGridDurationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  storyGridInfo: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  storyGridTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  storyGridSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  storyGridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storyGridReference: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ========== PLAYER STYLES ==========
  playerTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 60,
    alignItems: 'center',
  },
  dragHandleArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 120,
  },
  listScrollContent: {
    paddingTop: 120,
    paddingHorizontal: 20,
  },
  playerScrollContent: {
    paddingTop: 120,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 180,
  },
  loadingIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 24,
  },
  loadingSubtext: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  // List Header
  listHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  listHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  listHeaderSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Featured Card
  featuredCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  featuredGradient: {
    padding: 24,
    minHeight: 200,
  },
  featuredPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  patternCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -40,
  },
  patternCircle2: {
    width: 120,
    height: 120,
    bottom: -30,
    left: -30,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 20,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  featuredIcon: {
    fontSize: 44,
  },
  featuredImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featuredMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  featuredMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 10,
  },
  featuredPlayBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Story Card New
  storyCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  storyCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  storyCardEmoji: {
    fontSize: 28,
  },
  storyCardImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginRight: 14,
  },
  storyCardInfo: {
    flex: 1,
  },
  storyCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  storyCardSub: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  storyCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  storyCardDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  storyCardDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  storyCardRef: {
    fontSize: 12,
    fontWeight: '600',
  },
  storyCardPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Keep old styles that might still be referenced
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 1,
  },
  pullHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 24,
    textAlign: 'center',
  },
  storyCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  storyGradient: {
    padding: 24,
  },
  storyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  storyIcon: {
    fontSize: 36,
  },
  storyInfo: {
    flex: 1,
  },
  storyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  storySubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  storyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storyDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  playButtonContainer: {
    marginLeft: 12,
  },
  // ========== NEW PLAYER STYLES ==========
  playerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  fullScreenGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  albumArtWrapper: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  albumArtOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  albumArtGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  albumArtContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
  },
  albumArtGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArtInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  albumIcon: {
    fontSize: 52,
  },
  vinylRing1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  vinylRing2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  vinylRing3: {
    position: 'absolute',
    width: 178,
    height: 178,
    borderRadius: 89,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  playerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  playerSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
  },
  glassPlayerCard: {
    marginHorizontal: 16,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 24,
  },
  glassPlayerInner: {
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  waveformSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
    gap: 4,
    marginBottom: 24,
  },
  waveBarNew: {
    width: 4,
    borderRadius: 2,
  },
  progressSection: {
    marginBottom: 28,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'visible',
    marginBottom: 10,
  },
  progressFillNew: {
    height: '100%',
    borderRadius: 3,
  },
  progressKnob: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  sideControl: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  mainPlayGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    paddingHorizontal: 16,
  },
  contentCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  cardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  cardText: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 14,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  cardButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 14,
  },
  lessonNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lessonTextNew: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    paddingTop: 2,
  },
  scriptureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  scriptureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scriptureText: {
    gap: 2,
  },
  scriptureLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scriptureRef: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scriptureArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Music Player Styles
  musicPlayerContent: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 30,
    paddingBottom: 50,
    justifyContent: 'space-between',
  },
  musicAlbumWrapper: {
    alignItems: 'center',
    marginTop: 20,
  },
  musicAlbumShadow: {
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 25,
  },
  musicAlbumArt: {
    width: width - 60,
    height: width - 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicAlbumImage: {
    width: width - 60,
    height: width - 60,
    borderRadius: 16,
  },
  musicAlbumIcon: {
    fontSize: 100,
  },
  musicInfoSection: {
    alignItems: 'center',
    marginTop: 35,
  },
  musicTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  musicArtist: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  musicProgressSection: {
    marginTop: 30,
    paddingHorizontal: 0,
  },
  musicProgressTouchable: {
    paddingVertical: 15,
  },
  musicProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'visible',
  },
  musicProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  musicProgressThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  musicTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  musicTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    fontVariant: ['tabular-nums'],
  },
  musicControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    gap: 55,
  },
  musicSkipButton: {
    padding: 12,
    opacity: 0.9,
  },
  musicPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    gap: 16,
  },
  musicSpeedButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  musicSpeedText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  playbackModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  playbackModeText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
});

export default AudioLearning;

