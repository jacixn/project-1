import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { saveData } from '../utils/localStorage';

const { width, height } = Dimensions.get('window');

const OnboardingFlow = ({ onComplete }) => {
  const { theme, isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // ✨ Enhanced Animation Values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(Array.from({ length: 6 }, () => new Animated.Value(0))).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Onboarding slides data
  const slides = [
    {
      id: 0,
      title: "Welcome to Your Spiritual Journey! 🙏",
      subtitle: "Let's set up your profile first",
      type: "profile_setup"
    },
    {
      id: 1,
      title: "Track Your Daily Tasks & Goals 📋",
      subtitle: "Earn points, level up, and build consistent habits with intelligent task scoring",
      icon: "task-alt",
      gradient: ['#4CAF50', '#81C784']
    },
    {
      id: 2,
      title: "Read & Explore Scripture 📖",
      subtitle: "Discover God's word with smart translation that makes verses easy to understand",
      icon: "menu-book",
      gradient: ['#2196F3', '#64B5F6']
    },
    {
      id: 3,
      title: "Chat with Friend 💬",
      subtitle: "Ask questions, get biblical wisdom, and receive encouraging guidance anytime",
      icon: "chat",
      gradient: ['#9C27B0', '#BA68C8']
    },
    {
      id: 4,
      title: "Prayer & Mindfulness 🕯️",
      subtitle: "Stay connected through prayer times, notifications, and spiritual reflection",
      icon: "favorite",
      gradient: ['#FF9800', '#FFB74D']
    }
  ];

  // Navigate to next step with smooth animation
  const nextStep = async () => {
    hapticFeedback.buttonPress();

    if (currentStep === 0) {
      // Validate profile setup
      if (!userName.trim()) {
        Alert.alert('Name Required', 'Please enter your name to continue.');
        return;
      }
      
      // Save user profile
      await saveUserProfile();
    }

    if (currentStep < slides.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(currentStep + 1);
        scrollViewRef.current?.scrollTo({ x: (currentStep + 1) * width, animated: false });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      completeOnboarding();
    }
  };

  // Skip entire onboarding
  const skipOnboarding = () => {
    hapticFeedback.buttonPress();
    Alert.alert(
      'Skip Welcome Tour?',
      'You can always access help from the Profile section later.',
      [
        { text: 'Continue Tour', style: 'cancel' },
        { 
          text: 'Skip', 
          style: 'default',
          onPress: () => completeOnboarding(true)
        }
      ]
    );
  };

  // Save user profile data
  const saveUserProfile = async () => {
    try {
      const profileData = {
        name: userName.trim(),
        profilePicture: profileImage,
        joinedDate: new Date().toISOString(),
        onboardingCompleted: false
      };
      
      await saveData('userProfile', profileData);
      console.log('✅ User profile saved:', profileData);
    } catch (error) {
      console.error('Failed to save user profile:', error);
    }
  };

  // Complete onboarding and mark as done
  const completeOnboarding = async (skipped = false) => {
    try {
      if (skipped && !userName.trim()) {
        // If skipped without setting up profile, use default
        await saveData('userProfile', {
          name: 'Friend',
          profilePicture: null,
          joinedDate: new Date().toISOString(),
          onboardingCompleted: true
        });
      } else {
        // Update existing profile to mark onboarding complete
        const existingProfile = await AsyncStorage.getItem('userProfile');
        const profile = existingProfile ? JSON.parse(existingProfile) : {};
        profile.onboardingCompleted = true;
        await saveData('userProfile', profile);
      }

      await AsyncStorage.setItem('onboardingCompleted', 'true');
      hapticFeedback.success();
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      onComplete();
    }
  };

  // Pick profile image
  const pickImage = async () => {
    hapticFeedback.buttonPress();
    
    Alert.alert(
      'Select Profile Picture',
      'Choose how you\'d like to add your photo',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Photo Library', onPress: () => openImagePicker() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      hapticFeedback.success();
    }
  };

  const openImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      hapticFeedback.success();
    }
  };

  // Profile Setup Screen
  const ProfileSetupScreen = () => (
    <KeyboardAvoidingView 
      style={[styles.slide, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={skipOnboarding} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip Tour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.profileSetupContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeHeader}>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>
            Welcome to Your Spiritual Journey! 🙏
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
            Let's set up your profile first
          </Text>
        </View>

        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <TouchableOpacity 
            onPress={pickImage}
            style={[styles.profilePictureContainer, { borderColor: theme.primary }]}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePicture} />
            ) : (
              <View style={[styles.profilePlaceholder, { backgroundColor: theme.surface }]}>
                <MaterialIcons name="add-a-photo" size={40} color={theme.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.profilePictureLabel, { color: theme.textSecondary }]}>
            Tap to add profile picture (optional)
          </Text>
        </View>

        {/* Name Input */}
        <View style={styles.nameSection}>
          <Text style={[styles.nameLabel, { color: theme.text }]}>What should we call you?</Text>
          <TextInput
            style={[styles.nameInput, { 
              backgroundColor: theme.surface, 
              color: theme.text,
              borderColor: theme.border 
            }]}
            placeholder="Enter your name"
            placeholderTextColor={theme.textSecondary}
            value={userName}
            onChangeText={setUserName}
            maxLength={30}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          onPress={nextStep}
          style={[styles.continueButton, { 
            backgroundColor: userName.trim() ? theme.primary : theme.surface,
            opacity: userName.trim() ? 1 : 0.6
          }]}
        >
          <Text style={[styles.continueButtonText, { 
            color: userName.trim() ? '#FFFFFF' : theme.textSecondary 
          }]}>
            Continue
          </Text>
          <MaterialIcons 
            name="arrow-forward" 
            size={20} 
            color={userName.trim() ? '#FFFFFF' : theme.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // Feature Introduction Slide
  const FeatureSlide = ({ slide }) => (
    <Animated.View 
      style={[styles.slide, { backgroundColor: theme.background, opacity: fadeAnim }]}
    >
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={skipOnboarding} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip Tour</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.featureContent}>
        <LinearGradient
          colors={slide.gradient}
          style={styles.featureIconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name={slide.icon} size={60} color="#FFFFFF" />
        </LinearGradient>

        <Text style={[styles.featureTitle, { color: theme.text }]}>
          {slide.title}
        </Text>
        
        <Text style={[styles.featureSubtitle, { color: theme.textSecondary }]}>
          {slide.subtitle}
        </Text>
      </View>

      <View style={styles.slideFooter}>
        {/* Progress Dots */}
        <View style={styles.progressDots}>
          {slides.slice(1).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: currentStep - 1 === index ? theme.primary : theme.surface,
                  borderColor: theme.border
                }
              ]}
            />
          ))}
        </View>

        <TouchableOpacity 
          onPress={nextStep}
          style={[styles.nextButton, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === slides.length - 1 ? "Get Started!" : "Next"}
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={styles.slideContainer}>
            {slide.type === 'profile_setup' ? (
              <ProfileSetupScreen />
            ) : (
              <FeatureSlide slide={slide} />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  slideContainer: {
    width: width,
    height: height,
  },
  slide: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  skipContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Profile Setup Styles
  profileSetupContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  nameSection: {
    marginBottom: 30,
  },
  nameLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  nameInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Feature Slide Styles
  featureContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  featureIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
  },
  featureSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  
  // Footer Styles
  buttonContainer: {
    paddingTop: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  slideFooter: {
    alignItems: 'center',
    gap: 24,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    minWidth: 140,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default OnboardingFlow;
