import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FluidTransition = ({ 
  children, 
  visible, 
  style,
  animationType = 'slideUp',
  duration = 400,
  delay = 0,
}) => {
  const animatedValue = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scaleValue = useRef(new Animated.Value(visible ? 1 : 0.95)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.spring(animatedValue, {
          toValue: 1,
          tension: 100,
          friction: 8,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 120,
          friction: 7,
          delay: delay + 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: duration * 0.7,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: duration * 0.7,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, animatedValue, scaleValue, duration, delay]);

  const getTransformStyle = () => {
    switch (animationType) {
      case 'slideUp':
        return {
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [SCREEN_HEIGHT * 0.3, 0],
              }),
            },
            { scale: scaleValue },
          ],
        };
      
      case 'slideLeft':
        return {
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [SCREEN_WIDTH, 0],
              }),
            },
            { scale: scaleValue },
          ],
        };
      
      case 'slideRight':
        return {
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-SCREEN_WIDTH, 0],
              }),
            },
            { scale: scaleValue },
          ],
        };
      
      case 'fade':
        return {
          opacity: animatedValue,
          transform: [{ scale: scaleValue }],
        };
      
      case 'scale':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ],
        };
      
      case 'bounce':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 1.05, 1],
              }),
            },
          ],
        };
      
      default:
        return {
          opacity: animatedValue,
          transform: [{ scale: scaleValue }],
        };
    }
  };

  return (
    <Animated.View style={[style, getTransformStyle()]}>
      {children}
    </Animated.View>
  );
};

export const FluidButton = ({ 
  children, 
  onPress, 
  style,
  disabled = false,
  hapticType = 'light',
  animationType = 'bounce',
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const glowValue = useRef(new Animated.Value(0)).current;

  const animatePress = () => {
    if (disabled) return;

    // Haptic feedback
    if (hapticType) {
      const { hapticFeedback } = require('../utils/haptics');
      switch (hapticType) {
        case 'light':
          hapticFeedback.light();
          break;
        case 'medium':
          hapticFeedback.medium();
          break;
        case 'heavy':
          hapticFeedback.heavy();
          break;
        default:
          hapticFeedback.light();
          break;
      }
    }

    // Scale animation
    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow effect
    Animated.sequence([
      Animated.timing(glowValue, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(glowValue, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) {
      setTimeout(onPress, 50); // Slight delay for animation
    }
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleValue }],
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          borderRadius: style?.borderRadius || 0,
          opacity: glowValue,
        }}
      />
      {React.cloneElement(children, {
        onPress: animatePress,
        disabled,
      })}
    </Animated.View>
  );
};

export const FluidCard = ({ 
  children, 
  style,
  onPress,
  delay = 0,
  animationType = 'slideUp',
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 80,
      friction: 8,
      delay,
      useNativeDriver: true,
    }).start();
  }, [animatedValue, delay]);

  const handlePress = () => {
    if (!onPress) return;

    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 0.98,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(onPress, 100);
  };

  const getCardTransform = () => {
    switch (animationType) {
      case 'slideUp':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
            { scale: scaleValue },
          ],
        };
      
      case 'slideLeft':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
            { scale: scaleValue },
          ],
        };
      
      case 'fade':
        return {
          opacity: animatedValue,
          transform: [{ scale: scaleValue }],
        };
      
      default:
        return {
          opacity: animatedValue,
          transform: [{ scale: scaleValue }],
        };
    }
  };

  const CardComponent = onPress ? 
    require('react-native').TouchableOpacity : 
    require('react-native').View;

  return (
    <Animated.View style={[style, getCardTransform()]}>
      <CardComponent
        onPress={handlePress}
        activeOpacity={onPress ? 0.9 : 1}
        style={{ flex: 1 }}
      >
        {children}
      </CardComponent>
    </Animated.View>
  );
};

export default FluidTransition;
