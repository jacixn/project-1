import React from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';

// Safe wrapper for liquid glass that handles native module errors
let LiquidGlassView = null;
let LiquidGlassContainerView = null;
let isLiquidGlassSupported = false;

try {
  const liquidGlass = require('@callstack/liquid-glass');
  LiquidGlassView = liquidGlass.LiquidGlassView;
  LiquidGlassContainerView = liquidGlass.LiquidGlassContainerView;
  isLiquidGlassSupported = liquidGlass.isLiquidGlassSupported;
} catch (error) {
  console.log('Liquid Glass not available, using fallback');
  isLiquidGlassSupported = false;
}

// Enhanced fallback components
const FallbackLiquidGlassView = ({ 
  children, 
  style, 
  interactive, 
  effect, 
  tintColor, 
  colorScheme,
  ...props 
}) => {
  const isDark = colorScheme === 'dark';
  
  const fallbackStyle = [
    style,
    {
      backgroundColor: tintColor || (
        effect === 'clear' 
          ? (isDark ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)')
          : (isDark ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)')
      ),
    },
  ];

  if (effect === 'none') {
    return (
      <View style={fallbackStyle} {...props}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={effect === 'clear' ? (isDark ? 40 : 25) : (isDark ? 60 : 45)}
      style={fallbackStyle}
      {...props}
    >
      {children}
    </BlurView>
  );
};

const FallbackLiquidGlassContainerView = ({ children, spacing, style, ...props }) => {
  return (
    <View style={[{ gap: spacing }, style]} {...props}>
      {children}
    </View>
  );
};

// Export safe components
export const SafeLiquidGlassView = LiquidGlassView || FallbackLiquidGlassView;
export const SafeLiquidGlassContainerView = LiquidGlassContainerView || FallbackLiquidGlassContainerView;
export const safeIsLiquidGlassSupported = isLiquidGlassSupported;

export default {
  LiquidGlassView: SafeLiquidGlassView,
  LiquidGlassContainerView: SafeLiquidGlassContainerView,
  isLiquidGlassSupported: safeIsLiquidGlassSupported,
};
