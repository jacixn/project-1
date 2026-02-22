export const heavensWallpaper = require('./wallpaper1.jpg');

export const heavensTheme = {
  name: 'Heavens',
  id: 'heavens',

  light: {
    background: '#EDF6FF',
    surface: 'rgba(230, 242, 255, 0.85)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#1A3A5C',
    textSecondary: '#264D73',
    textTertiary: '#3D6A8F',

    primary: '#2196F3',
    primaryLight: '#64B5F6',
    primaryDark: '#1565C0',

    success: '#2E7D32',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#2196F3',

    border: 'rgba(33, 150, 243, 0.2)',
    separator: 'rgba(230, 242, 255, 0.3)',
    overlay: 'rgba(33, 150, 243, 0.4)',

    prayerBackground: 'rgba(237, 246, 255, 0.8)',
    bibleBackground: 'rgba(230, 242, 255, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(230, 242, 255, 0.6)',
    tabActive: '#2196F3',
    tabInactive: '#1565C0',

    shadowColor: '#2196F3',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#D4EAFF', '#2196F3', '#1565C0'],
    headerGradient: ['#EDF6FF', '#D4EAFF'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#2196F3',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(230, 242, 255, 0.15)',
      borderColor: 'rgba(33, 150, 243, 0.3)',
      borderWidth: 1,
      shadowColor: '#2196F3',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(33, 150, 243, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#2196F3',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(33, 150, 243, 0.2)',
      borderColor: 'rgba(33, 150, 243, 0.4)',
      borderWidth: 1,
      shadowColor: '#2196F3',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#2196F3',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#D4EAFF', '#2196F3', '#D4EAFF'],
      pulse: '#2196F3',
      ripple: 'rgba(33, 150, 243, 0.3)',
    }
  },

  dark: {
    background: '#0A1628',
    surface: 'rgba(14, 28, 50, 0.85)',
    card: 'rgba(20, 40, 68, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#42A5F5',
    primaryLight: '#64B5F6',
    primaryDark: '#1E88E5',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#42A5F5',

    border: 'rgba(66, 165, 245, 0.3)',
    separator: 'rgba(14, 28, 50, 0.4)',
    overlay: 'rgba(10, 22, 40, 0.8)',

    prayerBackground: 'rgba(14, 28, 50, 0.9)',
    bibleBackground: 'rgba(20, 40, 68, 0.9)',
    verseBackground: 'rgba(30, 55, 90, 0.2)',

    tabBackground: 'rgba(14, 28, 50, 0.7)',
    tabActive: '#42A5F5',
    tabInactive: '#1E88E5',

    shadowColor: '#42A5F5',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#0E1C32', '#42A5F5', '#64B5F6'],
    headerGradient: ['#0A1628', '#0E1C32'],

    glass: {
      backgroundColor: 'rgba(20, 40, 68, 0.12)',
      borderColor: 'rgba(66, 165, 245, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#42A5F5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(14, 28, 50, 0.18)',
      borderColor: 'rgba(66, 165, 245, 0.35)',
      borderWidth: 1,
      shadowColor: '#42A5F5',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(20, 40, 68, 0.1)',
      borderColor: 'rgba(66, 165, 245, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#42A5F5',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(66, 165, 245, 0.25)',
      borderColor: 'rgba(66, 165, 245, 0.45)',
      borderWidth: 1,
      shadowColor: '#42A5F5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#42A5F5',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#0E1C32', '#42A5F5', '#0E1C32'],
      pulse: '#42A5F5',
      ripple: 'rgba(66, 165, 245, 0.4)',
    }
  }
};
