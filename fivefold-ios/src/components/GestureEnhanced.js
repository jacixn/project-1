import React, { useRef, useState } from 'react';
import {
  View,
  Animated,
  PanGestureHandler,
  State,
  TapGestureHandler,
  LongPressGestureHandler,
  PinchGestureHandler,
} from 'react-native-gesture-handler';
import { Dimensions } from 'react-native';
import { hapticFeedback } from '../utils/haptics';
import { createDynamicSpring } from '../utils/animations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SwipeableCard = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  swipeThreshold = 100,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [isGestureActive, setIsGestureActive] = useState(false);

  const onPanGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = (event) => {
    const { state, translationX, translationY, velocityX, velocityY } = event.nativeEvent;

    if (state === State.BEGAN) {
      setIsGestureActive(true);
      hapticFeedback.gentle();
      
      Animated.spring(scale, {
        toValue: 0.98,
        ...createDynamicSpring(0, 0),
        useNativeDriver: true,
      }).start();
    }

    if (state === State.END) {
      setIsGestureActive(false);
      
      Animated.spring(scale, {
        toValue: 1,
        ...createDynamicSpring(0, 0),
        useNativeDriver: true,
      }).start();

      // Determine swipe direction and execute callback
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      if (absX > swipeThreshold || absY > swipeThreshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (translationX > 0 && onSwipeRight) {
            hapticFeedback.swipe();
            onSwipeRight();
          } else if (translationX < 0 && onSwipeLeft) {
            hapticFeedback.swipe();
            onSwipeLeft();
          }
        } else {
          // Vertical swipe
          if (translationY > 0 && onSwipeDown) {
            hapticFeedback.swipe();
            onSwipeDown();
          } else if (translationY < 0 && onSwipeUp) {
            hapticFeedback.swipe();
            onSwipeUp();
          }
        }
      }

      // Animate back to center
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          ...createDynamicSpring(velocityX, translationX),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          ...createDynamicSpring(velocityY, translationY),
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onPanGestureEvent}
      onHandlerStateChange={onPanHandlerStateChange}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

