import { Animated, Easing } from 'react-native';

// Spring animation presets
export const springPresets = {
  gentle: {
    tension: 120,
    friction: 14,
  },
  medium: {
    tension: 170,
    friction: 26,
  },
  bouncy: {
    tension: 180,
    friction: 12,
  },
  fast: {
    tension: 200,
    friction: 15,
  },
  slow: {
    tension: 80,
    friction: 20,
  },
};

// Easing curves
export const easingCurves = {
  easeOut: Easing.bezier(0, 0, 0.2, 1),
  easeIn: Easing.bezier(0.4, 0, 1, 1),
  easeInOut: Easing.bezier(0.4, 0, 0.2, 1),
  bounce: Easing.bounce,
  elastic: Easing.elastic(2),
  back: Easing.back(1.5),
  anticipate: Easing.bezier(0.2, 1, 0.2, 1),
};

// Animation factory functions
export const createSpringAnimation = (
  animatedValue,
  toValue,
  preset = 'medium',
  useNativeDriver = true
) => {
  return Animated.spring(animatedValue, {
    toValue,
    ...springPresets[preset],
    useNativeDriver,
  });
};

export const createTimingAnimation = (
  animatedValue,
  toValue,
  duration = 300,
  easing = easingCurves.easeOut,
  useNativeDriver = true
) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing,
    useNativeDriver,
  });
};

// Complex animation sequences
export const createEntranceAnimation = (
  translateY,
  opacity,
  scale,
  delay = 0,
  stagger = 0
) => {
  return Animated.sequence([
    Animated.delay(delay + stagger),
    Animated.parallel([
      createSpringAnimation(translateY, 0, 'bouncy'),
      createSpringAnimation(opacity, 1, 'medium'),
      createSpringAnimation(scale, 1, 'gentle'),
    ]),
  ]);
};

export const createExitAnimation = (
  translateY,
  opacity,
  scale,
  direction = 'down'
) => {
  const translateValue = direction === 'up' ? -100 : 100;
  
  return Animated.parallel([
    createTimingAnimation(translateY, translateValue, 200),
    createTimingAnimation(opacity, 0, 150),
    createTimingAnimation(scale, 0.9, 200),
  ]);
};

export const createPulseAnimation = (scaleValue, intensity = 1.05) => {
  return Animated.sequence([
    createSpringAnimation(scaleValue, intensity, 'fast'),
    createSpringAnimation(scaleValue, 1, 'gentle'),
  ]);
};

export const createShakeAnimation = (translateX) => {
  return Animated.sequence([
    createTimingAnimation(translateX, -10, 50),
    createTimingAnimation(translateX, 10, 50),
    createTimingAnimation(translateX, -10, 50),
    createTimingAnimation(translateX, 10, 50),
    createTimingAnimation(translateX, 0, 50),
  ]);
};

export const createGlowAnimation = (opacity, duration = 1500) => {
  return Animated.loop(
    Animated.sequence([
      createTimingAnimation(opacity, 1, duration / 2, easingCurves.easeInOut),
      createTimingAnimation(opacity, 0.3, duration / 2, easingCurves.easeInOut),
    ])
  );
};

export const createWaveAnimation = (translateY, amplitude = 5, frequency = 2000) => {
  return Animated.loop(
    Animated.sequence([
      createTimingAnimation(translateY, -amplitude, frequency / 4, easingCurves.easeInOut),
      createTimingAnimation(translateY, amplitude, frequency / 2, easingCurves.easeInOut),
      createTimingAnimation(translateY, 0, frequency / 4, easingCurves.easeInOut),
    ])
  );
};

export const createRotateAnimation = (rotateValue, duration = 2000) => {
  return Animated.loop(
    createTimingAnimation(rotateValue, 1, duration, Easing.linear)
  );
};

export const createScaleSequence = (scaleValue, scales = [1, 1.1, 1], durations = [200, 200]) => {
  const animations = [];
  
  for (let i = 0; i < scales.length; i++) {
    animations.push(
      createSpringAnimation(scaleValue, scales[i], 'fast')
    );
  }
  
  return Animated.sequence(animations);
};

// Stagger animation for lists
export const createStaggerAnimation = (
  items,
  animationCreator,
  staggerDelay = 100
) => {
  return Animated.stagger(
    staggerDelay,
    items.map((item, index) => animationCreator(item, index))
  );
};

// Page transition animations
export const pageTransitions = {
  slideLeft: (screenWidth) => ({
    cardStyle: {
      transform: [
        {
          translateX: Animated.add(
            Animated.multiply(screenWidth, -1),
            Animated.multiply(screenWidth, 1)
          ),
        },
      ],
    },
  }),
  
  slideUp: (screenHeight) => ({
    cardStyle: {
      transform: [
        {
          translateY: Animated.add(
            Animated.multiply(screenHeight, 1),
            Animated.multiply(screenHeight, -1)
          ),
        },
      ],
    },
  }),
  
  fade: {
    cardStyle: {
      opacity: 1,
    },
  },
  
  scale: {
    cardStyle: {
      transform: [
        {
          scale: 1,
        },
      ],
    },
  },
};

// Loading animations
export const createSkeletonAnimation = (opacity) => {
  return Animated.loop(
    Animated.sequence([
      createTimingAnimation(opacity, 0.3, 800, easingCurves.easeInOut),
      createTimingAnimation(opacity, 1, 800, easingCurves.easeInOut),
    ])
  );
};

export const createProgressAnimation = (progress, duration = 2000) => {
  return createTimingAnimation(progress, 1, duration, easingCurves.easeOut);
};

// Gesture-based animations
export const createPanAnimation = (
  translateX,
  translateY,
  gestureState,
  threshold = 100
) => {
  const { dx, dy, vx, vy } = gestureState;
  
  if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
    // Snap to direction
    return Animated.parallel([
      createSpringAnimation(translateX, dx > 0 ? 300 : -300, 'fast'),
      createSpringAnimation(translateY, dy > 0 ? 300 : -300, 'fast'),
    ]);
  } else {
    // Snap back
    return Animated.parallel([
      createSpringAnimation(translateX, 0, 'bouncy'),
      createSpringAnimation(translateY, 0, 'bouncy'),
    ]);
  }
};

// Utility functions
export const interpolateColor = (animatedValue, inputRange, outputRange) => {
  return animatedValue.interpolate({
    inputRange,
    outputRange,
    extrapolate: 'clamp',
  });
};

export const interpolateRotation = (animatedValue, rotations = ['0deg', '360deg']) => {
  return animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: rotations,
  });
};

export const createDynamicSpring = (velocity, position) => {
  const tension = Math.max(80, Math.min(200, Math.abs(velocity) * 10));
  const friction = Math.max(8, Math.min(25, Math.abs(velocity) * 2));
  
  return {
    tension,
    friction,
  };
};

export default {
  springPresets,
  easingCurves,
  createSpringAnimation,
  createTimingAnimation,
  createEntranceAnimation,
  createExitAnimation,
  createPulseAnimation,
  createShakeAnimation,
  createGlowAnimation,
  createWaveAnimation,
  createRotateAnimation,
  createStaggerAnimation,
  pageTransitions,
  createSkeletonAnimation,
  createProgressAnimation,
  createPanAnimation,
  interpolateColor,
  interpolateRotation,
  createDynamicSpring,
};
