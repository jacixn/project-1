import React, { useState, useEffect, useRef } from 'react';
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
  PanResponder,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import ExercisesService from '../services/exercisesService';
import { hapticFeedback } from '../utils/haptics';
import CustomLoadingIndicator from './CustomLoadingIndicator';
import AddExerciseModal from './AddExerciseModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ExercisesModal = ({ visible, onClose, onSelectExercise, selectionMode = false, asScreen = false }) => {
  const { theme, isDark } = useTheme();
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
  const [showBodyPartPicker, setShowBodyPartPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showCustomExercisesModal, setShowCustomExercisesModal] = useState(false);
  
  // Animation for pull-to-dismiss
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const detailScrollRef = useRef(null);
  const [isAtTop, setIsAtTop] = useState(true);

  // Pan responder for pull-to-dismiss gesture
  const dismissHapticFired = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only allow pan if scrolled to top and pulling down
        return isAtTop && gestureState.dy > 0;
      },
      onPanResponderGrant: () => {
        dismissHapticFired.current = false;
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          // Fire a satisfying haptic when crossing the dismiss threshold
          if (gestureState.dy > 150 && !dismissHapticFired.current) {
            dismissHapticFired.current = true;
            hapticFeedback.medium();
          } else if (gestureState.dy <= 150 && dismissHapticFired.current) {
            // Reset if user pulls back above threshold
            dismissHapticFired.current = false;
            hapticFeedback.light();
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If pulled down more than 150px, dismiss
        if (gestureState.dy > 150) {
          handleCloseDetailModal();
        } else {
          // Otherwise, spring back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleCloseDetailModal = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowExerciseDetail(false);
      translateY.setValue(SCREEN_HEIGHT);
    });
  };

  // Open detail modal with animation
  useEffect(() => {
    if (showExerciseDetail) {
      setIsAtTop(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [showExerciseDetail]);

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

  // Sort sections alphabetically
  const sortedSections = Object.keys(groupedExercises).sort();
  
  console.log('📊 DEBUG - filteredExercises.length:', filteredExercises.length);
  console.log('📊 DEBUG - sortedSections:', sortedSections);
  console.log('📊 DEBUG - First section exercises:', sortedSections[0] ? groupedExercises[sortedSections[0]]?.length : 0);

  // Get alphabet for quick navigation
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const handleBodyPartPress = () => {
    hapticFeedback.light();
    setShowBodyPartPicker(true);
    setShowFilterMenu(false);
  };

  const handleCategoryPress = () => {
    hapticFeedback.light();
    setShowCategoryPicker(true);
    setShowFilterMenu(false);
  };

  const handleSortPress = () => {
    hapticFeedback.light();
    // Sort functionality - currently sorts alphabetically by default
  };

  const renderExercise = (exercise) => (
    <TouchableOpacity
      key={exercise.id}
      style={[styles.exerciseItem, { borderBottomColor: theme.border }]}
      onPress={() => {
        hapticFeedback.light();
        if (selectionMode && onSelectExercise) {
          onSelectExercise(exercise);
        } else {
          setSelectedExercise(exercise);
          setShowExerciseDetail(true);
        }
      }}
    >
      <View style={[styles.exerciseIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        <MaterialIcons name="fitness-center" size={28} color={theme.primary} />
      </View>
      <View style={styles.exerciseInfo}>
        <Text style={[styles.exerciseName, { color: theme.text }]}>
          {exercise.name}
        </Text>
        <Text style={[styles.exerciseCategory, { color: theme.textSecondary }]}>
          {exercise.bodyPart}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  const content = (
    <>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Transparent Blurred Header - Exact copy from Bible Timeline */}
        <BlurView 
          intensity={20} 
          tint={isDark ? 'dark' : 'light'} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 10,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
          <View style={[styles.solidHeader, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: 8, paddingBottom: 12 }]}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }}
              style={{ 
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
            </TouchableOpacity>
            <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
              <Text style={[styles.solidHeaderTitle, { color: theme.text }]}>
                {selectionMode ? 'New' : 'Exercises'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setShowFilterMenu(!showFilterMenu);
              }}
              style={styles.threeDotsButton}
            >
              <View style={styles.threeDots}>
                <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
                <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
                <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Search Bar - Fixed in Header */}
          <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginBottom: 12 }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search"
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </BlurView>

        {/* Filter Menu - appears when three dots is tapped */}
        {showFilterMenu && (
          <View style={[styles.filterMenu, { 
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
            marginTop: Platform.OS === 'ios' ? 175 : 155,
          }]}>
            <TouchableOpacity
              style={[styles.filterMenuItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                hapticFeedback.light();
                handleBodyPartPress();
              }}
            >
              <MaterialIcons name="fitness-center" size={20} color={theme.textSecondary} />
              <Text style={[styles.filterMenuText, { color: theme.text }]}>{selectedBodyPart}</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterMenuItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                hapticFeedback.light();
                handleCategoryPress();
              }}
            >
              <MaterialIcons name="category" size={20} color={theme.textSecondary} />
              <Text style={[styles.filterMenuText, { color: theme.text }]}>{selectedCategory}</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterMenuItem, { borderBottomColor: theme.border }]}
              onPress={() => {
                hapticFeedback.light();
                setShowFilterMenu(false);
                setShowAddExerciseModal(true);
              }}
            >
              <MaterialIcons name="add-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.filterMenuText, { color: theme.text }]}>Add Custom Exercise</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterMenuItem, { borderBottomColor: theme.border }]}
              onPress={async () => {
                hapticFeedback.light();
                setShowFilterMenu(false);
                setShowCustomExercisesModal(true);
              }}
            >
              <MaterialIcons name="star" size={20} color={theme.textSecondary} />
              <Text style={[styles.filterMenuText, { color: theme.text }]}>My Custom Exercises</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterMenuItem]}
              onPress={() => {
                hapticFeedback.light();
                handleSortPress();
              }}
            >
              <MaterialIcons name="swap-vert" size={20} color={theme.textSecondary} />
              <Text style={[styles.filterMenuText, { color: theme.text }]}>Sort Alphabetically</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterMenuItem]}
              onPress={async () => {
                hapticFeedback.light();
                setShowFilterMenu(false);
                await handleRefresh();
              }}
            >
              <MaterialIcons name="refresh" size={20} color={theme.textSecondary} />
              <Text style={[styles.filterMenuText, { color: theme.text }]}>Clear Cache & Refresh</Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Body Part Picker Modal */}
        <Modal
          visible={showBodyPartPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBodyPartPicker(false)}
        >
          <TouchableOpacity 
            style={styles.pickerOverlay}
            activeOpacity={0.7}
            onPress={() => {
              hapticFeedback.light();
              setShowBodyPartPicker(false);
            }}
          >
            <View style={[styles.pickerContainer, { backgroundColor: theme.background }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Body Part</Text>
                <TouchableOpacity onPress={() => setShowBodyPartPicker(false)}>
                  <MaterialIcons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList}>
                {bodyParts.map((bodyPart) => (
                  <TouchableOpacity
                    key={bodyPart}
                    style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      hapticFeedback.light();
                      setSelectedBodyPart(bodyPart);
                      setShowBodyPartPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      { color: bodyPart === selectedBodyPart ? theme.primary : theme.text }
                    ]}>
                      {bodyPart}
                    </Text>
                    {bodyPart === selectedBodyPart && (
                      <MaterialIcons name="check" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Category Picker Modal */}
        <Modal
          visible={showCategoryPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <TouchableOpacity 
            style={styles.pickerOverlay}
            activeOpacity={0.7}
            onPress={() => {
              hapticFeedback.light();
              setShowCategoryPicker(false);
            }}
          >
            <View style={[styles.pickerContainer, { backgroundColor: theme.background }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>Select Category</Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                  <MaterialIcons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.pickerItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      hapticFeedback.light();
                      setSelectedCategory(category);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      { color: category === selectedCategory ? theme.primary : theme.text }
                    ]}>
                      {category}
                    </Text>
                    {category === selectedCategory && (
                      <MaterialIcons name="check" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

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
              contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 185 : 165, paddingBottom: 50 }}
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

            {/* Alphabet Navigation */}
            <View style={styles.alphabetNav}>
              {alphabet.map(letter => (
                <TouchableOpacity
                  key={letter}
                  onPress={() => {
                    hapticFeedback.light();
                    if (sectionRefs.current[letter] !== undefined) {
                      scrollViewRef.current?.scrollTo({
                        y: sectionRefs.current[letter],
                        animated: true,
                      });
                    }
                  }}
                >
                  <Text style={[
                    styles.alphabetLetter,
                    { color: sortedSections.includes(letter) ? theme.primary : theme.textSecondary }
                  ]}>
                    {letter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Exercise Detail Modal - Pull down to dismiss */}
      <Modal
        visible={showExerciseDetail}
        animationType="none"
        transparent={true}
        onRequestClose={handleCloseDetailModal}
      >
        <View style={styles.detailModalOverlay}>
          {selectedExercise && (
            <Animated.View 
              style={[
                styles.detailContainer, 
                { 
                  backgroundColor: theme.background,
                  transform: [{ translateY }]
                }
              ]}
            >
              {/* Pull indicator */}
              <View {...panResponder.panHandlers} style={styles.pullIndicatorContainer}>
                <View style={[styles.pullIndicator, { backgroundColor: theme.textSecondary }]} />
              </View>

              {/* Header */}
              <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.detailTitle, { color: theme.text }]}>
                  {selectedExercise.name}
                </Text>
              </View>

              <ScrollView 
                ref={detailScrollRef}
                style={styles.detailContent} 
                showsVerticalScrollIndicator={false}
                onScroll={(e) => {
                  const offsetY = e.nativeEvent.contentOffset.y;
                  setIsAtTop(offsetY <= 0);
                }}
                scrollEventThrottle={16}
              >
              {/* Exercise Icon */}
              <View style={styles.detailImageContainer}>
                <View style={[styles.exerciseIconContainerLarge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  <MaterialIcons name="fitness-center" size={80} color={theme.primary} />
                </View>
              </View>

              {/* About Section */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                  About
                </Text>
                <View style={[styles.detailInfoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <View style={styles.detailInfoRow}>
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>
                      Body Part
                    </Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>
                      {selectedExercise.bodyPart}
                    </Text>
                  </View>
                  <View style={[styles.detailInfoRow, styles.detailInfoRowBorder, { borderTopColor: theme.border }]}>
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>
                      Category
                    </Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>
                      {selectedExercise.category}
                    </Text>
                  </View>
                  <View style={[styles.detailInfoRow, styles.detailInfoRowBorder, { borderTopColor: theme.border }]}>
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>
                      Equipment
                    </Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>
                      {selectedExercise.equipment}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Instructions Section */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                  Instructions
                </Text>
                <View style={[styles.detailInfoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  {selectedExercise.instructions && selectedExercise.instructions.length > 0 ? (
                    selectedExercise.instructions.map((instruction, index) => (
                      <View key={index} style={[styles.instructionItem, index > 0 && { marginTop: 12 }]}>
                        <Text style={[styles.instructionNumber, { color: theme.text }]}>
                          {index + 1}.
                        </Text>
                        <Text style={[styles.instructionText, { color: theme.text }]}>
                          {instruction}
                        </Text>
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
            </Animated.View>
          )}
        </View>
      </Modal>

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
                <MaterialIcons name="fitness-center" size={64} color={theme.textSecondary} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No custom exercises yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                  Tap "Add Custom Exercise" to create one
                </Text>
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
                        setSelectedExercise(exercise);
                        setShowExerciseDetail(true);
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
    paddingVertical: 8,
  },
  sectionLetter: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
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
    marginLeft: 12,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseCategory: {
    fontSize: 14,
  },
  alphabetNav: {
    position: 'absolute',
    right: 5,
    top: Platform.OS === 'ios' ? 185 : 165,
    bottom: 0,
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 5,
  },
  alphabetLetter: {
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 1,
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
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.91,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  pullIndicatorContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pullIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    opacity: 0.3,
  },
  detailHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
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
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ExercisesModal;

