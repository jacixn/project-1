import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  SafeAreaView,
  TextInput,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { countries } from '../data/countries';
import { availableLanguages } from '../translations/languages';

const { width, height } = Dimensions.get('window');

const EnhancedOnboarding = ({ onComplete }) => {
  const { theme, isDark, changeTheme } = useTheme();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // User data state
  const [userName, setUserName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [smartFeaturesEnabled, setSmartFeaturesEnabled] = useState(false);
  
  // Modal states
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showMoreLanguages, setShowMoreLanguages] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  // Onboarding data with AMAZING super cool colors! 🎨✨
  const onboardingData = [
    {
      id: 'welcome',
      title: 'Welcome to BIBLELY',
      subtitle: 'Faith & Focus, Every Day',
      description: 'Your spiritual companion for daily growth, prayer, and Bible study',
      icon: '✨',
      gradient: ['#4a5568', '#6b46c1', '#a855f7'], // Soft purple depths
      features: [
        { icon: 'checkmark-circle', text: 'Smart task prioritization' },
        { icon: 'heart', text: 'Daily prayer reminders' },
        { icon: 'book', text: 'Personalized Bible reading' },
      ]
    },
    {
      id: 'language',
      title: 'Choose Your Language',
      subtitle: 'Select your preferred language',
      description: 'We support multiple languages for your comfort',
      icon: '🌍',
      gradient: ['#1e3a8a', '#0f766e', '#166534'], // Deep ocean calm
      isLanguagePage: true,
    },
    {
      id: 'features',
      title: 'Powerful Features',
      subtitle: 'Everything you need for spiritual growth',
      description: 'Discover tools designed to strengthen your faith journey',
      icon: '🚀',
      gradient: ['#be185d', '#dc2626', '#ea580c'], // Warm earth tones
      features: [
        { icon: 'flash', text: 'Smart Tasks & Goals' },
        { icon: 'time', text: 'Prayer Time Tracking' },
        { icon: 'chatbubbles', text: 'Friend Chat Support' },
      ]
    },
    {
      id: 'smart',
      title: 'Smart Features',
      subtitle: 'Personalized spiritual guidance',
      description: 'AI-powered recommendations for your faith journey',
      icon: '🧠',
      gradient: ['#1e40af', '#3730a3', '#581c87'], // Deep royal blue to purple
      features: [
        { icon: 'bulb', text: 'Intelligent task suggestions' },
        { icon: 'star', text: 'Personalized Bible verses' },
        { icon: 'shield', text: 'Your data stays private & secure' },
      ],
      isSmartPage: true,
    },
    {
      id: 'profile',
      title: 'Create Your Profile',
      subtitle: 'Tell us about yourself',
      description: 'Help us personalize your spiritual journey',
      icon: '👤',
      gradient: ['#7c2d12', '#a21caf', '#7e22ce'], // Rich burgundy purple
      isProfilePage: true,
    }
  ];

  useEffect(() => {
    // Initialize defaults for new users
    initializeDefaults();
    
    // Animate in on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const initializeDefaults = async () => {
    try {
      // Set default theme to Eterna for new users
      changeTheme('eterna');
      
      // Keep country selector empty until user picks their country
      setSelectedCountry(null);
      
      console.log('✅ Initialized defaults for new user');
    } catch (error) {
      console.error('❌ Error initializing defaults:', error);
    }
  };

  const animatePageTransition = (direction = 'forward') => {
    const toValue = direction === 'forward' ? -50 : 50;
    
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const goToNextPage = () => {
    if (currentPage < onboardingData.length - 1) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      scrollViewRef.current?.scrollTo({
        x: nextPage * width,
        animated: true,
      });
      animatePageTransition('forward');
    } else {
      // Complete onboarding and save user data
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      // Validate required fields
      if (!userName.trim()) {
        Alert.alert('Name Required', 'Please enter your name to continue.');
        return;
      }

      // Save user profile data
      const userProfile = {
        name: userName.trim(),
        country: selectedCountry,
        language: selectedLanguage,
        smartFeaturesEnabled,
        createdAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
      await AsyncStorage.setItem('smart_features_enabled', smartFeaturesEnabled.toString());
      
      console.log('✅ User profile saved:', userProfile);

      // Animate out and complete
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onComplete && onComplete();
      });
    } catch (error) {
      console.error('❌ Error saving user profile:', error);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      scrollViewRef.current?.scrollTo({
        x: prevPage * width,
        animated: true,
      });
      animatePageTransition('backward');
    }
  };

  const handleScroll = (event) => {
    const pageIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(pageIndex);
  };

  const renderLanguageSelection = () => {
    const mainLanguages = availableLanguages.slice(0, 3); // First 3 languages
    
    return (
      <View style={styles.languageContainer}>
        {mainLanguages.map((language, index) => (
          <TouchableOpacity 
            key={language.code}
            style={[
              styles.languageOption, 
              selectedLanguage === language.code && styles.languageSelected,
              language.code !== 'en' && styles.languageDisabled
            ]}
            onPress={() => {
              if (language.code === 'en') {
                setSelectedLanguage(language.code);
              } else {
                Alert.alert('Coming Soon', `${language.name} language support is coming soon!`);
              }
            }}
            disabled={language.code !== 'en'}
          >
            <Text style={styles.languageFlag}>{language.flag}</Text>
            <View style={styles.languageText}>
              <Text style={[
                styles.languageName,
                language.code !== 'en' && styles.languageNameDisabled
              ]}>
                {language.code === 'en' ? language.name : 'Coming Soon'}
              </Text>
              <Text style={[
                styles.languageNative,
                language.code !== 'en' && styles.languageNativeDisabled
              ]}>
                {language.code === 'en' ? language.nativeName : 'Coming Soon'}
              </Text>
            </View>
            {selectedLanguage === language.code && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
            {language.code !== 'en' && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity 
          style={styles.moreLanguages}
          onPress={() => setShowMoreLanguages(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="rgba(255,255,255,0.8)" />
          <Text style={styles.moreLanguagesText}>More Languages</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSmartFeaturesPage = () => (
    <View style={styles.smartFeaturesContainer}>
      <View style={styles.smartIcon}>
        <Animated.View style={[
          styles.smartIconInner,
          {
            transform: [{
              rotate: slideAnim.interpolate({
                inputRange: [-50, 0, 50],
                outputRange: ['-10deg', '0deg', '10deg'],
              })
            }]
          }
        ]}>
          <Ionicons name="sparkles" size={60} color="#fff" />
        </Animated.View>
      </View>
      
      <Text style={styles.smartTitle}>Enable Smart Features</Text>
      <Text style={styles.smartDescription}>
        This app uses advanced technology to provide you with intelligent task suggestions, 
        personalized Bible verses, and smart prayer reminders.
      </Text>
      
      <View style={styles.featuresGrid}>
        {onboardingData[3].features.map((feature, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.featureItem,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [-50, 0, 50],
                    outputRange: [20, 0, -20],
                  })
                }],
                opacity: slideAnim.interpolate({
                  inputRange: [-50, 0, 50],
                  outputRange: [0.5, 1, 0.5],
                })
              }
            ]}
          >
            <Ionicons name={feature.icon} size={24} color="#4CAF50" />
            <Text style={styles.featureText}>{feature.text}</Text>
          </Animated.View>
        ))}
      </View>
      
      <View style={styles.privacyNote}>
        <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
        <Text style={styles.privacyText}>
          Your data is encrypted and secure. We never share your information.
        </Text>
      </View>
    </View>
  );

  const renderProfilePage = () => (
    <View style={styles.profileContainer}>
      <Text style={styles.profileTitle}>Create Your Profile</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Your Name</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Enter your name"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Your Country</Text>
        <TouchableOpacity 
          style={styles.countrySelector}
          onPress={() => setShowCountryPicker(true)}
        >
          <Text style={styles.countryFlag}>
            {selectedCountry?.flag || '🏳️'}
          </Text>
          <Text style={styles.countryName}>
            {selectedCountry?.name || 'Choose Your Country'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPage = (item, index) => (
    <View key={item.id} style={[styles.page, { width }]}>
      <LinearGradient
        colors={item.gradient}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <Animated.View 
            style={[
              styles.content,
              {
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim }
                ],
                opacity: fadeAnim,
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.pageIndicator}>{index + 1} of {onboardingData.length}</Text>
              {index > 0 && (
                <TouchableOpacity style={styles.skipButton} onPress={() => onComplete && onComplete()}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              {!item.isLanguagePage && !item.isSmartPage && !item.isProfilePage && (
                <>
                  <Animated.View style={[
                    styles.iconContainer,
                    {
                      transform: [{
                        scale: slideAnim.interpolate({
                          inputRange: [-50, 0, 50],
                          outputRange: [0.8, 1, 0.8],
                        })
                      }]
                    }
                  ]}>
                    <Text style={styles.emoji}>{item.icon}</Text>
                  </Animated.View>
                  
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                  
                  {item.features && (
                    <View style={styles.featuresList}>
                      {item.features.map((feature, idx) => (
                        <Animated.View 
                          key={idx}
                          style={[
                            styles.featureRow,
                            {
                              transform: [{
                                translateX: slideAnim.interpolate({
                                  inputRange: [-50, 0, 50],
                                  outputRange: [-20, 0, 20],
                                })
                              }],
                              opacity: slideAnim.interpolate({
                                inputRange: [-50, 0, 50],
                                outputRange: [0.6, 1, 0.6],
                              })
                            }
                          ]}
                        >
                          <Ionicons name={feature.icon} size={20} color="#fff" />
                          <Text style={styles.featureText}>{feature.text}</Text>
                        </Animated.View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {item.isLanguagePage && renderLanguageSelection()}
              {item.isSmartPage && renderSmartFeaturesPage()}
              {item.isProfilePage && renderProfilePage()}
            </View>

            {/* Navigation */}
            <View style={styles.navigation}>
              <View style={styles.pagination}>
                {onboardingData.map((_, idx) => (
                  <Animated.View
                    key={idx}
                    style={[
                      styles.paginationDot,
                      idx === currentPage && styles.paginationDotActive,
                      {
                        transform: [{
                          scale: idx === currentPage ? 1.2 : 1
                        }]
                      }
                    ]}
                  />
                ))}
              </View>

              <View style={styles.buttonContainer}>
                {currentPage > 0 && (
                  <TouchableOpacity style={styles.backButton} onPress={goToPreviousPage}>
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.nextButton, currentPage === 0 && styles.nextButtonFirst]}
                  onPress={goToNextPage}
                >
                  <Text style={styles.nextButtonText}>
                    {currentPage === onboardingData.length - 1 ? 'Get Started' : 'Continue'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderCountryPicker = () => {
    const filteredCountries = countries.filter(country =>
      country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
    );

    return (
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowCountryPicker(false);
              setCountrySearchQuery('');
            }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => {
              setShowCountryPicker(false);
              setCountrySearchQuery('');
            }}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor="#999"
              value={countrySearchQuery}
              onChangeText={setCountrySearchQuery}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {countrySearchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setCountrySearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.countryItem,
                  selectedCountry?.code === item.code && styles.countryItemSelected
                ]}
                onPress={() => {
                  setSelectedCountry(item);
                  setShowCountryPicker(false);
                  setCountrySearchQuery('');
                }}
              >
                <Text style={styles.countryItemFlag}>{item.flag}</Text>
                <Text style={styles.countryItemName}>{item.name}</Text>
                {selectedCountry?.code === item.code && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptySearchContainer}>
                <Ionicons name="search" size={48} color="#ccc" />
                <Text style={styles.emptySearchText}>No countries found</Text>
                <Text style={styles.emptySearchSubtext}>Try a different search term</Text>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    );
  };

  const renderMoreLanguagesModal = () => (
    <Modal
      visible={showMoreLanguages}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowMoreLanguages(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>More Languages</Text>
          <TouchableOpacity onPress={() => setShowMoreLanguages(false)}>
            <Text style={styles.modalDone}>Done</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={availableLanguages}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.languageItem,
                item.code !== 'en' && styles.languageItemDisabled
              ]}
              onPress={() => {
                if (item.code === 'en') {
                  setSelectedLanguage(item.code);
                  setShowMoreLanguages(false);
                } else {
                  Alert.alert('Coming Soon', `${item.name} language support is coming soon!`);
                }
              }}
              disabled={item.code !== 'en'}
            >
              <Text style={styles.languageItemFlag}>{item.flag}</Text>
              <View style={styles.languageItemText}>
                <Text style={[
                  styles.languageItemName,
                  item.code !== 'en' && styles.languageItemNameDisabled
                ]}>
                  {item.code === 'en' ? item.name : 'Coming Soon'}
                </Text>
                <Text style={[
                  styles.languageItemNative,
                  item.code !== 'en' && styles.languageItemNativeDisabled
                ]}>
                  {item.code === 'en' ? item.nativeName : 'Coming Soon'}
                </Text>
              </View>
              {selectedLanguage === item.code && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
              {item.code !== 'en' && (
                <View style={styles.comingSoonBadgeSmall}>
                  <Text style={styles.comingSoonTextSmall}>Soon</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={false} hidden={false} />
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEnabled={false} // Disable manual scrolling to control navigation
      >
        {onboardingData.map((item, index) => renderPage(item, index))}
      </ScrollView>
      
      {renderCountryPicker()}
      {renderMoreLanguagesModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  pageIndicator: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emoji: {
    fontSize: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresList: {
    width: '100%',
    maxWidth: 300,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  navigation: {
    paddingTop: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonFirst: {
    flex: 1,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  // Language page styles
  languageContainer: {
    width: '100%',
    maxWidth: 320,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageSelected: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageText: {
    flex: 1,
  },
  languageName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  languageNative: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  moreLanguages: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
  },
  moreLanguagesText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginLeft: 8,
  },
  languageDisabled: {
    opacity: 0.6,
  },
  languageNameDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  languageNativeDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  comingSoonBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Smart features page styles
  smartFeaturesContainer: {
    width: '100%',
    alignItems: 'center',
  },
  smartIcon: {
    marginBottom: 24,
  },
  smartIconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  smartDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  featuresGrid: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 32,
    width: '100%',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  privacyText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  enableButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  // Profile page styles
  profileContainer: {
    width: '100%',
    maxWidth: 320,
  },
  profileTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  textInput: {
    color: '#fff',
    fontSize: 16,
    padding: 16,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  countryName: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalDone: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  // Country picker styles
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  countryItemSelected: {
    backgroundColor: '#F2F2F7',
  },
  countryItemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryItemName: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    color: '#000',
  },
  clearButton: {
    marginLeft: 8,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  // Language picker styles
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  languageItemDisabled: {
    opacity: 0.5,
  },
  languageItemFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageItemText: {
    flex: 1,
  },
  languageItemName: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  languageItemNative: {
    fontSize: 14,
    color: '#666',
  },
  languageItemNameDisabled: {
    color: '#999',
  },
  languageItemNativeDisabled: {
    color: '#CCC',
  },
  comingSoonBadgeSmall: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  comingSoonTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default EnhancedOnboarding;