import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import quizService from '../services/quizService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const QuizGames = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  
  // State Management
  const [currentScreen, setCurrentScreen] = useState('home'); // home, category, quiz, results, stats, badges
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedQuizType, setSelectedQuizType] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [currentQuiz, setCurrentQuiz] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [quizStartTime, setQuizStartTime] = useState(null);
  
  // Quiz Data from GitHub
  const [quizCategories, setQuizCategories] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState({});
  const [levels, setLevels] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // User Progress Data
  const [userProgress, setUserProgress] = useState({
    level: 1,
    xp: 0,
    totalQuizzes: 0,
    streak: 0,
    lastPlayedDate: null,
    categoryProgress: {},
    stats: {
      totalCorrect: 0,
      totalQuestions: 0,
      fastestTime: null,
    },
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  // Load quiz data and user progress on mount
  useEffect(() => {
    if (visible) {
      loadQuizData();
      loadUserProgress();
    }
  }, [visible]);

  const loadQuizData = async () => {
    try {
      setIsLoadingData(true);
      const [categories, questions, levelsData] = await Promise.all([
        quizService.getCategories(),
        quizService.getQuestions(),
        quizService.getLevels(),
      ]);
      
      setQuizCategories(categories);
      setQuizQuestions(questions);
      setLevels(levelsData);
      setIsLoadingData(false);
    } catch (error) {
      console.error('Error loading quiz data:', error);
      setIsLoadingData(false);
    }
  };

  // Timer for quiz
  useEffect(() => {
    let interval;
    if (currentScreen === 'quiz' && quizStartTime) {
      interval = setInterval(() => {
        setTimer(Math.floor((Date.now() - quizStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentScreen, quizStartTime]);

  // Pulse animation for streak
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadUserProgress = async () => {
    try {
      const savedProgress = await AsyncStorage.getItem('quizUserProgress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        
        // Check and update streak
        const today = new Date().toDateString();
        const lastPlayed = progress.lastPlayedDate ? new Date(progress.lastPlayedDate).toDateString() : null;
        
        if (lastPlayed !== today) {
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          if (lastPlayed !== yesterday) {
            progress.streak = 0; // Reset streak if not played yesterday
          }
        }
        
        setUserProgress(progress);
      }
    } catch (error) {
      console.error('Error loading quiz progress:', error);
    }
  };

  const saveUserProgress = async (newProgress) => {
    try {
      await AsyncStorage.setItem('quizUserProgress', JSON.stringify(newProgress));
      setUserProgress(newProgress);
    } catch (error) {
      console.error('Error saving quiz progress:', error);
    }
  };

  const animateScreenTransition = (toScreen) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setCurrentScreen(toScreen);
      slideAnim.setValue(50);
      confettiAnim.setValue(0); // Reset confetti animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleCategorySelect = (category) => {
    hapticFeedback.selection();
    if (category.locked) {
      return;
    }
    setSelectedCategory(category);
    animateScreenTransition('category');
  };

  const handleStartQuiz = () => {
    hapticFeedback.buttonPress();
    
    // Get questions for selected category and difficulty
    const categoryQuestions = quizQuestions[selectedCategory.id];
    const questions = categoryQuestions?.[selectedQuizType]?.[selectedDifficulty] || [];
    
    if (questions.length === 0) {
      return;
    }

    // Shuffle and select questions (max 10)
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(10, shuffled.length));
    
    setCurrentQuiz(selectedQuestions);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setScore(0);
    setTimer(0);
    setQuizStartTime(Date.now());
    animateScreenTransition('quiz');
  };

  const handleAnswer = (answerIndex) => {
    hapticFeedback.selection();
    const currentQuestion = currentQuiz[currentQuestionIndex];
    
    // Determine if it's true/false based on the question structure
    const isTrueFalse = typeof currentQuestion.correctAnswer === 'boolean';
    const isCorrect = isTrueFalse
      ? answerIndex === (currentQuestion.correctAnswer ? 0 : 1)
      : answerIndex === currentQuestion.correctAnswer;
    
    const newAnswers = [...userAnswers, { questionId: currentQuestion.id, userAnswer: answerIndex, isCorrect }];
    setUserAnswers(newAnswers);
    
    if (isCorrect) {
      setScore(score + currentQuestion.points);
      hapticFeedback.success();
    } else {
      hapticFeedback.error();
    }

    // Animate to next question or results
    setTimeout(() => {
      if (currentQuestionIndex < currentQuiz.length - 1) {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        });
      } else {
        // Quiz complete
        completeQuiz(newAnswers);
      }
    }, 1500);
  };

  const completeQuiz = (answers) => {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalQuestions = currentQuiz.length;
    const percentage = (correctCount / totalQuestions) * 100;
    const quizTime = timer;
    
    // Calculate XP earned
    const xpEarned = score + (percentage === 100 ? 50 : 0) + (quizTime < 120 ? 25 : 0);
    
    // Update progress
    const newProgress = { ...userProgress };
    newProgress.xp += xpEarned;
    newProgress.totalQuizzes += 1;
    newProgress.stats.totalCorrect += correctCount;
    newProgress.stats.totalQuestions += totalQuestions;
    
    // Update streak
    const today = new Date().toDateString();
    const lastPlayed = newProgress.lastPlayedDate ? new Date(newProgress.lastPlayedDate).toDateString() : null;
    if (lastPlayed !== today) {
      newProgress.streak += 1;
      newProgress.lastPlayedDate = new Date().toISOString();
    }
    
    // Update fastest time
    if (!newProgress.stats.fastestTime || quizTime < newProgress.stats.fastestTime) {
      newProgress.stats.fastestTime = quizTime;
    }
    
    // Update category progress
    if (!newProgress.categoryProgress[selectedCategory.id]) {
      newProgress.categoryProgress[selectedCategory.id] = {
        completed: 0,
        bestScore: 0,
      };
    }
    newProgress.categoryProgress[selectedCategory.id].completed += 1;
    if (percentage > newProgress.categoryProgress[selectedCategory.id].bestScore) {
      newProgress.categoryProgress[selectedCategory.id].bestScore = percentage;
    }
    
    // Check for level up
    const currentLevel = levels.find(l => newProgress.xp >= l.xpRequired && newProgress.xp < (levels[levels.indexOf(l) + 1]?.xpRequired || Infinity));
    if (currentLevel && currentLevel.level > newProgress.level) {
      newProgress.level = currentLevel.level;
      hapticFeedback.success();
    }
    
    saveUserProgress(newProgress);
    
    // Confetti animation
    Animated.spring(confettiAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
    
    animateScreenTransition('results');
  };

  const getCurrentLevel = () => {
    if (levels.length === 0) return null;
    return levels.find(l => userProgress.xp >= l.xpRequired && userProgress.xp < (levels[levels.indexOf(l) + 1]?.xpRequired || Infinity)) || levels[0];
  };

  const getNextLevel = () => {
    if (levels.length === 0) return null;
    const currentLevel = getCurrentLevel();
    if (!currentLevel) return null;
    const currentIndex = levels.indexOf(currentLevel);
    return levels[currentIndex + 1] || currentLevel;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderHeader = () => (
    <BlurView 
      intensity={20} 
      tint={isDark ? 'dark' : 'light'} 
      style={styles.blurHeader}
    >
      <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
      <View style={[styles.solidHeader, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: 8, paddingBottom: 12 }]}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.selection();
            if (currentScreen === 'home') {
              onClose();
            } else if (currentScreen === 'quiz') {
              // Don't allow back during quiz
              return;
            } else {
              animateScreenTransition('home');
            }
          }}
          style={styles.headerButton}
        >
          <Text style={[styles.headerButtonText, { color: theme.primary }]}>
            {currentScreen === 'home' ? 'Close' : 'Back'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {currentScreen === 'home' && 'Quiz & Games'}
          {currentScreen === 'category' && selectedCategory?.title}
          {currentScreen === 'quiz' && `Question ${currentQuestionIndex + 1}/${currentQuiz.length}`}
          {currentScreen === 'results' && 'Results'}
          {currentScreen === 'stats' && 'Your Stats'}
        </Text>
        <View style={{ width: 60 }} />
      </View>
    </BlurView>
  );

  const renderHome = () => {
    // Loading state
    if (isLoadingData) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <MaterialIcons name="quiz" size={64} color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading Quiz Data...</Text>
          <Text style={[styles.loadingSubtext, { color: theme.textSecondary }]}>
            Fetching fresh questions from the cloud
          </Text>
        </View>
      );
    }

    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();
    
    // If data not loaded yet, show simplified view
    if (!currentLevel || !nextLevel) {
      return (
        <Animated.View style={[styles.screenContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Simple Progress Card (no levels) */}
            <LinearGradient
              colors={[theme.primary + '40', theme.primary + '20']}
              style={styles.progressCard}
            >
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: theme.text }]}>YOUR PROGRESS</Text>
              </View>
              
              <Text style={[styles.levelTitle, { color: theme.text }]}>Quiz Master</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>🔥</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{userProgress.streak}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>🎯</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>{userProgress.totalQuizzes}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Categories */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>QUIZ CATEGORIES</Text>
            </View>

            {quizCategories.map((category, index) => {
              const categoryProgress = userProgress.categoryProgress[category.id] || { completed: 0, bestScore: 0 };
              const progressPercent = (categoryProgress.completed / category.totalQuizzes) * 100;
              
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, { backgroundColor: theme.surface, opacity: category.locked ? 0.6 : 1 }]}
                  onPress={() => handleCategorySelect(category)}
                  disabled={category.locked}
                >
                  <LinearGradient
                    colors={[category.gradient[0] + '20', category.gradient[1] + '10']}
                    style={styles.categoryGradientBorder}
                  >
                    <View style={styles.categoryContent}>
                      <View style={[styles.categoryIconContainer, { backgroundColor: category.color }]}>
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                      </View>
                      
                      <View style={styles.categoryInfo}>
                        <View style={styles.categoryTitleRow}>
                          <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.title}</Text>
                          {category.locked && <MaterialIcons name="lock" size={18} color={theme.textSecondary} />}
                        </View>
                        <Text style={[styles.categoryDescription, { color: theme.textSecondary }]} numberOfLines={1}>
                          {category.description}
                        </Text>
                        
                        {!category.locked && (
                          <View style={styles.categoryProgress}>
                            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                              <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: category.color }]} />
                            </View>
                            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                              {categoryProgress.completed}/{category.totalQuizzes} quizzes
                            </Text>
                          </View>
                        )}
                        
                        {category.locked && (
                          <Text style={[styles.lockText, { color: theme.textSecondary }]}>
                            🔒 {category.unlockRequirement}
                          </Text>
                        )}
                      </View>
                      
                      <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}

            <View style={styles.bottomNav}>
              <TouchableOpacity 
                style={styles.bottomNavButton}
                onPress={() => animateScreenTransition('stats')}
              >
                <MaterialIcons name="bar-chart" size={24} color={theme.primary} />
                <Text style={[styles.bottomNavText, { color: theme.text }]}>View Stats</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </Animated.View>
      );
    }

    const progress = currentLevel.level === nextLevel.level ? 1 : (userProgress.xp - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired);

    return (
      <Animated.View style={[styles.screenContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Progress Card */}
          <LinearGradient
            colors={[currentLevel.color + '40', currentLevel.color + '20']}
            style={styles.progressCard}
          >
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: theme.text }]}>YOUR PROGRESS</Text>
              <View style={[styles.levelBadge, { backgroundColor: currentLevel.color }]}>
                <Text style={styles.levelBadgeText}>LVL {currentLevel.level}</Text>
              </View>
            </View>
            
            <Text style={[styles.levelTitle, { color: theme.text }]}>{currentLevel.title}</Text>
            
            <View style={styles.xpBar}>
              <View style={[styles.xpBarBackground, { backgroundColor: theme.surface }]}>
                <Animated.View 
                  style={[
                    styles.xpBarFill, 
                    { 
                      backgroundColor: currentLevel.color,
                      width: `${progress * 100}%`,
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.xpText, { color: theme.textSecondary }]}>
                {userProgress.xp}/{nextLevel.xpRequired} XP
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Animated.View style={[styles.statItem, { transform: [{ scale: userProgress.streak > 0 ? pulseAnim : 1 }] }]}>
                <Text style={styles.statIcon}>🔥</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{userProgress.streak}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</Text>
              </Animated.View>
              
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🎯</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{userProgress.totalQuizzes}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completed</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Categories */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>QUIZ CATEGORIES</Text>
          </View>

          {quizCategories.map((category, index) => {
            const categoryProgress = userProgress.categoryProgress[category.id] || { completed: 0, bestScore: 0 };
            const progressPercent = (categoryProgress.completed / category.totalQuizzes) * 100;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, { backgroundColor: theme.surface, opacity: category.locked ? 0.6 : 1 }]}
                onPress={() => handleCategorySelect(category)}
                disabled={category.locked}
              >
                <LinearGradient
                  colors={[category.gradient[0] + '20', category.gradient[1] + '10']}
                  style={styles.categoryGradientBorder}
                >
                  <View style={styles.categoryContent}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: category.color }]}>
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                    </View>
                    
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryTitleRow}>
                        <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.title}</Text>
                        {category.locked && <MaterialIcons name="lock" size={18} color={theme.textSecondary} />}
                      </View>
                      <Text style={[styles.categoryDescription, { color: theme.textSecondary }]} numberOfLines={1}>
                        {category.description}
                      </Text>
                      
                      {!category.locked && (
                        <View style={styles.categoryProgress}>
                          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: category.color }]} />
                          </View>
                          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                            {categoryProgress.completed}/{category.totalQuizzes} quizzes
                          </Text>
                        </View>
                      )}
                      
                      {category.locked && (
                        <Text style={[styles.lockText, { color: theme.textSecondary }]}>
                          🔒 {category.unlockRequirement}
                        </Text>
                      )}
                    </View>
                    
                    <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}

          {/* Bottom Navigation */}
          <View style={styles.bottomNav}>
            <TouchableOpacity 
              style={styles.bottomNavButton}
              onPress={() => animateScreenTransition('stats')}
            >
              <MaterialIcons name="bar-chart" size={24} color={theme.primary} />
              <Text style={[styles.bottomNavText, { color: theme.text }]}>View Stats</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
    );
  };

  const renderCategory = () => (
    <Animated.View style={[styles.screenContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Quiz Type Selection */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>CHOOSE YOUR CHALLENGE</Text>
        </View>

        <View style={styles.quizTypeRow}>
          <TouchableOpacity
            style={[styles.quizTypeCard, { borderColor: selectedQuizType === 'true-false' ? selectedCategory.color : theme.border }]}
            onPress={() => {
              setSelectedQuizType('true-false');
              hapticFeedback.selection();
            }}
          >
            <LinearGradient
              colors={selectedQuizType === 'true-false' ? selectedCategory.gradient : [theme.surface, theme.surface]}
              style={styles.quizTypeGradient}
            >
              <Text style={styles.quizTypeIcon}>✅</Text>
              <Text style={[styles.quizTypeTitle, { color: selectedQuizType === 'true-false' ? '#FFF' : theme.text }]}>
                True/False
              </Text>
              <Text style={[styles.quizTypeSubtitle, { color: selectedQuizType === 'true-false' ? 'rgba(255,255,255,0.9)' : theme.textSecondary }]}>
                Quick & Fun
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quizTypeCard, { borderColor: selectedQuizType === 'multiple-choice' ? selectedCategory.color : theme.border }]}
            onPress={() => {
              setSelectedQuizType('multiple-choice');
              hapticFeedback.selection();
            }}
          >
            <LinearGradient
              colors={selectedQuizType === 'multiple-choice' ? selectedCategory.gradient : [theme.surface, theme.surface]}
              style={styles.quizTypeGradient}
            >
              <Text style={styles.quizTypeIcon}>🎯</Text>
              <Text style={[styles.quizTypeTitle, { color: selectedQuizType === 'multiple-choice' ? '#FFF' : theme.text }]}>
                Multiple Choice
              </Text>
              <Text style={[styles.quizTypeSubtitle, { color: selectedQuizType === 'multiple-choice' ? 'rgba(255,255,255,0.9)' : theme.textSecondary }]}>
                Test Knowledge
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Difficulty Selection */}
        {selectedQuizType && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>DIFFICULTY</Text>
            </View>

            <TouchableOpacity
              style={[styles.difficultyCard, { 
                backgroundColor: theme.surface,
                borderColor: selectedDifficulty === 'beginner' ? selectedCategory.color : theme.border,
                borderWidth: 2,
              }]}
              onPress={() => {
                setSelectedDifficulty('beginner');
                hapticFeedback.selection();
              }}
            >
              <Text style={styles.difficultyIcon}>😊</Text>
              <View style={styles.difficultyInfo}>
                <Text style={[styles.difficultyTitle, { color: theme.text }]}>BEGINNER</Text>
                <Text style={[styles.difficultyDescription, { color: theme.textSecondary }]}>
                  Perfect for starting out
                </Text>
              </View>
              {selectedDifficulty === 'beginner' && (
                <MaterialIcons name="check-circle" size={24} color={selectedCategory.color} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.difficultyCard, { 
                backgroundColor: theme.surface,
                borderColor: selectedDifficulty === 'intermediate' ? selectedCategory.color : theme.border,
                borderWidth: 2,
              }]}
              onPress={() => {
                setSelectedDifficulty('intermediate');
                hapticFeedback.selection();
              }}
            >
              <Text style={styles.difficultyIcon}>🤔</Text>
              <View style={styles.difficultyInfo}>
                <Text style={[styles.difficultyTitle, { color: theme.text }]}>INTERMEDIATE</Text>
                <Text style={[styles.difficultyDescription, { color: theme.textSecondary }]}>
                  Test your Bible knowledge
                </Text>
              </View>
              {selectedDifficulty === 'intermediate' && (
                <MaterialIcons name="check-circle" size={24} color={selectedCategory.color} />
              )}
            </TouchableOpacity>

            {/* Start Quiz Button */}
            <TouchableOpacity
              style={styles.startQuizButton}
              onPress={handleStartQuiz}
            >
              <LinearGradient
                colors={selectedCategory.gradient}
                style={styles.startQuizGradient}
              >
                <Text style={styles.startQuizText}>START QUIZ (10Q)</Text>
                <MaterialIcons name="play-arrow" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </Animated.View>
  );

  const renderQuiz = () => {
    console.log('🎯 renderQuiz called:', {
      quizLength: currentQuiz.length,
      currentIndex: currentQuestionIndex,
      hasCategory: !!selectedCategory,
      categoryId: selectedCategory?.id,
    });

    if (currentQuiz.length === 0 || !currentQuiz[currentQuestionIndex]) {
      console.log('❌ No quiz or no question at index');
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading question...</Text>
        </View>
      );
    }
    
    const currentQuestion = currentQuiz[currentQuestionIndex];
    console.log('📝 Current question:', {
      id: currentQuestion?.id,
      hasQuestion: !!currentQuestion?.question,
      hasOptions: !!currentQuestion?.options,
      answerType: typeof currentQuestion?.correctAnswer,
    });

    if (!currentQuestion) {
      console.log('❌ No current question');
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Question not found</Text>
        </View>
      );
    }

    if (!selectedCategory) {
      console.log('❌ No selected category');
      return (
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.loadingText, { color: theme.text }]}>Category not set</Text>
        </View>
      );
    }
    
    const progress = (currentQuestionIndex / currentQuiz.length);
    const hasAnswered = userAnswers.length > currentQuestionIndex;
    const userAnswer = hasAnswered ? userAnswers[currentQuestionIndex] : null;
    const categoryColor = selectedCategory.color || theme.primary;

    console.log('✅ Rendering quiz UI');

    return (
      <Animated.View style={[styles.screenContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.quizScrollContent}
          style={{ flex: 1 }}
        >
          {/* Progress Bar */}
          <View style={styles.quizProgress}>
            <View style={[styles.quizProgressBar, { backgroundColor: '#E0E0E0' }]}>
              <Animated.View 
                style={[
                  styles.quizProgressFill, 
                  { 
                    width: `${progress * 100}%`,
                    backgroundColor: categoryColor,
                  }
                ]} 
              />
            </View>
            <View style={styles.quizMeta}>
              <Text style={[styles.quizMetaText, { color: '#666' }]}>
                Score: {score} pts
              </Text>
              <Text style={[styles.quizMetaText, { color: '#666' }]}>
                ⏱️ {formatTime(timer)}
              </Text>
            </View>
          </View>

          {/* Question Card */}
          <View style={[styles.questionCard, { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E0E0E0' }]}>
            <View style={styles.questionHeader}>
              <Text style={[styles.questionNumber, { color: '#666' }]}>
                Question {currentQuestionIndex + 1}
              </Text>
            </View>
            
            <Text style={[styles.questionText, { color: '#1a1a1a' }]}>
              {currentQuestion.question}
            </Text>

            {/* Answer Options */}
            <View style={styles.answerOptions}>
              {typeof currentQuestion.correctAnswer === 'number' && currentQuestion.options ? (
                currentQuestion.options.map((option, index) => {
                  const isSelected = hasAnswered && userAnswer.userAnswer === index;
                  const isCorrect = index === currentQuestion.correctAnswer;
                  const showResult = hasAnswered;
                  
                  let backgroundColor = '#FFFFFF';
                  let borderColor = '#CCCCCC';
                  
                  if (showResult) {
                    if (isCorrect) {
                      backgroundColor = '#4CAF5020';
                      borderColor = '#4CAF50';
                    } else if (isSelected && !isCorrect) {
                      backgroundColor = '#F4433620';
                      borderColor = '#F44336';
                    }
                  }
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.answerOption,
                        { backgroundColor, borderColor, borderWidth: 2 },
                      ]}
                      onPress={() => !hasAnswered && handleAnswer(index)}
                      disabled={hasAnswered}
                    >
                      <View style={[styles.answerLetter, { backgroundColor: borderColor }]}>
                        <Text style={styles.answerLetterText}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      </View>
                      <Text style={[styles.answerText, { color: '#1a1a1a' }]}>
                        {option}
                      </Text>
                      {showResult && isCorrect && (
                        <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <MaterialIcons name="cancel" size={24} color="#F44336" />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                // True/False
                <>
                  {[
                    { label: 'TRUE', value: true, icon: '✓' },
                    { label: 'FALSE', value: false, icon: '✗' },
                  ].map((option, index) => {
                    const isSelected = hasAnswered && userAnswer.userAnswer === index;
                    const isCorrect = (index === 1 && !currentQuestion.correctAnswer) || (index === 0 && currentQuestion.correctAnswer);
                    const showResult = hasAnswered;
                    
                    let backgroundColor = '#FFFFFF';
                    let borderColor = '#CCCCCC';
                    
                    if (showResult) {
                      if (isCorrect) {
                        backgroundColor = '#4CAF5020';
                        borderColor = '#4CAF50';
                      } else if (isSelected && !isCorrect) {
                        backgroundColor = '#F4433620';
                        borderColor = '#F44336';
                      }
                    }
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.trueFalseOption,
                          { backgroundColor, borderColor, borderWidth: 3 },
                        ]}
                        onPress={() => !hasAnswered && handleAnswer(index)}
                        disabled={hasAnswered}
                      >
                        <Text style={styles.trueFalseIcon}>{option.icon}</Text>
                        <Text style={[styles.trueFalseText, { color: '#1a1a1a' }]}>
                          {option.label}
                        </Text>
                        {showResult && isCorrect && (
                          <MaterialIcons name="check-circle" size={28} color="#4CAF50" />
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <MaterialIcons name="cancel" size={28} color="#F44336" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </View>

            {/* Explanation (shown after answer) */}
            {hasAnswered && (
              <Animated.View 
                style={[
                  styles.explanationCard,
                  { 
                    backgroundColor: userAnswer.isCorrect ? '#4CAF5015' : '#F4433615',
                  }
                ]}
              >
                <View style={styles.explanationHeader}>
                  <MaterialIcons 
                    name={userAnswer.isCorrect ? 'check-circle' : 'cancel'} 
                    size={24} 
                    color={userAnswer.isCorrect ? '#4CAF50' : '#F44336'} 
                  />
                  <Text style={[
                    styles.explanationTitle,
                    { color: userAnswer.isCorrect ? '#4CAF50' : '#F44336' }
                  ]}>
                    {userAnswer.isCorrect ? 'CORRECT!' : 'INCORRECT'}
                  </Text>
                </View>
                
                <Text style={[styles.explanationText, { color: theme.text }]}>
                  {currentQuestion.explanation}
                </Text>
                
                <Text style={[styles.explanationReference, { color: theme.textSecondary }]}>
                  📖 {currentQuestion.reference}
                </Text>
              </Animated.View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
    );
  };

  const renderResults = () => {
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const totalQuestions = currentQuiz.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const stars = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 50 ? 1 : 0;
    const categoryGradient = selectedCategory?.gradient || [theme.primary, theme.primaryDark];

    return (
      <Animated.View style={[styles.screenContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Results Header */}
          <Animated.View 
            style={[
              styles.resultsHeader,
              { transform: [{ scale: confettiAnim }] }
            ]}
          >
            <Text style={styles.resultsEmoji}>🎉</Text>
            <Text style={[styles.resultsTitle, { color: theme.text }]}>QUIZ COMPLETE!</Text>
          </Animated.View>

          {/* Score Card */}
          <LinearGradient
            colors={categoryGradient}
            style={styles.scoreCard}
          >
            <Text style={styles.scoreLabel}>Your Score</Text>
            <Text style={styles.scoreValue}>{correctCount}/{totalQuestions}</Text>
            <Text style={styles.scorePercentage}>{percentage}%</Text>
            
            <View style={styles.starsRow}>
              {[1, 2, 3].map(i => (
                <Text key={i} style={styles.star}>
                  {i <= stars ? '⭐' : '☆'}
                </Text>
              ))}
            </View>
          </LinearGradient>

          {/* Stats */}
          <View style={[styles.resultsStats, { backgroundColor: theme.surface }]}>
            <View style={styles.resultStatItem}>
              <Text style={styles.resultStatIcon}>🏆</Text>
              <Text style={[styles.resultStatValue, { color: theme.text }]}>+{score} XP</Text>
              <Text style={[styles.resultStatLabel, { color: theme.textSecondary }]}>Points Earned</Text>
            </View>
            
            <View style={styles.resultStatDivider} />
            
            <View style={styles.resultStatItem}>
              <Text style={styles.resultStatIcon}>⏱️</Text>
              <Text style={[styles.resultStatValue, { color: theme.text }]}>{formatTime(timer)}</Text>
              <Text style={[styles.resultStatLabel, { color: theme.textSecondary }]}>Time Taken</Text>
            </View>
            
            <View style={styles.resultStatDivider} />
            
            <View style={styles.resultStatItem}>
              <Text style={styles.resultStatIcon}>🔥</Text>
              <Text style={[styles.resultStatValue, { color: theme.text }]}>{userProgress.streak}</Text>
              <Text style={[styles.resultStatLabel, { color: theme.textSecondary }]}>Day Streak</Text>
            </View>
          </View>

          {/* Answer Breakdown */}
          <View style={styles.answerBreakdown}>
            <Text style={[styles.breakdownTitle, { color: theme.text }]}>Answer Breakdown</Text>
            <View style={styles.breakdownRow}>
              {userAnswers.map((answer, index) => (
                <View 
                  key={index}
                  style={[
                    styles.breakdownDot,
                    { backgroundColor: answer.isCorrect ? '#4CAF50' : '#F44336' }
                  ]}
                >
                  <Text style={styles.breakdownDotText}>{index + 1}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.resultsButtons}>
            <TouchableOpacity
              style={[styles.resultButton, { backgroundColor: theme.surface }]}
              onPress={() => {
                hapticFeedback.selection();
                animateScreenTransition('home');
              }}
            >
              <MaterialIcons name="home" size={20} color={theme.text} />
              <Text style={[styles.resultButtonText, { color: theme.text }]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resultButton}
              onPress={() => {
                hapticFeedback.buttonPress();
                handleStartQuiz();
              }}
            >
              <LinearGradient
                colors={categoryGradient}
                style={styles.resultButtonGradient}
              >
                <MaterialIcons name="refresh" size={20} color="#FFF" />
                <Text style={styles.resultButtonTextPrimary}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
    );
  };

  const renderStats = () => {
    const accuracy = userProgress.stats.totalQuestions > 0 
      ? Math.round((userProgress.stats.totalCorrect / userProgress.stats.totalQuestions) * 100)
      : 0;

    return (
      <Animated.View style={[styles.screenContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statsTitle, { color: theme.text }]}>YOUR ACHIEVEMENTS</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxIcon}>🎯</Text>
                <Text style={[styles.statBoxValue, { color: theme.text }]}>{userProgress.totalQuizzes}</Text>
                <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Total Quizzes</Text>
              </View>
              
              <View style={styles.statBox}>
                <Text style={styles.statBoxIcon}>⭐</Text>
                <Text style={[styles.statBoxValue, { color: theme.text }]}>{userProgress.xp}</Text>
                <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Total XP</Text>
              </View>
              
              <View style={styles.statBox}>
                <Text style={styles.statBoxIcon}>📈</Text>
                <Text style={[styles.statBoxValue, { color: theme.text }]}>{accuracy}%</Text>
                <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Accuracy</Text>
              </View>
              
              <View style={styles.statBox}>
                <Text style={styles.statBoxIcon}>🔥</Text>
                <Text style={[styles.statBoxValue, { color: theme.text }]}>{userProgress.streak}</Text>
                <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Current Streak</Text>
              </View>
            </View>
          </View>

          {/* Progress by Category */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>PROGRESS BY CATEGORY</Text>
          </View>

          {quizCategories.filter(c => !c.locked).map(category => {
            const categoryProg = userProgress.categoryProgress[category.id] || { completed: 0 };
            const percent = Math.round((categoryProg.completed / category.totalQuizzes) * 100);
            
            return (
              <View key={category.id} style={styles.categoryStatRow}>
                <Text style={[styles.categoryStatName, { color: theme.text }]}>{category.title}</Text>
                <View style={[styles.categoryStatBar, { backgroundColor: theme.border }]}>
                  <View style={[styles.categoryStatBarFill, { width: `${percent}%`, backgroundColor: category.color }]} />
                </View>
                <Text style={[styles.categoryStatPercent, { color: theme.textSecondary }]}>{percent}%</Text>
              </View>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} hidden={false} />
        
        {currentScreen === 'home' && renderHome()}
        {currentScreen === 'category' && renderCategory()}
        {currentScreen === 'quiz' && renderQuiz()}
        {currentScreen === 'results' && renderResults()}
        {currentScreen === 'stats' && renderStats()}
        
        {renderHeader()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  blurHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  solidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  screenContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 120 : 90,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  quizScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  
  // Progress Card
  progressCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  levelTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
  },
  xpBar: {
    marginBottom: 20,
  },
  xpBarBackground: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Sections
  sectionHeader: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Category Cards
  categoryCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  categoryGradientBorder: {
    padding: 2,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoryDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
  categoryProgress: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lockText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  bottomNavButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  bottomNavText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Quiz Type Selection
  quizTypeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  quizTypeCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
  },
  quizTypeGradient: {
    padding: 24,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  quizTypeIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  quizTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  quizTypeSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Difficulty Cards
  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  difficultyIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  difficultyInfo: {
    flex: 1,
  },
  difficultyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  difficultyDescription: {
    fontSize: 14,
  },

  // Start Quiz Button
  startQuizButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startQuizGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  startQuizText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },

  // Quiz Screen
  quizProgress: {
    marginBottom: 24,
  },
  quizProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  quizProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  quizMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quizMetaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  questionCard: {
    borderRadius: 20,
    padding: 24,
  },
  questionHeader: {
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 32,
  },
  answerOptions: {
    gap: 12,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  answerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  trueFalseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 20,
    gap: 12,
  },
  trueFalseIcon: {
    fontSize: 32,
  },
  trueFalseText: {
    fontSize: 24,
    fontWeight: '800',
  },
  explanationCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  explanationReference: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Results Screen
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultsEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  scoreCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scoreValue: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 8,
  },
  scorePercentage: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    fontSize: 32,
  },
  resultsStats: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  resultStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  resultStatIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  resultStatValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultStatDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  answerBreakdown: {
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownDotText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resultsButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  resultButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  resultButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  resultButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  resultButtonTextPrimary: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Stats Screen
  statsCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
  },
  statBoxIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  categoryStatName: {
    fontSize: 14,
    fontWeight: '600',
    width: 120,
  },
  categoryStatBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryStatBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryStatPercent: {
    fontSize: 14,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },

});

export default QuizGames;

