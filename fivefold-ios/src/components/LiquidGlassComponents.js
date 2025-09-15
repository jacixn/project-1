import React, { useRef } from 'react';
import { Animated, TouchableOpacity, PlatformColor, Text, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

// Expo Go compatible liquid glass simulation
export const isLiquidGlassSupported = false; // Always false in Expo Go

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

  // Enhanced Expo Go liquid glass simulation
  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <BlurView
        intensity={isDark ? 28 : 22}
        tint={isDark ? 'dark' : 'light'}
        style={glassStyle}
      >
        {/* Liquid glass gradient overlay */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)']
              : ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.6)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 16,
          }}
        />
        
        {onPress ? (
          <TouchableOpacity
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            style={{ flex: 1 }}
            {...props}
          >
            {children}
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }}>
            {children}
          </View>
        )}
      </BlurView>
    </Animated.View>
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
      <BlurView
        intensity={isDark ? 20 : 15}
        tint={isDark ? 'dark' : 'light'}
        style={buttonStyle}
      >
        {/* Button gradient overlay */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)']
              : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.8)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 20,
          }}
        />
        
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          {...props}
        >
          {children}
        </TouchableOpacity>
      </BlurView>
    </Animated.View>
  );
};

// Liquid Glass Container for merging effects (Expo Go fallback)
export const LiquidGlassMergeContainer = ({ 
  children, 
  spacing = 20, 
  style, 
  ...props 
}) => {
  return (
    <View 
      style={[{ gap: spacing }, style]}
      {...props}
    >
      {children}
    </View>
  );
};

// Auto-adapting text component for glass backgrounds
export const GlassText = ({ children, style, ...props }) => {
  const { theme, isDark } = useTheme();
  
  return (
    <Text
      style={[
        {
          color: Platform.OS === 'ios' ? PlatformColor('labelColor') : (style?.color || theme.text),
          fontSize: 16,
          fontWeight: '600',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
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
    <BlurView
      intensity={isDark ? 30 : 25}
      tint={isDark ? 'dark' : 'light'}
      style={[
        {
          borderRadius: 28,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 6,
        },
        style,
      ]}
      {...props}
    >
      {/* Navigation glass gradient overlay */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)']
            : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.7)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 28,
        }}
      />
      
      {children}
    </BlurView>
  );
};
