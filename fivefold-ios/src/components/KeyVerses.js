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
  Alert,
  DeviceEventEmitter,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { getStoredData, saveData } from '../utils/localStorage';
import SimplePercentageLoader from './SimplePercentageLoader';
import verseByReferenceService from '../services/verseByReferenceService';

const { width, height } = Dimensions.get('window');
const COLLAPSED_HEADER_HEIGHT = Platform.OS === 'ios' ? 110 : 80;
const EXPANDED_HEADER_HEIGHT = Platform.OS === 'ios' ? 290 : 260;

  // Configuration for remote verses
const VERSES_CONFIG = {
  // Replace with your GitHub username and repository name
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/verses.json',
  URL: 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/verses.json',
  
  // Cache settings
  CACHE_KEY: 'cached_verses_data_v7',
  CACHE_TIMESTAMP_KEY: 'verses_cache_timestamp_v7',
  CACHE_DURATION: 0,
};

const KeyVerses = ({ visible, onClose, onNavigateToVerse, onDiscussVerse }) => {
  const { theme, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New state for remote data
  const [versesData, setVersesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteVerses, setFavoriteVerses] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const scrollViewRef = useRef(null);
  const searchRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Collapsible header animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(new Animated.Value(1)).current;
  const isScrollingDown = useRef(false);

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

  // Bible version states for dynamic verse fetching
  const [fetchedVerses, setFetchedVerses] = useState({}); // { 'reference': { text: '...', version: 'NIV' } }
  const [loadingDynamicVerses, setLoadingDynamicVerses] = useState(false);
  const [bibleVersion, setBibleVersion] = useState('KJV');

  // Modal animation refs for detail view
  const detailSlideAnim = useRef(new Animated.Value(0)).current;
  const detailFadeAnim = useRef(new Animated.Value(0)).current;
  const detailPanY = useRef(new Animated.Value(0)).current;

  const handleGoToVerse = () => {
    if (!selectedVerse?.reference) return;
    hapticFeedback.medium();
    const reference = selectedVerse.reference;
    
    // Clear local state first
    setSelectedVerse(null);
    
    // Use setTimeout to let state settle before navigation
    setTimeout(() => {
      if (typeof onNavigateToVerse === 'function') {
        onNavigateToVerse(reference);
      } else {
        DeviceEventEmitter.emit('navigateToVerse', reference);
        onClose?.();
      }
    }, 100);
  };

  const handleDiscussVerse = () => {
    if (!selectedVerse) return;
    hapticFeedback.medium();
    const reference = selectedVerse.reference;
    const verseText =
      fetchedVerses[reference]?.text ||
      selectedVerse.text ||
      selectedVerse.content ||
      '';

    const payload = { reference, text: verseText, content: verseText };

    // Clear local state first
    setSelectedVerse(null);

    // Use setTimeout to let state settle before navigation
    setTimeout(() => {
      if (typeof onDiscussVerse === 'function') {
        onDiscussVerse(payload);
      } else {
        DeviceEventEmitter.emit('discussVerse', payload);
        onClose?.();
      }
    }, 100);
  };

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
          // After loading verses metadata, fetch dynamic verses
          await loadDynamicVerses(cachedData);
          return;
        }
      }
      
      // Fetch from remote if no valid cache
      console.log('Cache invalid or missing, fetching from remote...');
      const remoteData = await fetchVersesFromRemote();
      setVersesData(remoteData);
      // After loading verses metadata, fetch dynamic verses
      await loadDynamicVerses(remoteData);
      
    } catch (error) {
      // Try to load from cache as fallback
      try {
        console.log('Attempting to load from cache as fallback...');
        const cachedData = await getStoredData(VERSES_CONFIG.CACHE_KEY);
        if (cachedData) {
          setVersesData(cachedData);
          setError('Using offline data - check your internet connection');
          await loadDynamicVerses(cachedData);
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

  // Load verses from user's preferred Bible version
  const loadDynamicVerses = async (data) => {
    try {
      setLoadingDynamicVerses(true);
      console.log('📖 Loading dynamic verses from preferred Bible version...');
      
      // Get user's preferred version
      const version = await verseByReferenceService.getPreferredVersion();
      setBibleVersion(version.toUpperCase());
      console.log('📖 User prefers:', version.toUpperCase());
      
      // Get all verses from all categories
      const allVerses = data.verses ? Object.values(data.verses).flat() : [];
      console.log('📖 Found', allVerses.length, 'verses to fetch');
      
      // Fetch verses dynamically (limit to prevent too many requests at once)
      const versesMap = {};
      const batchSize = 10; // Fetch 10 verses at a time
      
      for (let i = 0; i < allVerses.length; i += batchSize) {
        const batch = allVerses.slice(i, i + batchSize);
        const promises = batch.map(async (verse) => {
          if (!verse.reference) return;
          try {
            const verseData = await verseByReferenceService.getVerseByReference(verse.reference, version);
            versesMap[verse.reference] = {
              text: verseData.text,
              version: verseData.version
            };
            console.log('✅ Loaded:', verse.reference);
          } catch (error) {
            console.error('❌ Failed to load:', verse.reference, error.message);
            // Fallback to hardcoded text if fetch fails
            versesMap[verse.reference] = {
              text: verse.text,
              version: version.toUpperCase()
            };
          }
        });
        
        await Promise.all(promises);
        console.log(`📊 Progress: ${Math.min(i + batchSize, allVerses.length)}/${allVerses.length} verses loaded`);
      }
      
      setFetchedVerses(versesMap);
      setLoadingDynamicVerses(false);
      console.log('✅ All dynamic verses loaded!');
    } catch (error) {
      console.error('Error loading dynamic verses:', error);
      setLoadingDynamicVerses(false);
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

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    try {
      // Clear cache
      await saveData(VERSES_CONFIG.CACHE_KEY, null);
      await saveData(VERSES_CONFIG.CACHE_TIMESTAMP_KEY, null);
      
      const remoteData = await fetchVersesFromRemote();
      setVersesData(remoteData);
      await loadDynamicVerses(remoteData);
    } catch (error) {
      console.error('Error refreshing verses:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Load verses and favorites when component mounts
  useEffect(() => {
    const initializeData = async () => {
      // Load verses from remote/cache
      await loadVerses();
      
      // Load favorites and sync with Profile saved verses
      try {
        // Load from Profile's saved verses system
        const savedBibleVerses = await getStoredData('savedBibleVerses') || [];
        
        // Filter Key Verses from saved verses
        const keyVerseIds = savedBibleVerses
          .filter(v => v.version === 'KEY_VERSES' || v.category) // Key Verses have category or version 'KEY_VERSES'
          .map(v => v.id);
        
        // Also load local favorites for backward compatibility
        const savedFavorites = await getStoredData('favoriteVerses') || [];
        
        // Merge both sources and remove duplicates
        const allFavorites = [...new Set([...keyVerseIds, ...savedFavorites])];
        
        setFavoriteVerses(allFavorites);
        
        console.log(`📖 Loaded ${allFavorites.length} favorite Key Verses (${keyVerseIds.length} from Profile, ${savedFavorites.length} local)`);
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

  // Listen for Bible version changes from Settings
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('bibleVersionChanged', async (newVersion) => {
      console.log('📡 KeyVerses: Received Bible version change event ->', newVersion);
      
      // Clear cached verses
      setFetchedVerses({});
      
      // Update version display
      setBibleVersion(newVersion.toUpperCase());
      
      // Reload all verses with new version
      if (versesData) {
        console.log('🔄 Reloading all verses with new version:', newVersion);
        await loadDynamicVerses(versesData);
      }
      
      console.log('✅ KeyVerses refreshed with new Bible version');
    });

    return () => {
      subscription.remove();
    };
  }, [versesData]); // Re-subscribe if versesData changes

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
    if (selectedCategory === 'favorites') {
      // Show only favorited verses
      filtered = filtered.filter(verse => favoriteVerses.includes(verse.id));
    } else if (selectedCategory !== 'all') {
      // Show verses from specific category
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

  const openRandomVerse = () => {
    hapticFeedback.medium();

    const verses = getFilteredVerses();
    if (!verses || verses.length === 0) {
      hapticFeedback.light();
      Alert.alert('No verses found', 'Try adjusting your search or category filter, then try Random again.');
      return;
    }

    const verse = verses[Math.floor(Math.random() * verses.length)];
    setSelectedVerse(verse);
  };

  const toggleFavorite = async (verseId) => {
    try {
      // Find the verse data
      const verse = keyVerses.find(v => v.id === verseId);
      if (!verse) return;

      // Load existing saved verses from Profile system
      const existingSavedVerses = await getStoredData('savedBibleVerses') || [];
      
      // Check if verse is already saved
      const existingIndex = existingSavedVerses.findIndex(v => v.id === verseId);
      
      let newFavorites;
      
      if (existingIndex !== -1) {
        // Remove from saved verses (Profile system)
        existingSavedVerses.splice(existingIndex, 1);
        newFavorites = favoriteVerses.filter(id => id !== verseId);
        
        console.log('📖 Key Verse removed from saved:', verse.reference);
        hapticFeedback.success();
      } else {
        // Add to saved verses (Profile system)
        const newSavedVerse = {
          id: verseId,
          reference: verse.reference,
          content: verse.text,
          version: 'KEY_VERSES', // Special identifier for Key Verses
          savedAt: new Date().toISOString(),
          category: verse.category,
          theme: verse.theme,
          keywords: verse.keywords,
          context: verse.context
        };
        
        existingSavedVerses.push(newSavedVerse);
        newFavorites = [...favoriteVerses, verseId];
        
        console.log('📖 Key Verse saved to Profile:', verse.reference);
        hapticFeedback.success();
      }
      
      // Update local state
      setFavoriteVerses(newFavorites);
      
      // Save to both storage systems
      await saveData('favoriteVerses', newFavorites); // Key Verses favorites
      await saveData('savedBibleVerses', existingSavedVerses); // Profile saved verses
      
      // Update user stats
      const stats = await getStoredData('userStats') || {};
      stats.savedVerses = existingSavedVerses.length;
      await saveData('userStats', stats);
      
    } catch (error) {
      console.error('Error saving/unsaving Key Verse:', error);
      hapticFeedback.error();
    }
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

  // Get unique gradient for each verse based on category
  const getVerseGradient = (categoryId) => {
    const gradients = {
      faith: ['#6366f1', '#8b5cf6', '#a855f7'],
      love: ['#ec4899', '#f43f5e', '#fb7185'],
      hope: ['#10b981', '#14b8a6', '#06b6d4'],
      wisdom: ['#f59e0b', '#f97316', '#ef4444'],
      peace: ['#06b6d4', '#0ea5e9', '#3b82f6'],
      strength: ['#8b5cf6', '#a855f7', '#d946ef'],
      joy: ['#fbbf24', '#f59e0b', '#fb923c'],
      comfort: ['#a855f7', '#ec4899', '#f43f5e'],
    };
    return gradients[categoryId] || ['#6366f1', '#8b5cf6', '#a855f7'];
  };

  const renderVerseCard = (verse, index) => {
    const isFavorite = favoriteVerses.includes(verse.id);
    const category = categories.find(cat => cat.id === verse.category);
    const cardGradient = getVerseGradient(verse.category);
    
    if (viewMode === 'grid') {
      // Premium Grid Card Design
      return (
        <Animated.View
          key={verse.id}
          style={{
            width: (width - 48) / 2,
            marginBottom: 20,
            transform: [
              {
                scale: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                })
              }
            ],
            opacity: fadeAnim,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => {
              setSelectedVerse(verse);
              hapticFeedback.light();
            }}
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              shadowColor: cardGradient[0],
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            {/* Gradient Background */}
            <LinearGradient
              colors={cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 18,
                minHeight: 200,
                position: 'relative',
              }}
            >
              {/* Decorative Circle */}
              <View style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: 'rgba(255,255,255,0.1)',
              }} />
              <View style={{
                position: 'absolute',
                bottom: -30,
                left: -30,
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }} />

              {/* Category Badge */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                alignSelf: 'flex-start',
                marginBottom: 12,
              }}>
                <MaterialIcons name={category?.icon || 'auto-awesome'} size={12} color="#fff" />
                <Text style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#fff',
                  marginLeft: 4,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {category?.name?.split(' ')[0] || 'Verse'}
                </Text>
              </View>

              {/* Verse Text */}
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#fff',
                lineHeight: 21,
                marginBottom: 16,
                flex: 1,
              }} numberOfLines={5}>
                "{loadingDynamicVerses ? 'Loading...' : (fetchedVerses[verse.reference]?.text || verse.text)}"
              </Text>

              {/* Footer */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}>
                <View>
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: '#fff',
                    marginBottom: 4,
                  }}>
                    {verse.reference}
                  </Text>
                  <View style={{
                    backgroundColor: 'rgba(255,255,255,0.25)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}>
                    <Text style={{
                      fontSize: 9,
                      fontWeight: '700',
                      color: '#fff',
                      textTransform: 'uppercase',
                    }}>
                      {bibleVersion}
                    </Text>
                  </View>
                </View>

                {/* Favorite Button */}
                <TouchableOpacity
                  onPress={() => toggleFavorite(verse.id)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isFavorite ? '#fff' : 'rgba(255,255,255,0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcons 
                    name={isFavorite ? 'favorite' : 'favorite-border'} 
                    size={18} 
                    color={isFavorite ? '#E91E63' : '#fff'} 
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      );
    }
    
    // Premium List View Design
    return (
      <Animated.View
        key={verse.id}
        style={{
          marginBottom: 20,
          transform: [
            {
              scale: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              })
            }
          ],
          opacity: fadeAnim,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => {
            setSelectedVerse(verse);
            hapticFeedback.light();
          }}
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            shadowColor: cardGradient[0],
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            style={{
              padding: 22,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative Elements */}
            <View style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }} />
            <View style={{
              position: 'absolute',
              bottom: -40,
              left: '30%',
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: 'rgba(255,255,255,0.05)',
            }} />

            {/* Top Row - Category & Favorite */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
              }}>
                <MaterialIcons name={category?.icon || 'auto-awesome'} size={14} color="#fff" />
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#fff',
                  marginLeft: 6,
                }}>
                  {category?.name || 'Verse'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => toggleFavorite(verse.id)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isFavorite ? '#fff' : 'rgba(255,255,255,0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons 
                  name={isFavorite ? 'favorite' : 'favorite-border'} 
                  size={20} 
                  color={isFavorite ? '#E91E63' : '#fff'} 
                />
              </TouchableOpacity>
            </View>

            {/* Verse Text */}
            <Text style={{
              fontSize: 17,
              fontWeight: '600',
              color: '#fff',
              lineHeight: 26,
              marginBottom: 18,
            }} numberOfLines={4}>
              "{loadingDynamicVerses ? 'Loading...' : (fetchedVerses[verse.reference]?.text || verse.text)}"
            </Text>

            {/* Bottom Row - Reference, Version, Arrow */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '800',
                  color: '#fff',
                }}>
                  {verse.reference}
                </Text>
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: '#fff',
                    textTransform: 'uppercase',
                  }}>
                    {bibleVersion}
                  </Text>
                </View>
              </View>

              {/* Arrow Button */}
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <MaterialIcons name="arrow-forward" size={18} color="#fff" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Reset panY when modal closes
  useEffect(() => {
    if (!selectedVerse) {
      detailPanY.setValue(0);
    }
  }, [selectedVerse]);

  // Pan gesture handler for verse detail modal
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
            setSelectedVerse(null);
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

  // Animate verse detail modal in/out
  useEffect(() => {
    if (selectedVerse) {
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
  }, [selectedVerse]);

  const renderVerseDetail = () => {
    if (!selectedVerse) return null;
    
    const category = categories.find(cat => cat.id === selectedVerse.category);
    const isFavorite = favoriteVerses.includes(selectedVerse.id);

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
        setSelectedVerse(null);
      });
    };
    
    const detailGradient = getVerseGradient(selectedVerse.category);

    return (
      <Modal
        visible={!!selectedVerse}
        transparent={true}
        animationType="none"
        onRequestClose={handleBackdropClose}
        statusBarTranslucent={true}
      >
        <View style={[styles.verseModalOverlay, { justifyContent: 'flex-end' }]}>
          {/* Backdrop */}
          <Animated.View style={{ ...StyleSheet.absoluteFillObject, opacity: detailFadeAnim }}>
            <TouchableOpacity 
              style={styles.verseModalBackdrop}
              activeOpacity={0.7}
              onPress={handleBackdropClose}
            />
          </Animated.View>
          
          {/* Modal Content */}
          <Animated.View
            style={[
              styles.verseModalContainer,
              {
                transform: [{ translateY: combinedTranslateY }],
                opacity: detailFadeAnim,
                backgroundColor: isDark ? theme.background : '#F8FAFC',
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
            <View style={styles.verseDetailSafeArea}>
              {/* Drag Handle */}
              <View
                style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}
                {...detailPanResponder.panHandlers}
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
                {/* Hero Section with Gradient */}
                <LinearGradient
                  colors={detailGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    marginHorizontal: 20,
                    marginTop: 8,
                    marginBottom: 28,
                    borderRadius: 28,
                    padding: 28,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Decorative Elements */}
                  <View style={{
                    position: 'absolute',
                    top: -60,
                    right: -60,
                    width: 180,
                    height: 180,
                    borderRadius: 90,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }} />
                  <View style={{
                    position: 'absolute',
                    bottom: -40,
                    left: -40,
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }} />

                  {/* Category Badge */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                    alignSelf: 'flex-start',
                    marginBottom: 20,
                  }}>
                    <MaterialIcons name={category?.icon || 'auto-awesome'} size={16} color="#fff" />
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: '#fff',
                      marginLeft: 8,
                    }}>
                      {category?.name || 'Key Verse'}
                    </Text>
                  </View>

                  {/* Large Quote Icon */}
                  <MaterialIcons 
                    name="format-quote" 
                    size={40} 
                    color="rgba(255,255,255,0.3)" 
                    style={{ marginBottom: 8 }}
                  />

                  {/* Verse Text */}
                  <Text style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: '#fff',
                    lineHeight: 34,
                    marginBottom: 24,
                  }}>
                    {loadingDynamicVerses ? 'Loading...' : (fetchedVerses[selectedVerse.reference]?.text || selectedVerse.text)}
                  </Text>

                  {/* Reference & Version */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}>
                    <View>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: '800',
                        color: '#fff',
                        marginBottom: 6,
                      }}>
                        {selectedVerse.reference}
                      </Text>
                      <View style={{
                        backgroundColor: 'rgba(255,255,255,0.25)',
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 8,
                        alignSelf: 'flex-start',
                      }}>
                        <Text style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: '#fff',
                          textTransform: 'uppercase',
                        }}>
                          {bibleVersion}
                        </Text>
                      </View>
                    </View>

                    {/* Favorite Button */}
                    <TouchableOpacity
                      onPress={() => toggleFavorite(selectedVerse.id)}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: isFavorite ? '#fff' : 'rgba(255,255,255,0.2)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialIcons 
                        name={isFavorite ? 'favorite' : 'favorite-border'} 
                        size={28} 
                        color={isFavorite ? '#E91E63' : '#fff'} 
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Action Buttons */}
                  <View style={{
                    flexDirection: 'row',
                    gap: 12,
                  }}>
                    <TouchableOpacity
                      onPress={handleGoToVerse}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        paddingVertical: 14,
                        borderRadius: 16,
                        gap: 8,
                      }}
                    >
                      <MaterialIcons name="menu-book" size={20} color={detailGradient[0]} />
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: detailGradient[0],
                      }}>
                        Read in Bible
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleDiscussVerse}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        paddingVertical: 14,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.3)',
                        gap: 8,
                      }}
                    >
                      <MaterialIcons name="chat-bubble-outline" size={20} color="#fff" />
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: '#fff',
                      }}>
                        Discuss
                      </Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>

                {/* Context Section Card */}
                <View style={{
                  marginHorizontal: 20,
                  marginBottom: 20,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                  borderRadius: 24,
                  padding: 24,
                  shadowColor: detailGradient[0],
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 4,
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
                      backgroundColor: `${detailGradient[0]}15`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 14,
                    }}>
                      <MaterialIcons name="info-outline" size={24} color={detailGradient[0]} />
                    </View>
                    <Text style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: theme.text,
                    }}>
                      Context
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: 16,
                    color: theme.text,
                    lineHeight: 26,
                  }}>
                    {selectedVerse.context}
                  </Text>
                </View>

                {/* Theme Section Card */}
                <View style={{
                  marginHorizontal: 20,
                  marginBottom: 20,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                  borderRadius: 24,
                  padding: 24,
                  shadowColor: detailGradient[0],
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 4,
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
                      backgroundColor: `${detailGradient[0]}15`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 14,
                    }}>
                      <MaterialIcons name="local-offer" size={24} color={detailGradient[0]} />
                    </View>
                    <Text style={{
                      fontSize: 20,
                      fontWeight: '700',
                      color: theme.text,
                    }}>
                      Theme
                    </Text>
                  </View>
                  <LinearGradient
                    colors={[`${detailGradient[0]}20`, `${detailGradient[1]}15`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      borderRadius: 16,
                      alignSelf: 'flex-start',
                      borderWidth: 1,
                      borderColor: `${detailGradient[0]}30`,
                    }}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: detailGradient[0],
                    }}>
                      {selectedVerse.theme}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Share Button */}
                <TouchableOpacity
                  onPress={() => shareVerse(selectedVerse)}
                  style={{
                    marginHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
                    paddingVertical: 16,
                    borderRadius: 16,
                    gap: 10,
                  }}
                >
                  <MaterialIcons name="share" size={22} color={theme.textSecondary} />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: theme.textSecondary,
                  }}>
                    Share This Verse
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const filteredVerses = getFilteredVerses();

  // Animated header height
  const headerHeight = headerVisible.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_HEADER_HEIGHT, EXPANDED_HEADER_HEIGHT],
    extrapolate: 'clamp',
  });
  
  // Animated opacity for collapsible sections
  const expandedOpacity = headerVisible.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // Loading state
  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent={false}>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} />
          <SimplePercentageLoader 
            isVisible={true}
            loadingText="Loading key verses..."
          />
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
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
        
        <Animated.View 
          style={[
            styles.content, 
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Verses Grid/List - This scrolls behind the header */}
          <Animated.ScrollView 
            ref={scrollViewRef}
            style={styles.versesContainer}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
              viewMode === 'grid' ? styles.versesContentGrid : styles.versesContent,
              { paddingTop: EXPANDED_HEADER_HEIGHT + 20 }
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
                title="Pull to refresh..."
                titleColor={theme.textSecondary}
                progressViewOffset={EXPANDED_HEADER_HEIGHT}
              />
            }
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
          </Animated.ScrollView>
        </Animated.View>
        
        {/* Combined Header + Filter Container with Blur */}
        <Animated.View 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            height: headerHeight,
            overflow: 'hidden',
          }}
        >
          <BlurView 
            intensity={20} 
            tint={isDark ? 'dark' : 'light'} 
            style={StyleSheet.absoluteFill}
          >
            <LinearGradient
              colors={isDark 
                ? ['rgba(30,30,40,0.95)', 'rgba(30,30,40,0.9)']
                : ['rgba(255,255,255,0.95)', 'rgba(248,250,252,0.9)']
              }
              style={{ flex: 1, paddingHorizontal: 20 }}
            >
              {/* Fixed Header Section */}
              <View style={{ height: Platform.OS === 'ios' ? 60 : 30, backgroundColor: 'transparent' }} />
              <View style={[styles.header, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: 8, paddingBottom: 12 }]}>
                <View style={{ width: 80 }}>
                  <TouchableOpacity onPress={onClose} style={{ 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    paddingHorizontal: 16, 
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}>
                    <Text style={[{ color: theme.primary, fontSize: 16, fontWeight: '600' }]} numberOfLines={1}>Back</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.headerTitle, { color: theme.text }]}>Key Verses</Text>
                
                <View style={{ width: 80, alignItems: 'flex-end' }}>
                  <TouchableOpacity 
                    onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
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
                      name={viewMode === 'grid' ? 'view-list' : 'view-module'} 
                      size={24} 
                      color={theme.text} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Expandable Section */}
              <Animated.View style={{ opacity: expandedOpacity }}>
                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginHorizontal: 0 }]}>
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
                  style={[styles.categoriesContainer, { marginHorizontal: -20 }]}
                  contentContainerStyle={[styles.categoriesContent, { paddingHorizontal: 20 }]}
                >
                  {categories.map(renderCategoryChip)}
                </ScrollView>
                
                {/* Results Count */}
                <View style={[styles.resultsHeader, { marginHorizontal: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={[styles.resultsCountValue, { color: theme.text }]}>
                      {filteredVerses.length}
                    </Text>
                    <Text style={[styles.resultsCountLabel, { color: theme.textSecondary }]}>
                      {filteredVerses.length === 1 ? 'verse' : 'verses'}
                    </Text>
                  </View>
                  
                  <View style={styles.resultsActions}>
                    <TouchableOpacity
                      onPress={openRandomVerse}
                      disabled={filteredVerses.length === 0}
                      style={[
                        styles.randomButton,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : `${theme.primary}16`,
                          borderColor: isDark ? 'rgba(255,255,255,0.18)' : `${theme.primary}35`,
                          shadowColor: theme.primary,
                          opacity: filteredVerses.length === 0 ? 0.5 : 1,
                        },
                      ]}
                    >
                      <MaterialIcons name="shuffle" size={16} color={theme.primary} />
                      <Text style={[styles.randomButtonText, { color: theme.primary }]}>
                        Random
                      </Text>
                    </TouchableOpacity>

                    {favoriteVerses.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSelectedCategory(selectedCategory === 'favorites' ? 'all' : 'favorites')}
                        style={[styles.favoritesButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                      >
                        <MaterialIcons name="favorite" size={16} color="#E91E63" />
                        <Text style={[styles.favoritesButtonText, { color: theme.text }]}>
                          {favoriteVerses.length}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Animated.View>
            </LinearGradient>
          </BlurView>
        </Animated.View>
        
        {/* Show error banner if using offline data */}
        {error && versesData && (
          <View style={[styles.errorBanner, { backgroundColor: theme.warning || '#FF9800', marginTop: Platform.OS === 'ios' ? 140 : 120 }]}>
            <MaterialIcons name="wifi-off" size={16} color="#fff" />
            <Text style={styles.errorBannerText}>Offline mode - {error}</Text>
          </View>
        )}
        
        {/* Verse Detail Modal */}
        {renderVerseDetail()}
      </View>
    </Modal>
  );
        
        {/* Show error banner if using offline data */}
        {error && versesData && (
          <View style={[styles.errorBanner, { backgroundColor: theme.warning || '#FF9800', marginTop: Platform.OS === 'ios' ? 140 : 120 }]}>
            <MaterialIcons name="wifi-off" size={16} color="#fff" />
            <Text style={styles.errorBannerText}>Offline mode - {error}</Text>
          </View>
        )}
        
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
    paddingBottom: 3,
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
    marginTop: 8,
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
    marginTop: 8,
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
    marginTop: 8,
    marginBottom: 16,
  },
  resultsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsCountValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  resultsCountLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  randomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  randomButtonText: {
    fontSize: 12,
    fontWeight: '700',
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  verseReference: {
    fontSize: 13,
    fontWeight: '700',
  },
  versionBadge: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  versionBadgeModal: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#FFFFFF',
    marginTop: 8,
    alignSelf: 'flex-start',
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8,
  },
  verseReferenceGrid: {
    fontSize: 11,
    fontWeight: '700',
  },
  verseActionsGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButtonGrid: {
    padding: 6,
    borderRadius: 6,
  },
  // Verse detail modal styles
  verseModalOverlay: {
    flex: 1,
  },
  verseModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  verseModalContainer: {
    // Styles moved inline for theme support
  },
  verseDetailSafeArea: {
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
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  heroActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  heroActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
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
