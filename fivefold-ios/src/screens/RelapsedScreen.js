import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { resetStreak } from '../services/habitsService';
import { hapticFeedback } from '../utils/haptics';

const RelapsedScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();

  const habits = route.params?.habits || [];
  const [selectedHabits, setSelectedHabits] = useState([]);
  const [resetting, setResetting] = useState(false);

  const toggleHabit = (habitId) => {
    hapticFeedback.selection();
    setSelectedHabits((prev) =>
      prev.includes(habitId)
        ? prev.filter((id) => id !== habitId)
        : [...prev, habitId]
    );
  };

  const handleResetCounter = async () => {
    if (selectedHabits.length === 0) {
      Alert.alert('Select a habit', 'Please select at least one habit to reset.');
      return;
    }

    hapticFeedback.heavy();
    setResetting(true);

    try {
      await Promise.all(selectedHabits.map((id) => resetStreak(id)));

      Alert.alert(
        'Stay strong',
        "You've got this.",
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
              setTimeout(() => navigation.goBack(), 50);
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            navigation.goBack();
          }}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Relapsed</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationWrapper}>
          <LinearGradient
            colors={['#7C3AED', '#5B21B6']}
            style={styles.illustrationCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.innerGlow}>
              <MaterialIcons name="self-improvement" size={64} color="rgba(255,255,255,0.95)" />
            </View>
          </LinearGradient>
          <View style={styles.illustrationRing} />
        </View>

        {/* Title & subtitle */}
        <Text style={styles.title}>Don't worry about it</Text>
        <Text style={styles.subtitle}>
          Slip-ups happen and can make you feel bad, but it's crucial not to be
          too hard on yourself. You're getting closer to freedom.
        </Text>

        {/* Habit picker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Which habit did you relapse on?</Text>
          <View style={styles.chipContainer}>
            {habits.map((habit) => {
              const isSelected = selectedHabits.includes(habit.id);
              return (
                <TouchableOpacity
                  key={habit.id}
                  activeOpacity={0.7}
                  onPress={() => toggleHabit(habit.id)}
                  style={[
                    styles.chip,
                    isSelected && {
                      borderColor: habit.color || '#7C3AED',
                      backgroundColor: `${habit.color || '#7C3AED'}18`,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={habit.icon || 'flag'}
                    size={18}
                    color={isSelected ? (habit.color || '#7C3AED') : '#888'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && { color: '#fff' },
                    ]}
                  >
                    {habit.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Journal card */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.journalCard}
          onPress={() => {
            hapticFeedback.cardTap();
            navigation.navigate('Journal');
          }}
        >
          <View style={styles.journalIconWrapper}>
            <MaterialIcons name="edit" size={22} color="#7C3AED" />
          </View>
          <View style={styles.journalTextWrapper}>
            <Text style={styles.journalTitle}>Journal Feelings</Text>
            <Text style={styles.journalSubtitle}>Capture your thoughts</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#555" />
        </TouchableOpacity>
      </ScrollView>

      {/* Reset button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleResetCounter}
          disabled={resetting}
          style={styles.resetButtonOuter}
        >
          <LinearGradient
            colors={['#DC2626', '#991B1B']}
            style={styles.resetButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="restart-alt" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.resetButtonText}>
              {resetting ? 'Resetting…' : 'Reset Counter'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  illustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 28,
  },
  illustrationCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationRing: {
    position: 'absolute',
    width: 158,
    height: 158,
    borderRadius: 79,
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.25)',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 14,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 7,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },

  journalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  journalIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  journalTextWrapper: {
    flex: 1,
  },
  journalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  journalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#0A0A0A',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  resetButtonOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  resetButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
});

export default RelapsedScreen;
