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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { getStoredData, saveData } from '../utils/localStorage';
import { pushToCloud } from '../services/userSyncService';
import SimplePercentageLoader from './SimplePercentageLoader';
import verseByReferenceService from '../services/verseByReferenceService';

const { width, height } = Dimensions.get('window');

// Configuration for remote verses
const VERSES_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/verses.json',
  URL: 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/verses.json',
  CACHE_KEY: 'cached_verses_data_v8',
  CACHE_TIMESTAMP_KEY: 'verses_cache_timestamp_v8',
  CACHE_DURATION: 0,
};

const KeyVerses = ({ visible, onClose, onNavigateToVerse, onDiscussVerse, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [versesData, setVersesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteVerses, setFavoriteVerses] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  
  const scrollViewRef = useRef(null);
  const searchRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Verse detail modal animations
  const verseDetailSlide = useRef(new Animated.Value(height)).current;
  const verseDetailOpacity = useRef(new Animated.Value(0)).current;
  const verseDetailScale = useRef(new Animated.Value(0.95)).current;
  const [showVerseDetail, setShowVerseDetail] = useState(false);
  
  // Open verse detail with animation
  const openVerseDetail = (verse) => {
    hapticFeedback.light();
    setSelectedVerse(verse);
    setShowVerseDetail(true);
    verseDetailSlide.setValue(height);
    verseDetailOpacity.setValue(0);
    verseDetailScale.setValue(0.95);
    
    Animated.parallel([
      Animated.spring(verseDetailSlide, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(verseDetailOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(verseDetailScale, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Close verse detail with animation
  const closeVerseDetail = () => {
    Animated.parallel([
      Animated.timing(verseDetailSlide, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(verseDetailOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowVerseDetail(false);
      setSelectedVerse(null);
    });
  };
  
  // Pan responder for swipe-to-dismiss
  const verseDetailPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          verseDetailSlide.setValue(gestureState.dy);
          const opacity = 1 - (gestureState.dy / 400);
          verseDetailOpacity.setValue(Math.max(0, opacity));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          closeVerseDetail();
        } else {
          Animated.parallel([
            Animated.spring(verseDetailSlide, {
              toValue: 0,
              tension: 100,
              friction: 10,
              useNativeDriver: true,
            }),
            Animated.timing(verseDetailOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;
  
  // Toggle favorite verse
  const toggleFavorite = async (verseId) => {
    hapticFeedback.medium();
    const isFavorite = favoriteVerses.includes(verseId);
    let newFavorites;
    
    // Find the verse data
    const all = versesData ? Object.values(versesData.verses).flat() : [];
    const verse = all.find(v => v.id === verseId);
    
    // Get saved verses
    const saved = await getStoredData('savedBibleVerses') || [];
    
    if (isFavorite) {
      // Remove from favorites
      newFavorites = favoriteVerses.filter(id => id !== verseId);
      // Also remove from savedBibleVerses
      const idx = saved.findIndex(v => v.id === verseId);
      if (idx !== -1) {
        saved.splice(idx, 1);
      }
    } else {
      // Add to favorites
      newFavorites = [...favoriteVerses, verseId];
      // Also add to savedBibleVerses
      if (verse) {
        saved.push({
          id: verseId,
          reference: verse.reference,
          content: verse.text,
          version: 'KEY_VERSES',
          category: verse.category,
          savedAt: new Date().toISOString()
        });
      }
    }
    
    setFavoriteVerses(newFavorites);
    await saveData('favoriteVerses', newFavorites);
    pushToCloud('favoriteVerses', newFavorites);
    await saveData('savedBibleVerses', saved);
    hapticFeedback.success();
  };

  // Collapsible search bar animation (matches Achievements pattern)
  const searchBarAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef('up');

  const handleScroll = (event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';

    if (direction !== scrollDirection.current && Math.abs(currentScrollY - lastScrollY.current) > 10) {
      scrollDirection.current = direction;
      Animated.timing(searchBarAnim, {
        toValue: direction === 'down' ? 0 : 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }

    lastScrollY.current = currentScrollY;
  };

  const [fetchedVerses, setFetchedVerses] = useState({});
  const [loadingDynamicVerses, setLoadingDynamicVerses] = useState(false);
  const [bibleVersion, setBibleVersion] = useState('KJV');

  useEffect(() => {
    const initializeData = async () => {
      await loadVerses();
      try {
        const savedBibleVerses = await getStoredData('savedBibleVerses') || [];
        const keyVerseIds = savedBibleVerses
          .filter(v => v.version === 'KEY_VERSES' || v.category)
          .map(v => v.id);
        const savedFavorites = await getStoredData('favoriteVerses') || [];
        const allFavorites = [...new Set([...keyVerseIds, ...savedFavorites])];
        setFavoriteVerses(allFavorites);
      } catch (err) {
        console.error('Error loading favorite verses:', err);
      }
    };

    if (visible) {
      initializeData();
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  // Listen for Bible version changes and refresh verses in the new version
  useEffect(() => {
    const versionChangeListener = DeviceEventEmitter.addListener('bibleVersionChanged', async (newVersion) => {
      console.log('📖 KeyVerses: Bible version changed to', newVersion);
      if (versesData) {
        await loadDynamicVerses(versesData);
      }
    });

    return () => {
      versionChangeListener.remove();
    };
  }, [versesData]);

  const isCacheValid = async () => {
    try {
      const timestamp = await getStoredData(VERSES_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      return (Date.now() - parseInt(timestamp)) < VERSES_CONFIG.CACHE_DURATION;
    } catch { return false; }
  };

  const fetchVersesFromRemote = async () => {
    const response = await fetch(VERSES_CONFIG.URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    await saveData(VERSES_CONFIG.CACHE_KEY, data);
    await saveData(VERSES_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
    return data;
  };

  const loadVerses = async () => {
    try {
      setLoading(true);
      if (await isCacheValid()) {
        const cached = await getStoredData(VERSES_CONFIG.CACHE_KEY);
        if (cached) {
          setVersesData(cached);
          setLoading(false);
          await loadDynamicVerses(cached);
          return;
        }
      }
      const remote = await fetchVersesFromRemote();
      setVersesData(remote);
      setLoading(false);
      await loadDynamicVerses(remote);
    } catch {
      setError('Using offline data');
      setLoading(false);
    }
  };

  const loadDynamicVerses = async (data) => {
    try {
      setLoadingDynamicVerses(true);
      const version = await verseByReferenceService.getPreferredVersion();
      setBibleVersion(version.toUpperCase());
      const allVerses = data.verses ? Object.values(data.verses).flat() : [];
      const versesMap = {};
      for (let i = 0; i < allVerses.length; i += 10) {
        const batch = allVerses.slice(i, i + 10);
        await Promise.all(batch.map(async (v) => {
          try {
            const d = await verseByReferenceService.getVerseByReference(v.reference, version);
            versesMap[v.reference] = { text: d.text, version: d.version };
          } catch {
            versesMap[v.reference] = { text: v.text, version: version.toUpperCase() };
          }
        }));
      }
      setFetchedVerses(versesMap);
    } finally {
      setLoadingDynamicVerses(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchVersesFromRemote();
      setVersesData(data);
      await loadDynamicVerses(data);
    } finally {
      setRefreshing(false);
    }
  };

  const getFilteredVerses = () => {
    const all = versesData ? Object.values(versesData.verses).flat() : [];
    let filtered = all;
    if (selectedCategory === 'favorites') filtered = all.filter(v => favoriteVerses.includes(v.id));
    else if (selectedCategory !== 'all') filtered = all.filter(v => v.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.text.toLowerCase().includes(q) || v.reference.toLowerCase().includes(q) ||
        v.theme.toLowerCase().includes(q) || v.keywords.some(k => k.toLowerCase().includes(q))
      );
    }
    return filtered;
  };

  // Note: toggleFavorite is defined at the top with the modal animations

  const getVerseGradient = (cat) => {
    const g = { faith: ['#6366f1', '#8b5cf6'], love: ['#ec4899', '#f43f5e'], hope: ['#10b981', '#14b8a6'] };
    return g[cat] || ['#6366f1', '#8b5cf6'];
  };

  const renderVerseCard = (verse) => {
    const isFav = favoriteVerses.includes(verse.id);
    const grad = getVerseGradient(verse.category);
    return (
      <View key={verse.id} style={viewMode === 'grid' ? styles.gridCard : styles.listCard}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => openVerseDetail(verse)}>
          <LinearGradient colors={grad} style={styles.cardGradient}>
            <Text style={styles.cardText} numberOfLines={viewMode === 'grid' ? 5 : 3}>
              "{fetchedVerses[verse.reference]?.text || verse.text}"
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardRef}>{verse.reference}</Text>
              <TouchableOpacity onPress={() => toggleFavorite(verse.id)}>
                <MaterialIcons name={isFav ? 'favorite' : 'favorite-border'} size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderVerseDetail = () => {
    if (!showVerseDetail || !selectedVerse) return null;
    const grad = getVerseGradient(selectedVerse.category);
    const isFavorite = favoriteVerses.includes(selectedVerse.id);
    
    return (
      <Modal visible={showVerseDetail} transparent animationType="none" statusBarTranslucent>
        <Animated.View 
          style={[
            styles.verseDetailOverlay,
            { opacity: verseDetailOpacity }
          ]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={closeVerseDetail} 
          />
          
          <Animated.View 
            style={[
              styles.verseDetailContainer,
              {
                transform: [
                  { translateY: verseDetailSlide },
                  { scale: verseDetailScale },
                ],
              }
            ]}
            {...verseDetailPanResponder.panHandlers}
          >
            {/* Gradient Background */}
            <LinearGradient 
              colors={grad} 
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verseDetailGradient}
            >
              <BlurView intensity={isDark ? 20 : 30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              
              {/* Handle Bar */}
              <View style={styles.verseDetailHandle}>
                <View style={styles.verseDetailHandleBar} />
              </View>
              
              {/* Header with close and favorite */}
              <View style={styles.verseDetailHeader}>
                <TouchableOpacity 
                  style={styles.verseDetailCloseBtn}
                  onPress={closeVerseDetail}
                >
                  <MaterialIcons name="close" size={22} color="rgba(255,255,255,0.9)" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.verseDetailFavoriteBtn}
                  onPress={() => toggleFavorite(selectedVerse.id)}
                >
                  <MaterialIcons 
                    name={isFavorite ? "favorite" : "favorite-border"} 
                    size={24} 
                    color={isFavorite ? "#FF6B6B" : "rgba(255,255,255,0.9)"} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Verse Content */}
              <ScrollView 
                style={styles.verseDetailScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
              >
                {/* Opening Quote */}
                <Text style={styles.verseDetailQuote}>"</Text>
                
                {/* Verse Text */}
                <Text style={styles.verseDetailText}>
                  {fetchedVerses[selectedVerse.reference]?.text || selectedVerse.text}
                </Text>
                
                {/* Reference */}
                <View style={styles.verseDetailRefContainer}>
                  <View style={styles.verseDetailDivider} />
                  <Text style={styles.verseDetailRef}>
                    {selectedVerse.reference} ({fetchedVerses[selectedVerse.reference]?.version || bibleVersion})
                  </Text>
                  <Text style={styles.verseDetailCategory}>{selectedVerse.category}</Text>
                </View>
                
              </ScrollView>
              
              {/* Action Buttons */}
              <View style={styles.verseDetailActions}>
                {/* Go to Verse Button */}
                <TouchableOpacity
                  style={styles.verseDetailPrimaryBtn}
                  onPress={() => {
                    hapticFeedback.light();
                    // Store reference before closing modal (since selectedVerse will be null after close)
                    const verseRef = selectedVerse?.reference;
                    
                    // Close the verse detail modal immediately (no animation)
                    setShowVerseDetail(false);
                    setSelectedVerse(null);
                    
                    // Navigate after a brief delay to ensure the modal state is updated
                    if (onNavigateToVerse && verseRef) {
                      setTimeout(() => {
                        onNavigateToVerse(verseRef);
                      }, 150);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="menu-book" size={20} color={grad[0]} />
                  <Text style={[styles.verseDetailPrimaryBtnText, { color: grad[0] }]}>
                    Go to Verse
                  </Text>
                </TouchableOpacity>
                
                {/* Secondary Row */}
                <View style={styles.verseDetailSecondaryRow}>
                  {/* Discuss Button */}
                  <TouchableOpacity
                    style={styles.verseDetailSecondaryBtn}
                    onPress={() => {
                      hapticFeedback.light();
                      const versePayload = selectedVerse ? { text: selectedVerse.text, reference: selectedVerse.reference } : null;
                      
                      setShowVerseDetail(false);
                      setSelectedVerse(null);
                      
                      if (onDiscussVerse && versePayload) {
                        setTimeout(() => {
                          onDiscussVerse(versePayload);
                        }, 150);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="chat-bubble-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.verseDetailSecondaryBtnText}>Discuss</Text>
                  </TouchableOpacity>
                  
                  {/* Share Button */}
                  <TouchableOpacity
                    style={styles.verseDetailSecondaryBtn}
                    onPress={async () => {
                      hapticFeedback.light();
                      try {
                        await Share.share({
                          message: `"${fetchedVerses[selectedVerse.reference]?.text || selectedVerse.text}"\n\n— ${selectedVerse.reference}`,
                        });
                      } catch (err) {
                        console.error('Share error:', err);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="ios-share" size={18} color="#FFFFFF" />
                    <Text style={styles.verseDetailSecondaryBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  };

  // Header spacer height adapts to search bar visibility
  // Status bar (54) + title row (44) + chips (40) + padding = ~150 collapsed
  // + search bar (58) when expanded = ~210
  const headerSpacerHeight = searchBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Platform.OS === 'ios' ? 155 : 130, Platform.OS === 'ios' ? 215 : 190],
  });

  if (loading) {
    const loadingContent = (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <SimplePercentageLoader isVisible loadingText="Loading..." />
      </View>
    );
    if (asScreen) {
      return loadingContent;
    }
    return (
      <Modal visible={visible}>
        {loadingContent}
      </Modal>
    );
  }

  const filtered = getFilteredVerses();

  const content = (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
        <LinearGradient
          colors={isDark ? ['#1a1a1a', '#000'] : ['#FDFBFB', '#EBEDEE']}
          style={StyleSheet.absoluteFill}
        />

        {/* Scrollable content */}
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Dynamic spacer that responds to search bar collapse */}
          <Animated.View style={{ height: headerSpacerHeight }} />

          <View style={styles.container}>
            {filtered.length > 0 ? (
              filtered.map(renderVerseCard)
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, width: '100%' }}>
                <MaterialIcons name="auto-stories" size={64} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} />
                <Text style={{ color: theme.textSecondary, fontSize: 17, fontWeight: '700', marginTop: 16 }}>
                  No Matches
                </Text>
                <Text style={{ color: theme.textTertiary, fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
                  Try a different search or category.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Premium Transparent Header — matches Achievements */}
        <BlurView
          intensity={50}
          tint={isDark ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
          <Animated.View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            {/* Title row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
              </TouchableOpacity>

              <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
                  Key Verses
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {filtered.length} verse{filtered.length !== 1 ? 's' : ''}
                  {selectedCategory !== 'all' && selectedCategory !== 'favorites' && versesData?.categories
                    ? ` in ${versesData.categories.find(c => c.id === selectedCategory)?.name || ''}`
                    : ''}
                  {selectedCategory === 'favorites' ? ' saved' : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => { setViewMode(viewMode === 'grid' ? 'list' : 'grid'); hapticFeedback.selection(); }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={viewMode === 'grid' ? 'view-list' : 'grid-view'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Collapsible Search bar */}
            <Animated.View
              style={{
                height: searchBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 58],
                }),
                opacity: searchBarAnim,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  marginTop: 16,
                }}
              >
                <MaterialIcons name="search" size={20} color={theme.textTertiary} />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: theme.text,
                    marginLeft: 10,
                    paddingVertical: 2,
                  }}
                  placeholder="Search verses..."
                  placeholderTextColor={theme.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="close" size={14} color={theme.text} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </Animated.View>

          {/* Category filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 8, paddingHorizontal: 16 }}
          >
            <TouchableOpacity
              onPress={() => { setSelectedCategory('all'); hapticFeedback.light(); }}
              style={[
                styles.categoryChip,
                { backgroundColor: selectedCategory === 'all' ? theme.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
              ]}
            >
              <Text style={{ color: selectedCategory === 'all' ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setSelectedCategory(selectedCategory === 'favorites' ? 'all' : 'favorites'); hapticFeedback.light(); }}
              style={[
                styles.categoryChip,
                { backgroundColor: selectedCategory === 'favorites' ? '#E91E63' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
              ]}
            >
              <MaterialIcons name="favorite" size={14} color={selectedCategory === 'favorites' ? '#fff' : '#E91E63'} />
              <Text style={{ color: selectedCategory === 'favorites' ? '#fff' : theme.text, fontWeight: '600', fontSize: 13, marginLeft: 4 }}>{favoriteVerses.length}</Text>
            </TouchableOpacity>
            {versesData?.categories?.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => { setSelectedCategory(cat.id); hapticFeedback.light(); }}
                style={[
                  styles.categoryChip,
                  { backgroundColor: selectedCategory === cat.id ? cat.color : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
                ]}
              >
                <Text style={{ color: selectedCategory === cat.id ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </BlurView>

        {renderVerseDetail()}
      </View>
  );

  if (asScreen) {
    return content;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: { width: (width - 44) / 2, marginBottom: 12, borderRadius: 20, overflow: 'hidden' },
  listCard: { width: width - 32, marginBottom: 12, borderRadius: 20, overflow: 'hidden' },
  cardGradient: { padding: 16, minHeight: 180, justifyContent: 'space-between' },
  cardText: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardRef: { color: '#fff', fontWeight: '700', fontSize: 12 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  // Legacy header styles removed — now using inline Achievements-style header
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  // Legacy styles (kept for compatibility)
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', overflow: 'hidden' },
  modalHero: { padding: 32, alignItems: 'center' },
  modalText: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  modalRef: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalBody: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  sectionText: { fontSize: 16, lineHeight: 24 },
  closeBtn: { margin: 24, padding: 16, borderRadius: 16, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  // New verse detail modal styles
  verseDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  verseDetailContainer: {
    height: height * 0.85,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  verseDetailGradient: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  verseDetailHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  verseDetailHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },
  verseDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  verseDetailCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseDetailFavoriteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseDetailScroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  verseDetailQuote: {
    fontSize: 64,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: -30,
    marginLeft: -8,
  },
  verseDetailText: {
    fontSize: 22,
    lineHeight: 34,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingHorizontal: 8,
    marginTop: 20,
  },
  verseDetailRefContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  verseDetailDivider: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1.5,
    marginBottom: 16,
  },
  verseDetailRef: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  verseDetailCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verseDetailActions: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
  },
  verseDetailPrimaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  verseDetailPrimaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  verseDetailSecondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  verseDetailSecondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  verseDetailSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default KeyVerses;
