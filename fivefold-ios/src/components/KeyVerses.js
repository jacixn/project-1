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
  Share,
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

const { width, height } = Dimensions.get('window');

  // Configuration for remote verses
const VERSES_CONFIG = {
  // Replace with your GitHub username and repository name
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/verses.json',
  
  // Remote URL - will be null if not configured yet
  get URL() {
    if (this.GITHUB_USERNAME === 'YOUR_USERNAME') {
      return null; // Not configured yet
    }
    return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.REPO_NAME}/${this.BRANCH}/${this.FILE_PATH}`;
  },
  
  // Cache settings
  CACHE_KEY: 'cached_verses_data_v7', // Fixed GitHub URL - force cache refresh with 360 verses
  CACHE_TIMESTAMP_KEY: 'verses_cache_timestamp_v7', // Fixed GitHub URL - force cache refresh with 360 verses
  CACHE_DURATION: 0, // Temporarily disable cache to force fresh fetch of 360 verses
};

const KeyVerses = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New state for remote data
  const [versesData, setVersesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favoriteVerses, setFavoriteVerses] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const scrollViewRef = useRef(null);
  const searchRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Function to check if cache is still valid
  const isCacheValid = async () => {
    try {
      const timestamp = await getStoredData(VERSES_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const now = Date.now();
      const cacheAge = now - parseInt(timestamp);
      return cacheAge < VERSES_CONFIG.CACHE_DURATION;
    } catch (error) {
      console.warn('Error checking cache validity:', error);
      return false;
    }
  };

  // Function to fetch verses from GitHub
  const fetchVersesFromRemote = async () => {
    try {
      console.log('Fetching verses from:', VERSES_CONFIG.URL);
      const response = await fetch(VERSES_CONFIG.URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate the data structure
      if (!data.verses || !data.categories) {
        throw new Error('Invalid data structure received from server');
      }
      
      // Cache the data
      await saveData(VERSES_CONFIG.CACHE_KEY, data);
      await saveData(VERSES_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log(`Successfully fetched and cached ${data.metadata?.totalVerses || 'unknown'} verses`);
      return data;
    } catch (error) {
      console.error('Error fetching verses from remote:', error);
      throw error;
    }
  };

  // Function to load local fallback data
  const loadLocalFallbackData = async () => {
    try {
      // For now, we'll use a minimal fallback dataset
      // In a real app, you might want to bundle a local verses.json file
      const fallbackData = {
        categories: [
          {
            id: 'faith',
            name: 'Faith & Trust',
            color: '#4A90E2',
            icon: 'favorite',
            gradient: ['#4A90E2', '#357ABD']
          },
          {
            id: 'hope',
            name: 'Hope & Encouragement',
            color: '#50C878',
            icon: 'star',
            gradient: ['#50C878', '#3A9B5C']
          },
          {
            id: 'love',
            name: 'Love & Relationships',
            color: '#FF6B6B',
            icon: 'favorite',
            gradient: ['#FF6B6B', '#E55555']
          }
        ],
        verses: {
          love: [
            {
              id: 'john-3-16',
              text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
              reference: 'John 3:16',
              category: 'love',
              theme: 'God\'s Love',
              keywords: ['love', 'eternal life', 'salvation', 'believe'],
              context: 'Jesus explaining God\'s love to Nicodemus',
              relatedVerses: ['Romans 5:8', '1 John 4:9-10']
            }
          ],
          hope: [
            {
              id: 'romans-8-28',
              text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
              reference: 'Romans 8:28',
              category: 'hope',
              theme: 'God\'s Sovereignty',
              keywords: ['good', 'purpose', 'called', 'love God'],
              context: 'Paul\'s teaching on life in the Spirit',
              relatedVerses: ['Jeremiah 29:11', 'Romans 8:31-39']
            }
          ],
          faith: [
            {
              id: 'philippians-4-13',
              text: 'I can do all this through him who gives me strength.',
              reference: 'Philippians 4:13',
              category: 'faith',
              theme: 'Strength in Christ',
              keywords: ['strength', 'can do', 'through Christ'],
              context: 'Paul\'s contentment in all circumstances',
              relatedVerses: ['2 Corinthians 12:9', 'Isaiah 40:31']
            }
          ]
        },
        metadata: {
          version: '1.0.0-fallback',
          lastUpdated: new Date().toISOString(),
          totalCategories: 3,
          totalVerses: 3
        }
      };
      
      setVersesData(fallbackData);
      console.log('Loaded local fallback data successfully');
    } catch (error) {
      setError('Failed to load verse data');
    }
  };

  // Function to load verses (from cache or remote)
  const loadVerses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if GitHub is configured
      if (!VERSES_CONFIG.URL) {
        console.log('GitHub not configured yet, loading from local fallback...');
        await loadLocalFallbackData();
        return;
      }
      
      // Check if we have valid cached data
      const cacheValid = await isCacheValid();
      
      if (cacheValid) {
        console.log('Loading verses from cache...');
        const cachedData = await getStoredData(VERSES_CONFIG.CACHE_KEY);
        if (cachedData) {
          setVersesData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      // Fetch from remote if no valid cache
      console.log('Cache invalid or missing, fetching from remote...');
      const remoteData = await fetchVersesFromRemote();
      setVersesData(remoteData);
      
    } catch (error) {
      // Try to load from cache as fallback
      try {
        console.log('Attempting to load from cache as fallback...');
        const cachedData = await getStoredData(VERSES_CONFIG.CACHE_KEY);
        if (cachedData) {
          setVersesData(cachedData);
          setError('Using offline data - check your internet connection');
        } else {
          console.log('No cache available, loading local fallback...');
          await loadLocalFallbackData();
          setError('Using local data - GitHub repository not configured');
        }
      } catch (cacheError) {
        await loadLocalFallbackData();
        setError('Using local data - GitHub repository not configured');
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh verses (force fetch from remote)
  const refreshVerses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear cache first to force fresh fetch
      await saveData(VERSES_CONFIG.CACHE_KEY, null);
      await saveData(VERSES_CONFIG.CACHE_TIMESTAMP_KEY, null);
      
      const remoteData = await fetchVersesFromRemote();
      setVersesData(remoteData);
      Alert.alert('Success', 'Verses updated successfully!');
    } catch (error) {
      console.error('Error refreshing verses:', error);
      Alert.alert('Error', 'Failed to refresh verses. Please try again later.');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Load verses and favorites when component mounts
  useEffect(() => {
    const initializeData = async () => {
      // Load verses from remote/cache
      await loadVerses();
      
      // Load favorites
      try {
        const savedFavorites = await getStoredData('favoriteVerses');
        if (savedFavorites) {
          setFavoriteVerses(savedFavorites);
        }
      } catch (error) {
        console.error('Error loading favorite verses:', error);
      }
    };

    if (visible) {
      initializeData();
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  // Categories with beautiful colors and icons
  // Get categories from loaded data and add 'all' category
  const categories = [
    { id: 'all', name: 'All Verses', color: theme.primary, icon: 'auto-awesome', gradient: ['#667eea', '#764ba2'] },
    ...(versesData?.categories || [])
  ];

  // Get all verses from loaded data
  const keyVerses = versesData ? Object.values(versesData.verses).flat() : [];

  const getFilteredVerses = () => {
    let filtered = keyVerses;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(verse => verse.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(verse => 
        verse.text.toLowerCase().includes(query) ||
        verse.reference.toLowerCase().includes(query) ||
        verse.theme.toLowerCase().includes(query) ||
        verse.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  const toggleFavorite = async (verseId) => {
    const newFavorites = favoriteVerses.includes(verseId)
      ? favoriteVerses.filter(id => id !== verseId)
      : [...favoriteVerses, verseId];
    
    setFavoriteVerses(newFavorites);
    
    try {
      await saveData('favoriteVerses', newFavorites);
    } catch (error) {
      console.error('Error saving favorite verses:', error);
    }
    
    hapticFeedback.light();
  };

  const shareVerse = async (verse) => {
    try {
      await Share.share({
        message: `"${verse.text}"\n\n${verse.reference}\n\nShared from Biblely`,
        title: verse.reference,
      });
    } catch (error) {
      console.error('Error sharing verse:', error);
    }
  };

  const renderCategoryChip = (category) => {
    const isSelected = selectedCategory === category.id;
    
    return (
      <TouchableOpacity
        key={category.id}
        onPress={() => {
          setSelectedCategory(category.id);
          hapticFeedback.light();
        }}
        style={[
          styles.categoryChip,
          {
            backgroundColor: isSelected ? category.color : theme.surface,
            borderColor: isSelected ? category.color : theme.border,
          }
        ]}
      >
        <LinearGradient
          colors={isSelected ? category.gradient : [theme.surface, theme.surface]}
          style={styles.categoryChipGradient}
        >
          <MaterialIcons 
            name={category.icon} 
            size={16} 
            color={isSelected ? '#FFFFFF' : theme.text} 
          />
          <Text style={[
            styles.categoryChipText,
            { color: isSelected ? '#FFFFFF' : theme.text }
          ]}>
            {category.name}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderVerseCard = (verse, index) => {
    const isFavorite = favoriteVerses.includes(verse.id);
    const category = categories.find(cat => cat.id === verse.category);
    
    if (viewMode === 'grid') {
      return (
        <Animated.View
          key={verse.id}
          style={[
            styles.verseCardGrid,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              transform: [
                {
                  scale: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  })
                }
              ],
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              setSelectedVerse(verse);
              hapticFeedback.light();
            }}
            style={styles.verseCardGridContent}
          >
            {/* Category header */}
            <LinearGradient
              colors={category?.gradient || [theme.primary, theme.primaryDark]}
              style={styles.categoryHeader}
            >
              <MaterialIcons name={category?.icon || 'auto-awesome'} size={16} color="#FFFFFF" />
              <Text style={styles.categoryHeaderText} numberOfLines={1}>
                {category?.name || 'Verse'}
              </Text>
            </LinearGradient>
            
            {/* Verse content */}
            <View style={styles.verseGridContent}>
              <Text style={[styles.verseTextGrid, { color: theme.text }]} numberOfLines={4}>
                "{verse.text}"
              </Text>
              
              <View style={styles.verseGridFooter}>
                <Text style={[styles.verseReferenceGrid, { color: category?.color || theme.primary }]}>
                  {verse.reference}
                </Text>
                
                <View style={styles.verseActionsGrid}>
                  <TouchableOpacity
                    onPress={() => toggleFavorite(verse.id)}
                    style={styles.actionButtonGrid}
                  >
                    <MaterialIcons 
                      name={isFavorite ? 'favorite' : 'favorite-border'} 
                      size={18} 
                      color={isFavorite ? '#E91E63' : theme.textSecondary} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => shareVerse(verse)}
                    style={styles.actionButtonGrid}
                  >
                    <MaterialIcons 
                      name="share" 
                      size={18} 
                      color={theme.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    }
    
    // List view (original design)
    return (
      <Animated.View
        key={verse.id}
        style={[
          styles.verseCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            transform: [
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })
              }
            ],
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            setSelectedVerse(verse);
            hapticFeedback.light();
          }}
          style={styles.verseCardContent}
        >
          {/* Category indicator */}
          <LinearGradient
            colors={category?.gradient || [theme.primary, theme.primaryDark]}
            style={styles.categoryIndicator}
          />
          
          {/* Verse content */}
          <View style={styles.verseContent}>
            <Text style={[styles.verseText, { color: theme.text }]} numberOfLines={3}>
              "{verse.text}"
            </Text>
            
            <View style={styles.verseFooter}>
              <View>
                <Text style={[styles.verseReference, { color: category?.color || theme.primary }]}>
                  {verse.reference}
                </Text>
                <Text style={[styles.verseTheme, { color: theme.textSecondary }]}>
                  {verse.theme}
                </Text>
              </View>
              
              <View style={styles.verseActions}>
                <TouchableOpacity
                  onPress={() => toggleFavorite(verse.id)}
                  style={styles.actionButton}
                >
                  <MaterialIcons 
                    name={isFavorite ? 'favorite' : 'favorite-border'} 
                    size={20} 
                    color={isFavorite ? '#E91E63' : theme.textSecondary} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => shareVerse(verse)}
                  style={styles.actionButton}
                >
                  <MaterialIcons 
                    name="share" 
                    size={20} 
                    color={theme.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderVerseDetail = () => {
    if (!selectedVerse) return null;
    
    const category = categories.find(cat => cat.id === selectedVerse.category);
    const isFavorite = favoriteVerses.includes(selectedVerse.id);
    
    return (
      <Modal
        visible={!!selectedVerse}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedVerse(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.background }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
          
          {/* Modal Handle */}
          <View style={styles.modalHandle}>
            <View style={[styles.handleBar, { backgroundColor: theme.textSecondary }]} />
          </View>
          
          {/* Header */}
          <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={{ width: 40 }} />
            <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
              Key Verse
            </Text>
            <TouchableOpacity
              onPress={() => shareVerse(selectedVerse)}
              style={styles.closeButton}
            >
              <MaterialIcons name="share" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.verseDetailContent} showsVerticalScrollIndicator={false}>
            {/* Verse Hero */}
            <LinearGradient
              colors={category?.gradient || [theme.primary, theme.primaryDark]}
              style={styles.verseHero}
            >
              <View style={styles.verseHeroContent}>
                <Text style={styles.verseDetailText}>
                  "{selectedVerse.text}"
                </Text>
                
                <View style={styles.verseDetailFooter}>
                  <Text style={styles.verseDetailReference}>
                    {selectedVerse.reference}
                  </Text>
                  
                  <TouchableOpacity
                    onPress={() => toggleFavorite(selectedVerse.id)}
                    style={[styles.favoriteButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                  >
                    <MaterialIcons 
                      name={isFavorite ? 'favorite' : 'favorite-border'} 
                      size={24} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
            
            {/* Context Section */}
            <View style={styles.contextSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="info" size={24} color={category?.color || theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Context</Text>
              </View>
              <Text style={[styles.contextText, { color: theme.text }]}>
                {selectedVerse.context}
              </Text>
            </View>
            
            {/* Theme Section */}
            <View style={styles.contextSection}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="category" size={24} color={category?.color || theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Theme</Text>
              </View>
              <View style={[styles.themeTag, { backgroundColor: category?.color + '20', borderColor: category?.color }]}>
                <Text style={[styles.themeTagText, { color: category?.color }]}>
                  {selectedVerse.theme}
                </Text>
              </View>
            </View>
            
            {/* Related Verses */}
            {selectedVerse.relatedVerses && selectedVerse.relatedVerses.length > 0 && (
              <View style={styles.contextSection}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="link" size={24} color={category?.color || theme.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Related Verses</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedVerses}>
                  {selectedVerse.relatedVerses.map(relatedId => {
                    const relatedVerse = keyVerses.find(v => v.id === relatedId);
                    if (!relatedVerse) return null;
                    
                    return (
                      <TouchableOpacity
                        key={relatedId}
                        onPress={() => setSelectedVerse(relatedVerse)}
                        style={[styles.relatedVerseCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      >
                        <Text style={[styles.relatedVerseText, { color: theme.text }]} numberOfLines={2}>
                          "{relatedVerse.text.substring(0, 80)}..."
                        </Text>
                        <Text style={[styles.relatedVerseRef, { color: category?.color || theme.primary }]}>
                          {relatedVerse.reference}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const filteredVerses = getFilteredVerses();

  // Loading state
  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false}>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} />
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading verses...</Text>
        </View>
      </Modal>
    );
  }

  // Error state
  if (error && !versesData) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false}>
        <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} />
          
          {/* Header with close button */}
          <View style={[styles.header, { backgroundColor: theme.surface, paddingTop: Platform.OS === 'ios' ? 70 : 30 }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Key Verses</Text>
            <TouchableOpacity onPress={refreshVerses} style={styles.closeButton}>
              <MaterialIcons name="refresh" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.errorContent}>
            <MaterialIcons name="cloud-off" size={64} color={theme.textSecondary} />
            <Text style={[styles.errorTitle, { color: theme.text }]}>Unable to Load Verses</Text>
            <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: theme.primary }]} 
              onPress={refreshVerses}
            >
              <Text style={[styles.retryButtonText, { color: theme.background }]}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} />
        
        {/* Show error banner if using offline data */}
        {error && versesData && (
          <View style={[styles.errorBanner, { backgroundColor: theme.warning || '#FF9800' }]}>
            <MaterialIcons name="wifi-off" size={16} color="#fff" />
            <Text style={styles.errorBannerText}>Offline mode - {error}</Text>
          </View>
        )}
        
        {/* Header with proper status bar spacing */}
        <View style={[styles.header, { backgroundColor: theme.surface, paddingTop: Platform.OS === 'ios' ? 70 : 30 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Key Verses</Text>
          <TouchableOpacity 
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={styles.closeButton}
          >
            <MaterialIcons 
              name={viewMode === 'grid' ? 'view-list' : 'view-module'} 
              size={24} 
              color={theme.text} 
            />
          </TouchableOpacity>
        </View>
        
        <Animated.View 
          style={[
            styles.content, 
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
            <MaterialIcons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              ref={searchRef}
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search verses, themes, or references..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="clear" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Categories */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map(renderCategoryChip)}
          </ScrollView>
          
          {/* Results Count */}
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
              {filteredVerses.length} {filteredVerses.length === 1 ? 'verse' : 'verses'}
              {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
            </Text>
            
            {favoriteVerses.length > 0 && (
              <TouchableOpacity
                onPress={() => setSelectedCategory(selectedCategory === 'favorites' ? 'all' : 'favorites')}
                style={[styles.favoritesButton, { backgroundColor: theme.surface }]}
              >
                <MaterialIcons name="favorite" size={16} color="#E91E63" />
                <Text style={[styles.favoritesButtonText, { color: theme.text }]}>
                  {favoriteVerses.length}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Verses Grid/List */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.versesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={viewMode === 'grid' ? styles.versesContentGrid : styles.versesContent}
          >
            {viewMode === 'grid' ? (
              <View style={styles.gridContainer}>
                {filteredVerses.map((verse, index) => renderVerseCard(verse, index))}
              </View>
            ) : (
              filteredVerses.map((verse, index) => renderVerseCard(verse, index))
            )}
            
            {filteredVerses.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="search-off" size={48} color={theme.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                  No verses found
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
                  Try adjusting your search or category filter
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
        
        {/* Verse Detail Modal */}
        {renderVerseDetail()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  categoriesContainer: {
    marginTop: 20,
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  categoryChip: {
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    height: 36,
  },
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    height: 34,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  favoritesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  favoritesButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  versesContainer: {
    flex: 1,
  },
  versesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  versesContentGrid: {
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  verseCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  verseCardContent: {
    flexDirection: 'row',
    minHeight: 120,
  },
  categoryIndicator: {
    width: 4,
  },
  verseContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  verseText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 8,
    flex: 1,
  },
  verseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  verseReference: {
    fontSize: 13,
    fontWeight: '700',
  },
  verseTheme: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
  verseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  // Grid View Styles
  verseCardGrid: {
    width: (width - 48) / 2,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  verseCardGridContent: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  verseGridContent: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  verseTextGrid: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    flex: 1,
  },
  verseGridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  verseReferenceGrid: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  verseActionsGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButtonGrid: {
    padding: 6,
    borderRadius: 6,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  verseDetailContent: {
    flex: 1,
  },
  verseHero: {
    padding: 24,
    margin: 20,
    borderRadius: 20,
  },
  verseHeroContent: {
    alignItems: 'center',
  },
  verseDetailText: {
    fontSize: 20,
    lineHeight: 30,
    fontStyle: 'italic',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  verseDetailFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  verseDetailReference: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  favoriteButton: {
    padding: 12,
    borderRadius: 12,
  },
  contextSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  contextText: {
    fontSize: 16,
    lineHeight: 24,
  },
  themeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeTagText: {
    fontSize: 14,
    fontWeight: '600',
  },
  relatedVerses: {
    marginTop: 8,
  },
  relatedVerseCard: {
    width: 200,
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  relatedVerseText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  relatedVerseRef: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Error state styles
  errorContainer: {
    flex: 1,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Error banner styles
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  errorBannerText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default KeyVerses;
