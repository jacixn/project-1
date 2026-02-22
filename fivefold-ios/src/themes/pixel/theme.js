export const pixelWallpaper = require('./wallpaper1.jpg');

export const pixelTheme = {
  name: 'Pixel',
  id: 'pixel',

  light: {
    background: '#F5FFF0',
    surface: 'rgba(235, 255, 230, 0.8)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#2D4A1E',
    textSecondary: '#3F6628',
    textTertiary: '#5A8840',

    primary: '#5B8C2A',
    primaryLight: '#8BC34A',
    primaryDark: '#3E6B18',

    success: '#5B8C2A',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#5B8C2A',

    border: 'rgba(91, 140, 42, 0.2)',
    separator: 'rgba(235, 255, 230, 0.3)',
    overlay: 'rgba(91, 140, 42, 0.4)',

    prayerBackground: 'rgba(245, 255, 240, 0.8)',
    bibleBackground: 'rgba(235, 255, 230, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(235, 255, 230, 0.6)',
    tabActive: '#5B8C2A',
    tabInactive: '#3E6B18',

    shadowColor: '#5B8C2A',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#E0F5D5', '#5B8C2A', '#3E6B18'],
    headerGradient: ['#F5FFF0', '#E0F5D5'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#5B8C2A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(235, 255, 230, 0.15)',
      borderColor: 'rgba(91, 140, 42, 0.3)',
      borderWidth: 1,
      shadowColor: '#5B8C2A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(91, 140, 42, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#5B8C2A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(91, 140, 42, 0.2)',
      borderColor: 'rgba(91, 140, 42, 0.4)',
      borderWidth: 1,
      shadowColor: '#5B8C2A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#5B8C2A',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#E0F5D5', '#5B8C2A', '#E0F5D5'],
      pulse: '#5B8C2A',
      ripple: 'rgba(91, 140, 42, 0.3)',
    }
  },

  dark: {
    background: '#0D1A08',
    surface: 'rgba(20, 38, 12, 0.8)',
    card: 'rgba(30, 52, 18, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#6BA034',
    primaryLight: '#8BC34A',
    primaryDark: '#5B8C2A',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#6BA034',

    border: 'rgba(107, 160, 52, 0.3)',
    separator: 'rgba(20, 38, 12, 0.4)',
    overlay: 'rgba(13, 26, 8, 0.8)',

    prayerBackground: 'rgba(20, 38, 12, 0.9)',
    bibleBackground: 'rgba(30, 52, 18, 0.9)',
    verseBackground: 'rgba(40, 68, 25, 0.2)',

    tabBackground: 'rgba(20, 38, 12, 0.7)',
    tabActive: '#6BA034',
    tabInactive: '#5B8C2A',

    shadowColor: '#6BA034',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#14260C', '#6BA034', '#8BC34A'],
    headerGradient: ['#0D1A08', '#14260C'],

    glass: {
      backgroundColor: 'rgba(30, 52, 18, 0.12)',
      borderColor: 'rgba(107, 160, 52, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#6BA034',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(20, 38, 12, 0.18)',
      borderColor: 'rgba(107, 160, 52, 0.35)',
      borderWidth: 1,
      shadowColor: '#6BA034',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(30, 52, 18, 0.1)',
      borderColor: 'rgba(107, 160, 52, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#6BA034',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(107, 160, 52, 0.25)',
      borderColor: 'rgba(107, 160, 52, 0.45)',
      borderWidth: 1,
      shadowColor: '#6BA034',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#6BA034',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#14260C', '#6BA034', '#14260C'],
      pulse: '#6BA034',
      ripple: 'rgba(107, 160, 52, 0.4)',
    }
  }
};
