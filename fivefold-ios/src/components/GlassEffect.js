import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';

export const GlassCard = ({ 
  children, 
  style,
  intensity = 60, // High blur as requested
  tint = 'default',
  borderRadius = 16,
  shadow = true,
  blushMode = false, // New prop for Blush Bloom theme
}) => {
  const { theme, isDark } = useTheme();
  
  // Check if we're using Blush Bloom theme
  const isBlushTheme = theme.name === 'Blush Bloom' || blushMode;
  
  const glassStyle = {
    borderRadius,
    overflow: 'hidden',
    backgroundColor: isBlushTheme 
      ? 'rgba(255, 255, 255, 0.38)' // Blush: 38% opacity as requested
      : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)'),
    borderWidth: 1,
    borderColor: isBlushTheme
      ? 'rgba(244, 114, 182, 0.2)' // Blush: Pink border
      : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)'),
    ...(shadow && {
      shadowColor: isBlushTheme ? '#F472B6' : '#000', // Blush: Pink glow
      shadowOffset: {
        width: 0,
        height: isBlushTheme ? 4 : 8,
      },
      shadowOpacity: isBlushTheme ? 0.3 : (isDark ? 0.3 : 0.15),
      shadowRadius: isBlushTheme ? 15 : 16,
      elevation: isBlushTheme ? 8 : 8,
    }),
  };

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={tint === 'default' ? (isDark ? 'dark' : 'light') : tint}
        style={[glassStyle, style]}
      >
        <View style={styles.glassContent}>
          {children}
        </View>
      </BlurView>
    );
  }

  // Fallback for Android
  return (
    <View style={[glassStyle, style]}>
      <View style={styles.glassContent}>
        {children}
      </View>
    </View>
  );
};

export const GlassHeader = ({ 
  children, 
  style,
  intensity = 30,
  absolute = true,
}) => {
  const { isDark, theme } = useTheme();
  
  const headerStyle = {
    backgroundColor: isDark ? 'rgba(17, 24, 39, 0.65)' : 'rgba(255, 255, 255, 0.65)', // MORE TRANSPARENT: 65% opacity
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)', // Subtle border line
    ...(absolute && {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    }),
  };

  const liquidGlassHeaderStyle = {
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)', // Subtle border line
    ...(absolute && {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    }),
  };

  // Use liquid glass if supported, otherwise fallback to BlurView
  if (Platform.OS === 'ios' && isLiquidGlassSupported) {
    return (
      <LiquidGlassView
        interactive={false}
        effect="clear"
        colorScheme="system"
        tintColor="rgba(255, 255, 255, 0.08)"
        style={[liquidGlassHeaderStyle, style]}
      >
        {children}
      </LiquidGlassView>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[headerStyle, style]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[headerStyle, style]}>
      {children}
    </View>
  );
};

export const GlassModal = ({ 
  children, 
  style,
  intensity = 40,
  overlay = true,
}) => {
  const { isDark } = useTheme();
  
  const modalStyle = {
    flex: 1,
    backgroundColor: overlay ? (isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)') : 'transparent',
  };

  return (
    <View style={[modalStyle, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={intensity}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        >
          {children}
        </BlurView>
      ) : (
        <View style={StyleSheet.absoluteFill}>
          {children}
        </View>
      )}
    </View>
  );
};

export const FloatingGlass = ({ 
  children, 
  style,
  intensity = 25,
  floating = true,
}) => {
  const { isDark } = useTheme();
  
  const floatingStyle = {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)',
    ...(floating && {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 12,
      },
      shadowOpacity: isDark ? 0.4 : 0.2,
      shadowRadius: 20,
      elevation: 12,
    }),
  };

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[floatingStyle, style]}
      >
        <View style={styles.floatingContent}>
          {children}
        </View>
      </BlurView>
    );
  }

  return (
    <View style={[floatingStyle, style]}>
      <View style={styles.floatingContent}>
        {children}
      </View>
    </View>
  );
};

export const GlassButton = ({ 
  children, 
  onPress,
  style,
  intensity = 15,
  active = false,
}) => {
  const { theme, isDark } = useTheme();
  
  const buttonStyle = {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: active 
      ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)')
      : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)'),
    borderWidth: 1,
    borderColor: active
      ? theme.primary + '40'
      : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'),
  };

  const TouchableComponent = require('react-native').TouchableOpacity;

  if (Platform.OS === 'ios') {
    return (
      <TouchableComponent onPress={onPress} activeOpacity={0.8} style={[buttonStyle, style]}>
        <BlurView
          intensity={intensity}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.buttonContent}>
          {children}
        </View>
      </TouchableComponent>
    );
  }

  return (
    <TouchableComponent onPress={onPress} activeOpacity={0.8} style={[buttonStyle, style]}>
      <View style={styles.buttonContent}>
        {children}
      </View>
    </TouchableComponent>
  );
};

const styles = StyleSheet.create({
  glassContent: {
    flex: 1,
    padding: 16,
  },
  floatingContent: {
    flex: 1,
    padding: 20,
  },
  buttonContent: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GlassCard;
