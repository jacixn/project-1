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
    card: '#FFFFFF',
    
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('fivefold_theme');
      if (savedTheme && themes[savedTheme]) {
        setCurrentTheme(savedTheme);
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
      }
    } catch (error) {
      console.log('Error saving theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    // Toggle between light and dark (for backward compatibility)
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    await changeTheme(newTheme);
  };

  const theme = themes[currentTheme];
  const isDark = currentTheme === 'dark';
  const isBlushTheme = currentTheme === 'blush-bloom';
  const isCresviaTheme = currentTheme === 'cresvia';
  const isEternaTheme = currentTheme === 'eterna';
  
  const availableThemes = Object.keys(themes).map(key => ({
    id: key,
    name: themes[key].name || key,
    theme: themes[key]
  }));

  const value = {
    theme,
    currentTheme,
    isDark,
    isBlushTheme,
    isCresviaTheme,
    isEternaTheme,
    toggleTheme,
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
