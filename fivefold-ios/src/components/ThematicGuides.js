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
  Animated,
  PanResponder,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { getStoredData, saveData } from '../utils/localStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SimplePercentageLoader from './SimplePercentageLoader';
import verseByReferenceService from '../services/verseByReferenceService';

// const { width, height } = Dimensions.get('window');

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
  CACHE_KEY: 'thematic_guides_data_v2',
  CACHE_TIMESTAMP_KEY: 'thematic_guides_timestamp_v2',
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
  const [refreshing, setRefreshing] = useState(false);

  // Bible version states for dynamic verse fetching
  const [fetchedVerses, setFetchedVerses] = useState({}); // { 'reference': { text: '...', version: 'NIV' } }
  const [loadingDynamicVerses, setLoadingDynamicVerses] = useState(false);
  const [bibleVersion, setBibleVersion] = useState('KJV');

  // Modal animation refs for guide detail view
  const guideSlideAnim = useRef(new Animated.Value(0)).current;
  const guideFadeAnim = useRef(new Animated.Value(0)).current;
  const guidePanY = useRef(new Animated.Value(0)).current;

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
          // Load dynamic verses after loading guides
          await loadDynamicVerses(data);
          return;
        }
      }

      // Try to fetch from remote
      try {
        const data = await fetchGuidesFromRemote();
        setGuidesData(data);
        // Load dynamic verses after loading guides
        await loadDynamicVerses(data);
      } catch (remoteError) {
        console.error('Remote fetch failed, using fallback:', remoteError);
        
        // Try cached data even if expired
        const cachedData = await AsyncStorage.getItem(GUIDES_CONFIG.CACHE_KEY);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setGuidesData(data);
          console.log('📦 Using expired cache due to remote failure');
          await loadDynamicVerses(data);
        } else {
          // Use fallback data
          const fallbackData = loadLocalFallbackData();
          setGuidesData(fallbackData);
          console.log('🔄 Using fallback data');
          await loadDynamicVerses(fallbackData);
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

  // Load verses from user's preferred Bible version
  const loadDynamicVerses = async (data) => {
    try {
      setLoadingDynamicVerses(true);
      console.log('📖 Loading dynamic verses for thematic guides from preferred Bible version...');
      
      // Get user's preferred version
      const version = await verseByReferenceService.getPreferredVersion();
      setBibleVersion(version.toUpperCase());
      console.log('📖 User prefers:', version.toUpperCase());
      
      // Get all verses from all guides
      const allGuides = data.guides || [];
      const allVerses = allGuides.flatMap(guide => guide.keyVerses || []);
      console.log('📖 Found', allVerses.length, 'verses to fetch');
      
      // Fetch verses dynamically (batch processing)
      const versesMap = {};
      const batchSize = 10;
      
      for (let i = 0; i < allVerses.length; i += batchSize) {
        const batch = allVerses.slice(i, i + batchSize);
        const promises = batch.map(async (verseObj) => {
          if (!verseObj.verse) return; // verse is the reference field
          try {
            const verseData = await verseByReferenceService.getVerseByReference(verseObj.verse, version);
            versesMap[verseObj.verse] = {
              text: verseData.text,
              version: verseData.version
            };
            console.log('✅ Loaded:', verseObj.verse);
          } catch (error) {
            console.error('❌ Failed to load:', verseObj.verse, error.message);
            // Fallback to hardcoded text if fetch fails
            versesMap[verseObj.verse] = {
              text: verseObj.text,
              version: version.toUpperCase()
            };
          }
        });
        
        await Promise.all(promises);
        console.log(`📊 Progress: ${Math.min(i + batchSize, allVerses.length)}/${allVerses.length} verses loaded`);
      }
      
      setFetchedVerses(versesMap);
      setLoadingDynamicVerses(false);
      console.log('✅ All dynamic verses loaded for thematic guides!');
    } catch (error) {
      console.error('Error loading dynamic verses:', error);
      setLoadingDynamicVerses(false);
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

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    try {
      await refreshGuides();
    } finally {
      setRefreshing(false);
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

  // Listen for Bible version changes from Settings
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('bibleVersionChanged', async (newVersion) => {
      console.log('📡 ThematicGuides: Received Bible version change event ->', newVersion);
      
      // Clear cached verses
      setFetchedVerses({});
      
      // Update version display
      setBibleVersion(newVersion.toUpperCase());
      
      // Reload all verses with new version
      if (guidesData) {
        console.log('🔄 Reloading all guide verses with new version:', newVersion);
        await loadDynamicVerses(guidesData);
      }
      
      console.log('✅ ThematicGuides refreshed with new Bible version');
    });

    return () => {
      subscription.remove();
    };
  }, [guidesData]); // Re-subscribe if guidesData changes

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
    ...(guidesData?.themeCategories?.filter(cat => cat.id !== 'all') || [])
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
      ? [...thematicGuides]
      : thematicGuides.filter(guide => guide.theme === selectedTheme);

    // Sort guides (using slice to avoid mutating original array)
    switch (sortBy) {
      case 'shortest':
        return [...filtered].sort((a, b) => a.timeMinutes - b.timeMinutes);
      case 'deep':
        return [...filtered].sort((a, b) => b.timeMinutes - a.timeMinutes);
      case 'new':
        return [...filtered].reverse();
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

  // Get theme icon for each category
  const getThemeIcon = (themeId) => {
    const icons = {
      faith: 'brightness-7',
      love: 'favorite',
      wisdom: 'psychology',
      hope: 'wb-sunny',
      prayer: 'self-improvement',
      courage: 'shield',
      peace: 'spa',
      joy: 'celebration',
      grace: 'card-giftcard',
      trust: 'verified',
    };
    return icons[themeId] || 'auto-awesome';
  };

  // Get gradient colors for each theme
  const getThemeGradient = (themeId, themeColor) => {
    const gradients = {
      faith: ['#667eea', '#764ba2'],
      love: ['#f093fb', '#f5576c'],
      wisdom: ['#4facfe', '#00f2fe'],
      hope: ['#43e97b', '#38f9d7'],
      prayer: ['#fa709a', '#fee140'],
      courage: ['#a8edea', '#fed6e3'],
      peace: ['#d299c2', '#fef9d7'],
      joy: ['#ffecd2', '#fcb69f'],
      grace: ['#a18cd1', '#fbc2eb'],
      trust: ['#667eea', '#764ba2'],
    };
    return gradients[themeId] || [themeColor, `${themeColor}88`];
  };

  const renderGuideCard = (guide, index) => {
    const themeColor = themeCategories.find(cat => cat.id === guide.theme)?.color || theme.primary;
    const isCompleted = completedGuides.includes(guide.id);
    const gradientColors = getThemeGradient(guide.theme, themeColor);
    const themeIcon = getThemeIcon(guide.theme);

    return (
      <TouchableOpacity
        key={guide.id}
        activeOpacity={0.9}
        style={{
          marginBottom: 20,
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: themeColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 8,
        }}
        onPress={() => {
          hapticFeedback.light();
          setSelectedGuide(guide);
        }}
      >
        {/* Gradient Background */}
        <LinearGradient
          colors={isDark ? [`${themeColor}30`, `${themeColor}10`] : gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            padding: 24,
            position: 'relative',
          }}
        >
          {/* Decorative Icon - Top Right */}
          <View style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            opacity: isDark ? 0.15 : 0.2,
          }}>
            <MaterialIcons 
              name={themeIcon} 
              size={120} 
              color={isDark ? '#fff' : '#fff'} 
            />
          </View>

          {/* Content */}
          <View style={{ position: 'relative', zIndex: 1 }}>
            {/* Category & Completed Badge Row */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 14 
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}>
                <MaterialIcons 
                  name={themeIcon} 
                  size={14} 
                  color={isDark ? '#fff' : '#fff'} 
                />
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: isDark ? '#fff' : '#fff',
                  marginLeft: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {themeCategories.find(cat => cat.id === guide.theme)?.name || guide.theme}
                </Text>
              </View>
              
              {isCompleted && (
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <MaterialIcons name="check-circle" size={24} color={themeColor} />
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={{
              fontSize: 22,
              fontWeight: '800',
              color: isDark ? theme.text : '#fff',
              marginBottom: 8,
              letterSpacing: -0.3,
            }}>
              {guide.title}
            </Text>

            {/* Description */}
            <Text style={{
              fontSize: 15,
              color: isDark ? theme.textSecondary : 'rgba(255,255,255,0.9)',
              lineHeight: 22,
              marginBottom: 18,
            }}>
              {guide.hook}
            </Text>

            {/* Divider Line */}
            <View style={{
              height: 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
              marginBottom: 16,
            }} />

            {/* Footer Row */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              {/* Time Badge */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.35)',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}>
                <MaterialIcons 
                  name="schedule" 
                  size={16} 
                  color={isDark ? theme.text : '#fff'} 
                />
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: isDark ? theme.text : '#fff',
                  marginLeft: 6,
                }}>
                  {guide.timeMinutes} min
                </Text>
              </View>

              {/* Arrow Indicator */}
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <MaterialIcons 
                  name="arrow-forward" 
                  size={20} 
                  color={isDark ? theme.text : '#fff'} 
                />
              </View>
            </View>

            {/* Quote - Bottom */}
            <View style={{
              marginTop: 16,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)',
            }}>
              <Text style={{
                fontSize: 13,
                fontStyle: 'italic',
                color: isDark ? theme.textSecondary : 'rgba(255,255,255,0.85)',
                textAlign: 'center',
                lineHeight: 20,
              }}>
                "{guide.anchorVerse}"
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Reset panY when modal closes
  useEffect(() => {
    if (!selectedGuide) {
      guidePanY.setValue(0);
    }
  }, [selectedGuide]);

  // Pan gesture handler for guide detail modal
  const guidePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          guidePanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          hapticFeedback.success();
          Animated.parallel([
            Animated.timing(guideSlideAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(guideFadeAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setSelectedGuide(null);
          });
        } else {
          hapticFeedback.light();
          Animated.spring(guidePanY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animate guide detail modal in/out
  useEffect(() => {
    if (selectedGuide) {
      guideSlideAnim.setValue(0);
      guideFadeAnim.setValue(0);
      
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(guideSlideAnim, {
            toValue: 1,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }),
          Animated.timing(guideFadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      guideSlideAnim.setValue(0);
      guideFadeAnim.setValue(0);
    }
  }, [selectedGuide]);

  const renderGuideDetail = () => {
    if (!selectedGuide) return null;
    
    const themeColor = themeCategories.find(cat => cat.id === selectedGuide.theme)?.color || theme.primary;
    const isCompleted = completedGuides.includes(selectedGuide.id);
    const gradientColors = getThemeGradient(selectedGuide.theme, themeColor);
    const themeIcon = getThemeIcon(selectedGuide.theme);

    const modalTranslateY = guideSlideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1000, 0],
    });

    const combinedTranslateY = Animated.add(modalTranslateY, guidePanY);

    const handleBackdropClose = () => {
      Animated.parallel([
        Animated.timing(guideSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(guideFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSelectedGuide(null);
      });
    };

    // Premium Section Card Component
    const SectionCard = ({ icon, title, children, accent = false }) => (
      <View style={{
        marginHorizontal: 20,
        marginBottom: 24,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: accent ? themeColor : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: accent ? 0.2 : 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: accent ? 1 : 0,
        borderColor: `${themeColor}30`,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: `${themeColor}15`,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 14,
          }}>
            <MaterialIcons name={icon} size={24} color={themeColor} />
          </View>
          <Text style={{
            fontSize: 20,
            fontWeight: '700',
            color: theme.text,
            letterSpacing: -0.3,
          }}>
            {title}
          </Text>
        </View>
        {children}
      </View>
    );

    return (
      <Modal 
        visible={!!selectedGuide}
        transparent={true}
        animationType="none"
        onRequestClose={handleBackdropClose}
        statusBarTranslucent={true}
      >
        <View style={[styles.guideModalOverlay, { justifyContent: 'flex-end' }]}>
          {/* Backdrop */}
          <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: guideFadeAnim }}>
            <TouchableOpacity 
              style={styles.guideModalBackdrop}
              activeOpacity={0.7}
              onPress={handleBackdropClose}
            />
          </Animated.View>
          
          {/* Modal Content */}
          <Animated.View
            style={[
              styles.guideModalContainer,
              {
                transform: [{ translateY: combinedTranslateY }],
                opacity: guideFadeAnim,
                backgroundColor: isDark ? theme.background : '#F8F9FD',
                height: '94%',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -8 },
                shadowOpacity: 0.4,
                shadowRadius: 20,
                elevation: 15
              }
            ]}
          >
            <View style={styles.guideDetailSafeArea}>
              {/* Drag Handle */}
              <View
                style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}
                {...guidePanResponder.panHandlers}
              >
                <View style={{
                  width: 48,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)'
                }} />
              </View>

              <ScrollView 
                style={{ flex: 1 }} 
                showsVerticalScrollIndicator={false} 
                bounces={true}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {/* Hero Header with Gradient */}
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    marginHorizontal: 20,
                    marginTop: 8,
                    marginBottom: 28,
                    borderRadius: 24,
                    padding: 28,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Decorative Background Icon */}
                  <View style={{
                    position: 'absolute',
                    top: -30,
                    right: -30,
                    opacity: 0.15,
                  }}>
                    <MaterialIcons name={themeIcon} size={180} color="#fff" />
                  </View>

                  {/* Category Badge */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    alignSelf: 'flex-start',
                    marginBottom: 18,
                  }}>
                    <MaterialIcons name={themeIcon} size={16} color="#fff" />
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: '#fff',
                      marginLeft: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      {themeCategories.find(cat => cat.id === selectedGuide.theme)?.name || selectedGuide.theme}
                    </Text>
                  </View>

                  {/* Title */}
                  <Text style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: '#fff',
                    marginBottom: 12,
                    letterSpacing: -0.5,
                    lineHeight: 34,
                  }}>
                    {selectedGuide.title}
                  </Text>

                  {/* Description */}
                  <Text style={{
                    fontSize: 16,
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 24,
                    marginBottom: 20,
                  }}>
                    {selectedGuide.hook}
                  </Text>

                  {/* Meta Row */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                    }}>
                      <MaterialIcons name="schedule" size={18} color="#fff" />
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: '#fff',
                        marginLeft: 8,
                      }}>
                        {selectedGuide.timeMinutes} min read
                      </Text>
                    </View>

                    {isCompleted && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                      }}>
                        <MaterialIcons name="check-circle" size={18} color={themeColor} />
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: themeColor,
                          marginLeft: 6,
                        }}>
                          Completed
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => onNavigateToVerse && onNavigateToVerse(selectedGuide.passage)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialIcons name="menu-book" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>

                {/* Introduction Section */}
                {selectedGuide.intro && (
                  <SectionCard icon="campaign" title="Introduction" accent>
                    <Text style={{
                      fontSize: 17,
                      color: theme.text,
                      lineHeight: 28,
                      fontStyle: 'italic',
                    }}>
                      {selectedGuide.intro}
                    </Text>
                  </SectionCard>
                )}

                {/* Bible Moments Section */}
                <SectionCard icon="auto-stories" title="Bible Moments">
                  {selectedGuide.story.map((paragraph, index) => (
                    <View key={index} style={{
                      flexDirection: 'row',
                      marginBottom: index < selectedGuide.story.length - 1 ? 20 : 0,
                    }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: themeColor,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 14,
                        marginTop: 2,
                      }}>
                        <Text style={{
                          fontSize: 16,
                          fontWeight: '700',
                          color: '#fff',
                        }}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={{
                        flex: 1,
                        fontSize: 16,
                        color: theme.text,
                        lineHeight: 26,
                      }}>
                        {paragraph}
                      </Text>
                    </View>
                  ))}
                </SectionCard>

                {/* Key Verses Section */}
                {selectedGuide.keyVerses && (
                  <SectionCard icon="menu-book" title="Key Verses" accent>
                    {selectedGuide.keyVerses.map((verseItem, index) => (
                      <View key={index} style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : `${themeColor}08`,
                        borderRadius: 16,
                        padding: 18,
                        marginBottom: index < selectedGuide.keyVerses.length - 1 ? 14 : 0,
                        borderLeftWidth: 4,
                        borderLeftColor: themeColor,
                      }}>
                        <Text style={{
                          fontSize: 17,
                          color: theme.text,
                          lineHeight: 28,
                          fontStyle: 'italic',
                          marginBottom: 12,
                        }}>
                          "{loadingDynamicVerses ? 'Loading...' : (fetchedVerses[verseItem.verse]?.text || verseItem.text)}"
                        </Text>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <Text style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: themeColor,
                          }}>
                            {verseItem.verse}
                          </Text>
                          <View style={{
                            backgroundColor: `${themeColor}20`,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 8,
                          }}>
                            <Text style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: themeColor,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}>
                              {bibleVersion}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </SectionCard>
                )}

                {/* Insights Section */}
                <SectionCard icon="lightbulb" title="Insights">
                  {selectedGuide.insights.map((insight, index) => (
                    <View key={index} style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      marginBottom: index < selectedGuide.insights.length - 1 ? 14 : 0,
                    }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: themeColor,
                        marginTop: 8,
                        marginRight: 14,
                      }} />
                      <Text style={{
                        flex: 1,
                        fontSize: 16,
                        color: theme.text,
                        lineHeight: 26,
                      }}>
                        {insight}
                      </Text>
                    </View>
                  ))}
                </SectionCard>

                {/* Reflect Section */}
                <SectionCard icon="psychology" title="Reflect" accent>
                  {selectedGuide.reflectQuestions.map((question, index) => (
                    <View key={index} style={{
                      marginBottom: index < selectedGuide.reflectQuestions.length - 1 ? 20 : 0,
                    }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: theme.text,
                        marginBottom: 12,
                        lineHeight: 24,
                      }}>
                        {question}
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F7FA',
                          borderRadius: 16,
                          padding: 16,
                          fontSize: 16,
                          color: theme.text,
                          minHeight: 100,
                          textAlignVertical: 'top',
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E8ECF2',
                        }}
                        placeholder="Write your thoughts..."
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        value={reflectionNotes[`${selectedGuide.id}-${index}`] || ''}
                        onChangeText={(text) => saveReflection(selectedGuide.id, index, text)}
                      />
                    </View>
                  ))}
                </SectionCard>

                {/* Practice Section */}
                <SectionCard icon="directions-walk" title="Practice">
                  <LinearGradient
                    colors={[`${themeColor}15`, `${themeColor}08`]}
                    style={{
                      borderRadius: 16,
                      padding: 20,
                      borderWidth: 1,
                      borderColor: `${themeColor}25`,
                    }}
                  >
                    <Text style={{
                      fontSize: 16,
                      color: theme.text,
                      lineHeight: 26,
                      fontWeight: '500',
                    }}>
                      {selectedGuide.practice}
                    </Text>
                  </LinearGradient>
                </SectionCard>

                {/* Prayer Section */}
                <SectionCard icon="self-improvement" title="Prayer" accent>
                  <View style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FEFCF8',
                    borderRadius: 16,
                    padding: 24,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5EFE6',
                  }}>
                    <MaterialIcons 
                      name="format-quote" 
                      size={32} 
                      color={`${themeColor}40`} 
                      style={{ marginBottom: 8 }}
                    />
                    <Text style={{
                      fontSize: 17,
                      color: theme.text,
                      lineHeight: 28,
                      fontStyle: 'italic',
                      textAlign: 'center',
                    }}>
                      {selectedGuide.prayer}
                    </Text>
                  </View>
                </SectionCard>

                {/* Complete Button */}
                {!isCompleted && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={{
                      marginHorizontal: 20,
                      marginTop: 8,
                      marginBottom: 20,
                      borderRadius: 20,
                      overflow: 'hidden',
                    }}
                    onPress={() => handleGuideComplete(selectedGuide.id)}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 18,
                        paddingHorizontal: 24,
                      }}
                    >
                      <MaterialIcons name="check-circle" size={24} color="#fff" />
                      <Text style={{
                        fontSize: 17,
                        fontWeight: '700',
                        color: '#fff',
                        marginLeft: 10,
                      }}>
                        Mark Complete
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {isCompleted && (
                  <View style={{
                    marginHorizontal: 20,
                    marginTop: 8,
                    marginBottom: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${themeColor}15`,
                    paddingVertical: 18,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: themeColor,
                  }}>
                    <MaterialIcons name="check-circle" size={24} color={themeColor} />
                    <Text style={{
                      fontSize: 17,
                      fontWeight: '700',
                      color: themeColor,
                      marginLeft: 10,
                    }}>
                      Guide Completed
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
        
        {/* Transparent Blurred Header - Very Light Blur with Rounded Bottom */}
        <BlurView 
          intensity={20} 
          tint={isDark ? 'dark' : 'light'} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
          <View style={[styles.solidHeader, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: 0 }]}>
            <TouchableOpacity
              onPress={onClose}
              style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                paddingHorizontal: 16, 
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>Back</Text>
            </TouchableOpacity>
            <Text style={[styles.solidHeaderTitle, { color: theme.text }]}>
              Thematic Guides
            </Text>
            <View style={{ width: 60 }} />
          </View>
          
          {/* Category Chips in Header */}
          <View style={{ paddingTop: 5, paddingBottom: 12, backgroundColor: 'transparent' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipsContainer, { paddingHorizontal: 20 }]}>
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
        </BlurView>

        {/* Simple Loading with Percentage */}
        <SimplePercentageLoader 
          isVisible={loading}
          loadingText="Loading thematic guides..."
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
          <ScrollView 
            style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 160 : 120 }]} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
                title="Pull to refresh..."
                titleColor={theme.textSecondary}
              />
            }
          >

          {/* Guides List */}
          <View style={styles.guidesSection}>
            <Text style={[styles.sectionHeaderText, { color: theme.text }]}>
              {selectedTheme === 'all' ? 'All Guides' : 
               themeCategories.find(cat => cat.id === selectedTheme)?.name + ' Guides'}
            </Text>
            
            {getFilteredGuides().map((guide, index) => renderGuideCard(guide, index))}
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
  // Guide detail modal styles
  guideModalOverlay: {
    flex: 1,
  },
  guideModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  guideModalContainer: {
    // Styles moved inline for theme support
  },
  guideDetailSafeArea: {
    flex: 1,
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
    paddingBottom: 3,
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
  versionBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
