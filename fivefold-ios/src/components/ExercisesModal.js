import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Linking,
  Dimensions,
  Animated as RNAnimated,
  PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import ExercisesService from '../services/exercisesService';
import { hapticFeedback } from '../utils/haptics';
import CustomLoadingIndicator from './CustomLoadingIndicator';
import AddExerciseModal from './AddExerciseModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.92;
const DISMISS_THRESHOLD = SHEET_HEIGHT * 0.22;
const VELOCITY_THRESHOLD = 700;
const SPRING_CONFIG = { damping: 22, stiffness: 220, mass: 0.8 };

const ExercisesModal = ({ visible, onClose, onSelectExercise, selectionMode = false, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = { top: Platform.OS === 'ios' ? 50 : 24, bottom: 0, left: 0, right: 0 };
  const textPrimary = theme.text;
  const scrollViewRef = useRef(null);
  const sectionRefs = useRef({});
  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('Any Body Part');
  const [selectedCategory, setSelectedCategory] = useState('Any Category');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showCustomExercisesModal, setShowCustomExercisesModal] = useState(false);

  // Options popup mount + animation state (ported from NutritionScreen Add Food modal)
  const [optionsMounted, setOptionsMounted] = useState(false);
  const optionsBackdropAnim = useRef(new RNAnimated.Value(0)).current;
  const optionsSlideAnim = useRef(new RNAnimated.Value(1)).current;
  const optionsDragY = useRef(new RNAnimated.Value(0)).current;

  const optionsPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) =>
      gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2,
    onPanResponderGrant: () => {
      optionsDragY.setValue(0);
    },
    onPanResponderMove: RNAnimated.event(
      [null, { dy: optionsDragY }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100 || gs.vy > 0.5) {
        RNAnimated.parallel([
          RNAnimated.timing(optionsDragY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }),
          RNAnimated.timing(optionsBackdropAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowFilterMenu(false);
          setOptionsMounted(false);
          optionsDragY.setValue(0);
          optionsSlideAnim.setValue(1);
        });
      } else {
        RNAnimated.spring(optionsDragY, {
          toValue: 0,
          damping: 25,
          stiffness: 300,
          useNativeDriver: true,
        }).start();
      }
    },
  }), []);

  const openOptionsMenu = () => {
    hapticFeedback.light();
    optionsDragY.setValue(0);
    setOptionsMounted(true);
    setShowFilterMenu(true);
    requestAnimationFrame(() => {
      RNAnimated.parallel([
        RNAnimated.timing(optionsBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        RNAnimated.spring(optionsSlideAnim, {
          toValue: 0,
          damping: 28,
          stiffness: 300,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeOptionsMenu = (onClosed) => {
    RNAnimated.parallel([
      RNAnimated.timing(optionsBackdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.timing(optionsSlideAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowFilterMenu(false);
      setOptionsMounted(false);
      optionsDragY.setValue(0);
      optionsSlideAnim.setValue(1);
      if (typeof onClosed === 'function') onClosed();
    });
  };

  // Generic Picker popup state (Body Part / Category) — matches Add Food style
  const [activePicker, setActivePicker] = useState(null); // 'bodyPart' | 'category' | null
  const [pickerMounted, setPickerMounted] = useState(false);
  const pickerBackdropAnim = useRef(new RNAnimated.Value(0)).current;
  const pickerSlideAnim = useRef(new RNAnimated.Value(1)).current;
  const pickerDragY = useRef(new RNAnimated.Value(0)).current;

  const pickerPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) =>
      gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2,
    onPanResponderGrant: () => {
      pickerDragY.setValue(0);
    },
    onPanResponderMove: RNAnimated.event(
      [null, { dy: pickerDragY }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100 || gs.vy > 0.5) {
        RNAnimated.parallel([
          RNAnimated.timing(pickerDragY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pickerBackdropAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setActivePicker(null);
          setPickerMounted(false);
          pickerDragY.setValue(0);
          pickerSlideAnim.setValue(1);
        });
      } else {
        RNAnimated.spring(pickerDragY, {
          toValue: 0,
          damping: 25,
          stiffness: 300,
          useNativeDriver: true,
        }).start();
      }
    },
  }), []);

  const openPicker = (type) => {
    hapticFeedback.light();
    pickerDragY.setValue(0);
    setPickerMounted(true);
    setActivePicker(type);
    requestAnimationFrame(() => {
      RNAnimated.parallel([
        RNAnimated.timing(pickerBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        RNAnimated.spring(pickerSlideAnim, {
          toValue: 0,
          damping: 28,
          stiffness: 300,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closePicker = (onClosed) => {
    RNAnimated.parallel([
      RNAnimated.timing(pickerBackdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      RNAnimated.timing(pickerSlideAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActivePicker(null);
      setPickerMounted(false);
      pickerDragY.setValue(0);
      pickerSlideAnim.setValue(1);
      if (typeof onClosed === 'function') onClosed();
    });
  };


  // Load exercises data
  useEffect(() => {
    if (visible) {
      loadExercises();
    }
  }, [visible]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🏋️ Loading exercises...');
      const data = await ExercisesService.getExercises();
      console.log('🏋️ Exercises loaded:', data.length, 'exercises');
      console.log('🏋️ First exercise:', data[0]);
      console.log('🏋️ Exercises by letter:');
      const letterCount = {};
      data.forEach(ex => {
        const letter = ex.name[0].toUpperCase();
        letterCount[letter] = (letterCount[letter] || 0) + 1;
      });
      console.log('🏋️ Letter counts:', letterCount);
      setExercises(data);
      setFilteredExercises(data);
    } catch (err) {
      console.error('Error loading exercises:', err);
      setError('Unable to load exercises. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await ExercisesService.refresh();
      await loadExercises();
      hapticFeedback.success();
    } catch (err) {
      console.error('Error refreshing exercises:', err);
      hapticFeedback.error();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddExercise = async (exercise) => {
    try {
      await ExercisesService.addCustomExercise(exercise);
      setShowAddExerciseModal(false);
      await loadExercises();
      hapticFeedback.success();
      Alert.alert('Success', 'Custom exercise added successfully');
    } catch (error) {
      console.error('Error adding custom exercise:', error);
      hapticFeedback.error();
      Alert.alert('Error', 'Failed to add custom exercise');
    }
  };

  const handleDeleteCustomExercise = async (exerciseId) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this custom exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ExercisesService.deleteCustomExercise(exerciseId);
              await loadExercises();
              hapticFeedback.success();
            } catch (error) {
              console.error('Error deleting custom exercise:', error);
              hapticFeedback.error();
              Alert.alert('Error', 'Failed to delete custom exercise');
            }
          },
        },
      ]
    );
  };

  // Filter exercises based on search and filters
  useEffect(() => {
    let filtered = exercises;

    console.log('🔍 Filtering - Starting with:', exercises.length, 'exercises');
    console.log('🔍 Search query:', searchQuery);
    console.log('🔍 Selected body part:', selectedBodyPart);
    console.log('🔍 Selected category:', selectedCategory);

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.bodyPart.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.equipment.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('🔍 After search filter:', filtered.length, 'exercises');
    }

    // Body part filter
    if (selectedBodyPart !== 'Any Body Part') {
      filtered = filtered.filter(exercise => exercise.bodyPart === selectedBodyPart);
      console.log('🔍 After body part filter:', filtered.length, 'exercises');
    }

    // Category filter
    if (selectedCategory !== 'Any Category') {
      filtered = filtered.filter(exercise => exercise.category === selectedCategory);
      console.log('🔍 After category filter:', filtered.length, 'exercises');
    }

    console.log('🔍 Final filtered count:', filtered.length, 'exercises');
    setFilteredExercises(filtered);
  }, [searchQuery, selectedBodyPart, selectedCategory, exercises]);

  // Get unique body parts for filter
  const bodyParts = ['Any Body Part', ...new Set(exercises.map(e => e.bodyPart))];
  const categories = ['Any Category', ...new Set(exercises.map(e => e.category))];

  // Group exercises alphabetically
  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    const firstLetter = exercise.name[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(exercise);
    return acc;
  }, {});

  // Alphabetical inside each letter too (the library + custom list arrive in
  // insertion order, which put "Ab Crunch Machine" after "Around the World")
  Object.values(groupedExercises).forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));

  // Sort sections alphabetically
  const sortedSections = Object.keys(groupedExercises).sort();
  
  console.log('📊 DEBUG - filteredExercises.length:', filteredExercises.length);
  console.log('📊 DEBUG - sortedSections:', sortedSections);
  console.log('📊 DEBUG - First section exercises:', sortedSections[0] ? groupedExercises[sortedSections[0]]?.length : 0);

  // Get alphabet for quick navigation
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // A-Z strip: press anywhere and slide, the list follows. Letters with no
  // entries jump to the next letter that has some, so the drag never stalls.
  const [stripH, setStripH] = useState(0);
  const [scrubLetter, setScrubLetter] = useState(null);
  const lastScrubRef = useRef(null);
  const jumpToLetter = (letter, animated) => {
    const have = sortedSections;
    const target = have.includes(letter) ? letter : (have.find((l) => l > letter) || have[have.length - 1]);
    if (!target || sectionRefs.current[target] === undefined) return null;
    scrollViewRef.current?.scrollTo({ y: sectionRefs.current[target], animated });
    return target;
  };
  const scrubTo = (y) => {
    const n = alphabet.length;
    const i = Math.max(0, Math.min(n - 1, Math.floor((y / Math.max(1, stripH)) * n)));
    const letter = alphabet[i];
    if (letter === lastScrubRef.current) return;
    lastScrubRef.current = letter;
    const landed = jumpToLetter(letter, false);
    setScrubLetter(landed || letter);
    hapticFeedback.selection();
  };
  const indexGesture = useMemo(() => Gesture.Pan()
    .activateAfterLongPress(1)
    .maxPointers(1)
    .runOnJS(true)
    .onBegin((e) => scrubTo(e.y))
    .onUpdate((e) => scrubTo(e.y))
    .onFinalize(() => { lastScrubRef.current = null; setScrubLetter(null); }),
  [stripH, sortedSections.join('')]);

  const handleBodyPartPress = () => {
    hapticFeedback.light();
    closeOptionsMenu(() => openPicker('bodyPart'));
  };

  const handleCategoryPress = () => {
    hapticFeedback.light();
    closeOptionsMenu(() => openPicker('category'));
  };

  const tileColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';

  const renderExercise = (exercise) => (
    <TouchableOpacity
      key={exercise.id}
      style={[styles.exerciseItem, { backgroundColor: tileColor }]}
      activeOpacity={0.6}
      onPress={() => {
        hapticFeedback.light();
        if (selectionMode && onSelectExercise) {
          onSelectExercise(exercise);
        } else {
          navigation.navigate('ExerciseDetail', { exercise });
        }
      }}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, ${exercise.bodyPart}${exercise.equipment ? `, ${exercise.equipment}` : ''}`}
      accessibilityHint={selectionMode ? 'Adds this exercise' : 'Shows how to do it'}
    >
      <View style={styles.exerciseInfo}>
        <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
        <Text style={[styles.exerciseCategory, { color: theme.textSecondary }]}>
          {[exercise.bodyPart, exercise.equipment].filter(Boolean).join('  ·  ')}
          {exercise.isCustom ? <Text style={{ color: theme.primary }}>{'  ·  Custom'}</Text> : null}
        </Text>
      </View>
      {selectionMode ? (
        <View style={[styles.addPill, { backgroundColor: theme.primary }]}>
          <MaterialIcons name="add" size={18} color="#fff" />
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const content = (
    <>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header — matches Fuel */}
        <View
          style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 10, backgroundColor: theme.background }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => { hapticFeedback.light(); onClose(); }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={18} color={textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: 0.3 }}>
              {selectionMode ? 'Pick an exercise' : 'Exercises'}
            </Text>
            <TouchableOpacity
              onPress={openOptionsMenu}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="more-horiz" size={22} color={textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 11,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          }}>
            <MaterialIcons name="search" size={20} color={theme.textTertiary || theme.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search"
              placeholderTextColor={theme.textTertiary || theme.textSecondary}
              style={{
                flex: 1,
                fontSize: 15,
                color: theme.text,
                marginLeft: 10,
                paddingVertical: 2,
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="close" size={14} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Body part chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} keyboardShouldPersistTaps="handled">
            {bodyParts.map((bp) => {
              const active = selectedBodyPart === bp;
              return (
                <TouchableOpacity
                  key={bp}
                  onPress={() => { hapticFeedback.light(); setSelectedBodyPart(bp); }}
                  style={[styles.chip, { backgroundColor: active ? theme.primary : tileColor }]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>{bp === 'Any Body Part' ? 'All' : bp}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={[styles.countText, { color: theme.textSecondary }]}>
            {filteredExercises.length} {filteredExercises.length === 1 ? 'exercise' : 'exercises'}{selectedCategory !== 'Any Category' ? `  ·  ${selectedCategory}` : ''}
          </Text>
        </View>

        {/* Options Popup - Add-Food-style layered overlay + animated sheet */}
        {optionsMounted && (
          <View style={styles.optionsOverlayAbsolute} pointerEvents={showFilterMenu ? 'auto' : 'none'}>
            <RNAnimated.View
              style={[styles.optionsBackdrop, {
                opacity: RNAnimated.multiply(
                  optionsBackdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
                  optionsDragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.2], extrapolate: 'clamp' }),
                ),
              }]}
            >
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeOptionsMenu()} />
            </RNAnimated.View>

            <View style={styles.optionsKeyboardWrap} pointerEvents="box-none">
              <RNAnimated.View
                style={[
                  styles.optionsSheetCard,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    transform: [{
                      translateY: RNAnimated.add(
                        optionsSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_HEIGHT] }),
                        optionsDragY.interpolate({ inputRange: [-1, 0, SCREEN_HEIGHT], outputRange: [0, 0, SCREEN_HEIGHT], extrapolate: 'clamp' }),
                      ),
                    }],
                  },
                ]}
              >
                <View {...optionsPanResponder.panHandlers}>
                  <View style={[styles.optionsHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)' }]} />

                  <View style={styles.optionsHeader}>
                    <Text style={[styles.optionsTitle, { color: theme.text }]}>Options</Text>
                    <TouchableOpacity
                      style={[styles.optionsCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
                      onPress={() => closeOptionsMenu()}
                    >
                      <MaterialIcons name="close" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsScroll} bounces={false}>
                  <View style={styles.optionsList}>
                    {[
                      { icon: 'fitness-center', title: selectedBodyPart, desc: 'Filter by body part', tint: '#6366F1', onPress: handleBodyPartPress },
                      { icon: 'category', title: selectedCategory, desc: 'Filter by category', tint: '#8B5CF6', onPress: handleCategoryPress },
                      { icon: 'add-circle-outline', title: 'Add Custom Exercise', desc: 'Create your own exercise', tint: '#10B981', onPress: () => { hapticFeedback.light(); closeOptionsMenu(() => setShowAddExerciseModal(true)); } },
                      { icon: 'star', title: 'My Custom Exercises', desc: 'View and manage your customs', tint: '#F59E0B', onPress: () => { hapticFeedback.light(); closeOptionsMenu(() => setShowCustomExercisesModal(true)); } },
                      { icon: 'refresh', title: 'Clear Cache & Refresh', desc: 'Reload exercise data', tint: '#EF4444', onPress: () => { hapticFeedback.light(); closeOptionsMenu(() => handleRefresh()); } },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.icon}
                        activeOpacity={0.7}
                        style={[
                          styles.optionsCard,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                        onPress={item.onPress}
                      >
                        <View style={[styles.optionsCardIcon, { backgroundColor: item.tint + '14' }]}>
                          <MaterialIcons name={item.icon} size={24} color={item.tint} />
                        </View>
                        <View style={styles.optionsCardText}>
                          <Text style={[styles.optionsCardTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                          <Text style={[styles.optionsCardDesc, { color: theme.textTertiary || theme.textSecondary }]} numberOfLines={2}>{item.desc}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={theme.textTertiary || theme.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </RNAnimated.View>
            </View>
          </View>
        )}

        {/* Body Part / Category Picker Popup - Add Food style */}
        {pickerMounted && (() => {
          const isBodyPart = activePicker === 'bodyPart';
          const title = isBodyPart ? 'Select Body Part' : 'Select Category';
          const items = isBodyPart ? bodyParts : categories;
          const selected = isBodyPart ? selectedBodyPart : selectedCategory;
          const setSelected = isBodyPart ? setSelectedBodyPart : setSelectedCategory;
          const accent = isBodyPart ? '#6366F1' : '#8B5CF6';

          return (
            <View style={styles.optionsOverlayAbsolute} pointerEvents={activePicker ? 'auto' : 'none'}>
              <RNAnimated.View
                style={[styles.optionsBackdrop, {
                  opacity: RNAnimated.multiply(
                    pickerBackdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
                    pickerDragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.2], extrapolate: 'clamp' }),
                  ),
                }]}
              >
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closePicker()} />
              </RNAnimated.View>

              <View style={styles.optionsKeyboardWrap} pointerEvents="box-none">
                <RNAnimated.View
                  style={[
                    styles.optionsSheetCard,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      transform: [{
                        translateY: RNAnimated.add(
                          pickerSlideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SCREEN_HEIGHT] }),
                          pickerDragY.interpolate({ inputRange: [-1, 0, SCREEN_HEIGHT], outputRange: [0, 0, SCREEN_HEIGHT], extrapolate: 'clamp' }),
                        ),
                      }],
                    },
                  ]}
                >
                  <View {...pickerPanResponder.panHandlers}>
                    <View style={[styles.optionsHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.12)' }]} />
                    <View style={styles.optionsHeader}>
                      <Text style={[styles.optionsTitle, { color: theme.text }]}>{title}</Text>
                      <TouchableOpacity
                        style={[styles.optionsCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
                        onPress={() => closePicker()}
                      >
                        <MaterialIcons name="close" size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsScroll} bounces={false}>
                    <View style={styles.optionsList}>
                      {items.map((item) => {
                        const isSelected = item === selected;
                        return (
                          <TouchableOpacity
                            key={item}
                            activeOpacity={0.7}
                            onPress={() => {
                              hapticFeedback.light();
                              setSelected(item);
                              closePicker();
                            }}
                            style={[
                              styles.optionsCard,
                              {
                                backgroundColor: isSelected
                                  ? accent + '14'
                                  : (isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'),
                                borderColor: isSelected
                                  ? accent + '55'
                                  : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                              },
                            ]}
                          >
                            <View style={[styles.optionsCardIcon, { backgroundColor: accent + (isSelected ? '22' : '14') }]}>
                              <MaterialIcons
                                name={isBodyPart ? 'fitness-center' : 'category'}
                                size={22}
                                color={accent}
                              />
                            </View>
                            <View style={styles.optionsCardText}>
                              <Text
                                style={[
                                  styles.optionsCardTitle,
                                  { color: isSelected ? accent : theme.text },
                                ]}
                                numberOfLines={1}
                              >
                                {item}
                              </Text>
                            </View>
                            {isSelected && (
                              <MaterialIcons name="check-circle" size={22} color={accent} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </RNAnimated.View>
              </View>
            </View>
          );
        })()}

        {/* Content - starts from top so it goes UNDER the blurred header */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <CustomLoadingIndicator color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading exercises...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={handleRefresh}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingTop: 6, paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.primary}
                />
              }
            >
              {sortedSections.map(letter => (
                <View 
                  key={letter}
                  onLayout={(event) => {
                    sectionRefs.current[letter] = event.nativeEvent.layout.y;
                  }}
                >
                  <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
                    <Text style={[styles.sectionLetter, { color: theme.text }]}>{letter}</Text>
                  </View>
                  {groupedExercises[letter].map(renderExercise)}
                </View>
              ))}
            </ScrollView>

            {/* A-Z strip: tap or press-and-slide */}
            <GestureHandlerRootView style={styles.alphabetNav} pointerEvents="box-none">
              <GestureDetector gesture={indexGesture}>
                <View
                  style={[styles.alphabetStrip, { backgroundColor: tileColor }]}
                  onLayout={(e) => setStripH(e.nativeEvent.layout.height)}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Jump to letter"
                >
                  {alphabet.map((letter) => (
                    <Text
                      key={letter}
                      style={[styles.alphabetLetter, { color: sortedSections.includes(letter) ? theme.primary : theme.textSecondary, opacity: sortedSections.includes(letter) ? 1 : 0.45 }]}
                    >
                      {letter}
                    </Text>
                  ))}
                </View>
              </GestureDetector>
            </GestureHandlerRootView>
            {scrubLetter ? (
              <View style={[styles.scrubBubble, { backgroundColor: theme.primary }]} pointerEvents="none">
                <Text style={styles.scrubBubbleText}>{scrubLetter}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>


      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        onAdd={handleAddExercise}
      />

      {/* Custom Exercises Management Modal */}
      <Modal
        visible={showCustomExercisesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomExercisesModal(false)}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.solidHeader, { 
            borderBottomColor: theme.border,
            paddingTop: Platform.OS === 'ios' ? 60 : 20,
            borderBottomWidth: 0.5,
          }]}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setShowCustomExercisesModal(false);
              }}
              style={styles.threeDotsButton}
            >
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.solidHeaderTitle, { color: theme.text }]}>
              My Custom Exercises
            </Text>
            <View style={styles.threeDotsButton} />
          </View>

          {/* Custom Exercises List */}
          <ScrollView style={{ flex: 1 }}>
            {exercises.filter(ex => ex.isCustom).length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconTile, { backgroundColor: '#10B98114' }]}>
                  <MaterialIcons name="fitness-center" size={48} color="#10B981" />
                </View>
                <Text style={[styles.emptyStateText, { color: theme.text }]}>
                  No custom exercises yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                  Create your own exercise to mix it in with{'\n'}the default library
                </Text>
                <TouchableOpacity
                  style={[styles.emptyCtaBtn, { backgroundColor: '#10B981' }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    hapticFeedback.light();
                    setShowCustomExercisesModal(false);
                    setTimeout(() => setShowAddExerciseModal(true), 250);
                  }}
                >
                  <MaterialIcons name="add" size={20} color="#FFF" />
                  <Text style={styles.emptyCtaText}>Add Custom Exercise</Text>
                </TouchableOpacity>
              </View>
            ) : (
              exercises.filter(ex => ex.isCustom).map((exercise) => (
                <View key={exercise.id}>
                  <TouchableOpacity
                    style={[styles.exerciseItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      if (selectionMode && onSelectExercise) {
                        hapticFeedback.light();
                        onSelectExercise(exercise);
                        setShowCustomExercisesModal(false);
                        onClose();
                      } else {
                        hapticFeedback.light();
                        navigation.navigate('ExerciseDetail', { exercise });
                      }
                    }}
                  >
                    <View style={[styles.exerciseIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                      <MaterialIcons name="star" size={28} color={theme.primary} />
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text style={[styles.exerciseName, { color: theme.text }]}>
                        {exercise.name}
                      </Text>
                      <Text style={[styles.exerciseCategory, { color: theme.textSecondary }]}>
                        {exercise.bodyPart} • {exercise.equipment}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        hapticFeedback.light();
                        handleDeleteCustomExercise(exercise.id);
                      }}
                      style={{ padding: 8 }}
                    >
                      <MaterialIcons name="delete" size={24} color={theme.error || '#FF3B30'} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );

  if (asScreen) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
};

// =============================================
// EXERCISE DETAIL — native-stack modal screen
// =============================================
// Presented as its own `presentation:'modal'` screen so it gets the same native
// parent-scale-back + swipe-down-to-dismiss as every other sheet. (It used to be a
// hand-built reanimated sheet inside an RN <Modal>, so the drag only worked on the
// small handle and the parent never scaled back.)
export const ExerciseDetailScreen = ({ route }) => {
  const { theme, isDark } = useTheme();
  const exercise = route?.params?.exercise || null;
  if (!exercise) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.detailTitle, { color: theme.text }]} numberOfLines={1}>
          {exercise.name}
        </Text>
      </View>

      <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
        <View style={styles.detailImageContainer}>
          {exercise.images && exercise.images.length > 0 ? (
            <Image
              source={{ uri: exercise.images[0] }}
              style={styles.detailImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View style={[styles.exerciseIconContainerLarge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <MaterialIcons name="fitness-center" size={80} color={theme.primary} />
            </View>
          )}
        </View>

        <View style={styles.detailSection}>
          <Text style={[styles.detailSectionTitle, { color: theme.text }]}>About</Text>
          <View style={[styles.detailInfoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.detailInfoRow}>
              <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>Body Part</Text>
              <Text style={[styles.detailInfoValue, { color: theme.text }]}>{exercise.bodyPart}</Text>
            </View>
            <View style={[styles.detailInfoRow, styles.detailInfoRowBorder, { borderTopColor: theme.border }]}>
              <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>Category</Text>
              <Text style={[styles.detailInfoValue, { color: theme.text }]}>{exercise.category}</Text>
            </View>
            <View style={[styles.detailInfoRow, styles.detailInfoRowBorder, { borderTopColor: theme.border }]}>
              <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>Equipment</Text>
              <Text style={[styles.detailInfoValue, { color: theme.text }]}>{exercise.equipment}</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              const query = encodeURIComponent(`${exercise.name} exercise form tutorial`);
              Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
            }}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              backgroundColor: '#FF000018',
              borderColor: '#FF000025',
              borderWidth: 1,
              borderRadius: 14,
              paddingVertical: 14,
            }}
          >
            <MaterialIcons name="play-circle-fill" size={22} color="#FF0000" />
            <Text style={{ color: '#FF0000', fontSize: 15, fontWeight: '600' }}>Watch Tutorial</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailSection}>
          <Text style={[styles.detailSectionTitle, { color: theme.text }]}>Instructions</Text>
          <View style={[styles.detailInfoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            {exercise.instructions && exercise.instructions.length > 0 ? (
              exercise.instructions.map((instruction, index) => (
                <View key={index} style={[styles.instructionItem, index > 0 && { marginTop: 12 }]}>
                  <Text style={[styles.instructionNumber, { color: theme.text }]}>{index + 1}.</Text>
                  <Text style={[styles.instructionText, { color: theme.text }]}>{instruction}</Text>
                </View>
              ))
            ) : (
              <View style={styles.comingSoonContainer}>
                <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                  No instructions available for this exercise.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  solidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  solidHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  threeDotsButton: {
    padding: 8,
  },
  threeDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  filterMenu: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  filterMenuText: {
    flex: 1,
    fontSize: 17,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  exercisesList: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionLetter: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
    marginRight: 40,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
  },
  addPill: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingTop: 12, paddingRight: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '700' },
  countText: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  exerciseIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseIconContainerLarge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  exerciseCategory: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  alphabetNav: {
    position: 'absolute',
    right: 6,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 5,
  },
  alphabetStrip: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  scrubBubble: {
    position: 'absolute',
    right: 44,
    top: '45%',
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  scrubBubbleText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  alphabetLetter: {
    fontSize: 11.5,
    fontWeight: '700',
    paddingVertical: 1,
    textAlign: 'center',
    width: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  pickerItemText: {
    fontSize: 17,
  },
  // Exercise Detail Modal Styles
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  detailContainer: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHandleArea: {
    backgroundColor: 'transparent',
  },
  pullIndicatorContainer: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
  },
  pullIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    opacity: 0.45,
  },
  detailHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailImageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  detailSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailInfoCard: {
    borderRadius: 12,
    padding: 16,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailInfoRowBorder: {
    borderTopWidth: 0.5,
  },
  detailInfoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailInfoValue: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    marginTop: 2,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconTile: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyCtaText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Options Popup (ported from NutritionScreen Add Food modal)
  optionsOverlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  optionsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  optionsKeyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  optionsSheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  optionsHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  optionsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  optionsCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsScroll: {
    paddingHorizontal: 20,
  },
  optionsList: {
    gap: 10,
    paddingBottom: 20,
  },
  optionsCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
  },
  optionsCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsCardText: {
    flex: 1,
  },
  optionsCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionsCardDesc: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
});

export default ExercisesModal;

