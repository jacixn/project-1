import React, { useRef } from 'react';
import { Animated, TouchableOpacity, PlatformColor, Text, View, Platform } from 'react-native';
import {
  LiquidGlassView,
  LiquidGlassContainerView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

// Enhanced Liquid Glass Card with micro-animations
export const AnimatedLiquidGlassCard = ({ 
  children, 
  onPress, 
  style, 
  effect = 'clear',
  interactive = true,
  tintColor,
  ...props 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { theme, isDark } = useTheme();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const glassStyle = [
    {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    style,
    // Fallback for unsupported devices
    !isLiquidGlassSupported && {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(20px)',
    },
  ];

  const defaultTintColor = tintColor || (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)');

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LiquidGlassView
          style={glassStyle}
          effect={effect}
          interactive={interactive}
          tintColor={defaultTintColor}
          colorScheme="system"
          {...props}
        >
          <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            style={{ flex: 1 }}
          >
            {children}
          </TouchableOpacity>
        </LiquidGlassView>
      </Animated.View>
    );
  }

  return (
    <LiquidGlassView
      style={glassStyle}
      effect={effect}
      interactive={interactive}
      tintColor={defaultTintColor}
      colorScheme="system"
      {...props}
    >
      {children}
    </LiquidGlassView>
  );
};

// Liquid Glass Button with perfect iOS 26 styling
export const LiquidGlassButton = ({ 
  children, 
  onPress, 
  style, 
  effect = 'regular',
  ...props 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { theme, isDark } = useTheme();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 400,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 8,
    }).start();
  };

  const buttonStyle = [
    {
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    style,
    // Fallback for unsupported devices
    !isLiquidGlassSupported && {
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)',
    },
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <LiquidGlassView
        style={buttonStyle}
        effect={effect}
        interactive={true}
        tintColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
        colorScheme="system"
        {...props}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          {children}
        </TouchableOpacity>
      </LiquidGlassView>
    </Animated.View>
  );
};

// Liquid Glass Container for merging effects
export const LiquidGlassMergeContainer = ({ 
  children, 
  spacing = 20, 
  style, 
  ...props 
}) => {
  return (
    <LiquidGlassContainerView 
      spacing={spacing} 
      style={style}
      {...props}
    >
      {children}
    </LiquidGlassContainerView>
  );
};

// Auto-adapting text component for glass backgrounds
export const GlassText = ({ children, style, ...props }) => {
  return (
    <Animated.Text
      style={[
        {
          color: PlatformColor('labelColor'), // Auto-adapts to background
          fontSize: 16,
          fontWeight: '600',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.Text>
  );
};

// Liquid Glass Navigation Bar (enhanced version of your current tab bar)
export const LiquidGlassNavBar = ({ 
  children, 
  style, 
  effect = 'regular',
  ...props 
}) => {
  const { isDark } = useTheme();

  return (
    <LiquidGlassView
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: 34, // Safe area
          paddingTop: 10,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 10,
        },
        style,
        // Fallback for unsupported devices
        !isLiquidGlassSupported && {
          backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(20px)',
        },
      ]}
      effect={effect}
      interactive={false}
      tintColor={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}
      colorScheme="system"
      {...props}
    >
      {children}
    </LiquidGlassView>
  );
};

export { isLiquidGlassSupported };
