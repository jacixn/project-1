/**
 * Create Challenge Modal
 * 
 * Beautiful modal to select quiz category and challenge a friend.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { sendChallenge } from '../services/challengeService';
import quizService from '../services/quizService';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const QUESTION_COUNTS = [5, 10, 15, 20];

// Category icons and colors
const CATEGORY_CONFIG = {
  'all': { icon: 'infinity', color: '#8B5CF6', label: 'All Categories' },
  'new-testament': { icon: 'book-open', color: '#3B82F6', label: 'New Testament' },
  'old-testament': { icon: 'scroll', color: '#F59E0B', label: 'Old Testament' },
  'jesus': { icon: 'cross', color: '#EF4444', label: 'Jesus Christ' },
  'miracles': { icon: 'magic', color: '#EC4899', label: 'Miracles' },
  'prophets': { icon: 'hat-wizard', color: '#6366F1', label: 'Prophets' },
  'parables': { icon: 'seedling', color: '#10B981', label: 'Parables' },
  'default': { icon: 'bible', color: '#6B7280', label: 'Bible Quiz' },
};

const getCategoryConfig = (categoryId, categoryName) => {
  const config = CATEGORY_CONFIG[categoryId] || CATEGORY_CONFIG['default'];
  return {
    ...config,
    label: categoryName || config.label,
  };
};

const CreateChallengeModal = ({ visible, onClose, onCloseAll, friend, onChallengeSent, navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user, userProfile } = useAuth();

  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedCategory(null);
      setQuestionCount(10);
      loadQuizData();
    }
  }, [visible]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      const [cats, ques] = await Promise.all([
        quizService.getCategories(),
        quizService.getQuestions(),
      ]);
      setCategories(cats || []);
      setQuestions(ques || {});
    } catch (error) {
      console.error('Error loading quiz data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionsForCategory = (categoryId) => {
    const allQuestions = [];
    
    if (categoryId === 'all') {
      Object.keys(questions).forEach(catId => {
        const categoryQuestions = questions[catId];
        if (categoryQuestions) {
          Object.keys(categoryQuestions).forEach(quizType => {
            Object.keys(categoryQuestions[quizType]).forEach(difficulty => {
              const qs = categoryQuestions[quizType][difficulty] || [];
              allQuestions.push(...qs.map((q, idx) => ({ ...q, _id: `${catId}_${quizType}_${difficulty}_${idx}` })));
            });
          });
        }
      });
    } else {
      const categoryQuestions = questions[categoryId];
      if (categoryQuestions) {
        Object.keys(categoryQuestions).forEach(quizType => {
          Object.keys(categoryQuestions[quizType]).forEach(difficulty => {
            const qs = categoryQuestions[quizType][difficulty] || [];
            allQuestions.push(...qs.map((q, idx) => ({ ...q, _id: `${categoryId}_${quizType}_${difficulty}_${idx}` })));
          });
        });
      }
    }
    
    return allQuestions;
  };

  const handleStartChallenge = async () => {
    if (!selectedCategory || !friend || !user) return;

    const availableQuestions = getQuestionsForCategory(selectedCategory.id);
    
    if (availableQuestions.length < questionCount) {
      Alert.alert('Not Enough Questions', `Only ${availableQuestions.length} questions available.`);
      return;
    }

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
      const selectedQuestions = shuffled.slice(0, questionCount);

      const challenge = await sendChallenge({
        challengerId: user.uid,
        challengerName: userProfile?.displayName || 'Challenger',
        challengerPicture: userProfile?.profilePicture || '',
        challengedId: friend.uid,
        challengedName: friend.displayName || 'Friend',
        challengedPicture: friend.profilePicture || '',
        category: selectedCategory.id,
        categoryName: selectedCategory.name,
        questionCount,
        questions: selectedQuestions,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Close all modals first (challenge modal + friends modal if from Hub)
      if (onCloseAll) {
        onCloseAll();
      } else {
        onClose();
      }
      
      if (navigation) {
        // Small delay to let modals close before navigating
        setTimeout(() => {
          navigation.navigate('ChallengeQuiz', {
            challengeId: challenge.id,
            challenge: { ...challenge, questions: selectedQuestions },
            isChallenger: true,
          });
        }, 150);
      }
      
      if (onChallengeSent) onChallengeSent(challenge);
    } catch (error) {
      console.error('Error creating challenge:', error);
      Alert.alert('Error', 'Failed to create challenge.');
    } finally {
      setSending(false);
    }
  };

  if (!friend) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: 16, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
          <TouchableOpacity onPress={onClose} disabled={sending} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <FontAwesome5 name="trophy" size={18} color="#F59E0B" />
            <Text style={[styles.headerTitle, { color: theme.text }]}>Challenge</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Friend Card */}
          <View style={[styles.friendCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF' }]}>
            {friend.profilePicture ? (
              <Image source={{ uri: friend.profilePicture }} style={styles.friendAvatar} />
            ) : (
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.friendAvatarPlaceholder}
              >
                <Text style={styles.friendInitial}>
                  {(friend.displayName || 'F').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.friendInfo}>
              <Text style={[styles.challengingLabel, { color: theme.textSecondary }]}>Challenging</Text>
              <Text style={[styles.friendName, { color: theme.text }]}>{friend.displayName || 'Friend'}</Text>
            </View>
            <View style={styles.vsIconContainer}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.vsIcon}>
                <FontAwesome5 name="bolt" size={12} color="#FFF" />
              </LinearGradient>
            </View>
          </View>

          {/* Question Count */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Number of Questions</Text>
          <View style={styles.countRow}>
            {QUESTION_COUNTS.map((count) => {
              const isActive = questionCount === count;
              return (
                <TouchableOpacity
                  key={count}
                  style={[styles.countBtn, !isActive && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F5' }]}
                  onPress={() => { Haptics.selectionAsync(); setQuestionCount(count); }}
                  disabled={sending}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.countBtnGradient}>
                      <Text style={styles.countTextActive}>{count}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={[styles.countText, { color: theme.text }]}>{count}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Categories */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Category</Text>
          
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading categories...</Text>
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map((category, index) => {
                const isSelected = selectedCategory?.id === category.id;
                const qCount = getQuestionsForCategory(category.id).length;
                const config = getCategoryConfig(category.id, category.name);
                
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF' },
                      isSelected && { borderColor: config.color, borderWidth: 2 },
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setSelectedCategory(category); }}
                    disabled={sending}
                    activeOpacity={0.7}
                  >
                    {isSelected && (
                      <View style={[styles.selectedCheck, { backgroundColor: config.color }]}>
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                    )}
                    
                    <View style={[styles.categoryIconContainer, { backgroundColor: config.color + '20' }]}>
                      <FontAwesome5 name={config.icon} size={20} color={config.color} />
                    </View>
                    
                    <Text style={[styles.categoryName, { color: theme.text }]} numberOfLines={2}>
                      {config.label}
                    </Text>
                    
                    <View style={[styles.questionBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                      <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
                        {qCount} Q
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Bottom Button */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom || 20, backgroundColor: theme.background, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
          <TouchableOpacity
            onPress={handleStartChallenge}
            disabled={!selectedCategory || sending || loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedCategory ? ['#F59E0B', '#D97706'] : [isDark ? '#333' : '#CCC', isDark ? '#222' : '#AAA']}
              style={styles.startBtn}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="play" size={20} color="#FFF" />
                  <Text style={styles.startBtnText}>
                    {selectedCategory ? `Start ${questionCount} Question Challenge` : 'Select a Category'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {selectedCategory && (
            <Text style={[styles.hintText, { color: theme.textTertiary }]}>
              You'll take the quiz first, then {friend.displayName?.split(' ')[0] || 'your friend'} will try to beat your score
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    width: 60,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  // Content
  content: {
    flex: 1,
    padding: 20,
  },
  // Friend Card
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  friendAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  friendAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 14,
  },
  challengingLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '700',
  },
  vsIconContainer: {
    marginLeft: 8,
  },
  vsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sections
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Count
  countRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  countBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  countBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  countText: {
    fontSize: 17,
    fontWeight: '700',
    paddingVertical: 14,
    textAlign: 'center',
  },
  countTextActive: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  // Categories
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  questionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Bottom
  bottom: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  startBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});

export default CreateChallengeModal;
