import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { createSkeletonAnimation, createGlowAnimation, createWaveAnimation } from '../utils/animations';
import { 
  BallVerticalBounce,
  CirclePulseMultiple,
  CircleStrokeSpin,
  QuintupleDotDance,
  CircleRippleMultiple,
  SquareCircuitSnake,
  ProgressHUDOverlay
} from './ProgressHUDAnimations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const SkeletonLoader = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style,
}) => {
  const { theme } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View 
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.card,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.primary + '20',
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

export const PulsingDot = ({ 
  size = 8, 
  color, 
  delay = 0,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: 600,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 600,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [scaleAnim, opacityAnim, delay]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color || theme.primary,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        marginHorizontal: 2,
      }}
    />
  );
};

export const LoadingDots = ({ 
  count = 3, 
  size = 8, 
  color,
  style,
}) => {
  return (
    <View style={[styles.dotsContainer, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <PulsingDot
          key={index}
          size={size}
          color={color}
          delay={index * 200}
        />
      ))}
    </View>
  );
};

export const SpinningLoader = ({ 
  size = 24, 
  color,
  style,
}) => {
  const { theme } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    spin.start();
    return () => spin.stop();
  }, [spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ rotate }],
        },
        style,
      ]}
    >
      <MaterialIcons
        name="refresh"
        size={size}
        color={color || theme.primary}
      />
    </Animated.View>
  );
};

export const WaveLoader = ({ 
  count = 5, 
  height = 20, 
  color,
  style,
}) => {
  const { theme } = useTheme();
  const animations = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const waves = animations.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            delay: index * 100,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.stagger(100, waves).start();

    return () => {
      waves.forEach(wave => wave.stop());
    };
  }, [animations]);

  return (
    <View style={[styles.waveContainer, style]}>
      {animations.map((anim, index) => {
        const scaleY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.wavebar,
              {
                height,
                backgroundColor: color || theme.primary,
                transform: [{ scaleY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

export const FloatingLoader = ({ 
  size = 40, 
  color,
  style,
}) => {
  const { theme } = useTheme();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    float.start();
    rotate.start();

    return () => {
      float.stop();
      rotate.stop();
    };
  }, [floatAnim, rotateAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateY }, { rotate }],
        },
        style,
      ]}
    >
      <MaterialIcons
        name="favorite"
        size={size}
        color={color || theme.primary}
      />
    </Animated.View>
  );
};

export const ProgressBar = ({ 
  progress = 0, 
  width = 200, 
  height = 6, 
  color,
  backgroundColor,
  animated = true,
  style,
}) => {
  const { theme } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(progress);
    }
  }, [progress, animated, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: backgroundColor || theme.surface,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: '100%',
          width: progressWidth,
          backgroundColor: color || theme.primary,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
};

export const CardSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.cardSkeleton, { backgroundColor: theme.card }]}>
      <View style={styles.skeletonHeader}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.skeletonHeaderText}>
          <SkeletonLoader width="60%" height={16} />
          <SkeletonLoader width="40%" height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
      
      <SkeletonLoader width="100%" height={12} style={{ marginTop: 16 }} />
      <SkeletonLoader width="80%" height={12} style={{ marginTop: 8 }} />
      <SkeletonLoader width="90%" height={12} style={{ marginTop: 8 }} />
      
      <View style={styles.skeletonFooter}>
        <SkeletonLoader width={60} height={30} borderRadius={15} />
        <SkeletonLoader width={60} height={30} borderRadius={15} />
      </View>
    </View>
  );
};

export const ListItemSkeleton = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.listItemSkeleton, { backgroundColor: theme.card }]}>
      <SkeletonLoader width={50} height={50} borderRadius={25} />
      <View style={styles.skeletonContent}>
        <SkeletonLoader width="70%" height={16} />
        <SkeletonLoader width="50%" height={12} style={{ marginTop: 6 }} />
      </View>
      <SkeletonLoader width={20} height={20} borderRadius={10} />
    </View>
  );
};

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wavebar: {
    width: 4,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  cardSkeleton: {
    padding: 16,
    borderRadius: 12,
    margin: 8,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
});

export default {
  SkeletonLoader,
  PulsingDot,
  LoadingDots,
  SpinningLoader,
  WaveLoader,
  FloatingLoader,
  ProgressBar,
  CardSkeleton,
  ListItemSkeleton,
  // ProgressHUD-style animations
  BallVerticalBounce,
  CirclePulseMultiple,
  CircleStrokeSpin,
  QuintupleDotDance,
  CircleRippleMultiple,
  SquareCircuitSnake,
  ProgressHUDOverlay,
};
