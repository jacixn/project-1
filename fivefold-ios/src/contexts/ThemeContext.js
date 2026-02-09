import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blushBloomTheme, blushBloomWallpaper } from '../themes/blush-bloom/theme';
import { cresviaTheme, cresviaWallpaper } from '../themes/cresvia/theme';
import { eternaTheme, eternaWallpaper } from '../themes/eterna/theme';
import { spidermanTheme, spidermanWallpaper } from '../themes/spiderman/theme';
import { sailormoonTheme, sailormoonWallpaper } from '../themes/sailormoon/theme';
import { biblelyTheme, biblelyWallpapers, jesusNLambsTheme, classicTheme } from '../themes/biblely/theme';

// Theme wallpaper previews for the theme selector
export const themeWallpapers = {
  'blush-bloom': blushBloomWallpaper,
  'cresvia': cresviaWallpaper,
  'eterna': eternaWallpaper,
  'spiderman': spidermanWallpaper,
  'sailormoon': sailormoonWallpaper,
};

// Beautiful theme definitions
const themes = {
  light: {
    // Background colors
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FAFBFC',
    
    // Text colors
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    
    // Brand colors
    primary: '#667eea',
    primaryLight: '#818cf8',
    primaryDark: '#4338ca',
    
    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    // UI colors
    border: '#E5E7EB',
    separator: '#F3F4F6',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Prayer/Bible specific
    prayerBackground: '#F0F4FF',
    bibleBackground: '#FFF9F0',
    verseBackground: '#FFFFFF',
    
    // Tab colors - MORE TRANSPARENT
    tabBackground: 'rgba(255, 255, 255, 0.85)', // 85% opacity white
    tabActive: '#667eea',
    tabInactive: '#9CA3AF',
    
    // Shadows
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    elevation: 2,
    
    // Gradients
    gradient: ['#667eea', '#764ba2'],
    headerGradient: ['#F8F9FA', '#FFFFFF'],
  },
  
  'blush-bloom': blushBloomTheme,
  'cresvia': cresviaTheme,
  'eterna': eternaTheme,
  'spiderman': spidermanTheme,
  'biblely': biblelyTheme,
  'jesusnlambs': jesusNLambsTheme,
  'classic': classicTheme,
  
  dark: {
    // Background colors
    background: '#111827',
    surface: '#1F2937',
    card: '#374151',
    
    // Text colors
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    
    // Brand colors
    primary: '#818cf8',
    primaryLight: '#a5b4fc',
    primaryDark: '#6366f1',
    
    // Status colors
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    
    // UI colors
    border: '#374151',
    separator: '#1F2937',
    overlay: 'rgba(0, 0, 0, 0.8)',
    
    // Prayer/Bible specific
    prayerBackground: '#1E293B',
    bibleBackground: '#292524',
    verseBackground: '#374151',
    
    // Tab colors - MORE TRANSPARENT
    tabBackground: 'rgba(31, 41, 55, 0.85)', // 85% opacity dark gray
    tabActive: '#818cf8',
    tabInactive: '#6B7280',
    
    // Shadows
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    elevation: 4,
    
    // Gradients
    gradient: ['#1F2937', '#111827'],
    headerGradient: ['#1F2937', '#111827'],
  },

  'sailormoon': sailormoonTheme,
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('dark'); // Default to dark mode
  const [isDarkMode, setIsDarkMode] = useState(true); // Separate dark mode state
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWallpaperIndex, setSelectedWallpaperIndex] = useState(0); // Wallpaper selection

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('fivefold_theme');
      const savedDarkMode = await AsyncStorage.getItem('fivefold_dark_mode');
      const savedWallpaper = await AsyncStorage.getItem('fivefold_wallpaper_index');
      
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
      }
      
      if (savedDarkMode !== null) {
        setIsDarkMode(JSON.parse(savedDarkMode));
      } else {
        // Set default based on theme
        if (savedTheme === 'blush-bloom' || savedTheme === 'eterna') {
          setIsDarkMode(false); // These themes default to light mode
        } else {
          setIsDarkMode(true); // Default to dark
        }
      }
      
      if (savedWallpaper !== null) {
        setSelectedWallpaperIndex(parseInt(savedWallpaper, 10));
      }
    } catch (error) {
      console.log('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save a timestamp whenever the user changes theme locally
  const saveThemeTimestamp = async () => {
    try {
      await AsyncStorage.setItem('fivefold_theme_updated_at', Date.now().toString());
    } catch (e) {
      // Silent
    }
  };

  // Background sync theme to Firebase (fire and forget)
  const syncThemeToCloud = async () => {
    try {
      const { syncThemePreferencesToCloud } = await import('../services/userSyncService');
      const { auth } = await import('../config/firebase');
      if (auth.currentUser?.uid) {
        await syncThemePreferencesToCloud(auth.currentUser.uid);
        console.log('[Theme] Synced theme change to cloud');
      }
    } catch (e) {
      // Silent fail - background operation
      console.log('[Theme] Cloud sync skipped:', e.message);
    }
  };

  const changeTheme = async (themeName) => {
    try {
      // Handle Biblely variants (Jesus & Lambs, Classic) - they're variants of 'biblely' theme
      if (themeName === 'jesusnlambs') {
        // Jesus & Lambs is Biblely theme with wallpaper index 1
        setCurrentTheme('biblely');
        await AsyncStorage.setItem('fivefold_theme', 'biblely');
        setSelectedWallpaperIndex(1);
        await AsyncStorage.setItem('fivefold_wallpaper_index', '1');
        // It's a dark theme
        setIsDarkMode(true);
        await AsyncStorage.setItem('fivefold_dark_mode', JSON.stringify(true));
        await saveThemeTimestamp();
        syncThemeToCloud();
        return;
      }
      
      if (themeName === 'classic') {
        // Classic is Biblely theme with wallpaper index 2
        setCurrentTheme('biblely');
        await AsyncStorage.setItem('fivefold_theme', 'biblely');
        setSelectedWallpaperIndex(2);
        await AsyncStorage.setItem('fivefold_wallpaper_index', '2');
        // It's a dark theme
        setIsDarkMode(true);
        await AsyncStorage.setItem('fivefold_dark_mode', JSON.stringify(true));
        await saveThemeTimestamp();
        syncThemeToCloud();
        return;
      }
      
      if (themes[themeName]) {
        setCurrentTheme(themeName);
        await AsyncStorage.setItem('fivefold_theme', themeName);
        
        // Reset wallpaper index when switching to non-Biblely themes
        if (themeName !== 'biblely') {
          setSelectedWallpaperIndex(0);
          await AsyncStorage.setItem('fivefold_wallpaper_index', '0');
        }
        
        // Auto-set light mode for Blush Bloom, Eterna, Sailor Moon, Biblely themes
        if (themeName === 'blush-bloom' || themeName === 'eterna' || themeName === 'sailormoon' || themeName === 'biblely') {
          setIsDarkMode(false);
          await AsyncStorage.setItem('fivefold_dark_mode', JSON.stringify(false));
        }
        // Auto-set dark mode for Cresvia and Spiderman themes
        else if (themeName === 'cresvia' || themeName === 'spiderman') {
          setIsDarkMode(true);
          await AsyncStorage.setItem('fivefold_dark_mode', JSON.stringify(true));
        }
        
        await saveThemeTimestamp();
        syncThemeToCloud();
      }
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newDarkMode = !isDarkMode;
      setIsDarkMode(newDarkMode);
      await AsyncStorage.setItem('fivefold_dark_mode', JSON.stringify(newDarkMode));
      await saveThemeTimestamp();
      syncThemeToCloud();
    } catch (error) {
      console.log('Error saving dark mode preference:', error);
    }
  };

  const toggleTheme = async () => {
    // Legacy function - now just toggles dark mode
    await toggleDarkMode();
  };

  // Change wallpaper for Biblely theme
  const changeWallpaper = async (index) => {
    try {
      const safeIndex = Math.max(0, Math.min(index, (biblelyWallpapers?.length || 1) - 1));
      setSelectedWallpaperIndex(safeIndex);
      await AsyncStorage.setItem('fivefold_wallpaper_index', safeIndex.toString());
      
      // Auto-set dark/light mode based on the wallpaper's mode
      const wallpaper = biblelyWallpapers?.[safeIndex];
      if (wallpaper) {
        const shouldBeDark = wallpaper.mode === 'dark';
        setIsDarkMode(shouldBeDark);
        await AsyncStorage.setItem('fivefold_dark_mode', JSON.stringify(shouldBeDark));
      }
      
      await saveThemeTimestamp();
      syncThemeToCloud();
    } catch (error) {
      console.log('Error saving wallpaper preference:', error);
    }
  };

  // Get current wallpaper source for Biblely theme
  const getCurrentWallpaper = () => {
    try {
      if (biblelyWallpapers && selectedWallpaperIndex >= 0 && selectedWallpaperIndex < biblelyWallpapers.length) {
        return biblelyWallpapers[selectedWallpaperIndex];
      }
      return biblelyWallpapers?.[0] || null;
    } catch (error) {
      console.log('Error getting current wallpaper:', error);
      return null;
    }
  };

  // Get the appropriate theme based on current theme and dark mode
  const getActiveTheme = () => {
    // Special handling for Biblely theme variants
    if (currentTheme === 'biblely') {
      // Each wallpaper has its own complete theme
      switch (selectedWallpaperIndex) {
        case 1: // Jesus & Lambs - nature green theme
          return jesusNLambsTheme.dark;
        case 2: // Classic - royal gold/blue theme
          return classicTheme.dark;
        case 0: // Biblely - orange/cream theme
        default:
          return isDarkMode ? biblelyTheme.dark : biblelyTheme.light;
      }
    }
    
    const baseTheme = themes[currentTheme];
    
    // Safety fallback if theme is somehow undefined
    if (!baseTheme) {
      return themes.dark;
    }
    
    // Handle dual-mode themes (Blush Bloom, Cresvia, Eterna)
    if (baseTheme && typeof baseTheme === 'object' && baseTheme.light && baseTheme.dark) {
      return isDarkMode ? baseTheme.dark : baseTheme.light;
    }
    
    // Handle legacy themes (light, dark)
    return baseTheme;
  };

  const theme = getActiveTheme();
  const isDark = isDarkMode;
  const isBlushTheme = currentTheme === 'blush-bloom';
  const isCresviaTheme = currentTheme === 'cresvia';
  const isEternaTheme = currentTheme === 'eterna';
  const isSpidermanTheme = currentTheme === 'spiderman';
  const isSailormoonTheme = currentTheme === 'sailormoon';
  const isBiblelyTheme = currentTheme === 'biblely';
  
  // Filter available themes to only show the themed ones (not light/dark)
  const availableThemes = Object.keys(themes)
    .filter(key => !['light', 'dark'].includes(key))
    .map(key => ({
      id: key,
      name: themes[key].name || key,
      theme: themes[key]
    }));

  // Reload theme from storage (used after sign-in to load user's theme)
  const reloadTheme = async () => {
    await loadThemePreference();
  };

  const value = {
    theme,
    currentTheme,
    isDark,
    isDarkMode,
    isBlushTheme,
    isCresviaTheme,
    isEternaTheme,
    isSpidermanTheme,
    isSailormoonTheme,
    isBiblelyTheme,
    toggleTheme,
    toggleDarkMode,
    changeTheme,
    availableThemes,
    isLoading,
    themes,
    // Wallpaper support
    biblelyWallpapers,
    selectedWallpaperIndex,
    changeWallpaper,
    getCurrentWallpaper,
    themeWallpapers,
    // Reload function (for after sign-in)
    reloadTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
