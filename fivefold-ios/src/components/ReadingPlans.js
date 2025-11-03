import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import OneYearBiblePlan from './OneYearBiblePlan';

const { width } = Dimensions.get('window');

const ReadingPlans = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showOneYearPlan, setShowOneYearPlan] = useState(false);

  // Reset selectedPlan when closing
  useEffect(() => {
    if (!visible) {
      setSelectedPlan(null);
    }
  }, [visible]);

  // Reading plan types
  const readingPlans = [
    {
      id: 'one-year',
      title: 'One Year Bible',
      subtitle: 'Complete Bible in 365 days',
      icon: 'calendar-today',
      color: '#E91E63',
      gradient: ['#FF6B9D', '#E91E63', '#C2185B'],
      duration: '365 days',
      dailyTime: '15-20 min',
      description: 'Read through the entire Bible in one year with daily readings from Old Testament, New Testament, Psalms, and Proverbs.',
      features: ['Daily readings', 'Progress tracking', 'Balanced reading'],
    },
    {
      id: '90-day',
      title: '90 Day Challenge',
      subtitle: 'Fast-paced complete reading',
      icon: 'flash-on',
      color: '#FF9800',
      gradient: ['#FFB74D', '#FF9800', '#F57C00'],
      duration: '90 days',
      dailyTime: '40-50 min',
      description: 'An intensive journey through the entire Bible in just 90 days. Perfect for those seeking a focused, immersive experience.',
      features: ['Accelerated pace', 'Deep immersion', 'Catch-up options'],
    },
    {
      id: 'chronological',
      title: 'Chronological Bible',
      subtitle: 'Read in historical order',
      icon: 'timeline',
      color: '#2196F3',
      gradient: ['#64B5F6', '#2196F3', '#1976D2'],
      duration: '365 days',
      dailyTime: '15-20 min',
      description: 'Experience the Bible as events unfolded in history. See how different books and stories connect chronologically.',
      features: ['Historical order', 'Context cards', 'Timeline view'],
    },
    {
      id: 'topical-faith',
      title: 'Topical: Faith Journey',
      subtitle: 'Strengthen your faith',
      icon: 'favorite',
      color: '#9C27B0',
      gradient: ['#BA68C8', '#9C27B0', '#7B1FA2'],
      duration: '30 days',
      dailyTime: '10-15 min',
      description: 'Explore verses and stories focused on building and strengthening faith. Perfect for spiritual growth.',
      features: ['Faith-focused', 'Daily reflections', 'Practical application'],
    },
    {
      id: 'topical-prayer',
      title: 'Topical: Prayer Life',
      subtitle: 'Deepen your prayer',
      icon: 'people',
      color: '#4CAF50',
      gradient: ['#81C784', '#4CAF50', '#388E3C'],
      duration: '21 days',
      dailyTime: '10-15 min',
      description: 'Learn about prayer through scripture. Discover how biblical figures prayed and what the Bible teaches about prayer.',
      features: ['Prayer teachings', 'Guided practice', 'Daily prayers'],
    },
    {
      id: 'character-journey',
      title: 'Character Journey',
      subtitle: 'Follow biblical figures',
      icon: 'person',
      color: '#F44336',
      gradient: ['#E57373', '#F44336', '#D32F2F'],
      duration: '60 days',
      dailyTime: '12-18 min',
      description: 'Walk through the Bible following key characters. See their stories unfold from beginning to end.',
      features: ['Character focus', 'Story arcs', 'Life lessons'],
    },
    {
      id: 'nt-30',
      title: 'New Testament in 30',
      subtitle: 'Complete NT in one month',
      icon: 'book',
      color: '#00BCD4',
      gradient: ['#4DD0E1', '#00BCD4', '#0097A7'],
      duration: '30 days',
      dailyTime: '25-30 min',
      description: 'Read the entire New Testament in just 30 days. Focus on Jesus, the early church, and Christian teachings.',
      features: ['NT focused', 'Gospel stories', 'Early church'],
    },
    {
      id: 'wisdom',
      title: 'Proverbs & Psalms',
      subtitle: 'Daily wisdom',
      icon: 'lightbulb',
      color: '#FF5722',
      gradient: ['#FF8A65', '#FF5722', '#E64A19'],
      duration: 'Ongoing',
      dailyTime: '5-10 min',
      description: 'Read one Proverb and one Psalm each day. Perfect for daily wisdom and worship.',
      features: ['Quick reads', 'Daily wisdom', 'Worship focus'],
    },
  ];

  const handlePlanPress = (plan) => {
    hapticFeedback.medium();
    setSelectedPlan(plan);
  };

  const renderPlanCard = (plan, index) => {
    const scaleAnim = new Animated.Value(1);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    return (
      <Animated.View
        key={plan.id}
        style={{
          transform: [{ scale: scaleAnim }],
          marginBottom: 16,
        }}
      >
        <TouchableOpacity
          style={styles.planCard}
          onPress={() => handlePlanPress(plan)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <LinearGradient
            colors={plan.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planGradient}
          >
            {/* Icon */}
            <View style={[styles.planIconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
              <MaterialIcons name={plan.icon} size={32} color="#FFFFFF" />
            </View>

            {/* Content */}
            <View style={styles.planContent}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planSubtitle}>{plan.subtitle}</Text>

              {/* Duration & Time */}
              <View style={styles.planMeta}>
                <View style={styles.metaItem}>
                  <MaterialIcons name="schedule" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.metaText}>{plan.duration}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MaterialIcons name="timer" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.metaText}>{plan.dailyTime}/day</Text>
                </View>
              </View>
            </View>

            {/* Arrow */}
            <View style={styles.planArrow}>
              <MaterialIcons name="chevron-right" size={28} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPlansList = () => (
    <ScrollView
      style={styles.content}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 110 : 80, paddingHorizontal: 20, paddingBottom: 30 }}
    >
      {/* Header Info */}
      <View style={styles.headerInfo}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Choose Your Reading Plan</Text>
        <Text style={[styles.headerDescription, { color: theme.textSecondary }]}>
          Select a plan that fits your schedule and goals
        </Text>
      </View>

      {/* Plans */}
      {readingPlans.map((plan, index) => renderPlanCard(plan, index))}
    </ScrollView>
  );

  const renderPlanDetail = () => {
    if (!selectedPlan) return null;

    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 130 : 100, paddingHorizontal: 20, paddingBottom: 30 }}
        >
          {/* Hero Card */}
          <View style={styles.heroCard}>
            <LinearGradient
              colors={selectedPlan.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              {/* Back Button */}
              <TouchableOpacity
                style={styles.heroBackButton}
                onPress={() => {
                  hapticFeedback.light();
                  setSelectedPlan(null);
                }}
              >
                <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Icon */}
              <View style={[styles.heroIcon, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                <MaterialIcons name={selectedPlan.icon} size={48} color="#FFFFFF" />
              </View>

              {/* Title */}
              <Text style={styles.heroTitle}>{selectedPlan.title}</Text>
              <Text style={styles.heroSubtitle}>{selectedPlan.subtitle}</Text>

              {/* Meta Info */}
              <View style={styles.heroMeta}>
                <View style={styles.heroMetaItem}>
                  <MaterialIcons name="schedule" size={18} color="#FFFFFF" />
                  <Text style={styles.heroMetaText}>{selectedPlan.duration}</Text>
                </View>
                <View style={styles.heroMetaItem}>
                  <MaterialIcons name="timer" size={18} color="#FFFFFF" />
                  <Text style={styles.heroMetaText}>{selectedPlan.dailyTime}/day</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Description Card */}
          <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
            <View style={[styles.infoHeader, { backgroundColor: selectedPlan.color + '15' }]}>
              <MaterialIcons name="info-outline" size={22} color={selectedPlan.color} />
              <Text style={[styles.infoTitle, { color: theme.text }]}>About This Plan</Text>
            </View>
            <Text style={[styles.infoDescription, { color: theme.textSecondary }]}>
              {selectedPlan.description}
            </Text>
          </View>

          {/* Features Card */}
          <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
            <View style={[styles.infoHeader, { backgroundColor: selectedPlan.color + '15' }]}>
              <MaterialIcons name="check-circle" size={22} color={selectedPlan.color} />
              <Text style={[styles.infoTitle, { color: theme.text }]}>What's Included</Text>
            </View>
            <View style={styles.featuresList}>
              {selectedPlan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialIcons name="check" size={20} color={selectedPlan.color} />
                  <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: selectedPlan.color }]}
            onPress={() => {
              hapticFeedback.medium();
              
              if (selectedPlan.id === 'one-year') {
                // Close the reading plans modal first, then open the bible plan
                onClose();
                // Small delay to let the first modal close
                setTimeout(() => {
                  setShowOneYearPlan(true);
                }, 300);
              } else {
                // Other plans coming soon
                Alert.alert(
                  'Coming Soon',
                  `${selectedPlan.title} is coming soon! For now, try the One Year Bible plan.`,
                  [{ text: 'OK', style: 'default' }]
                );
              }
            }}
          >
            <Text style={styles.startButtonText}>
              {selectedPlan.id === 'one-year' ? 'Start This Plan' : 'Coming Soon'}
            </Text>
            <MaterialIcons name="arrow-forward" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedPlan.id !== 'one-year' && (
            <View style={[styles.comingSoonNotice, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <MaterialIcons name="construction" size={20} color={theme.textSecondary} />
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                This plan is coming soon with progress tracking, daily reminders, and more features.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />

          {/* Main Content */}
          {selectedPlan ? renderPlanDetail() : renderPlansList()}

        {/* Transparent Blurred Header - Same as Bible Timeline */}
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
              onPress={() => {
                hapticFeedback.light();
                if (selectedPlan) {
                  setSelectedPlan(null);
                } else {
                  onClose();
                }
              }}
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>
                {selectedPlan ? 'Back' : 'Close'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.solidHeaderTitle, { color: theme.text }]}>
              Reading Plans
            </Text>
            <View style={{ width: 60 }} />
          </View>
        </BlurView>
      </View>
    </Modal>

    {/* One Year Bible Plan Modal - Separate from Reading Plans Modal */}
    <OneYearBiblePlan
      visible={showOneYearPlan}
      onClose={() => {
        setShowOneYearPlan(false);
      }}
    />
    </>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  solidHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  // Header Info
  headerInfo: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerDescription: {
    fontSize: 16,
    lineHeight: 22,
  },

  // Plan Cards
  planCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  planGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  planIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  planContent: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  planSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
  },
  planMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Plan Detail
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Hero Card
  heroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  heroGradient: {
    padding: 32,
    alignItems: 'center',
  },
  heroBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroMetaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Info Card
  infoCard: {
    borderRadius: 20,
    marginBottom: 16,
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
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    paddingBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  infoDescription: {
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },

  // Features List
  featuresList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },

  // Start Button
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
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
  startButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Coming Soon Notice
  comingSoonNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  comingSoonText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});

export default ReadingPlans;

