import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Animated,
  Dimensions,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import ExercisesService from '../services/exercisesService';
import CustomLoadingIndicator from './CustomLoadingIndicator';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const WorkoutExercisePicker = ({ visible, onClose, onSelectExercise }) => {
  const { theme, isDark } = useTheme();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('Any Body Part');
  const [selectedCategory, setSelectedCategory] = useState('Any Category');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const [isAtTop, setIsAtTop] = useState(true);
  const scrollViewRef = useRef(null);
  const sectionRefs = useRef({});
  const exercisesCache = useRef(null);

  // Load exercises only once when modal first opens
  useEffect(() => {
    if (visible && exercisesCache.current === null) {
      loadExercises();
    } else if (visible && exercisesCache.current) {
      // Use cached data
      setExercises(exercisesCache.current);
    }
  }, [visible]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const data = await ExercisesService.getExercises();
      setExercises(data);
      exercisesCache.current = data; // Cache the data
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  // Expose a method to refresh the cache when needed
  useEffect(() => {
    if (visible) {
      // Check if exercises list should be refreshed (e.g., after adding custom exercise)
      const refreshExercises = async () => {
        const data = await ExercisesService.getExercises();
        // Only update if the count has changed (new exercise added)
        if (exercisesCache.current && data.length !== exercisesCache.current.length) {
          setExercises(data);
          exercisesCache.current = data;
        }
      };
      
      if (exercisesCache.current !== null) {
        refreshExercises();
      }
    }
  }, [visible]);

  // Pan responder for swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return isAtTop && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          handleClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      setSearchQuery('');
    });
  };

  // Animate in/out
  React.useEffect(() => {
    if (visible) {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      panY.setValue(0);
      
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 1,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      panY.setValue(0);
    }
  }, [visible]);

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1000, 0],
  });

  const combinedTranslateY = Animated.add(modalTranslateY, panY);

  const scrollToLetter = (letter) => {
    hapticFeedback.light();
    const sectionView = sectionRefs.current[letter];
    if (sectionView && scrollViewRef.current) {
      sectionView.measureLayout(
        scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current.scrollTo({ y: y - 10, animated: true });
        },
        () => {}
      );
    }
  };

  // Filter exercises based on search and filters
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBodyPart = selectedBodyPart === 'Any Body Part' || exercise.bodyPart === selectedBodyPart;
    const matchesCategory = selectedCategory === 'Any Category' || exercise.category === selectedCategory;
    return matchesSearch && matchesBodyPart && matchesCategory;
  });

  // Group exercises by first letter
  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    const firstLetter = exercise.name[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(exercise);
    return acc;
  }, {});

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: fadeAnim }}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={0.7}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Modal Content */}
        <Animated.View 
          style={[
            styles.container, 
            { 
              backgroundColor: theme.background,
              transform: [{ translateY: combinedTranslateY }],
            }
          ]}
        >
          {/* Pull Indicator */}
          <View {...panResponder.panHandlers} style={styles.pullIndicatorContainer}>
            <View style={[styles.pullIndicator, { backgroundColor: theme.textSecondary }]} />
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search"
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Exercise List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <CustomLoadingIndicator color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading exercises...</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.content}
              showsVerticalScrollIndicator={false}
              onScroll={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                setIsAtTop(offsetY <= 0);
              }}
              scrollEventThrottle={16}
            >
            {Object.keys(groupedExercises).sort().map(letter => (
              <View 
                key={letter}
                ref={(ref) => {
                  if (ref) {
                    sectionRefs.current[letter] = ref;
                  }
                }}
                collapsable={false}
              >
                <Text style={[styles.sectionLetter, { color: theme.textSecondary }]}>{letter}</Text>
                {groupedExercises[letter].map(exercise => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[styles.exerciseItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      hapticFeedback.medium();
                      onSelectExercise(exercise);
                      handleClose();
                    }}
                  >
                    <View style={[styles.exerciseIconContainer, { backgroundColor: theme.primary + '20' }]}>
                      <MaterialIcons name={exercise.icon} size={28} color={theme.primary} />
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
                      <Text style={[styles.exerciseCategory, { color: theme.textSecondary }]}>{exercise.bodyPart}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <View style={{ height: 50 }} />
          </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    height: SCREEN_HEIGHT * 0.78,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  pullIndicatorContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  pullIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 17,
    marginLeft: 8,
    flex: 1,
  },
  addButton: {
    padding: 8,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  sortButton: {
    width: 50,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  sectionLetter: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  exerciseIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseCategory: {
    fontSize: 14,
  },
  alphabetIndex: {
    position: 'absolute',
    right: 4,
    top: 120,
    bottom: 50,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  alphabetLetter: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default WorkoutExercisePicker;

