/**
 * BodyCompositionScreen
 *
 * Premium body composition dashboard with staggered entrance animations,
 * animated SVG rings, and an expandable metric grid.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import nutritionService from '../services/nutritionService';
import bodyCompositionService from '../services/bodyCompositionService';
import WorkoutService from '../services/workoutService';
import FitnessDisclaimer from '../components/FitnessDisclaimer';
import ScaleConnectionModal from '../components/ScaleConnectionModal';
import scaleService from '../services/scaleService';

const { width: SW, height: SH } = Dimensions.get('window');

const BodyCompositionScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [bodyComp, setBodyComp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [infoPopup, setInfoPopup] = useState(null); // { title, explanation, example, icon, color }
  const infoFade = useRef(new Animated.Value(0)).current;
  const infoScale = useRef(new Animated.Value(0.85)).current;

  // Smart Scale
  const [scaleModalVisible, setScaleModalVisible] = useState(false);
  const [lastScaleReading, setLastScaleReading] = useState(null);
  const [savedScaleDevice, setSavedScaleDevice] = useState(null);
  const scaleCardScale = useRef(new Animated.Value(0)).current;
  const scaleCardOpacity = useRef(new Animated.Value(0)).current;

  // ── Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.6)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const ringProgress = useRef(new Animated.Value(0)).current;
  const quickGridAnims = useRef([0, 1, 2, 3].map(() => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(30),
  }))).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const metricsOpacity = useRef(new Animated.Value(0)).current;
  const metricsSlide = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const textPrimary = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondary = isDark ? 'rgba(255,255,255,0.7)' : '#555';
  const textTertiary = isDark ? 'rgba(255,255,255,0.45)' : '#999';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadScaleData();
    }, [])
  );

  const loadScaleData = async () => {
    const [reading, device] = await Promise.all([
      scaleService.getLastReading(),
      scaleService.getSavedDevice(),
    ]);
    setLastScaleReading(reading);
    setSavedScaleDevice(device);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleCardScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(scaleCardOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 800);
  };

  const handleScaleReadingSaved = (reading) => {
    setLastScaleReading(reading);
    loadData();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const profile = await nutritionService.getProfile();
      if (profile && profile.weightKg && profile.heightCm) {
        let recentWorkoutCount = null;
        try {
          const history = await WorkoutService.getWorkoutHistory();
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          recentWorkoutCount = (history || []).filter(
            w => new Date(w.completedAt || w.date).getTime() > thirtyDaysAgo
          ).length;
        } catch (_) {}
        const data = bodyCompositionService.calculate(profile, { recentWorkoutCount });
        setBodyComp(data);
      }
      setLoading(false);
      runEntranceAnimations();
    } catch (e) {
      setLoading(false);
    }
  };

  const runEntranceAnimations = () => {
    // 1. Fade in background
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // 2. Hero score entrance
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(heroScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(heroOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 150);

    // 3. Ring progress animation
    setTimeout(() => {
      Animated.timing(ringProgress, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
    }, 400);

    // 4. Pulse loop on score
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // 5. Quick grid items stagger
    quickGridAnims.forEach((anim, i) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(anim.scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
          Animated.timing(anim.opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(anim.translateY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        ]).start();
      }, 500 + i * 120);
    });

    // 6. Bar width animation
    setTimeout(() => {
      Animated.timing(barWidth, { toValue: 1, duration: 800, useNativeDriver: false }).start();
    }, 900);

    // 7. Metrics section
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(metricsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(metricsSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    }, 1100);
  };

  // ── Metric Explanations (simple, human language) ──
  const metricExplanations = {
    'Health Score': {
      explanation: 'An overall rating of your body health on a scale of 0–100. It combines your BMI, body fat, muscle mass, and other metrics into one easy number.',
      example: 'Think of it like a grade for your body. 80+ is an A, 60–79 is a B, and below 60 means there\'s room to improve.',
      icon: 'favorite',
      color: '#10B981',
      source: { label: 'WHO — Obesity & Overweight', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
    },
    'Body Age': {
      explanation: 'How old your body "acts" based on your fitness level, not your actual birthday. If you\'re fit, your body age could be lower than your real age.',
      example: 'If you\'re 30 years old but very active with good muscle mass, your body age might be 25. If you\'re sedentary with high body fat, it could be 35.',
      icon: 'favorite',
      color: '#3B82F6',
      source: { label: 'Mayo Clinic — Fitness Assessment', url: 'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/fitness/art-20046433' },
    },
    'BMI': {
      explanation: 'Body Mass Index — a simple number calculated from your height and weight. It gives a rough idea of whether you\'re underweight, normal, overweight, or obese.',
      example: 'BMI under 18.5 = Underweight. 18.5–24.9 = Normal. 25–29.9 = Overweight. 30+ = Obese. For example, someone 170 cm and 70 kg has a BMI of 24.2 (Normal).',
      icon: 'speed',
      color: '#6366F1',
      source: { label: 'WHO — BMI Classification', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
    },
    'Water Goal': {
      explanation: 'How much water you should drink daily based on your weight and activity level. Staying hydrated helps your energy, skin, digestion, and brain function.',
      example: 'If your goal is 1.9 L/day, that\'s about 8 glasses of water. Try carrying a water bottle and sipping throughout the day.',
      icon: 'opacity',
      color: '#3B82F6',
      source: { label: 'Mayo Clinic — Water & Hydration', url: 'https://www.mayoclinic.org/healthy-lifestyle/nutrition-and-healthy-eating/in-depth/water/art-20044256' },
    },
    'Ideal Weight': {
      explanation: 'The healthy weight range for someone your height. Being within this range is associated with lower risk of health problems.',
      example: 'If your range is 61–76 kg and you\'re at 74 kg, you\'re right in the healthy zone. It\'s a range because bodies are different — muscle, bone density, etc.',
      icon: 'track-changes',
      color: '#10B981',
      source: { label: 'WHO — BMI Classification', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
    },
    'Weight': {
      explanation: 'Your total body weight. On its own it doesn\'t tell the full story — what matters is the breakdown between muscle, fat, water, and bone.',
      example: 'Two people can both weigh 80 kg but look completely different. One might have 20% body fat (muscular), the other 35% (higher fat). That\'s why we look at the other metrics too.',
      icon: 'monitor-weight',
      color: '#6366F1',
      source: { label: 'WHO — Obesity & Overweight', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
    },
    'Body Fat': {
      explanation: 'The percentage of your body that is fat. Some fat is essential (organs, hormones), but too much increases health risks.',
      example: 'For men: 10–20% is athletic to fit, 20–25% is average, 25%+ is above average. For women: 18–28% is fit to average, 28%+ is above average.',
      icon: 'pie-chart',
      color: '#F59E0B',
      source: { label: 'Harvard Health — Abdominal Fat', url: 'https://www.health.harvard.edu/staying-healthy/abdominal-fat-and-what-to-do-about-it' },
    },
    'Muscle Rate': {
      explanation: 'Your skeletal muscle as a percentage of body weight. These are the muscles you control — biceps, quads, abs, etc. Higher means a faster metabolism and stronger body.',
      example: 'For men: 33–39% is normal, 40%+ is high/athletic. For women: 24–30% is normal, 31%+ is high. Strength training is the best way to increase it.',
      icon: 'fitness-center',
      color: '#10B981',
      source: { label: 'PubMed — Janssen et al. (2000)', url: 'https://pubmed.ncbi.nlm.nih.gov/11071523/' },
    },
    'BMR': {
      explanation: 'Basal Metabolic Rate — the number of calories your body burns just to stay alive (breathing, heartbeat, brain function) even if you lie in bed all day.',
      example: 'If your BMR is 1,719 kcal, that means you burn 1,719 calories doing absolutely nothing. Add exercise and daily activities on top of that for your total burn.',
      icon: 'local-fire-department',
      color: '#F97316',
      source: { label: 'PubMed — Mifflin-St Jeor (1990)', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
    },
    'Fat-free Weight': {
      explanation: 'Everything in your body that isn\'t fat — muscles, bones, organs, water. Also called "lean body mass." Higher is generally better.',
      example: 'If you weigh 74 kg and have 40% body fat, your fat-free weight is about 44 kg (the non-fat part).',
      icon: 'accessibility-new',
      color: '#10B981',
      source: { label: 'PubMed — Janssen et al. (2000)', url: 'https://pubmed.ncbi.nlm.nih.gov/11071523/' },
    },
    'Muscle Mass': {
      explanation: 'The actual weight of your muscles in kilograms. Building muscle improves strength, metabolism, and appearance.',
      example: 'Average muscle mass for men is 33–40 kg, and for women 20–28 kg. Strength training is the best way to increase it.',
      icon: 'grain',
      color: '#8B5CF6',
      source: { label: 'PubMed — Janssen et al. (2000)', url: 'https://pubmed.ncbi.nlm.nih.gov/11071523/' },
    },
    'Skeletal Muscle': {
      explanation: 'The muscles attached to your skeleton that you can voluntarily control — like your biceps, quads, and abs. These are the muscles you build in the gym.',
      example: 'Healthy range is 33–39% for men and 24–33% for women. Higher skeletal muscle % usually means you\'re more fit and athletic.',
      icon: 'directions-run',
      color: '#06B6D4',
      source: { label: 'PubMed — Janssen et al. (2000)', url: 'https://pubmed.ncbi.nlm.nih.gov/11071523/' },
    },
    'Subcutaneous Fat': {
      explanation: 'The fat stored just under your skin. It\'s the fat you can see and pinch. It carries fewer health concerns than visceral fat but affects your appearance.',
      example: 'When people say they want to "lose belly fat," they mostly mean subcutaneous fat. It decreases with a calorie deficit and exercise.',
      icon: 'spa',
      color: '#F59E0B',
      source: { label: 'Harvard Health — Abdominal Fat', url: 'https://www.health.harvard.edu/staying-healthy/abdominal-fat-and-what-to-do-about-it' },
    },
    'Visceral Fat': {
      explanation: 'The hidden fat stored deep inside, around your organs (liver, stomach, intestines). High levels may be associated with increased health risks. Consult a healthcare professional for personalised guidance.',
      example: 'A rating of 1–12 is healthy. 13–59 is too high. Even slim people can have high visceral fat if they don\'t exercise. It responds well to cardio exercise.',
      icon: 'whatshot',
      color: '#EF4444',
      source: { label: 'Harvard Health — Visceral Fat', url: 'https://www.health.harvard.edu/staying-healthy/abdominal-fat-and-what-to-do-about-it' },
    },
    'Bone Mass': {
      explanation: 'The total weight of the bones in your body. Healthy bones are dense and strong. Exercise and calcium help maintain bone mass.',
      example: 'Average bone mass is about 2.5–3.5 kg for men and 2.0–3.0 kg for women. Weight-bearing exercises like running and lifting help keep bones strong.',
      icon: 'straighten',
      color: '#78716C',
      source: { label: 'NIH — Bone Health', url: 'https://www.niams.nih.gov/health-topics/bone-health' },
    },
    'Protein': {
      explanation: 'The percentage of your body made up of protein. Your muscles, organs, skin, and hair are all built from protein. It\'s a sign of good muscle health.',
      example: 'A healthy protein percentage is 16–20%. If it\'s low, it could mean you\'re losing muscle mass. Eating enough protein (meat, fish, eggs, beans) helps.',
      icon: 'science',
      color: '#EC4899',
      source: { label: 'Harvard — The Nutrition Source', url: 'https://www.hsph.harvard.edu/nutritionsource/what-should-you-eat/protein/' },
    },
    'TDEE': {
      explanation: 'Total Daily Energy Expenditure — the total calories you burn in a day including exercise, walking, and daily activities. This is the number you need to know for weight management.',
      example: 'If your TDEE is 2,200 kcal: eat less than 2,200 to lose weight, eat 2,200 to maintain, eat more to gain weight. It\'s that simple.',
      icon: 'bolt',
      color: '#F97316',
      source: { label: 'PubMed — Mifflin-St Jeor (1990)', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
    },
    'Body Breakdown': {
      explanation: 'A visual split of what your body is made of — muscle, fat, water, and bone. A healthy body has more muscle and water than fat.',
      example: 'Imagine your body as a pie chart. Ideally, the biggest slice should be muscle and water, not fat. The bar shows your current split at a glance.',
      icon: 'donut-large',
      color: '#6366F1',
      source: { label: 'WHO — Body Composition', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight' },
    },
  };

  const showInfo = (metricName, semanticColor) => {
    const info = metricExplanations[metricName];
    if (!info) return;
    const rangeData = typeof getMetricRangeData === 'function' ? getMetricRangeData(metricName) : null;
    infoFade.setValue(0);
    infoScale.setValue(0.85);
    setInfoPopup({ title: metricName, ...info, ...(semanticColor ? { color: semanticColor } : {}), rangeData });
    Animated.parallel([
      Animated.timing(infoFade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(infoScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const hideInfo = () => {
    Animated.parallel([
      Animated.timing(infoFade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(infoScale, { toValue: 0.85, duration: 180, useNativeDriver: true }),
    ]).start(() => setInfoPopup(null));
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <MaterialIcons name="monitor-weight" size={48} color={theme.primary} />
          <Text style={[styles.loadingText, { color: textSecondary, marginTop: 12 }]}>Loading your body data...</Text>
        </Animated.View>
      </View>
    );
  }

  if (!bodyComp) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8, left: 16, position: 'absolute', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios-new" size={20} color={textPrimary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', paddingHorizontal: 40 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: `${theme.primary}14`, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <MaterialIcons name="monitor-weight" size={36} color={theme.primary} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: textPrimary, marginBottom: 8 }}>No Profile Yet</Text>
          <Text style={{ fontSize: 14, color: textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
            Set up your body profile in the Fuel section to see your full body composition breakdown.
          </Text>
          <TouchableOpacity
            style={{ paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, backgroundColor: theme.primary }}
            onPress={() => { navigation.goBack(); navigation.navigate('Nutrition'); }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Go to Fuel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const SEMANTIC = { bad: '#EF4444', average: '#F59E0B', good: '#10B981', excellent: '#3B82F6' };

  const getSemanticColor = (name) => {
    const m = bodyComp;
    const male = m.isMale;
    switch (name) {
      case 'Weight': {
        const mid = (m.idealWeightLow + m.idealWeightHigh) / 2;
        const half = (m.idealWeightHigh - m.idealWeightLow) / 2;
        const diff = Math.abs(m.weight - mid);
        if (diff <= half) return SEMANTIC.excellent;
        if (diff <= half + 5) return SEMANTIC.good;
        if (diff <= half + 12) return SEMANTIC.average;
        return SEMANTIC.bad;
      }
      case 'Body Fat':
        if (male) {
          if (m.bodyFat < 6) return SEMANTIC.average;
          if (m.bodyFat < 14) return SEMANTIC.excellent;
          if (m.bodyFat < 18) return SEMANTIC.good;
          if (m.bodyFat < 25) return SEMANTIC.average;
          return SEMANTIC.bad;
        }
        if (m.bodyFat < 14) return SEMANTIC.average;
        if (m.bodyFat < 21) return SEMANTIC.excellent;
        if (m.bodyFat < 25) return SEMANTIC.good;
        if (m.bodyFat < 32) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'Muscle Rate':
        if (male) {
          if (m.muscleRate >= 44) return SEMANTIC.excellent;
          if (m.muscleRate >= 40) return SEMANTIC.good;
          if (m.muscleRate >= 33) return SEMANTIC.average;
          return SEMANTIC.bad;
        }
        if (m.muscleRate >= 36) return SEMANTIC.excellent;
        if (m.muscleRate >= 31) return SEMANTIC.good;
        if (m.muscleRate >= 24) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'BMR':
        if (male) {
          if (m.bmr >= 1800) return SEMANTIC.excellent;
          if (m.bmr >= 1600) return SEMANTIC.good;
          if (m.bmr >= 1400) return SEMANTIC.average;
          return SEMANTIC.bad;
        }
        if (m.bmr >= 1500) return SEMANTIC.excellent;
        if (m.bmr >= 1300) return SEMANTIC.good;
        if (m.bmr >= 1100) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'Fat-free Weight': {
        const pct = (m.fatFreeWeight / m.weight) * 100;
        if (male) {
          if (pct >= 85) return SEMANTIC.excellent;
          if (pct >= 80) return SEMANTIC.good;
          if (pct >= 75) return SEMANTIC.average;
          return SEMANTIC.bad;
        }
        if (pct >= 78) return SEMANTIC.excellent;
        if (pct >= 72) return SEMANTIC.good;
        if (pct >= 65) return SEMANTIC.average;
        return SEMANTIC.bad;
      }
      case 'Muscle Mass':
        if (male) {
          if (m.muscleMass >= 40) return SEMANTIC.excellent;
          if (m.muscleMass >= 35) return SEMANTIC.good;
          if (m.muscleMass >= 30) return SEMANTIC.average;
          return SEMANTIC.bad;
        }
        if (m.muscleMass >= 28) return SEMANTIC.excellent;
        if (m.muscleMass >= 24) return SEMANTIC.good;
        if (m.muscleMass >= 18) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'Subcutaneous Fat':
        if (male) {
          if (m.subcutaneousFat < 10) return SEMANTIC.excellent;
          if (m.subcutaneousFat < 15) return SEMANTIC.good;
          if (m.subcutaneousFat < 20) return SEMANTIC.average;
          return SEMANTIC.bad;
        }
        if (m.subcutaneousFat < 15) return SEMANTIC.excellent;
        if (m.subcutaneousFat < 20) return SEMANTIC.good;
        if (m.subcutaneousFat < 27) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'Visceral Fat':
        if (m.visceralFat <= 5) return SEMANTIC.excellent;
        if (m.visceralFat <= 9) return SEMANTIC.good;
        if (m.visceralFat <= 14) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'Bone Mass':
        if (male) {
          if (m.boneMass >= 3.5) return SEMANTIC.excellent;
          if (m.boneMass >= 3.0) return SEMANTIC.good;
          if (m.boneMass >= 2.5) return SEMANTIC.average;
          return SEMANTIC.bad;
        }
        if (m.boneMass >= 3.0) return SEMANTIC.excellent;
        if (m.boneMass >= 2.5) return SEMANTIC.good;
        if (m.boneMass >= 2.0) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'Protein':
        if (m.protein >= 18) return SEMANTIC.excellent;
        if (m.protein >= 16) return SEMANTIC.good;
        if (m.protein >= 14) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'Body Age': {
        const diff = m.bodyAge - m.age;
        if (diff <= -5) return SEMANTIC.excellent;
        if (diff <= 0) return SEMANTIC.good;
        if (diff <= 3) return SEMANTIC.average;
        return SEMANTIC.bad;
      }
      case 'TDEE':
        if (male) {
          if (m.tdee >= 2800) return SEMANTIC.excellent;
          if (m.tdee >= 2400) return SEMANTIC.good;
          if (m.tdee >= 2000) return SEMANTIC.average;
          return SEMANTIC.bad;
        }
        if (m.tdee >= 2300) return SEMANTIC.excellent;
        if (m.tdee >= 1900) return SEMANTIC.good;
        if (m.tdee >= 1600) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'BMI':
        if (m.bmi < 18.5) return SEMANTIC.average;
        if (m.bmi < 25) return SEMANTIC.good;
        if (m.bmi < 30) return SEMANTIC.average;
        return SEMANTIC.bad;
      case 'Health Score':
        if (m.healthScore >= 80) return SEMANTIC.excellent;
        if (m.healthScore >= 70) return SEMANTIC.good;
        if (m.healthScore >= 40) return SEMANTIC.average;
        return SEMANTIC.bad;
      default:
        return SEMANTIC.good;
    }
  };

  const getMetricRangeData = (name) => {
    const m = bodyComp;
    const male = m.isMale;
    const defs = {
      'Health Score': { value: m.healthScore, thresholds: [40, 70, 80], zones: [{ label: 'Poor', color: SEMANTIC.bad }, { label: 'Average', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'Excellent', color: SEMANTIC.excellent }], min: 5, max: 100 },
      'BMI': { value: m.bmi, thresholds: [18.5, 25, 30], zones: [{ label: 'Under', color: SEMANTIC.average }, { label: 'Normal', color: SEMANTIC.good }, { label: 'Over', color: SEMANTIC.average }, { label: 'Obese', color: SEMANTIC.bad }], min: 15, max: 40 },
      'Weight': { value: m.weight, thresholds: [m.idealWeightLow, m.idealWeightHigh], zones: [{ label: 'Under', color: SEMANTIC.average }, { label: 'Ideal', color: SEMANTIC.good }, { label: 'Over', color: SEMANTIC.bad }], min: Math.round(Math.max(30, m.idealWeightLow - 15)), max: Math.round(m.idealWeightHigh + 25) },
      'Body Fat': male
        ? { value: m.bodyFat, thresholds: [14, 18, 25], zones: [{ label: 'Athletic', color: SEMANTIC.excellent }, { label: 'Fitness', color: SEMANTIC.good }, { label: 'Average', color: SEMANTIC.average }, { label: 'High', color: SEMANTIC.bad }], min: 5, max: 40 }
        : { value: m.bodyFat, thresholds: [21, 25, 32], zones: [{ label: 'Athletic', color: SEMANTIC.excellent }, { label: 'Fitness', color: SEMANTIC.good }, { label: 'Average', color: SEMANTIC.average }, { label: 'High', color: SEMANTIC.bad }], min: 10, max: 45 },
      'Muscle Rate': male
        ? { value: m.muscleRate, thresholds: [33, 40, 44], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Normal', color: SEMANTIC.average }, { label: 'High', color: SEMANTIC.good }, { label: 'Very High', color: SEMANTIC.excellent }], min: 25, max: 55 }
        : { value: m.muscleRate, thresholds: [24, 31, 36], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Normal', color: SEMANTIC.average }, { label: 'High', color: SEMANTIC.good }, { label: 'Very High', color: SEMANTIC.excellent }], min: 18, max: 45 },
      'BMR': male
        ? { value: m.bmr, thresholds: [1400, 1600, 1800], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Below Avg', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'High', color: SEMANTIC.excellent }], min: 1000, max: 2500 }
        : { value: m.bmr, thresholds: [1100, 1300, 1500], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Below Avg', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'High', color: SEMANTIC.excellent }], min: 800, max: 2000 },
      'Fat-free Weight': male
        ? { value: m.fatFreeWeight, thresholds: [50, 60, 70], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Normal', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'Excellent', color: SEMANTIC.excellent }], min: 35, max: 85 }
        : { value: m.fatFreeWeight, thresholds: [35, 42, 50], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Normal', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'Excellent', color: SEMANTIC.excellent }], min: 25, max: 65 },
      'Muscle Mass': male
        ? { value: m.muscleMass, thresholds: [30, 35, 40], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Normal', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'Excellent', color: SEMANTIC.excellent }], min: 20, max: 55 }
        : { value: m.muscleMass, thresholds: [18, 24, 28], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Normal', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'Excellent', color: SEMANTIC.excellent }], min: 12, max: 40 },
      'Subcutaneous Fat': male
        ? { value: m.subcutaneousFat, thresholds: [10, 15, 20], zones: [{ label: 'Low', color: SEMANTIC.excellent }, { label: 'Normal', color: SEMANTIC.good }, { label: 'High', color: SEMANTIC.average }, { label: 'Very High', color: SEMANTIC.bad }], min: 3, max: 30 }
        : { value: m.subcutaneousFat, thresholds: [15, 20, 27], zones: [{ label: 'Low', color: SEMANTIC.excellent }, { label: 'Normal', color: SEMANTIC.good }, { label: 'High', color: SEMANTIC.average }, { label: 'Very High', color: SEMANTIC.bad }], min: 5, max: 35 },
      'Visceral Fat': { value: m.visceralFat, thresholds: [9, 14], zones: [{ label: 'Standard', color: SEMANTIC.good }, { label: 'High', color: SEMANTIC.average }, { label: 'Too High', color: SEMANTIC.bad }], min: 1, max: 30 },
      'Bone Mass': male
        ? { value: m.boneMass, thresholds: [2.5, 3.0, 3.5], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Normal', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'Strong', color: SEMANTIC.excellent }], min: 1.5, max: 5 }
        : { value: m.boneMass, thresholds: [2.0, 2.5, 3.0], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Normal', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'Strong', color: SEMANTIC.excellent }], min: 1, max: 4 },
      'Protein': { value: m.protein, thresholds: [14, 16, 18], zones: [{ label: 'Low', color: SEMANTIC.bad }, { label: 'Below Avg', color: SEMANTIC.average }, { label: 'Good', color: SEMANTIC.good }, { label: 'Excellent', color: SEMANTIC.excellent }], min: 8, max: 25 },
      'Body Age': (() => {
        const baMin = Math.max(18, m.age - 15);
        const baMax = m.age + 15;
        return { value: m.bodyAge, thresholds: [Math.max(baMin, m.age - 5), Math.max(baMin, m.age), Math.min(baMax, m.age + 3)], zones: [{ label: 'Excellent', color: SEMANTIC.excellent }, { label: 'Good', color: SEMANTIC.good }, { label: 'Average', color: SEMANTIC.average }, { label: 'High', color: SEMANTIC.bad }], min: baMin, max: baMax };
      })(),
      'TDEE': male
        ? { value: m.tdee, thresholds: [2000, 2400, 2800], zones: [{ label: 'Low', color: SEMANTIC.average }, { label: 'Moderate', color: SEMANTIC.good }, { label: 'Active', color: SEMANTIC.excellent }, { label: 'Very Active', color: SEMANTIC.excellent }], min: 1500, max: 3500 }
        : { value: m.tdee, thresholds: [1600, 1900, 2300], zones: [{ label: 'Low', color: SEMANTIC.average }, { label: 'Moderate', color: SEMANTIC.good }, { label: 'Active', color: SEMANTIC.excellent }, { label: 'Very Active', color: SEMANTIC.excellent }], min: 1200, max: 3000 },
    };
    return defs[name] || null;
  };

  const scoreColor = getSemanticColor('Health Score');
  const scoreColorEnd = scoreColor === SEMANTIC.excellent ? '#6366F1' : scoreColor === SEMANTIC.good ? '#059669' : scoreColor === SEMANTIC.average ? '#F97316' : '#DC2626';

  const quickItems = [
    { label: 'Body Age', value: bodyComp.bodyAge, unit: '', color: getSemanticColor('Body Age'), icon: 'favorite' },
    { label: 'BMI', value: bodyComp.bmi, unit: bodyComp.bmiStatus.label, color: getSemanticColor('BMI'), icon: 'speed' },
    { label: 'Water Goal', value: bodyComp.dailyWaterL, unit: 'L / day', color: '#3B82F6', icon: 'opacity' },
    { label: 'Ideal Weight', value: `${bodyComp.idealWeightLow}–${bodyComp.idealWeightHigh}`, unit: 'kg', color: '#10B981', icon: 'track-changes' },
  ];

  const allMetrics = [
    { icon: 'monitor-weight', label: 'Weight', value: `${bodyComp.weight} kg`, color: getSemanticColor('Weight'), bar: bodyComp.weight / 120 },
    { icon: 'pie-chart', label: 'Body Fat', value: `${bodyComp.bodyFat}%`, color: getSemanticColor('Body Fat'), status: bodyComp.bodyFatStatus.label, bar: bodyComp.bodyFat / 50 },
    { icon: 'fitness-center', label: 'Muscle Rate', value: `${bodyComp.muscleRate}%`, color: getSemanticColor('Muscle Rate'), status: bodyComp.muscleStatus.label, bar: bodyComp.muscleRate / 60 },
    { icon: 'local-fire-department', label: 'BMR', value: `${bodyComp.bmr} kcal`, color: getSemanticColor('BMR'), bar: bodyComp.bmr / 2500 },
    { icon: 'accessibility-new', label: 'Fat-free Weight', value: `${bodyComp.fatFreeWeight} kg`, color: getSemanticColor('Fat-free Weight'), bar: bodyComp.fatFreeWeight / 90, expanded: true },
    { icon: 'grain', label: 'Muscle Mass', value: `${bodyComp.muscleMass} kg`, color: getSemanticColor('Muscle Mass'), bar: bodyComp.muscleMass / 50, expanded: true },
    { icon: 'spa', label: 'Subcutaneous Fat', value: `${bodyComp.subcutaneousFat}%`, color: getSemanticColor('Subcutaneous Fat'), bar: bodyComp.subcutaneousFat / 40, expanded: true },
    { icon: 'whatshot', label: 'Visceral Fat', value: bodyComp.visceralFat, color: getSemanticColor('Visceral Fat'), status: bodyComp.visceralFatStatus.label, bar: bodyComp.visceralFat / 30, expanded: true },
    { icon: 'straighten', label: 'Bone Mass', value: `${bodyComp.boneMass} kg`, color: getSemanticColor('Bone Mass'), bar: bodyComp.boneMass / 5, expanded: true },
    { icon: 'science', label: 'Protein', value: `${bodyComp.protein}%`, color: getSemanticColor('Protein'), bar: bodyComp.protein / 25, expanded: true },
    { icon: 'favorite', label: 'Body Age', value: bodyComp.bodyAge, color: getSemanticColor('Body Age'), bar: bodyComp.bodyAge / 60, expanded: true },
    { icon: 'bolt', label: 'TDEE', value: `${bodyComp.tdee} kcal`, color: getSemanticColor('TDEE'), bar: bodyComp.tdee / 3500, expanded: true },
  ];
  const visibleMetrics = expanded ? allMetrics : allMetrics.filter(m => !m.expanded);

  const barSegments = [
    { flex: bodyComp.muscleRate, color: '#6366F1', label: `Muscle ${bodyComp.muscleRate}%` },
    { flex: bodyComp.bodyFat, color: '#F59E0B', label: `Fat ${bodyComp.bodyFat}%` },
    { flex: bodyComp.bodyWater * 0.3, color: '#3B82F6', label: `Water ${bodyComp.bodyWater}%` },
    { flex: bodyComp.boneMass * 3, color: '#78716C', label: `Bone ${bodyComp.boneMass}kg` },
  ];

  const renderRangeIndicator = (rangeData, accentColor) => {
    if (!rangeData) return null;
    const { value, thresholds, zones, min, max } = rangeData;
    const total = max - min;
    const breakpoints = [min, ...thresholds, max];
    const clamped = Math.min(max, Math.max(min, value));
    const valuePct = ((clamped - min) / total) * 100;
    let indicatorColor = zones[zones.length - 1].color;
    for (let i = 0; i < zones.length; i++) {
      if (clamped <= breakpoints[i + 1]) { indicatorColor = zones[i].color; break; }
    }
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: accentColor, marginBottom: 12 }}>Your Range</Text>
        <View style={{ height: 18, position: 'relative', marginBottom: 4 }}>
          {thresholds.map((t, i) => {
            const pct = ((t - min) / total) * 100;
            return (
              <View key={i} style={{ position: 'absolute', left: `${pct}%`, width: 44, marginLeft: -22, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary }}>{Number.isInteger(t) ? t : t.toFixed(1)}</Text>
              </View>
            );
          })}
        </View>
        <View style={{ height: 26, justifyContent: 'center' }}>
          <View style={{ height: 10, borderRadius: 5, flexDirection: 'row', overflow: 'hidden' }}>
            {zones.map((zone, i) => (
              <View key={i} style={{ width: `${((breakpoints[i + 1] - breakpoints[i]) / total) * 100}%`, height: '100%', backgroundColor: zone.color, opacity: 0.85 }} />
            ))}
          </View>
          <View style={{
            position: 'absolute', left: `${valuePct}%`, marginLeft: -13,
            width: 26, height: 26, borderRadius: 13,
            backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
            borderWidth: 3, borderColor: indicatorColor,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
          }} />
        </View>
        <View style={{ height: 16, position: 'relative', marginTop: 8 }}>
          {zones.map((zone, i) => {
            const center = (((breakpoints[i] + breakpoints[i + 1]) / 2 - min) / total) * 100;
            return (
              <View key={i} style={{ position: 'absolute', left: `${center}%`, width: 70, marginLeft: -35, alignItems: 'center' }}>
                <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.45)' : '#888' }}>{zone.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <TouchableOpacity
        style={[styles.backBtn, { position: 'absolute', top: insets.top + 8, left: 16, zIndex: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="arrow-back-ios-new" size={20} color={textPrimary} />
      </TouchableOpacity>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={{ width: 44 }} />
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Body Composition</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Smart Scale Card ── */}
        <Animated.View style={{
          opacity: scaleCardOpacity,
          transform: [{ scale: scaleCardScale }],
        }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setScaleModalVisible(true)}
            style={[styles.scaleCard, {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }]}
          >
            <View style={styles.scaleCardContent}>
              <View style={[styles.scaleIconBg, { backgroundColor: '#6366F114' }]}>
                <MaterialIcons name="bluetooth" size={22} color="#6366F1" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.scaleCardTitle, { color: textPrimary }]}>Smart Scale</Text>
                {lastScaleReading ? (
                  <Text style={[styles.scaleCardSub, { color: textSecondary }]}>
                    Last: {lastScaleReading.weightKg?.toFixed(1)} kg
                    {lastScaleReading.bodyFatPercent ? ` · ${lastScaleReading.bodyFatPercent?.toFixed(1)}% fat` : ''}
                    {' · '}{_formatScaleDate(lastScaleReading.timestamp)}
                  </Text>
                ) : (
                  <Text style={[styles.scaleCardSub, { color: textTertiary }]}>
                    {savedScaleDevice ? 'Tap to weigh in' : 'Connect your Bluetooth scale'}
                  </Text>
                )}
              </View>
              <View style={[styles.scaleCardArrow, { backgroundColor: '#6366F114' }]}>
                <MaterialIcons name={savedScaleDevice ? 'bluetooth-connected' : 'chevron-right'} size={16} color="#6366F1" />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Hero Health Score ── */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => showInfo('Health Score', scoreColor)}>
          <Animated.View style={[styles.heroSection, {
            transform: [{ scale: Animated.multiply(heroScale, pulseAnim) }],
            opacity: heroOpacity,
          }]}>
            <View style={styles.heroRing}>
              <View style={[styles.heroGlow, { backgroundColor: scoreColor, shadowColor: scoreColor }]} />
              <Svg width={160} height={160}>
                <Defs>
                  <SvgGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={scoreColor} />
                    <Stop offset="1" stopColor={scoreColorEnd} />
                  </SvgGradient>
                </Defs>
                <Circle cx={80} cy={80} r={68} stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} strokeWidth={8} fill="none" />
                <Circle
                  cx={80} cy={80} r={68}
                  stroke="url(#heroGrad)" strokeWidth={8} fill="none"
                  strokeDasharray={2 * Math.PI * 68}
                  strokeDashoffset={ringProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2 * Math.PI * 68, 2 * Math.PI * 68 * (1 - bodyComp.healthScore / 100)],
                  })}
                  strokeLinecap="round"
                  rotation="-90" origin="80, 80"
                />
              </Svg>
              <View style={styles.heroCenter}>
                <Text style={[styles.heroScore, { color: scoreColor }]}>{bodyComp.healthScore}</Text>
                <Text style={[styles.heroLabel, { color: textTertiary }]}>HEALTH SCORE</Text>
              </View>
            </View>
            <Text style={[styles.heroDesc, { color: textSecondary }]}>
              {bodyComp.healthScore >= 90 ? 'Elite level — you\'re in incredible shape.' :
               bodyComp.healthScore >= 80 ? 'Looking great — keep it up!' :
               bodyComp.healthScore >= 70 ? 'Solid progress — stay consistent.' :
               bodyComp.healthScore >= 60 ? 'Decent foundation — keep pushing.' :
               bodyComp.healthScore >= 50 ? 'Average — you have potential, use it.' :
               bodyComp.healthScore >= 40 ? 'Below average — time to step it up.' :
               bodyComp.healthScore >= 25 ? 'Work needed — every journey starts somewhere.' :
               'Serious changes needed — start today.'}
            </Text>
            <View style={styles.tapHint}>
              <MaterialIcons name="info-outline" size={12} color={textTertiary} />
              <Text style={[styles.tapHintText, { color: textTertiary }]}>Tap any card to learn more</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* ── Quick Stats Grid ── */}
        <View style={styles.quickGrid}>
          {quickItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.7}
              onPress={() => showInfo(item.label, item.color)}
            >
              <Animated.View
                style={[styles.quickCard, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                  borderColor: cardBorder,
                  transform: [{ scale: quickGridAnims[i].scale }, { translateY: quickGridAnims[i].translateY }],
                  opacity: quickGridAnims[i].opacity,
                }]}
              >
                <View style={[styles.quickIconBg, { backgroundColor: item.color + '18' }]}>
                  <MaterialIcons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={[styles.quickValue, { color: item.color }]}>{item.value}</Text>
                <Text style={[styles.quickUnit, { color: textTertiary }]}>{item.unit}</Text>
                <Text style={[styles.quickLabel, { color: textTertiary }]}>{item.label}</Text>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Body Breakdown Bar ── */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => showInfo('Body Breakdown')}>
          <Animated.View style={[styles.breakdownCard, {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            opacity: metricsOpacity,
            transform: [{ translateY: metricsSlide }],
          }]}>
            <View style={styles.sectionLabelRow}>
              <Text style={[styles.sectionLabel, { color: textSecondary, marginBottom: 0 }]}>Body Breakdown</Text>
              <MaterialIcons name="info-outline" size={14} color={textTertiary} />
            </View>
            <View style={[styles.bar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F0F1F3' }]}>
              {barSegments.map((seg, i) => (
                <Animated.View
                  key={i}
                  style={{
                    flex: barWidth.interpolate({ inputRange: [0, 1], outputRange: [0, seg.flex] }),
                    height: '100%',
                    backgroundColor: seg.color,
                    borderTopLeftRadius: i === 0 ? 6 : 0,
                    borderBottomLeftRadius: i === 0 ? 6 : 0,
                    borderTopRightRadius: i === barSegments.length - 1 ? 6 : 0,
                    borderBottomRightRadius: i === barSegments.length - 1 ? 6 : 0,
                  }}
                />
              ))}
            </View>
            <View style={styles.legendRow}>
              {barSegments.map((seg) => (
                <View key={seg.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                  <Text style={[styles.legendText, { color: textTertiary }]}>{seg.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* ── Detailed Metrics ── */}
        <Animated.View style={[styles.metricsCard, {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          opacity: metricsOpacity,
          transform: [{ translateY: metricsSlide }],
        }]}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Detailed Metrics</Text>

          {visibleMetrics.map((metric) => (
            <TouchableOpacity
              key={metric.label}
              activeOpacity={0.7}
              onPress={() => showInfo(metric.label, metric.color)}
            >
              <View style={[styles.metricRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6' }]}>
                <View style={[styles.metricIcon, { backgroundColor: metric.color + '14' }]}>
                  <MaterialIcons name={metric.icon} size={18} color={metric.color} />
                </View>
                <View style={styles.metricCenter}>
                  <Text style={[styles.metricLabel, { color: textSecondary }]}>{metric.label}</Text>
                  <View style={[styles.miniBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F0F1F3' }]}>
                    <View style={[styles.miniBarFill, { backgroundColor: metric.color, width: `${Math.min((metric.bar || 0) * 100, 100)}%` }]} />
                  </View>
                </View>
                <View style={styles.metricRight}>
                  <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
                  {metric.status && <Text style={[styles.metricStatus, { color: metric.color }]}>{metric.status}</Text>}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.expandText, { color: theme.primary }]}>
              {expanded ? 'Show Less' : 'Show All Metrics'}
            </Text>
            <MaterialIcons
              name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={18}
              color={theme.primary}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Disclaimer */}
        <View style={[styles.disclaimerBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <MaterialIcons name="info-outline" size={14} color={textTertiary} style={{ marginBottom: 6 }} />
          <Text style={[styles.disclaimerTitle, { color: textSecondary }]}>
            For informational purposes only
          </Text>
          <Text style={[styles.disclaimerText, { color: textTertiary }]}>
            These results are estimates calculated using published research formulas (Mifflin-St Jeor, Watson, Janssen et al.) based on your profile data. They are not medical measurements and should not replace professional health assessments. For accurate body composition analysis, consult a healthcare professional or get a DEXA scan.
          </Text>
        </View>
      </Animated.ScrollView>

      {/* ── Info Popup Modal ── */}
      {infoPopup && (
        <Modal transparent visible={!!infoPopup} animationType="none" onRequestClose={hideInfo}>
          <TouchableOpacity
            style={styles.infoOverlay}
            activeOpacity={1}
            onPress={hideInfo}
          >
            <Animated.View style={{ opacity: infoFade, transform: [{ scale: infoScale }], width: '100%', alignItems: 'center' }}>
              <TouchableOpacity activeOpacity={1} style={[styles.infoCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
                {/* Colored accent bar */}
                <View style={[styles.infoAccent, { backgroundColor: infoPopup.color }]} />

                {/* Icon header */}
                <View style={[styles.infoIconBg, { backgroundColor: infoPopup.color + '18' }]}>
                  <MaterialIcons name={infoPopup.icon} size={28} color={infoPopup.color} />
                </View>

                {/* Title */}
                <Text style={[styles.infoTitle, { color: textPrimary }]}>{infoPopup.title}</Text>

                {/* What is it? */}
                <Text style={[styles.infoSectionHead, { color: infoPopup.color }]}>What is it?</Text>
                <Text style={[styles.infoText, { color: textSecondary }]}>{infoPopup.explanation}</Text>

                {infoPopup.rangeData && renderRangeIndicator(infoPopup.rangeData, infoPopup.color)}

                {/* Example */}
                <View style={[styles.infoExampleBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FA', borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB' }]}>
                  <View style={styles.infoExampleHeader}>
                    <MaterialIcons name="lightbulb" size={16} color="#F59E0B" />
                    <Text style={[styles.infoExampleLabel, { color: isDark ? '#F59E0B' : '#B45309' }]}>Example</Text>
                  </View>
                  <Text style={[styles.infoExampleText, { color: textSecondary }]}>{infoPopup.example}</Text>
                </View>

                {infoPopup.source && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, alignSelf: 'flex-start' }}
                    onPress={() => Linking.openURL(infoPopup.source.url)}
                    activeOpacity={0.6}
                  >
                    <MaterialIcons name="open-in-new" size={13} color={infoPopup.color} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: infoPopup.color }}>{infoPopup.source.label}</Text>
                  </TouchableOpacity>
                )}

                {/* Close button */}
                <TouchableOpacity style={[styles.infoCloseBtn, { backgroundColor: infoPopup.color + '14' }]} onPress={hideInfo}>
                  <Text style={[styles.infoCloseBtnText, { color: infoPopup.color }]}>Got it</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}
      <FitnessDisclaimer screenKey="body_composition" />

      <ScaleConnectionModal
        visible={scaleModalVisible}
        onClose={() => setScaleModalVisible(false)}
        onReadingSaved={handleScaleReadingSaved}
      />
    </View>
  );
};

function _formatScaleDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, fontWeight: '500' },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },

  // Smart Scale
  scaleCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  scaleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scaleIconBg: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  scaleCardSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  scaleCardArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  heroSection: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  heroRing: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  heroGlow: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65, opacity: 0.12,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 30,
  },
  heroCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  heroScore: { fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  heroLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 },
  heroDesc: { fontSize: 14, fontWeight: '500', marginTop: 12, textAlign: 'center', paddingHorizontal: 40 },

  // Quick Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginTop: 24 },
  quickCard: {
    width: (SW - 32 - 10) / 2,
    borderRadius: 18, paddingVertical: 18, paddingHorizontal: 14,
    alignItems: 'center', gap: 4, borderWidth: 1,
  },
  quickIconBg: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  quickValue: { fontSize: 24, fontWeight: '800', marginTop: 6 },
  quickUnit: { fontSize: 10, fontWeight: '500', marginTop: -2 },
  quickLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },

  // Breakdown
  breakdownCard: {
    marginHorizontal: 16, borderRadius: 20, borderWidth: 1, padding: 20, marginTop: 20,
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  bar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 12 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '500' },

  // Metrics
  metricsCard: {
    marginHorizontal: 16, borderRadius: 20, borderWidth: 1, padding: 20, marginTop: 16,
  },
  metricRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  metricIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  metricCenter: { flex: 1, gap: 5 },
  metricLabel: { fontSize: 14, fontWeight: '500' },
  miniBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 2 },
  metricRight: { alignItems: 'flex-end', marginLeft: 12 },
  metricValue: { fontSize: 16, fontWeight: '700' },
  metricStatus: { fontSize: 9, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 4, marginTop: 4 },
  expandText: { fontSize: 14, fontWeight: '600' },

  disclaimerBox: { marginTop: 20, marginHorizontal: 16, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  disclaimerTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  disclaimerText: { fontSize: 11.5, fontWeight: '400', textAlign: 'center', lineHeight: 17, paddingHorizontal: 8 },

  // Tap hint
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, opacity: 0.7 },
  tapHintText: { fontSize: 11, fontWeight: '500' },

  // Section label row (with info icon)
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },

  // Info Popup
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  infoCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    paddingTop: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  infoAccent: {
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  infoIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  infoSectionHead: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
    marginBottom: 16,
  },
  infoExampleBox: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoExampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoExampleLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoExampleText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
  infoCloseBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  infoCloseBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BodyCompositionScreen;
