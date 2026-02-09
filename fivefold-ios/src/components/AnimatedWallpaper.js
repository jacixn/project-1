import React, { useRef, useEffect, useMemo, useState } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Platform 
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Animated Wallpaper Component with Scroll Effects
// All scroll-driven animations use interpolation (runs on native thread)
// instead of JS-driven addListener + setValue (which causes lag on cold launch)
export const AnimatedWallpaper = ({ 
  children, 
  scrollY, 
  parallaxFactor = 0.5,
  blurOnScroll = true,
  fadeOnScroll = false,
  scaleOnScroll = false 
}) => {
  const { theme, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme, isBiblelyTheme, currentTheme, getCurrentWallpaper } = useTheme();

  // Floating animation for static elements (this stays JS-driven, it's not scroll-related)
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimation.start();

    return () => floatingAnimation.stop();
  }, []);

  // --- NATIVE-DRIVEN scroll animations via interpolation ---
  // These run entirely on the native UI thread, no JS bridge roundtrip.
  // This is what prevents lag/glitchiness, especially on cold launch.
  const fallbackAnim = useRef(new Animated.Value(0)).current;
  const activeScrollY = scrollY || fallbackAnim;

  // Parallax: moves wallpaper at a fraction of scroll speed
  const parallaxTranslate = useMemo(() => 
    activeScrollY.interpolate({
      inputRange: [-1000, 0, 1000],
      outputRange: [-1000 * parallaxFactor, 0, 1000 * parallaxFactor],
    }),
  [activeScrollY, parallaxFactor]);

  // Scale: wallpaper grows slightly as user scrolls (if enabled)
  const scaleTransform = useMemo(() => {
    if (!scaleOnScroll) return 1.2; // Static default
    return activeScrollY.interpolate({
      inputRange: [-1000, 0, 1000],
      outputRange: [1.4, 1.2, 1.4],
      extrapolate: 'clamp',
    });
  }, [activeScrollY, scaleOnScroll]);

  // Fade: wallpaper fades as user scrolls away from top (if enabled)
  const fadeTransform = useMemo(() => {
    if (!fadeOnScroll) return 1; // Static default
    return activeScrollY.interpolate({
      inputRange: [-500, 0, 500],
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });
  }, [activeScrollY, fadeOnScroll]);

  // Get wallpaper source based on theme
  const getWallpaperSource = () => {
    if (isBlushTheme) {
      // Load blush bloom wallpaper
      try {
        return require('../themes/blush-bloom/wallpaper1.jpg');
      } catch (error) {
        console.log('BlushBloom wallpaper image not found, using gradient background');
        return null;
      }
    }
    
    if (isCresviaTheme) {
      // Load cresvia wallpaper
      try {
        console.log('🌌 Loading Cresvia wallpaper...');
        return require('../themes/cresvia/wallpaper1.png');
      } catch (error) {
        console.log('❌ Cresvia wallpaper image not found, using gradient background:', error);
        return null;
      }
    }
    
    if (isEternaTheme) {
      // Load eterna wallpaper
      try {
        console.log('✨ Loading Eterna wallpaper...');
        return require('../themes/eterna/wallpaper1.jpg');
      } catch (error) {
        console.log('❌ Eterna wallpaper image not found, using gradient background:', error);
        return null;
      }
    }
    
    if (isSpidermanTheme) {
      // Load spiderman wallpaper
      try {
        console.log('🕷️ Loading Spiderman wallpaper...');
        return require('../themes/spiderman/wallpaper1.jpg');
      } catch (error) {
        console.log('❌ Spiderman wallpaper image not found, using gradient background:', error);
        return null;
      }
    }
    
    if (isFaithTheme) {
      // Load faith wallpaper
      try {
        console.log('✝️ Loading Faith wallpaper...');
        return require('../themes/faith/wallpaper1.jpg');
      } catch (error) {
        console.log('❌ Faith wallpaper image not found, using gradient background:', error);
        return null;
      }
    }
    
    if (isSailormoonTheme) {
      // Load sailormoon wallpaper
      try {
        console.log('🌙 Loading Sailor Moon wallpaper...');
        return require('../themes/sailormoon/wallpaper1.jpg');
      } catch (error) {
        console.log('❌ Sailor Moon wallpaper image not found, using gradient background:', error);
        return null;
      }
    }
    
    if (isBiblelyTheme) {
      // Load biblely wallpaper from context selection
      try {
        const wallpaper = getCurrentWallpaper ? getCurrentWallpaper() : null;
        console.log('🎨 Loading Biblely wallpaper:', wallpaper?.name || 'default');
        if (wallpaper?.source) {
          return wallpaper.source;
        }
        // Fallback to default wallpaper
        return require('../themes/biblely/wallpaper1.jpg');
      } catch (error) {
        console.log('❌ Biblely wallpaper image not found, using gradient background:', error);
        return null;
      }
    }
    
    return null;
  };

  const wallpaperSource = getWallpaperSource();

  // Start at partial opacity so the wallpaper is visible immediately on cold launch
  // (prevents the glitchy "blank then sudden appear" effect), then fade to full when loaded
  const wallpaperOpacity = useRef(new Animated.Value(0.5)).current;
  const onWallpaperLoad = () => {
    Animated.timing(wallpaperOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const floatingTransform = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const rotateTransform = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '2deg'],
  });

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      {(isBlushTheme || isCresviaTheme || isEternaTheme || isSpidermanTheme || isFaithTheme || isSailormoonTheme || isBiblelyTheme) && (
        <>
          {/* Gradient Background */}
          <Animated.View 
            style={[
              styles.gradientBackground,
              {
                backgroundColor: theme.background,
                opacity: fadeTransform,
                transform: [
                  { translateY: parallaxTranslate },
                  { scale: scaleTransform }
                ]
              }
            ]}
          />

          {/* Floating Particles Effect - More Subtle */}
          <View style={styles.particlesContainer}>
            {[...Array(6)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  {
                    left: `${(index * 16) + 8}%`,
                    top: `${25 + (index % 3) * 20}%`,
                    backgroundColor: theme.primary + '10', // More subtle
                    transform: [
                      { 
                        translateY: floatAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -8 - (index % 3) * 3], // Less movement
                        })
                      },
                      {
                        rotate: floatAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', `${(index % 2 ? 1 : -1) * 1.5}deg`], // Less rotation
                        })
                      }
                    ]
                  }
                ]}
              />
            ))}
          </View>

          {/* Animated Shapes */}
          <View style={styles.shapesContainer}>
            <Animated.View
              style={[
                styles.shape,
                styles.circle,
                {
                  backgroundColor: theme.primaryLight + '08', // More subtle
                  top: '15%',
                  right: '10%',
                  transform: [
                    { translateY: floatingTransform },
                    { rotate: rotateTransform },
                    { translateY: parallaxTranslate.interpolate({
                        inputRange: [0, 100],
                        outputRange: [0, -20],
                        extrapolate: 'clamp'
                      })
                    }
                  ]
                }
              ]}
            />
            
            <Animated.View
              style={[
                styles.shape,
                styles.square,
                {
                  backgroundColor: theme.primary + '05', // More subtle
                  bottom: '25%',
                  left: '15%',
                  transform: [
                    { 
                      translateY: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 8],
                      })
                    },
                    { 
                      rotate: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '-5deg'],
                      })
                    },
                    { translateY: parallaxTranslate.interpolate({
                        inputRange: [0, 100],
                        outputRange: [0, 15],
                        extrapolate: 'clamp'
                      })
                    }
                  ]
                }
              ]}
            />

            <Animated.View
              style={[
                styles.shape,
                styles.triangle,
                {
                  borderBottomColor: theme.primaryDark + '08', // More subtle
                  top: '60%',
                  right: '20%',
                  transform: [
                    { 
                      translateY: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -12],
                      })
                    },
                    { 
                      rotate: floatAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '8deg'],
                      })
                    }
                  ]
                }
              ]}
            />
          </View>

          {/* Wallpaper Image (if exists) */}
          {wallpaperSource && (
            <View style={styles.wallpaperContainer}>
              <Animated.Image
                source={wallpaperSource}
                style={[
                  styles.wallpaperImage,
                  {
                    opacity: typeof fadeTransform === 'number' 
                      ? wallpaperOpacity 
                      : Animated.multiply(fadeTransform, wallpaperOpacity),
                    transform: [
                      { translateY: parallaxTranslate },
                      { scale: scaleTransform }
                    ]
                  }
                ]}
                resizeMode="cover"
                blurRadius={Platform.OS === 'ios' ? 1 : 2}
                onLoad={onWallpaperLoad}
                fadeDuration={0} // Disable Android default fade — we handle it ourselves
              />
              
              {/* Additional blur overlay for iOS */}
              {Platform.OS === 'ios' && (
                <Animated.View 
                  style={[
                    styles.blurOverlay,
                    {
                      opacity: typeof fadeTransform === 'number' ? 0.6 : fadeTransform.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.6]
                      })
                    }
                  ]}
                />
              )}
            </View>
          )}

          {/* Overlay for better content readability */}
          <Animated.View 
            style={[
              styles.overlay,
              {
                backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? theme.background + '60' : 'transparent',
                opacity: fadeTransform
              }
            ]}
          />
        </>
      )}

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

