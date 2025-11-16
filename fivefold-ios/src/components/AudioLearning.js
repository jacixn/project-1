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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
// import { Audio } from 'expo-av'; // TODO: Install when ready for audio: npx expo install expo-av
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

const AudioLearning = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  
  // State
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Audio State
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(1)).current;
  const waveAnim2 = useRef(new Animated.Value(1)).current;
  const waveAnim3 = useRef(new Animated.Value(1)).current;

  // Load stories on mount
  useEffect(() => {
    if (visible) {
      loadStories();
    }
    return () => {
      // Cleanup audio when component unmounts
      // if (sound) {
      //   sound.unloadAsync();
      // }
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

  const playAudio = async (story) => {
    try {
      // Stop current audio if playing
      if (sound) {
        await sound.unloadAsync();
      }

      hapticFeedback.selection();

      // For now, show alert that audio file needs to be generated
      Alert.alert(
        '🎙️ Generate Audio',
        `To complete this feature:\n\n1. Copy the story script\n2. Go to ElevenLabs.io\n3. Generate audio with a natural voice\n4. Upload MP3 to GitHub: audio-files/david-goliath.mp3\n5. Users can then play it!\n\nWould you like to see the script?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Show Script',
            onPress: () => {
              Alert.alert('Story Script', story.script);
            },
          },
        ]
      );

      // TODO: When MP3 is uploaded, this will work:
      // const { sound: audioSound } = await Audio.Sound.createAsync(
      //   { uri: story.audioUrl },
      //   { shouldPlay: true, rate: playbackSpeed },
      //   onPlaybackStatusUpdate
      // );
      // setSound(audioSound);
      // setIsPlaying(true);
      
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Could not play audio. Please try again.');
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
      hapticFeedback.selection();
    } else {
      await sound.playAsync();
      setIsPlaying(true);
      hapticFeedback.selection();
    }
  };

  const changeSpeed = async () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    
    setPlaybackSpeed(nextSpeed);
    if (sound) {
      await sound.setRateAsync(nextSpeed, true);
    }
    hapticFeedback.selection();
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis);
      setPlaybackDuration(status.durationMillis);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderHeader = () => (
    <BlurView
      intensity={20}
      tint={isDark ? 'dark' : 'light'}
      style={styles.blurHeader}
    >
      <View style={{ height: 60 }} />
      <View style={styles.headerContent}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.selection();
            if (selectedStory) {
              if (sound) {
                sound.unloadAsync();
                setSound(null);
              }
              setSelectedStory(null);
              setIsPlaying(false);
            } else {
              onClose();
            }
          }}
          style={styles.headerButton}
        >
          <Text style={[styles.headerButtonText, { color: theme.primary }]}>
            {selectedStory ? 'Back' : 'Close'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {selectedStory ? selectedStory.title : 'Audio Stories'}
        </Text>

        <View style={{ width: 60 }} />
      </View>
    </BlurView>
  );

  const renderStoryList = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <MaterialIcons name="headset" size={64} color={theme.primary} />
          </Animated.View>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading Stories...
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            title="Pull to refresh"
          />
        }
      >
        <Text style={styles.sectionTitle}>BIBLE AUDIO STORIES</Text>
        <Text style={styles.pullHint}>Pull down to refresh</Text>

        {stories.map((story, index) => (
          <TouchableOpacity
            key={story.id}
            style={styles.storyCard}
            onPress={() => {
              hapticFeedback.selection();
              setSelectedStory(story);
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={story.gradient}
              style={styles.storyGradient}
            >
              <View style={styles.storyContent}>
                {/* Icon */}
                <View style={styles.storyIconContainer}>
                  <Text style={styles.storyIcon}>{story.icon}</Text>
                </View>

                {/* Info */}
                <View style={styles.storyInfo}>
                  <Text style={styles.storyTitle}>{story.title}</Text>
                  <Text style={styles.storySubtitle}>{story.subtitle}</Text>
                  <View style={styles.storyMeta}>
                    <MaterialIcons name="access-time" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.storyDuration}>{story.duration}</Text>
                  </View>
                </View>

                {/* Play Button */}
                <View style={styles.playButtonContainer}>
                  <MaterialIcons name="play-circle-filled" size={56} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  const renderPlayer = () => {
    if (!selectedStory) return null;

    const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.playerScrollContent}>
        {/* Story Hero Section */}
        <LinearGradient
          colors={selectedStory.gradient}
          style={styles.heroGradient}
        >
          <Animated.View
            style={[
              styles.heroIconContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Text style={styles.heroIcon}>{selectedStory.icon}</Text>
          </Animated.View>
          
          <Text style={styles.heroTitle}>{selectedStory.title}</Text>
          <Text style={styles.heroSubtitle}>{selectedStory.subtitle}</Text>
          
          <View style={styles.heroMeta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="access-time" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.metaText}>{selectedStory.duration}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <MaterialIcons name="book" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.metaText}>{selectedStory.reference}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Audio Player Controls */}
        <View style={[styles.playerCard, { backgroundColor: theme.surface }]}>
          {/* Waveform Visualization */}
          <View style={styles.waveformContainer}>
            {[waveAnim1, waveAnim2, waveAnim3, waveAnim2, waveAnim1].map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveBar,
                  {
                    backgroundColor: selectedStory.color,
                    opacity: isPlaying ? 0.8 : 0.3,
                    transform: [{ scaleY: isPlaying ? anim : 1 }],
                  },
                ]}
              />
            ))}
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: selectedStory.color,
                  },
                ]}
              />
            </View>
            <View style={styles.timeContainer}>
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                {formatTime(playbackPosition)}
              </Text>
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                {formatTime(playbackDuration)}
              </Text>
            </View>
          </View>

          {/* Main Controls */}
          <View style={styles.mainControls}>
            {/* Speed Control */}
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: theme.background }]}
              onPress={changeSpeed}
            >
              <Text style={[styles.speedText, { color: theme.text }]}>
                {playbackSpeed}x
              </Text>
            </TouchableOpacity>

            {/* Play/Pause Button */}
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={() => playAudio(selectedStory)}
            >
              <LinearGradient
                colors={selectedStory.gradient}
                style={styles.playPauseGradient}
              >
                <MaterialIcons
                  name={isPlaying ? 'pause' : 'play-arrow'}
                  size={48}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </TouchableOpacity>

            {/* Download Button (Future) */}
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: theme.background }]}
              onPress={() => {
                hapticFeedback.selection();
                Alert.alert('Coming Soon', 'Download feature will be available soon!');
              }}
            >
              <MaterialIcons name="download" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Story Description */}
        <View style={[styles.descriptionCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.descriptionTitle, { color: theme.text }]}>
            About This Story
          </Text>
          <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
            {selectedStory.script.substring(0, 200)}...
          </Text>
          
          <TouchableOpacity
            style={styles.readMoreButton}
            onPress={() => Alert.alert(selectedStory.title, selectedStory.script)}
          >
            <Text style={[styles.readMoreText, { color: selectedStory.color }]}>
              Read Full Script
            </Text>
            <MaterialIcons name="arrow-forward" size={16} color={selectedStory.color} />
          </TouchableOpacity>
        </View>

        {/* Key Lessons */}
        <View style={[styles.lessonsCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.lessonsTitle, { color: theme.text }]}>
            📚 Key Lessons
          </Text>
          
          {selectedStory.keyLessons.map((lesson, index) => (
            <View key={index} style={styles.lessonItem}>
              <View style={[styles.lessonDot, { backgroundColor: selectedStory.color }]} />
              <Text style={[styles.lessonText, { color: theme.text }]}>
                {lesson}
              </Text>
            </View>
          ))}
        </View>

        {/* Scripture Reference */}
        <TouchableOpacity
          style={[styles.referenceCard, { backgroundColor: selectedStory.color + '20' }]}
        >
          <MaterialIcons name="menu-book" size={24} color={selectedStory.color} />
          <Text style={[styles.referenceText, { color: theme.text }]}>
            Read in Bible: {selectedStory.reference}
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color={selectedStory.color} />
        </TouchableOpacity>

        {/* Biblely Watermark */}
        <View style={styles.watermarkContainer}>
          <Text style={styles.watermarkText}>Biblely</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        {selectedStory ? renderPlayer() : renderStoryList()}
        
        {renderHeader()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  playerScrollContent: {
    paddingTop: 120,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
  },
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
  heroGradient: {
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  heroIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  heroIcon: {
    fontSize: 64,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 20,
    textAlign: 'center',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  metaText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
  },
  playerCard: {
    margin: 20,
    marginTop: -30,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  waveformContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
    gap: 8,
    marginBottom: 24,
  },
  waveBar: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  speedText: {
    fontSize: 16,
    fontWeight: '800',
  },
  playPauseButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  playPauseGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readMoreText: {
    fontSize: 15,
    fontWeight: '700',
  },
  lessonsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lessonsTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  lessonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  lessonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  referenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    gap: 12,
  },
  referenceText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  watermarkContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginHorizontal: 20,
  },
  watermarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CCCCCC',
    letterSpacing: 2,
  },
});

export default AudioLearning;

