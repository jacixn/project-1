// Safe liquid glass wrapper for simulators/Expo Go
import React from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';

let LiquidGlassView, LiquidGlassContainerView, isLiquidGlassSupported;

// Try to import liquid glass, fallback if not available
try {
  const liquidGlass = require('@callstack/liquid-glass');
  LiquidGlassView = liquidGlass.LiquidGlassView;
  LiquidGlassContainerView = liquidGlass.LiquidGlassContainerView;
  isLiquidGlassSupported = liquidGlass.isLiquidGlassSupported;
} catch (error) {
  console.log('Liquid glass not available, using fallback components');
  
  // Fallback components
  LiquidGlassView = ({ children, style, tintColor, ...props }) => (
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

  LiquidGlassContainerView = ({ children, style, ...props }) => (
    <View style={style} {...props}>
      {children}
    </View>
  );

  isLiquidGlassSupported = false;
}

export { LiquidGlassView, LiquidGlassContainerView, isLiquidGlassSupported };
