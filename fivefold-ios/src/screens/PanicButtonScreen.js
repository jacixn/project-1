import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { loadHabits } from '../services/habitsService';
import { hapticFeedback } from '../utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAMERA_SIZE = SCREEN_WIDTH * 0.65;

const QUOTES = [
  "Look at yourself. You're worth more than this moment.",
  "This feeling is temporary. Your progress is not.",
  "You didn't come this far to only come this far.",
  "The person staring back at you believes in you.",
  "Every urge you beat makes you unstoppable.",
  "Future you is counting on right now you.",
  "Breathe. You are in control.",
  "This is the moment that separates you from who you were.",
];

const CONSEQUENCES = [
  {
    icon: 'bolt',
    title: 'Your energy crashes',
    detail: 'Dopamine drops below baseline for 48-72 hours, leaving you drained and unmotivated.',
    color: '#F59E0B',
  },
  {
    icon: 'visibility-off',
    title: 'Your focus shatters',
    detail: 'Prefrontal cortex function weakens — decision-making, willpower, and concentration all suffer.',
    color: '#8B5CF6',
  },
  {
    icon: 'favorite-border',
    title: 'Your confidence drops',
    detail: "The shame spiral kicks in. You'll feel worse about yourself, not better.",
    color: '#EC4899',
  },
  {
    icon: 'timer-off',
    title: 'Days of progress — gone',
    detail: "Every single day you've fought gets erased. All that discipline, wasted in seconds.",
    color: '#EF4444',
  },
  {
    icon: 'nights-stay',
    title: 'Your sleep suffers',
    detail: 'Disrupted sleep patterns and restless nights follow. Your body pays the price.',
    color: '#3B82F6',
  },
];

const PanicButtonScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();

  const quoteFade = useRef(new Animated.Value(1)).current;
  const quoteSlide = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const borderRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadHabits().then(setHabits);
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(quoteFade, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(quoteSlide, { toValue: -10, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
        quoteSlide.setValue(10);
        Animated.parallel([
          Animated.timing(quoteFade, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(quoteSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        ]).start();
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(borderRotation, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);

  const spin = borderRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: 180 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>Stay Strong</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Live Camera Mirror */}
        <View style={styles.cameraSection}>
          <Animated.View style={[styles.cameraRing, { transform: [{ scale: pulseAnim }] }]}>
            <Animated.View style={[styles.rotatingBorder, { transform: [{ rotate: spin }] }]}>
              <LinearGradient
                colors={['#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBorder}
              />
            </Animated.View>
            <View style={styles.cameraInner}>
              {permission?.granted ? (
                <CameraView
                  style={styles.camera}
                  facing="front"
                  animateShutter={false}
                />
              ) : (
                <View style={[styles.camera, styles.cameraPlaceholder]}>
                  <MaterialIcons name="videocam" size={48} color="rgba(255,255,255,0.2)" />
                </View>
              )}
            </View>
          </Animated.View>

          {/* Quote overlay */}
          <View style={styles.quoteWrapper}>
            <Animated.Text
              style={[
                styles.quoteText,
                { opacity: quoteFade, transform: [{ translateY: quoteSlide }] },
              ]}
            >
              {QUOTES[quoteIndex]}
            </Animated.Text>
          </View>
        </View>

        {/* Consequences section */}
        <View style={styles.consequencesSection}>
          <Text style={styles.sectionLabel}>WHAT HAPPENS IF YOU GIVE IN</Text>
          {CONSEQUENCES.map((item, index) => (
            <View key={index} style={styles.consequenceCard}>
              <View style={[styles.consequenceIconBar, { backgroundColor: item.color }]} />
              <View style={[styles.consequenceIcon, { backgroundColor: item.color + '18' }]}>
                <MaterialIcons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.consequenceText}>
                <Text style={styles.consequenceTitle}>{item.title}</Text>
                <Text style={styles.consequenceDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fixed bottom buttons */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient
          colors={['transparent', '#0A0A0A']}
          style={styles.bottomFade}
          pointerEvents="none"
        />
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            hapticFeedback.medium();
            navigation.navigate('DistractionGames');
          }}
        >
          <LinearGradient
            colors={['#EF4444', '#B91C1C']}
            style={styles.primaryButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="shield" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Fight the Urge</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            hapticFeedback.light();
            navigation.navigate('Relapsed', { habits });
          }}
          style={styles.secondaryButton}
        >
          <MaterialIcons name="restart-alt" size={18} color="#6B7280" />
          <Text style={styles.secondaryButtonText}>I Relapsed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  /* Camera Mirror */
  cameraSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  cameraRing: {
    width: CAMERA_SIZE + 8,
    height: CAMERA_SIZE + 8,
    borderRadius: (CAMERA_SIZE + 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingBorder: {
    position: 'absolute',
    width: CAMERA_SIZE + 8,
    height: CAMERA_SIZE + 8,
    borderRadius: (CAMERA_SIZE + 8) / 2,
    overflow: 'hidden',
  },
  gradientBorder: {
    flex: 1,
    borderRadius: (CAMERA_SIZE + 8) / 2,
  },
  cameraInner: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: CAMERA_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  quoteWrapper: {
    marginTop: 20,
    paddingHorizontal: 16,
    minHeight: 50,
    justifyContent: 'center',
  },
  quoteText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },

  /* Consequences */
  consequencesSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
    marginBottom: 16,
  },
  consequenceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  consequenceIconBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  consequenceIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  consequenceText: {
    flex: 1,
  },
  consequenceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 4,
  },
  consequenceDetail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 19,
  },

  /* Fixed Bottom */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  bottomFade: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 40,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default PanicButtonScreen;
