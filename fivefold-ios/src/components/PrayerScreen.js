import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { getTwoVerses } from '../data/prayerVerses';
import { hapticFeedback } from '../utils/haptics';
import { GlassCard } from './GlassEffect';
import { FadeInText, SlideUpText, TypewriterText } from './TextAnimations';
import {
  getPrayerStatus,
  getPrayerStatusColor,
  getPrayerStatusText,
  canCompletePrayer
} from '../utils/prayerTiming';
// Removed SwipeDownWrapper import

const PrayerScreen = ({ visible, onClose, prayer, onPrayerComplete, prayerHistory, onInterpretVerse }) => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme } = useTheme();
  const [currentVerses, setCurrentVerses] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [prayerStatus, setPrayerStatus] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for real-time status
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (visible && prayer) {
      // Get two verses for this prayer session (now async)
      const loadVerses = async () => {
        try {
          const verses = await getTwoVerses(prayer.slot);
          setCurrentVerses(verses);
        } catch (error) {
          console.error('Error loading prayer verses:', error);
          // Set loading state
          setCurrentVerses([
            { text: "Verse is loading...", reference: "Loading..." },
            { text: "Verse is loading...", reference: "Loading..." }
          ]);
        }
      };
      
      loadVerses();

      // Get prayer status
      const status = getPrayerStatus(prayer.time, false, prayerHistory, prayer.slot);
      setPrayerStatus(status);
      setIsCompleted(status.status === 'completed');
    }
  }, [visible, prayer, prayerHistory, currentTime]);

  const handleComplete = () => {
    // Absolutely prevent completion if outside window or missed
    if (!prayerStatus?.canComplete || prayerStatus?.status === 'missed' || isCompleted) {
      hapticFeedback.error(); // Error haptic for invalid completion attempt
      console.log('❌ Cannot complete prayer outside 30-minute window or if missed!');
      return;
    }
    
    hapticFeedback.success(); // Success haptic feedback
    onPrayerComplete(prayer.slot);
    setIsCompleted(true);
    console.log('🙏 Prayer completed within window! +1000 points earned!');
  };

  const handleClose = () => {
    hapticFeedback.light(); // Light haptic feedback
    onClose();
  };

  if (!prayer) return null;

  const getPrayerTitle = () => {
    const titles = {
      'pre_dawn': 'Before Sunrise Prayer',
      'post_sunrise': 'After Sunrise Prayer',
      'midday': 'Midday Prayer',
      'pre_sunset': 'Before Sunset Prayer',
      'night': 'Evening Prayer'
    };
    return titles[prayer.slot] || prayer.name;
  };

  const getPrayerDescription = () => {
    const descriptions = {
      'pre_dawn': 'Start your day in communion with God, seeking His guidance and strength for the day ahead.',
      'post_sunrise': 'Praise God for the new day and ask for His light to shine through your life.',
      'midday': 'Take a moment to pause, reflect, and reconnect with God in the midst of your day.',
      'pre_sunset': 'Give thanks for the day\'s blessings and prepare your heart for evening rest.',
      'night': 'End your day in gratitude and peace, surrendering your worries to the Lord.'
    };
    return descriptions[prayer.slot] || 'Take time to connect with God in prayer.';
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">

        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.background }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {prayer.icon} Prayer Time
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Prayer Title Card */}
          <BlurView intensity={18} style={styles.titleCard}>
            <Text style={[styles.prayerTitle, { color: theme.text }]}>
              {getPrayerTitle()}
            </Text>
            <Text style={[styles.prayerTime, { color: theme.primary }]}>
              {prayer.time}
            </Text>
            
            {/* Prayer Status */}
            {prayerStatus && (
              <View style={[styles.statusContainer, { 
                backgroundColor: getPrayerStatusColor(prayerStatus.status, theme) + '20',
                borderColor: getPrayerStatusColor(prayerStatus.status, theme) + '40'
              }]}>
                <Text style={[styles.statusText, { 
                  color: getPrayerStatusColor(prayerStatus.status, theme) 
                }]}>
                  {getPrayerStatusText(prayerStatus)}
                </Text>
                {prayerStatus.status === 'available' && prayerStatus.timeRemaining && (
                  <Text style={[styles.statusDetail, { color: theme.textSecondary }]}>
                    Complete within {prayerStatus.timeRemaining} minutes
                  </Text>
                )}
                {prayerStatus.status === 'upcoming' && prayerStatus.minutesUntilAvailable && (
                  <Text style={[styles.statusDetail, { color: theme.textSecondary }]}>
                    Available in {prayerStatus.minutesUntilAvailable} minutes
                  </Text>
                )}
                {prayerStatus.status === 'missed' && (
                  <Text style={[styles.statusDetail, { color: theme.textSecondary }]}>
                    You can still pray, but the window has passed
                  </Text>
                )}
              </View>
            )}
            
            <Text style={[styles.prayerDescription, { color: theme.textSecondary }]}>
              {getPrayerDescription()}
            </Text>
          </BlurView>

          {/* Bible Verses */}
          {currentVerses.map((verse, index) => (
            <BlurView 
              key={index} 
              intensity={18} 
              tint={isDark ? "dark" : "light"} 
              style={[styles.verseCard, { 
                backgroundColor: isDark 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : `${theme.primary}25` // Deeper color for individual items
              }]}
            >
              <LinearGradient
                colors={isDark ? ['#4F46E5', '#7C3AED'] : ['#6366F1', '#8B5CF6']}
                style={styles.verseGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.verseNumber}>Verse {index + 1}</Text>
              </LinearGradient>
              
              <View style={styles.verseContent}>
                <Text 
                  style={[styles.verseText, { color: theme.text }]}
                  selectable={true}
                  selectTextOnFocus={false}
                  dataDetectorType="none"
                  allowFontScaling={true}
                >
                  "{verse.text}"
                </Text>
                <Text style={[styles.verseReference, { color: theme.primary }]}>
                  - {verse.reference}
                </Text>
                
                {/* Interpret Button */}
                <TouchableOpacity
                  style={[styles.interpretButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}
                  onPress={() => {
                    hapticFeedback.medium();
                    if (onInterpretVerse) {
                      onInterpretVerse(verse);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="forum" size={16} color={theme.primary} />
                  <Text style={[styles.interpretButtonText, { color: theme.primary }]}>
                    Discuss
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          ))}

          {/* Prayer Actions */}
          <BlurView 
            intensity={18} 
            tint={isDark ? "dark" : "light"} 
            style={[styles.actionsCard, { 
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.05)' 
                : `${theme.primary}15` // Use theme primary color with 15% opacity for better visibility
            }]}
          >
            <Text style={[styles.actionsTitle, { color: theme.text }]}>
              🙏 Prayer Time
            </Text>
            <Text style={[styles.actionsDescription, { color: theme.textSecondary }]}>
              Take a moment to pray, meditate on these verses, and connect with God.
            </Text>

            <TouchableOpacity
              style={[
                styles.completeButton,
                { 
                  backgroundColor: 
                    isCompleted ? theme.success 
                    : prayerStatus?.status === 'missed' ? theme.error
                    : prayerStatus?.canComplete ? theme.primary 
                    : theme.textSecondary,
                  opacity: (isCompleted || !prayerStatus?.canComplete || prayerStatus?.status === 'missed') ? 0.7 : 1
                }
              ]}
              onPress={handleComplete}
              disabled={isCompleted || !prayerStatus?.canComplete || prayerStatus?.status === 'missed'}
            >
              <MaterialIcons 
                name={
                  isCompleted ? "check-circle" 
                  : prayerStatus?.status === 'missed' ? "error"
                  : prayerStatus?.canComplete ? "favorite"
                  : "schedule"
                } 
                size={24} 
                color="#ffffff" 
              />
              <Text style={styles.completeButtonText}>
                {isCompleted 
                  ? 'Prayer Completed (+1000pts)' 
                  : prayerStatus?.status === 'missed'
                    ? 'Prayer Missed (No Points)'
                  : prayerStatus?.canComplete 
                    ? 'Complete Prayer (+1000pts)'
                    : 'Outside Prayer Window'
                }
              </Text>
            </TouchableOpacity>

            {isCompleted && (
              <View style={styles.completedMessage}>
                <Text style={[styles.completedText, { color: theme.success }]}>
                  ✨ Thank you for taking time to pray! May God bless your day.
                </Text>
              </View>
            )}

            {prayerStatus?.status === 'missed' && (
              <View style={[styles.completedMessage, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Text style={[styles.completedText, { color: theme.error }]}>
                  😔 This prayer window has passed. You can still pray for spiritual benefit, but no points will be awarded.
                </Text>
              </View>
            )}
          </BlurView>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>

    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleCard: {
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  prayerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  prayerTime: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  prayerDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  statusContainer: {
    marginVertical: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusDetail: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  verseCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  verseGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  verseNumber: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verseContent: {
    padding: 20,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  interpretButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    alignSelf: 'flex-end',
  },
  interpretButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionsCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  actionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionsDescription: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completedMessage: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  completedText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default PrayerScreen;
