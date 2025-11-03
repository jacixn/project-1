// Safe liquid glass wrapper for simulators/Expo Go
import React from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';

let LiquidGlassViewNative, LiquidGlassContainerViewNative, isLiquidGlassSupportedNative;

// Initialize global preference
if (typeof global.liquidGlassUserPreference === 'undefined') {
  global.liquidGlassUserPreference = true; // Default to enabled
}

// Try to import liquid glass, fallback if not available
try {
  const liquidGlass = require('@callstack/liquid-glass');
  LiquidGlassViewNative = liquidGlass.LiquidGlassView;
  LiquidGlassContainerViewNative = liquidGlass.LiquidGlassContainerView;
  isLiquidGlassSupportedNative = liquidGlass.isLiquidGlassSupported;
} catch (error) {
  console.log('Liquid glass not available, using fallback components');
  isLiquidGlassSupportedNative = false;
}

// Fallback components
const FallbackLiquidGlassView = ({ children, style, tintColor, ...props }) => (
  <BlurView
    intensity={20}
    tint="default"
    style={[
      style,
      {
        backgroundColor: tintColor || 'rgba(255, 255, 255, 0.1)',
      }
    ]}
    {...props}
  >
    {children}
  </BlurView>
);

const FallbackLiquidGlassContainerView = ({ children, style, ...props }) => (
  <View style={style} {...props}>
    {children}
  </View>
);

// Wrapper components that respect user preference
const LiquidGlassView = (props) => {
  // If device doesn't support it OR user disabled it, use fallback
  if (!isLiquidGlassSupportedNative || !global.liquidGlassUserPreference) {
    return <FallbackLiquidGlassView {...props} />;
  }
  return <LiquidGlassViewNative {...props} />;
};

const LiquidGlassContainerView = (props) => {
  // If device doesn't support it OR user disabled it, use fallback
  if (!isLiquidGlassSupportedNative || !global.liquidGlassUserPreference) {
    return <FallbackLiquidGlassContainerView {...props} />;
  }
  return <LiquidGlassContainerViewNative {...props} />;
};

// This now checks both device support AND user preference
const isLiquidGlassSupported = isLiquidGlassSupportedNative && global.liquidGlassUserPreference;

// Export both native support (for UI decisions) and combined support (for rendering)
export { 
  LiquidGlassView, 
  LiquidGlassContainerView, 
  isLiquidGlassSupported,
  isLiquidGlassSupportedNative as isLiquidGlassSupportedByDevice
};
