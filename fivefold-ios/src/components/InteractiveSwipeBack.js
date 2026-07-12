import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { View, PanResponder, Animated, Dimensions } from 'react-native';
import { hapticFeedback } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Left-edge swipe-back gesture wrapper.
 *
 * Used by screens whose native swipe-back gesture is disabled because they
 * manage internal navigation state (e.g. BibleReader's books -> verses views).
 * The wrapper never claims a touch on start (taps on edge-adjacent buttons
 * still work) — it only claims once a rightward, mostly-horizontal drag that
 * STARTED at the left edge is detected. Content tracks the finger; releasing
 * past the threshold (or flicking) commits and fires onSwipeBack.
 *
 * The tree shape is constant regardless of `enabled` so toggling it never
 * remounts children (which would wipe their state).
 */
const InteractiveSwipeBack = ({
  children,
  onSwipeBack,
  enabled = true,
  backgroundColor = 'transparent',
  edgeWidth = 32,
  threshold = 0.33,
  resetKey,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;

  // Refs keep the PanResponder (created once) reading fresh values
  const enabledRef = useRef(enabled);
  const onSwipeBackRef = useRef(onSwipeBack);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onSwipeBackRef.current = onSwipeBack; }, [onSwipeBack]);

  // After a committed swipe the content sits fully offscreen; the parent
  // changes resetKey when it swaps the view underneath, and snapping back to
  // 0 here (before paint) avoids flashing the dismissed page or a blank frame
  const isFirstReset = useRef(true);
  useLayoutEffect(() => {
    if (isFirstReset.current) {
      isFirstReset.current = false;
      return;
    }
    translateX.setValue(0);
  }, [resetKey, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!enabledRef.current) return false;
        const { dx, dy, x0 } = gestureState;
        return x0 <= edgeWidth && dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(Math.max(0, Math.min(gestureState.dx, SCREEN_WIDTH)));
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const commit = dx >= SCREEN_WIDTH * threshold || (dx > 40 && vx > 0.5);
        if (commit) {
          hapticFeedback.success();
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            // translateX stays at SCREEN_WIDTH until the parent swaps the
            // view and changes resetKey (see useLayoutEffect above)
            if (onSwipeBackRef.current) onSwipeBackRef.current();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            tension: 120,
            friction: 9,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          tension: 120,
          friction: 9,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View style={{ flex: 1, backgroundColor }} {...panResponder.panHandlers}>
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
};

export default InteractiveSwipeBack;
