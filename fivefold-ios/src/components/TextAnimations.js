import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

// 🌸 Fade In Animation - Perfect for verse reveals
export const FadeInText = ({ children, style, delay = 0, duration = 1000 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeAnim, delay, duration]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text style={style}>{children}</Text>
    </Animated.View>
  );
};

// 🌸 Slide Up Animation - Great for prayer cards
export const SlideUpText = ({ children, style, delay = 0, duration = 800 }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [slideAnim, fadeAnim, delay, duration]);

  return (
    <Animated.View 
      style={{ 
        transform: [{ translateY: slideAnim }],
        opacity: fadeAnim 
      }}
    >
      <Text style={style}>{children}</Text>
    </Animated.View>
  );
};

// 🌸 Split Text Animation - Each character animates individually
export const SplitTextAnimation = ({ 
  children, 
  style, 
  delay = 0, 
  charDelay = 100,
  duration = 600,
  animationType = 'fadeIn' // 'fadeIn', 'slideUp', 'scale', 'rotate'
}) => {
  const [animatedValues] = useState(() => 
    children.split('').map(() => new Animated.Value(0))
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const animations = animatedValues.map((anim, index) => {
        return Animated.timing(anim, {
          toValue: 1,
          duration,
          delay: index * charDelay,
          useNativeDriver: true,
        });
      });

      Animated.stagger(charDelay, animations).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [animatedValues, delay, charDelay, duration]);

  const getCharacterStyle = (animValue, index) => {
    switch (animationType) {
      case 'fadeIn':
        return { opacity: animValue };
      case 'slideUp':
        return {
          opacity: animValue,
          transform: [{
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            })
          }]
        };
      case 'scale':
        return {
          opacity: animValue,
          transform: [{
            scale: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 1],
            })
          }]
        };
      case 'rotate':
        return {
          opacity: animValue,
          transform: [{
            rotate: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: ['180deg', '0deg'],
            })
          }]
        };
      default:
        return { opacity: animValue };
    }
  };

  return (
    <View style={styles.splitTextContainer}>
      {children.split('').map((char, index) => (
        <Animated.Text
          key={index}
          style={[
            style,
            getCharacterStyle(animatedValues[index], index)
          ]}
        >
          {char === ' ' ? '\u00A0' : char}
        </Animated.Text>
      ))}
    </View>
  );
};

// 🌸 Typewriter Effect - Perfect for Bible verses
export const TypewriterText = ({ 
  children, 
  style, 
  delay = 0, 
  speed = 100,
  cursor = true 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let cursorInterval = null;
    const timer = setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < children.length) {
          setDisplayedText(children.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          if (cursor) {
            cursorInterval = setInterval(() => {
              setShowCursor(prev => !prev);
            }, 500);
          }
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (cursorInterval) clearInterval(cursorInterval);
    };
  }, [children, delay, speed, cursor]);

  return (
    <Text style={style}>
      {displayedText}
      {cursor && showCursor && <Text style={[style, { opacity: 0.7 }]}>|</Text>}
    </Text>
  );
};

// 🌸 Shimmer Text - Beautiful loading effect
export const ShimmerText = ({ children, style, colors = ['#FECACA', '#F472B6', '#FECACA'] }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [shimmerAnim]);

  const interpolatedColor = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: colors,
  });

  return (
    <Animated.Text style={[style, { color: interpolatedColor }]}>
      {children}
    </Animated.Text>
  );
};

// 🌸 Bounce Text - Fun for achievements
export const BounceText = ({ children, style, delay = 0, intensity = 1.2 }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: intensity,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: intensity * 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [bounceAnim, delay, intensity]);

  return (
    <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
      <Text style={style}>{children}</Text>
    </Animated.View>
  );
};

// 🌸 Gradient Text Effect (using multiple text layers)
export const GradientText = ({ children, style, colors = ['#F472B6', '#BE185D'] }) => {
  return (
    <View style={styles.gradientTextContainer}>
      <Text style={[style, { color: colors[0] }]}>{children}</Text>
      <Text style={[style, { 
        color: colors[1], 
        position: 'absolute',
        opacity: 0.7 
      }]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  splitTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gradientTextContainer: {
    position: 'relative',
  },
});

export default {
  FadeInText,
  SlideUpText,
  SplitTextAnimation,
  TypewriterText,
  ShimmerText,
  BounceText,
  GradientText,
};



