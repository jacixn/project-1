import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blushBloomTheme } from '../themes/blush-bloom/theme';
import { cresviaTheme } from '../themes/cresvia/theme';
import { eternaTheme } from '../themes/eterna/theme';

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
  }
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

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('fivefold_theme');
      const savedDarkMode = await AsyncStorage.getItem('fivefold_dark_mode');
      
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
    } catch (error) {
      console.log('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeTheme = async (themeName) => {
    try {
      if (themes[themeName]) {
        setCurrentTheme(themeName);
        await AsyncStorage.setItem('fivefold_theme', themeName);
        
        // Auto-set light mode for Blush Bloom and Eterna themes
        if (themeName === 'blush-bloom' || themeName === 'eterna') {
          setIsDarkMode(false);
          await AsyncStorage.setItem('fivefold_dark_mode', JSON.stringify(false));
        }
        // Auto-set dark mode for Cresvia theme
        else if (themeName === 'cresvia') {
          setIsDarkMode(true);
          await AsyncStorage.setItem('fivefold_dark_mode', JSON.stringify(true));
        }
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
    } catch (error) {
      console.log('Error saving dark mode preference:', error);
    }
  };

  const toggleTheme = async () => {
    // Legacy function - now just toggles dark mode
    await toggleDarkMode();
  };

  // Get the appropriate theme based on current theme and dark mode
  const getActiveTheme = () => {
    const baseTheme = themes[currentTheme];
    
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
  
  // Filter available themes to only show the themed ones (not light/dark)
  const availableThemes = Object.keys(themes)
    .filter(key => !['light', 'dark'].includes(key))
    .map(key => ({
      id: key,
      name: themes[key].name || key,
      theme: themes[key]
    }));

  const value = {
    theme,
    currentTheme,
    isDark,
    isDarkMode,
    isBlushTheme,
    isCresviaTheme,
    isEternaTheme,
    toggleTheme,
    toggleDarkMode,
    changeTheme,
    availableThemes,
    isLoading,
    themes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
