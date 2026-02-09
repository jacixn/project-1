/**
 * NutritionScreen
 *
 * Full nutrition tracker with:
 * - Body profile setup (gender, age, height, weight, goal, activity)
 * - TDEE-based daily calorie & macro targets
 * - Food logging via camera (Gemini Vision) or manual entry
 * - Favorites for quick re-adds
 * - Beautiful calorie ring and macro progress bars
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  PanResponder,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import nutritionService, { ACTIVITY_LABELS } from '../services/nutritionService';
import foodVisionService from '../services/foodVisionService';
import productionAiService from '../services/productionAiService';
import notificationService from '../services/notificationService';

// ─── Unit conversion helpers ───
const kgToLbs = (kg) => +(kg * 2.20462).toFixed(1);
const lbsToKg = (lbs) => +(lbs / 2.20462).toFixed(1);
const cmToFtIn = (cm) => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};
const ftInToCm = (feet, inches) => +((feet * 12 + inches) * 2.54).toFixed(1);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const RING_SIZE = 200;
const RING_STROKE = 16;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ─── Animated SVG Circle for calorie ring ───
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const NutritionScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // ─── State ───
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);

  // Setup form fields
  const [formGender, setFormGender] = useState('male');
  const [formBirthday, setFormBirthday] = useState(null); // Date object
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [genderLocked, setGenderLocked] = useState(false); // true after first setup
  const [formHeight, setFormHeight] = useState('');       // display value in user's unit
  const [formHeightInches, setFormHeightInches] = useState(''); // only used when heightUnit='ft'
  const [formWeight, setFormWeight] = useState('');        // display value in user's unit
  const [formBodyFat, setFormBodyFat] = useState('');
  const [formTargetWeight, setFormTargetWeight] = useState(''); // display value in user's unit
  const [weightUnit, setWeightUnit] = useState('kg');      // 'kg' or 'lbs'
  const [heightUnit, setHeightUnit] = useState('cm');      // 'cm' or 'ft'
  const [formGoal, setFormGoal] = useState('maintain');
  const [formActivity, setFormActivity] = useState('moderate');

  // Dashboard data
  const [dailyProgress, setDailyProgress] = useState(null);
  const [dailyLog, setDailyLog] = useState({ foods: [] });
  const [favorites, setFavorites] = useState([]);
  const [weeklyAvg, setWeeklyAvg] = useState(0);
  const [streak, setStreak] = useState(0);

  // Add Food modal
  const [addFoodVisible, setAddFoodVisible] = useState(false);
  const [addFoodMode, setAddFoodMode] = useState(null); // 'camera' | 'manual' | 'favorites' | 'scanResult'
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');
  const [foodFat, setFoodFat] = useState('');
  const [foodDescription, setFoodDescription] = useState('');
  const [foodPhotoUri, setFoodPhotoUri] = useState(null);
  const [saveFavorite, setSaveFavorite] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedFood, setAnalyzedFood] = useState(null);
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState([]);
  const [calculatingPlan, setCalculatingPlan] = useState(false);
  const [planResult, setPlanResult] = useState(null); // { dailyCalories, protein, carbs, fat, explanation, goal }

  // Scan result animations
  const scanPhotoScale = useRef(new Animated.Value(0.85)).current;
  const scanPhotoOpacity = useRef(new Animated.Value(0)).current;
  const scanInfoSlide = useRef(new Animated.Value(20)).current;
  const scanInfoOpacity = useRef(new Animated.Value(0)).current;
  const scanCalorieScale = useRef(new Animated.Value(0.5)).current;
  const scanCalorieOpacity = useRef(new Animated.Value(0)).current;
  const scanMacroPillAnims = useRef([0, 1, 2].map(() => ({
    scale: new Animated.Value(0.3),
    opacity: new Animated.Value(0),
  }))).current;
  const scanBarWidth = useRef(new Animated.Value(0)).current;
  const scanActionsOpacity = useRef(new Animated.Value(0)).current;
  const scanActionsSlide = useRef(new Animated.Value(15)).current;
  // Analyzing scan line animation
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  // Calorie count-up
  const [displayCalories, setDisplayCalories] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const cardSlideAnims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(30))).current;
  const cardFadeAnims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;

  // Modal animations (custom — no more dark flash)
  const [modalMounted, setModalMounted] = useState(false);
  const modalBackdropAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(1)).current; // 1 = off-screen, 0 = visible
  const modalDragY = useRef(new Animated.Value(0)).current;    // tracks finger drag

  // Swipe-to-dismiss pan responder
  const modalPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => {
      // Only capture downward vertical drags (dy > 8 and mostly vertical)
      return gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5;
    },
    onPanResponderGrant: () => {
      modalDragY.setValue(0);
    },
    onPanResponderMove: (_, gs) => {
      // Only allow dragging down (positive dy), clamp to 0 minimum
      if (gs.dy > 0) {
        modalDragY.setValue(gs.dy);
      }
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100 || gs.vy > 0.5) {
        // Threshold reached — dismiss
        Animated.parallel([
          Animated.timing(modalDragY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(modalBackdropAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setAddFoodVisible(false);
          setModalMounted(false);
          modalDragY.setValue(0);
          modalSlideAnim.setValue(1);
        });
      } else {
        // Snap back
        Animated.spring(modalDragY, {
          toValue: 0,
          damping: 25,
          stiffness: 300,
          useNativeDriver: true,
        }).start();
      }
    },
  }), []);

  // ─── Scan line animation (moves up/down while analyzing) ───
  useEffect(() => {
    if (analyzing && foodPhotoUri) {
      scanLineAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [analyzing, foodPhotoUri]);

  // ─── Staggered entrance when scan result appears ───
  useEffect(() => {
    if (addFoodMode === 'scanResult') {
      // Reset all
      scanPhotoScale.setValue(0.85);
      scanPhotoOpacity.setValue(0);
      scanInfoSlide.setValue(20);
      scanInfoOpacity.setValue(0);
      scanCalorieScale.setValue(0.5);
      scanCalorieOpacity.setValue(0);
      scanBarWidth.setValue(0);
      scanActionsOpacity.setValue(0);
      scanActionsSlide.setValue(15);
      scanMacroPillAnims.forEach(a => { a.scale.setValue(0.3); a.opacity.setValue(0); });
      setDisplayCalories(0);

      // 1) Photo zooms in
      Animated.parallel([
        Animated.spring(scanPhotoScale, { toValue: 1, damping: 14, stiffness: 120, useNativeDriver: true }),
        Animated.timing(scanPhotoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();

      // 2) Info slides up
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(scanInfoSlide, { toValue: 0, damping: 18, stiffness: 140, useNativeDriver: true }),
          Animated.timing(scanInfoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }, 200);

      // 3) Calorie number pops in + count-up
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(scanCalorieScale, { toValue: 1, damping: 10, stiffness: 100, useNativeDriver: true }),
          Animated.timing(scanCalorieOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();

        // Count-up animation for calories
        const targetCal = parseInt(foodCalories) || 0;
        const steps = 25;
        const stepTime = 30;
        let current = 0;
        const increment = targetCal / steps;
        const counter = setInterval(() => {
          current += increment;
          if (current >= targetCal) {
            current = targetCal;
            clearInterval(counter);
          }
          setDisplayCalories(Math.round(current));
        }, stepTime);
      }, 400);

      // 4) Macro pills bounce in one by one
      scanMacroPillAnims.forEach((anim, i) => {
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(anim.scale, { toValue: 1, damping: 10, stiffness: 120, useNativeDriver: true }),
            Animated.timing(anim.opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          ]).start();
        }, 600 + i * 120);
      });

      // 5) Distribution bar grows
      setTimeout(() => {
        Animated.spring(scanBarWidth, { toValue: 1, damping: 16, stiffness: 90, useNativeDriver: false }).start();
      }, 950);

      // 6) Action buttons fade in
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(scanActionsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(scanActionsSlide, { toValue: 0, damping: 18, stiffness: 140, useNativeDriver: true }),
        ]).start();
      }, 1050);
    }
  }, [addFoodMode]);

  // ─── Load data on focus ───
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const p = await nutritionService.getProfile();
      setProfile(p);

      if (p) {
        // Pre-fill form for editing
        prefillForm(p);
        // Load dashboard data
        const today = nutritionService.getDateKey();
        const progress = await nutritionService.getDailyProgress(today);
        const log = await nutritionService.getDailyLog(today);
        const favs = await nutritionService.getFavorites();
        const avg = await nutritionService.getWeeklyAverage();
        const s = await nutritionService.getLoggingStreak();

        setDailyProgress(progress);
        setDailyLog(log);
        setFavorites(favs);
        setWeeklyAvg(avg);
        setStreak(s);


        // Animate ring
        const consumed = progress.consumed?.calories || 0;
        const target = progress.targets?.calories || 2000;
        const pct = Math.min(consumed / target, 1);

        ringAnim.setValue(0);
        Animated.timing(ringAnim, {
          toValue: pct,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }

      setLoading(false);

      // Entrance animations
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      cardSlideAnims.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          delay: i * 80,
          useNativeDriver: true,
        }).start();
      });
      cardFadeAnims.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: i * 80,
          useNativeDriver: true,
        }).start();
      });
    } catch (e) {
      console.warn('[NutritionScreen] Load failed:', e);
      setLoading(false);
    }
  };

  const prefillForm = async (p) => {
    setFormGender(p.gender || 'male');
    // Load birthday if saved, otherwise try to reconstruct from age
    if (p.birthday) {
      setFormBirthday(new Date(p.birthday));
    } else if (p.age) {
      // Approximate birthday from age (set to Jan 1 of birth year)
      const birthYear = new Date().getFullYear() - p.age;
      setFormBirthday(new Date(birthYear, 0, 1));
    }
    // Lock gender if profile already exists (was set during first setup)
    if (p.gender) {
      setGenderLocked(true);
    }

    // Load unit preferences
    const storedWU = await AsyncStorage.getItem('weightUnit');
    const storedHU = await AsyncStorage.getItem('heightUnit');
    const wU = storedWU || 'kg';
    const hU = storedHU || 'cm';
    setWeightUnit(wU);
    setHeightUnit(hU);

    // Convert canonical values (always stored in cm/kg) to display units
    if (p.heightCm) {
      if (hU === 'ft') {
        const { feet, inches } = cmToFtIn(p.heightCm);
        setFormHeight(String(feet));
        setFormHeightInches(String(inches));
      } else {
        setFormHeight(String(p.heightCm));
        setFormHeightInches('');
      }
    } else {
      setFormHeight('');
      setFormHeightInches('');
    }

    if (p.weightKg) {
      setFormWeight(wU === 'lbs' ? String(kgToLbs(p.weightKg)) : String(p.weightKg));
    } else {
      setFormWeight('');
    }

    if (p.targetWeightKg) {
      setFormTargetWeight(wU === 'lbs' ? String(kgToLbs(p.targetWeightKg)) : String(p.targetWeightKg));
    } else {
      setFormTargetWeight('');
    }

    setFormBodyFat(p.bodyFatPercent ? String(p.bodyFatPercent) : '');
    setFormGoal(p.goal || 'maintain');
    setFormActivity(p.activityLevel || 'moderate');
  };

  // Calculate age from birthday
  const getAgeFromBirthday = (birthday) => {
    if (!birthday) return null;
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    return age;
  };

  const formattedBirthday = formBirthday
    ? formBirthday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const calculatedAge = getAgeFromBirthday(formBirthday);

  // ─── Smart goal detection ───
  const getSmartGoal = (currentWeight, targetWeight) => {
    const diff = currentWeight - targetWeight;
    if (diff > 1) return 'lose';
    if (diff < -1) return 'gain';
    return 'maintain';
  };

  // Auto-update goal when weights change
  useEffect(() => {
    const w = parseFloat(formWeight);
    const tw = parseFloat(formTargetWeight);
    if (w && tw && w > 0 && tw > 0) {
      const smartGoal = getSmartGoal(w, tw);
      if (smartGoal !== formGoal) {
        setFormGoal(smartGoal);
      }
    }
  }, [formWeight, formTargetWeight]);

  // ─── Save profile with AI analysis ───
  const handleSaveProfile = async () => {
    const age = calculatedAge;

    // Convert display values back to canonical metric units
    let height; // always in cm
    if (heightUnit === 'ft') {
      const ft = parseFloat(formHeight) || 0;
      const inches = parseFloat(formHeightInches) || 0;
      height = ftInToCm(ft, inches);
    } else {
      height = parseFloat(formHeight);
    }

    let weight; // always in kg
    let targetWeight; // always in kg
    if (weightUnit === 'lbs') {
      weight = lbsToKg(parseFloat(formWeight));
      targetWeight = lbsToKg(parseFloat(formTargetWeight));
    } else {
      weight = parseFloat(formWeight);
      targetWeight = parseFloat(formTargetWeight);
    }

    if (!formBirthday || !age || age < 10 || age > 100) {
      Alert.alert('Invalid Birthday', 'Please select a valid birthday.');
      return;
    }
    if (!height || height < 100 || height > 250) {
      Alert.alert('Invalid Height', heightUnit === 'ft'
        ? 'Please enter a valid height (e.g. 5 ft 9 in).'
        : 'Please enter a valid height in cm (100-250).');
      return;
    }
    if (!weight || weight < 30 || weight > 300) {
      const wLabel = weightUnit === 'lbs' ? 'lbs (66-660)' : 'kg (30-300)';
      Alert.alert('Invalid Weight', `Please enter a valid weight in ${wLabel}.`);
      return;
    }
    if (!targetWeight || targetWeight < 30 || targetWeight > 300) {
      const wLabel = weightUnit === 'lbs' ? 'lbs (66-660)' : 'kg (30-300)';
      Alert.alert('Invalid Target Weight', `Please enter a valid target weight in ${wLabel}.`);
      return;
    }

    hapticFeedback.medium();
    setCalculatingPlan(true);

    // Smart goal detection
    const smartGoal = getSmartGoal(weight, targetWeight);

    const profileData = {
      gender: formGender,
      birthday: formBirthday.toISOString(),
      age,
      heightCm: height,
      weightKg: weight,
      bodyFatPercent: formBodyFat ? parseFloat(formBodyFat) : null,
      targetWeightKg: targetWeight,
      goal: smartGoal,
      activityLevel: formActivity,
      setupDate: profile?.setupDate || new Date().toISOString(),
    };

    // Calculate base TDEE for AI reference
    const baseTDEE = nutritionService.calculateTDEE(profileData).tdee;

    // Try AI-powered nutrition plan
    try {
      const aiPlan = await productionAiService.generateNutritionPlan({
        gender: formGender,
        age,
        heightCm: height,
        weightKg: weight,
        bodyFatPercent: formBodyFat ? parseFloat(formBodyFat) : null,
        targetWeightKg: targetWeight,
        goal: smartGoal,
        activityLevel: formActivity,
        baseTDEE,
      });

      if (aiPlan) {
        profileData.aiTargets = {
          dailyCalories: aiPlan.dailyCalories,
          protein: aiPlan.protein,
          carbs: aiPlan.carbs,
          fat: aiPlan.fat,
        };
        await nutritionService.saveProfile(profileData);
        // Schedule weekly Saturday body check-in notification
        notificationService.scheduleWeeklyBodyCheckIn();
        setCalculatingPlan(false);
        // Show the result screen
        setPlanResult({
          dailyCalories: aiPlan.dailyCalories,
          protein: aiPlan.protein,
          carbs: aiPlan.carbs,
          fat: aiPlan.fat,
          explanation: aiPlan.explanation || '',
          goal: smartGoal,
        });
        hapticFeedback.success && hapticFeedback.success();
        return;
      }
    } catch (e) {
      console.warn('[NutritionScreen] Smart plan failed, using formula:', e.message);
    }

    // Fallback: save with formula-based targets
    await nutritionService.saveProfile(profileData);
    // Schedule weekly Saturday body check-in notification
    notificationService.scheduleWeeklyBodyCheckIn();
    setCalculatingPlan(false);
    const fallbackTargets = nutritionService.getMacroTargets(profileData);
    setPlanResult({
      dailyCalories: fallbackTargets.dailyCalories,
      protein: fallbackTargets.protein,
      carbs: fallbackTargets.carbs,
      fat: fallbackTargets.fat,
      explanation: '',
      goal: smartGoal,
    });
  };

  // ─── Add food handlers ───
  const openAddFood = () => {
    setAddFoodMode(null);
    setFoodName('');
    setFoodCalories('');
    setFoodProtein('');
    setFoodCarbs('');
    setFoodFat('');
    setFoodDescription('');
    setFoodPhotoUri(null);
    setSaveFavorite(false);
    setAnalyzedFood(null);
    setSelectedFavoriteIds([]);
    // Mount the modal, then animate in
    setModalMounted(true);
    setAddFoodVisible(true);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(modalBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          damping: 28,
          stiffness: 300,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeAddFood = () => {
    Animated.parallel([
      Animated.timing(modalBackdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalSlideAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAddFoodVisible(false);
      setModalMounted(false);
    });
  };

  const handlePhotoLibraryAnalysis = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Photo library access is required to import food photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
        allowsEditing: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Could not process the image. Please try again.');
        return;
      }

      setAnalyzing(true);
      setAddFoodMode('camera');
      setFoodPhotoUri(asset.uri);

      const nutrition = await foodVisionService.analyzeFood(asset.base64, 'image/jpeg');

      if (nutrition) {
        setAnalyzedFood(nutrition);
        setFoodName(nutrition.name);
        setFoodDescription(nutrition.description || '');
        setFoodCalories(String(nutrition.calories));
        setFoodProtein(String(nutrition.protein));
        setFoodCarbs(String(nutrition.carbs));
        setFoodFat(String(nutrition.fat));
        setAddFoodMode('scanResult');
        hapticFeedback.light();
      } else {
        Alert.alert(
          'Could Not Analyze',
          'The photo could not be analyzed. You can enter the food details manually.',
        );
        setFoodPhotoUri(null);
        setAddFoodMode('manual');
      }

      setAnalyzing(false);
    } catch (e) {
      console.warn('[NutritionScreen] Photo library analysis failed:', e);
      setAnalyzing(false);
      setFoodPhotoUri(null);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleCameraAnalysis = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera access is required to scan food.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Could not process the image. Please try again.');
        return;
      }

      setAnalyzing(true);
      setAddFoodMode('camera');
      setFoodPhotoUri(asset.uri);

      const nutrition = await foodVisionService.analyzeFood(asset.base64, 'image/jpeg');

      if (nutrition) {
        setAnalyzedFood(nutrition);
        setFoodName(nutrition.name);
        setFoodDescription(nutrition.description || '');
        setFoodCalories(String(nutrition.calories));
        setFoodProtein(String(nutrition.protein));
        setFoodCarbs(String(nutrition.carbs));
        setFoodFat(String(nutrition.fat));
        setAddFoodMode('scanResult');
        hapticFeedback.light();
      } else {
        Alert.alert(
          'Could Not Analyze',
          'The photo could not be analyzed. You can enter the food details manually.',
        );
        setFoodPhotoUri(null);
        setAddFoodMode('manual');
      }

      setAnalyzing(false);
    } catch (e) {
      console.warn('[NutritionScreen] Camera analysis failed:', e);
      setAnalyzing(false);
      setFoodPhotoUri(null);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleEstimateFromText = async () => {
    if (!foodName.trim()) {
      Alert.alert('Enter Food Name', 'Please type a food name first.');
      return;
    }

    setAnalyzing(true);
    const nutrition = await foodVisionService.estimateFromText(foodName.trim());

    if (nutrition) {
      setFoodName(nutrition.name);
      setFoodCalories(String(nutrition.calories));
      setFoodProtein(String(nutrition.protein));
      setFoodCarbs(String(nutrition.carbs));
      setFoodFat(String(nutrition.fat));
      hapticFeedback.light();
    } else {
      Alert.alert('Estimation Failed', 'Could not estimate nutrition. Please enter values manually.');
    }
    setAnalyzing(false);
  };

  const handleSaveFood = async () => {
    const calories = parseInt(foodCalories) || 0;
    if (!foodName.trim()) {
      Alert.alert('Enter Food Name', 'Please provide a food name.');
      return;
    }
    if (calories <= 0) {
      Alert.alert('Enter Calories', 'Please provide a calorie amount.');
      return;
    }

    hapticFeedback.medium();

    const food = {
      name: foodName.trim(),
      calories,
      protein: parseInt(foodProtein) || 0,
      carbs: parseInt(foodCarbs) || 0,
      fat: parseInt(foodFat) || 0,
    };

    const today = nutritionService.getDateKey();
    await nutritionService.addFoodEntry(today, food);

    if (saveFavorite) {
      await nutritionService.addFavorite(food);
    }

    closeAddFood();
    loadData();
  };

  const toggleFavoriteSelection = (favId) => {
    hapticFeedback.light();
    setSelectedFavoriteIds(prev =>
      prev.includes(favId) ? prev.filter(id => id !== favId) : [...prev, favId]
    );
  };

  const handleAddSelectedFavorites = async () => {
    if (selectedFavoriteIds.length === 0) return;
    hapticFeedback.success();
    const today = nutritionService.getDateKey();
    for (const favId of selectedFavoriteIds) {
      const fav = favorites.find(f => f.id === favId);
      if (fav) {
        await nutritionService.addFoodEntry(today, fav);
        await nutritionService.incrementFavoriteUse(fav.name);
      }
    }
    setSelectedFavoriteIds([]);
    closeAddFood();
    loadData();
  };

  const handleAddFromFavorite = async (fav) => {
    hapticFeedback.light();
    const today = nutritionService.getDateKey();
    await nutritionService.addFoodEntry(today, fav);
    await nutritionService.incrementFavoriteUse(fav.name);
    closeAddFood();
    loadData();
  };

  const handleDeleteFood = (foodId) => {
    Alert.alert('Remove Food', 'Remove this entry from today\'s log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          hapticFeedback.light();
          const today = nutritionService.getDateKey();
          await nutritionService.removeFoodEntry(today, foodId);
          loadData();
        },
      },
    ]);
  };

  // ─── Color helpers ───
  const textPrimary = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#6B7280';
  const textTertiary = isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6';
  const screenBg = theme.background;
  const headerGradient = isDark
    ? [theme.background, theme.background]
    : [theme.primary + '12', theme.background];

  // ─── Calorie ring calculation ───
  const consumed = dailyProgress?.consumed?.calories || 0;
  const calorieTarget = dailyProgress?.targets?.calories || 2000;
  const remaining = Math.max(0, calorieTarget - consumed);
  const ringProgress = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  // ════════════════════════════════════════════════════
  //  RENDER: SETUP FORM
  // ════════════════════════════════════════════════════

  // Derived: smart goal label for display
  const smartGoalInfo = (() => {
    const w = parseFloat(formWeight);
    const tw = parseFloat(formTargetWeight);
    if (!w || !tw || w <= 0 || tw <= 0) return null;
    const diff = w - tw;
    const uLabel = weightUnit === 'lbs' ? 'lbs' : 'kg';
    if (diff > 1) return { key: 'lose', label: 'Lose Weight', icon: 'trending-down', color: '#EF4444', desc: `${Math.round(diff)} ${uLabel} to lose` };
    if (diff < -1) return { key: 'gain', label: 'Gain Muscle', icon: 'trending-up', color: '#10B981', desc: `${Math.round(Math.abs(diff))} ${uLabel} to gain` };
    return { key: 'maintain', label: 'Maintain', icon: 'horizontal-rule', color: '#6366F1', desc: 'Stay at your current weight' };
  })();

  const ACTIVITY_ICONS = {
    sedentary: 'weekend',
    light: 'directions-walk',
    moderate: 'directions-run',
    active: 'fitness-center',
    veryActive: 'local-fire-department',
  };

  const renderSetupForm = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Header */}
      <View style={[styles.setupHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
          onPress={() => {
            if (editingProfile) {
              setEditingProfile(false);
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcons name="arrow-back" size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.setupTitle, { color: textPrimary }]}>
          {editingProfile ? 'Edit Profile' : 'Set Up Your Plan'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.setupContent}>
        <Text style={[styles.setupSubtitle, { color: textSecondary }]}>
          {editingProfile
            ? 'Update your details to recalculate your personalised targets'
            : 'Enter your details and we\'ll create a personalised nutrition plan for you'}
        </Text>

        {/* ── Section: About You ── */}
        <View style={[styles.formSection, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow) }]}>
          <Text style={[styles.formSectionTitle, { color: textPrimary }]}>About You</Text>

          {/* Gender */}
          {genderLocked ? (
            <View style={styles.lockedRow}>
              <MaterialIcons name={formGender === 'male' ? 'male' : 'female'} size={20} color={theme.primary} />
              <Text style={[styles.lockedText, { color: textPrimary }]}>
                {formGender.charAt(0).toUpperCase() + formGender.slice(1)}
              </Text>
              <MaterialIcons name="lock" size={14} color={textTertiary} />
            </View>
          ) : (
            <View style={styles.toggleRow}>
              {['male', 'female'].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor: formGender === g ? theme.primary : inputBg,
                      borderColor: formGender === g ? theme.primary : cardBorder,
                    },
                  ]}
                  onPress={() => { hapticFeedback.light(); setFormGender(g); }}
                >
                  <MaterialIcons
                    name={g === 'male' ? 'male' : 'female'}
                    size={20}
                    color={formGender === g ? '#FFFFFF' : textPrimary}
                  />
                  <Text style={[styles.toggleText, { color: formGender === g ? '#FFFFFF' : textPrimary }]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Birthday + Height in a row */}
          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Birthday</Text>
              <TouchableOpacity
                style={[styles.input, styles.birthdayInput, { backgroundColor: inputBg, borderColor: cardBorder }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="cake" size={16} color={formBirthday ? theme.primary : textTertiary} />
                <Text style={[styles.birthdayText, { color: formBirthday ? textPrimary : textTertiary }]}>
                  {formBirthday
                    ? formBirthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Select'}
                </Text>
                {calculatedAge != null && (
                  <View style={[styles.ageBadge, { backgroundColor: theme.primary + '18' }]}>
                    <Text style={[styles.ageBadgeText, { color: theme.primary }]}>{calculatedAge}y</Text>
                  </View>
                )}
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formBirthday || new Date(2000, 0, 1)}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  minimumDate={new Date(1920, 0, 1)}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (selectedDate) setFormBirthday(selectedDate);
                  }}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                <TouchableOpacity
                  style={[styles.datePickerDone, { backgroundColor: theme.primary }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.formRowItem}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                {heightUnit === 'ft' ? 'Height (ft / in)' : 'Height (cm)'}
              </Text>
              {heightUnit === 'ft' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder, flex: 1 }]}
                    value={formHeight}
                    onChangeText={setFormHeight}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={textTertiary}
                    maxLength={1}
                  />
                  <Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>ft</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder, flex: 1 }]}
                    value={formHeightInches}
                    onChangeText={setFormHeightInches}
                    keyboardType="number-pad"
                    placeholder="9"
                    placeholderTextColor={textTertiary}
                    maxLength={2}
                  />
                  <Text style={{ color: textSecondary, fontSize: 14, fontWeight: '500' }}>in</Text>
                </View>
              ) : (
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder }]}
                  value={formHeight}
                  onChangeText={setFormHeight}
                  keyboardType="decimal-pad"
                  placeholder="175"
                  placeholderTextColor={textTertiary}
                  maxLength={5}
                />
              )}
            </View>
          </View>

          {/* Body Fat */}
          <Text style={[styles.fieldLabel, { color: textSecondary }]}>
            Body Fat % <Text style={{ color: textTertiary, fontSize: 11 }}>(optional, improves accuracy)</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder }]}
            value={formBodyFat}
            onChangeText={setFormBodyFat}
            keyboardType="decimal-pad"
            placeholder="e.g. 18"
            placeholderTextColor={textTertiary}
            maxLength={4}
          />
        </View>

        {/* ── Section: Weight Goal ── */}
        <View style={[styles.formSection, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow) }]}>
          <Text style={[styles.formSectionTitle, { color: textPrimary }]}>Weight Goal</Text>

          {/* Current + Target in a row */}
          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Current ({weightUnit === 'lbs' ? 'lbs' : 'kg'})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder }]}
                value={formWeight}
                onChangeText={setFormWeight}
                keyboardType="decimal-pad"
                placeholder={weightUnit === 'lbs' ? '163' : '74'}
                placeholderTextColor={textTertiary}
                maxLength={6}
              />
            </View>
            <View style={styles.formRowArrow}>
              <MaterialIcons name="arrow-forward" size={20} color={textTertiary} />
            </View>
            <View style={styles.formRowItem}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Target ({weightUnit === 'lbs' ? 'lbs' : 'kg'})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder }]}
                value={formTargetWeight}
                onChangeText={setFormTargetWeight}
                keyboardType="decimal-pad"
                placeholder={weightUnit === 'lbs' ? '143' : '65'}
                placeholderTextColor={textTertiary}
                maxLength={6}
              />
            </View>
          </View>

          {/* Smart Goal Badge — auto-detected */}
          {smartGoalInfo && (
            <View style={[styles.smartGoalBadge, { backgroundColor: smartGoalInfo.color + '12', borderColor: smartGoalInfo.color + '25' }]}>
              <MaterialIcons name={smartGoalInfo.icon} size={18} color={smartGoalInfo.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.smartGoalLabel, { color: smartGoalInfo.color }]}>{smartGoalInfo.label}</Text>
                <Text style={[styles.smartGoalDesc, { color: textSecondary }]}>{smartGoalInfo.desc}</Text>
              </View>
              <MaterialIcons name="auto-awesome" size={16} color={smartGoalInfo.color} />
            </View>
          )}
        </View>

        {/* ── Section: Activity Level ── */}
        <View style={[styles.formSection, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow) }]}>
          <Text style={[styles.formSectionTitle, { color: textPrimary }]}>Activity Level</Text>

          <View style={styles.activityGrid}>
            {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.activityCard,
                  {
                    backgroundColor: formActivity === key ? theme.primary + '12' : inputBg,
                    borderColor: formActivity === key ? theme.primary : cardBorder,
                  },
                ]}
                onPress={() => { hapticFeedback.light(); setFormActivity(key); }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={ACTIVITY_ICONS[key] || 'directions-run'}
                  size={22}
                  color={formActivity === key ? theme.primary : textTertiary}
                />
                <Text
                  style={[
                    styles.activityCardLabel,
                    { color: formActivity === key ? theme.primary : textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {formActivity === key && (
                  <View style={[styles.activityCheckDot, { backgroundColor: theme.primary }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={[styles.calculateButton, { backgroundColor: theme.primary, opacity: calculatingPlan ? 0.7 : 1 }]}
          onPress={handleSaveProfile}
          disabled={calculatingPlan}
          activeOpacity={0.85}
        >
          {calculatingPlan ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.calculateButtonText}>Analysing your profile...</Text>
            </>
          ) : (
            <>
              <MaterialIcons name="auto-awesome" size={22} color="#FFFFFF" />
              <Text style={styles.calculateButtonText}>
                {editingProfile ? 'Update My Plan' : 'Create My Plan'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.aiDisclaimer, { color: textTertiary }]}>
          Your calorie and macro targets are personalised based on your body profile, goals, and activity level
        </Text>
      </View>
    </Animated.View>
  );

  // ════════════════════════════════════════════════════
  //  RENDER: DASHBOARD
  // ════════════════════════════════════════════════════

  const renderDashboard = () => {
    const targets = dailyProgress?.targets || { calories: 2000, protein: 150, carbs: 250, fat: 65 };
    const consumedData = dailyProgress?.consumed || { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const macros = [
      { label: 'Protein', current: consumedData.protein, target: targets.protein, color: '#6366F1', icon: 'fitness-center' },
      { label: 'Carbs', current: consumedData.carbs, target: targets.carbs, color: '#F59E0B', icon: 'grain' },
      { label: 'Fat', current: consumedData.fat, target: targets.fat, color: '#EF4444', icon: 'water-drop' },
    ];

    const overCal = consumed > calorieTarget;
    const ringColor = overCal ? '#EF4444' : theme.primary;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* ── Header ── */}
        <View style={[styles.dashHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={22} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.dashTitle, { color: textPrimary }]}>Fuel</Text>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => { hapticFeedback.light(); setEditingProfile(true); }}
          >
            <MaterialIcons name="tune" size={20} color={textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Card 0: Calorie Ring ── */}
        <Animated.View
          style={[
            styles.ringCard,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              opacity: cardFadeAnims[0],
              transform: [{ translateY: cardSlideAnims[0] }],
              ...(!isDark && styles.cardShadow),
            },
          ]}
        >
          {/* Subtle gradient accent at top */}
          <LinearGradient
            colors={isDark ? [theme.primary + '15', 'transparent'] : [theme.primary + '08', 'transparent']}
            style={styles.ringGradientBg}
          />

          <View style={styles.ringContainer}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Defs>
                <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor={overCal ? '#EF4444' : theme.primary} />
                  <Stop offset="100%" stopColor={overCal ? '#F87171' : (theme.primaryLight || '#818CF8')} />
                </SvgGradient>
              </Defs>
              {/* Background track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={isDark ? 'rgba(255,255,255,0.06)' : '#F0F0F5'}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              {/* Progress arc */}
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="url(#ringGrad)"
                strokeWidth={RING_STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringProgress}
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={[styles.ringCalories, { color: textPrimary }]}>
                {remaining}
              </Text>
              <Text style={[styles.ringLabel, { color: textSecondary }]}>
                cal remaining
              </Text>
            </View>
          </View>

          {/* Eaten / Target stats */}
          <View style={styles.ringStats}>
            <View style={[styles.ringStatBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FC' }]}>
              <View style={[styles.ringStatDot, { backgroundColor: ringColor }]} />
              <Text style={[styles.ringStatValue, { color: textPrimary }]}>{consumed}</Text>
              <Text style={[styles.ringStatLabel, { color: textSecondary }]}>Eaten</Text>
            </View>
            <View style={[styles.ringStatBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FC' }]}>
              <View style={[styles.ringStatDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.ringStatValue, { color: textPrimary }]}>{calorieTarget}</Text>
              <Text style={[styles.ringStatLabel, { color: textSecondary }]}>Target</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Card 1: Macros ── */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              opacity: cardFadeAnims[1],
              transform: [{ translateY: cardSlideAnims[1] }],
              ...(!isDark && styles.cardShadow),
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: textPrimary }]}>Macros</Text>
          {macros.map((m) => {
            const pct = m.target > 0 ? Math.min(m.current / m.target, 1) : 0;
            return (
              <View key={m.label} style={styles.macroRow}>
                <View style={styles.macroLabelRow}>
                  <View style={[styles.macroIconBox, { backgroundColor: m.color + '14' }]}>
                    <MaterialIcons name={m.icon} size={14} color={m.color} />
                  </View>
                  <Text style={[styles.macroLabel, { color: textPrimary }]}>{m.label}</Text>
                  <Text style={[styles.macroValue, { color: textSecondary }]}>
                    {m.current}g <Text style={{ color: textTertiary }}>/ {m.target}g</Text>
                  </Text>
                </View>
                <View style={[styles.macroBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F0F0F5' }]}>
                  <LinearGradient
                    colors={[m.color, m.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.macroBarFill, { width: `${Math.max(pct * 100, 1)}%` }]}
                  />
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* ── Card 2: Stats row ── */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              opacity: cardFadeAnims[2],
              transform: [{ translateY: cardSlideAnims[2] }],
              ...(!isDark && styles.cardShadow),
            },
          ]}
        >
          <View style={styles.statsRow}>
            {[
              { icon: 'local-fire-department', value: weeklyAvg, label: 'Weekly Avg', color: theme.primary },
              { icon: 'whatshot', value: streak, label: 'Day Streak', color: '#F59E0B' },
              { icon: 'restaurant', value: dailyLog.foods?.length || 0, label: 'Meals Today', color: '#10B981' },
            ].map((s, i) => (
              <View key={s.label} style={styles.statItem}>
                <View style={[styles.statIconCircle, { backgroundColor: s.color + '14' }]}>
                  <MaterialIcons name={s.icon} size={20} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: textPrimary }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: textTertiary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Card 3: Today's Log ── */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              opacity: cardFadeAnims[3],
              transform: [{ translateY: cardSlideAnims[3] }],
              ...(!isDark && styles.cardShadow),
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>Today's Log</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: theme.primary + '14' }]}
              onPress={openAddFood}
            >
              <MaterialIcons name="add" size={18} color={theme.primary} />
              <Text style={[styles.addBtnText, { color: theme.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {(!dailyLog.foods || dailyLog.foods.length === 0) ? (
            <View style={styles.emptyLog}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FC' }]}>
                <MaterialIcons name="restaurant-menu" size={32} color={textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: textSecondary }]}>
                No meals logged yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: textTertiary }]}>
                Tap the button below to log your first meal
              </Text>
              <TouchableOpacity
                style={[styles.emptyLogButton, { backgroundColor: theme.primary }]}
                onPress={openAddFood}
              >
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyLogButtonText}>Log Your First Meal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            dailyLog.foods.map((food, idx) => (
              <TouchableOpacity
                key={food.id || idx}
                style={[
                  styles.foodItem,
                  idx < dailyLog.foods.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: cardBorder,
                  },
                ]}
                onLongPress={() => handleDeleteFood(food.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.foodIcon, { backgroundColor: theme.primary + '12' }]}>
                  <MaterialIcons name="restaurant" size={16} color={theme.primary} />
                </View>
                <View style={styles.foodInfo}>
                  <Text style={[styles.foodName, { color: textPrimary }]}>{food.name}</Text>
                  <Text style={[styles.foodMacros, { color: textTertiary }]}>
                    P: {food.protein}g  C: {food.carbs}g  F: {food.fat}g
                  </Text>
                </View>
                <View style={styles.foodCalContainer}>
                  <Text style={[styles.foodCal, { color: textPrimary }]}>{food.calories}</Text>
                  <Text style={[styles.foodCalLabel, { color: textTertiary }]}>cal</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>

        {/* ── Card 4: Favorites ── */}
        {favorites.length > 0 && (
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                opacity: cardFadeAnims[4],
                transform: [{ translateY: cardSlideAnims[4] }],
                ...(!isDark && styles.cardShadow),
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: textPrimary, marginBottom: 14 }]}>Quick Add</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {favorites.slice(0, 10).map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  style={[styles.favChip, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FC',
                    borderColor: cardBorder,
                  }]}
                  onPress={() => handleAddFromFavorite(fav)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.favChipName, { color: textPrimary }]}>{fav.name}</Text>
                  <Text style={[styles.favChipCal, { color: textTertiary }]}>{fav.calories} cal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <View style={{ height: 90 }} />
      </Animated.View>
    );
  };

  // ════════════════════════════════════════════════════
  //  RENDER: ADD FOOD MODAL (custom animated sheet)
  // ════════════════════════════════════════════════════

  const renderAddFoodModal = () => {
    if (!modalMounted) return null;

    return (
      <View style={styles.modalOverlayAbsolute} pointerEvents={addFoodVisible ? 'auto' : 'none'}>
        {/* Backdrop — fades in smoothly, dims on drag */}
        <Animated.View
          style={[styles.modalBackdrop, {
            opacity: Animated.multiply(
              modalBackdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
              modalDragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.2], extrapolate: 'clamp' }),
            ),
          }]}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeAddFood} />
        </Animated.View>

        {/* Sheet — slides up with spring */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                transform: [
                  {
                    translateY: Animated.add(
                      modalSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, SCREEN_HEIGHT],
                      }),
                      modalDragY,
                    ),
                  },
                ],
              },
            ]}
          >
            {/* Drag handle area — swipe down to dismiss */}
            <View {...modalPanResponder.panHandlers}>
              <View style={[styles.modalHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)' }]} />

              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Add Food</Text>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
                  onPress={closeAddFood}
                >
                  <MaterialIcons name="close" size={18} color={textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll} bounces={false}>
              {/* Mode selection (if no mode chosen yet) */}
              {!addFoodMode && (
                <View style={styles.modeSelection}>
                  {/* Scan with Camera */}
                  <TouchableOpacity
                    style={[styles.modeCard, { backgroundColor: inputBg, borderColor: cardBorder }]}
                    onPress={handleCameraAnalysis}
                  >
                    <View style={[styles.modeIconCircle, { backgroundColor: '#6366F1' + '14' }]}>
                      <MaterialIcons name="camera-alt" size={24} color="#6366F1" />
                    </View>
                    <View style={styles.modeCardText}>
                      <Text style={[styles.modeCardTitle, { color: textPrimary }]}>Scan Food</Text>
                      <Text style={[styles.modeCardDesc, { color: textTertiary }]}>
                        Take a photo to get instant nutrition info
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={textTertiary} />
                  </TouchableOpacity>

                  {/* Import from Photos */}
                  <TouchableOpacity
                    style={[styles.modeCard, { backgroundColor: inputBg, borderColor: cardBorder }]}
                    onPress={handlePhotoLibraryAnalysis}
                  >
                    <View style={[styles.modeIconCircle, { backgroundColor: '#8B5CF6' + '14' }]}>
                      <MaterialIcons name="photo-library" size={24} color="#8B5CF6" />
                    </View>
                    <View style={styles.modeCardText}>
                      <Text style={[styles.modeCardTitle, { color: textPrimary }]}>Import Photo</Text>
                      <Text style={[styles.modeCardDesc, { color: textTertiary }]}>
                        Choose a food photo from your library
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={textTertiary} />
                  </TouchableOpacity>

                  {/* Enter Manually */}
                  <TouchableOpacity
                    style={[styles.modeCard, { backgroundColor: inputBg, borderColor: cardBorder }]}
                    onPress={() => setAddFoodMode('manual')}
                  >
                    <View style={[styles.modeIconCircle, { backgroundColor: '#10B981' + '14' }]}>
                      <MaterialIcons name="edit" size={24} color="#10B981" />
                    </View>
                    <View style={styles.modeCardText}>
                      <Text style={[styles.modeCardTitle, { color: textPrimary }]}>Enter Manually</Text>
                      <Text style={[styles.modeCardDesc, { color: textTertiary }]}>
                        Type food name or enter calories
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={textTertiary} />
                  </TouchableOpacity>

                  {/* Favorite Meals */}
                  <TouchableOpacity
                    style={[styles.modeCard, { backgroundColor: inputBg, borderColor: cardBorder }]}
                    onPress={() => setAddFoodMode('favorites')}
                  >
                    <View style={[styles.modeIconCircle, { backgroundColor: '#F59E0B' + '14' }]}>
                      <MaterialIcons name="star" size={24} color="#F59E0B" />
                    </View>
                    <View style={styles.modeCardText}>
                      <Text style={[styles.modeCardTitle, { color: textPrimary }]}>Favorite Meals</Text>
                      <Text style={[styles.modeCardDesc, { color: textTertiary }]}>
                        {favorites.length > 0
                          ? `${favorites.length} saved — select one or more`
                          : 'No favorites yet — scan or enter food to save'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={textTertiary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Analyzing state */}
              {analyzing && (
                <View style={styles.analyzingContainer}>
                  {foodPhotoUri && (
                    <View style={styles.analyzingPhotoWrap}>
                      <Image source={{ uri: foodPhotoUri }} style={styles.analyzingPhoto} />
                      <View style={styles.analyzingPhotoOverlay}>
                        <Animated.View style={[styles.analyzingScanLine, {
                          transform: [{
                            translateY: scanLineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-70, 70],
                            }),
                          }],
                        }]} />
                      </View>
                      <View style={styles.analyzingPulseRing} />
                    </View>
                  )}
                  {!foodPhotoUri && (
                    <View style={[styles.analyzingCircle, { backgroundColor: theme.primary + '10' }]}>
                      <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                  )}
                  <Text style={[styles.analyzingText, { color: textPrimary }]}>
                    {foodPhotoUri ? 'Scanning your meal...' : 'Analyzing your food...'}
                  </Text>
                  <Text style={[styles.analyzingSubtext, { color: textTertiary }]}>
                    This may take a few seconds
                  </Text>
                  {foodPhotoUri && (
                    <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 12 }} />
                  )}
                </View>
              )}

              {/* ═══ SCAN RESULT CARD ═══ */}
              {addFoodMode === 'scanResult' && !analyzing && (
                <View style={styles.scanResultContainer}>
                  {/* Hero photo with gradient overlay — ANIMATED */}
                  {foodPhotoUri && (
                    <Animated.View style={[styles.scanPhotoHero, {
                      opacity: scanPhotoOpacity,
                      transform: [{ scale: scanPhotoScale }],
                    }]}>
                      <Image source={{ uri: foodPhotoUri }} style={styles.scanPhotoImage} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.65)']}
                        style={styles.scanPhotoGradient}
                      />
                      <View style={styles.scanPhotoLabel}>
                        <View style={styles.scanSuccessBadge}>
                          <MaterialIcons name="check-circle" size={14} color="#34D399" />
                          <Text style={styles.scanSuccessText}>Identified</Text>
                        </View>
                      </View>
                    </Animated.View>
                  )}

                  {/* Food title + description — ANIMATED slide up */}
                  <Animated.View style={[styles.scanInfoSection, {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    opacity: scanInfoOpacity,
                    transform: [{ translateY: scanInfoSlide }],
                  }]}>
                    <Text style={[styles.scanFoodName, { color: textPrimary }]}>{foodName}</Text>
                    {foodDescription ? (
                      <Text style={[styles.scanFoodDesc, { color: textTertiary }]}>{foodDescription}</Text>
                    ) : null}

                    {analyzedFood?.portionSize ? (
                      <View style={[styles.scanPortionBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
                        <MaterialIcons name="straighten" size={14} color={textTertiary} />
                        <Text style={[styles.scanPortionText, { color: textSecondary }]}>
                          {analyzedFood.portionSize}
                        </Text>
                      </View>
                    ) : null}
                  </Animated.View>

                  {/* Calorie hero number — ANIMATED scale pop + count-up */}
                  <Animated.View style={[styles.scanCalorieHero, {
                    backgroundColor: isDark ? '#2C2C2E' : '#F8F9FF',
                    opacity: scanCalorieOpacity,
                    transform: [{ scale: scanCalorieScale }],
                  }]}>
                    <Text style={[styles.scanCalorieNumber, { color: theme.primary }]}>
                      {displayCalories}
                    </Text>
                    <Text style={[styles.scanCalorieLabel, { color: textTertiary }]}>calories</Text>
                  </Animated.View>

                  {/* Macro breakdown — 3 pill cards, ANIMATED bounce in */}
                  <View style={styles.scanMacroRow}>
                    {[
                      { color: '#6366F1', value: foodProtein, label: 'Protein', idx: 0 },
                      { color: '#F59E0B', value: foodCarbs, label: 'Carbs', idx: 1 },
                      { color: '#EF4444', value: foodFat, label: 'Fat', idx: 2 },
                    ].map((macro) => (
                      <Animated.View
                        key={macro.label}
                        style={[styles.scanMacroPill, {
                          backgroundColor: isDark ? '#2C2C2E' : '#FFF',
                          opacity: scanMacroPillAnims[macro.idx].opacity,
                          transform: [{ scale: scanMacroPillAnims[macro.idx].scale }],
                        }]}
                      >
                        <View style={[styles.scanMacroDot, { backgroundColor: macro.color }]} />
                        <Text style={[styles.scanMacroValue, { color: textPrimary }]}>{macro.value}g</Text>
                        <Text style={[styles.scanMacroLabel, { color: textTertiary }]}>{macro.label}</Text>
                      </Animated.View>
                    ))}
                  </View>

                  {/* Calorie distribution bar — ANIMATED width grow */}
                  <Animated.View style={[styles.scanDistBar, {
                    backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6',
                    opacity: scanBarWidth,
                    transform: [{ scaleX: scanBarWidth }],
                  }]}>
                    {(() => {
                      const p = parseInt(foodProtein) || 0;
                      const c = parseInt(foodCarbs) || 0;
                      const f = parseInt(foodFat) || 0;
                      const total = p + c + f || 1;
                      return (
                        <View style={styles.scanDistBarInner}>
                          <View style={[styles.scanDistSeg, { flex: p / total, backgroundColor: '#6366F1', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
                          <View style={[styles.scanDistSeg, { flex: c / total, backgroundColor: '#F59E0B' }]} />
                          <View style={[styles.scanDistSeg, { flex: f / total, backgroundColor: '#EF4444', borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
                        </View>
                      );
                    })()}
                  </Animated.View>

                  {/* Action area — ANIMATED fade in + slide */}
                  <Animated.View style={{
                    opacity: scanActionsOpacity,
                    transform: [{ translateY: scanActionsSlide }],
                  }}>
                    {/* Save to favorites toggle */}
                    <TouchableOpacity
                      style={[styles.scanFavToggle, { backgroundColor: isDark ? '#2C2C2E' : '#F8F9FA', borderColor: cardBorder }]}
                      onPress={() => setSaveFavorite(!saveFavorite)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={saveFavorite ? 'star' : 'star-border'}
                        size={20}
                        color={saveFavorite ? '#F59E0B' : textTertiary}
                      />
                      <Text style={[styles.scanFavText, { color: textPrimary }]}>Save to favorites</Text>
                      <View style={{ flex: 1 }} />
                      <View style={[styles.favToggleCheck, {
                        backgroundColor: saveFavorite ? theme.primary : 'transparent',
                        borderColor: saveFavorite ? theme.primary : cardBorder,
                      }]}>
                        {saveFavorite && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>

                    {/* Save button */}
                    <TouchableOpacity
                      style={[styles.scanSaveBtn]}
                      onPress={handleSaveFood}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.scanSaveBtnGradient}
                      >
                        <MaterialIcons name="add-circle-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.scanSaveBtnText}>Add to Log</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.scanSecondaryRow}>
                      <TouchableOpacity
                        style={[styles.scanSecondaryBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}
                        onPress={() => {
                          setAddFoodMode('manual');
                          setFoodPhotoUri(null);
                        }}
                      >
                        <MaterialIcons name="edit" size={16} color={textSecondary} />
                        <Text style={[styles.scanSecondaryText, { color: textSecondary }]}>Edit Values</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.scanSecondaryBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}
                        onPress={() => {
                          setAddFoodMode(null);
                          setAnalyzedFood(null);
                          setFoodName('');
                          setFoodCalories('');
                          setFoodProtein('');
                          setFoodCarbs('');
                          setFoodFat('');
                          setFoodDescription('');
                          setFoodPhotoUri(null);
                        }}
                      >
                        <MaterialIcons name="refresh" size={16} color={textSecondary} />
                        <Text style={[styles.scanSecondaryText, { color: textSecondary }]}>Scan Again</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                </View>
              )}

              {/* Manual / Camera result form */}
              {(addFoodMode === 'manual' || addFoodMode === 'camera') && !analyzing && (
                <View style={styles.foodForm}>
                  <Text style={[styles.fieldLabel, { color: textPrimary }]}>Food Name</Text>
                  <View style={styles.foodNameRow}>
                    <TextInput
                      style={[styles.input, styles.foodNameInput, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder }]}
                      value={foodName}
                      onChangeText={setFoodName}
                      placeholder="e.g. Grilled Chicken Salad"
                      placeholderTextColor={textTertiary}
                    />
                    {addFoodMode === 'manual' && foodVisionService.isConfigured() && (
                      <TouchableOpacity
                        style={[styles.estimateButton, { backgroundColor: theme.primary }]}
                        onPress={handleEstimateFromText}
                      >
                        <MaterialIcons name="auto-fix-high" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.macroInputRow}>
                    <View style={styles.macroInputItem}>
                      <Text style={[styles.macroInputLabel, { color: textSecondary }]}>Calories</Text>
                      <TextInput
                        style={[styles.macroInput, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder }]}
                        value={foodCalories}
                        onChangeText={setFoodCalories}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={textTertiary}
                      />
                    </View>
                    <View style={styles.macroInputItem}>
                      <Text style={[styles.macroInputLabel, { color: textSecondary }]}>Protein (g)</Text>
                      <TextInput
                        style={[styles.macroInput, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder }]}
                        value={foodProtein}
                        onChangeText={setFoodProtein}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={textTertiary}
                      />
                    </View>
                  </View>

                  <View style={styles.macroInputRow}>
                    <View style={styles.macroInputItem}>
                      <Text style={[styles.macroInputLabel, { color: textSecondary }]}>Carbs (g)</Text>
                      <TextInput
                        style={[styles.macroInput, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder }]}
                        value={foodCarbs}
                        onChangeText={setFoodCarbs}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={textTertiary}
                      />
                    </View>
                    <View style={styles.macroInputItem}>
                      <Text style={[styles.macroInputLabel, { color: textSecondary }]}>Fat (g)</Text>
                      <TextInput
                        style={[styles.macroInput, { backgroundColor: inputBg, color: textPrimary, borderColor: cardBorder }]}
                        value={foodFat}
                        onChangeText={setFoodFat}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={textTertiary}
                      />
                    </View>
                  </View>

                  {/* Save to favorites toggle */}
                  <TouchableOpacity
                    style={[styles.favToggle, { backgroundColor: inputBg, borderColor: cardBorder }]}
                    onPress={() => setSaveFavorite(!saveFavorite)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={saveFavorite ? 'star' : 'star-border'}
                      size={20}
                      color={saveFavorite ? '#F59E0B' : textTertiary}
                    />
                    <Text style={[styles.favToggleText, { color: textPrimary }]}>
                      Save to favorites
                    </Text>
                    <View style={{ flex: 1 }} />
                    <View style={[styles.favToggleCheck, {
                      backgroundColor: saveFavorite ? theme.primary : 'transparent',
                      borderColor: saveFavorite ? theme.primary : cardBorder,
                    }]}>
                      {saveFavorite && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>

                  {/* Save button */}
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.primary }]}
                    onPress={handleSaveFood}
                  >
                    <MaterialIcons name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Add to Log</Text>
                  </TouchableOpacity>

                  {/* Back to modes */}
                  <TouchableOpacity
                    style={styles.backToModes}
                    onPress={() => {
                      setAddFoodMode(null);
                      setAnalyzedFood(null);
                      setFoodName('');
                      setFoodCalories('');
                      setFoodProtein('');
                      setFoodCarbs('');
                      setFoodFat('');
                      setFoodDescription('');
                      setFoodPhotoUri(null);
                    }}
                  >
                    <MaterialIcons name="arrow-back" size={16} color={textTertiary} />
                    <Text style={[styles.backToModesText, { color: textTertiary }]}>Other options</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Favorites list — multi-select */}
              {addFoodMode === 'favorites' && (
                <View style={styles.favListContainer}>
                  {favorites.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <MaterialIcons name="star-border" size={48} color={textTertiary} />
                      <Text style={[styles.favListName, { color: textPrimary, marginTop: 16, fontSize: 17 }]}>No Favorites Yet</Text>
                      <Text style={[styles.favListMacros, { color: textTertiary, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 }]}>
                        Scan or manually enter food, then toggle "Save to favorites" to build your list.
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.favSelectHint, { color: textTertiary }]}>
                        Tap to select, then add all at once
                      </Text>
                      {favorites.map((fav) => {
                        const isSelected = selectedFavoriteIds.includes(fav.id);
                        return (
                          <TouchableOpacity
                            key={fav.id}
                            style={[styles.favListItem, {
                              backgroundColor: isSelected ? (theme.primary + '12') : inputBg,
                              borderColor: isSelected ? theme.primary : cardBorder,
                            }]}
                            onPress={() => toggleFavoriteSelection(fav.id)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.favCheckbox, {
                              backgroundColor: isSelected ? theme.primary : 'transparent',
                              borderColor: isSelected ? theme.primary : textTertiary,
                            }]}>
                              {isSelected && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                            </View>
                            <View style={styles.favListInfo}>
                              <Text style={[styles.favListName, { color: textPrimary }]}>{fav.name}</Text>
                              <Text style={[styles.favListMacros, { color: textTertiary }]}>
                                P: {fav.protein}g  C: {fav.carbs}g  F: {fav.fat}g
                              </Text>
                            </View>
                            <View style={styles.favListRight}>
                              <Text style={[styles.favListCal, { color: textPrimary }]}>{fav.calories}</Text>
                              <Text style={[styles.favListCalLabel, { color: textTertiary }]}>cal</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {/* Add Selected button */}
                      {selectedFavoriteIds.length > 0 && (
                        <TouchableOpacity
                          style={[styles.addSelectedBtn, { backgroundColor: theme.primary }]}
                          onPress={handleAddSelectedFavorites}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="add-circle" size={20} color="#FFFFFF" />
                          <Text style={styles.addSelectedBtnText}>
                            Add {selectedFavoriteIds.length} {selectedFavoriteIds.length === 1 ? 'Meal' : 'Meals'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.backToModes}
                    onPress={() => { setAddFoodMode(null); setSelectedFavoriteIds([]); }}
                  >
                    <MaterialIcons name="arrow-back" size={16} color={textTertiary} />
                    <Text style={[styles.backToModesText, { color: textTertiary }]}>Other options</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: insets.bottom + 20 }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  // ════════════════════════════════════════════════════
  //  MAIN RENDER
  // ════════════════════════════════════════════════════

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: screenBg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // ════════════════════════════════════════════════════
  //  RENDER: PLAN RESULT (shown after analysis)
  // ════════════════════════════════════════════════════

  const renderPlanResult = () => {
    if (!planResult) return null;
    const goalLabels = { lose: 'Weight Loss', gain: 'Muscle Gain', maintain: 'Maintenance' };
    const goalColors = { lose: '#EF4444', gain: '#10B981', maintain: '#6366F1' };
    const goalLabel = goalLabels[planResult.goal] || 'Maintenance';
    const goalColor = goalColors[planResult.goal] || '#6366F1';

    return (
      <View style={{ flex: 1 }}>
        <View style={[styles.dashHeader, { paddingTop: insets.top + 8 }]}>
          <View style={{ width: 44 }} />
          <Text style={[styles.dashTitle, { color: textPrimary }]}>Your Plan</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Plan type badge */}
        <View style={[styles.resultBadge, { backgroundColor: goalColor + '12', borderColor: goalColor + '25' }]}>
          <Text style={[styles.resultBadgeText, { color: goalColor }]}>{goalLabel} Plan</Text>
        </View>

        {/* Big calorie number */}
        <View style={styles.resultCalorieBox}>
          <Text style={[styles.resultCalorieNum, { color: textPrimary }]}>{planResult.dailyCalories}</Text>
          <Text style={[styles.resultCalorieLabel, { color: textSecondary }]}>calories per day</Text>
        </View>

        {/* Macro breakdown */}
        <View style={[styles.resultMacroCard, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow) }]}>
          {[
            { label: 'Protein', value: planResult.protein, unit: 'g', color: '#6366F1', icon: 'fitness-center' },
            { label: 'Carbs', value: planResult.carbs, unit: 'g', color: '#F59E0B', icon: 'grain' },
            { label: 'Fat', value: planResult.fat, unit: 'g', color: '#EF4444', icon: 'water-drop' },
          ].map((m, i) => (
            <View key={m.label} style={[styles.resultMacroItem, i < 2 && { borderRightWidth: 1, borderRightColor: cardBorder }]}>
              <View style={[styles.resultMacroIcon, { backgroundColor: m.color + '14' }]}>
                <MaterialIcons name={m.icon} size={18} color={m.color} />
              </View>
              <Text style={[styles.resultMacroValue, { color: textPrimary }]}>{m.value}{m.unit}</Text>
              <Text style={[styles.resultMacroLabel, { color: textTertiary }]}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Explanation */}
        {planResult.explanation ? (
          <View style={[styles.resultExplanationCard, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow) }]}>
            <MaterialIcons name="lightbulb" size={18} color="#F59E0B" style={{ marginTop: 2 }} />
            <Text style={[styles.resultExplanationText, { color: textSecondary }]}>
              {planResult.explanation}
            </Text>
          </View>
        ) : null}

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.calculateButton, { backgroundColor: theme.primary, marginHorizontal: 0 }]}
          onPress={() => {
            hapticFeedback.medium();
            setPlanResult(null);
            setEditingProfile(false);
            loadData();
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.calculateButtonText}>Let's Go</Text>
          <MaterialIcons name="arrow-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const showSetup = !profile || editingProfile;
  const showPlanResult = !!planResult;

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showPlanResult ? renderPlanResult() : showSetup ? renderSetupForm() : renderDashboard()}
      </ScrollView>

      {/* Floating Add Button */}
      {!showSetup && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 24 }]}
          onPress={openAddFood}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {renderAddFoodModal()}
    </View>
  );
};

// ════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // ─── Header ───
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dashTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ─── Card base ───
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  // ─── Ring Card ───
  ringCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 14,
    overflow: 'hidden',
  },
  ringGradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringCalories: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  ringLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  ringStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  ringStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 4,
  },
  ringStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  ringStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  ringStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ─── Macros ───
  macroRow: {
    marginTop: 16,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  macroBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 5,
  },

  // ─── Stats Row ───
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // ─── Add button ───
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── Food Log ───
  emptyLog: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  emptyLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  emptyLogButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  foodIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
  },
  foodMacros: {
    fontSize: 12,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  foodCalContainer: {
    alignItems: 'flex-end',
  },
  foodCal: {
    fontSize: 17,
    fontWeight: '700',
  },
  foodCalLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },

  // ─── Favorites ───
  favChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 90,
  },
  favChipName: {
    fontSize: 13,
    fontWeight: '600',
  },
  favChipCal: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },

  // ─── FAB ───
  fab: {
    position: 'absolute',
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  // ─── Setup Form ───
  setupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  setupTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  setupContent: {
    paddingBottom: 40,
  },
  setupSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
    textAlign: 'center',
  },
  formSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  formRowItem: {
    flex: 1,
  },
  formRowArrow: {
    paddingBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.06)',
  },
  lockedText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  birthdayInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  birthdayText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  ageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ageBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  smartGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
    gap: 10,
    borderWidth: 1,
  },
  smartGoalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  smartGoalDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityCard: {
    width: (SCREEN_WIDTH - 40 - 36 - 24) / 3,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  activityCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityCheckDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 10,
    marginTop: 20,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  aiDisclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
    paddingHorizontal: 20,
  },

  // ─── Plan Result ───
  resultBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  resultBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resultCalorieBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  resultCalorieNum: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
  },
  resultCalorieLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  resultMacroCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
  },
  resultMacroItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  resultMacroIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultMacroValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  resultMacroLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultExplanationCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  resultExplanationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },

  // ─── Add Food Modal ───
  modalOverlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  modalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    paddingHorizontal: 20,
  },

  // ─── Mode Selection ───
  modeSelection: {
    gap: 10,
    paddingBottom: 20,
  },
  modeCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  modeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeCardText: {
    flex: 1,
  },
  modeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  modeCardDesc: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },

  // ─── Analyzing ───
  analyzingContainer: {
    alignItems: 'center',
    paddingVertical: 44,
    gap: 10,
  },
  analyzingCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  analyzingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  analyzingSubtext: {
    fontSize: 13,
  },
  analyzingPhotoWrap: {
    width: 160,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  analyzingPhoto: {
    width: '100%',
    height: '100%',
  },
  analyzingPhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(99,102,241,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingScanLine: {
    width: '90%',
    height: 3,
    backgroundColor: '#6366F1',
    borderRadius: 2,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzingPulseRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.3)',
  },

  // ─── Scan Result Card ───
  scanResultContainer: {
    paddingBottom: 10,
  },
  scanPhotoHero: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  scanPhotoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  scanPhotoGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
  },
  scanPhotoLabel: {
    position: 'absolute',
    bottom: 12,
    left: 14,
  },
  scanSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  scanSuccessText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '600',
  },
  scanInfoSection: {
    paddingHorizontal: 2,
    paddingBottom: 14,
  },
  scanFoodName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scanFoodDesc: {
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 6,
  },
  scanPortionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  scanPortionText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  scanCalorieHero: {
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  scanCalorieNumber: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  scanCalorieLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: -2,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  scanMacroRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  scanMacroPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  scanMacroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  scanMacroValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scanMacroLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scanDistBar: {
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  scanDistBarInner: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 6,
    overflow: 'hidden',
    gap: 2,
  },
  scanDistSeg: {
    height: '100%',
  },
  scanFavToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  scanFavText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scanSaveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  scanSaveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  scanSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  scanSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scanSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  scanSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── Food Form ───
  foodForm: {
    paddingBottom: 20,
  },
  foodNameRow: {
    flexDirection: 'row',
    gap: 8,
  },
  foodNameInput: {
    flex: 1,
  },
  estimateButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  macroInputItem: {
    flex: 1,
  },
  macroInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  macroInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
  },
  favToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  favToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  favToggleCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    gap: 8,
    marginTop: 18,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backToModes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  backToModesText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ─── Favorites List ───
  favListContainer: {
    gap: 8,
    paddingBottom: 20,
  },
  favListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
  },
  favListIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favListInfo: {
    flex: 1,
  },
  favListName: {
    fontSize: 15,
    fontWeight: '600',
  },
  favListMacros: {
    fontSize: 12,
    marginTop: 2,
  },
  favListRight: {
    alignItems: 'flex-end',
  },
  favListCal: {
    fontSize: 16,
    fontWeight: '700',
  },
  favListCalLabel: {
    fontSize: 11,
  },
  favSelectHint: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  favCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  addSelectedBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default NutritionScreen;
