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
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SimplePercentageLoader from './SimplePercentageLoader';

const { width, height } = Dimensions.get('window');

// Remote Bible Facts Configuration
const FACTS_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/bible-facts.json',
  get URL() {
    if (this.GITHUB_USERNAME === 'YOUR_USERNAME') return null;
    return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.REPO_NAME}/${this.BRANCH}/${this.FILE_PATH}`;
  },
  CACHE_KEY: 'bible_facts_data_v1',
  CACHE_TIMESTAMP_KEY: 'bible_facts_timestamp_v1',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

// Category theme colors for premium design
const CATEGORY_THEMES = {
  all: { gradient: ['#6366F1', '#8B5CF6'], icon: 'auto-awesome', bgIcon: 'sparkles' },
  numbers: { gradient: ['#3B82F6', '#06B6D4'], icon: 'calculate', bgIcon: 'calculator' },
  history: { gradient: ['#F59E0B', '#EF4444'], icon: 'history-edu', bgIcon: 'time' },
  geography: { gradient: ['#10B981', '#34D399'], icon: 'public', bgIcon: 'earth' },
  people: { gradient: ['#EC4899', '#F472B6'], icon: 'people', bgIcon: 'people' },
  objects: { gradient: ['#8B5CF6', '#A78BFA'], icon: 'category', bgIcon: 'cube' },
  languages: { gradient: ['#14B8A6', '#5EEAD4'], icon: 'translate', bgIcon: 'language' },
  animals: { gradient: ['#22C55E', '#86EFAC'], icon: 'pets', bgIcon: 'paw' },
  prophecy: { gradient: ['#6366F1', '#818CF8'], icon: 'auto-stories', bgIcon: 'eye' },
  miracles: { gradient: ['#F97316', '#FBBF24'], icon: 'auto-fix-high', bgIcon: 'flash' },
};

const COLLAPSED_HEADER_HEIGHT = Platform.OS === 'ios' ? 110 : 80;
const EXPANDED_HEADER_HEIGHT = Platform.OS === 'ios' ? 290 : 260;

const BibleFastFacts = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFact, setSelectedFact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  
  // Remote data state
  const [factsData, setFactsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Random fact state
  const [showRandomFact, setShowRandomFact] = useState(false);
  const [randomFact, setRandomFact] = useState(null);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  
  const scrollViewRef = useRef(null);
  const searchRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Collapsible header animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(new Animated.Value(1)).current;
  const isScrollingDown = useRef(false);
  
  // Random fact animation refs
  const randomSpinAnim = useRef(new Animated.Value(0)).current;
  const randomScaleAnim = useRef(new Animated.Value(0)).current;
  const randomFadeAnim = useRef(new Animated.Value(0)).current;
  const randomSpinLoopRef = useRef(null);

  // Modal animation refs for detail view
  const detailSlideAnim = useRef(new Animated.Value(0)).current;
  const detailFadeAnim = useRef(new Animated.Value(0)).current;
  const detailPanY = useRef(new Animated.Value(0)).current;

  // Load data on mount
  useEffect(() => {
    if (visible) {
      loadFacts();
    }
  }, [visible]);

  // Load favorites from storage
  useEffect(() => {
    loadFavorites();
  }, []);

  // Fade in animation
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Reset pan value when modal closes
  useEffect(() => {
    if (!selectedFact) {
      detailPanY.setValue(0);
    }
  }, [selectedFact]);

  // Check if cache is valid
  const isCacheValid = async () => {
    try {
      const timestamp = await AsyncStorage.getItem(FACTS_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < FACTS_CONFIG.CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  };

  // Fetch facts from GitHub
  const fetchFactsFromRemote = async () => {
    try {
      const url = FACTS_CONFIG.URL;
      if (!url) {
        throw new Error('Remote URL not configured');
      }

      console.log('📥 Fetching Bible facts from GitHub:', url);
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      await AsyncStorage.setItem(FACTS_CONFIG.CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(FACTS_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log(`✅ Successfully fetched ${data.facts?.length || 0} Bible facts from GitHub`);
      return data;
    } catch (error) {
      console.error('❌ Error fetching Bible facts from GitHub:', error);
      throw error;
    }
  };

  // Load facts (with caching)
  const loadFacts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheValid = await isCacheValid();
      if (cacheValid) {
        const cachedData = await AsyncStorage.getItem(FACTS_CONFIG.CACHE_KEY);
        if (cachedData) {
          console.log('📦 Loading Bible facts from cache');
          setFactsData(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }

      // Fetch from remote
      const remoteData = await fetchFactsFromRemote();
      setFactsData(remoteData);
    } catch (error) {
      console.error('Error loading Bible facts:', error);
      setError('Could not load facts. Please check your internet connection.');
      
      // Try cache even if expired
      const cachedData = await AsyncStorage.getItem(FACTS_CONFIG.CACHE_KEY);
      if (cachedData) {
        console.log('📦 Using expired cache due to network error');
        setFactsData(JSON.parse(cachedData));
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh facts (force fetch from GitHub)
  const refreshFacts = async () => {
    setRefreshing(true);
    try {
      // Clear cache timestamp to force fresh fetch
      await AsyncStorage.removeItem(FACTS_CONFIG.CACHE_TIMESTAMP_KEY);
      
      // Fetch fresh data
      const remoteData = await fetchFactsFromRemote();
      setFactsData(remoteData);
      setError(null);
    } catch (error) {
      console.error('Error refreshing Bible facts:', error);
      // Keep showing current data if refresh fails
    } finally {
      setRefreshing(false);
    }
  };

  // Pan gesture handler for fact detail modal
  const detailPanResponder = useRef(
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
          detailPanY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          hapticFeedback.success();
          Animated.parallel([
            Animated.timing(detailSlideAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(detailFadeAnim, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setSelectedFact(null);
          });
        } else {
          hapticFeedback.light();
          Animated.spring(detailPanY, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animate fact detail modal in/out
  useEffect(() => {
    if (selectedFact) {
      detailSlideAnim.setValue(0);
      detailFadeAnim.setValue(0);
      
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(detailSlideAnim, {
            toValue: 1,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }),
          Animated.timing(detailFadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      detailSlideAnim.setValue(0);
      detailFadeAnim.setValue(0);
    }
  }, [selectedFact]);

  // Handle scroll for collapsible header
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        
        // Only trigger if scrolled more than threshold
        if (Math.abs(diff) > 5) {
          if (diff > 0 && currentScrollY > 50) {
            // Scrolling down - collapse header
            if (!isScrollingDown.current) {
              isScrollingDown.current = true;
              Animated.timing(headerVisible, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }).start();
            }
          } else if (diff < 0) {
            // Scrolling up - expand header
            if (isScrollingDown.current) {
              isScrollingDown.current = false;
              Animated.timing(headerVisible, {
                toValue: 1,
                duration: 200,
                useNativeDriver: false,
              }).start();
            }
          }
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('bible_fast_facts_favorites');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const saveFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem('bible_fast_facts_favorites', JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const toggleFavorite = (factId) => {
    hapticFeedback.light();
    const newFavorites = favorites.includes(factId)
      ? favorites.filter(id => id !== factId)
      : [...favorites, factId];
    saveFavorites(newFavorites);
  };

  const handleShare = async (fact) => {
    hapticFeedback.light();
    try {
      await Share.share({
        message: `📖 Bible Fast Fact\n\n${fact.title}\n\n${fact.description}\n\n💡 Did You Know? ${fact.didYouKnow}`,
        title: fact.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getRandomFact = () => {
    if (!factsData || !factsData.facts || factsData.facts.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * factsData.facts.length);
    return factsData.facts[randomIndex];
  };

  const showRandomFactCard = () => {
    hapticFeedback.medium();
    setIsLoadingRandom(true);
    setShowRandomFact(true);
    
    // Reset animations
    randomSpinLoopRef.current?.stop?.();
    randomSpinLoopRef.current = null;
    randomSpinAnim.setValue(0);
    randomScaleAnim.setValue(0);
    randomFadeAnim.setValue(0);
    
    // Start spinning animation
    randomSpinLoopRef.current = Animated.loop(
      Animated.timing(randomSpinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    randomSpinLoopRef.current.start();
    
    // Fade in the loading state
    Animated.timing(randomFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Simulate loading and pick random fact
    setTimeout(() => {
      const fact = getRandomFact();
      setRandomFact(fact);
      setIsLoadingRandom(false);
      
      // Stop spinning and show the card
      randomSpinLoopRef.current?.stop?.();
      randomSpinLoopRef.current = null;
      // Critical: ensure the card isn't left rotated at a mid-spin angle
      randomSpinAnim.setValue(0);
      
      Animated.parallel([
        Animated.spring(randomScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(randomFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500); // 1.5 second loading animation
  };

  const closeRandomFact = () => {
    hapticFeedback.light();
    randomSpinLoopRef.current?.stop?.();
    randomSpinLoopRef.current = null;
    Animated.parallel([
      Animated.timing(randomScaleAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(randomFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowRandomFact(false);
      setRandomFact(null);
      setIsLoadingRandom(false);
      randomSpinAnim.setValue(0);
    });
  };

  const showAnotherRandomFact = () => {
    hapticFeedback.medium();
    setIsLoadingRandom(true);
    
    // Quick spin out current card
    Animated.parallel([
      Animated.timing(randomScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(randomSpinAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Pick new random fact
      setTimeout(() => {
        const fact = getRandomFact();
        setRandomFact(fact);
        setIsLoadingRandom(false);
        randomSpinAnim.setValue(0);
        
        // Spin in new card
        Animated.parallel([
          Animated.spring(randomScaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(randomSpinAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start(() => {
          randomSpinAnim.setValue(0);
        });
      }, 800);
    });
  };

  const getFilteredFacts = () => {
    if (!factsData || !factsData.facts) return [];
    
    let filtered = factsData.facts;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(fact => fact.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(fact =>
        fact.title.toLowerCase().includes(query) ||
        fact.description.toLowerCase().includes(query) ||
        fact.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const handleFactPress = (fact) => {
    hapticFeedback.light();
    setSelectedFact(fact);
  };

  const renderCategoryFilters = () => {
    if (!factsData || !factsData.categories) return null;

    return (
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {factsData.categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                onPress={() => {
                  hapticFeedback.light();
                  setSelectedCategory(category.id);
                  scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected
                      ? `${category.color}20`
                      : isDark
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.05)',
                    borderColor: isSelected ? category.color : theme.border,
                  },
                ]}
              >
                <MaterialIcons
                  name={category.icon}
                  size={18}
                  color={isSelected ? category.color : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: isSelected ? category.color : theme.textSecondary,
                    },
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderFactCard = (fact, index) => {
    if (!factsData || !factsData.categories) return null;
    
    const category = factsData.categories.find(c => c.id === fact.category);
    const catTheme = CATEGORY_THEMES[fact.category] || CATEGORY_THEMES.all;
    const isFavorite = favorites.includes(fact.id);

    if (viewMode === 'list') {
      // Premium List View Card
      return (
        <Animated.View
          key={fact.id}
          style={[
            styles.listCard,
            {
              opacity: fadeAnim,
              backgroundColor: theme.card,
              shadowColor: catTheme.gradient[0],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            delayPressIn={0}
            onPress={() => handleFactPress(fact)}
            style={styles.listCardContent}
          >
            {/* Left accent bar */}
            <LinearGradient
              colors={catTheme.gradient}
              style={styles.listCardAccent}
            />
            
            {/* Icon */}
            <LinearGradient
              colors={catTheme.gradient}
              style={styles.listCardIcon}
            >
              <MaterialIcons name={fact.icon} size={24} color="#FFFFFF" />
            </LinearGradient>
            
            {/* Content */}
            <View style={styles.listCardBody}>
              <Text style={[styles.listCardTitle, { color: theme.text }]} numberOfLines={2}>
                {fact.title}
              </Text>
              <Text style={[styles.listCardDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                {fact.description}
              </Text>
              <View style={styles.listCardTags}>
                {fact.tags.slice(0, 2).map((tag, idx) => (
                  <View 
                    key={idx} 
                    style={[styles.listCardTag, { 
                      backgroundColor: `${catTheme.gradient[0]}15`,
                    }]}
                  >
                    <Text style={[styles.listCardTagText, { color: catTheme.gradient[0] }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Favorite button */}
            <TouchableOpacity
              onPress={() => toggleFavorite(fact.id)}
              activeOpacity={0.7}
              delayPressIn={0}
              style={styles.listCardFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? '#EC4899' : theme.textSecondary}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    // Premium Grid View Card
    return (
      <Animated.View
        key={fact.id}
        style={[
          styles.gridCard,
          {
            opacity: fadeAnim,
            shadowColor: catTheme.gradient[0],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          delayPressIn={0}
          onPress={() => handleFactPress(fact)}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={catTheme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gridCardGradient}
          >
            {/* Background decorative icon */}
            <View style={styles.gridCardBgIcon}>
              <Ionicons 
                name={catTheme.bgIcon || 'sparkles'} 
                size={80} 
                color="rgba(255,255,255,0.08)" 
              />
            </View>
            
            {/* Header */}
            <View style={styles.gridCardHeader}>
              <View style={styles.gridCardIconContainer}>
                <MaterialIcons name={fact.icon} size={26} color="#FFFFFF" />
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(fact.id)}
                activeOpacity={0.7}
                delayPressIn={0}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.gridCardFavorite}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={styles.gridCardTitle} numberOfLines={2}>
              {fact.title}
            </Text>

            {/* Description */}
            <Text style={styles.gridCardDescription} numberOfLines={3}>
              {fact.description}
            </Text>

            {/* Tags */}
            <View style={styles.gridCardTags}>
              {fact.tags.slice(0, 2).map((tag, idx) => (
                <View key={idx} style={styles.gridCardTag}>
                  <Text style={styles.gridCardTagText}>{tag}</Text>
                </View>
              ))}
            </View>
            
            {/* Arrow indicator */}
            <View style={styles.gridCardArrow}>
              <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFactDetail = () => {
    if (!selectedFact || !factsData) return null;

    const category = factsData.categories.find(c => c.id === selectedFact.category);
    const isFavorite = favorites.includes(selectedFact.id);

    const modalTranslateY = detailSlideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1000, 0],
    });

    const combinedTranslateY = Animated.add(modalTranslateY, detailPanY);

    const handleBackdropClose = () => {
      Animated.parallel([
        Animated.timing(detailSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(detailFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSelectedFact(null);
      });
    };

    return (
      <Modal
        visible={!!selectedFact}
        transparent={true}
        animationType="none"
        onRequestClose={handleBackdropClose}
        statusBarTranslucent={true}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
          {/* Backdrop */}
          <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: detailFadeAnim }}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={0.7}
              onPress={handleBackdropClose}
            />
          </Animated.View>

          {/* Modal Content */}
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: combinedTranslateY }],
                opacity: detailFadeAnim,
                backgroundColor: theme.background,
                maxHeight: '85%',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 10,
              },
            ]}
          >
            <View style={styles.detailSafeArea}>
              {/* Drag Handle */}
              <View
                style={[styles.modalHandle, { paddingTop: 12, paddingBottom: 4 }]}
                {...detailPanResponder.panHandlers}
              >
                <View
                  style={[
                    styles.handleBar,
                    {
                      width: 40,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)',
                    },
                  ]}
                />
              </View>

              {/* Header */}
              <View
                style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
                {...detailPanResponder.panHandlers}
              >
                <View style={{ width: 40 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                  Fast Fact
                </Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView
                style={styles.detailContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Fact Hero with Gradient */}
                <LinearGradient
                  colors={category?.gradient || [theme.primary, theme.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.factHero}
                >
                  <View style={styles.factHeroContent}>
                    <View style={[styles.factHeroIconContainer, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <MaterialIcons name={selectedFact.icon} size={48} color="#FFFFFF" />
                    </View>

                    <Text style={styles.factHeroTitle}>{selectedFact.title}</Text>

                    <View style={styles.factHeroBadge}>
                      <MaterialIcons name={category?.icon} size={16} color="#FFFFFF" />
                      <Text style={styles.factHeroBadgeText}>{category?.name}</Text>
                    </View>

                    <View style={styles.factHeroActions}>
                      <TouchableOpacity
                        onPress={() => toggleFavorite(selectedFact.id)}
                        style={[styles.factHeroActionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                      >
                        <MaterialIcons
                          name={isFavorite ? 'favorite' : 'favorite-border'}
                          size={24}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleShare(selectedFact)}
                        style={[styles.factHeroActionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                      >
                        <MaterialIcons name="share" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>

                {/* Did You Know Section */}
                <View style={styles.detailContentContainer}>
                  <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                    <View style={styles.detailSectionHeader}>
                      <MaterialIcons name="lightbulb" size={24} color={category?.color} />
                      <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                        Did You Know?
                      </Text>
                    </View>
                    <Text style={[styles.detailDescription, { color: theme.text }]}>
                      {selectedFact.description}
                    </Text>
                  </View>

                  {/* The Fact Section */}
                  <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                    <View style={styles.detailSectionHeader}>
                      <MaterialIcons name="info" size={24} color={theme.primary} />
                      <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                        The Fact
                      </Text>
                    </View>
                    <Text style={[styles.detailDidYouKnow, { color: theme.text }]}>
                      {selectedFact.didYouKnow}
                    </Text>
                  </View>

                  {/* Tags Section */}
                  <View style={[styles.detailSection, { backgroundColor: theme.card }]}>
                    <View style={styles.detailSectionHeader}>
                      <MaterialIcons name="label" size={24} color={theme.textSecondary} />
                      <Text style={[styles.detailSectionTitle, { color: theme.text }]}>
                        Tags
                      </Text>
                    </View>
                    <View style={styles.detailTagsContainer}>
                      {selectedFact.tags.map((tag, idx) => (
                        <View
                          key={idx}
                          style={[styles.detailTag, { backgroundColor: `${category?.color}20` }]}
                        >
                          <Text style={[styles.detailTagText, { color: category?.color }]}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const filteredFacts = getFilteredFacts();

  // Loading state
  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <SimplePercentageLoader 
            isVisible={true}
            loadingText="Loading Bible facts..."
          />
        </View>
      </Modal>
    );
  }

  // Error state
  if (error && !factsData) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          
          <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 70 : 30 }]}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Fast Facts</Text>
            <TouchableOpacity onPress={refreshFacts}>
              <MaterialIcons name="refresh" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.errorContent}>
            <MaterialIcons name="cloud-off" size={64} color={theme.textSecondary} />
            <Text style={[styles.errorTitle, { color: theme.text }]}>Unable to Load Facts</Text>
            <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: theme.primary }]} 
              onPress={refreshFacts}
            >
              <Text style={[styles.retryButtonText, { color: theme.background }]}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Get current category theme
  const currentCategoryTheme = CATEGORY_THEMES[selectedCategory] || CATEGORY_THEMES.all;
  
  // Animated header height
  const headerHeight = headerVisible.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_HEADER_HEIGHT, EXPANDED_HEADER_HEIGHT],
    extrapolate: 'clamp',
  });
  
  // Animated content padding
  const contentPaddingTop = headerVisible.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_HEADER_HEIGHT + 20, EXPANDED_HEADER_HEIGHT + 20],
    extrapolate: 'clamp',
  });
  
  // Animated opacity for collapsible sections
  const expandedOpacity = headerVisible.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Collapsible Header */}
        <Animated.View style={[styles.headerContainer, { height: headerHeight }]}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(30,30,40,0.98)', 'rgba(30,30,40,0.95)']
              : ['rgba(255,255,255,0.98)', 'rgba(248,250,252,0.95)']
            }
            style={styles.headerGradient}
          >
            {/* Safe area spacer */}
            <View style={{ height: Platform.OS === 'ios' ? 55 : 25 }} />
            
            {/* Fixed Header Row - Always visible */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  onClose();
                }}
                activeOpacity={0.7}
                delayPressIn={0}
                style={[styles.backButton, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.1)',
                }]}
              >
                <Ionicons name="chevron-back" size={20} color={theme.primary} />
                <Text style={[styles.backButtonText, { color: theme.primary }]}>Back</Text>
              </TouchableOpacity>
              
              <Text style={[styles.headerTitle, { color: theme.text }]}>Fast Facts</Text>
              
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid');
                }}
                activeOpacity={0.7}
                delayPressIn={0}
                style={[styles.viewModeBtn, { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.1)',
                }]}
              >
                <MaterialIcons
                  name={viewMode === 'grid' ? 'view-list' : 'grid-view'}
                  size={22}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Expandable Section */}
            <Animated.View style={{ opacity: expandedOpacity, overflow: 'hidden' }}>
              {/* Search Bar */}
              <View style={[styles.searchBar, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              }]}>
                <Ionicons name="search" size={18} color={theme.textSecondary} />
                <TextInput
                  ref={searchRef}
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search facts, topics, or keywords..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setSearchQuery('')}
                    activeOpacity={0.7}
                    style={styles.clearSearchBtn}
                  >
                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesScroll}
                style={styles.categoriesContainer}
              >
                {factsData?.categories?.map((category) => {
                  const isSelected = selectedCategory === category.id;
                  const catTheme = CATEGORY_THEMES[category.id] || CATEGORY_THEMES.all;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => {
                        hapticFeedback.light();
                        setSelectedCategory(category.id);
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      }}
                      activeOpacity={0.7}
                      delayPressIn={0}
                      style={styles.categoryChipWrapper}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={catTheme.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.categoryChipGradient}
                        >
                          <MaterialIcons name={category.icon} size={16} color="#FFFFFF" />
                          <Text style={styles.categoryChipTextActive}>{category.name}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={[styles.categoryChipInactive, {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        }]}>
                          <MaterialIcons name={category.icon} size={16} color={theme.textSecondary} />
                          <Text style={[styles.categoryChipTextInactive, { color: theme.textSecondary }]}>
                            {category.name}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Results Count & Random */}
              <View style={styles.resultsRow}>
                <View style={styles.resultsCountContainer}>
                  <Text style={[styles.resultsCount, { color: theme.text }]}>
                    {filteredFacts.length}
                  </Text>
                  <Text style={[styles.resultsLabel, { color: theme.textSecondary }]}>
                    {filteredFacts.length === 1 ? 'fact' : 'facts'}
                  </Text>
                </View>
                
                <View style={styles.resultsActions}>
                  <TouchableOpacity
                    onPress={showRandomFactCard}
                    activeOpacity={0.7}
                    delayPressIn={0}
                    style={styles.randomButton}
                  >
                    <LinearGradient
                      colors={currentCategoryTheme.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.randomButtonGradient}
                    >
                      <MaterialIcons name="shuffle" size={16} color="#FFFFFF" />
                      <Text style={styles.randomButtonText}>Random</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <View style={[styles.favoritesCount, {
                    backgroundColor: isDark ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.1)',
                  }]}>
                    <Ionicons name="heart" size={14} color="#EC4899" />
                    <Text style={{ color: '#EC4899', fontSize: 13, fontWeight: '600' }}>
                      {favorites.length}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </LinearGradient>
          
          {/* Bottom border accent */}
          <LinearGradient
            colors={currentCategoryTheme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerBottomAccent}
          />
        </Animated.View>

        {/* Main Content */}
        <Animated.ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.contentContainer, { paddingTop: EXPANDED_HEADER_HEIGHT + 20 }]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshFacts}
              tintColor={theme.primary}
              colors={[theme.primary]}
              progressViewOffset={EXPANDED_HEADER_HEIGHT}
            />
          }
        >
          {/* Facts Grid/List */}
          <View style={[styles.factsContainer, viewMode === 'list' && styles.factsContainerList]}>
            {filteredFacts.length > 0 ? (
              filteredFacts.map((fact, index) => renderFactCard(fact, index))
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyStateIcon, { backgroundColor: `${theme.primary}15` }]}>
                  <MaterialIcons name="search-off" size={48} color={theme.primary} />
                </View>
                <Text style={[styles.emptyStateText, { color: theme.text }]}>
                  No facts found
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                  Try adjusting your search or filters
                </Text>
              </View>
            )}
          </View>
        </Animated.ScrollView>

        {/* Fact Detail Modal */}
        {renderFactDetail()}

        {/* Random Fact Modal */}
        {showRandomFact && (
          <Modal
            visible={showRandomFact}
            transparent={true}
            animationType="none"
            onRequestClose={closeRandomFact}
            statusBarTranslucent={true}
          >
            <View style={styles.randomModalOverlay}>
              {/* Backdrop */}
              <TouchableOpacity 
                style={styles.randomModalBackdrop}
                activeOpacity={0.7}
                onPress={closeRandomFact}
              />
              
              {/* Random Fact Card */}
              <Animated.View
                style={[
                  styles.randomFactContainer,
                  {
                    opacity: randomFadeAnim,
                    transform: [
                      { scale: randomScaleAnim },
                      {
                        rotate: randomSpinAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {isLoadingRandom ? (
                  // Loading State
                  <BlurView
                    intensity={80}
                    tint={isDark ? 'dark' : 'light'}
                    style={styles.randomLoadingCard}
                  >
                    <View style={[styles.randomLoadingIcon, { backgroundColor: `${theme.primary}30` }]}>
                      <MaterialIcons name="auto-awesome" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.randomLoadingText, { color: theme.text }]}>
                      Finding a random fact...
                    </Text>
                  </BlurView>
                ) : randomFact ? (
                  // Fact Card
                  <View style={[styles.randomFactCard, { backgroundColor: theme.background }]}>
                    {/* Close Button */}
                    <TouchableOpacity
                      onPress={closeRandomFact}
                      style={[styles.randomCloseButton, { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                      }]}
                    >
                      <MaterialIcons name="close" size={20} color={theme.text} />
                    </TouchableOpacity>

                    {/* Fact Content with Gradient */}
                    <LinearGradient
                      colors={factsData?.categories?.find(c => c.id === randomFact.category)?.gradient || [theme.primary, theme.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.randomFactGradient}
                    >
                      <View style={[styles.randomFactIconContainer, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                        <MaterialIcons name={randomFact.icon} size={40} color="#FFFFFF" />
                      </View>

                      <Text style={styles.randomFactTitle}>{randomFact.title}</Text>
                    </LinearGradient>

                    {/* Fact Details */}
                    <ScrollView style={styles.randomFactContent} showsVerticalScrollIndicator={false}>
                      <View style={[styles.randomFactSection, { backgroundColor: theme.card }]}>
                        <Text style={[styles.randomFactLabel, { color: theme.textSecondary }]}>
                          Did You Know?
                        </Text>
                        <Text style={[styles.randomFactDescription, { color: theme.text }]}>
                          {randomFact.description}
                        </Text>
                      </View>

                      <View style={[styles.randomFactSection, { backgroundColor: theme.card }]}>
                        <Text style={[styles.randomFactLabel, { color: theme.textSecondary }]}>
                          The Fact
                        </Text>
                        <Text style={[styles.randomFactDidYouKnow, { color: theme.text }]}>
                          {randomFact.didYouKnow}
                        </Text>
                      </View>

                      {/* Tags */}
                      <View style={styles.randomFactTags}>
                        {randomFact.tags?.map((tag, idx) => (
                          <View
                            key={idx}
                            style={[styles.randomFactTag, { 
                              backgroundColor: `${factsData?.categories?.find(c => c.id === randomFact.category)?.color}20`,
                              borderColor: `${factsData?.categories?.find(c => c.id === randomFact.category)?.color}40`,
                            }]}
                          >
                            <Text style={[styles.randomFactTagText, { 
                              color: factsData?.categories?.find(c => c.id === randomFact.category)?.color 
                            }]}>
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>

                    {/* Show Another Button */}
                    <TouchableOpacity
                      onPress={showAnotherRandomFact}
                      style={[styles.randomAnotherButton, { 
                        backgroundColor: theme.primary,
                      }]}
                    >
                      <MaterialIcons name="shuffle" size={24} color="#FFFFFF" />
                      <Text style={styles.randomAnotherButtonText}>
                        Show Another Random Fact
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </Animated.View>
            </View>
          </Modal>
        )}
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
  },
  errorContainer: {
    flex: 1,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // New Collapsible Header Styles
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerBottomAccent: {
    height: 2,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 2,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  viewModeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryChipWrapper: {
    marginRight: 8,
  },
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryChipInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  categoryChipTextInactive: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  resultsCountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  resultsCount: {
    fontSize: 24,
    fontWeight: '800',
  },
  resultsLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  randomButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  randomButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  randomButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  favoritesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  factsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  factsContainerList: {
    flexDirection: 'column',
    gap: 10,
  },
  // Premium Grid Card Styles
  gridCard: {
    width: (width - 44) / 2,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  gridCardGradient: {
    padding: 16,
    minHeight: 200,
    position: 'relative',
  },
  gridCardBgIcon: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    opacity: 0.8,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gridCardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardFavorite: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 20,
  },
  gridCardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
    flex: 1,
    marginBottom: 10,
  },
  gridCardTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  gridCardTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gridCardTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gridCardArrow: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Premium List Card Styles
  listCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  listCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  listCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  listCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardBody: {
    flex: 1,
    gap: 4,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  listCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  listCardTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  listCardTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listCardTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  listCardFavorite: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    width: '100%',
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
  },
  // Detail Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
  },
  detailSafeArea: {
    flex: 1,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  factHero: {
    padding: 30,
  },
  factHeroContent: {
    alignItems: 'center',
  },
  factHeroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  factHeroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 32,
    textAlign: 'center',
  },
  factHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 20,
  },
  factHeroBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  factHeroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  factHeroActionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailContentContainer: {
    padding: 20,
  },
  detailSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailDidYouKnow: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  detailTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Random Fact Modal Styles
  randomModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  randomModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  randomFactContainer: {
    width: width - 40,
    maxHeight: height * 0.75,
  },
  randomLoadingCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  randomLoadingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  randomLoadingText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  randomFactCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  randomCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  randomFactGradient: {
    padding: 30,
    alignItems: 'center',
  },
  randomFactIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  randomFactTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
  },
  randomFactContent: {
    maxHeight: 300,
    padding: 20,
  },
  randomFactSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  randomFactLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  randomFactDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  randomFactDidYouKnow: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  randomFactTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  randomFactTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  randomFactTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  randomAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  randomAnotherButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default BibleFastFacts;
