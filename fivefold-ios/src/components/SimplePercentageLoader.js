import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const SimplePercentageLoader = ({ 
  isVisible = true, 
  loadingText = "Loading...",
  onComplete = () => {}
}) => {
  const { theme } = useTheme();
  const [progress, setProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      // Reset progress when becoming visible
      setProgress(0);
      
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start progress counter
      startProgressCounter();
    } else {
      // Clean up when not visible
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible]);

  const startProgressCounter = () => {
    const duration = 2500; // 2.5 seconds to complete
    const steps = 100;
    const stepDuration = duration / steps;
    
    let currentProgress = 0;
    
    intervalRef.current = setInterval(() => {
      currentProgress += 1;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    }, stepDuration);
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        {/* Simple Progress Circle */}
        <View style={[styles.progressCircle, { borderColor: theme.border }]}>
          <Text style={[styles.percentageText, { color: theme.primary }]}>
            {progress}%
          </Text>
        </View>

        {/* Loading Text */}
        <Text style={[styles.loadingText, { color: theme.text }]}>
          {loadingText}
        </Text>

        {/* Simple Progress Bar */}
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: theme.primary,
                width: `${progress}%`
              }
            ]}
          />
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
    borderRadius: 16,
    minWidth: 200,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  percentageText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: 160,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default SimplePercentageLoader;
