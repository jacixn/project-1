/**
 * Challenge Quiz Screen
 * 
 * Take a quiz challenge - same questions for both challenger and challenged.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { submitScore, getChallenge } from '../services/challengeService';
import { getStoredData, saveData } from '../utils/localStorage';
import AchievementService from '../services/achievementService';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const ChallengeQuizScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const { challengeId, challenge: passedChallenge, isChallenger } = route.params || {};

  const [challenge, setChallenge] = useState(passedChallenge);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  
  // Use ref for score to avoid state timing issues
  const scoreRef = useRef(0);

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const questionAnim = useRef(new Animated.Value(0)).current;
  const answerAnims = useRef([]).current;

  useEffect(() => {
    loadChallenge();
  }, []);

  useEffect(() => {
    // Timer
    let interval;
    if (!quizComplete && questions.length > 0) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizComplete, questions]);

  useEffect(() => {
    if (questions.length > 0) {
      animateQuestion();
    }
  }, [currentIndex, questions]);

  const loadChallenge = async () => {
    try {
      if (passedChallenge?.questions) {
        setQuestions(passedChallenge.questions);
        setChallenge(passedChallenge);
      } else if (challengeId) {
        const challengeData = await getChallenge(challengeId);
        if (challengeData?.questions) {
          setQuestions(challengeData.questions);
          setChallenge(challengeData);
        }
      }
    } catch (error) {
      console.error('Error loading challenge:', error);
      Alert.alert('Error', 'Failed to load challenge.');
      navigation.goBack();
    }
  };

  const animateQuestion = () => {
    questionAnim.setValue(0);
    Animated.spring(questionAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Update progress bar
    Animated.timing(progressAnim, {
      toValue: (currentIndex + 1) / questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleSelectAnswer = (index) => {
    if (selectedAnswer !== null) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAnswer(index);

    const currentQuestion = questions[currentIndex];
    
    // Check if correct
    const isTrueFalse = typeof currentQuestion.correctAnswer === 'boolean';
    const isCorrect = isTrueFalse
      ? index === (currentQuestion.correctAnswer ? 0 : 1)
      : index === currentQuestion.correctAnswer;

    if (isCorrect) {
      scoreRef.current += 1; // Update ref synchronously
      setScore(s => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setAnswers([...answers, { index: currentIndex, answer: index, isCorrect }]);
    setShowResult(true);

    // Move to next question after delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        // Quiz complete - pass the final score directly
        handleQuizComplete(scoreRef.current);
      }
    }, 1500);
  };

  // Award points when quiz is completed (100 points per correct answer)
  const awardQuizPoints = async (correctAnswers, totalQuestions) => {
    try {
      // Points based on correct answers (100 per correct)
      const points = correctAnswers * 100;
      setPointsEarned(points);
      
      // Get current stats
      const currentStats = await getStoredData('userStats') || {
        points: 0,
        level: 1,
        completedTasks: 0,
        streak: 0,
        quizzesCompleted: 0
      };
      
      // Update stats
      const updatedStats = {
        ...currentStats,
        points: (currentStats.points || 0) + points,
        quizzesCompleted: (currentStats.quizzesCompleted || 0) + 1,
      };
      
      // Recalculate level
      updatedStats.level = AchievementService.getLevelFromPoints(updatedStats.points);
      
      // Save updated stats
      await saveData('userStats', updatedStats);
      
      // Check achievements
      await AchievementService.checkAchievements(updatedStats);
      
      console.log(`🏆 Challenge quiz completed! Awarded ${points} points for ${correctAnswers}/${totalQuestions} correct. Total: ${updatedStats.points}`);
      
      return points;
    } catch (error) {
      console.error('Error awarding challenge quiz points:', error);
      return 0;
    }
  };

  const handleQuizComplete = async (finalScore) => {
    setQuizComplete(true);
    setIsSubmitting(true);

    console.log('[ChallengeQuiz] Completing quiz with score:', finalScore, '/', questions.length);
    console.log('[ChallengeQuiz] Challenge ID:', challengeId);
    console.log('[ChallengeQuiz] User ID:', user?.uid);

    if (!challengeId) {
      console.error('[ChallengeQuiz] No challenge ID! Cannot submit score.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Submit score to challenge - this marks the user as completed
      const result = await submitScore(challengeId, user.uid, finalScore, questions.length);
      console.log('[ChallengeQuiz] Score submitted successfully:', result);
      
      // Award points to the user
      await awardQuizPoints(finalScore, questions.length);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[ChallengeQuiz] Error submitting score:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    navigation.goBack();
  };

  const currentQuestion = questions[currentIndex];
  const finalScore = scoreRef.current;
  const percentage = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;

  // Results screen
  if (quizComplete) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        <LinearGradient
          colors={percentage >= 70 ? ['#10B981', '#059669'] : percentage >= 50 ? ['#F59E0B', '#D97706'] : ['#EF4444', '#DC2626']}
          style={[styles.resultsHeader, { paddingTop: insets.top + 20 }]}
        >
          <FontAwesome5 
            name={percentage >= 70 ? 'trophy' : percentage >= 50 ? 'medal' : 'redo'} 
            size={60} 
            color="#FFF" 
          />
          <Text style={styles.resultsTitle}>
            {percentage >= 70 ? 'Great Job!' : percentage >= 50 ? 'Good Effort!' : 'Keep Practicing!'}
          </Text>
          <Text style={styles.resultsSubtitle}>
            Challenge {isChallenger ? 'Sent!' : 'Complete!'}
          </Text>
        </LinearGradient>

        <View style={styles.resultsContent}>
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Your Score</Text>
            <Text style={[styles.scoreValue, { color: theme.text }]}>
              {finalScore}/{questions.length}
            </Text>
            <Text style={[styles.scorePercent, { color: theme.primary }]}>{percentage}%</Text>
            
            {pointsEarned > 0 && (
              <View style={[styles.pointsBadge, { backgroundColor: '#F59E0B20' }]}>
                <FontAwesome5 name="star" size={14} color="#F59E0B" />
                <Text style={styles.pointsText}>+{pointsEarned} pts</Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
              <MaterialIcons name="timer" size={24} color={theme.primary} />
              <Text style={[styles.statValue, { color: theme.text }]}>{formatTime(timer)}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Time</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
              <MaterialIcons name="check-circle" size={24} color="#10B981" />
              <Text style={[styles.statValue, { color: theme.text }]}>{finalScore}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Correct</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
              <MaterialIcons name="cancel" size={24} color="#EF4444" />
              <Text style={[styles.statValue, { color: theme.text }]}>{questions.length - finalScore}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Wrong</Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.primary + '15' }]}>
            <FontAwesome5 name="info-circle" size={18} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              {isChallenger 
                ? `Your friend will be notified to take this quiz. You'll see the results when they complete it!`
                : `Your score has been submitted. Check the Challenges screen to see the final results!`
              }
            </Text>
          </View>
        </View>

        <View style={[styles.resultsBottom, { paddingBottom: insets.bottom || 20 }]}>
          <TouchableOpacity onPress={handleFinish}>
            <LinearGradient
              colors={[theme.primary, theme.primary + 'CC']}
              style={styles.finishButton}
            >
              <Text style={styles.finishButtonText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading state
  if (!currentQuestion) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading quiz...</Text>
      </View>
    );
  }

  // Get answers for current question
  const isTrueFalse = typeof currentQuestion.correctAnswer === 'boolean';
  const answerOptions = isTrueFalse 
    ? ['True', 'False']
    : currentQuestion.options || currentQuestion.answers || [];

  const correctAnswerIndex = isTrueFalse
    ? (currentQuestion.correctAnswer ? 0 : 1)
    : currentQuestion.correctAnswer;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => {
            Alert.alert(
              'Quit Challenge?',
              'Your progress will be lost.',
              [
                { text: 'Continue Quiz', style: 'cancel' },
                { text: 'Quit', style: 'destructive', onPress: () => navigation.goBack() },
              ]
            );
          }}
        >
          <MaterialIcons name="close" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.categoryText, { color: theme.textSecondary }]}>
            {challenge?.categoryName || 'Challenge'}
          </Text>
          <Text style={[styles.timerText, { color: theme.text }]}>
            {formatTime(timer)}
          </Text>
        </View>

        <View style={[styles.scoreBox, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.scoreText, { color: theme.primary }]}>{score}</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { 
                backgroundColor: theme.primary,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {currentIndex + 1} of {questions.length}
        </Text>
      </View>

      {/* Question */}
      <Animated.View
        style={[
          styles.questionContainer,
          {
            opacity: questionAnim,
            transform: [{
              translateX: questionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
      >
        <Text style={[styles.questionText, { color: theme.text }]}>
          {currentQuestion.question}
        </Text>
      </Animated.View>

      {/* Answers */}
      <View style={styles.answersContainer}>
        {answerOptions.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = showResult && index === correctAnswerIndex;
          const isWrong = showResult && isSelected && index !== correctAnswerIndex;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.answerButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
                isSelected && !showResult && { borderColor: theme.primary, borderWidth: 2 },
                isCorrect && { backgroundColor: '#10B98130', borderColor: '#10B981', borderWidth: 2 },
                isWrong && { backgroundColor: '#EF444430', borderColor: '#EF4444', borderWidth: 2 },
              ]}
              onPress={() => handleSelectAnswer(index)}
              disabled={selectedAnswer !== null}
              activeOpacity={0.7}
            >
              <View style={[
                styles.answerIndex,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                isCorrect && { backgroundColor: '#10B981' },
                isWrong && { backgroundColor: '#EF4444' },
              ]}>
                <Text style={[
                  styles.answerIndexText,
                  { color: (isCorrect || isWrong) ? '#FFF' : theme.text },
                ]}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text style={[styles.answerText, { color: theme.text }]}>
                {option}
              </Text>
              {isCorrect && (
                <MaterialIcons name="check-circle" size={24} color="#10B981" />
              )}
              {isWrong && (
                <MaterialIcons name="cancel" size={24} color="#EF4444" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    marginBottom: 2,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  // Question
  questionContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 32,
    textAlign: 'center',
  },
  // Answers
  answersContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  answerIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerIndexText: {
    fontSize: 16,
    fontWeight: '600',
  },
  answerText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  // Results
  resultsHeader: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  resultsContent: {
    flex: 1,
    padding: 20,
  },
  scoreCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 14,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    marginVertical: 4,
  },
  scorePercent: {
    fontSize: 24,
    fontWeight: '600',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  resultsBottom: {
    padding: 20,
  },
  finishButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default ChallengeQuizScreen;
