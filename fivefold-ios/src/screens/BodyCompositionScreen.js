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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import nutritionService from '../services/nutritionService';
import bodyCompositionService from '../services/bodyCompositionService';

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
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const profile = await nutritionService.getProfile();
      if (profile && profile.weightKg && profile.heightCm) {
        const data = bodyCompositionService.calculate(profile);
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
    },
    'Body Age': {
      explanation: 'How old your body "acts" based on your fitness level, not your actual birthday. If you\'re fit, your body age could be lower than your real age.',
      example: 'If you\'re 30 years old but very active with good muscle mass, your body age might be 25. If you\'re sedentary with high body fat, it could be 35.',
      icon: 'favorite',
      color: '#3B82F6',
    },
    'BMI': {
      explanation: 'Body Mass Index — a simple number calculated from your height and weight. It gives a rough idea of whether you\'re underweight, normal, overweight, or obese.',
      example: 'BMI under 18.5 = Underweight. 18.5–24.9 = Normal. 25–29.9 = Overweight. 30+ = Obese. For example, someone 170 cm and 70 kg has a BMI of 24.2 (Normal).',
      icon: 'speed',
      color: '#6366F1',
    },
    'Water Goal': {
      explanation: 'How much water you should drink daily based on your weight and activity level. Staying hydrated helps your energy, skin, digestion, and brain function.',
      example: 'If your goal is 1.9 L/day, that\'s about 8 glasses of water. Try carrying a water bottle and sipping throughout the day.',
      icon: 'opacity',
      color: '#3B82F6',
    },
    'Ideal Weight': {
      explanation: 'The healthy weight range for someone your height. Being within this range is associated with lower risk of health problems.',
      example: 'If your range is 61–76 kg and you\'re at 74 kg, you\'re right in the healthy zone. It\'s a range because bodies are different — muscle, bone density, etc.',
      icon: 'track-changes',
      color: '#10B981',
    },
    'Weight': {
      explanation: 'Your total body weight. On its own it doesn\'t tell the full story — what matters is the breakdown between muscle, fat, water, and bone.',
      example: 'Two people can both weigh 80 kg but look completely different. One might have 20% body fat (muscular), the other 35% (higher fat). That\'s why we look at the other metrics too.',
      icon: 'monitor-weight',
      color: '#6366F1',
    },
    'Body Fat': {
      explanation: 'The percentage of your body that is fat. Some fat is essential (organs, hormones), but too much increases health risks.',
      example: 'For men: 10–20% is athletic to fit, 20–25% is average, 25%+ is above average. For women: 18–28% is fit to average, 28%+ is above average.',
      icon: 'pie-chart',
      color: '#F59E0B',
    },
    'Muscle Rate': {
      explanation: 'Your skeletal muscle as a percentage of body weight. These are the muscles you control — biceps, quads, abs, etc. Higher means a faster metabolism and stronger body.',
      example: 'For men: 33–39% is normal, 40%+ is high/athletic. For women: 24–30% is normal, 31%+ is high. Strength training is the best way to increase it.',
      icon: 'fitness-center',
      color: '#10B981',
    },
    'BMR': {
      explanation: 'Basal Metabolic Rate — the number of calories your body burns just to stay alive (breathing, heartbeat, brain function) even if you lie in bed all day.',
      example: 'If your BMR is 1,719 kcal, that means you burn 1,719 calories doing absolutely nothing. Add exercise and daily activities on top of that for your total burn.',
      icon: 'local-fire-department',
      color: '#F97316',
    },
    'Fat-free Weight': {
      explanation: 'Everything in your body that isn\'t fat — muscles, bones, organs, water. Also called "lean body mass." Higher is generally better.',
      example: 'If you weigh 74 kg and have 40% body fat, your fat-free weight is about 44 kg (the non-fat part).',
      icon: 'accessibility-new',
      color: '#10B981',
    },
    'Muscle Mass': {
      explanation: 'The actual weight of your muscles in kilograms. Building muscle improves strength, metabolism, and appearance.',
      example: 'Average muscle mass for men is 33–40 kg, and for women 20–28 kg. Strength training is the best way to increase it.',
      icon: 'grain',
      color: '#8B5CF6',
    },
    'Skeletal Muscle': {
      explanation: 'The muscles attached to your skeleton that you can voluntarily control — like your biceps, quads, and abs. These are the muscles you build in the gym.',
      example: 'Healthy range is 33–39% for men and 24–33% for women. Higher skeletal muscle % usually means you\'re more fit and athletic.',
      icon: 'directions-run',
      color: '#06B6D4',
    },
    'Subcutaneous Fat': {
      explanation: 'The fat stored just under your skin. It\'s the fat you can see and pinch. It carries fewer health concerns than visceral fat but affects your appearance.',
      example: 'When people say they want to "lose belly fat," they mostly mean subcutaneous fat. It decreases with a calorie deficit and exercise.',
      icon: 'spa',
      color: '#F59E0B',
    },
    'Visceral Fat': {
      explanation: 'The hidden fat stored deep inside, around your organs (liver, stomach, intestines). High levels may be associated with increased health risks. Consult a healthcare professional for personalised guidance.',
      example: 'A rating of 1–12 is healthy. 13–59 is too high. Even slim people can have high visceral fat if they don\'t exercise. It responds well to cardio exercise.',
      icon: 'whatshot',
      color: '#EF4444',
    },
    'Bone Mass': {
      explanation: 'The total weight of the bones in your body. Healthy bones are dense and strong. Exercise and calcium help maintain bone mass.',
      example: 'Average bone mass is about 2.5–3.5 kg for men and 2.0–3.0 kg for women. Weight-bearing exercises like running and lifting help keep bones strong.',
      icon: 'straighten',
      color: '#78716C',
    },
    'Protein': {
      explanation: 'The percentage of your body made up of protein. Your muscles, organs, skin, and hair are all built from protein. It\'s a sign of good muscle health.',
      example: 'A healthy protein percentage is 16–20%. If it\'s low, it could mean you\'re losing muscle mass. Eating enough protein (meat, fish, eggs, beans) helps.',
      icon: 'science',
      color: '#EC4899',
    },
    'TDEE': {
      explanation: 'Total Daily Energy Expenditure — the total calories you burn in a day including exercise, walking, and daily activities. This is the number you need to know for weight management.',
      example: 'If your TDEE is 2,200 kcal: eat less than 2,200 to lose weight, eat 2,200 to maintain, eat more to gain weight. It\'s that simple.',
      icon: 'bolt',
      color: '#F97316',
    },
    'Body Breakdown': {
      explanation: 'A visual split of what your body is made of — muscle, fat, water, and bone. A healthy body has more muscle and water than fat.',
      example: 'Imagine your body as a pie chart. Ideally, the biggest slice should be muscle and water, not fat. The bar shows your current split at a glance.',
      icon: 'donut-large',
      color: '#6366F1',
    },
  };

  const showInfo = (metricName) => {
    const info = metricExplanations[metricName];
    if (!info) return;
    infoFade.setValue(0);
    infoScale.setValue(0.85);
    setInfoPopup({ title: metricName, ...info });
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

  const scoreColor = bodyComp.healthScore >= 80 ? '#10B981' : bodyComp.healthScore >= 60 ? '#F59E0B' : '#EF4444';
  const scoreColorEnd = bodyComp.healthScore >= 80 ? '#6366F1' : bodyComp.healthScore >= 60 ? '#F97316' : '#DC2626';
  const ageColorFn = (ba) => ba <= 25 ? '#10B981' : ba <= 35 ? '#3B82F6' : ba <= 45 ? '#F59E0B' : '#EF4444';

  const quickItems = [
    { label: 'Body Age', value: bodyComp.bodyAge, unit: '', color: ageColorFn(bodyComp.bodyAge), icon: 'favorite' },
    { label: 'BMI', value: bodyComp.bmi, unit: bodyComp.bmiStatus.label, color: bodyComp.bmiStatus.color, icon: 'speed' },
    { label: 'Water Goal', value: bodyComp.dailyWaterL, unit: 'L / day', color: '#3B82F6', icon: 'opacity' },
    { label: 'Ideal Weight', value: `${bodyComp.idealWeightLow}–${bodyComp.idealWeightHigh}`, unit: 'kg', color: '#10B981', icon: 'track-changes' },
  ];

  const allMetrics = [
    { icon: 'monitor-weight', label: 'Weight', value: `${bodyComp.weight} kg`, color: '#6366F1', bar: bodyComp.weight / 120 },
    { icon: 'pie-chart', label: 'Body Fat', value: `${bodyComp.bodyFat}%`, color: bodyComp.bodyFatStatus.color, status: bodyComp.bodyFatStatus.label, bar: bodyComp.bodyFat / 50 },
    { icon: 'fitness-center', label: 'Muscle Rate', value: `${bodyComp.muscleRate}%`, color: bodyComp.muscleStatus.color, status: bodyComp.muscleStatus.label, bar: bodyComp.muscleRate / 60 },
    { icon: 'local-fire-department', label: 'BMR', value: `${bodyComp.bmr} kcal`, color: '#F97316', bar: bodyComp.bmr / 2500 },
    { icon: 'accessibility-new', label: 'Fat-free Weight', value: `${bodyComp.fatFreeWeight} kg`, color: '#10B981', bar: bodyComp.fatFreeWeight / 90, expanded: true },
    { icon: 'grain', label: 'Muscle Mass', value: `${bodyComp.muscleMass} kg`, color: '#8B5CF6', bar: bodyComp.muscleMass / 50, expanded: true },
    { icon: 'spa', label: 'Subcutaneous Fat', value: `${bodyComp.subcutaneousFat}%`, color: '#F59E0B', bar: bodyComp.subcutaneousFat / 40, expanded: true },
    { icon: 'whatshot', label: 'Visceral Fat', value: bodyComp.visceralFat, color: bodyComp.visceralFatStatus.color, status: bodyComp.visceralFatStatus.label, bar: bodyComp.visceralFat / 30, expanded: true },
    { icon: 'straighten', label: 'Bone Mass', value: `${bodyComp.boneMass} kg`, color: '#78716C', bar: bodyComp.boneMass / 5, expanded: true },
    { icon: 'science', label: 'Protein', value: `${bodyComp.protein}%`, color: '#EC4899', bar: bodyComp.protein / 25, expanded: true },
    { icon: 'favorite', label: 'Body Age', value: bodyComp.bodyAge, color: ageColorFn(bodyComp.bodyAge), bar: bodyComp.bodyAge / 60, expanded: true },
    { icon: 'bolt', label: 'TDEE', value: `${bodyComp.tdee} kcal`, color: '#F97316', bar: bodyComp.tdee / 3500, expanded: true },
  ];
  const visibleMetrics = expanded ? allMetrics : allMetrics.filter(m => !m.expanded);

  const barSegments = [
    { flex: bodyComp.muscleRate, color: '#6366F1', label: `Muscle ${bodyComp.muscleRate}%` },
    { flex: bodyComp.bodyFat, color: '#F59E0B', label: `Fat ${bodyComp.bodyFat}%` },
    { flex: bodyComp.bodyWater * 0.3, color: '#3B82F6', label: `Water ${bodyComp.bodyWater}%` },
    { flex: bodyComp.boneMass * 3, color: '#78716C', label: `Bone ${bodyComp.boneMass}kg` },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — scrolls with content */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back-ios-new" size={20} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Body Composition</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Hero Health Score ── */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => showInfo('Health Score')}>
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
              {bodyComp.healthScore >= 90 ? 'Outstanding — you\'re in top shape!' :
               bodyComp.healthScore >= 80 ? 'Great shape — keep pushing!' :
               bodyComp.healthScore >= 70 ? 'Good foundation — stay consistent.' :
               bodyComp.healthScore >= 60 ? 'Decent — room for improvement.' :
               bodyComp.healthScore >= 45 ? 'Work in progress — keep going.' :
               'Time to build healthier habits.'}
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
              onPress={() => showInfo(item.label)}
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
              onPress={() => showInfo(metric.label)}
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

                {/* Example */}
                <View style={[styles.infoExampleBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FA', borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E5E7EB' }]}>
                  <View style={styles.infoExampleHeader}>
                    <MaterialIcons name="lightbulb" size={16} color="#F59E0B" />
                    <Text style={[styles.infoExampleLabel, { color: isDark ? '#F59E0B' : '#B45309' }]}>Example</Text>
                  </View>
                  <Text style={[styles.infoExampleText, { color: textSecondary }]}>{infoPopup.example}</Text>
                </View>

                {/* Close button */}
                <TouchableOpacity style={[styles.infoCloseBtn, { backgroundColor: infoPopup.color + '14' }]} onPress={hideInfo}>
                  <Text style={[styles.infoCloseBtnText, { color: infoPopup.color }]}>Got it</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, fontWeight: '500' },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },

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
