import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const SimplePercentageLoader = ({ 
  isVisible = true, 
  loadingText = "Loading...",
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
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

      // Continuous rotation for spinner
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Breathing scale animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

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
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        {/* Cool Spinner Circle */}
        <Animated.View 
          style={[
            styles.spinner, 
            { 
              borderTopColor: theme.primary,
              borderRightColor: theme.primary + '50',
              borderBottomColor: theme.primary + '20',
              borderLeftColor: theme.primary + '50',
              transform: [{ rotate: spin }, { scale: scaleAnim }]
            }
          ]} 
        />

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
  spinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderStyle: 'solid',
    marginBottom: 30,
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
