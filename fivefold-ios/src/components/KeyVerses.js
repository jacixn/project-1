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
const EXPANDED_HEADER_HEIGHT = Platform.OS === 'ios' ? 260 : 230;

// Configuration for remote verses
const VERSES_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/verses.json',
  URL: 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/verses.json',
  CACHE_KEY: 'cached_verses_data_v7',
  CACHE_TIMESTAMP_KEY: 'verses_cache_timestamp_v7',
  CACHE_DURATION: 0,
};

const KeyVerses = ({ visible, onClose, onNavigateToVerse, onDiscussVerse }) => {
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
    await saveData('savedBibleVerses', saved);
    hapticFeedback.success();
  };

  // Collapsible header animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(new Animated.Value(1)).current;
  const isScrollingDown = useRef(false);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        if (Math.abs(diff) > 5) {
          if (diff > 0 && currentScrollY > 50) {
            if (!isScrollingDown.current) {
              isScrollingDown.current = true;
              Animated.timing(headerVisible, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }).start();
            }
          } else if (diff < 0) {
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
                  <Text style={styles.verseDetailRef}>{selectedVerse.reference}</Text>
                  <Text style={styles.verseDetailCategory}>{selectedVerse.category}</Text>
                </View>
                
                {/* Context Section */}
                <View style={styles.verseDetailContextContainer}>
                  <Text style={styles.verseDetailContextTitle}>Context</Text>
                  <Text style={styles.verseDetailContextText}>{selectedVerse.context}</Text>
                </View>
              </ScrollView>
              
              {/* Action Buttons */}
              <View style={styles.verseDetailActions}>
                {/* Go to Verse Button */}
                <TouchableOpacity
                  style={styles.verseDetailPrimaryBtn}
                  onPress={() => {
                    hapticFeedback.light();
                    closeVerseDetail();
                    if (onNavigateToVerse) {
                      onNavigateToVerse(selectedVerse.reference);
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
                      closeVerseDetail();
                      if (onDiscussVerse) {
                        onDiscussVerse(selectedVerse.reference);
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

  const headerHeight = headerVisible.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_HEADER_HEIGHT, EXPANDED_HEADER_HEIGHT],
    extrapolate: 'clamp',
  });
  const expandedOpacity = headerVisible.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <Modal visible={visible}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <SimplePercentageLoader isVisible loadingText="Loading..." />
        </View>
      </Modal>
    );
  }

  const filtered = getFilteredVerses();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent={true} />
        
        <Animated.ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: EXPANDED_HEADER_HEIGHT + 20, paddingBottom: 40 }}
        >
          <View style={styles.container}>
            {filtered.map(renderVerseCard)}
          </View>
        </Animated.ScrollView>

        <Animated.View style={[styles.headerContainer, { height: headerHeight }]}>
          <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
            <LinearGradient colors={isDark ? ['#1e1e28', '#1e1e28'] : ['#ffffff', '#f8fafc']} style={styles.headerGradient}>
              <View style={{ height: Platform.OS === 'ios' ? 60 : 30 }} />
              <View style={styles.headerRow}>
                <View style={{ width: 70 }}>
                  <TouchableOpacity 
                    style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
                    onPress={onClose}
                  >
                    <Text style={{ color: theme.primary, fontWeight: '600' }}>Back</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>Key Verses</Text>
                  <View style={{ 
                    width: 50, 
                    height: 3, 
                    backgroundColor: theme.primary, 
                    borderRadius: 2,
                    marginTop: 6,
                  }} />
                </View>
                <View style={{ width: 70, alignItems: 'flex-end' }}>
                  <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                    <MaterialIcons name={viewMode === 'grid' ? 'view-list' : 'grid-view'} size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <Animated.View style={{ opacity: expandedOpacity }}>
                <View style={styles.searchBar}>
                  <MaterialIcons name="search" size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search verses..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                
                {/* Category Pills */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
                  style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
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

                <View style={styles.resultsRow}>
                  <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{filtered.length}</Text>
                  <Text style={{ color: theme.textSecondary }}> verses</Text>
                  {selectedCategory !== 'all' && selectedCategory !== 'favorites' && versesData?.categories && (
                    <Text style={{ color: theme.textSecondary, marginLeft: 4 }}>
                      in {versesData.categories.find(c => c.id === selectedCategory)?.name}
                    </Text>
                  )}
                  {selectedCategory === 'favorites' && (
                    <Text style={{ color: theme.textSecondary, marginLeft: 4 }}>saved</Text>
                  )}
                </View>
              </Animated.View>
            </LinearGradient>
          </BlurView>
        </Animated.View>
        {renderVerseDetail()}
      </View>
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
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, overflow: 'hidden' },
  headerGradient: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 12, marginVertical: 10 },
  searchInput: { flex: 1, marginLeft: 10 },
  resultsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10, flexWrap: 'wrap' },
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
  verseDetailContextContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  verseDetailContextTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  verseDetailContextText: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
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
