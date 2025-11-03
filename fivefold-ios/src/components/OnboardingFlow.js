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
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { saveData } from '../utils/localStorage';
import { bibleVersions } from '../data/bibleVersions';
import { countries } from '../data/countries';

const { width, height } = Dimensions.get('window');
console.log('OnboardingFlow init width:', width, 'height:', height);

// Separate stable component for Name/Country input to prevent focus loss
const NameCountryInput = React.memo(({ 
  userName, 
  setUserName, 
  userCountry, 
  setUserCountry,
  countrySearchQuery,
  setCountrySearchQuery,
  isCountrySearchFocused,
  setIsCountrySearchFocused,
  theme,
  fadeAnim,
  slideAnim,
  scaleAnim,
  nextStep,
  hapticFeedback
}) => {
  // Show all countries alphabetically
  const filteredCountries = countrySearchQuery.trim() 
    ? countries.filter(country =>
        country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
      )
    : countries;

  return (
    <View style={[styles.slide, { backgroundColor: theme.background }]}>
      {/* Animated Background Gradient */}
      <LinearGradient
        colors={[
          theme.primary + '12',
          theme.background,
          theme.background,
        ]}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Floating Particles in Background */}
      {[...Array(6)].map((_, i) => (
        <FloatingParticle key={`particle-setup-${i}`} delay={i * 500} />
      ))}

      <Animated.View
        style={[
          styles.setupSlideContent,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Premium Glass Header */}
        <View style={styles.glassHeaderContainer}>
          <LinearGradient
            colors={[
              theme.primary + '20',
              theme.primary + '12',
              theme.primary + '06',
            ]}
            style={styles.glassHeaderGradient}
          >
            {/* Animated Icon with Glow */}
            <View style={styles.glassWelcomeIconContainer}>
              <LinearGradient
                colors={[theme.primary, theme.primary + 'DD']}
                style={styles.glassIconGradient}
              >
                <View style={styles.glassIconShine} />
                <MaterialIcons name="waving-hand" size={40} color="#FFFFFF" />
              </LinearGradient>
              {/* Outer glow rings */}
              <View style={[styles.iconGlowRing, { borderColor: theme.primary + '25' }]} />
              <View style={[styles.iconGlowRing2, { borderColor: theme.primary + '12' }]} />
            </View>
            
            <Text style={[styles.glassWelcomeTitle, { color: theme.text }]}>
              Welcome to Biblely
            </Text>
          </LinearGradient>
        </View>

        <ScrollView 
          style={styles.setupFormContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.setupFormContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name Input - Premium Glass Design */}
          <View style={styles.glassInputSection}>
            <Text style={[styles.glassInputLabel, { color: theme.text }]}>
              What should we call you?
            </Text>
            <View style={styles.glassInputWrapper}>
              <LinearGradient
                colors={[
                  theme.primary + '20',
                  theme.primary + '15',
                ]}
                style={[
                  styles.glassInputContainer,
                  { 
                    borderColor: userName.trim() ? theme.primary + '60' : theme.primary + '30',
                  }
                ]}
              >
                {/* Glass reflection effect */}
                <View style={[styles.glassReflection, { backgroundColor: theme.primary + '12' }]} />
                
                {/* Icon with gradient background */}
                <View style={styles.glassInputIconWrapper}>
                  <LinearGradient
                    colors={[theme.primary + '40', theme.primary + '30']}
                    style={styles.glassInputIconGradient}
                  >
                    <MaterialIcons name="person-outline" size={24} color={theme.primary} />
                  </LinearGradient>
                </View>
                
                <TextInput
                  style={[styles.glassInput, { color: theme.text }]}
                  placeholder="Enter your name"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={userName}
                  onChangeText={setUserName}
                  maxLength={30}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  autoFocus={false}
                />
                
                <View style={styles.glassClearButtonWrapper}>
                  {userName.trim().length > 0 && (
                    <TouchableOpacity 
                      onPress={() => setUserName('')}
                      style={[styles.glassClearButton, { backgroundColor: theme.primary + '20' }]}
                    >
                      <MaterialIcons name="close" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Country Selection - Premium Glass Design */}
          <View style={styles.glassInputSection}>
            <Text style={[styles.glassInputLabel, { color: theme.text }]}>
              Where are you from?
            </Text>
            
            {/* Country Search with Glass Effect */}
            <View style={styles.glassInputWrapper}>
              <LinearGradient
                colors={[
                  theme.primary + '20',
                  theme.primary + '15',
                ]}
                style={[
                  styles.glassInputContainer,
                  { borderColor: theme.primary + '30' }
                ]}
              >
                {/* Glass reflection */}
                <View style={[styles.glassReflection, { backgroundColor: theme.primary + '12' }]} />
                
                {/* Search Icon */}
                <View style={styles.glassInputIconWrapper}>
                  <LinearGradient
                    colors={[theme.primary + '35', theme.primary + '25']}
                    style={styles.glassInputIconGradient}
                  >
                    <MaterialIcons name="search" size={22} color={theme.primary} />
                  </LinearGradient>
                </View>
                
                <TextInput
                  style={[styles.glassInput, { color: theme.text }]}
                  placeholder="Search countries..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={countrySearchQuery}
                  onChangeText={setCountrySearchQuery}
                  onFocus={() => setIsCountrySearchFocused(true)}
                  onBlur={() => {
                    // Delay blur to allow country selection
                    setTimeout(() => setIsCountrySearchFocused(false), 200);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                
                {countrySearchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setCountrySearchQuery('')}
                    style={styles.glassClearButtonWrapper}
                  >
                    <View style={[styles.glassClearButton, { backgroundColor: theme.textSecondary + '18' }]}>
                      <MaterialIcons name="close" size={18} color={theme.textSecondary} />
                    </View>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>

            {/* Selected Country Display - Glass Card */}
            {userCountry && (
              <Animated.View style={styles.glassSelectedCountryCard}>
                <LinearGradient
                  colors={[theme.primary + '35', theme.primary + '25']}
                  style={styles.glassSelectedCountryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.glassSelectedCountryReflection} />
                  <Text style={styles.glassSelectedCountryFlag}>{userCountry.flag}</Text>
                  <Text style={[styles.glassSelectedCountryName, { color: theme.text }]}>
                    {userCountry.name}
                  </Text>
                  <View style={[styles.glassSelectedCheckIcon, { backgroundColor: theme.primary }]}>
                    <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Country List - Only show when focused or searching */}
            {(isCountrySearchFocused || countrySearchQuery.trim()) && (
              <ScrollView 
                style={styles.glassCountryList} 
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {filteredCountries.slice(0, countrySearchQuery.trim() ? 50 : 50).map((country, index) => {
                const isSelected = userCountry?.code === country.code;
                return (
                  <TouchableOpacity
                    key={country.code}
                    onPress={() => {
                      setUserCountry(country);
                      setCountrySearchQuery('');
                      hapticFeedback.selection();
                    }}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={
                        isSelected
                          ? [theme.primary + '30', theme.primary + '20']
                          : [theme.primary + '12', theme.primary + '08']
                      }
                      style={[
                        styles.glassCountryItem,
                        { 
                          borderColor: isSelected ? theme.primary + '60' : theme.primary + '25',
                          marginBottom: index === filteredCountries.slice(0, countrySearchQuery.trim() ? 50 : 10).length - 1 ? 80 : 10,
                        }
                      ]}
                    >
                      {/* Glass reflection */}
                      <View style={[styles.glassCountryReflection, { backgroundColor: theme.primary + '08' }]} />
                      
                      {/* Flag Container with Glass Effect */}
                      <View style={[styles.glassCountryFlagContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={styles.glassCountryFlag}>{country.flag}</Text>
                      </View>
                      
                      <Text style={[styles.glassCountryName, { color: theme.text }]}>
                        {country.name}
                      </Text>
                      
                      {isSelected && (
                        <View style={[styles.glassCountryCheckIcon, { backgroundColor: theme.primary }]}>
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            )}
          </View>
        </ScrollView>

        {/* Floating Continue Button with Glass Effect */}
        <View style={styles.glassFloatingButtonContainer}>
          <TouchableOpacity 
            onPress={nextStep}
            disabled={!userName.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                userName.trim()
                  ? [theme.primary, theme.primary + 'EE']
                  : [theme.surface, theme.surface + 'DD']
              }
              style={[
                styles.glassContinueButton,
                { 
                  opacity: userName.trim() ? 1 : 0.6,
                  shadowColor: userName.trim() ? theme.primary : '#000',
                }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {/* Glass shine effect */}
              <View style={styles.glassContinueButtonShine} />
              
              <Text style={[styles.glassContinueButtonText, { 
                color: userName.trim() ? '#FFFFFF' : theme.textSecondary 
              }]}>
                Continue
              </Text>
              <MaterialIcons 
                name="arrow-forward" 
                size={24} 
                color={userName.trim() ? '#FFFFFF' : theme.textSecondary} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
});


// Floating Particle Component
const FloatingParticle = ({ delay = 0, duration = 3000 }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 1000,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1000,
              delay: duration - 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(translateY, {
            toValue: -Dimensions.get('window').height,
            duration,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 100,
            duration,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1000,
            delay,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
          opacity,
        },
      ]}
    />
  );
};

// Parallax Background Component
const ParallaxBackground = ({ scrollY, colors }) => {
  const screenHeight = Dimensions.get('window').height;
  const translateY = scrollY.interpolate({
    inputRange: [0, screenHeight],
    outputRange: [0, -screenHeight * 0.3],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.parallaxContainer, { transform: [{ translateY }] }]}>
      <LinearGradient
        colors={colors}
        style={styles.parallaxGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {[...Array(12)].map((_, i) => (
          <FloatingParticle
            key={i}
            delay={i * 400}
            duration={3000 + Math.random() * 2000}
          />
        ))}
      </LinearGradient>
    </Animated.View>
  );
};

const OnboardingFlow = ({ onComplete }) => {
  const { theme, isDark, changeTheme, toggleDarkMode, availableThemes, themes } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  
  // User data states
  const [userName, setUserName] = useState('');
  const [userCountry, setUserCountry] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Default to English
  const [selectedBibleVersion, setSelectedBibleVersion] = useState('niv');
  const [selectedTheme, setSelectedTheme] = useState('cresvia'); // Default dark theme
  const [selectedMode, setSelectedMode] = useState('dark'); // 'light' or 'dark'
  const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' or 'lbs'
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [isCountrySearchFocused, setIsCountrySearchFocused] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current;

  // Stable callback functions using useCallback
  const handleUserNameChange = React.useCallback((text) => {
    setUserName(text);
  }, []);

  const handleCountryChange = React.useCallback((country) => {
    setUserCountry(country);
  }, []);

  const handleCountrySearchChange = React.useCallback((text) => {
    setCountrySearchQuery(text);
  }, []);

  // Onboarding steps configuration
  const slides = [
    // Feature introduction slides (Steps 0-3)
    {
      id: 0,
      type: 'feature',
      title: 'Your Daily Tasks & Goals',
      subtitle: 'Smart task management with points, levels, and streak tracking. Build consistent habits that stick.',
      icon: 'task-alt',
      gradient: ['#4CAF50', '#81C784', '#66BB6A']
    },
    {
      id: 1,
      type: 'feature',
      title: '35+ Bible Translations',
      subtitle: 'Read Scripture in NIV, ESV, KJV, and 30+ more translations. Plus smart simplification makes any verse easy to understand.',
      icon: 'menu-book',
      gradient: ['#2196F3', '#64B5F6', '#42A5F5']
    },
    {
      id: 2,
      type: 'feature',
      title: 'Bible Studies & Deep Learning',
      subtitle: 'Explore thematic guides, character profiles, historical timelines, interactive maps, and key verses - all in one place.',
      icon: 'school',
      gradient: ['#FF9800', '#FFB74D', '#FFA726']
    },
    {
      id: 3,
      type: 'feature',
      title: 'Chat with Friend',
      subtitle: 'Get biblical wisdom, ask deep questions, and receive encouraging guidance powered by advanced understanding.',
      icon: 'chat',
      gradient: ['#9C27B0', '#BA68C8', '#AB47BC']
    },
    {
      id: 4,
      type: 'feature',
      title: 'Prayer Times & Reminders',
      subtitle: 'Never miss a prayer with smart notifications. Track your spiritual journey with daily verses and mindful reflection.',
      icon: 'favorite',
      gradient: ['#E91E63', '#F06292', '#EC407A']
    },
    {
      id: 5,
      type: 'feature',
      title: 'Fitness & Gym Tracking',
      subtitle: 'Log workouts, track progress, and build strength. Your complete health and wellness companion.',
      icon: 'fitness-center',
      gradient: ['#FF5722', '#FF7043', '#FF6434']
    },
    // Setup slides (Steps 6-10)
    {
      id: 6,
      type: 'name_country',
      title: 'Welcome to Biblely',
      subtitle: 'Let us get to know you better'
    },
    {
      id: 7,
      type: 'language_selection',
      title: 'Choose Your Language',
      subtitle: 'Select your preferred app language'
    },
    {
      id: 8,
      type: 'weight_unit_selection',
      title: 'Weight Unit Preference',
      subtitle: 'Choose your preferred unit for gym tracking'
    },
    {
      id: 9,
      type: 'profile_picture',
      title: 'Add Your Photo',
      subtitle: 'Personalize your profile with a picture'
    },
    {
      id: 10,
      type: 'bible_version',
      title: 'Choose Your Bible Version',
      subtitle: 'Select the translation you prefer'
    },
    {
      id: 11,
      type: 'theme_selection',
      title: 'Customize Your Experience',
      subtitle: 'Choose a theme that inspires you'
    }
  ];

  // Trigger entry animation on step change
  useEffect(() => {
    console.log('🎬 Animation effect triggered for step:', currentStep);
    
    // Reset animation values first
    slideAnim.setValue(50);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    
    // Then animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log('✅ Animation completed for step:', currentStep);
    });
  }, [currentStep]);

  // Navigate to next step
  const nextStep = async () => {
    hapticFeedback.buttonPress();

    // Validation for each step (now with 6 feature slides + weight unit)
    if (currentStep === 6) {
      // Name validation only (country is optional)
      if (!userName.trim()) {
        Alert.alert('Name Required', 'Please enter your name to continue.');
        return;
      }
    }

    if (currentStep === 10) {
      // Bible version validation
      if (!selectedBibleVersion) {
        Alert.alert('Bible Version Required', 'Please select a Bible version to continue.');
        return;
      }
    }

    if (currentStep === 11) {
      // Theme selection validation
      if (!selectedTheme) {
        Alert.alert('Theme Required', 'Please select a theme to continue.');
        return;
      }
    }

    if (currentStep < slides.length - 1) {
      // Animate out
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
      ]).start(() => {
        setCurrentStep(currentStep + 1);
      });
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  // Skip specific step
  const skipStep = () => {
    hapticFeedback.buttonPress();
    const slide = slides[currentStep];

    // Only profile picture can be skipped
    if (slide.type === 'profile_picture') {
      setProfileImage(null);
      nextStep();
    }
  };

  // Skip entire onboarding
  const skipOnboarding = () => {
    hapticFeedback.buttonPress();
    Alert.alert(
      'Skip Welcome Tour',
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

  // Complete onboarding and save data
  const completeOnboarding = async (skipped = false) => {
    try {
      if (!skipped) {
        // Save user profile
      const profileData = {
          name: userName.trim() || 'Friend',
          country: userCountry?.name || null,
          countryCode: userCountry?.code || null,
          countryFlag: userCountry?.flag || null,
        profilePicture: profileImage,
          language: selectedLanguage || 'en',
          bibleVersion: selectedBibleVersion,
          theme: selectedTheme,
          mode: selectedMode,
          weightUnit: weightUnit || 'kg', // Save gym weight preference
        joinedDate: new Date().toISOString(),
          onboardingCompleted: true
      };
      
      // Use AsyncStorage directly instead of saveData wrapper
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
        
        // Save Bible version
        await AsyncStorage.setItem('selectedBibleVersion', selectedBibleVersion);
        
        // Save language preference
        await AsyncStorage.setItem('selectedLanguage', selectedLanguage);
        
        // Save weight unit preference
        await AsyncStorage.setItem('weightUnit', weightUnit || 'kg');
        
        // Apply theme and mode
        await changeTheme(selectedTheme);
        if (selectedMode === 'dark' && !isDark) {
          await toggleDarkMode();
        } else if (selectedMode === 'light' && isDark) {
          await toggleDarkMode();
        }
        
        console.log('✅ Onboarding completed with data:', profileData);
      } else {
        // Skipped - save defaults with Eterna theme
        const defaultProfile = {
          name: 'Friend',
          country: null,
          countryCode: null,
          countryFlag: null,
          profilePicture: null,
          language: 'en',
          bibleVersion: 'niv',
          theme: 'eterna',
          mode: 'light',
          weightUnit: 'kg',
          joinedDate: new Date().toISOString(),
          onboardingCompleted: true
        };
        await AsyncStorage.setItem('userProfile', JSON.stringify(defaultProfile));
        await AsyncStorage.setItem('selectedBibleVersion', 'niv');
        await AsyncStorage.setItem('selectedLanguage', 'en');
        await AsyncStorage.setItem('weightUnit', 'kg');
        
        await changeTheme('eterna');
        if (isDark) {
          await toggleDarkMode(); // Switch to light mode
        }
      }

      await AsyncStorage.setItem('onboardingCompleted', 'true');
      
      // Request notification permissions at the end of onboarding
      await requestNotificationPermissions();
      
      hapticFeedback.success();
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      onComplete();
    }
  };

  // Request notification permissions
  const requestNotificationPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        
        if (status === 'granted') {
          console.log('Notification permissions granted');
        } else {
          console.log('Notification permissions denied');
        }
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  };

  // Image picker functions
  const pickImage = async () => {
    hapticFeedback.buttonPress();
    
    Alert.alert(
      'Select Profile Picture',
      'Choose how you would like to add your photo',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Photo Library', onPress: () => openImagePicker() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Biblely needs camera access to take photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

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
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const openImagePicker = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Biblely needs photo library access to select images. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

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
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  // Feature Slide Component
  const FeatureSlide = ({ slide }) => (
    <Animated.View 
      style={[
        styles.slide, 
        { 
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <ParallaxBackground scrollY={scrollY} colors={slide.gradient} />
      
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={skipOnboarding} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip Tour</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.featureContent}>
        <Animated.View
          style={[
            styles.featureIconContainer,
            {
              transform: [
                { 
                  scale: scaleAnim.interpolate({
                    inputRange: [0.9, 1],
                    outputRange: [0.8, 1],
                  })
                }
              ]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.90)', 'rgba(255,255,255,0.85)']}
            style={styles.featureIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Glass shine effect */}
            <View style={styles.glassShine} />
            <MaterialIcons name={slide.icon} size={80} color={slide.gradient[0]} />
          </LinearGradient>
          {/* Outer glow */}
          <View style={[styles.iconOuterGlow, { shadowColor: slide.gradient[1] }]} />
        </Animated.View>

        <View style={styles.featureTitleContainer}>
          <Text style={styles.featureTitle}>
            {slide.title}
          </Text>
          {/* Premium badge */}
          {currentStep < 2 && (
            <View style={styles.premiumBadge}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.premiumBadgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="stars" size={14} color="#FFFFFF" />
                <Text style={styles.premiumBadgeText}>NEW</Text>
              </LinearGradient>
            </View>
          )}
        </View>
        
        <Text style={styles.featureSubtitle}>
          {slide.subtitle}
          </Text>
        </View>

      <View style={styles.slideFooter}>
        <View style={styles.progressDots}>
          {slides.slice(0, 6).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: currentStep === index ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                  width: currentStep === index ? 24 : 8,
                }
              ]}
            />
          ))}
        </View>

          <TouchableOpacity 
          onPress={nextStep}
          style={styles.nextButton}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
            style={styles.nextButtonGradient}
          >
            <Text style={[styles.nextButtonText, { color: slide.gradient[0] }]}>
              {currentStep === 3 ? "Let's Start" : "Next"}
            </Text>
            <MaterialIcons name="arrow-forward" size={24} color={slide.gradient[0]} />
          </LinearGradient>
          </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Language Selection Slide
  const LanguageSelectionSlide = () => {
    const languages = [
      { id: 'en', name: 'English', nativeName: 'English', available: true, flag: '🇺🇸' },
      { id: 'es', name: 'Spanish', nativeName: 'Español', available: false, flag: '🇪🇸' },
      { id: 'fr', name: 'French', nativeName: 'Français', available: false, flag: '🇫🇷' },
      { id: 'de', name: 'German', nativeName: 'Deutsch', available: false, flag: '🇩🇪' },
      { id: 'pt', name: 'Portuguese', nativeName: 'Português', available: false, flag: '🇵🇹' },
      { id: 'zh', name: 'Chinese', nativeName: '中文', available: false, flag: '🇨🇳' },
      { id: 'ar', name: 'Arabic', nativeName: 'العربية', available: false, flag: '🇸🇦' },
      { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी', available: false, flag: '🇮🇳' },
      { id: 'tw', name: 'Twi', nativeName: 'Twi', available: false, flag: '🇬🇭' },
    ];

    return (
      <Animated.View 
        style={[
          styles.slide, 
          { 
            backgroundColor: theme.background,
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <View style={styles.setupHeader}>
          <Text style={[styles.setupTitle, { color: theme.text }]}>
            Choose Your Language
          </Text>
          <Text style={[styles.setupSubtitle, { color: theme.textSecondary }]}>
            Select your preferred app language
          </Text>
        </View>

        <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
          {languages.map((language) => {
            const isSelected = selectedLanguage === language.id;
            return (
              <TouchableOpacity
                key={language.id}
                onPress={() => {
                  if (language.available) {
                    setSelectedLanguage(language.id);
                    hapticFeedback.selection();
                  }
                }}
                disabled={!language.available}
                style={[
                  styles.languageItem,
                  {
                    backgroundColor: isSelected ? theme.primary + '20' : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                    opacity: language.available ? 1 : 0.6,
                  }
                ]}
              >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageName, { color: theme.text }]}>
                    {language.name}
                  </Text>
                  <Text style={[styles.languageNative, { color: theme.textSecondary }]}>
                    {language.nativeName}
                  </Text>
                </View>
                {!language.available && (
                  <View style={[styles.comingSoonBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '40' }]}>
                    <Text style={[styles.comingSoonText, { color: theme.primary }]}>
                      Coming Soon
                    </Text>
                  </View>
                )}
                {isSelected && language.available && (
                  <MaterialIcons name="check-circle" size={28} color={theme.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Floating Continue Button */}
        <View style={styles.glassFloatingButtonContainer}>
          <TouchableOpacity 
            onPress={nextStep}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.primary, theme.primary + 'EE']}
              style={[
                styles.glassContinueButton,
                { shadowColor: theme.primary }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.glassContinueButtonShine} />
              <Text style={styles.glassContinueButtonText}>
                Continue
              </Text>
              <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Weight Unit Selection Slide
  const WeightUnitSelectionSlide = () => (
    <Animated.View 
      style={[
        styles.slide, 
        { 
          backgroundColor: theme.background,
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.setupHeader}>
        <Text style={[styles.setupTitle, { color: theme.text }]}>
          Weight Unit Preference
        </Text>
        <Text style={[styles.setupSubtitle, { color: theme.textSecondary }]}>
          Choose your preferred unit for gym tracking
        </Text>
      </View>

      <View style={styles.weightUnitContainer}>
        {/* KG Option */}
        <TouchableOpacity
          style={[
            styles.weightUnitCard,
            {
              backgroundColor: weightUnit === 'kg' ? theme.primary : theme.surface,
              borderColor: weightUnit === 'kg' ? theme.primary : theme.border,
              borderWidth: weightUnit === 'kg' ? 3 : 2,
            }
          ]}
          onPress={() => {
            setWeightUnit('kg');
            hapticFeedback.selection();
          }}
        >
          <LinearGradient
            colors={weightUnit === 'kg' ? [theme.primary, theme.primaryDark] : ['transparent', 'transparent']}
            style={styles.weightUnitGradient}
          >
            <View style={[styles.weightUnitIconContainer, { 
              backgroundColor: weightUnit === 'kg' ? 'rgba(255,255,255,0.3)' : theme.primary + '20' 
            }]}>
              <Text style={[styles.weightUnitIcon, { 
                color: weightUnit === 'kg' ? '#FFFFFF' : theme.primary 
              }]}>
                KG
              </Text>
            </View>
            <Text style={[styles.weightUnitTitle, { 
              color: weightUnit === 'kg' ? '#FFFFFF' : theme.text 
            }]}>
              Kilograms
            </Text>
            <Text style={[styles.weightUnitDescription, { 
              color: weightUnit === 'kg' ? 'rgba(255,255,255,0.9)' : theme.textSecondary 
            }]}>
              Metric system (kg)
            </Text>
            {weightUnit === 'kg' && (
              <View style={styles.weightUnitCheckIcon}>
                <MaterialIcons name="check-circle" size={32} color="#FFFFFF" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* LBS Option */}
        <TouchableOpacity
          style={[
            styles.weightUnitCard,
            {
              backgroundColor: weightUnit === 'lbs' ? theme.primary : theme.surface,
              borderColor: weightUnit === 'lbs' ? theme.primary : theme.border,
              borderWidth: weightUnit === 'lbs' ? 3 : 2,
            }
          ]}
          onPress={() => {
            setWeightUnit('lbs');
            hapticFeedback.selection();
          }}
        >
          <LinearGradient
            colors={weightUnit === 'lbs' ? [theme.primary, theme.primaryDark] : ['transparent', 'transparent']}
            style={styles.weightUnitGradient}
          >
            <View style={[styles.weightUnitIconContainer, { 
              backgroundColor: weightUnit === 'lbs' ? 'rgba(255,255,255,0.3)' : theme.primary + '20' 
            }]}>
              <Text style={[styles.weightUnitIcon, { 
                color: weightUnit === 'lbs' ? '#FFFFFF' : theme.primary 
              }]}>
                LBS
              </Text>
            </View>
            <Text style={[styles.weightUnitTitle, { 
              color: weightUnit === 'lbs' ? '#FFFFFF' : theme.text 
            }]}>
              Pounds
            </Text>
            <Text style={[styles.weightUnitDescription, { 
              color: weightUnit === 'lbs' ? 'rgba(255,255,255,0.9)' : theme.textSecondary 
            }]}>
              Imperial system (lbs)
            </Text>
            {weightUnit === 'lbs' && (
              <View style={styles.weightUnitCheckIcon}>
                <MaterialIcons name="check-circle" size={32} color="#FFFFFF" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Floating Continue Button */}
      <View style={styles.glassFloatingButtonContainer}>
        <TouchableOpacity 
          onPress={nextStep}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.primary + 'EE']}
            style={[
              styles.glassContinueButton,
              { shadowColor: theme.primary }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.glassContinueButtonShine} />
            <Text style={styles.glassContinueButtonText}>
              Continue
            </Text>
            <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Profile Picture Slide
  const ProfilePictureSlide = () => (
    <Animated.View 
      style={[
        styles.slide, 
        { 
          backgroundColor: theme.background,
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.setupHeader}>
        <Text style={[styles.setupTitle, { color: theme.text }]}>
          Add Your Photo
        </Text>
        <Text style={[styles.setupSubtitle, { color: theme.textSecondary }]}>
          Personalize your profile with a picture
        </Text>
      </View>

      <View style={styles.profilePictureContent}>
          <TouchableOpacity 
            onPress={pickImage}
            style={[styles.profilePictureContainer, { borderColor: theme.primary }]}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profilePicture} />
            ) : (
              <View style={[styles.profilePlaceholder, { backgroundColor: theme.surface }]}>
              <MaterialIcons name="add-a-photo" size={50} color={theme.textSecondary} />
              <Text style={[styles.profilePlaceholderText, { color: theme.textSecondary }]}>
                Tap to add photo
              </Text>
              </View>
            )}
          </TouchableOpacity>
      </View>

      {/* Floating Buttons */}
      <View style={styles.glassFloatingButtonContainer}>
        <TouchableOpacity 
          onPress={skipStep}
          style={[styles.skipStepButton, { borderColor: theme.border, marginBottom: 12 }]}
        >
          <Text style={[styles.skipStepButtonText, { color: theme.textSecondary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={nextStep}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.primary + 'EE']}
            style={[
              styles.glassContinueButton,
              { shadowColor: theme.primary }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.glassContinueButtonShine} />
            <Text style={styles.glassContinueButtonText}>
              Continue
            </Text>
            <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
        </View>
    </Animated.View>
  );

  // Bible Version Slide
  const BibleVersionSlide = () => {
    const popularVersions = bibleVersions.filter(v => 
      ['niv', 'esv', 'kjv', 'nlt'].includes(v.id)
    );
    const otherVersions = bibleVersions.filter(v => 
      !['niv', 'esv', 'kjv', 'nlt'].includes(v.id)
    );

    return (
      <Animated.View 
        style={[
          styles.slide, 
          { 
            backgroundColor: theme.background,
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <View style={styles.setupHeader}>
          <Text style={[styles.setupTitle, { color: theme.text }]}>
            Choose Your Bible Version
          </Text>
          <Text style={[styles.setupSubtitle, { color: theme.textSecondary }]}>
            Select the translation you prefer
        </Text>
      </View>

        <ScrollView style={styles.versionList} showsVerticalScrollIndicator={false}>
          {/* Popular Versions */}
          <Text style={[styles.versionCategoryLabel, { color: theme.text }]}>
            Popular Versions
          </Text>
          {popularVersions.map((version) => (
            <TouchableOpacity
              key={version.id}
              style={[
                styles.versionItem,
                {
                  backgroundColor: selectedBibleVersion === version.id ? theme.primary + '20' : theme.surface,
                  borderColor: selectedBibleVersion === version.id ? theme.primary : theme.border,
                  borderWidth: selectedBibleVersion === version.id ? 2 : 1,
                }
              ]}
              onPress={() => {
                setSelectedBibleVersion(version.id);
                hapticFeedback.selection();
              }}
            >
              <View style={styles.versionInfo}>
                <Text style={[styles.versionName, { color: theme.text }]}>
                  {version.name}
                </Text>
                <Text style={[styles.versionAbbr, { color: theme.textSecondary }]}>
                  {version.abbreviation}
                </Text>
                <Text style={[styles.versionDescription, { color: theme.textSecondary }]}>
                  {version.description}
                </Text>
              </View>
              {selectedBibleVersion === version.id && (
                <MaterialIcons name="check-circle" size={28} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}

          {/* Show All Versions Toggle */}
          <TouchableOpacity
            style={[styles.showAllButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {
              setShowAllVersions(!showAllVersions);
              hapticFeedback.buttonPress();
            }}
          >
            <Text style={[styles.showAllButtonText, { color: theme.primary }]}>
              {showAllVersions ? 'Show Less' : 'Show All Versions'}
            </Text>
            <MaterialIcons 
              name={showAllVersions ? 'expand-less' : 'expand-more'} 
              size={24} 
              color={theme.primary} 
            />
          </TouchableOpacity>

          {/* All Other Versions */}
          {showAllVersions && (
            <>
              <Text style={[styles.versionCategoryLabel, { color: theme.text }]}>
                All Versions
              </Text>
              {otherVersions.map((version) => (
                <TouchableOpacity
                  key={version.id}
                  style={[
                    styles.versionItem,
                    {
                      backgroundColor: selectedBibleVersion === version.id ? theme.primary + '20' : theme.surface,
                      borderColor: selectedBibleVersion === version.id ? theme.primary : theme.border,
                      borderWidth: selectedBibleVersion === version.id ? 2 : 1,
                    }
                  ]}
                  onPress={() => {
                    setSelectedBibleVersion(version.id);
                    hapticFeedback.selection();
                  }}
                >
                  <View style={styles.versionInfo}>
                    <Text style={[styles.versionName, { color: theme.text }]}>
                      {version.name}
                    </Text>
                    <Text style={[styles.versionAbbr, { color: theme.textSecondary }]}>
                      {version.abbreviation} • {version.category}
                    </Text>
                    <Text style={[styles.versionDescription, { color: theme.textSecondary }]}>
                      {version.description}
                    </Text>
        </View>
                  {selectedBibleVersion === version.id && (
                    <MaterialIcons name="check-circle" size={28} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}
      </ScrollView>

        {/* Floating Continue Button */}
        <View style={styles.glassFloatingButtonContainer}>
        <TouchableOpacity 
          onPress={nextStep}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.primary, theme.primary + 'EE']}
              style={[
                styles.glassContinueButton,
                { shadowColor: theme.primary }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.glassContinueButtonShine} />
              <Text style={styles.glassContinueButtonText}>
                Continue
              </Text>
              <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
    </Animated.View>
  );
  };

  // Gym Preferences Slide
  const GymPreferencesSlide = () => (
    <Animated.View 
      style={[
        styles.slide, 
        { 
          backgroundColor: theme.background,
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.setupHeader}>
        <LinearGradient
          colors={[theme.primary + '30', theme.primary + '15', 'transparent']}
          style={styles.gymHeaderGradient}
        >
          <View style={[styles.gymIconContainer, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="fitness-center" size={48} color="#FFFFFF" />
          </View>
          <Text style={[styles.setupTitle, { color: theme.text }]}>
            Fitness Tracking Setup
          </Text>
          <Text style={[styles.setupSubtitle, { color: theme.textSecondary }]}>
            Choose your preferred weight unit for gym tracking
          </Text>
        </LinearGradient>
      </View>

      <ScrollView style={styles.gymPreferencesList} showsVerticalScrollIndicator={false}>
        {/* Weight Unit Selection */}
        <View style={styles.gymSectionContainer}>
          <Text style={[styles.gymSectionLabel, { color: theme.text }]}>
            Weight Unit Preference
          </Text>
          <Text style={[styles.gymSectionDescription, { color: theme.textSecondary }]}>
            Select your preferred unit for tracking weights in your gym workouts
          </Text>

          <View style={styles.weightUnitContainer}>
            {/* KG Option */}
            <TouchableOpacity
              style={[
                styles.weightUnitCard,
                {
                  backgroundColor: weightUnit === 'kg' ? theme.primary : theme.surface,
                  borderColor: weightUnit === 'kg' ? theme.primary : theme.border,
                  borderWidth: weightUnit === 'kg' ? 3 : 2,
                }
              ]}
              onPress={() => {
                setWeightUnit('kg');
                hapticFeedback.selection();
              }}
            >
              <LinearGradient
                colors={weightUnit === 'kg' ? [theme.primary, theme.primaryDark] : ['transparent', 'transparent']}
                style={styles.weightUnitGradient}
              >
                <View style={[styles.weightUnitIconContainer, { 
                  backgroundColor: weightUnit === 'kg' ? 'rgba(255,255,255,0.3)' : theme.primary + '20' 
                }]}>
                  <Text style={[styles.weightUnitIcon, { 
                    color: weightUnit === 'kg' ? '#FFFFFF' : theme.primary 
                  }]}>
                    KG
                  </Text>
                </View>
                <Text style={[styles.weightUnitTitle, { 
                  color: weightUnit === 'kg' ? '#FFFFFF' : theme.text 
                }]}>
                  Kilograms
                </Text>
                <Text style={[styles.weightUnitDescription, { 
                  color: weightUnit === 'kg' ? 'rgba(255,255,255,0.9)' : theme.textSecondary 
                }]}>
                  Metric system (kg)
                </Text>
                {weightUnit === 'kg' && (
                  <View style={styles.weightUnitCheckIcon}>
                    <MaterialIcons name="check-circle" size={32} color="#FFFFFF" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* LBS Option */}
            <TouchableOpacity
              style={[
                styles.weightUnitCard,
                {
                  backgroundColor: weightUnit === 'lbs' ? theme.primary : theme.surface,
                  borderColor: weightUnit === 'lbs' ? theme.primary : theme.border,
                  borderWidth: weightUnit === 'lbs' ? 3 : 2,
                }
              ]}
              onPress={() => {
                setWeightUnit('lbs');
                hapticFeedback.selection();
              }}
            >
              <LinearGradient
                colors={weightUnit === 'lbs' ? [theme.primary, theme.primaryDark] : ['transparent', 'transparent']}
                style={styles.weightUnitGradient}
              >
                <View style={[styles.weightUnitIconContainer, { 
                  backgroundColor: weightUnit === 'lbs' ? 'rgba(255,255,255,0.3)' : theme.primary + '20' 
                }]}>
                  <Text style={[styles.weightUnitIcon, { 
                    color: weightUnit === 'lbs' ? '#FFFFFF' : theme.primary 
                  }]}>
                    LBS
                  </Text>
                </View>
                <Text style={[styles.weightUnitTitle, { 
                  color: weightUnit === 'lbs' ? '#FFFFFF' : theme.text 
                }]}>
                  Pounds
                </Text>
                <Text style={[styles.weightUnitDescription, { 
                  color: weightUnit === 'lbs' ? 'rgba(255,255,255,0.9)' : theme.textSecondary 
                }]}>
                  Imperial system (lbs)
                </Text>
                {weightUnit === 'lbs' && (
                  <View style={styles.weightUnitCheckIcon}>
                    <MaterialIcons name="check-circle" size={32} color="#FFFFFF" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <View style={[styles.gymInfoCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
            <MaterialIcons name="info" size={24} color={theme.primary} />
            <View style={styles.gymInfoTextContainer}>
              <Text style={[styles.gymInfoTitle, { color: theme.text }]}>
                Track Your Fitness Journey
              </Text>
              <Text style={[styles.gymInfoDescription, { color: theme.textSecondary }]}>
                Log your workouts, track progress, and build strength with our integrated gym tracker
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          onPress={nextStep}
          style={[styles.continueButton, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Theme Selection Slide
  const ThemeSelectionSlide = () => (
    <Animated.View 
      style={[
        styles.slide, 
        { 
          backgroundColor: theme.background,
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      <View style={styles.setupHeader}>
        <Text style={[styles.setupTitle, { color: theme.text }]}>
          Customize Your Experience
        </Text>
        <Text style={[styles.setupSubtitle, { color: theme.textSecondary }]}>
          Choose a theme that inspires you
        </Text>
      </View>

      <ScrollView style={styles.themeList} showsVerticalScrollIndicator={false}>
        {/* Dark/Light Mode Toggle */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.modeToggleButton,
              {
                backgroundColor: selectedMode === 'light' ? theme.primary : theme.surface,
                borderColor: theme.border,
              }
            ]}
            onPress={() => {
              setSelectedMode('light');
              // Reset to first light theme when switching to light mode
              setSelectedTheme('blush-bloom');
              hapticFeedback.selection();
            }}
          >
            <MaterialIcons 
              name="light-mode" 
              size={28} 
              color={selectedMode === 'light' ? '#FFFFFF' : theme.textSecondary} 
            />
            <Text style={[
              styles.modeToggleText,
              { color: selectedMode === 'light' ? '#FFFFFF' : '#1a1a2e' }
            ]}>
              Light Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeToggleButton,
              {
                backgroundColor: selectedMode === 'dark' ? theme.primary : theme.surface,
                borderColor: theme.border,
              }
            ]}
            onPress={() => {
              setSelectedMode('dark');
              // Reset to first dark theme when switching to dark mode
              setSelectedTheme('cresvia');
              hapticFeedback.selection();
            }}
          >
            <MaterialIcons 
              name="dark-mode" 
              size={28} 
              color={selectedMode === 'dark' ? '#FFFFFF' : theme.textSecondary} 
            />
            <Text style={[
              styles.modeToggleText,
              { color: selectedMode === 'dark' ? '#FFFFFF' : '#1a1a2e' }
            ]}>
              Dark Mode
            </Text>
        </TouchableOpacity>
      </View>

        {/* Theme Cards */}
        <Text style={[styles.themeCategoryLabel, { color: '#1a1a2e' }]}>
          Select Theme
        </Text>
        
        <View style={styles.themeCardsContainer}>
          {availableThemes
            .filter((themeOption) => {
              // Filter themes based on selected mode
              const lightOnlyThemes = ['blush-bloom', 'eterna', 'faith', 'sailormoon'];
              const darkOnlyThemes = ['cresvia', 'spiderman'];
              
              if (selectedMode === 'light') {
                return lightOnlyThemes.includes(themeOption.id);
              } else {
                return darkOnlyThemes.includes(themeOption.id);
              }
            })
            .map((themeOption) => {
            const themeData = themeOption.theme[selectedMode] || themeOption.theme;
            const isSelected = selectedTheme === themeOption.id;

  return (
              <TouchableOpacity
                key={themeOption.id}
                style={[
                  styles.themeCard,
                  {
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 3 : 1,
                  }
                ]}
                onPress={() => {
                  setSelectedTheme(themeOption.id);
                  hapticFeedback.selection();
                }}
              >
        <LinearGradient
                  colors={themeData.gradient || [themeData.primary, themeData.primaryLight]}
                  style={styles.themeCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
                  <View style={[styles.themeCardOverlay, { backgroundColor: themeData.background + '80' }]}>
                    <View style={styles.themeCardColors}>
                      <View style={[styles.themeColorDot, { backgroundColor: themeData.primary }]} />
                      <View style={[styles.themeColorDot, { backgroundColor: themeData.primaryLight }]} />
                      <View style={[styles.themeColorDot, { backgroundColor: themeData.success }]} />
                    </View>
                  </View>
        </LinearGradient>

                <View style={[styles.themeCardInfo, { backgroundColor: themeData.surface }]}>
                  <Text style={[styles.themeCardName, { color: themeData.text }]}>
                    {themeOption.name}
        </Text>
                  {isSelected && (
                    <MaterialIcons name="check-circle" size={24} color={theme.primary} />
            )}
          </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Get Started Button */}
      <View style={styles.glassFloatingButtonContainer}>
        <TouchableOpacity 
          onPress={nextStep}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.primary, theme.primary + 'EE']}
            style={[
              styles.glassContinueButton,
              { shadowColor: theme.primary }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.glassContinueButtonShine} />
            <Text style={styles.glassContinueButtonText}>
              Get Started
        </Text>
            <MaterialIcons name="check" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // Render appropriate slide based on type
  const renderSlide = (slide) => {
    console.log('🎯 Rendering slide:', slide.type, 'Step:', currentStep);
    
    try {
      switch (slide.type) {
        case 'feature':
          return <FeatureSlide slide={slide} />;
        case 'name_country':
          return (
            <NameCountryInput
              userName={userName}
              setUserName={handleUserNameChange}
              userCountry={userCountry}
              setUserCountry={handleCountryChange}
              countrySearchQuery={countrySearchQuery}
              setCountrySearchQuery={handleCountrySearchChange}
              isCountrySearchFocused={isCountrySearchFocused}
              setIsCountrySearchFocused={setIsCountrySearchFocused}
              theme={theme}
              fadeAnim={fadeAnim}
              slideAnim={slideAnim}
              scaleAnim={scaleAnim}
              nextStep={nextStep}
              hapticFeedback={hapticFeedback}
            />
          );
        case 'language_selection':
          return <LanguageSelectionSlide />;
        case 'weight_unit_selection':
          return <WeightUnitSelectionSlide />;
        case 'profile_picture':
          return <ProfilePictureSlide />;
        case 'bible_version':
          return <BibleVersionSlide />;
        case 'theme_selection':
          return <ThemeSelectionSlide />;
        default:
          console.log('❌ Unknown slide type:', slide.type);
          return null;
      }
    } catch (error) {
      console.error('❌ Error rendering slide:', error);
      return (
        <View style={[styles.slide, { backgroundColor: theme.background }]}>
          <Text style={{ color: theme.text }}>Error loading slide: {error.message}</Text>
        </View>
      );
    }
  };

  // Render name/country slide directly without creating new component
  const renderNameCountrySlide = () => {
    // Popular countries to show first
    const popularCountryCodes = ['US', 'GB', 'CA', 'AU', 'NG', 'KE', 'GH', 'ZA', 'IN', 'PH'];
    const popularCountries = countries.filter(c => popularCountryCodes.includes(c.code));
    const otherCountries = countries.filter(c => !popularCountryCodes.includes(c.code));
    
    const filteredCountries = countrySearchQuery.trim() 
      ? countries.filter(country =>
          country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
        )
      : [...popularCountries, ...otherCountries];

    return (
      <View style={[styles.slide, { backgroundColor: theme.background }]}>
        <Animated.View
              style={[
            styles.setupSlideContent,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Beautiful Header with Gradient */}
          <LinearGradient
            colors={[theme.primary + '20', theme.primary + '05', 'transparent']}
            style={styles.setupHeaderGradient}
          >
            <View style={styles.setupHeader}>
              <Text style={[styles.setupTitle, { color: theme.text }]}>
                Welcome to Biblely
              </Text>
              <Text style={[styles.setupSubtitle, { color: theme.textSecondary }]}>
                Let us get to know you better
              </Text>
            </View>
          </LinearGradient>

          <ScrollView 
            style={styles.setupFormContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.setupFormContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name Input with Beautiful Design */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                What should we call you?
              </Text>
              <View style={[
                styles.inputContainerEnhanced, 
                { 
                  backgroundColor: theme.surface, 
                  borderColor: userName.trim() ? theme.primary : theme.border,
                  shadowColor: userName.trim() ? theme.primary : 'transparent',
                }
              ]}>
                <View style={[styles.inputIconContainer, { backgroundColor: theme.primary + '20' }]}>
                  <MaterialIcons name="person" size={24} color={theme.primary} />
                </View>
                <TextInput
                  key="name-input"
                  style={[styles.inputEnhanced, { color: theme.text }]}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.textSecondary}
                  value={userName}
                  onChangeText={setUserName}
                  maxLength={30}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  autoFocus={false}
                  blurOnSubmit={false}
                />
                <TouchableOpacity 
                  onPress={() => setUserName('')} 
                  style={[
                    styles.clearButton,
                    { opacity: userName.trim().length > 0 ? 1 : 0 }
                  ]}
                  activeOpacity={userName.trim().length > 0 ? 0.7 : 1}
                  disabled={userName.trim().length === 0}
                >
                  <MaterialIcons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Country Selection with Beautiful Design */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Where are you from?
              </Text>
              
              {/* Country Search */}
              <View style={[
                styles.countrySearchContainerEnhanced, 
                { 
                  backgroundColor: theme.surface, 
                  borderColor: theme.border,
                  marginBottom: 16,
                }
              ]}>
                <MaterialIcons name="search" size={22} color={theme.textSecondary} />
                <TextInput
                  style={[styles.countrySearchInputEnhanced, { color: theme.text }]}
                  placeholder="Search countries..."
                  placeholderTextColor={theme.textSecondary}
                  value={countrySearchQuery}
                  onChangeText={setCountrySearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Selected Country Display */}
              {userCountry && (
                <View style={[
                  styles.selectedCountryCard,
                  { 
                    backgroundColor: theme.primary + '15',
                    borderColor: theme.primary,
                  }
                ]}>
                  <Text style={styles.selectedCountryFlag}>{userCountry.flag}</Text>
                  <Text style={[styles.selectedCountryName, { color: theme.text }]}>
                    {userCountry.name}
                  </Text>
                  <MaterialIcons name="check-circle" size={24} color={theme.primary} />
                </View>
              )}

              {/* Popular/All Countries Label */}
              {!countrySearchQuery.trim() && (
                <Text style={[styles.countrySectionLabel, { color: theme.textSecondary }]}>
                  Popular Countries
                </Text>
              )}

              {/* Country List */}
              <ScrollView 
                style={styles.countryListEnhanced} 
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {filteredCountries.slice(0, countrySearchQuery.trim() ? 50 : 10).map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={[
                      styles.countryItemEnhanced,
                      { 
                        backgroundColor: userCountry?.code === country.code ? theme.primary + '10' : theme.surface,
                        borderColor: userCountry?.code === country.code ? theme.primary : theme.border,
                        borderWidth: userCountry?.code === country.code ? 2 : 1,
                      }
                    ]}
                    onPress={() => {
                      setUserCountry(country);
                      setCountrySearchQuery('');
                      hapticFeedback.selection();
                    }}
                  >
                    <Text style={styles.countryFlagEnhanced}>{country.flag}</Text>
                    <Text style={[styles.countryNameEnhanced, { color: theme.text }]}>
                      {country.name}
                    </Text>
                    {userCountry?.code === country.code && (
                      <MaterialIcons name="check-circle" size={22} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
        </View>
          </ScrollView>

          <View style={[styles.buttonContainer, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          onPress={nextStep}
              disabled={!userName.trim() || !userCountry}
              style={[styles.continueButtonEnhanced, { 
                backgroundColor: (userName.trim() && userCountry) ? theme.primary : theme.surface,
                opacity: (userName.trim() && userCountry) ? 1 : 0.5,
              }]}
            >
              <Text style={[styles.continueButtonTextEnhanced, { 
                color: (userName.trim() && userCountry) ? '#FFFFFF' : theme.textSecondary 
              }]}>
                Continue
          </Text>
              <MaterialIcons 
                name="arrow-forward" 
                size={22} 
                color={(userName.trim() && userCountry) ? '#FFFFFF' : theme.textSecondary} 
              />
        </TouchableOpacity>
      </View>
    </Animated.View>
      </View>
  );
  };

  console.log('📍 OnboardingFlow render - currentStep:', currentStep, '/', slides.length);

  return (
    <View style={styles.container}>
      {slides[currentStep] ? renderSlide(slides[currentStep]) : (
        <View style={[styles.slide, { backgroundColor: theme.background }]}>
          <Text style={{ color: theme.text }}>Loading...</Text>
        </View>
      )}
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
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  slide: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  
  // Parallax & Particles
  parallaxContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  parallaxGradient: {
    flex: 1,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    bottom: 0,
    left: '50%',
  },

  // Skip button
  skipContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Feature Slide Styles
  featureContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  featureIconContainer: {
    marginBottom: 40,
    position: 'relative',
  },
  featureIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  glassShine: {
    position: 'absolute',
    top: 10,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ rotate: '45deg' }],
  },
  iconOuterGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  featureTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    width: '100%',
  },
  featureTitle: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    color: '#FFFFFF',
    lineHeight: 38,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  premiumBadge: {
    overflow: 'hidden',
    borderRadius: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  premiumBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featureSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#FFFFFF',
    lineHeight: 27,
    paddingHorizontal: 30,
    opacity: 0.95,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Footer
  slideFooter: {
    alignItems: 'center',
    gap: 24,
    zIndex: 10,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    transition: 'all 0.3s ease',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButton: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Setup Slides
  setupSlideContent: {
    flex: 1,
  },
  setupHeaderContainer: {
    marginBottom: 24,
  },
  setupHeaderGradient: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  setupHeader: {
    alignItems: 'center',
  },
  welcomeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  setupSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Form Inputs
  setupFormContainer: {
    flex: 1,
  },
  setupFormContent: {
    paddingBottom: 20,
  },
  inputSection: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputLabelEnhanced: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },

  // Country Picker
  countrySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 16,
  },
  countrySearchInput: {
    flex: 1,
    fontSize: 14,
  },
  countryList: {
    maxHeight: 300,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
  },
  countryFlag: {
    fontSize: 28,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },

  // Profile Picture
  profilePictureContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
    gap: 12,
  },
  profilePlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Bible Version List
  versionList: {
    flex: 1,
    paddingTop: 16,
  },
  versionCategoryLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  versionItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  versionInfo: {
    flex: 1,
  },
  versionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  versionAbbr: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  versionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 16,
    gap: 8,
  },
  showAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Theme Selection
  themeList: {
    flex: 1,
    paddingTop: 16,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
  },
  modeToggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeCategoryLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  themeCardsContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  themeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  themeCardGradient: {
    height: 120,
  },
  themeCardOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCardColors: {
    flexDirection: 'row',
    gap: 12,
  },
  themeColorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  themeCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  themeCardName: {
    fontSize: 18,
    fontWeight: '600',
  },

  // Buttons
  buttonContainer: {
    paddingTop: 20,
    gap: 12,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  skipStepButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  inputContainerEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputEnhanced: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIconButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Enhanced Country Styles
  countrySearchContainerEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countrySearchInputEnhanced: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  selectedCountryCard: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedCountryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
  },
  selectedCountryFlag: {
    fontSize: 36,
  },
  selectedCountryName: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  selectedCheckIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
  },
  countrySectionLabelEnhanced: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  countryListEnhanced: {
    maxHeight: 360,
  },
  countryItemEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    gap: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  countryFlagContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  countryFlagEnhanced: {
    fontSize: 28,
  },
  countryNameEnhanced: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  countryCheckContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Enhanced Button
  continueButtonEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonTextEnhanced: {
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Gym Preferences Styles
  gymHeaderGradient: {
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  gymIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  gymPreferencesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  gymSectionContainer: {
    marginBottom: 20,
  },
  gymSectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  gymSectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  weightUnitContainer: {
    gap: 16,
    marginBottom: 24,
  },
  weightUnitCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  weightUnitGradient: {
    padding: 24,
    minHeight: 160,
    justifyContent: 'center',
    position: 'relative',
  },
  weightUnitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  weightUnitIcon: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  weightUnitTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  weightUnitDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  weightUnitCheckIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  gymInfoCard: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 14,
    borderWidth: 2,
    gap: 14,
    alignItems: 'flex-start',
  },
  gymInfoTextContainer: {
    flex: 1,
  },
  gymInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  gymInfoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },

  // ==================== PREMIUM GLASS STYLES ====================
  // Glass Header Styles
  glassHeaderContainer: {
    marginBottom: 20,
  },
  glassHeaderGradient: {
    paddingTop: 40,
    paddingBottom: 35,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  glassWelcomeIconContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  glassIconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  glassIconShine: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    transform: [{ rotate: '45deg' }],
  },
  iconGlowRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  iconGlowRing2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
  },
  glassWelcomeTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Glass Input Styles
  glassInputSection: {
    marginBottom: 28,
  },
  glassInputLabel: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  glassInputWrapper: {
    marginBottom: 14,
  },
  glassInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
    backdropFilter: 'blur(20px)',
  },
  glassReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  glassInputIconWrapper: {
    zIndex: 1,
  },
  glassInputIconGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  glassInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    zIndex: 1,
  },
  glassClearButtonWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  glassClearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  // Glass Selected Country Card
  glassSelectedCountryCard: {
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  glassSelectedCountryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  glassSelectedCountryReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  glassSelectedCountryFlag: {
    fontSize: 36,
    zIndex: 1,
  },
  glassSelectedCountryName: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.4,
    zIndex: 1,
  },
  glassSelectedCheckIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },

  // Glass Section Label
  glassSectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 14,
  },
  glassSectionLine: {
    flex: 1,
    height: 1.5,
    opacity: 0.5,
  },
  glassSectionLabelBadge: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  glassSectionLabelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  glassSectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },

  // Glass Country List
  glassCountryList: {
    maxHeight: 380,
  },
  glassCountryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    gap: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
    backdropFilter: 'blur(15px)',
  },
  glassCountryReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  glassCountryFlagContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 1,
  },
  glassCountryFlag: {
    fontSize: 30,
  },
  glassCountryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    zIndex: 1,
  },
  glassCountryCheckIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },

  // Floating Continue Button
  glassFloatingButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  glassContinueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 20,
    gap: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassContinueButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: '40%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
  },
  glassContinueButtonText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    zIndex: 1,
  },

  // Language Selection Styles
  languageList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  languageFlag: {
    fontSize: 36,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  languageNative: {
    fontSize: 13,
    fontWeight: '500',
  },
  comingSoonBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Weight Unit Selection Styles
  weightUnitContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 20,
  },
  weightUnitCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    minHeight: 160,
  },
  weightUnitGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  weightUnitIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  weightUnitIcon: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  weightUnitTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  weightUnitDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  weightUnitCheckIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});

export default OnboardingFlow;
