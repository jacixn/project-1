import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import CustomLoadingIndicator from './CustomLoadingIndicator';

const SimplePercentageLoader = ({ 
  isVisible = true, 
  loadingText = "Loading...",
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Animated dots
      const animateDot = (dotAnim, delay) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(dotAnim, {
              toValue: 1,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(dotAnim, {
              toValue: 0,
              duration: 400,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      animateDot(dot1, 0);
      animateDot(dot2, 200);
      animateDot(dot3, 400);
    } else {
      fadeAnim.setValue(0);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        {/* Loading Animation — uses user's selected animation */}
        <View style={styles.animationWrapper}>
          <CustomLoadingIndicator color={theme.primary} />
        </View>

        {/* Loading Text with Animated Dots */}
        <View style={styles.textContainer}>
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {loadingText}
          </Text>
          <View style={styles.dotsContainer}>
            <Animated.View style={[
              styles.dot, 
              { backgroundColor: theme.primary, opacity: dot1 }
            ]} />
            <Animated.View style={[
              styles.dot, 
              { backgroundColor: theme.primary, opacity: dot2 }
            ]} />
            <Animated.View style={[
              styles.dot, 
              { backgroundColor: theme.primary, opacity: dot3 }
            ]} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 40,
  },
  animationWrapper: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default SimplePercentageLoader;
