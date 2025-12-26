import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import quizService from '../services/quizService';
import hapticFeedback from '../utils/haptics';
import AchievementService from '../services/achievementService';
import { getStoredData, saveData } from '../utils/localStorage';

const CATEGORY_ICON_FALLBACK = {
  all: 'ALL',
  'new-testament': 'NT',
  'old-testament': 'OT',
  'life-of-jesus': 'J',
  miracles: 'M',
  parables: 'P',
  'women-of-bible': 'W',
};

const QuizGames = ({ visible, onClose }) => {
  // State
  const [currentScreen, setCurrentScreen] = useState('home'); // home, setup, quiz, results
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [answerMode, setAnswerMode] = useState('after-each'); // 'after-each' or 'at-end'
  const [currentQuiz, setCurrentQuiz] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bonusPointsEarned, setBonusPointsEarned] = useState(0);

  // Load data on mount
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  // Timer
  useEffect(() => {
    let interval;
    if (currentScreen === 'quiz') {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentScreen]);

  const loadData = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      // Force refresh to get latest questions from GitHub
      if (forceRefresh) {
        console.log('Force refreshing quiz data from GitHub...');
        await quizService.refreshData();
      }
      
      const [cats, ques] = await Promise.all([
        quizService.getCategories(),
        quizService.getQuestions(),
      ]);
      
      console.log('Loaded quiz data:', {
        categories: cats.length,
        totalQuestions: Object.values(ques).reduce((sum, cat) => {
          return sum + Object.values(cat).reduce((catSum, type) => {
            return catSum + Object.values(type).reduce((typeSum, diff) => {
              return typeSum + (diff?.length || 0);
            }, 0);
          }, 0);
        }, 0)
      });
      
      setCategories(cats);
      setQuestions(ques);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading quiz data:', error);
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await quizService.clearCache(); // Clear cache first
    await loadData(true); // Force refresh from GitHub
    setIsRefreshing(false);
  };

  const handleCategorySelect = (category) => {
    hapticFeedback.cardTap(); // Haptic on category selection
    setSelectedCategory(category);
    setCurrentScreen('setup');
  };

  const startQuiz = () => {
    const allQuestions = [];

    // If "All" category, get questions from ALL categories
    if (selectedCategory.id === 'all') {
      Object.keys(questions).forEach(categoryId => {
        const categoryQuestions = questions[categoryId];
        if (categoryQuestions) {
          Object.keys(categoryQuestions).forEach(quizType => {
            Object.keys(categoryQuestions[quizType]).forEach(difficulty => {
              const qs = categoryQuestions[quizType][difficulty] || [];
              allQuestions.push(...qs);
            });
          });
        }
      });
    } else {
      // Get questions from selected category only
      const categoryQuestions = questions[selectedCategory.id];
      if (categoryQuestions) {
        Object.keys(categoryQuestions).forEach(quizType => {
          Object.keys(categoryQuestions[quizType]).forEach(difficulty => {
            const qs = categoryQuestions[quizType][difficulty] || [];
            allQuestions.push(...qs);
          });
        });
      }
    }

    if (allQuestions.length === 0) {
      Alert.alert('No Questions', 'No questions available for this category.');
      return;
    }

    // Shuffle and select
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    setCurrentQuiz(selected);
    setCurrentIndex(0);
    setUserAnswers([]);
    setScore(0);
    setTimer(0);
    setBonusPointsEarned(0);
    setCurrentScreen('quiz');
    hapticFeedback.medium(); // Haptic when quiz starts
  };

  const handleAnswer = (answerIndex) => {
    hapticFeedback.light(); // Haptic on selection
    
    const currentQuestion = currentQuiz[currentIndex];
    
    // Check if correct
    const isTrueFalse = typeof currentQuestion.correctAnswer === 'boolean';
    const isCorrect = isTrueFalse
      ? answerIndex === (currentQuestion.correctAnswer ? 0 : 1)
      : answerIndex === currentQuestion.correctAnswer;

    const answer = {
      questionIndex: currentIndex,
      userAnswer: answerIndex,
      isCorrect,
      question: currentQuestion,
    };

    const newAnswers = [...userAnswers, answer];
    setUserAnswers(newAnswers);

    if (isCorrect) {
      setScore(score + 100);
      hapticFeedback.success(); // Success haptic for correct answer
    } else {
      hapticFeedback.error(); // Error haptic for wrong answer
    }

    if (answerMode === 'at-end') {
      // Move to next immediately
      if (currentIndex < currentQuiz.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Award points for completing the quiz
        awardQuizPoints(currentQuiz.length);
        setCurrentScreen('results');
      }
    }
    // If 'after-each', the answer will show in the UI
  };

  const handleNext = () => {
    hapticFeedback.light(); // Haptic on next question
    if (currentIndex < currentQuiz.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Award points for completing the quiz
      awardQuizPoints(currentQuiz.length);
      setCurrentScreen('results');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Award points when quiz is completed (100 points per question)
  const awardQuizPoints = async (numQuestions) => {
    try {
      const pointsEarned = numQuestions * 100; // 5 questions = 500, 10 = 1000, etc.
      setBonusPointsEarned(pointsEarned);
      
      // Get current stats using the correct storage wrapper (fivefold_ prefix)
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
        points: (currentStats.points || 0) + pointsEarned,
        quizzesCompleted: (currentStats.quizzesCompleted || 0) + 1,
      };
      
      // Recalculate level
      updatedStats.level = AchievementService.getLevelFromPoints(updatedStats.points);
      
      // Save updated stats using the correct storage wrapper
      await saveData('userStats', updatedStats);
      
      // Check achievements
      await AchievementService.checkAchievements(updatedStats);
      
      console.log(`🎯 Quiz completed! Awarded ${pointsEarned} points for ${numQuestions} questions. Total: ${updatedStats.points}`);
      hapticFeedback.success(); // Haptic for earning points!
      
      return pointsEarned;
    } catch (error) {
      console.error('Error awarding quiz points:', error);
      return 0;
    }
  };

  const getSafeCategoryIconText = (category) => {
    const raw = (category?.icon || '').toString().trim();
    const upper = raw.toUpperCase();

    // Allow only short alphanumeric tokens (prevents cached emoji icons from rendering).
    if (/^[A-Z0-9]{1,3}$/.test(upper)) return upper;

    return CATEGORY_ICON_FALLBACK[category?.id] || 'Q';
  };

  // RENDER FUNCTIONS

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => {
          hapticFeedback.light(); // Haptic on back button
          if (currentScreen === 'home') {
            onClose();
          } else if (currentScreen === 'setup') {
            setCurrentScreen('home');
          } else if (currentScreen === 'quiz') {
            Alert.alert(
              'Exit Quiz',
              'Are you sure you want to exit? Your progress will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', onPress: () => {
                  hapticFeedback.light();
                  setCurrentScreen('home');
                }},
              ]
            );
          } else {
            setCurrentScreen('home');
          }
        }}
      >
        <MaterialIcons name="arrow-back" size={24} color="#000000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {currentScreen === 'home' && 'Quiz & Games'}
        {currentScreen === 'setup' && 'Quiz Setup'}
        {currentScreen === 'quiz' && `Question ${currentIndex + 1}/${currentQuiz.length}`}
        {currentScreen === 'results' && 'Results'}
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderHome = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Quiz Data...</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
            title="Pull to refresh"
            titleColor="#666666"
          />
        }
      >
        <Text style={styles.sectionTitle}>SELECT A CATEGORY</Text>
        <Text style={styles.pullToRefreshHint}>Pull down to refresh</Text>
        
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryCard}
            onPress={() => handleCategorySelect(category)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
              <Text style={styles.categoryIconText}>
                {getSafeCategoryIconText(category)}
              </Text>
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryDesc}>{category.description}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color="#000000" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderSetup = () => {
    // Count total questions in this category
    let totalQuestions = 0;
    
    if (selectedCategory.id === 'all') {
      // Count ALL questions from ALL categories
      Object.keys(questions).forEach(categoryId => {
        const categoryQuestions = questions[categoryId];
        if (categoryQuestions) {
          Object.keys(categoryQuestions).forEach(quizType => {
            Object.keys(categoryQuestions[quizType]).forEach(difficulty => {
              const qs = categoryQuestions[quizType][difficulty] || [];
              totalQuestions += qs.length;
            });
          });
        }
      });
    } else {
      // Count questions from selected category only
      const categoryQuestions = questions[selectedCategory.id];
      if (categoryQuestions) {
        Object.keys(categoryQuestions).forEach(quizType => {
          Object.keys(categoryQuestions[quizType]).forEach(difficulty => {
            const qs = categoryQuestions[quizType][difficulty] || [];
            totalQuestions += qs.length;
          });
        });
      }
    }

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={[selectedCategory.color, selectedCategory.color + 'CC']}
          style={styles.setupHeader}
        >
          <Text style={styles.setupCategoryIcon}>
            {getSafeCategoryIconText(selectedCategory)}
          </Text>
          <Text style={styles.setupCategoryTitle}>{selectedCategory.title}</Text>
          <Text style={styles.setupQuestionCount}>{totalQuestions} Questions Available</Text>
        </LinearGradient>

      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>Number of Questions</Text>
        <View style={styles.optionRow}>
          {[5, 10, 15, 20, 30].map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.countButton,
                questionCount === count && { backgroundColor: selectedCategory.color },
              ]}
              onPress={() => {
                hapticFeedback.selection();
                setQuestionCount(count);
              }}
            >
              <Text
                style={[
                  styles.countButtonText,
                  questionCount === count && { color: '#FFFFFF' },
                ]}
              >
                {count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>Show Answers</Text>
        
        <TouchableOpacity
          style={[
            styles.answerModeButton,
            answerMode === 'after-each' && { backgroundColor: selectedCategory.color },
          ]}
          onPress={() => {
            hapticFeedback.selection();
            setAnswerMode('after-each');
          }}
        >
          <MaterialIcons
            name="visibility"
            size={24}
            color={answerMode === 'after-each' ? '#FFFFFF' : '#000000'}
          />
          <Text
            style={[
              styles.answerModeText,
              answerMode === 'after-each' && { color: '#FFFFFF' },
            ]}
          >
            After Each Question
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.answerModeButton,
            answerMode === 'at-end' && { backgroundColor: selectedCategory.color },
          ]}
          onPress={() => {
            hapticFeedback.selection();
            setAnswerMode('at-end');
          }}
        >
          <MaterialIcons
            name="format-list-numbered"
            size={24}
            color={answerMode === 'at-end' ? '#FFFFFF' : '#000000'}
          />
          <Text
            style={[
              styles.answerModeText,
              answerMode === 'at-end' && { color: '#FFFFFF' },
            ]}
          >
            At the End
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
        <LinearGradient
          colors={[selectedCategory.color, selectedCategory.color + 'CC']}
          style={styles.startButtonGradient}
        >
          <Text style={styles.startButtonText}>START QUIZ</Text>
          <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
    );
  };

  const renderQuiz = () => {
    if (currentQuiz.length === 0 || !currentQuiz[currentIndex]) {
      return <View style={styles.loadingContainer}><Text style={styles.loadingText}>Loading...</Text></View>;
    }

    const currentQuestion = currentQuiz[currentIndex];
    const hasAnswered = userAnswers.length > currentIndex;
    const userAnswer = hasAnswered ? userAnswers[currentIndex] : null;
    const progress = (currentIndex + 1) / currentQuiz.length;

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.quizScrollContent}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: selectedCategory.color,
                },
              ]}
            />
          </View>
          <View style={styles.quizMeta}>
            <Text style={styles.quizMetaText}>Score: {score}</Text>
            <Text style={styles.quizMetaText}>Time: {formatTime(timer)}</Text>
          </View>
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Question {currentIndex + 1}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>

          {/* Multiple Choice */}
          {typeof currentQuestion.correctAnswer === 'number' && currentQuestion.options && (
            <View style={styles.answersContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = hasAnswered && userAnswer.userAnswer === index;
                const isCorrect = index === currentQuestion.correctAnswer;
                const showResult = hasAnswered && answerMode === 'after-each';

                let bgColor = '#FFFFFF';
                let borderColor = '#000000';

                if (showResult) {
                  if (isCorrect) {
                    bgColor = '#4CAF50';
                    borderColor = '#4CAF50';
                  } else if (isSelected) {
                    bgColor = '#F44336';
                    borderColor = '#F44336';
                  }
                }

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.answerButton,
                      { backgroundColor: bgColor, borderColor: borderColor },
                    ]}
                    onPress={() => !hasAnswered && handleAnswer(index)}
                    disabled={hasAnswered}
                  >
                    <View style={[styles.answerLetter, { backgroundColor: borderColor }]}>
                      <Text style={styles.answerLetterText}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.answerText,
                        { color: showResult && (isCorrect || isSelected) ? '#FFFFFF' : '#000000' },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* True/False */}
          {typeof currentQuestion.correctAnswer === 'boolean' && (
            <View style={styles.trueFalseContainer}>
              {[
                { label: 'TRUE', value: true, icon: '✓' },
                { label: 'FALSE', value: false, icon: '✗' },
              ].map((option, index) => {
                const isSelected = hasAnswered && userAnswer.userAnswer === index;
                const isCorrect =
                  (index === 0 && currentQuestion.correctAnswer) ||
                  (index === 1 && !currentQuestion.correctAnswer);
                const showResult = hasAnswered && answerMode === 'after-each';

                let bgColor = '#FFFFFF';
                let borderColor = '#000000';

                if (showResult) {
                  if (isCorrect) {
                    bgColor = '#4CAF50';
                    borderColor = '#4CAF50';
                  } else if (isSelected) {
                    bgColor = '#F44336';
                    borderColor = '#F44336';
                  }
                }

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.trueFalseButton,
                      { backgroundColor: bgColor, borderColor: borderColor },
                    ]}
                    onPress={() => !hasAnswered && handleAnswer(index)}
                    disabled={hasAnswered}
                  >
                    <Text
                      style={[
                        styles.trueFalseIcon,
                        { color: showResult && (isCorrect || isSelected) ? '#FFFFFF' : '#000000' },
                      ]}
                    >
                      {option.icon}
                    </Text>
                    <Text
                      style={[
                        styles.trueFalseText,
                        { color: showResult && (isCorrect || isSelected) ? '#FFFFFF' : '#000000' },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Explanation (after-each mode) */}
          {hasAnswered && answerMode === 'after-each' && (
            <View style={styles.explanationContainer}>
              <Text
                style={[
                  styles.explanationTitle,
                  { color: userAnswer.isCorrect ? '#4CAF50' : '#F44336' },
                ]}
              >
                {userAnswer.isCorrect ? 'Correct' : 'Incorrect'}
              </Text>
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
              <Text style={styles.explanationReference}>Reference: {currentQuestion.reference}</Text>

              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: selectedCategory.color }]}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>
                  {currentIndex < currentQuiz.length - 1 ? 'Next Question' : 'See Results'}
                </Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Biblely Watermark */}
          <View style={styles.watermarkContainer}>
            <Text style={styles.watermarkText}>Biblely</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderResults = () => {
    const correctCount = userAnswers.filter((a) => a.isCorrect).length;
    const percentage = Math.round((correctCount / currentQuiz.length) * 100);

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={[selectedCategory.color, selectedCategory.color + 'CC']}
          style={styles.resultsHeader}
        >
          <Text style={styles.resultsTitle}>Quiz Complete!</Text>
        </LinearGradient>

        <View style={styles.resultsCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scorePercent}>{percentage}%</Text>
            <Text style={styles.scoreLabel}>
              {correctCount}/{currentQuiz.length} Correct
            </Text>
          </View>

          <View style={styles.resultsStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{score}</Text>
              <Text style={styles.statLabel}>Quiz Score</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatTime(timer)}</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
          </View>
          
          {/* Bonus Points Earned */}
          <View style={[styles.bonusPointsCard, { backgroundColor: selectedCategory.color + '20' }]}>
            <MaterialIcons name="stars" size={28} color={selectedCategory.color} />
            <View style={styles.bonusPointsText}>
              <Text style={[styles.bonusPointsValue, { color: selectedCategory.color }]}>+{bonusPointsEarned.toLocaleString()}</Text>
              <Text style={styles.bonusPointsLabel}>Points Earned!</Text>
            </View>
          </View>

          {/* Answer Review (if at-end mode) */}
          {answerMode === 'at-end' && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewTitle}>Answer Review</Text>
              {userAnswers.map((answer, index) => (
                <View key={index} style={styles.reviewItem}>
                  <View
                    style={[
                      styles.reviewIcon,
                      { backgroundColor: answer.isCorrect ? '#4CAF50' : '#F44336' },
                    ]}
                  >
                    <Text style={styles.reviewIconText}>{index + 1}</Text>
                  </View>
                  <View style={styles.reviewContent}>
                    <Text style={styles.reviewQuestion} numberOfLines={2}>
                      {answer.question.question}
                    </Text>
                    {!answer.isCorrect && (
                      <Text style={styles.reviewAnswer}>
                        Correct:{' '}
                        {typeof answer.question.correctAnswer === 'number'
                          ? answer.question.options[answer.question.correctAnswer]
                          : answer.question.correctAnswer
                          ? 'True'
                          : 'False'}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.resultsButtons}>
            <TouchableOpacity
              style={[styles.resultButton, { backgroundColor: selectedCategory.color }]}
              onPress={() => setCurrentScreen('setup')}
            >
              <Text style={styles.resultButtonText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resultButton, { backgroundColor: '#666666' }]}
              onPress={() => setCurrentScreen('home')}
            >
              <Text style={styles.resultButtonText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        {currentScreen === 'home' && renderHome()}
        {currentScreen === 'setup' && renderSetup()}
        {currentScreen === 'quiz' && renderQuiz()}
        {currentScreen === 'results' && renderResults()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  quizScrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 1,
  },
  pullToRefreshHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 20,
    textAlign: 'center',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#000000',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIconText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  setupHeader: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  setupCategoryIcon: {
    fontSize: 48,
    marginBottom: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  setupCategoryTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  setupQuestionCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  setupSection: {
    marginBottom: 32,
  },
  setupLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  countButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  countButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
  },
  answerModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    gap: 12,
  },
  answerModeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
  },
  quizMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quizMetaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    borderColor: '#000000',
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 32,
    marginBottom: 24,
  },
  answersContainer: {
    gap: 12,
  },
  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 3,
    gap: 12,
  },
  answerLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerLetterText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  answerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  trueFalseContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  trueFalseButton: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 4,
    gap: 8,
  },
  trueFalseIcon: {
    fontSize: 40,
    fontWeight: '900',
  },
  trueFalseText: {
    fontSize: 24,
    fontWeight: '900',
  },
  explanationContainer: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
  },
  explanationTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    lineHeight: 24,
    marginBottom: 12,
  },
  explanationReference: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
    marginBottom: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  resultsHeader: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  resultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    borderColor: '#000000',
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 32,
    borderWidth: 4,
    borderColor: '#000000',
  },
  scorePercent: {
    fontSize: 48,
    fontWeight: '900',
    color: '#000000',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666666',
  },
  resultsStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  bonusPointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  bonusPointsText: {
    alignItems: 'flex-start',
  },
  bonusPointsValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  bonusPointsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000000',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
  },
  reviewSection: {
    marginBottom: 32,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 16,
  },
  reviewItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  reviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  reviewContent: {
    flex: 1,
  },
  reviewQuestion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  reviewAnswer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  resultsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resultButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resultButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  watermarkContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  watermarkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CCCCCC',
    letterSpacing: 2,
  },
});

export default QuizGames;

