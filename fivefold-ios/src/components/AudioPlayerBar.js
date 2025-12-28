/**
 * AudioPlayerBar Component
 * Beautiful floating audio player for Bible verse reading
 * Shows at the bottom of the screen when audio is playing
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import bibleAudioService from '../services/bibleAudioService';

const { width: screenWidth } = Dimensions.get('window');

const AudioPlayerBar = ({
  visible,
  currentVerse,
  bookName,
  chapterNumber,
  isPlaying,
  isPaused,
  autoPlayEnabled,
  onStop,
  onToggleAutoPlay,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showControls, setShowControls] = useState(false);
  
  // Slide in/out animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Pulse animation when playing
  useEffect(() => {
    if (isPlaying && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    
    return () => pulseAnim.stopAnimation();
  }, [isPlaying, isPaused]);

  if (!visible) return null;

  const verseNumber = currentVerse?.number || currentVerse?.verse || '';
  const verseText = currentVerse?.content || currentVerse?.text || '';
  const reference = `${bookName} ${chapterNumber}:${verseNumber}`;

  const handleStop = () => {
    hapticFeedback.buttonPress();
    onStop?.();
  };

  const handleToggleAutoPlay = () => {
    hapticFeedback.buttonPress();
    onToggleAutoPlay?.();
  };

  const handleClose = () => {
    hapticFeedback.buttonPress();
    onClose?.();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <BlurView
        intensity={isDark ? 40 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={styles.blurContainer}
      >
        <View style={[styles.content, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]}>
          {/* Playing Indicator */}
          <View style={styles.leftSection}>
            <Animated.View
              style={[
                styles.playingIndicator,
                { 
                  backgroundColor: `${theme.primary}25`,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <MaterialIcons
                name={isPlaying && !isPaused ? 'graphic-eq' : 'pause'}
                size={22}
                color={theme.primary}
              />
            </Animated.View>
          </View>

          {/* Verse Info */}
          <View style={styles.centerSection}>
            <Text style={[styles.reference, { color: theme.primary }]} numberOfLines={1}>
              {reference}
            </Text>
            <Text style={[styles.versePreview, { color: theme.textSecondary }]} numberOfLines={1}>
              {verseText.substring(0, 60)}...
            </Text>
            {autoPlayEnabled && (
              <View style={styles.autoPlayBadge}>
                <MaterialIcons name="repeat" size={12} color={theme.primary} />
                <Text style={[styles.autoPlayText, { color: theme.primary }]}>
                  Auto-play on
                </Text>
              </View>
            )}
          </View>

          {/* Control Buttons */}
          <View style={styles.rightSection}>
            {/* Auto-play Toggle */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                { 
                  backgroundColor: autoPlayEnabled ? `${theme.primary}30` : `${theme.textSecondary}15`,
                },
              ]}
              onPress={handleToggleAutoPlay}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="repeat"
                size={18}
                color={autoPlayEnabled ? theme.primary : theme.textSecondary}
              />
            </TouchableOpacity>

            {/* Stop Button */}
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: theme.primary }]}
              onPress={handleStop}
              activeOpacity={0.7}
            >
              <MaterialIcons name="stop" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: `${theme.textSecondary}15` }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 34, // Safe area for iPhone
    zIndex: 9999,
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  leftSection: {
    marginRight: 12,
  },
  playingIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    marginRight: 10,
  },
  reference: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  versePreview: {
    fontSize: 12,
    lineHeight: 16,
  },
  autoPlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  autoPlayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AudioPlayerBar;

