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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Ball Vertical Bounce Animation (inspired by ProgressHUD)
export const BallVerticalBounce = ({ size = 60, color }) => {
  const { theme } = useTheme();
  const bounceAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const createBounceAnimation = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = bounceAnims.map((anim, index) => 
      createBounceAnimation(anim, index * 150)
    );

    animations.forEach(anim => anim.start());

    return () => animations.forEach(anim => anim.stop());
  }, [bounceAnims]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {bounceAnims.map((anim, index) => {
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -size * 0.4],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.ball,
              {
                transform: [{ translateY }],
                backgroundColor: color || theme.primary,
                width: size * 0.2,
                height: size * 0.2,
                borderRadius: size * 0.1,
                left: index * size * 0.3 + size * 0.1,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// Circle Pulse Multiple Animation
export const CirclePulseMultiple = ({ size = 60, color }) => {
  const { theme } = useTheme();
  const pulseAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const createPulseAnimation = (anim, delay) => {
      return Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1200,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );
    };

    const animations = pulseAnims.map((anim, index) => 
      createPulseAnimation(anim, index * 400)
    );

    animations.forEach(anim => anim.start());

    return () => animations.forEach(anim => anim.stop());
  }, [pulseAnims]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {pulseAnims.map((anim, index) => {
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        });

        const opacity = anim.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 0.3, 0],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.circle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: color || theme.primary,
                transform: [{ scale }],
                opacity,
                position: 'absolute',
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// Circle Stroke Spin Animation
export const CircleStrokeSpin = ({ size = 60, color }) => {
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
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.circleStroke,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3,
            borderColor: 'transparent',
            borderTopColor: color || theme.primary,
            transform: [{ rotate }],
          },
        ]}
      />
    </View>
  );
};

// Quintuple Dot Dance Animation
export const QuintupleDotDance = ({ size = 60, color }) => {
  const { theme } = useTheme();
  const dotAnims = Array.from({ length: 5 }, () => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    const createDanceAnimation = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = dotAnims.map((anim, index) => 
      createDanceAnimation(anim, index * 100)
    );

    animations.forEach(anim => anim.start());

    return () => animations.forEach(anim => anim.stop());
  }, [dotAnims]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {dotAnims.map((anim, index) => {
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1.2],
        });

        const opacity = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: color || theme.primary,
                width: size * 0.15,
                height: size * 0.15,
                borderRadius: size * 0.075,
                left: index * size * 0.18 + size * 0.1,
                top: size * 0.4,
                transform: [{ scale }],
                opacity,
                position: 'absolute',
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// Circle Ripple Multiple Animation
export const CircleRippleMultiple = ({ size = 80, color }) => {
  const { theme } = useTheme();
  const rippleAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const createRippleAnimation = (anim, delay) => {
      return Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1500,
          delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      );
    };

    const animations = rippleAnims.map((anim, index) => 
      createRippleAnimation(anim, index * 500)
    );

    animations.forEach(anim => anim.start());

    return () => animations.forEach(anim => anim.stop());
  }, [rippleAnims]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Center dot */}
      <View
        style={[
          styles.centerDot,
          {
            width: size * 0.15,
            height: size * 0.15,
            borderRadius: size * 0.075,
            backgroundColor: color || theme.primary,
            position: 'absolute',
            top: size * 0.425,
            left: size * 0.425,
          },
        ]}
      />
      
      {rippleAnims.map((anim, index) => {
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.2, 1],
        });

        const opacity = anim.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [1, 0.3, 0],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.ripple,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: color || theme.primary,
                transform: [{ scale }],
                opacity,
                position: 'absolute',
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// Square Circuit Snake Animation
export const SquareCircuitSnake = ({ size = 60, color }) => {
  const { theme } = useTheme();
  const snakeAnims = Array.from({ length: 8 }, () => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    const createSnakeAnimation = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 200,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1400,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = snakeAnims.map((anim, index) => 
      createSnakeAnimation(anim, index * 200)
    );

    animations.forEach(anim => anim.start());

    return () => animations.forEach(anim => anim.stop());
  }, [snakeAnims]);

  const positions = [
    { top: 0, left: 0 },
    { top: 0, left: size * 0.33 },
    { top: 0, left: size * 0.66 },
    { top: size * 0.33, left: size * 0.66 },
    { top: size * 0.66, left: size * 0.66 },
    { top: size * 0.66, left: size * 0.33 },
    { top: size * 0.66, left: 0 },
    { top: size * 0.33, left: 0 },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {snakeAnims.map((anim, index) => {
        const opacity = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.2, 1],
        });

        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.snakeSegment,
              {
                backgroundColor: color || theme.primary,
                width: size * 0.2,
                height: size * 0.2,
                borderRadius: size * 0.1,
                position: 'absolute',
                top: positions[index].top,
                left: positions[index].left,
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// Progress HUD-style overlay component
export const ProgressHUDOverlay = ({ 
  visible, 
  text = "Loading...", 
  animationType = "CircleStrokeSpin",
  onDismiss,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const getAnimationComponent = () => {
    switch (animationType) {
      case "BallVerticalBounce":
        return <BallVerticalBounce size={50} />;
      case "CirclePulseMultiple":
        return <CirclePulseMultiple size={60} />;
      case "CircleStrokeSpin":
        return <CircleStrokeSpin size={50} />;
      case "QuintupleDotDance":
        return <QuintupleDotDance size={60} />;
      case "CircleRippleMultiple":
        return <CircleRippleMultiple size={70} />;
      case "SquareCircuitSnake":
        return <SquareCircuitSnake size={50} />;
      default:
        return <CircleStrokeSpin size={50} />;
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        },
      ]}
    >
      <View
        style={[
          styles.hudContainer,
          {
            backgroundColor: theme.card,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          },
        ]}
      >
        {getAnimationComponent()}
        
        {text && (
          <Text
            style={[
              styles.hudText,
              {
                color: theme.text,
                marginTop: 16,
              },
            ]}
          >
            {text}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ball: {
    position: 'absolute',
  },
  circle: {
    backgroundColor: 'transparent',
  },
  circleStroke: {
    backgroundColor: 'transparent',
  },
  dot: {
    position: 'absolute',
  },
  centerDot: {
    position: 'absolute',
  },
  ripple: {
    backgroundColor: 'transparent',
  },
  snakeSegment: {
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  hudContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 120,
  },
  hudText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 200,
  },
});

export default {
  BallVerticalBounce,
  CirclePulseMultiple,
  CircleStrokeSpin,
  QuintupleDotDance,
  CircleRippleMultiple,
  SquareCircuitSnake,
  ProgressHUDOverlay,
};
