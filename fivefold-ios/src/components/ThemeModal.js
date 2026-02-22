import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard } from './GlassEffect';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2; // 2 columns with padding

const ThemeModal = ({ visible, onClose }) => {
  const { 
    theme, 
    currentTheme, 
    changeTheme, 
    isBlushTheme, 
    isCresviaTheme, 
    isEternaTheme, 
    isFaithTheme, 
    isBiblelyTheme, 
    biblelyWallpapers, 
    selectedWallpaperIndex, 
    changeWallpaper,
    themeWallpapers 
  } = useTheme();
  
  const [wallpaperExpanded, setWallpaperExpanded] = useState(true);

  const toggleWallpaperSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWallpaperExpanded(!wallpaperExpanded);
  };

  const handleThemeSelect = (themeId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    changeTheme(themeId);
  };

  const lightThemes = [
    { id: 'blush-bloom', name: 'Blush Bloom', wallpaper: themeWallpapers?.['blush-bloom'], isActive: isBlushTheme },
    { id: 'eterna', name: 'Eterna', wallpaper: themeWallpapers?.['eterna'], isActive: isEternaTheme },
    { id: 'biblely-light', name: 'Biblely', wallpaper: biblelyWallpapers?.[0]?.source, isActive: isBiblelyTheme && selectedWallpaperIndex === 0, isBiblelyVariant: true, wallpaperIndex: 0 },
    { id: 'cotton-candy', name: 'Cotton Candy', wallpaper: themeWallpapers?.['cotton-candy'], isActive: currentTheme === 'cotton-candy' },
    { id: 'serenity', name: 'Serenity', wallpaper: themeWallpapers?.['serenity'], isActive: currentTheme === 'serenity' },
    { id: 'good-shepherd', name: 'Good Shepherd', wallpaper: themeWallpapers?.['good-shepherd'], isActive: currentTheme === 'good-shepherd' },
    { id: 'pixel', name: 'Pixel', wallpaper: themeWallpapers?.['pixel'], isActive: currentTheme === 'pixel' },
    { id: 'meadow', name: 'Meadow', wallpaper: themeWallpapers?.['meadow'], isActive: currentTheme === 'meadow' },
    { id: 'heavens', name: 'Heavens', wallpaper: themeWallpapers?.['heavens'], isActive: currentTheme === 'heavens' },
    { id: 'retro', name: 'Retro', wallpaper: themeWallpapers?.['retro'], isActive: currentTheme === 'retro' },
    { id: 'cozy-study', name: 'Cozy Study', wallpaper: themeWallpapers?.['cozy-study'], isActive: currentTheme === 'cozy-study' },
    { id: 'shores', name: 'Shores', wallpaper: themeWallpapers?.['shores'], isActive: currentTheme === 'shores' },
    { id: 'canopy', name: 'Canopy', wallpaper: themeWallpapers?.['canopy'], isActive: currentTheme === 'canopy' },
    { id: 'faith', name: 'Faith', wallpaper: themeWallpapers?.['faith'], isActive: currentTheme === 'faith' },
  ];

  const darkThemes = [
    { id: 'cresvia', name: 'Cresvia', wallpaper: themeWallpapers?.['cresvia'], isActive: isCresviaTheme },
    { id: 'biblely-jesusnlambs', name: 'Jesus & Lambs', wallpaper: biblelyWallpapers?.[1]?.source, isActive: isBiblelyTheme && selectedWallpaperIndex === 1, isBiblelyVariant: true, wallpaperIndex: 1 },
    { id: 'biblely-classic', name: 'Classic', wallpaper: biblelyWallpapers?.[2]?.source, isActive: isBiblelyTheme && selectedWallpaperIndex === 2, isBiblelyVariant: true, wallpaperIndex: 2 },
    { id: 'ascent', name: 'Ascent', wallpaper: themeWallpapers?.['ascent'], isActive: currentTheme === 'ascent' },
    { id: 'mach', name: 'Mach', wallpaper: themeWallpapers?.['mach'], isActive: currentTheme === 'mach' },
    { id: 'pastures', name: 'Pastures', wallpaper: themeWallpapers?.['pastures'], isActive: currentTheme === 'pastures' },
    { id: 'aurora', name: 'Aurora', wallpaper: themeWallpapers?.['aurora'], isActive: currentTheme === 'aurora' },
    { id: 'walk-on-water', name: 'Walk on Water', wallpaper: themeWallpapers?.['walk-on-water'], isActive: currentTheme === 'walk-on-water' },
    { id: 'calvary', name: 'Calvary', wallpaper: themeWallpapers?.['calvary'], isActive: currentTheme === 'calvary' },
    { id: 'nightfall', name: 'Nightfall', wallpaper: themeWallpapers?.['nightfall'], isActive: currentTheme === 'nightfall' },
  ];

  const getCurrentThemeDisplay = () => {
    if (isBiblelyTheme) {
      const wallpaper = biblelyWallpapers?.[selectedWallpaperIndex];
      return { name: wallpaper?.name || 'Biblely', mode: wallpaper?.mode === 'dark' ? 'Dark' : 'Light' };
    }
    const allEntries = [...lightThemes, ...darkThemes];
    const match = allEntries.find(t => t.isActive);
    if (match) return { name: match.name, mode: lightThemes.some(lt => lt.id === match.id) ? 'Light' : 'Dark' };
    return { name: 'Default', mode: 'Unknown' };
  };

  const current = getCurrentThemeDisplay();

  const renderThemeCard = (themeItem) => {
    const isSelected = themeItem.isActive;
    
    const handlePress = () => {
      if (themeItem.isBiblelyVariant) {
        // For Biblely variants, select biblely theme AND set the wallpaper
        handleThemeSelect('biblely');
        changeWallpaper(themeItem.wallpaperIndex);
      } else {
        handleThemeSelect(themeItem.id);
      }
    };
    
    return (
      <TouchableOpacity
        key={themeItem.id}
        style={[
          styles.themeCard,
          { 
            borderColor: isSelected ? theme.primary : 'rgba(255,255,255,0.2)',
            borderWidth: isSelected ? 3 : 1,
          }
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {themeItem.wallpaper ? (
          <Image 
            source={themeItem.wallpaper} 
            style={styles.themeCardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.themeCardPlaceholder, { backgroundColor: theme.surface }]} />
        )}
        
        {/* Gradient overlay for text readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.themeCardGradient}
        />
        
        {/* Selected checkmark */}
        {isSelected && (
          <View style={[styles.themeCheckmark, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="check" size={18} color="#fff" />
          </View>
        )}
        
        {/* Theme name */}
        <View style={styles.themeCardTextContainer}>
          <Text style={[
            styles.themeCardName,
            { fontWeight: isSelected ? '700' : '600' }
          ]}>
            {themeItem.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Fixed Header - always visible */}
        <View style={[styles.headerRow, { backgroundColor: theme.background, paddingTop: 16, paddingHorizontal: 20, marginBottom: 0, marginTop: 0, zIndex: 10 }]}>
          <TouchableOpacity 
            onPress={onClose}
            style={[styles.closeCircle, { backgroundColor: theme.surface }]}
          >
            <MaterialIcons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.mainTitle, { color: theme.text }]}>Appearance</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.doneText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* Current Theme Display */}
          <GlassCard style={styles.currentThemeCard} blushMode={currentTheme && currentTheme !== 'light' && currentTheme !== 'dark'}>
            <Text style={[styles.currentLabel, { color: theme.textSecondary }]}>Current Theme</Text>
            <View style={styles.currentThemeInfo}>
              <View style={styles.currentTextContainer}>
                <Text style={[styles.currentName, { color: theme.text }]}>{current.name}</Text>
                <Text style={[styles.currentMode, { color: theme.textSecondary }]}>{current.mode} Mode</Text>
              </View>
            </View>
          </GlassCard>

          {/* Light Mode Themes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="wb-sunny" size={22} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Light Mode Themes</Text>
              </View>
            </View>
            
            <View style={styles.themesGrid}>
              {lightThemes.map(renderThemeCard)}
            </View>
          </View>

          {/* Dark Mode Themes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialIcons name="nightlight-round" size={22} color={theme.primary} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Dark Mode Themes</Text>
              </View>
            </View>
            
            <View style={styles.themesGrid}>
              {darkThemes.map(renderThemeCard)}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 10,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  doneText: {
    fontSize: 17,
    fontWeight: '700',
  },
  // Current Theme Card
  currentThemeCard: {
    padding: 14,
    marginBottom: 16,
    borderRadius: 12,
  },
  currentLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currentThemeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTextContainer: {
    flex: 1,
  },
  currentName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  currentMode: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Theme Grid
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  wallpaperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  themeCardImage: {
    width: '100%',
    height: '100%',
  },
  themeCardPlaceholder: {
    width: '100%',
    height: '100%',
  },
  themeCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  themeCheckmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  themeCardTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  themeCardName: {
    fontSize: 15,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Biblely Promo Card
  biblelyPromoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  biblelyPromoContent: {
    height: 160,
    position: 'relative',
  },
  biblelyPromoImage: {
    width: '100%',
    height: '100%',
  },
  biblelyPromoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  biblelyPromoTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  biblelyPromoTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  biblelyPromoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default ThemeModal;
