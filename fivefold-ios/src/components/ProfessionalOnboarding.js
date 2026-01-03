import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
  Animated,
  StatusBar,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { hapticFeedback } from '../utils/haptics';
import { countries } from '../data/countries';
import { languages } from '../data/languages';
import SuperSimpleProfile from './SuperSimpleProfile';
import { enableSmartFeatures } from '../utils/secureApiKey';

const { width, height } = Dimensions.get('window');

const ProfessionalOnboarding = ({ onComplete }) => {
  const { theme, isDark } = useTheme();
  const { t, changeLanguage, selectedLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedLang, setSelectedLang] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [smartFeaturesAccepted, setSmartFeaturesAccepted] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Steps configuration
  const steps = [
    { id: 'welcome', title: t('welcome.title'), hasInput: false },
    { id: 'language', title: t('language.title'), hasInput: false },
    { id: 'features', title: t('features.title'), hasInput: false },
    { id: 'smart', title: t('smart.title'), hasInput: false },
    { id: 'profile', title: t('profile.title'), hasInput: true },
    { id: 'complete', title: t('complete.title'), hasInput: false }
  ];

  // Clear all user data for fresh start
  const clearAllUserData = async () => {
    try {
      // Clear regular keys
      const keysToRemove = [
        'userProfile',
        'todos',
        'completedTodos',
        'prayerCompletions',
        'customPrayerNames',
        'customPrayerTimes',
        'achievements',
        'userStats',
        'readingProgress',
        'chatHistory',
        'onboardingCompleted'
      ];
      
      // Clear fivefold_ prefixed keys (from localStorage utility)
      const fivefoldKeys = [
        'fivefold_userStats',
        'fivefold_todos',
        'fivefold_prayerHistory',
        'fivefold_settings',
        'fivefold_notificationSettings',
        'fivefold_prayerCompletions'
      ];
      
      // Get all keys and clear any we find
      const allKeys = await AsyncStorage.getAllKeys();
      const allKeysToRemove = allKeys.filter(key => 
        keysToRemove.includes(key) || 
        key.startsWith('fivefold_') ||
        key.includes('prayer') ||
        key.includes('todo') ||
        key.includes('completion')
      );
      
      if (allKeysToRemove.length > 0) {
        await AsyncStorage.multiRemove(allKeysToRemove);
      }
      
      console.log('✅ All user data cleared for fresh start - removed keys:', allKeysToRemove);
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
    }
  };

  // Keyboard listeners refs
  const keyboardListeners = useRef([]);

  // Initialize onboarding
  useEffect(() => {
    // Clear all data for fresh start
    const initializeOnboarding = async () => {
      await clearAllUserData();
      startAnimation();
      setupKeyboardListeners();
      
      // Debug: Verify data is cleared
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🔍 Keys after clearing:', allKeys);
      
      const profile = await AsyncStorage.getItem('userProfile');
      const prayerData = await AsyncStorage.getItem('fivefold_prayerHistory');
      console.log('🔍 Profile after clear:', profile);
      console.log('🔍 Prayer history after clear:', prayerData);
    };
    
    initializeOnboarding();
    
    return () => {
      // Properly remove listeners
      keyboardListeners.current.forEach(listener => {
        if (listener && listener.remove) {
          listener.remove();
        }
      });
      keyboardListeners.current = [];
    };
  }, []);

  // Keyboard listeners
  const setupKeyboardListeners = () => {
    const keyboardDidShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );
    
    const keyboardDidHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    // Store listeners for cleanup
    keyboardListeners.current = [keyboardDidShow, keyboardDidHide];
  };

  // Start entrance animation
  const startAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animate step transition
  const animateStepTransition = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 30,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Update progress bar
  const updateProgress = (step) => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / steps.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  // Handle next step
  const handleNext = async () => {
    hapticFeedback.light();
    
    if (currentStep === 1 && selectedLang) { // Language step
      await changeLanguage(selectedLang.code);
    }
    
    if (currentStep === 3) { // Smart features step
      if (smartFeaturesAccepted) {
        await enableSmartFeatures();
        console.log('✅ Smart features enabled');
      }
    }
    
    if (currentStep === 4) { // Profile step (now index 4 after adding smart consent)
      if (!userName.trim()) {
        hapticFeedback.error();
        Alert.alert(t('profile.nameRequired', 'Name Required'), t('profile.enterNameMessage', 'Please enter your name to continue.'));
        return;
      }
      await saveUserProfile();
    }
    
    if (currentStep < steps.length - 1) {
      animateStepTransition(() => {
        setCurrentStep(currentStep + 1);
        updateProgress(currentStep + 1);
      });
    } else {
      completeOnboarding();
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    hapticFeedback.light();
    if (currentStep > 0) {
      animateStepTransition(() => {
        setCurrentStep(currentStep - 1);
        updateProgress(currentStep - 1);
      });
    }
  };

  // Save user profile
  const saveUserProfile = async () => {
    try {
      const profileData = {
        name: userName.trim(),
        profilePicture: profileImage,
        country: selectedCountry,
        language: selectedLang?.code || selectedLanguage,
        joinedDate: new Date().toISOString(),
        isNewUser: true,
      };
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
      console.log('✅ Profile saved:', profileData);
      hapticFeedback.success();
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      hapticFeedback.error();
    }
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      hapticFeedback.success();
      onComplete();
    } catch (error) {
      console.error('❌ Failed to complete onboarding:', error);
    }
  };

  // Skip onboarding
  const handleSkip = async () => {
    hapticFeedback.light();
    Alert.alert(
      t('skipDialog.title'),
      t('skipDialog.message'),
      [
        { text: t('skipDialog.continueSetup'), style: 'cancel' },
        { 
          text: t('skipDialog.skipAction'), 
          style: 'destructive',
          onPress: async () => {
            // Clear all existing data first
            await clearAllUserData();
            
            // Set default values for skipped user
            await AsyncStorage.setItem('onboardingCompleted', 'true');
            await AsyncStorage.setItem('userProfile', JSON.stringify({
              name: 'Friend',
              profilePicture: null,
              country: { name: 'Not Specified', code: 'NA', flag: '🌍' },
              language: selectedLanguage || 'en',
              joinedDate: new Date().toISOString(),
              isNewUser: true,
            }));
            
            // Initialize empty default data for new user
            await AsyncStorage.setItem('fivefold_userStats', JSON.stringify({
              totalPoints: 0,
              level: 1,
              completedTasks: 0,
              totalTasks: 0,
              prayersCompleted: 0,
              currentStreak: 0,
              joinedDate: new Date().toISOString()
            }));
            await AsyncStorage.setItem('fivefold_todos', JSON.stringify([]));
            await AsyncStorage.setItem('fivefold_prayerHistory', JSON.stringify([]));
            
            onComplete();
          }
        }
      ]
    );
  };

  // Note: pickImage is now handled inside SimpleProfileScreen

  // Welcome Screen
  const WelcomeScreen = () => (
    <View style={styles.stepContainer}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={[styles.welcomeTitle, { color: theme.text }]}>
          {t('welcome.title')}
        </Text>
        
        <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
          {t('welcome.subtitle')}
        </Text>
        
        <View style={styles.welcomeFeatures}>
          <View style={styles.welcomeFeature}>
            <MaterialIcons name="stars" size={24} color={theme.primary} />
            <Text style={[styles.welcomeFeatureText, { color: theme.textSecondary }]}>
              {t('welcome.smartTasks')}
            </Text>
          </View>
          
          <View style={styles.welcomeFeature}>
            <MaterialIcons name="favorite" size={24} color={theme.primary} />
            <Text style={[styles.welcomeFeatureText, { color: theme.textSecondary }]}>
              {t('welcome.dailyPrayer')}
            </Text>
          </View>
          
          <View style={styles.welcomeFeature}>
            <MaterialIcons name="menu-book" size={24} color={theme.primary} />
            <Text style={[styles.welcomeFeatureText, { color: theme.textSecondary }]}>
              {t('welcome.bibleReading')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Language Selection Screen
  const LanguageScreen = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentContainer}>
        <Text style={[styles.stepTitle, { color: theme.text }]}>
          {t('language.title')}
        </Text>
        
        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
          {t('language.subtitle')}
        </Text>
        
        <View style={styles.languagesList}>
          {languages.slice(0, 3).map((language) => {
            const isEnglish = language.code === 'en';
            return (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageCard,
                { 
                  backgroundColor: theme.surface,
                  borderColor: selectedLang?.code === language.code ? theme.primary : theme.border,
                  borderWidth: selectedLang?.code === language.code ? 2 : 1,
                  opacity: isEnglish ? 1 : 0.5
                }
              ]}
              onPress={isEnglish ? () => {
                hapticFeedback.selection();
                setSelectedLang(language);
              } : () => {
                // Do nothing for non-English languages
              }}
              disabled={!isEnglish}
            >
              <Text style={styles.languageFlag}>{language.flag}</Text>
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, { color: theme.text }]}>
                  {language.nativeName}
                </Text>
                <Text style={[styles.languageEnglishName, { color: theme.textSecondary }]}>
                  {language.name}
                </Text>
              </View>
              {selectedLang?.code === language.code && (
                <MaterialIcons name="check-circle" size={24} color={theme.success} />
              )}
            </TouchableOpacity>
                      );
          })}
          
          <TouchableOpacity
            style={[styles.moreLanguagesButton, { backgroundColor: theme.surface }]}
            onPress={() => {
              hapticFeedback.selection();
              setShowLanguagePicker(true);
            }}
          >
            <MaterialIcons name="more-horiz" size={24} color={theme.primary} />
            <Text style={[styles.moreLanguagesText, { color: theme.primary }]}>
              More Languages
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Smart Features Consent Screen
  const SmartFeaturesScreen = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentContainer}>
        <View style={styles.smartContainer}>
          <LinearGradient
            colors={[theme.primary + '20', theme.primary + '10']}
            style={styles.smartIconContainer}
          >
            <MaterialIcons name="stars" size={60} color={theme.primary} />
          </LinearGradient>
          
          <Text style={[styles.smartTitle, { color: theme.text }]}>
            Enable Smart Features
          </Text>
          
          <Text style={[styles.smartDescription, { color: theme.textSecondary }]}>
            This app uses advanced technology to provide you with intelligent task suggestions, 
            personalized Bible verses, and smart prayer reminders.
          </Text>
          
          <View style={styles.smartFeaturesList}>
            <View style={styles.smartFeatureItem}>
              <MaterialIcons name="check-circle" size={20} color={theme.success} />
              <Text style={[styles.smartFeatureText, { color: theme.text }]}>
                Smart task prioritization
              </Text>
            </View>
            
            <View style={styles.smartFeatureItem}>
              <MaterialIcons name="check-circle" size={20} color={theme.success} />
              <Text style={[styles.smartFeatureText, { color: theme.text }]}>
                Personalized Bible recommendations
              </Text>
            </View>
            
            <View style={styles.smartFeatureItem}>
              <MaterialIcons name="check-circle" size={20} color={theme.success} />
              <Text style={[styles.smartFeatureText, { color: theme.text }]}>
                Intelligent prayer suggestions
              </Text>
            </View>
            
            <View style={styles.smartFeatureItem}>
              <MaterialIcons name="check-circle" size={20} color={theme.success} />
              <Text style={[styles.smartFeatureText, { color: theme.text }]}>
                Contextual spiritual guidance
              </Text>
            </View>
          </View>
          
          <View style={[styles.smartNotice, { backgroundColor: theme.surface }]}>
            <MaterialIcons name="lock" size={16} color={theme.primary} />
            <Text style={[styles.smartNoticeText, { color: theme.textSecondary }]}>
              Your data is encrypted and secure. We never share your information.
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.success();
              setSmartFeaturesAccepted(true);
            }}
            style={[
              styles.smartAcceptButton,
              {
                backgroundColor: smartFeaturesAccepted ? theme.success : theme.primary,
                borderWidth: 2,
                borderColor: smartFeaturesAccepted ? theme.success : theme.primary,
              }
            ]}
          >
            {smartFeaturesAccepted ? (
              <>
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
                <Text style={styles.smartAcceptText}>Smart Features Enabled</Text>
              </>
            ) : (
              <Text style={styles.smartAcceptText}>Enable Smart Features</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setSmartFeaturesAccepted(false);
            }}
            style={styles.smartSkipButton}
          >
            <Text style={[styles.smartSkipText, { color: theme.textSecondary }]}>
              Continue without smart features
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Features Screen
  const FeaturesScreen = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentContainer}>
        <Text style={[styles.stepTitle, { color: theme.text }]}>
          {t('features.title')}
        </Text>
        
        <View style={styles.featuresList}>
          <View style={[styles.featureCard, { backgroundColor: theme.surface }]}>
            <LinearGradient
              colors={[theme.primary + '20', theme.primary + '10']}
              style={styles.featureIconContainer}
            >
              <MaterialIcons name="task-alt" size={32} color={theme.primary} />
            </LinearGradient>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                {t('features.smartTasks.title')}
              </Text>
              <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                {t('features.smartTasks.description')}
              </Text>
            </View>
          </View>
          
          <View style={[styles.featureCard, { backgroundColor: theme.surface }]}>
            <LinearGradient
              colors={[theme.primary + '20', theme.primary + '10']}
              style={styles.featureIconContainer}
            >
              <MaterialIcons name="schedule" size={32} color={theme.primary} />
            </LinearGradient>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                {t('features.prayerTimes.title')}
              </Text>
              <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                {t('features.prayerTimes.description')}
              </Text>
            </View>
          </View>
          
          <View style={[styles.featureCard, { backgroundColor: theme.surface }]}>
            <LinearGradient
              colors={[theme.primary + '20', theme.primary + '10']}
              style={styles.featureIconContainer}
            >
              <MaterialIcons name="chat" size={32} color={theme.primary} />
            </LinearGradient>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                {t('features.friendChat.title')}
              </Text>
              <Text style={[styles.featureDescription, { color: theme.textSecondary }]}>
                {t('features.friendChat.description')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  // Profile Setup Screen - Using the super simple version
  const ProfileScreen = () => (
    <SuperSimpleProfile
      onNext={handleNext}
      onBack={handlePrevious}
      userName={userName}
      setUserName={setUserName}
      selectedCountry={selectedCountry}
      onCountryPress={() => {
        hapticFeedback.selection();
        setShowCountryPicker(true);
      }}
      t={t}
    />
  );

  // Complete Screen
  const CompleteScreen = () => (
    <View style={styles.stepContainer}>
      <View style={styles.contentContainer}>
        <View style={styles.successContainer}>
          <LinearGradient
            colors={[theme.success + '20', theme.success + '10']}
            style={styles.successIconContainer}
          >
            <MaterialIcons name="check-circle" size={80} color={theme.success} />
          </LinearGradient>
          
          <Text style={[styles.successTitle, { color: theme.text }]}>
            {t('complete.title')}
          </Text>
          
          <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
            {userName ? t('complete.subtitle', { name: userName }) : t('complete.defaultSubtitle')}
          </Text>
          
          <View style={styles.successFeatures}>
            <Text style={[styles.successFeature, { color: theme.textSecondary }]}>
              {t('complete.features.goals')}
            </Text>
            <Text style={[styles.successFeature, { color: theme.textSecondary }]}>
              {t('complete.features.scripture')}
            </Text>
            <Text style={[styles.successFeature, { color: theme.textSecondary }]}>
              {t('complete.features.chat')}
            </Text>
            <Text style={[styles.successFeature, { color: theme.textSecondary }]}>
              {t('complete.features.prayer')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return <WelcomeScreen />;
      case 1: return <LanguageScreen />;
      case 2: return <FeaturesScreen />;
      case 3: return <SmartFeaturesScreen />;
      case 4: return <ProfileScreen />;
      case 5: return <CompleteScreen />;
      default: return <WelcomeScreen />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent={false} hidden={false} />
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
          <Animated.View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: theme.primary,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              }
            ]} 
          />
        </View>
        
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {currentStep + 1} of {steps.length}
        </Text>
      </View>

      {/* Skip Button */}
      {currentStep < steps.length - 1 && (
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>
            {t('welcome.skip')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Main Content */}
      <Animated.View 
        style={[
          styles.mainContent,
          currentStep === 4 && { paddingHorizontal: 0 }, // Remove padding for profile screen
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingBottom: isKeyboardVisible && currentStep !== 4 ? keyboardHeight : 0,
          }
        ]}
      >
        {renderStepContent()}
      </Animated.View>

      {/* Navigation Buttons - Hidden for Profile Screen */}
      {currentStep !== 4 && (
        <View style={[styles.navigationContainer, { 
          paddingBottom: isKeyboardVisible ? 10 : 40,
          marginBottom: isKeyboardVisible ? keyboardHeight : 0,
        }]}>
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <TouchableOpacity 
              onPress={handlePrevious}
              style={[styles.secondaryButton, { borderColor: theme.border }]}
            >
              <MaterialIcons name="chevron-left" size={24} color={theme.textSecondary} />
              <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
                {t('welcome.back')}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            onPress={handleNext}
            style={[
              styles.primaryButton, 
              { 
                backgroundColor: theme.primary,
                flex: currentStep === 0 || currentStep === steps.length - 1 ? 1 : 0.6,
              }
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {currentStep === steps.length - 1 ? t('complete.startUsing') : 
               currentStep === 0 ? t('welcome.letsGo') : t('welcome.next')}
            </Text>
            <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
              <Text style={[styles.modalButton, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Country</Text>
            
            <View style={{ width: 60 }} />
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search countries..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
          </View>

          {/* Country List */}
          <FlatList
            data={countries.filter(country => 
              country.name.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  hapticFeedback.selection();
                  setSelectedCountry(item);
                  setShowCountryPicker(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.countryItemFlag}>{item.flag}</Text>
                <Text style={[styles.countryItemName, { color: theme.text }]}>
                  {item.name}
                </Text>
                {selectedCountry?.code === item.code && (
                  <MaterialIcons name="check" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
              <Text style={[styles.modalButton, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('language.title')}
            </Text>
            
            <View style={{ width: 60 }} />
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={t('language.searchLanguages')}
              placeholderTextColor={theme.textSecondary}
              value={languageSearchQuery}
              onChangeText={setLanguageSearchQuery}
              autoCorrect={false}
            />
          </View>

          {/* Language List */}
          <FlatList
            data={languages.filter(language => 
              language.name.toLowerCase().includes(languageSearchQuery.toLowerCase()) ||
              language.nativeName.toLowerCase().includes(languageSearchQuery.toLowerCase())
            )}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isEnglish = item.code === 'en';
              return (
              <TouchableOpacity
                style={[styles.countryItem, { borderBottomColor: theme.border, opacity: isEnglish ? 1 : 0.5 }]}
                onPress={isEnglish ? () => {
                  hapticFeedback.selection();
                  setSelectedLang(item);
                  setShowLanguagePicker(false);
                  setLanguageSearchQuery('');
                } : () => {
                  // Do nothing for non-English languages
                }}
                disabled={!isEnglish}
              >
                <Text style={styles.countryItemFlag}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.countryItemName, { color: theme.text }]}>
                    {item.nativeName}
                  </Text>
                  <Text style={[styles.languageEnglishName, { color: theme.textSecondary, fontSize: 12 }]}>
                    {item.name}
                  </Text>
                </View>
                {selectedLang?.code === item.code && (
                  <MaterialIcons name="check" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 30,
    paddingTop: Platform.OS === 'ios' ? 15 : 25,
    paddingBottom: 15,
    paddingRight: 100, // Make room for skip button
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 1000,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 20,
    minWidth: 60,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  welcomeLogo: {
    width: 100,
    height: 100,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  welcomeFeatures: {
    gap: 20,
  },
  welcomeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  welcomeFeatureText: {
    fontSize: 16,
    fontWeight: '500',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresList: {
    gap: 20,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  profileContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileScrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageHint: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
    minHeight: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 8,
    minHeight: 20,
  },
  inputHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    fontSize: 16,
    flex: 1,
  },
  countryPlaceholder: {
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  previewText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  successContainer: {
    alignItems: 'center',
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  successFeatures: {
    gap: 12,
  },
  successFeature: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
    backgroundColor: 'transparent',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  modalButton: {
    fontSize: 17,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
  },
  countryItemFlag: {
    fontSize: 28,
    marginRight: 15,
  },
  countryItemName: {
    fontSize: 16,
    flex: 1,
  },
  // Language Selection Styles
  languagesList: {
    gap: 16,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    minHeight: 70,
  },
  languageFlag: {
    fontSize: 28,
    width: 35,
  },
  languageInfo: {
    flex: 1,
    paddingRight: 8,
  },
  languageName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    lineHeight: 20,
  },
  languageEnglishName: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  moreLanguagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  moreLanguagesText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Smart Features Screen Styles
  smartContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  smartIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  smartTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  smartDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  smartFeaturesList: {
    width: '100%',
    marginBottom: 30,
  },
  smartFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 30,
  },
  smartFeatureText: {
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
  },
  smartNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 30,
    marginHorizontal: 20,
  },
  smartNoticeText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  smartAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 250,
  },
  smartAcceptText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  smartSkipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  smartSkipText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ProfessionalOnboarding;
