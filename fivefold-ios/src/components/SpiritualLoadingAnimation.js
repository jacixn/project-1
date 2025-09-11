import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const SpiritualLoadingAnimation = ({ 
  isVisible = true, 
  loadingText = "Loading spiritual content...",
  onComplete = () => {}
}) => {
  const { theme, isDark } = useTheme();
  const [progress, setProgress] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rayAnim = useRef(new Animated.Value(0)).current;
  
  // Inspirational loading messages
  const loadingMessages = [
    "Preparing God's Word...",
    "Loading sacred wisdom...",
    "Gathering spiritual insights...",
    "Opening heavenly treasures...",
    "Illuminating divine truth...",
    "Blessing your journey...",
    "Preparing holy content...",
    "Loading biblical wisdom..."
  ];
  
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    if (isVisible) {
      startAnimation();
      startProgressCounter();
    }
  }, [isVisible]);

  const startAnimation = () => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation for cross
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    // Pulsing light effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Light rays animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(rayAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rayAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startProgressCounter = () => {
    const duration = 3000; // 3 seconds to complete
    const steps = 100;
    const stepDuration = duration / steps;
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 1;
      setProgress(currentProgress);
      
      // Change message every 25%
      if (currentProgress % 25 === 0 && currentProgress < 100) {
        const messageIndex = Math.floor(currentProgress / 25);
        if (messageIndex < loadingMessages.length) {
          setCurrentMessage(loadingMessages[messageIndex]);
        }
      }
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    }, stepDuration);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rayOpacity = rayAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 1, 0.3],
  });

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={isDark 
          ? ['#1a1a2e', '#16213e', '#0f3460'] 
          : ['#e8f4fd', '#d1ecf1', '#bbdefb']
        }
        style={styles.gradient}
      >
        {/* Background Light Rays */}
        <Animated.View 
          style={[
            styles.lightRays, 
            { 
              opacity: rayOpacity,
              transform: [{ rotate: rotation }]
            }
          ]}
        >
          {[...Array(8)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.ray,
                {
                  backgroundColor: theme.primary + '20',
                  transform: [{ rotate: `${index * 45}deg` }]
                }
              ]}
            />
          ))}
        </Animated.View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Animated Cross/Star Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: scaleAnim },
                  { rotate: rotation }
                ]
              }
            ]}
          >
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  backgroundColor: theme.primary + '20',
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            />
            <MaterialIcons 
              name="auto-awesome" 
              size={48} 
              color={theme.primary}
              style={styles.icon}
            />
          </Animated.View>

          {/* Progress Circle */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressCircle, { borderColor: theme.border }]}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    backgroundColor: theme.primary,
                    height: `${progress}%`
                  }
                ]}
              />
              <Text style={[styles.progressText, { color: theme.text }]}>
                {progress}%
              </Text>
            </View>
          </View>

          {/* Loading Message */}
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {currentMessage}
          </Text>

          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: theme.primary,
                  width: `${progress}%`
                }
              ]}
            />
          </View>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Preparing your spiritual journey
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightRays: {
    position: 'absolute',
    width: width * 2,
    height: width * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ray: {
    position: 'absolute',
    width: 4,
    height: width,
    borderRadius: 2,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: -26,
    left: -26,
  },
  icon: {
    zIndex: 1,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 40,
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    zIndex: 1,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: width - 80,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SpiritualLoadingAnimation;
