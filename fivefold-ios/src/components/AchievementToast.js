import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width } = Dimensions.get('window');

const AchievementToast = forwardRef((props, ref) => {
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState({ title: '', points: 0 });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    show: (title, points) => {
      setData({ title, points });
      setVisible(true);
      hapticFeedback.achievement();
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: Platform.OS === 'ios' ? 60 : 40,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();

      // Start shimmer
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();

      // Auto hide after 5 seconds
      setTimeout(() => {
        hide();
      }, 5000);
    }
  }));

  const hide = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start(() => setVisible(false));
  };

  if (!visible) return null;

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ] 
        }
      ]}
    >
      <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={styles.blur}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}80`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="emoji-events" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.unlockedText}>ACHIEVEMENT UNLOCKED!</Text>
              <Text style={styles.titleText}>{data.title}</Text>
              <View style={styles.pointsPill}>
                <MaterialIcons name="star" size={14} color={theme.primary} />
                <Text style={[styles.pointsText, { color: theme.primary }]}>
                  +{data.points.toLocaleString()} PTS
                </Text>
              </View>
            </View>
          </View>
          
          <Animated.View 
            style={[
              styles.shimmer, 
              { transform: [{ translateX }] }
            ]} 
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  blur: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    padding: 2,
    borderRadius: 24,
  },
  content: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  unlockedText: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  pointsPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
  },
});

export default AchievementToast;

