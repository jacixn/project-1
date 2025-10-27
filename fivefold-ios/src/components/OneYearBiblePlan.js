import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReadingPlanService from '../services/readingPlanService';

const { width } = Dimensions.get('window');

const STORAGE_KEY = 'one_year_bible_progress';

const OneYearBiblePlan = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [progress, setProgress] = useState({});
  const [currentDay, setCurrentDay] = useState(1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [readingPlanData, setReadingPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef(null);

  // Load reading plan data from GitHub
  useEffect(() => {
    if (visible) {
      loadReadingPlanData();
    }
  }, [visible]);

  // Load progress from storage
  useEffect(() => {
    loadProgress();
  }, []);

  const loadReadingPlanData = async () => {
    try {
      setLoading(true);
      const data = await ReadingPlanService.getReadingPlan();
      setReadingPlanData(data);
      console.log('📖 Loaded reading plan with', data.readings?.length || 0, 'days');
    } catch (error) {
      console.error('Error loading reading plan:', error);
      Alert.alert('Error', 'Failed to load reading plan. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setProgress(data.completedDays || {});
        setStartDate(data.startDate || new Date().toISOString());
        
        // Calculate current day based on start date
        if (data.startDate) {
          const start = new Date(data.startDate);
          const today = new Date();
          const diffTime = Math.abs(today - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setCurrentDay(Math.min(diffDays, 365));
        }
      } else {
        // First time - set start date to today
        const today = new Date().toISOString();
        setStartDate(today);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
          startDate: today,
          completedDays: {}
        }));
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveProgress = async (newProgress) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        startDate,
        completedDays: newProgress
      }));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const markDayComplete = async (day) => {
    hapticFeedback.success();
    const newProgress = {
      ...progress,
      [day]: {
        completed: true,
        completedAt: new Date().toISOString()
      }
    };
    setProgress(newProgress);
    await saveProgress(newProgress);
    
    // Show celebration
    Alert.alert(
      '🎉 Day Complete!',
      `Great job completing Day ${day}! Keep going!`,
      [{ text: 'Continue', style: 'default' }]
    );
  };

  const markDayIncomplete = async (day) => {
    hapticFeedback.light();
    const newProgress = { ...progress };
    delete newProgress[day];
    setProgress(newProgress);
    await saveProgress(newProgress);
  };

  // Calculate statistics
  const totalDays = readingPlanData?.totalDays || 365;
  const completedDays = Object.keys(progress).length;
  const progressPercentage = Math.round((completedDays / totalDays) * 100);
  const daysRemaining = totalDays - completedDays;

  // Calculate streak
  const calculateStreak = () => {
    let streak = 0;
    for (let i = currentDay; i >= 1; i--) {
      if (progress[i]) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  const renderProgressRing = () => {
    const size = 140;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = circumference - (progressPercentage / 100) * circumference;

    return (
      <View style={styles.progressRingContainer}>
        <View style={{ width: size, height: size }}>
          {/* Background circle */}
          <View style={[styles.progressCircle, { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }]} />
          
          {/* Foreground progress circle (simplified as we can't use SVG easily) */}
          <View style={[styles.progressCircle, { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: '#E91E63',
            borderStyle: 'solid',
            position: 'absolute',
            transform: [{ rotate: '-90deg' }],
          }]} />
          
          {/* Center content */}
          <View style={styles.progressCenter}>
            <Text style={[styles.progressPercentage, { color: theme.text }]}>
              {progressPercentage}%
            </Text>
            <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
              Complete
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStatsCard = () => (
    <View style={[styles.statsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
      <LinearGradient
        colors={['#E91E63', '#C2185B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsGradient}
      >
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completedDays}</Text>
          <Text style={styles.statLabel}>Days Done</Text>
        </View>
        
        <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{daysRemaining}</Text>
          <Text style={styles.statLabel}>Days Left</Text>
        </View>
        
        <View style={[styles.statDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
        
        <View style={styles.statItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="local-fire-department" size={24} color="#FFF" />
            <Text style={styles.statValue}>{currentStreak}</Text>
          </View>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderDayCard = (reading, index) => {
    const isCompleted = progress[reading.day];
    const isCurrent = reading.day === currentDay;
    const isPast = reading.day < currentDay;
    const isFuture = reading.day > currentDay;

    return (
      <TouchableOpacity
        key={reading.day}
        style={[
          styles.dayCard,
          isCompleted && styles.dayCardCompleted,
          isCurrent && styles.dayCardCurrent,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }
        ]}
        onPress={() => {
          hapticFeedback.light();
          setSelectedDay(reading);
        }}
        activeOpacity={0.7}
      >
        {/* Completed Badge */}
        {isCompleted && (
          <View style={[styles.completedBadge, { backgroundColor: '#4CAF50' }]}>
            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
          </View>
        )}

        {/* Current Badge */}
        {isCurrent && !isCompleted && (
          <View style={[styles.currentBadge, { backgroundColor: '#E91E63' }]}>
            <Text style={styles.currentBadgeText}>Today</Text>
          </View>
        )}

        {/* Day Number */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayNumber, { color: theme.text }]}>Day {reading.day}</Text>
          <Text style={[styles.dayDate, { color: theme.textSecondary }]}>{reading.date}</Text>
        </View>

        {/* Readings Preview */}
        <View style={styles.readingsPreview}>
          <View style={styles.readingItem}>
            <MaterialIcons name="book" size={16} color={theme.primary} />
            <Text style={[styles.readingText, { color: theme.textSecondary }]} numberOfLines={1}>
              {reading.oldTestament.reference}
            </Text>
          </View>
          <View style={styles.readingItem}>
            <MaterialIcons name="auto-stories" size={16} color={theme.primary} />
            <Text style={[styles.readingText, { color: theme.textSecondary }]} numberOfLines={1}>
              {reading.newTestament.reference}
            </Text>
          </View>
        </View>

        {/* Arrow */}
        <View style={[styles.dayArrow, { backgroundColor: isCompleted ? '#4CAF5020' : `${theme.primary}20` }]}>
          <MaterialIcons 
            name="chevron-right" 
            size={20} 
            color={isCompleted ? '#4CAF50' : theme.primary} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderDayDetail = () => {
    if (!selectedDay) return null;

    const isCompleted = progress[selectedDay.day];

    return (
      <Modal visible={!!selectedDay} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedDay(null)}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

          <ScrollView 
            style={styles.dayDetailContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingBottom: 100 }}
          >
            {/* Hero Header */}
            <View style={styles.dayDetailHero}>
              <LinearGradient
                colors={isCompleted ? ['#4CAF50', '#388E3C'] : ['#E91E63', '#C2185B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.dayDetailHeroGradient}
              >
                {isCompleted && (
                  <MaterialIcons name="check-circle" size={48} color="#FFFFFF" style={{ marginBottom: 12 }} />
                )}
                <Text style={styles.dayDetailTitle}>Day {selectedDay.day}</Text>
                <Text style={styles.dayDetailDate}>{selectedDay.date}</Text>
              </LinearGradient>
            </View>

            {/* Reading Sections */}
            <View style={styles.readingSections}>
              {/* Old Testament */}
              <View style={[styles.readingSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
                <View style={[styles.readingSectionHeader, { backgroundColor: '#E91E6315' }]}>
                  <MaterialIcons name="book" size={24} color="#E91E63" />
                  <Text style={[styles.readingSectionTitle, { color: theme.text }]}>Old Testament</Text>
                </View>
                <View style={styles.readingSectionContent}>
                  <Text style={[styles.referenceText, { color: theme.primary }]}>
                    {selectedDay.oldTestament.reference}
                  </Text>
                  <Text style={[styles.bookNameText, { color: theme.textSecondary }]}>
                    {selectedDay.oldTestament.book} {selectedDay.oldTestament.chapters}
                  </Text>
                </View>
              </View>

              {/* New Testament */}
              <View style={[styles.readingSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
                <View style={[styles.readingSectionHeader, { backgroundColor: '#2196F315' }]}>
                  <MaterialIcons name="auto-stories" size={24} color="#2196F3" />
                  <Text style={[styles.readingSectionTitle, { color: theme.text }]}>New Testament</Text>
                </View>
                <View style={styles.readingSectionContent}>
                  <Text style={[styles.referenceText, { color: theme.primary }]}>
                    {selectedDay.newTestament.reference}
                  </Text>
                  <Text style={[styles.bookNameText, { color: theme.textSecondary }]}>
                    {selectedDay.newTestament.book} {selectedDay.newTestament.chapters}
                  </Text>
                </View>
              </View>

              {/* Psalm */}
              <View style={[styles.readingSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
                <View style={[styles.readingSectionHeader, { backgroundColor: '#9C27B015' }]}>
                  <MaterialIcons name="music-note" size={24} color="#9C27B0" />
                  <Text style={[styles.readingSectionTitle, { color: theme.text }]}>Psalm</Text>
                </View>
                <View style={styles.readingSectionContent}>
                  <Text style={[styles.referenceText, { color: theme.primary }]}>
                    {selectedDay.psalm.reference}
                  </Text>
                </View>
              </View>

              {/* Proverb */}
              <View style={[styles.readingSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
                <View style={[styles.readingSectionHeader, { backgroundColor: '#FF980015' }]}>
                  <MaterialIcons name="lightbulb" size={24} color="#FF9800" />
                  <Text style={[styles.readingSectionTitle, { color: theme.text }]}>Proverb</Text>
                </View>
                <View style={styles.readingSectionContent}>
                  <Text style={[styles.referenceText, { color: theme.primary }]}>
                    {selectedDay.proverb.reference}
                  </Text>
                </View>
              </View>
            </View>

            {/* Reading Tips */}
            <View style={[styles.tipsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <MaterialIcons name="info-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.tipsText, { color: theme.textSecondary }]}>
                Tap each reference to open it in your Bible reader. Take your time and reflect on what you read.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Action Button */}
          <View style={[styles.bottomActionBar, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            {isCompleted ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.textSecondary }]}
                onPress={() => {
                  markDayIncomplete(selectedDay.day);
                  setSelectedDay(null);
                }}
              >
                <MaterialIcons name="replay" size={22} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Mark as Incomplete</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => {
                  markDayComplete(selectedDay.day);
                  setSelectedDay(null);
                }}
              >
                <MaterialIcons name="check-circle" size={22} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Mark as Complete</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Header */}
          <BlurView
            intensity={20}
            tint={isDark ? 'dark' : 'light'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              backgroundColor: 'transparent',
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
              overflow: 'hidden',
            }}
          >
            <View style={{ height: Platform.OS === 'ios' ? 50 : 30, backgroundColor: 'transparent' }} />
            <View style={styles.dayDetailHeader}>
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  setSelectedDay(null);
                }}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
              <Text style={[styles.dayDetailHeaderTitle, { color: theme.text }]}>
                Today's Reading
              </Text>
              <View style={{ width: 60 }} />
            </View>
          </BlurView>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />

        {/* Loading State */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[{ marginTop: 16, fontSize: 16, color: theme.textSecondary }]}>
              Loading reading plan...
            </Text>
          </View>
        ) : !readingPlanData ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
            <MaterialIcons name="error-outline" size={64} color={theme.textSecondary} />
            <Text style={[{ marginTop: 16, fontSize: 18, color: theme.text, textAlign: 'center' }]}>
              Failed to load reading plan
            </Text>
            <TouchableOpacity
              style={[{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.primary, borderRadius: 12 }]}
              onPress={loadReadingPlanData}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        {/* Main Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 110 : 80, paddingBottom: 30 }}
        >
          {/* Progress Ring */}
          {renderProgressRing()}

          {/* Stats Card */}
          {renderStatsCard()}

          {/* Section Title */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Readings</Text>
            <TouchableOpacity
              onPress={() => {
                // Scroll to current day
                if (scrollViewRef.current) {
                  hapticFeedback.light();
                }
              }}
              style={[styles.todayButton, { backgroundColor: `${theme.primary}20` }]}
            >
              <MaterialIcons name="today" size={16} color={theme.primary} />
              <Text style={[styles.todayButtonText, { color: theme.primary }]}>Today</Text>
            </TouchableOpacity>
          </View>

          {/* Days List */}
          <View style={styles.daysContainer}>
            {readingPlanData.readings.map((reading, index) => renderDayCard(reading, index))}
          </View>
        </ScrollView>

        {/* Day Detail Modal */}
        {renderDayDetail()}
          </>
        )}

        {/* Transparent Blurred Header */}
        <BlurView
          intensity={20}
          tint={isDark ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'transparent',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
          <View style={[styles.solidHeader, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: 8, paddingBottom: 12 }]}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.solidHeaderTitle, { color: theme.text }]}>
              One Year Bible
            </Text>
            <View style={{ width: 60 }} />
          </View>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  solidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 3,
  },
  solidHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  // Progress Ring
  progressRingContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  // Stats Card
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statsGradient: {
    flexDirection: 'row',
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 12,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Days Container
  daysContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },

  // Day Card
  dayCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  dayCardCompleted: {
    borderWidth: 2,
    borderColor: '#4CAF5040',
  },
  dayCardCurrent: {
    borderWidth: 2,
    borderColor: '#E91E6340',
  },
  completedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 20,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  currentBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dayHeader: {
    marginRight: 12,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  dayDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  readingsPreview: {
    flex: 1,
    gap: 6,
  },
  readingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readingText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  dayArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Day Detail
  dayDetailContent: {
    flex: 1,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dayDetailHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  dayDetailHero: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dayDetailHeroGradient: {
    padding: 32,
    alignItems: 'center',
  },
  dayDetailTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dayDetailDate: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // Reading Sections
  readingSections: {
    paddingHorizontal: 20,
    gap: 16,
  },
  readingSection: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  readingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  readingSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  readingSectionContent: {
    padding: 16,
    paddingTop: 8,
  },
  referenceText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  bookNameText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Tips Card
  tipsCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  // Bottom Action Bar
  bottomActionBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default OneYearBiblePlan;

