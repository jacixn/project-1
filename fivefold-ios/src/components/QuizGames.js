import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import quizService from '../services/quizService';
import hapticFeedback from '../utils/hapticFeedback';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const QuizGames = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  
  // State Management
  const [currentScreen, setCurrentScreen] = useState('home'); // home, setup, quiz, results
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [showAnswerMode, setShowAnswerMode] = useState('after-each'); // 'after-each' or 'end'
  const [currentQuiz, setCurrentQuiz] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [userProgress, setUserProgress] = useState({
    totalQuizzes: 0,
    totalCorrect: 0,
    streak: 0,
    categoryProgress: {},
  });
  const [quizCategories, setQuizCategories] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState({});

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Load data on mount
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [categories, questions, progress] = await Promise.all([
        quizService.getCategories(),
        quizService.getQuestions(),
        loadUserProgress(),
      ]);
      
      setQuizCategories(categories);
      setQuizQuestions(questions);
      setUserProgress(progress);
    } catch (error) {
      console.error('Error loading quiz data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadUserProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem('quizProgress');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
    return {
      totalQuizzes: 0,
      totalCorrect: 0,
      streak: 0,
      categoryProgress: {},
    };
  };

  const saveUserProgress = async (progress) => {
    try {
      await AsyncStorage.setItem('quizProgress', JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleCategorySelect = (category) => {
    hapticFeedback.selection();
    setSelectedCategory(category);
    setCurrentScreen('setup');
  };

  const startQuiz = () => {
    hapticFeedback.buttonPress();
    
    // Get ALL questions from the category (mixed types)
    const categoryQuestions = quizQuestions[selectedCategory.id];
    const allQuestions = [];
    
    if (categoryQuestions) {
      Object.keys(categoryQuestions).forEach(quizType => {
        Object.keys(categoryQuestions[quizType]).forEach(difficulty => {
          const questions = categoryQuestions[quizType][difficulty] || [];
          allQuestions.push(...questions);
        });
      });
    }
    
    if (allQuestions.length === 0) {
      Alert.alert('No Questions', 'No questions available for this category yet.');
      return;
    }
    
    // Shuffle and select requested number of questions
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length));
    
    setCurrentQuiz(selectedQuestions);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setScore(0);
    setTimer(0);
    setShowAnswer(false);
    setCurrentScreen('quiz');
  };

  const handleAnswer = (answerIndex) => {
    hapticFeedback.selection();
    const currentQuestion = currentQuiz[currentQuestionIndex];
    
    // Determine if answer is correct
    let isCorrect = false;
    if (typeof currentQuestion.correctAnswer === 'number') {
      isCorrect = answerIndex === currentQuestion.correctAnswer;
    } else {
      // True/False question
      const userChoseTrue = answerIndex === 0;
      isCorrect = userChoseTrue === currentQuestion.correctAnswer;
    }
    
    const answerData = {
      questionId: currentQuestionIndex,
      userAnswer: answerIndex,
      isCorrect,
      timeSpent: timer,
    };
    
    setUserAnswers([...userAnswers, answerData]);
    if (isCorrect) {
      setScore(score + 100);
    }
    
    if (showAnswerMode === 'after-each') {
      setShowAnswer(true);
    } else {
      // Move to next question or finish
      if (currentQuestionIndex < currentQuiz.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setTimer(0);
      } else {
        completeQuiz();
      }
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < currentQuiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswer(false);
      setTimer(0);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    hapticFeedback.success();
    
    // Update progress
    const newProgress = {
      ...userProgress,
      totalQuizzes: userProgress.totalQuizzes + 1,
      totalCorrect: userProgress.totalCorrect + userAnswers.filter(a => a.isCorrect).length,
      categoryProgress: {
        ...userProgress.categoryProgress,
        [selectedCategory.id]: {
          completed: (userProgress.categoryProgress[selectedCategory.id]?.completed || 0) + 1,
        },
      },
    };
    
    setUserProgress(newProgress);
    saveUserProgress(newProgress);
    setCurrentScreen('results');
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (currentScreen === 'quiz' && !showAnswer) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentScreen, showAnswer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render functions
  const renderHeader = () => (
    <BlurView 
      intensity={90} 
      style={[styles.header, { 
        backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
        borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }]}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
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
                  { text: 'Exit', onPress: () => setCurrentScreen('home') },
                ]
              );
            } else {
              setCurrentScreen('home');
            }
          }}
        >
          <Text style={[styles.headerButtonText, { color: '#000000' }]}>
            {currentScreen === 'home' ? 'Close' : 'Back'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#000000' }]}>
          {currentScreen === 'home' && 'Quiz & Games'}
          {currentScreen === 'setup' && 'Quiz Setup'}
          {currentScreen === 'quiz' && `Question ${currentQuestionIndex + 1}/${currentQuiz.length}`}
          {currentScreen === 'results' && 'Results'}
        </Text>
        <View style={{ width: 60 }} />
      </View>
    </BlurView>
  );

  const renderHome = () => {
    if (isLoadingData) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Quiz Data...</Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>QUIZ CATEGORIES</Text>
        </View>
        
        {quizCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryCard, { backgroundColor: '#F8F8F8' }]}
            onPress={() => handleCategorySelect(category)}
          >
            <LinearGradient
              colors={[category.color, category.color + 'DD']}
              style={styles.categoryIconWrapper}
            >
              <MaterialIcons name={category.icon} size={28} color="#FFF" />
            </LinearGradient>
            <View style={styles.categoryContent}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryDescription} numberOfLines={1}>
                {category.description}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#000000" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderSetup = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.setupCard}>
        <LinearGradient
          colors={selectedCategory.gradient}
          style={styles.setupHeader}
        >
          <MaterialIcons name={selectedCategory.icon} size={48} color="#FFF" />
          <Text style={styles.setupCategoryTitle}>{selectedCategory.title}</Text>
        </LinearGradient>
        
        <View style={styles.setupContent}>
          <Text style={styles.setupSectionTitle}>Number of Questions</Text>
          <View style={styles.questionCountOptions}>
            {[5, 10, 15, 20, 30].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.questionCountButton,
                  questionCount === count && { 
                    backgroundColor: selectedCategory.color,
                    borderColor: selectedCategory.color,
                  }
                ]}
                onPress={() => {
                  setQuestionCount(count);
                  hapticFeedback.selection();
                }}
              >
                <Text style={[
                  styles.questionCountText,
                  questionCount === count && { color: '#FFFFFF' }
                ]}>
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.setupSectionTitle}>Show Answers</Text>
          <View style={styles.answerModeOptions}>
            <TouchableOpacity
              style={[
                styles.answerModeButton,
                showAnswerMode === 'after-each' && {
                  backgroundColor: selectedCategory.color,
                  borderColor: selectedCategory.color,
                }
              ]}
              onPress={() => {
                setShowAnswerMode('after-each');
                hapticFeedback.selection();
              }}
            >
              <MaterialIcons 
                name="visibility" 
                size={24} 
                color={showAnswerMode === 'after-each' ? '#FFFFFF' : '#000000'} 
              />
              <Text style={[
                styles.answerModeText,
                showAnswerMode === 'after-each' && { color: '#FFFFFF' }
              ]}>
                After Each Question
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.answerModeButton,
                showAnswerMode === 'end' && {
                  backgroundColor: selectedCategory.color,
                  borderColor: selectedCategory.color,
                }
              ]}
              onPress={() => {
                setShowAnswerMode('end');
                hapticFeedback.selection();
              }}
            >
              <MaterialIcons 
                name="format-list-numbered" 
                size={24} 
                color={showAnswerMode === 'end' ? '#FFFFFF' : '#000000'} 
              />
              <Text style={[
                styles.answerModeText,
                showAnswerMode === 'end' && { color: '#FFFFFF' }
              ]}>
                At the End
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={startQuiz}
          >
            <LinearGradient
              colors={selectedCategory.gradient}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>START QUIZ</Text>
              <MaterialIcons name="play-arrow" size={28} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderQuiz = () => {
    if (currentQuiz.length === 0) return null;
    
    const currentQuestion = currentQuiz[currentQuestionIndex];
    const hasAnswered = userAnswers.length > currentQuestionIndex;
    const userAnswer = userAnswers[currentQuestionIndex];
    
    return (
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.quizScrollContent}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${((currentQuestionIndex + 1) / currentQuiz.length) * 100}%`,
                  backgroundColor: selectedCategory.color,
                }
              ]} 
            />
          </View>
          <View style={styles.quizStats}>
            <Text style={styles.quizStatText}>Score: {score}</Text>
            <Text style={styles.quizStatText}>{formatTime(timer)}</Text>
          </View>
        </View>
        
        {/* Question Card */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>
            Question {currentQuestionIndex + 1}
          </Text>
          
          <Text style={styles.questionText}>
            {currentQuestion.question}
          </Text>
          
          {/* Multiple Choice */}
          {typeof currentQuestion.correctAnswer === 'number' && currentQuestion.options && (
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = hasAnswered && userAnswer?.userAnswer === index;
                const isCorrect = index === currentQuestion.correctAnswer;
                const showResult = hasAnswered && (showAnswer || showAnswerMode === 'end');
                
                let backgroundColor = '#FFFFFF';
                let borderColor = '#000000';
                let textColor = '#000000';
                
                if (showResult) {
                  if (isCorrect) {
                    backgroundColor = '#4CAF50';
                    borderColor = '#4CAF50';
                    textColor = '#FFFFFF';
                  } else if (isSelected) {
                    backgroundColor = '#F44336';
                    borderColor = '#F44336';
                    textColor = '#FFFFFF';
                  }
                }
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      { backgroundColor, borderColor }
                    ]}
                    onPress={() => !hasAnswered && handleAnswer(index)}
                    disabled={hasAnswered}
                  >
                    <View style={[styles.optionLetter, { backgroundColor: isSelected ? '#FFFFFF' : borderColor }]}>
                      <Text style={[styles.optionLetterText, { color: isSelected ? borderColor : '#FFFFFF' }]}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                    </View>
                    <Text style={[styles.optionText, { color: textColor }]}>
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
                const isSelected = hasAnswered && userAnswer?.userAnswer === index;
                const isCorrect = option.value === currentQuestion.correctAnswer;
                const showResult = hasAnswered && (showAnswer || showAnswerMode === 'end');
                
                let backgroundColor = '#FFFFFF';
                let borderColor = '#000000';
                let textColor = '#000000';
                
                if (showResult) {
                  if (isCorrect) {
                    backgroundColor = '#4CAF50';
                    borderColor = '#4CAF50';
                    textColor = '#FFFFFF';
                  } else if (isSelected) {
                    backgroundColor = '#F44336';
                    borderColor = '#F44336';
                    textColor = '#FFFFFF';
                  }
                }
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.trueFalseButton,
                      { backgroundColor, borderColor }
                    ]}
                    onPress={() => !hasAnswered && handleAnswer(index)}
                    disabled={hasAnswered}
                  >
                    <Text style={[styles.trueFalseIcon, { color: textColor }]}>
                      {option.icon}
                    </Text>
                    <Text style={[styles.trueFalseText, { color: textColor }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          
          {/* Explanation */}
          {showAnswer && hasAnswered && (
            <View style={styles.explanationCard}>
              <Text style={[styles.explanationTitle, { color: userAnswer.isCorrect ? '#4CAF50' : '#F44336' }]}>
                {userAnswer.isCorrect ? '✅ Correct!' : '❌ Incorrect'}
              </Text>
              <Text style={styles.explanationText}>
                {currentQuestion.explanation}
              </Text>
              <Text style={styles.explanationReference}>
                📖 {currentQuestion.reference}
              </Text>
              
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: selectedCategory.color }]}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>
                  {currentQuestionIndex < currentQuiz.length - 1 ? 'Next Question' : 'See Results'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderResults = () => {
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const percentage = Math.round((correctCount / currentQuiz.length) * 100);
    
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.resultsCard}>
          <LinearGradient
            colors={selectedCategory.gradient}
            style={styles.resultsHeader}
          >
            <Text style={styles.resultsTitle}>Quiz Complete! 🎉</Text>
          </LinearGradient>
          
          <View style={styles.resultsContent}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scorePercentage}>{percentage}%</Text>
              <Text style={styles.scoreLabel}>
                {correctCount}/{currentQuiz.length} Correct
              </Text>
            </View>
            
            {showAnswerMode === 'end' && (
              <View style={styles.answersReview}>
                <Text style={styles.reviewTitle}>Review Answers</Text>
                {currentQuiz.map((question, index) => {
                  const userAnswer = userAnswers[index];
                  const isCorrect = userAnswer?.isCorrect || false;
                  
                  return (
                    <View key={index} style={styles.reviewItem}>
                      <View style={[
                        styles.reviewIcon,
                        { backgroundColor: isCorrect ? '#4CAF50' : '#F44336' }
                      ]}>
                        <Text style={styles.reviewIconText}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.reviewContent}>
                        <Text style={styles.reviewQuestion} numberOfLines={2}>
                          {question.question}
                        </Text>
                        {!isCorrect && (
                          <Text style={styles.reviewAnswer}>
                            Correct: {
                              typeof question.correctAnswer === 'number' 
                                ? question.options[question.correctAnswer]
                                : question.correctAnswer ? 'True' : 'False'
                            }
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            
            <View style={styles.resultButtons}>
              <TouchableOpacity
                style={[styles.resultButton, { backgroundColor: selectedCategory.color }]}
                onPress={() => {
                  setCurrentScreen('setup');
                  hapticFeedback.buttonPress();
                }}
              >
                <Text style={styles.resultButtonText}>Play Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.resultButton, { backgroundColor: '#666666' }]}
                onPress={() => {
                  setCurrentScreen('home');
                  hapticFeedback.buttonPress();
                }}
              >
                <Text style={styles.resultButtonText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {currentScreen === 'home' && renderHome()}
        {currentScreen === 'setup' && renderSetup()}
        {currentScreen === 'quiz' && renderQuiz()}
        {currentScreen === 'results' && renderResults()}
        
        {renderHeader()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header Styles
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  
  // Common Styles
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  quizScrollContent: {
    paddingTop: 120,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: '700',
  },
  
  // Home Styles
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#666666',
    letterSpacing: 1,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContent: {
    flex: 1,
    marginLeft: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  
  // Setup Styles
  setupCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  setupHeader: {
    padding: 32,
    alignItems: 'center',
  },
  setupCategoryTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
  },
  setupContent: {
    padding: 24,
  },
  setupSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 16,
    marginTop: 8,
  },
  questionCountOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  questionCountButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  questionCountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  answerModeOptions: {
    gap: 12,
    marginBottom: 32,
  },
  answerModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
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
  
  // Quiz Styles
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
  },
  progressFill: {
    height: '100%',
  },
  quizStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quizStatText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#666666',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 32,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 3,
    gap: 12,
  },
  optionLetter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 18,
    fontWeight: '900',
  },
  optionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  trueFalseContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  trueFalseButton: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
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
  explanationCard: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
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
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  
  // Results Styles
  resultsCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  resultsHeader: {
    padding: 32,
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  resultsContent: {
    padding: 24,
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
  scorePercentage: {
    fontSize: 48,
    fontWeight: '900',
    color: '#000000',
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666666',
  },
  answersReview: {
    marginBottom: 32,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '800',
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
  },
  reviewIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  reviewContent: {
    flex: 1,
    marginLeft: 12,
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
  resultButtons: {
    gap: 12,
  },
  resultButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resultButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default QuizGames;