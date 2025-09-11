import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { getStoredData, saveData } from '../utils/localStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SpiritualLoadingAnimation from './SpiritualLoadingAnimation';

const { width, height } = Dimensions.get('window');

// Remote Thematic Guides Configuration
const GUIDES_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/thematic-guides.json',
  get URL() {
    if (this.GITHUB_USERNAME === 'YOUR_USERNAME') return null;
    return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.REPO_NAME}/${this.BRANCH}/${this.FILE_PATH}`;
  },
  CACHE_KEY: 'thematic_guides_data_v1',
  CACHE_TIMESTAMP_KEY: 'thematic_guides_timestamp_v1',
  CACHE_DURATION: 60 * 60 * 1000, // 1 hour
};

const ThematicGuides = ({ visible, onClose, onNavigateToVerse }) => {
  const { theme, isDark } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [sortBy, setSortBy] = useState('helpful');
  const [reflectionNotes, setReflectionNotes] = useState({});
  const [completedGuides, setCompletedGuides] = useState([]);
  const scrollViewRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Remote data state
  const [guidesData, setGuidesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cache management functions
  const isCacheValid = async () => {
    try {
      const timestamp = await AsyncStorage.getItem(GUIDES_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < GUIDES_CONFIG.CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  };

  const fetchGuidesFromRemote = async () => {
    try {
      const url = GUIDES_CONFIG.URL;
      if (!url) {
        throw new Error('Remote URL not configured');
      }

      console.log('Fetching thematic guides from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      await AsyncStorage.setItem(GUIDES_CONFIG.CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(GUIDES_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('✅ Successfully fetched and cached thematic guides');
      return data;
    } catch (error) {
      console.error('Error fetching thematic guides from remote:', error);
      throw error;
    }
  };

  const loadLocalFallbackData = () => {
    // Minimal fallback data
    return {
      themeCategories: [
        { id: 'all', name: 'All Themes', color: theme.primary, icon: 'auto_awesome' },
        { id: 'faith', name: 'Faith', color: '#4A90E2', icon: 'favorite' },
        { id: 'love', name: 'Love', color: '#E91E63', icon: 'favorite_border' },
        { id: 'wisdom', name: 'Wisdom', color: '#8B572A', icon: 'psychology' }
      ],
      thematicGuides: [
        {
          id: 'faith-sample',
          title: 'Faith – Sample Guide',
          hook: 'Loading guides from remote...',
          theme: 'faith',
          timeMinutes: 3,
          passage: 'Hebrews 11:1',
          anchorVerse: 'Now faith is confidence in what we hope for',
          verseRef: 'Hebrews 11:1',
          intro: 'Thematic guides are loading from remote source...',
          story: ['Please check your internet connection and try refreshing.'],
          keyVerses: [{ verse: 'Hebrews 11:1', text: 'Now faith is confidence in what we hope for and assurance about what we do not see' }],
          insights: ['Remote data loading in progress...'],
          reflectQuestions: ['How is your connection?'],
          practice: 'Please wait while we load the complete guides.',
          prayer: 'Lord, help us connect to Your wisdom. Amen.',
          relatedGuides: []
        }
      ]
    };
  };

  const loadGuides = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheValid = await isCacheValid();
      if (cacheValid) {
        const cachedData = await AsyncStorage.getItem(GUIDES_CONFIG.CACHE_KEY);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setGuidesData(data);
          setLoading(false);
          console.log('✅ Loaded thematic guides from cache');
          return;
        }
      }

      // Try to fetch from remote
      try {
        const data = await fetchGuidesFromRemote();
        setGuidesData(data);
      } catch (remoteError) {
        console.error('Remote fetch failed, using fallback:', remoteError);
        
        // Try cached data even if expired
        const cachedData = await AsyncStorage.getItem(GUIDES_CONFIG.CACHE_KEY);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setGuidesData(data);
          console.log('📦 Using expired cache due to remote failure');
        } else {
          // Use fallback data
          const fallbackData = loadLocalFallbackData();
          setGuidesData(fallbackData);
          console.log('🔄 Using fallback data');
        }
        
        setError('Using offline data. Pull to refresh when online.');
      }
    } catch (error) {
      console.error('Error loading thematic guides:', error);
      setError('Failed to load guides. Please try again.');
      
      // Use fallback data
      const fallbackData = loadLocalFallbackData();
      setGuidesData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const refreshGuides = async () => {
    try {
      // Clear cache and reload
      await AsyncStorage.removeItem(GUIDES_CONFIG.CACHE_KEY);
      await AsyncStorage.removeItem(GUIDES_CONFIG.CACHE_TIMESTAMP_KEY);
      await loadGuides();
    } catch (error) {
      console.error('Error refreshing guides:', error);
      Alert.alert('Error', 'Failed to refresh guides. Please try again.');
    }
  };

  // Initialize data loading
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load guides data
        await loadGuides();
        
        // Load saved reflections and completed guides
        const savedReflections = await getStoredData('thematicGuideReflections');
        const savedCompletedGuides = await getStoredData('completedThematicGuides');
        
        if (savedReflections) {
          setReflectionNotes(savedReflections);
        }
        
        if (savedCompletedGuides) {
          setCompletedGuides(savedCompletedGuides);
        }
      } catch (error) {
        console.error('Error loading thematic guide data:', error);
      }
    };

    if (visible) {
      initializeData();
    }
  }, [visible]);

  // Cleanup: save any pending reflections when component unmounts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Force save any pending reflections
        saveData('thematicGuideReflections', reflectionNotes).catch(console.error);
      }
    };
  }, [reflectionNotes]);

  // Dynamic theme categories from loaded data
  const themeCategories = [
    { id: 'all', name: 'All Themes', color: theme.primary, icon: 'auto_awesome' },
    ...(guidesData?.themeCategories || [])
  ];

  // Dynamic thematic guides from loaded data
  const thematicGuides = guidesData ? guidesData.thematicGuides : [];

  const sortOptions = [
    { id: 'helpful', name: 'Most Helpful' },
    { id: 'new', name: 'New' },
    { id: 'shortest', name: 'Shortest' },
    { id: 'deep', name: 'Deep' }
  ];

  const getFilteredGuides = () => {
    let filtered = selectedTheme === 'all' 
      ? thematicGuides 
      : thematicGuides.filter(guide => guide.theme === selectedTheme);

    // Sort guides
    switch (sortBy) {
      case 'shortest':
        return filtered.sort((a, b) => a.timeMinutes - b.timeMinutes);
      case 'deep':
        return filtered.sort((a, b) => b.timeMinutes - a.timeMinutes);
      case 'new':
        return filtered.reverse();
      default:
        return filtered; // Most helpful (default order)
    }
  };

  const handleGuideComplete = async (guideId) => {
    const updatedCompleted = [...completedGuides, guideId];
    setCompletedGuides(updatedCompleted);
    
    // Save to persistent storage
    try {
      await saveData('completedThematicGuides', updatedCompleted);
    } catch (error) {
      console.error('Error saving completed guide:', error);
    }
    
    hapticFeedback.light();
  };

  const saveReflection = (guideId, questionIndex, text) => {
    const updatedReflections = {
      ...reflectionNotes,
      [`${guideId}-${questionIndex}`]: text
    };
    
    setReflectionNotes(updatedReflections);
    
    // Debounced save to persistent storage (wait 1 second after user stops typing)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveData('thematicGuideReflections', updatedReflections);
        console.log('Reflection saved to storage');
      } catch (error) {
        console.error('Error saving reflection:', error);
      }
    }, 1000);
  };

  const renderGuideCard = (guide) => {
    const themeColor = themeCategories.find(cat => cat.id === guide.theme)?.color || theme.primary;
    const isCompleted = completedGuides.includes(guide.id);

    return (
      <TouchableOpacity
        key={guide.id}
        style={[styles.guideCard, { 
          backgroundColor: theme.card,
          borderColor: isCompleted ? themeColor : theme.border,
          borderWidth: isCompleted ? 2 : 1
        }]}
        onPress={() => {
          hapticFeedback.light();
          setSelectedGuide(guide);
        }}
      >
        <View style={styles.guideHeader}>
          <View style={styles.guideInfo}>
            <Text style={[styles.guideTitle, { color: theme.text }]}>
              {guide.title}
            </Text>
            <Text style={[styles.guideHook, { color: theme.textSecondary }]}>
              {guide.hook}
            </Text>
          </View>
          {isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: themeColor }]}>
              <MaterialIcons name="check" size={16} color="white" />
            </View>
          )}
        </View>

        <View style={styles.guideFooter}>
          <View style={[styles.timeBadge, { backgroundColor: `${themeColor}20` }]}>
            <MaterialIcons name="schedule" size={14} color={themeColor} />
            <Text style={[styles.timeText, { color: themeColor }]}>
              {guide.timeMinutes} min
            </Text>
          </View>
          
          <Text style={[styles.anchorVerse, { color: theme.textSecondary }]}>
            "{guide.anchorVerse}"
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGuideDetail = () => {
    if (!selectedGuide) return null;
    
    const themeColor = themeCategories.find(cat => cat.id === selectedGuide.theme)?.color || theme.primary;
    const isCompleted = completedGuides.includes(selectedGuide.id);

    return (
      <Modal 
        visible={!!selectedGuide} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedGuide(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} hidden={false} />
            
            {/* Modal Handle */}
            <View style={styles.modalHandle}>
              <View style={[styles.handleBar, { backgroundColor: theme.textSecondary }]} />
            </View>
          
          {/* Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={{ width: 40 }} />
            <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
              Thematic Guide
            </Text>
            <TouchableOpacity
              onPress={() => onNavigateToVerse && onNavigateToVerse(selectedGuide.passage)}
              style={styles.closeButton}
            >
              <MaterialIcons name="menu-book" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.guideDetailContent} showsVerticalScrollIndicator={false}>
            {/* Guide Header */}
            <LinearGradient
              colors={[`${themeColor}20`, `${themeColor}10`, 'transparent']}
              style={styles.guideDetailHeader}
            >
              <View style={styles.guideDetailTitleSection}>
                <Text style={[styles.guideDetailTitle, { color: theme.text }]}>
                  {selectedGuide.title}
                </Text>
                <Text style={[styles.guideDetailHook, { color: theme.textSecondary }]}>
                  {selectedGuide.hook}
                </Text>
                
                <View style={styles.guideDetailMeta}>
                  <View style={[styles.detailTimeBadge, { backgroundColor: `${themeColor}20` }]}>
                    <MaterialIcons name="schedule" size={16} color={themeColor} />
                    <Text style={[styles.detailTimeText, { color: themeColor }]}>
                      {selectedGuide.timeMinutes} min read
                    </Text>
                  </View>
                </View>
              </View>

            </LinearGradient>

            {/* Introduction Section */}
            {selectedGuide.intro && (
              <View style={styles.guideSection}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="campaign" size={24} color={themeColor} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Introduction</Text>
                </View>
                <Text style={[styles.introParagraph, { color: theme.text }]}>
                  {selectedGuide.intro}
                </Text>
              </View>
            )}

            {/* Story Section */}
            <View style={styles.guideSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="auto-stories" size={24} color={themeColor} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Bible Moments</Text>
              </View>
              {selectedGuide.story.map((paragraph, index) => (
                <View key={index} style={styles.storyItem}>
                  <View style={[styles.storyNumber, { backgroundColor: `${themeColor}20`, borderColor: themeColor }]}>
                    <Text style={[styles.storyNumberText, { color: themeColor }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.storyParagraph, { color: theme.text }]}>
                    {paragraph}
                  </Text>
                </View>
              ))}
            </View>

            {/* Key Verses Section */}
            {selectedGuide.keyVerses && (
              <View style={styles.guideSection}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="menu-book" size={24} color={themeColor} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Verses</Text>
                </View>
                {selectedGuide.keyVerses.map((verseItem, index) => (
                  <View key={index} style={[styles.verseCard, { backgroundColor: theme.surface, borderColor: `${themeColor}20` }]}>
                    <Text style={[styles.verseText, { color: theme.text }]}>
                      "{verseItem.text}"
                    </Text>
                    <Text style={[styles.verseReference, { color: themeColor }]}>
                      {verseItem.verse}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Insights Section */}
            <View style={styles.guideSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="lightbulb" size={24} color={themeColor} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Insights</Text>
              </View>
              {selectedGuide.insights.map((insight, index) => (
                <View key={index} style={styles.insightItem}>
                  <View style={[styles.insightBullet, { backgroundColor: themeColor }]} />
                  <Text style={[styles.insightText, { color: theme.text }]}>
                    {insight}
                  </Text>
                </View>
              ))}
            </View>

            {/* Reflect Section */}
            <View style={styles.guideSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="psychology" size={24} color={themeColor} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Reflect</Text>
              </View>
              {selectedGuide.reflectQuestions.map((question, index) => (
                <View key={index} style={styles.reflectItem}>
                  <Text style={[styles.reflectQuestion, { color: theme.text }]}>
                    {question}
                  </Text>
                  <TextInput
                    style={[styles.reflectInput, { 
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderColor: theme.border
                    }]}
                    placeholder="Write your thoughts..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    value={reflectionNotes[`${selectedGuide.id}-${index}`] || ''}
                    onChangeText={(text) => saveReflection(selectedGuide.id, index, text)}
                  />
                </View>
              ))}
            </View>

            {/* Practice Section */}
            <View style={styles.guideSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="directions-walk" size={24} color={themeColor} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Practice</Text>
              </View>
              <View style={[styles.practiceCard, { backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30` }]}>
                <Text style={[styles.practiceText, { color: theme.text }]}>
                  {selectedGuide.practice}
                </Text>
              </View>
            </View>

            {/* Prayer Section */}
            <View style={styles.guideSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="church" size={24} color={themeColor} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Prayer</Text>
              </View>
              <View style={[styles.prayerCard, { backgroundColor: theme.surface, borderColor: `${themeColor}20` }]}>
                <Text style={[styles.prayerText, { color: theme.text, fontStyle: 'italic' }]}>
                  "{selectedGuide.prayer}"
                </Text>
              </View>
            </View>

            {/* Complete Button */}
            {!isCompleted && (
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: themeColor }]}
                onPress={() => handleGuideComplete(selectedGuide.id)}
              >
                <MaterialIcons name="check-circle" size={24} color="white" />
                <Text style={styles.completeButtonText}>
                  Save Reflection & Mark Complete
                </Text>
              </TouchableOpacity>
            )}

            {isCompleted && (
              <View style={[styles.completedIndicator, { backgroundColor: `${themeColor}20`, borderColor: themeColor }]}>
                <MaterialIcons name="check-circle" size={24} color={themeColor} />
                <Text style={[styles.completedText, { color: themeColor }]}>
                  Guide Completed
                </Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} hidden={false} />
        
        {/* Header */}
        <View style={{ height: 60, backgroundColor: theme.surface }} />
        <SafeAreaView edges={['top']} style={[styles.solidHeader, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.solidHeaderButton}
          >
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.solidHeaderTitle, { color: theme.text }]}>
            Thematic Guides
          </Text>
          <View style={styles.solidHeaderButton} />
        </SafeAreaView>

        {/* Spiritual Loading Animation */}
        <SpiritualLoadingAnimation 
          isVisible={loading}
          loadingText="Loading thematic guides..."
          onComplete={() => setLoading(false)}
        />

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error_outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.errorText, { color: theme.text }]}>
              {error}
            </Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={refreshGuides}
            >
              <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
            <LinearGradient
              colors={isDark ? [`${theme.primary}30`, `${theme.primary}20`, `${theme.primary}10`] : [`${theme.primary}20`, `${theme.primary}15`, `${theme.primary}10`]}
              style={styles.heroGradient}
            >
              <Text style={[styles.heroTitle, { color: theme.text }]}>
                Short studies by theme
              </Text>
              <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                Read. Reflect. Practice.
              </Text>
            </LinearGradient>
          </View>

          {/* Theme Chips */}
          <View style={styles.chipsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
              {themeCategories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: selectedTheme === category.id ? category.color : theme.surface,
                      borderColor: category.color,
                    }
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSelectedTheme(category.id);
                  }}
                >
                  {category.icon && (
                    <MaterialIcons 
                      name={category.icon} 
                      size={16} 
                      color={selectedTheme === category.id ? 'white' : category.color} 
                    />
                  )}
                  <Text style={[
                    styles.themeChipText,
                    { color: selectedTheme === category.id ? 'white' : category.color }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Sort Options */}
          <View style={styles.sortSection}>
            <Text style={[styles.sortLabel, { color: theme.textSecondary }]}>Sort by:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortContainer}>
              {sortOptions.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.sortChip,
                    {
                      backgroundColor: sortBy === option.id ? theme.primary : theme.surface,
                      borderColor: theme.primary,
                    }
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSortBy(option.id);
                  }}
                >
                  <Text style={[
                    styles.sortChipText,
                    { color: sortBy === option.id ? 'white' : theme.primary }
                  ]}>
                    {option.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Guides List */}
          <View style={styles.guidesSection}>
            <Text style={[styles.sectionHeaderText, { color: theme.text }]}>
              {selectedTheme === 'all' ? 'All Guides' : 
               themeCategories.find(cat => cat.id === selectedTheme)?.name + ' Guides'}
            </Text>
            
            {getFilteredGuides().map(renderGuideCard)}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
        )}

        {renderGuideDetail()}
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
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  solidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  solidHeaderButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  solidHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  heroSection: {
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 30,
  },
  heroGradient: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  chipsSection: {
    marginBottom: 20,
  },
  chipsContainer: {
    paddingHorizontal: 20,
    paddingRight: 40,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  themeChipText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  sortSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  sortContainer: {
    flexDirection: 'row',
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  sortChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  guidesSection: {
    paddingHorizontal: 20,
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  guideCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  guideInfo: {
    flex: 1,
    marginRight: 12,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  guideHook: {
    fontSize: 14,
    lineHeight: 20,
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  anchorVerse: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  guideDetailContent: {
    flex: 1,
  },
  guideDetailHeader: {
    padding: 24,
    marginBottom: 20,
  },
  guideDetailTitleSection: {
    marginBottom: 20,
  },
  guideDetailTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  guideDetailHook: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  guideDetailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  detailTimeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  guideSection: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  introParagraph: {
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  storyItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  storyNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  storyNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  storyParagraph: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  verseCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    marginRight: 12,
  },
  insightText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  reflectItem: {
    marginBottom: 20,
  },
  reflectQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reflectInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  practiceCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  practiceText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  prayerCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default ThematicGuides;
