export const ascentWallpaper = require('./wallpaper1.jpg');

export const ascentTheme = {
  name: 'Ascent',
  id: 'ascent',

  light: {
    background: '#E8F1FB',
    surface: 'rgba(220, 235, 250, 0.8)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#1E3A5F',
    textSecondary: '#2D5486',
    textTertiary: '#4A7AB5',

    primary: '#2563EB',
    primaryLight: '#93C5FD',
    primaryDark: '#1D4ED8',

    success: '#2563EB',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#2563EB',

    border: 'rgba(37, 99, 235, 0.2)',
    separator: 'rgba(220, 235, 250, 0.3)',
    overlay: 'rgba(37, 99, 235, 0.4)',

    prayerBackground: 'rgba(232, 241, 251, 0.8)',
    bibleBackground: 'rgba(220, 235, 250, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(220, 235, 250, 0.6)',
    tabActive: '#2563EB',
    tabInactive: '#1D4ED8',

    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#FDE68A', '#2563EB', '#1D4ED8'],
    headerGradient: ['#E8F1FB', '#DBEAFE'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(220, 235, 250, 0.15)',
      borderColor: 'rgba(37, 99, 235, 0.3)',
      borderWidth: 1,
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(37, 99, 235, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      borderColor: 'rgba(37, 99, 235, 0.4)',
      borderWidth: 1,
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#DBEAFE', '#2563EB', '#DBEAFE'],
      pulse: '#2563EB',
      ripple: 'rgba(37, 99, 235, 0.3)',
    }
  },

  dark: {
    background: '#080810',
    surface: 'rgba(12, 18, 35, 0.8)',
    card: 'rgba(18, 28, 50, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#4A90D9',
    primaryLight: '#93C5FD',
    primaryDark: '#2563EB',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#4A90D9',

    border: 'rgba(74, 144, 217, 0.3)',
    separator: 'rgba(12, 18, 35, 0.4)',
    overlay: 'rgba(8, 8, 16, 0.8)',

    prayerBackground: 'rgba(12, 18, 35, 0.9)',
    bibleBackground: 'rgba(18, 28, 50, 0.9)',
    verseBackground: 'rgba(25, 40, 70, 0.2)',

    tabBackground: 'rgba(12, 18, 35, 0.7)',
    tabActive: '#4A90D9',
    tabInactive: '#2563EB',

    shadowColor: '#4A90D9',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#0C1223', '#4A90D9', '#E8703A'],
    headerGradient: ['#080810', '#0C1223'],

    glass: {
      backgroundColor: 'rgba(18, 28, 50, 0.12)',
      borderColor: 'rgba(74, 144, 217, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#4A90D9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(12, 18, 35, 0.18)',
      borderColor: 'rgba(74, 144, 217, 0.35)',
      borderWidth: 1,
      shadowColor: '#4A90D9',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(18, 28, 50, 0.1)',
      borderColor: 'rgba(74, 144, 217, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#4A90D9',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(74, 144, 217, 0.25)',
      borderColor: 'rgba(74, 144, 217, 0.45)',
      borderWidth: 1,
      shadowColor: '#4A90D9',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#4A90D9',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#0C1223', '#4A90D9', '#0C1223'],
      pulse: '#4A90D9',
      ripple: 'rgba(74, 144, 217, 0.4)',
    }
  }
};
