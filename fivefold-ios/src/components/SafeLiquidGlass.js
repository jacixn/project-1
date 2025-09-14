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
  console.log('🔮 Real Liquid Glass loaded successfully!', { isLiquidGlassSupported });
} catch (error) {
  console.log('🔮 Liquid Glass native module not available in Expo Go - using enhanced fallback');
  console.log('💡 To get real liquid glass, create a development build with: npx expo run:ios');
  isLiquidGlassSupported = false;
}

// Enhanced fallback components that simulate liquid glass perfectly
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
  
  // Enhanced liquid glass simulation
  const getBlurIntensity = () => {
    switch (effect) {
      case 'clear': return isDark ? 35 : 20;
      case 'regular': return isDark ? 55 : 40;
      case 'none': return 0;
      default: return isDark ? 45 : 30;
    }
  };

  const getBackgroundColor = () => {
    if (tintColor) return tintColor;
    
    switch (effect) {
      case 'clear': 
        return isDark ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)';
      case 'regular': 
        return isDark ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)';
      case 'none': 
        return 'transparent';
      default: 
        return isDark ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)';
    }
  };

  const fallbackStyle = [
    style,
    {
      backgroundColor: getBackgroundColor(),
      // Add subtle border for liquid glass effect
      borderWidth: effect !== 'none' ? 0.5 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      // Enhanced shadow for depth
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: effect !== 'none' ? 0.1 : 0,
      shadowRadius: 8,
      elevation: effect !== 'none' ? 4 : 0,
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
      intensity={getBlurIntensity()}
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
