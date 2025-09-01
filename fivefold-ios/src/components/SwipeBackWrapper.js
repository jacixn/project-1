import React, { useRef } from 'react';
import { View, PanResponder, Dimensions } from 'react-native';
import { hapticFeedback } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SwipeBackWrapper = ({ 
  children, 
  onSwipeBack, 
  enabled = true,
  swipeAreaWidth = 20, // Width of the swipe area from left edge
  threshold = SCREEN_WIDTH * 0.3 // Distance needed to trigger back action
}) => {
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);

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
        // Only respond if it's more horizontal than vertical movement
        return Math.abs(dx) > Math.abs(dy) && dx > 10;
      },

      onPanResponderGrant: (evt) => {
        swipeStartX.current = evt.nativeEvent.pageX;
        swipeStartY.current = evt.nativeEvent.pageY;
        hapticFeedback.gentle(); // Light feedback when swipe starts
      },

      onPanResponderMove: (evt, gestureState) => {
        const { dx } = gestureState;
        
        // Provide haptic feedback when swipe reaches halfway point
        if (dx > threshold / 2 && dx < threshold / 2 + 20) {
          hapticFeedback.light();
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        
        // Check if swipe distance exceeds threshold and is horizontal
        if (dx > threshold && Math.abs(dy) < 100) {
          hapticFeedback.success(); // Success feedback for completed swipe
          onSwipeBack && onSwipeBack();
        }
      },

      onPanResponderTerminate: () => {
        // Reset values when gesture is terminated
        swipeStartX.current = 0;
        swipeStartY.current = 0;
      },
    })
  ).current;

  if (!enabled) {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

export default SwipeBackWrapper;
