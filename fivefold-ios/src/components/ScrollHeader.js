import React, { useRef, useEffect } from 'react';
import { Animated, Platform } from 'react-native';

const ScrollHeader = ({ children, scrollY, style, headerHeight = 100 }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      const diff = value - lastScrollY.current;
      const scrollDirection = diff > 0 ? 'down' : 'up';
      
      // More responsive thresholds like Twitter
      const hideThreshold = 10; // Start hiding immediately
      const showThreshold = 5;  // Show on small upward movement
      
      if (Math.abs(diff) < 1) return; // Ignore tiny movements
      
      if (scrollDirection === 'down' && value > hideThreshold) {
        // Hide header instantly like Twitter
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -headerHeight,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          })
        ]).start();
      } else if (scrollDirection === 'up' && Math.abs(diff) > showThreshold) {
        // Show header instantly like Twitter
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          })
        ]).start();
      }
      
      // Always show when at the very top - instantly
      if (value <= 10) {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          })
        ]).start();
      }
      
      lastScrollY.current = value;
    });
    
    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [scrollY, translateY, opacity, headerHeight]);
  
  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          top: 15, // Moved down by 15 pixels
          left: 0,
          right: 0,
          zIndex: 1000,
          transform: [{ translateY }],
          opacity,
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default ScrollHeader;
