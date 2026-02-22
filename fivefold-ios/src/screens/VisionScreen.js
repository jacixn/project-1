import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { hapticFeedback } from '../utils/haptics';
import PrayerCompletionManager from '../utils/prayerCompletionManager';
import {
  loadVisions,
  addVision,
  deleteVision,
  addReflection,
  markAchieved,
  getProgress,
  getTimeRemaining,
  getActiveVisions,
  CATEGORIES,
  TIMEFRAMES,
} from '../services/visionService';

const VisionScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, isDark, currentTheme, selectedWallpaperIndex } = useTheme();
  const [visions, setVisions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(null);

  const textPrimary = isDark ? '#FFFFFF' : theme.text;
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#6B7280';
  const textTertiary = isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const cardSlideAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(30))).current;
  const cardFadeAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

  useFocusEffect(
    useCallback(() => {
      loadVisions().then((v) => setVisions(v));
    }, [])
  );

  useEffect(() => {
    const anims = cardSlideAnims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(cardFadeAnims[i], {
          toValue: 1,
          duration: 400,
          delay: i * 80,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          delay: i * 80,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(0, anims).start();
  }, []);

  const refresh = async () => {
    const v = await loadVisions();
    setVisions(v);
  };

  const handleDelete = (vision) => {
    Alert.alert('Delete Vision', `Remove "${vision.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          hapticFeedback.medium();
          await deleteVision(vision.id);
          refresh();
        },
      },
    ]);
  };

  const handleAchieve = async (vision) => {
    hapticFeedback.success();
    await markAchieved(vision.id);

    const created = new Date(vision.createdAt).getTime();
    const target = new Date(vision.targetDate).getTime();
    const durationDays = (target - created) / (1000 * 60 * 60 * 24);

    let points;
    if (durationDays > 30) {
      points = 230;
    } else if (durationDays > 1) {
      points = 92;
    } else {
      points = 52;
    }

    try {
      await PrayerCompletionManager.addPoints(points);
    } catch (e) {
      console.warn('Failed to award vision points:', e);
    }

    Alert.alert('Vision Achieved', `You earned ${points} points!`);
    refresh();
  };

  const sortByDate = (a, b) => new Date(a.targetDate) - new Date(b.targetDate);
  const active = visions.filter((v) => v.status === 'active').sort(sortByDate);
  const achieved = visions.filter((v) => v.status === 'achieved').sort(sortByDate);

  const totalReflections = visions.reduce((sum, v) => sum + (v.reflections?.length || 0), 0);

  const renderVisionItem = (vision) => {
    const progress = getProgress(vision);
    const timeLeft = getTimeRemaining(vision);
    const isExpanded = expandedId === vision.id;
    const isAchieved = vision.status === 'achieved';
    const barColor = isAchieved ? (theme.success || '#22c55e') : theme.primary;

    return (
      <TouchableOpacity
        key={vision.id}
        activeOpacity={0.85}
        onPress={() => {
          hapticFeedback.light();
          setExpandedId(isExpanded ? null : vision.id);
        }}
        onLongPress={() => {
          hapticFeedback.medium();
          Alert.alert(vision.title, null, [
            ...(vision.status === 'active'
              ? [{ text: 'Mark as Achieved', onPress: () => handleAchieve(vision) }]
              : []),
            { text: 'Delete', style: 'destructive', onPress: () => handleDelete(vision) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}
      >
        <View style={styles.goalRow}>
          <View style={styles.goalLabelRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalLabel, { color: textPrimary }]} numberOfLines={isExpanded ? 0 : 2}>
                {vision.title}
              </Text>
              <Text style={[styles.goalMeta, { color: textTertiary }]}>
                {vision.timeframe === 'custom'
                  ? new Date(vision.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : (TIMEFRAMES.find((t) => t.id === vision.timeframe)?.label || vision.timeframe)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.goalValue, { color: isAchieved ? (theme.success || '#22c55e') : textPrimary }]}>
                {isAchieved ? 'Done' : `${progress > 0 ? Math.max(1, Math.round(progress * 100)) : 0}%`}
              </Text>
              <Text style={[styles.goalTimeLeft, { color: textTertiary }]}>{timeLeft}</Text>
            </View>
            {isAchieved && (
              <View style={[styles.achievedBadge, { backgroundColor: `${theme.success || '#22c55e'}20`, marginLeft: 8 }]}>
                <MaterialIcons name="emoji-events" size={16} color={theme.success || '#22c55e'} />
              </View>
            )}
          </View>
          <View style={[styles.goalBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F0F0F5' }]}>
            <LinearGradient
              colors={[barColor, barColor + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.goalBarFill, { width: `${Math.max(Math.round(progress * 100), 1)}%` }]}
            />
          </View>

          {isExpanded && (
            <View style={styles.expandedSection}>
              <View style={[styles.divider, { backgroundColor: cardBorder }]} />

              <View style={styles.reflectionsHeader}>
                <Text style={[styles.reflectionsTitle, { color: textPrimary }]}>Reflections</Text>
                {vision.status === 'active' && (
                  <TouchableOpacity
                    onPress={() => setShowReflectionModal(vision.id)}
                    style={[styles.addReflectionBtn, { backgroundColor: theme.primary + '14' }]}
                  >
                    <MaterialIcons name="add" size={16} color={theme.primary} />
                    <Text style={[styles.addReflectionText, { color: theme.primary }]}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              {vision.reflections.length === 0 ? (
                <Text style={[styles.noReflections, { color: textTertiary }]}>
                  No reflections yet — tap "Add" to journal your progress
                </Text>
              ) : (
                vision.reflections
                  .slice()
                  .reverse()
                  .map((ref, idx) => (
                    <View key={idx} style={[styles.reflectionItem, { borderLeftColor: theme.primary }]}>
                      <Text style={[styles.reflectionDate, { color: textTertiary }]}>
                        {new Date(ref.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text style={[styles.reflectionNote, { color: textPrimary }]}>{ref.note}</Text>
                    </View>
                  ))
              )}

              {vision.status === 'active' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => handleAchieve(vision)}
                    style={[styles.actionBtn, { backgroundColor: `${theme.success || '#22c55e'}15` }]}
                  >
                    <MaterialIcons name="emoji-events" size={16} color={theme.success || '#22c55e'} />
                    <Text style={[styles.actionText, { color: theme.success || '#22c55e' }]}>Achieved</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(vision)}
                    style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
                  >
                    <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title, items, cardIndex) => {
    if (!items.length) return null;
    return (
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            opacity: cardFadeAnims[cardIndex] || 1,
            transform: [{ translateY: cardSlideAnims[cardIndex] || 0 }],
            ...(!isDark && styles.cardShadow),
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: textPrimary }]}>{title}</Text>
        {items.map(renderVisionItem)}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <TouchableOpacity
        style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', position: 'absolute', top: insets.top + 8, left: 20, zIndex: 10 }]}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="arrow-back" size={22} color={textPrimary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.dashHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerBtn} />
          <Text style={[styles.dashTitle, { color: textPrimary }]}>Vision</Text>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => { hapticFeedback.light(); setShowAddModal(true); }}
          >
            <MaterialIcons name="add" size={22} color={textPrimary} />
          </TouchableOpacity>
        </View>

        {visions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FC' }]}>
              <MaterialIcons name="visibility" size={32} color={textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: textSecondary }]}>No visions yet</Text>
            <Text style={[styles.emptySubtitle, { color: textTertiary }]}>
              Tap + to set your first life goal
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={() => { hapticFeedback.light(); setShowAddModal(true); }}
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Set Your Vision</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderSection('Active', active, 0)}
            {renderSection('Achieved', achieved, 1)}

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
              <View style={styles.statsRow}>
                {[
                  { icon: 'visibility', value: active.length, label: 'Active', color: theme.primary },
                  { icon: 'emoji-events', value: achieved.length, label: 'Achieved', color: '#F59E0B' },
                  { icon: 'rate-review', value: totalReflections, label: 'Reflections', color: '#10B981' },
                ].map((s) => (
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
          </>
        )}
      </ScrollView>

      <AddVisionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={async (data) => {
          await addVision(data);
          refresh();
          setShowAddModal(false);
        }}
        theme={theme}
        isDark={isDark}
      />

      <ReflectionModal
        visible={!!showReflectionModal}
        onClose={() => setShowReflectionModal(null)}
        onSave={async (note) => {
          if (showReflectionModal) {
            await addReflection(showReflectionModal, note);
            refresh();
          }
          setShowReflectionModal(null);
        }}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
};

// ── Add Vision Modal ─────────────────────────────────────────────────

const AddVisionModal = ({ visible, onClose, onAdd, theme, isDark }) => {
  const [title, setTitle] = useState('');
  const [timeframe, setTimeframe] = useState('5yr');
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  });

  useEffect(() => {
    if (visible) {
      setTitle('');
      setTimeframe('5yr');
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setCustomDate(d);
    }
  }, [visible]);

  const handleSave = () => {
    if (!title.trim()) return;
    hapticFeedback.success();

    let targetDate;
    if (timeframe === 'custom') {
      targetDate = customDate.toISOString();
    }

    onAdd({ title: title.trim(), timeframe, category: 'other', targetDate });
  };

  const textColor = isDark ? '#fff' : '#111';
  const secondaryColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: isDark ? '#111' : '#fff' }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.modalCancel, { color: secondaryColor }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: textColor }]}>New Vision</Text>
              <TouchableOpacity onPress={handleSave} disabled={!title.trim()}>
                <Text
                  style={[
                    styles.modalSave,
                    { color: title.trim() ? theme.primary : secondaryColor },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.modalLabel, { color: secondaryColor }]}>
                WHERE DO YOU SEE YOURSELF?
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: textColor,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
                placeholder="e.g. Leading a community outreach programme..."
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                value={title}
                onChangeText={setTitle}
                multiline
                maxLength={200}
                textAlignVertical="top"
                autoFocus
              />

              <Text style={[styles.modalLabel, { color: secondaryColor, marginTop: 24 }]}>
                TIMEFRAME
              </Text>
              <View style={styles.timeframeGrid}>
                {TIMEFRAMES.map((tf) => {
                  const selected = timeframe === tf.id;
                  return (
                    <TouchableOpacity
                      key={tf.id}
                      onPress={() => {
                        hapticFeedback.light();
                        setTimeframe(tf.id);
                      }}
                      style={[
                        styles.tfChip,
                        {
                          backgroundColor: selected ? `${theme.primary}20` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                          borderColor: selected ? theme.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.tfChipText, { color: selected ? theme.primary : textColor }]}>
                        {tf.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {timeframe === 'custom' && (
                <View style={styles.datePickerWrap}>
                  <DateTimePicker
                    value={customDate}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    themeVariant={isDark ? 'dark' : 'light'}
                    onChange={(_, date) => { if (date) setCustomDate(date); }}
                    style={{ height: 150 }}
                  />
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

// ── Add Reflection Modal ─────────────────────────────────────────────

const ReflectionModal = ({ visible, onClose, onSave, theme, isDark }) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  const textColor = isDark ? '#fff' : '#111';
  const secondaryColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: isDark ? '#111' : '#fff' }]}>
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.modalCancel, { color: secondaryColor }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: textColor }]}>Add Reflection</Text>
              <TouchableOpacity onPress={() => note.trim() && onSave(note)} disabled={!note.trim()}>
                <Text
                  style={[
                    styles.modalSave,
                    { color: note.trim() ? theme.primary : secondaryColor },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={[styles.reflectionPrompt, { color: textColor }]}>
                How are things going? What progress have you made?
              </Text>
              <TextInput
                style={[
                  styles.reflectionInput,
                  {
                    color: textColor,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
                placeholder="e.g. Started that online course, feeling motivated..."
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={500}
                textAlignVertical="top"
                autoFocus
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

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
    marginBottom: 4,
  },

  goalRow: {
    marginTop: 14,
  },
  goalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  goalMeta: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  goalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalTimeLeft: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  goalBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 5,
  },

  achievedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  expandedSection: {
    marginTop: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  reflectionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reflectionsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  addReflectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  addReflectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noReflections: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  reflectionItem: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    marginBottom: 12,
  },
  reflectionDate: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  reflectionNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },

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

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  modalInput: {
    minHeight: 90,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
  },
  timeframeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  tfChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  tfChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerWrap: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catGridChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  catGridText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reflectionPrompt: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 24,
  },
  reflectionInput: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
  },
});

export default VisionScreen;
