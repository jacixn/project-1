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
import { MaterialIcons } from '@expo/vector-icons';
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
    const isFavorite = favorites.includes(fact.id);

    return (
      <Animated.View
        key={fact.id}
        style={[
          styles.factCard,
          viewMode === 'list' && styles.factCardList,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleFactPress(fact)}
        >
          <LinearGradient
            colors={category?.gradient || [theme.primary, theme.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.factCardGradient}
          >
            <View style={styles.factCardHeader}>
              <View style={[styles.factIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <MaterialIcons name={fact.icon} size={28} color="#FFFFFF" />
              </View>
              <TouchableOpacity
                onPress={() => toggleFavorite(fact.id)}
                style={styles.favoriteButton}
              >
                <MaterialIcons
                  name={isFavorite ? 'favorite' : 'favorite-border'}
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.factTitle} numberOfLines={2}>
              {fact.title}
            </Text>

            <Text style={styles.factDescription} numberOfLines={3}>
              {fact.description}
            </Text>

            <View style={styles.factFooter}>
              <View style={styles.factTags}>
                {fact.tags.slice(0, 2).map((tag, idx) => (
                  <View key={idx} style={styles.factTag}>
                    <Text style={styles.factTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Transparent Blurred Header */}
        <BlurView
          intensity={20}
          tint={isDark ? 'dark' : 'light'}
          style={styles.headerBlur}
        >
          <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }}
              style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                paddingHorizontal: 16, 
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text style={[styles.backButtonText, { color: theme.primary }]}>Back</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Fast Facts</Text>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                setViewMode(viewMode === 'grid' ? 'list' : 'grid');
              }}
              style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MaterialIcons
                name={viewMode === 'grid' ? 'view-list' : 'grid-view'}
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainerHeader, { backgroundColor: theme.card }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              ref={searchRef}
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search facts..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filters */}
          <View style={styles.categoriesContainerHeader}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {factsData?.categories?.map((category) => {
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

          {/* Random Button & Results Count */}
          <View style={{ 
            paddingHorizontal: 20, 
            paddingBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
              {filteredFacts.length} {filteredFacts.length === 1 ? 'fact' : 'facts'}
            </Text>
            
            <TouchableOpacity
              onPress={showRandomFactCard}
              style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <MaterialIcons name="shuffle" size={18} color={theme.primary} />
              <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '600' }}>
                Random
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Main Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshFacts}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {/* Facts Grid/List */}
          <View style={[styles.factsContainer, viewMode === 'list' && styles.factsContainerList]}>
            {filteredFacts.length > 0 ? (
              filteredFacts.map((fact, index) => renderFactCard(fact, index))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={64} color={theme.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No facts found
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                  Try adjusting your search or filters
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

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
  headerBlur: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    minWidth: 60,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  viewModeButton: {
    width: 48,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Platform.OS === 'ios' ? 310 : 280,
    paddingBottom: 30,
  },
  searchContainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesContainerHeader: {
    marginBottom: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  favoritesLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  factsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
  },
  factsContainerList: {
    flexDirection: 'column',
  },
  factCard: {
    width: (width - 56) / 2,
    marginBottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  factCardList: {
    width: '100%',
  },
  factCardGradient: {
    padding: 16,
    minHeight: 220,
  },
  factCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  factIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    padding: 4,
  },
  factTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 24,
  },
  factDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 12,
    lineHeight: 20,
    flex: 1,
  },
  factFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  factTags: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  factTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  factTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
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
