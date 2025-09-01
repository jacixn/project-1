import React, { useRef, useState, useEffect } from 'react';
import { View, PanResponder, Animated, Dimensions } from 'react-native';
import { hapticFeedback } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const InteractiveSwipeBack = ({ 
  children, 
  previousPage = null, // Content to show underneath when swiping
  onSwipeBack, 
  enabled = true,
  swipeAreaWidth = SCREEN_WIDTH * 0.15, // 15% of screen width from left edge - APPLIED TO ALL!
  threshold = 0.6 // 60% of screen width to trigger back
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isDragging, setIsDragging] = useState(false);
  const gestureStartX = useRef(0);
  const lastHapticValue = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (!enabled) return false;
        
        // Only respond to touches starting near the left edge
        const { pageX } = evt.nativeEvent;
        return pageX <= swipeAreaWidth;
      },

      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!enabled) return false;
        
        const { dx, dy } = gestureState;
        // Only respond if it's more horizontal than vertical movement and rightward
        return Math.abs(dx) > Math.abs(dy) && dx > 10;
      },

      onPanResponderGrant: (evt) => {
        gestureStartX.current = evt.nativeEvent.pageX;
        setIsDragging(true);
        lastHapticValue.current = 0;
        // Initial haptic feedback when starting swipe
        hapticFeedback.light();
      },

      onPanResponderMove: (evt, gestureState) => {
        const { dx } = gestureState;
        
        // Only allow rightward movement (positive dx)
        if (dx >= 0) {
          // Real-time page movement - user can see the page sliding
          const clampedDx = Math.min(dx, SCREEN_WIDTH); // Don't go beyond screen width
          translateX.setValue(clampedDx);
          
          // Haptic feedback at quarter intervals
          const progress = clampedDx / SCREEN_WIDTH;
          const hapticTrigger = Math.floor(progress * 4); // 0, 1, 2, 3 for 0%, 25%, 50%, 75%
          
          if (hapticTrigger > lastHapticValue.current) {
            lastHapticValue.current = hapticTrigger;
            if (hapticTrigger === 2) { // 50% - medium haptic
              hapticFeedback.medium();
            } else if (hapticTrigger === 3) { // 75% - stronger haptic (threshold approaching)
              hapticFeedback.heavy();
            } else {
              hapticFeedback.light();
            }
          }
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        setIsDragging(false);
        
        const thresholdDistance = SCREEN_WIDTH * threshold;
        
        if (dx >= thresholdDistance) {
          // User dragged 60%+ to the right - commit to going back
          hapticFeedback.success(); // Success haptic for completing action
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH, // Slide completely off screen to the right
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0); // Reset for next time
            onSwipeBack && onSwipeBack();
          });
        } else {
          // User didn't reach 60% - snap back to original position
          hapticFeedback.gentle(); // Gentle feedback for canceling
          Animated.spring(translateX, {
            toValue: 0,
            tension: 120,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        // If gesture is interrupted, snap back
        setIsDragging(false);
        Animated.spring(translateX, {
          toValue: 0,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  if (!enabled) {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }} {...panResponder.panHandlers}>
      {/* Previous page content underneath - ALWAYS visible when there's previous page */}
      {previousPage && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundColor: '#1a1a1a', // Ensure no white background
        }}>
          {previousPage}
        </View>
      )}
      
      {/* Current page with ONLY swipe animation - no entrance animation */}
      <Animated.View 
        style={{ 
          flex: 1,
          backgroundColor: isDragging ? 'transparent' : '#1a1a1a', // Make transparent during dragging to show previous page
          transform: [
            { translateX } // ONLY swipe gesture - no entrance animation conflict
          ],
          zIndex: 1,
          shadowColor: '#000',
          shadowOffset: { width: -5, height: 0 },
          shadowOpacity: isDragging ? 0.3 : 0,
          shadowRadius: 10,
          elevation: isDragging ? 8 : 0,
        }}
      >
        {/* Current page content */}
        <View style={{ 
          flex: 1, 
          backgroundColor: children?.props?.style?.backgroundColor || '#1a1a1a' // Use child's background or default
        }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

export default InteractiveSwipeBack;
