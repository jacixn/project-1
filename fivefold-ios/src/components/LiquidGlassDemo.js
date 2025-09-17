import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanGestureHandler,
  State,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  LiquidGlassView,
  LiquidGlassContainerView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LiquidGlassDemo = () => {
  const { theme, isDark } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === State.END) {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scale, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  if (!isLiquidGlassSupported) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>
          Liquid Glass not supported on this device
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        Advanced Liquid Glass Demo
      </Text>
      
      {/* Multiple morphing glass elements */}
      <LiquidGlassContainerView spacing={20} style={styles.containerView}>
        
        {/* Interactive draggable glass */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View
            style={[
              styles.draggableContainer,
              {
                transform: [
                  { translateX },
                  { translateY },
                  { scale },
                ],
              },
            ]}
          >
            <LiquidGlassView
              interactive={true}
              effect="regular"
              colorScheme="system"
              tintColor={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
              style={styles.draggableGlass}
            >
              <Text style={[styles.glassText, { color: theme.text }]}>
                Drag Me!
              </Text>
            </LiquidGlassView>
          </Animated.View>
        </PanGestureHandler>

        {/* Morphing glass buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          >
            <LiquidGlassView
              interactive={true}
              effect={isPressed ? "regular" : "clear"}
              colorScheme="system"
              tintColor={isPressed 
                ? (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)')
                : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)')
              }
              style={styles.morphButton}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>
                Press & Hold
              </Text>
            </LiquidGlassView>
          </TouchableOpacity>

          <LiquidGlassView
            interactive={true}
            effect="clear"
            colorScheme="system"
            style={styles.staticGlass}
          >
            <Text style={[styles.buttonText, { color: theme.text }]}>
              Static Glass
            </Text>
          </LiquidGlassView>
        </View>

        {/* Layered glass effects */}
        <LiquidGlassView
          interactive={false}
          effect="clear"
          colorScheme="system"
          style={styles.layeredContainer}
        >
          <LiquidGlassView
            interactive={true}
            effect="regular"
            colorScheme="system"
            tintColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}
            style={styles.innerGlass}
          >
            <Text style={[styles.layeredText, { color: theme.text }]}>
              Layered Glass Effect
            </Text>
          </LiquidGlassView>
        </LiquidGlassView>

      </LiquidGlassContainerView>

      <Text style={[styles.instructions, { color: theme.textSecondary }]}>
        • Drag the top element around{'\n'}
        • Press and hold the morphing button{'\n'}
        • Notice the glass merging effects{'\n'}
        • All elements respond to touch
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  containerView: {
    width: screenWidth * 0.9,
    alignItems: 'center',
  },
  draggableContainer: {
    marginBottom: 30,
  },
  draggableGlass: {
    width: 200,
    height: 100,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  glassText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  morphButton: {
    width: 140,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  staticGlass: {
    width: 140,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  layeredContainer: {
    width: '100%',
    height: 120,
    borderRadius: 30,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerGlass: {
    width: '80%',
    height: '70%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layeredText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 30,
    lineHeight: 20,
  },
});

export default LiquidGlassDemo;
