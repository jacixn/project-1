export const auroraWallpaper = require('./wallpaper1.jpg');

export const auroraTheme = {
  name: 'Aurora',
  id: 'aurora',

  light: {
    background: '#E8F8F5',
    surface: 'rgba(210, 240, 235, 0.8)',
    card: 'rgba(255, 255, 255, 0.85)',

    text: '#1A3C38',
    textSecondary: '#2D5E58',
    textTertiary: '#4A8078',

    primary: '#00897B',
    primaryLight: '#4DB6AC',
    primaryDark: '#00695C',

    success: '#00897B',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#00897B',

    border: 'rgba(0, 137, 123, 0.2)',
    separator: 'rgba(210, 240, 235, 0.3)',
    overlay: 'rgba(0, 137, 123, 0.4)',

    prayerBackground: 'rgba(232, 248, 245, 0.8)',
    bibleBackground: 'rgba(210, 240, 235, 0.8)',
    verseBackground: 'rgba(255, 255, 255, 0.2)',

    tabBackground: 'rgba(210, 240, 235, 0.6)',
    tabActive: '#00897B',
    tabInactive: '#00695C',

    shadowColor: '#00897B',
    shadowOpacity: 0.3,
    elevation: 6,

    gradient: ['#D2F0EB', '#00897B', '#00695C'],
    headerGradient: ['#E8F8F5', '#D2F0EB'],

    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#00897B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 8,
    },

    modalGlass: {
      backgroundColor: 'rgba(210, 240, 235, 0.15)',
      borderColor: 'rgba(0, 137, 123, 0.3)',
      borderWidth: 1,
      shadowColor: '#00897B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },

    cardGlass: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(0, 137, 123, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#00897B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 4,
    },

    buttonGlass: {
      backgroundColor: 'rgba(0, 137, 123, 0.2)',
      borderColor: 'rgba(0, 137, 123, 0.4)',
      borderWidth: 1,
      shadowColor: '#00897B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },

    glow: {
      shadowColor: '#00897B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },

    animation: {
      shimmer: ['#D2F0EB', '#00897B', '#D2F0EB'],
      pulse: '#00897B',
      ripple: 'rgba(0, 137, 123, 0.3)',
    }
  },

  dark: {
    background: '#050F12',
    surface: 'rgba(10, 30, 35, 0.8)',
    card: 'rgba(15, 42, 48, 0.15)',

    text: '#FFFFFF',
    textSecondary: '#F1F5F9',
    textTertiary: '#E2E8F0',

    primary: '#00BFA5',
    primaryLight: '#4DB6AC',
    primaryDark: '#00897B',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#00BFA5',

    border: 'rgba(0, 191, 165, 0.3)',
    separator: 'rgba(10, 30, 35, 0.4)',
    overlay: 'rgba(5, 15, 18, 0.8)',

    prayerBackground: 'rgba(10, 30, 35, 0.9)',
    bibleBackground: 'rgba(15, 42, 48, 0.9)',
    verseBackground: 'rgba(20, 55, 62, 0.2)',

    tabBackground: 'rgba(10, 30, 35, 0.7)',
    tabActive: '#00BFA5',
    tabInactive: '#00897B',

    shadowColor: '#00BFA5',
    shadowOpacity: 0.4,
    elevation: 8,

    gradient: ['#0A1E23', '#00BFA5', '#4DB6AC'],
    headerGradient: ['#050F12', '#0A1E23'],

    glass: {
      backgroundColor: 'rgba(15, 42, 48, 0.12)',
      borderColor: 'rgba(0, 191, 165, 0.25)',
      borderWidth: 1,
      backdropFilter: 'blur(20px)',
      shadowColor: '#00BFA5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 10,
    },

    modalGlass: {
      backgroundColor: 'rgba(10, 30, 35, 0.18)',
      borderColor: 'rgba(0, 191, 165, 0.35)',
      borderWidth: 1,
      shadowColor: '#00BFA5',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
      elevation: 12,
    },

    cardGlass: {
      backgroundColor: 'rgba(15, 42, 48, 0.1)',
      borderColor: 'rgba(0, 191, 165, 0.2)',
      borderWidth: 0.5,
      shadowColor: '#00BFA5',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },

    buttonGlass: {
      backgroundColor: 'rgba(0, 191, 165, 0.25)',
      borderColor: 'rgba(0, 191, 165, 0.45)',
      borderWidth: 1,
      shadowColor: '#00BFA5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 7,
    },

    glow: {
      shadowColor: '#00BFA5',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 25,
      elevation: 18,
    },

    animation: {
      shimmer: ['#0A1E23', '#00BFA5', '#0A1E23'],
      pulse: '#00BFA5',
      ripple: 'rgba(0, 191, 165, 0.4)',
    }
  }
};
