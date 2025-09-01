import React, { useRef } from 'react';
import { View, PanResponder, Dimensions } from 'react-native';
import { hapticFeedback } from '../utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SwipeDownWrapper = ({ 
  children, 
  onSwipeDown, 
  enabled = true,
  swipeAreaHeight = 60, // Height of the swipe area from top edge
  threshold = SCREEN_HEIGHT * 0.2 // Distance needed to trigger close action
}) => {
  const swipeStartY = useRef(0);
  const swipeStartX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (!enabled) return false;
        
        // Only respond to touches starting near the top edge
        const { pageY } = evt.nativeEvent;
        return pageY <= swipeAreaHeight;
      },

      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (!enabled) return false;
        
        const { dx, dy } = gestureState;
        // Only respond if it's more vertical than horizontal movement and downward
        return Math.abs(dy) > Math.abs(dx) && dy > 10;
      },

      onPanResponderGrant: (evt) => {
        swipeStartY.current = evt.nativeEvent.pageY;
        swipeStartX.current = evt.nativeEvent.pageX;
        hapticFeedback.gentle(); // Light feedback when swipe starts
      },

      onPanResponderMove: (evt, gestureState) => {
        const { dy } = gestureState;
        
        // Provide haptic feedback when swipe reaches halfway point
        if (dy > threshold / 2 && dy < threshold / 2 + 20) {
          hapticFeedback.light();
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        
        // Check if swipe distance exceeds threshold and is vertical downward
        if (dy > threshold && Math.abs(dx) < 100) {
          hapticFeedback.success(); // Success feedback for completed swipe
          onSwipeDown && onSwipeDown();
        }
      },

      onPanResponderTerminate: () => {
        // Reset values when gesture is terminated
        swipeStartY.current = 0;
        swipeStartX.current = 0;
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

export default SwipeDownWrapper;
