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
const EXPANDED_HEADER_HEIGHT = Platform.OS === 'ios' ? 290 : 260;

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

  const detailSlideAnim = useRef(new Animated.Value(0)).current;
  const detailFadeAnim = useRef(new Animated.Value(0)).current;
  const detailPanY = useRef(new Animated.Value(0)).current;

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
      } catch (error) {
        console.error('Error loading favorite verses:', error);
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

  const toggleFavorite = async (id) => {
    const verse = (versesData ? Object.values(versesData.verses).flat() : []).find(v => v.id === id);
    if (!verse) return;
    const saved = await getStoredData('savedBibleVerses') || [];
    const idx = saved.findIndex(v => v.id === id);
    let newFavs;
    if (idx !== -1) {
      saved.splice(idx, 1);
      newFavs = favoriteVerses.filter(f => f !== id);
    } else {
      saved.push({ id, reference: verse.reference, content: verse.text, version: 'KEY_VERSES', savedAt: new Date().toISOString() });
      newFavs = [...favoriteVerses, id];
    }
    setFavoriteVerses(newFavs);
    await saveData('favoriteVerses', newFavs);
    await saveData('savedBibleVerses', saved);
    hapticFeedback.success();
  };

  const getVerseGradient = (cat) => {
    const g = { faith: ['#6366f1', '#8b5cf6'], love: ['#ec4899', '#f43f5e'], hope: ['#10b981', '#14b8a6'] };
    return g[cat] || ['#6366f1', '#8b5cf6'];
  };

  const renderVerseCard = (verse) => {
    const isFav = favoriteVerses.includes(verse.id);
    const grad = getVerseGradient(verse.category);
    return (
      <View key={verse.id} style={viewMode === 'grid' ? styles.gridCard : styles.listCard}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedVerse(verse)}>
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
    if (!selectedVerse) return null;
    const grad = getVerseGradient(selectedVerse.category);
    return (
      <Modal visible={!!selectedVerse} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedVerse(null)} />
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <LinearGradient colors={grad} style={styles.modalHero}>
              <Text style={styles.modalText}>{fetchedVerses[selectedVerse.reference]?.text || selectedVerse.text}</Text>
              <Text style={styles.modalRef}>{selectedVerse.reference}</Text>
            </LinearGradient>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Context</Text>
              <Text style={[styles.sectionText, { color: theme.textSecondary }]}>{selectedVerse.context}</Text>
            </ScrollView>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.primary }]} onPress={() => setSelectedVerse(null)}>
              <Text style={styles.closeBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
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

  if (loading) return <Modal visible={visible}><SimplePercentageLoader isVisible loadingText="Loading..." /></Modal>;

  const filtered = getFilteredVerses();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: theme.background }}>
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
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={onClose}>
                  <Text style={{ color: theme.primary, fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Key Verses</Text>
                <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                  <MaterialIcons name={viewMode === 'grid' ? 'view-list' : 'grid-view'} size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <Animated.View style={{ opacity: expandedOpacity }}>
                <View style={styles.searchBar}>
                  <MaterialIcons name="search" size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search verses..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </Animated.View>
                <View style={styles.resultsRow}>
                  <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{filtered.length}</Text>
                  <Text style={{ color: theme.textSecondary }}> verses</Text>
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
  backBtn: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, overflow: 'hidden' },
  headerGradient: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 12, marginVertical: 10 },
  searchInput: { flex: 1, marginLeft: 10 },
  resultsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
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
});

export default KeyVerses;