// 🌸 Scroll-triggered Text Animation (inspired by reactbits.dev)
export const ScrollRevealText = ({ 
  children, 
  scrollY, 
  triggerPoint = 100,
  style,
  animationType = 'slideUp' // 'slideUp', 'fadeIn', 'scale', 'blur'
}) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (!scrollY) return;

    const listener = scrollY.addListener(({ value }) => {
      if (value > triggerPoint && !hasTriggered) {
        setHasTriggered(true);
        Animated.spring(animValue, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      } else if (value <= triggerPoint && hasTriggered) {
        setHasTriggered(false);
        Animated.spring(animValue, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => scrollY.removeListener(listener);
  }, [scrollY, triggerPoint, hasTriggered]);

  const getAnimatedStyle = () => {
    switch (animationType) {
      case 'slideUp':
        return {
          opacity: animValue,
          transform: [{
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            })
          }]
        };
      case 'fadeIn':
        return { opacity: animValue };
      case 'scale':
        return {
          opacity: animValue,
          transform: [{
            scale: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
            })
          }]
        };
      case 'blur':
        return {
          opacity: animValue,
          transform: [{
            scale: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [1.1, 1],
            })
          }]
        };
      default:
        return { opacity: animValue };
    }
  };

  return (
    <Animated.Text style={[style, getAnimatedStyle()]}>
      {children}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    top: -100,
    left: -50,
    right: -50,
    bottom: -100,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  shapesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  shape: {
    position: 'absolute',
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  square: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 25,
    borderRightWidth: 25,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  wallpaperContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  wallpaperImage: {
    position: 'absolute',
    top: -50, // Extend beyond screen bounds
    left: -50, // Extend beyond screen bounds
    right: -50, // Extend beyond screen bounds
    bottom: -50, // Extend beyond screen bounds
    width: screenWidth + 100, // Make wider to cover scroll areas
    height: screenHeight + 200, // Make taller to cover scroll areas
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});

export default AnimatedWallpaper;