export const PressableWithFeedback = ({ 
  children, 
  onPress, 
  onLongPress,
  style,
  scaleDownValue = 0.96,
  hapticType = 'light',
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const onTapHandlerStateChange = (event) => {
    const { state } = event.nativeEvent;

    if (state === State.BEGAN) {
      hapticFeedback[hapticType]();
      
      Animated.parallel([
        Animated.spring(scale, {
          toValue: scaleDownValue,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (state === State.END) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      if (onPress) {
        setTimeout(onPress, 50);
      }
    }
  };

  const onLongPressHandlerStateChange = (event) => {
    const { state } = event.nativeEvent;

    if (state === State.ACTIVE) {
      hapticFeedback.longPressStart();
      
      Animated.spring(scale, {
        toValue: 0.92,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }).start();

      if (onLongPress) {
        onLongPress();
      }
    }

    if (state === State.END || state === State.CANCELLED) {
      hapticFeedback.longPressEnd();
      
      Animated.spring(scale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <LongPressGestureHandler
      onHandlerStateChange={onLongPressHandlerStateChange}
      minDurationMs={500}
    >
      <TapGestureHandler onHandlerStateChange={onTapHandlerStateChange}>
        <Animated.View
          style={[
            style,
            {
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          {children}
        </Animated.View>
      </TapGestureHandler>
    </LongPressGestureHandler>
  );
};

export const PinchToZoom = ({ 
  children, 
  minScale = 0.5, 
  maxScale = 3,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const baseScale = useRef(1);

  const onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true }
  );

  const onPinchHandlerStateChange = (event) => {
    const { state, scale: eventScale } = event.nativeEvent;

    if (state === State.BEGAN) {
      hapticFeedback.gentle();
    }

    if (state === State.END) {
      const newScale = Math.max(minScale, Math.min(maxScale, baseScale.current * eventScale));
      baseScale.current = newScale;

      Animated.spring(scale, {
        toValue: newScale,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <PinchGestureHandler
      onGestureEvent={onPinchGestureEvent}
      onHandlerStateChange={onPinchHandlerStateChange}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </PinchGestureHandler>
  );
};

export const DraggableItem = ({ 
  children, 
  onDragEnd,
  boundarySize = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const onPanGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = (event) => {
    const { state, translationX, translationY, absoluteX, absoluteY } = event.nativeEvent;

    if (state === State.BEGAN) {
      hapticFeedback.gentle();
      
      Animated.spring(scale, {
        toValue: 1.05,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }

    if (state === State.END) {
      Animated.spring(scale, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Constrain to boundaries
      const constrainedX = Math.max(0, Math.min(boundarySize.width, absoluteX));
      const constrainedY = Math.max(0, Math.min(boundarySize.height, absoluteY));

      if (onDragEnd) {
        onDragEnd({ x: constrainedX, y: constrainedY });
      }

      // Animate to constrained position
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onPanGestureEvent}
      onHandlerStateChange={onPanHandlerStateChange}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

export const PullToRefresh = ({ 
  children, 
  onRefresh, 
  refreshThreshold = 100,
  style,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onPanHandlerStateChange = (event) => {
    const { state, translationY, velocityY } = event.nativeEvent;

    if (state === State.BEGAN) {
      hapticFeedback.gentle();
    }

    if (state === State.END) {
      if (translationY > refreshThreshold && !isRefreshing) {
        setIsRefreshing(true);
        hapticFeedback.success();
        
        if (onRefresh) {
          onRefresh().then(() => {
            setIsRefreshing(false);
            Animated.spring(translateY, {
              toValue: 0,
              tension: 120,
              friction: 8,
              useNativeDriver: true,
            }).start();
          });
        }
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          ...createDynamicSpring(velocityY, translationY),
          useNativeDriver: true,
        }).start();
      }
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onPanGestureEvent}
      onHandlerStateChange={onPanHandlerStateChange}
      activeOffsetY={[-10, 10]}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </PanGestureHandler>
  );
};

export const DoubleTapToLike = ({ 
  children, 
  onDoubleTap, 
  onSingleTap,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const onDoubleTapEvent = () => {
    hapticFeedback.doubleTap();
    
    // Scale animation
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Heart animation
    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1.2,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(heartOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.spring(heartScale, {
          toValue: 0,
          tension: 200,
          friction: 8,
          delay: 300,
          useNativeDriver: true,
        }),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 200,
          delay: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });

    if (onDoubleTap) {
      onDoubleTap();
    }
  };

  const onSingleTapEvent = () => {
    hapticFeedback.light();
    
    if (onSingleTap) {
      onSingleTap();
    }
  };

  return (
    <TapGestureHandler onActivated={onSingleTapEvent} waitFor="doubleTap">
      <TapGestureHandler 
        id="doubleTap"
        onActivated={onDoubleTapEvent}
        numberOfTaps={2}
      >
        <Animated.View
          style={[
            style,
            {
              transform: [{ scale }],
            },
          ]}
        >
          {children}
          
          {/* Floating Heart */}
          <Animated.View
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: [
                { translateX: -15 },
                { translateY: -15 },
                { scale: heartScale },
              ],
              opacity: heartOpacity,
              zIndex: 1000,
            }}
            pointerEvents="none"
          >
            {/* Heart emoji or icon */}
            <View
              style={{
                width: 30,
                height: 30,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 0, 0, 0.8)',
                borderRadius: 15,
              }}
            >
              <Text style={{ fontSize: 16, color: 'white' }}>❤️</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </TapGestureHandler>
    </TapGestureHandler>
  );
};

export default {
  SwipeableCard,
  PressableWithFeedback,
  PinchToZoom,
  DraggableItem,
  PullToRefresh,
  DoubleTapToLike,
};
