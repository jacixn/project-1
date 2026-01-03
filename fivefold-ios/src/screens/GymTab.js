import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Image,
  Modal,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { GlassCard, GlassHeader } from '../components/GlassEffect';
import { createEntranceAnimation } from '../utils/animations';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';
import { hapticFeedback } from '../utils/haptics';
import ExercisesModal from '../components/ExercisesModal';
import WorkoutModal from '../components/WorkoutModal';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import WorkoutService from '../services/workoutService';

// const { width } = Dimensions.get('window');

const GymTab = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme } = useTheme();
  const { language, t } = useLanguage();
  const { hasActiveWorkout } = useWorkout();
  const scrollY = useRef(new Animated.Value(0)).current;

  // State
  const [exercisesModalVisible, setExercisesModalVisible] = useState(false);
  const [templateSelectionVisible, setTemplateSelectionVisible] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Logo animations
  const logoSpin = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  
  // Modal card animations
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(50)).current;
  const cardShimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animation
    createEntranceAnimation(slideAnim, fadeAnim, scaleAnim, 0, 0).start();
    // Load workout history
    loadWorkoutHistory();
    
    // Start logo animations
    startLogoAnimations();
    
    // Start shimmer animation
    startShimmerAnimation();
  }, []);
  
  useEffect(() => {
    if (showAboutModal) {
      // Animate modal entrance
      modalFadeAnim.setValue(0);
      modalSlideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAboutModal]);

  const startShimmerAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardShimmer, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(cardShimmer, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Continuous logo animations to attract attention
  const startLogoAnimations = () => {
    // Gentle spinning animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoSpin, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(logoSpin, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    // Reload history when template selection closes (in case workout was completed)
    if (!templateSelectionVisible) {
      loadWorkoutHistory();
    }
  }, [templateSelectionVisible]);

  // Force refresh all data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🏋️ GymTab focused - refreshing workout history');
      loadWorkoutHistory();
    }, [])
  );

  const loadWorkoutHistory = async () => {
    try {
      const history = await WorkoutService.getWorkoutHistory();
      setWorkoutHistory(history);
    } catch (error) {
      console.error('Error loading workout history:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadWorkoutHistory();
      // add any other data reloads here if needed (stats are derived from history)
    } catch (err) {
      console.error('Error refreshing workout history:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Calculate workout stats from history
  const calculateWorkoutStats = () => {
    if (!workoutHistory || workoutHistory.length === 0) {
      return { totalWorkouts: 0, streak: 0, totalMinutes: 0 };
    }

    // Total workouts
    const totalWorkouts = workoutHistory.length;

    // Total minutes
    const totalMinutes = workoutHistory.reduce((total, workout) => {
      return total + (workout.duration || 0);
    }, 0);
    const totalMinutesFormatted = Math.floor(totalMinutes / 60);

    // Calculate weekly streak (consecutive weeks with 1+ workouts)
    const WORKOUTS_PER_WEEK_THRESHOLD = 1;
    
    const sortedWorkouts = [...workoutHistory].sort((a, b) => 
      new Date(b.completedAt) - new Date(a.completedAt)
    );

    // Group workouts by week (week starts on Monday)
    const getWeekKey = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().split('T')[0];
    };

    const workoutsByWeek = {};
    sortedWorkouts.forEach(workout => {
      const weekKey = getWeekKey(workout.completedAt);
      if (!workoutsByWeek[weekKey]) {
        workoutsByWeek[weekKey] = 0;
      }
      workoutsByWeek[weekKey]++;
    });

    // Get current week
    const currentWeekKey = getWeekKey(new Date());
    
    // Calculate consecutive weeks with enough workouts
    let streak = 0;
    let checkWeek = new Date(currentWeekKey);
    
    while (true) {
      const weekKey = checkWeek.toISOString().split('T')[0];
      const workoutsThisWeek = workoutsByWeek[weekKey] || 0;
      
      if (workoutsThisWeek >= WORKOUTS_PER_WEEK_THRESHOLD) {
        streak++;
        // Move to previous week
        checkWeek.setDate(checkWeek.getDate() - 7);
      } else {
        break;
      }
    }

    return { totalWorkouts, streak, totalMinutes: totalMinutesFormatted };
  };

  const workoutStats = calculateWorkoutStats();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Liquid Glass Container
  const LiquidGlassContainer = ({ children, style }) => {
    if (!isLiquidGlassSupported) {
      return (
        <BlurView 
          intensity={18} 
          tint={isDark ? "dark" : "light"} 
          style={[styles.card, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}15`
          }, style]}
        >
          {children}
        </BlurView>
      );
    }

    return (
      <LiquidGlassView
        interactive={true}
        effect="clear"
        colorScheme="system"
        tintColor="rgba(255, 255, 255, 0.08)"
        style={[styles.liquidGlassCard, style]}
      >
        {children}
      </LiquidGlassView>
    );
  };

  return (
    <AnimatedWallpaper 
      scrollY={scrollY}
      parallaxFactor={0.3}
      blurOnScroll={false}
      fadeOnScroll={false}
      scaleOnScroll={true}
    >
      <View style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme || isSpidermanTheme || isFaithTheme || isSailormoonTheme) ? 'transparent' : theme.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.background}
        />
      
        {/* Fixed Header */}
        <GlassHeader 
          style={[styles.fixedHeader, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}15`
          }]}
          intensity={15}
          absolute={false}
        >
          <View style={styles.headerContent}>
            {/* Animated Logo positioned on the left */}
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.heavy();
                setShowAboutModal(true);
              }}
              activeOpacity={0.7}
            >
              <Animated.Image 
                source={require('../../assets/logo.png')} 
                style={[
                  styles.headerLogo,
                  {
                    transform: [
                      {
                        rotate: logoSpin.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      },
                      { scale: logoPulse },
                      {
                        translateY: logoFloat.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6]
                        })
                      }
                    ],
                    shadowColor: theme.primary,
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
                  }
                ]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            {/* Centered text content */}
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Fitness</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Track your workouts
              </Text>
            </View>
          </View>
        </GlassHeader>

        {/* Main Content */}
        <Animated.ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Welcome Card */}
          <LiquidGlassContainer>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Workout Stats</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Your fitness journey
            </Text>
            
            <View style={styles.statsRow}>
              <View 
                style={[styles.statItem, { 
                  backgroundColor: `${theme.primary}30`,
                  borderColor: `${theme.primary}99`,
                  borderWidth: 0.8,
                  borderRadius: 16,
                }]}
              >
                <Text style={[styles.statNumber, { color: theme.primary }]}>
                  {workoutStats.totalWorkouts}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Workouts
                </Text>
              </View>
              
              <View 
                style={[styles.statItem, { 
                  backgroundColor: `${theme.primary}30`,
                  borderColor: `${theme.primary}99`,
                  borderWidth: 0.8,
                  borderRadius: 16,
                }]}
              >
                <Text style={[styles.statNumber, { color: theme.success }]}>
                  {workoutStats.streak}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Week Streak
                </Text>
              </View>
              
              <View 
                style={[styles.statItem, { 
                  backgroundColor: `${theme.primary}30`,
                  borderColor: `${theme.primary}99`,
                  borderWidth: 0.8,
                  borderRadius: 16,
                }]}
              >
                <Text style={[styles.statNumber, { color: theme.warning }]}>
                  {workoutStats.totalMinutes}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Minutes
                </Text>
              </View>
            </View>
          </LiquidGlassContainer>

          {/* Exercises Card */}
          <LiquidGlassContainer>
            <View style={styles.exercisesHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Exercises</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                  Browse exercise library
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  hapticFeedback.medium();
                  setExercisesModalVisible(true);
                }}
              >
                <Text style={styles.browseButtonText}>Browse</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.exercisesPreview}>
              <View style={[styles.exercisePreviewItem, { 
                backgroundColor: `${theme.primary}20`,
                borderColor: `${theme.primary}60`,
                borderWidth: 1,
              }]}>
                <MaterialIcons name="fitness-center" size={32} color={theme.primary} />
                <Text style={[styles.exercisePreviewText, { color: theme.text }]}>
                  128+ Exercises
                </Text>
              </View>
              <View style={[styles.exercisePreviewItem, { 
                backgroundColor: `${theme.success}20`,
                borderColor: `${theme.success}60`,
                borderWidth: 1,
              }]}>
                <MaterialIcons name="category" size={32} color={theme.success} />
                <Text style={[styles.exercisePreviewText, { color: theme.text }]}>
                  All Categories
                </Text>
              </View>
            </View>
          </LiquidGlassContainer>

          {/* Start Workout Card */}
          <LiquidGlassContainer style={styles.comingSoonCard}>
            <View style={styles.startWorkoutHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 8 }]}>
                  Start Workout
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginBottom: 20 }]}>
                  Begin a new workout session
                </Text>
              </View>
              {/* Active workout badge */}
              {hasActiveWorkout && (
                <View style={[styles.activeWorkoutBadge, { backgroundColor: theme.error || '#EF4444' }]}>
                  <MaterialIcons name="fitness-center" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
            
            <TouchableOpacity
              style={[styles.startWorkoutButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                hapticFeedback.heavy();
                setTemplateSelectionVisible(true);
              }}
            >
              <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
              <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </LiquidGlassContainer>

          {/* History Card */}
          <LiquidGlassContainer style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 4 }]}>
                  History
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                  {workoutHistory.length} {workoutHistory.length === 1 ? 'workout' : 'workouts'} completed
                </Text>
              </View>
              <View style={[styles.historyBadge, { backgroundColor: theme.primary + '20' }]}>
                <MaterialIcons name="history" size={24} color={theme.primary} />
              </View>
            </View>

            {workoutHistory.length === 0 ? (
              <View style={styles.emptyHistory}>
                <MaterialIcons name="fitness-center" size={48} color={theme.textSecondary} opacity={0.3} />
                <Text style={[styles.emptyHistoryText, { color: theme.text }]}>
                  No workouts yet
                </Text>
                <Text style={[styles.emptyHistorySubtext, { color: theme.textSecondary }]}>
                  Complete your first workout to see it here
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {workoutHistory.slice(0, 5).map((workout, index) => (
                  <TouchableOpacity
                    key={workout.id}
                    style={[
                      styles.historyItem,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                        marginBottom: index !== Math.min(4, workoutHistory.length - 1) ? 10 : 0,
                      },
                    ]}
                    onPress={() => {
                      hapticFeedback.light();
                      // TODO: Show workout detail modal
                    }}
                  >
                    <View style={[styles.workoutIcon, { backgroundColor: theme.primary + '20' }]}>
                      <MaterialIcons name="fitness-center" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.workoutInfo}>
                      <Text style={[styles.workoutName, { color: theme.text }]}>
                        {workout.name}
                      </Text>
                      <View style={styles.workoutMeta}>
                        <View style={styles.workoutMetaItem}>
                          <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
                          <Text style={[styles.workoutMetaText, { color: theme.textSecondary }]}>
                            {formatDuration(workout.duration)}
                          </Text>
                        </View>
                        <View style={styles.workoutMetaItem}>
                          <MaterialIcons name="fitness-center" size={14} color={theme.textSecondary} />
                          <Text style={[styles.workoutMetaText, { color: theme.textSecondary }]}>
                            {workout.exercises?.length || 0} exercises
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.workoutDate}>
                      <Text style={[styles.workoutDateText, { color: theme.textSecondary }]}>
                        {formatDate(workout.completedAt)}
                      </Text>
                      <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))}
                {workoutHistory.length > 5 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => {
                      hapticFeedback.light();
                      setShowFullHistoryModal(true);
                    }}
                  >
                    <Text style={[styles.viewAllText, { color: theme.primary }]}>
                      View All {workoutHistory.length} Workouts
                    </Text>
                    <MaterialIcons name="arrow-forward" size={18} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </LiquidGlassContainer>
        </Animated.ScrollView>
      </View>

      {/* Exercises Modal */}
      <ExercisesModal
        visible={exercisesModalVisible}
        onClose={() => setExercisesModalVisible(false)}
      />

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        visible={templateSelectionVisible}
        onClose={() => setTemplateSelectionVisible(false)}
      />

      {/* Full History Modal */}
      <Modal
        visible={showFullHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFullHistoryModal(false)}
      >
        <View style={[styles.fullHistoryModal, { backgroundColor: theme.background }]}>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
          
          {/* Header */}
          <View style={[styles.fullHistoryHeader, { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : `${theme.primary}15`,
            borderBottomColor: theme.border,
          }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                hapticFeedback.light();
                setShowFullHistoryModal(false);
              }}
            >
              <MaterialIcons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.fullHistoryHeaderText}>
              <Text style={[styles.fullHistoryTitle, { color: theme.text }]}>
                Workout History
              </Text>
              <Text style={[styles.fullHistorySubtitle, { color: theme.textSecondary }]}>
                {workoutHistory.length} {workoutHistory.length === 1 ? 'workout' : 'workouts'} completed
              </Text>
            </View>
            <View style={styles.closeButtonPlaceholder} />
          </View>

          {/* All Workouts List */}
          <ScrollView 
            style={styles.fullHistoryContent}
            contentContainerStyle={styles.fullHistoryContentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
              />
            }
          >
            {workoutHistory.map((workout, index) => (
              <TouchableOpacity
                key={workout.id}
                style={[
                  styles.fullHistoryItem,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    marginBottom: 12,
                  },
                ]}
                onPress={() => {
                  hapticFeedback.light();
                  // TODO: Show workout detail modal
                }}
              >
                <View style={[styles.workoutIcon, { backgroundColor: theme.primary + '20' }]}>
                  <MaterialIcons name="fitness-center" size={20} color={theme.primary} />
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={[styles.workoutName, { color: theme.text }]}>
                    {workout.name}
                  </Text>
                  <View style={styles.workoutMeta}>
                    <View style={styles.workoutMetaItem}>
                      <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
                      <Text style={[styles.workoutMetaText, { color: theme.textSecondary }]}>
                        {formatDuration(workout.duration)}
                      </Text>
                    </View>
                    <View style={styles.workoutMetaItem}>
                      <MaterialIcons name="fitness-center" size={14} color={theme.textSecondary} />
                      <Text style={[styles.workoutMetaText, { color: theme.textSecondary }]}>
                        {workout.exercises?.length || 0} exercises
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.workoutDate}>
                  <Text style={[styles.workoutDateText, { color: theme.textSecondary }]}>
                    {formatDate(workout.completedAt)}
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* About Jason Modal - REDESIGNED */}
      <Modal
        visible={showAboutModal}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <LinearGradient
          colors={isDark 
            ? ['#0F0F23', '#1A1A2E', '#16213E'] 
            : ['#F0F4FF', '#E8EEFF', '#DDE6FF']}
          style={styles.aboutModal}
        >
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
          
          {/* Animated Background Circles */}
          <Animated.View style={[styles.bgCircle1, {
            opacity: cardShimmer.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6]
            }),
            transform: [{
              scale: cardShimmer.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2]
              })
            }]
          }]} />
          <Animated.View style={[styles.bgCircle2, {
            opacity: cardShimmer.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 0.7]
            })
          }]} />
          
          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButtonFloating, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            }]}
            onPress={() => {
              hapticFeedback.medium();
              setShowAboutModal(false);
            }}
          >
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.closeButtonBlur}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </BlurView>
          </TouchableOpacity>

          {/* Content */}
          <Animated.ScrollView 
            style={styles.aboutContent}
            contentContainerStyle={styles.aboutContentContainer}
            showsVerticalScrollIndicator={false}
            opacity={modalFadeAnim}
          >
            {/* Hero Title */}
            <Animated.View style={{
              transform: [{ translateY: modalSlideAnim }]
            }}>
              <LinearGradient
                colors={[theme.primary, theme.primaryLight, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <Text style={styles.heroTitle}>About Biblely</Text>
                <MaterialIcons name="stars" size={32} color="#FFFFFF" style={styles.heroIcon} />
              </LinearGradient>
            </Animated.View>

            {/* Creator Card - REDESIGNED */}
            <Animated.View style={{
              transform: [{ translateY: modalSlideAnim }],
              opacity: modalFadeAnim
            }}>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.creatorCard}>
                <LinearGradient
                  colors={isDark 
                    ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                    : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
                  style={styles.creatorCardInner}
                >
                  {/* Animated Avatar with Logo */}
                  <Animated.View style={[styles.creatorIconContainer, {
                    transform: [{
                      scale: cardShimmer.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.05]
                      })
                    }]
                  }]}>
                    <LinearGradient
                      colors={[theme.primary, theme.primaryLight]}
                      style={styles.avatarGradient}
                    >
                      <Image 
                        source={require('../../assets/logo.png')} 
                        style={styles.avatarLogo}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                    {/* Glow ring */}
                    <Animated.View style={[styles.glowRing, {
                      borderColor: theme.primary,
                      opacity: cardShimmer.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.8]
                      })
                    }]} />
                  </Animated.View>
                  
                  <Text style={[styles.creatorName, { color: theme.text }]}>
                    Hi, I'm Jason 👋
                  </Text>
                  <View style={styles.badgeContainer}>
                    <LinearGradient
                      colors={[theme.primary + '40', theme.primary + '20']}
                      style={styles.badge}
                    >
                      <MaterialIcons name="school" size={14} color={theme.primary} />
                      <Text style={[styles.badgeText, { color: theme.primary }]}>
                        CS Student
                      </Text>
                    </LinearGradient>
                    <LinearGradient
                      colors={[theme.success + '40', theme.success + '20']}
                      style={styles.badge}
                    >
                      <MaterialIcons name="code" size={14} color={theme.success} />
                      <Text style={[styles.badgeText, { color: theme.success }]}>
                        Developer
                      </Text>
                    </LinearGradient>
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>

            {/* Story Section - REDESIGNED */}
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.storyCard}>
              <LinearGradient
                colors={isDark 
                  ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                  : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
                style={styles.storyCardInner}
              >
                {/* Story Header with Gradient */}
                <LinearGradient
                  colors={[theme.primary + '30', theme.primary + '10']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storyHeaderGradient}
                >
                  <MaterialIcons name="auto-stories" size={24} color={theme.primary} />
                  <Text style={[styles.storyTitle, { color: theme.text }]}>
                    Why I Built This
                  </Text>
                </LinearGradient>
                
                <Text style={[styles.storyText, { color: theme.text }]}>
                  I'm Jason, a computer science student who loves reading the Bible. I wanted an app to help me read daily, so I tried a few popular Bible apps.
                </Text>
                
                <Text style={[styles.storyText, { color: theme.text }]}>
                  Some had paywalls, others just weren't what I was looking for. I wanted something simple that combined faith, productivity, and wellness in one place.
                </Text>
                
                <Text style={[styles.storyText, { color: theme.text }]}>
                  So I built Biblely. It's got everything I wanted - Bible reading, daily prayers, tasks to stay productive, and even fitness tracking. All completely free.
                </Text>

                <Text style={[styles.storyText, { color: theme.text }]}>
                  I made this for myself, but I hope it helps you too. No subscriptions, no paywalls, just a simple app to help you grow.
                </Text>
              </LinearGradient>
            </BlurView>

            {/* Thank You Section - REDESIGNED */}
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.thankYouCard}>
              <LinearGradient
                colors={isDark
                  ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                  : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
                style={styles.thankYouCardInner}
              >
                <Animated.View style={{
                  transform: [{
                    scale: cardShimmer.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1]
                    })
                  }]
                }}>
                  <LinearGradient
                    colors={['#FF6B6B', '#EE5A6F']}
                    style={styles.heartContainer}
                  >
                    <MaterialIcons name="favorite" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </Animated.View>
                
                <Text style={[styles.thankYouTitle, { color: theme.text }]}>
                  Thanks for being here
                </Text>
                <Text style={[styles.thankYouText, { color: theme.textSecondary }]}>
                  Hope Biblely helps you out. If you've got any ideas or feedback, I'd love to hear them.
                </Text>
                
                <View style={styles.contactInfo}>
                  <View style={styles.contactItem}>
                    <MaterialIcons name="email" size={18} color={theme.primary} />
                    <Text style={[styles.contactText, { color: theme.text }]}>
                      biblelyios@gmail.com
                    </Text>
                  </View>
                  <View style={styles.contactItem}>
                    <MaterialIcons name="alternate-email" size={18} color={theme.primary} />
                    <Text style={[styles.contactText, { color: theme.text }]}>
                      @biblely.app on TikTok
                    </Text>
                  </View>
                </View>
                
                <View style={styles.signatureContainer}>
                  <View style={styles.signatureLine} />
                  <Text style={[styles.signature, { color: theme.textSecondary }]}>
                    Jason
                  </Text>
                </View>
              </LinearGradient>
            </BlurView>
          </Animated.ScrollView>
        </LinearGradient>
      </Modal>
    </AnimatedWallpaper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 65 : 40,
    paddingBottom: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
  },
  headerLogo: {
    width: 32,
    height: 32,
    position: 'absolute',
    left: 16,
    top: -2,
  },
  headerTextContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: 0,
  },
  scrollContent: {
    paddingTop: 145,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  liquidGlassCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  exercisesPreview: {
    flexDirection: 'row',
    gap: 12,
  },
  exercisePreviewItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  exercisePreviewText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  comingSoonCard: {
  },
  startWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activeWorkoutBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startWorkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  workoutButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  workoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  workoutButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  // History Card Styles
  historyCard: {
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  historyList: {
    gap: 0,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
    gap: 6,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '700',
  },
  workoutMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  workoutMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutMetaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  workoutDate: {
    alignItems: 'flex-end',
    gap: 4,
  },
  workoutDateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Full History Modal Styles
  fullHistoryModal: {
    flex: 1,
  },
  fullHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  fullHistoryHeaderText: {
    flex: 1,
    alignItems: 'center',
  },
  fullHistoryTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  fullHistorySubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  fullHistoryContent: {
    flex: 1,
  },
  fullHistoryContentContainer: {
    padding: 20,
  },
  fullHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoonContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  // About Modal Styles - REDESIGNED
  aboutModal: {
    flex: 1,
  },
  bgCircle1: {
    position: 'absolute',
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').width * 1.2,
    borderRadius: Dimensions.get('window').width * 0.6,
    backgroundColor: '#667eea',
    top: -Dimensions.get('window').width * 0.4,
    right: -Dimensions.get('window').width * 0.2,
  },
  bgCircle2: {
    position: 'absolute',
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').width * 0.8,
    borderRadius: Dimensions.get('window').width * 0.4,
    backgroundColor: '#764ba2',
    bottom: -Dimensions.get('window').width * 0.3,
    left: -Dimensions.get('window').width * 0.2,
  },
  closeButtonFloating: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
  },
  aboutContentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  heroGradient: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroIcon: {
    opacity: 0.9,
  },
  creatorCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  creatorCardInner: {
    padding: 24,
    alignItems: 'center',
  },
  creatorIconContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarLogo: {
    width: 70,
    height: 70,
  },
  glowRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    top: -7,
    left: -7,
  },
  creatorName: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  storyCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  storyCardInner: {
    padding: 24,
  },
  storyHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  storyTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  storyText: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
    fontWeight: '400',
  },
  highlightBox: {
    borderRadius: 20,
    marginVertical: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  highlightBoxInner: {
    padding: 24,
    alignItems: 'center',
  },
  errorIconContainer: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
  },
  highlightText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 20,
  },
  featureCard: {
    width: (Dimensions.get('window').width - 74) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  featureCardWide: {
    width: Dimensions.get('window').width - 68,
  },
  featureCardInner: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  featureCardText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  missionBox: {
    borderRadius: 20,
    marginTop: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  missionBoxInner: {
    padding: 24,
    alignItems: 'center',
  },
  missionText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '600',
    color: '#FFFFFF',
    marginVertical: 12,
  },
  missionBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 6,
  },
  missionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  thankYouCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  thankYouCardInner: {
    padding: 32,
    alignItems: 'center',
  },
  heartContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  thankYouTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  thankYouText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
  },
  contactInfo: {
    width: '100%',
    gap: 12,
    marginTop: 20,
    marginBottom: 28,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  signatureContainer: {
    alignItems: 'center',
  },
  signatureLine: {
    width: 100,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 12,
  },
  signature: {
    fontSize: 20,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});

export default GymTab;

